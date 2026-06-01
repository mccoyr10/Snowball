"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency, type UIDebt, type UISettings, type Summary } from "@/lib/snowball";
import { loadAdvisorHistory, saveAdvisorMessages, clearAdvisorHistory, type AdvisorMessage } from "@/lib/advisorMemory";
import ChallengePanel from "./ChallengePanel";
import DebtFreeCard from "./DebtFreeCard";
import NegotiationScripts from "./NegotiationScripts";
import RefinancingDetector from "./RefinancingDetector";

type ToolPanel = "challenge" | "card" | "scripts" | "refinancing" | null;

interface ChatPanelProps {
  debts: UIDebt[];
  settings: UISettings;
  summary: Summary;
}

export default function ChatPanel({ debts, settings, summary }: ChatPanelProps) {
  const { user, userDoc } = useAuth();
  const firstName = userDoc?.displayName?.split(" ")[0] || "there";
  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataChanged, setDataChanged] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [activeToolPanel, setActiveToolPanel] = useState<ToolPanel>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef<string | null>(null);
  const saveInProgressRef = useRef(false);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Load history on mount
  useEffect(() => {
    if (!user) {
      setHistoryLoaded(true); // unblock auto-analysis when no user is present
      return;
    }
    const capturedDataKey = dataKey; // capture synchronously before async call
    loadAdvisorHistory(user.uid).then((history) => {
      if (history.length > 0) {
        setMessages(history);
        // Mark initialized with the key at load time so auto-analysis won't fire
        initializedRef.current = capturedDataKey;
      }
      setHistoryLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const dataKey = `${debts.length}-${summary.totalBalance}-${summary.monthsRemaining}`;

  function buildContext() {
    const monthsIntoPlan = (() => {
      const [y, m] = (settings.startDate || "").split("-").map(Number);
      if (!y || !m) return 0;
      const start = new Date(y, m - 1, 1);
      const now = new Date();
      return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
    })();
    return {
      userName: firstName,
      monthsIntoPlan,
      strategyMethod: "snowball",
      monthlyBudget: formatCurrency(settings.monthlyBudget),
      totalDebt: formatCurrency(summary.totalBalance),
      projectedPayoff: summary.projectedPayoffDate ?? "unknown",
      monthsRemaining: summary.monthsRemaining,
      totalInterest: formatCurrency(summary.totalInterestPlanned),
      interestIfMinOnly: formatCurrency(summary.interestIfMinOnly),
      savingsVsMinOnly: formatCurrency(summary.savingsVsMinOnly),
      debts: debts.map(d => ({
        name: d.name,
        balance: formatCurrency(d.balance),
        apr: `${d.apr}%`,
        minPayment: formatCurrency(d.minPayment),
        pctPaidDown: d.startingBalance && d.startingBalance > 0
          ? `${Math.round((1 - d.balance / d.startingBalance) * 100)}%`
          : undefined,
        projectedPayoffDate: summary.debtPayoffDates?.[d.id],
        totalInterestToGo: formatCurrency(summary.debtInterestTotals?.[d.id] ?? 0),
      })),
    };
  }

  const suggestions = useMemo(() => {
    const chips: string[] = [];
    const sorted = [...debts].sort((a, b) => a.balance - b.balance);
    const snowballTarget = sorted[0];
    if (snowballTarget) chips.push(`When will I pay off my ${snowballTarget.name}?`);
    const highApr = [...debts].sort((a, b) => b.apr - a.apr)[0];
    if (highApr && highApr.apr > 15 && highApr.id !== snowballTarget?.id) {
      chips.push(`My ${highApr.name} is ${highApr.apr}% APR — should I target it first?`);
    } else {
      chips.push("Should I switch to the avalanche method?");
    }
    chips.push("What if I add $200/month to my budget?");
    chips.push("What's my biggest interest cost right now?");
    return chips.slice(0, 4);
  }, [debts]);

  async function sendMessage(text?: string, hidden = false) {
    const msgText = (text || input).trim();
    if (!msgText || loading) return;
    if (!hidden) setInput("");

    const userMsg: AdvisorMessage = { role: "user", content: msgText };
    const newMessages: AdvisorMessage[] = hidden ? [...messages] : [...messages, userMsg];
    if (!hidden) setMessages(newMessages);
    setLoading(true);
    setDataChanged(false);

    try {
      const idToken = auth.currentUser ? await getIdToken(auth.currentUser) : "";
      const apiMessages = hidden
        ? [...messages, { role: "user" as const, content: msgText }]
        : newMessages;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({ messages: apiMessages, context: buildContext() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
      }

      const data = await res.json() as { reply: string };
      const assistantMsg: AdvisorMessage = { role: "assistant", content: data.reply };
      const updatedMessages = [...(hidden ? messages : newMessages), assistantMsg];
      setMessages(updatedMessages);

      // Persist visible messages (both user msg and assistant reply)
      if (user && !saveInProgressRef.current) {
        saveInProgressRef.current = true;
        saveAdvisorMessages(user.uid, updatedMessages).finally(() => {
          saveInProgressRef.current = false;
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      if (!hidden) {
        setMessages(prev => [...prev, { role: "assistant", content: `Sorry, I couldn't respond right now. (${msg})` }]);
      }
    } finally {
      setLoading(false);
    }
  }

  // Auto-trigger after history is loaded (only if messages are empty and debts exist)
  useEffect(() => {
    if (!historyLoaded || debts.length === 0) return;
    if (initializedRef.current === null) {
      // No history — fresh session
      initializedRef.current = dataKey;
      sendMessage(
        "Give me a brief personalized assessment of my debt situation: my #1 opportunity and my #1 risk, specific to my actual debts and numbers. Keep it to 3-4 sentences.",
        true
      );
    } else if (initializedRef.current !== dataKey && messages.length > 0) {
      initializedRef.current = dataKey;
      setDataChanged(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, historyLoaded]);

  async function handleNewConversation() {
    setMessages([]);
    initializedRef.current = null;
    if (user) await clearAdvisorHistory(user.uid);
  }

  const snowballTarget = debts.length > 0 ? [...debts].sort((a, b) => a.balance - b.balance)[0] : null;

  const tools: { id: ToolPanel; icon: string; title: string; desc: string }[] = [
    { id: "challenge", icon: "📅", title: "30-Day Challenge", desc: "Daily actions to accelerate payoff" },
    { id: "card", icon: "🎉", title: "Debt-Free Card", desc: "Share your payoff milestone" },
    { id: "scripts", icon: "📞", title: "Negotiation Scripts", desc: "Lower your APRs with a phone call" },
    { id: "refinancing", icon: "💡", title: "Refinancing", desc: "Spot savings opportunities" },
  ];

  return (
    <div>
      {/* Greeting */}
      <div className="greeting">
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Hi {firstName}!</div>
          <h1>Your <span className="h1-italic">advisor.</span></h1>
          <p>Personalized guidance based on your actual debts and payoff plan.</p>
        </div>
      </div>

      {/* Chat card */}
      <div className="card">
        <div className="card-head">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, var(--info), #6b8fd9)", display: "grid", placeItems: "center", color: "#fff", flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>Exhale Advisor</div>
              <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                <span style={{ color: "var(--sage)" }}>●</span> Online · Tailored to your plan
              </div>
            </div>
          </div>
          <button className="btn sm" onClick={handleNewConversation}>New conversation</button>
        </div>

        <div ref={chatRef} className="chat" style={{ maxHeight: 480, overflowY: "auto" }}>
          {messages.length === 0 && !loading && (
            <div className="msg bot">
              <div>
                {snowballTarget && summary.projectedPayoffDate
                  ? `Hi ${firstName}! You're focused on your ${snowballTarget.name}. Debt-free date: ${summary.projectedPayoffDate} — ${summary.monthsRemaining} months away. Analyzing your plan now…`
                  : "Hi there! I know your debts and snowball plan inside out. Ask me anything about your payoff strategy."}
              </div>
              <div className="msg-meta">Just now</div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role === "user" ? "you" : "bot"}`}>
              {m.role === "assistant" ? (
                <div className="md-body"><ReactMarkdown>{m.content}</ReactMarkdown></div>
              ) : (
                <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
              )}
              <div className="msg-meta">Now</div>
            </div>
          ))}
          {loading && (
            <div className="msg bot">
              <span style={{ display: "inline-flex", gap: 4 }}>
                <span className="thinking-dot" />
                <span className="thinking-dot" style={{ animationDelay: "0.15s" }} />
                <span className="thinking-dot" style={{ animationDelay: "0.30s" }} />
              </span>
            </div>
          )}
        </div>

        {dataChanged && !loading && (
          <div style={{ padding: "8px 16px", background: "var(--info-soft)", borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 13, color: "var(--info)" }}>📊 Your debt data changed — refresh for updated analysis.</span>
            <button className="btn sm" onClick={() => sendMessage("My debt data just changed. Give me a quick updated assessment of where I stand now.", true)}>
              Refresh analysis
            </button>
          </div>
        )}

        <div className="suggested">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => sendMessage(s)} disabled={loading}>{s}</button>
          ))}
        </div>

        <form className="chat-input" onSubmit={e => { e.preventDefault(); sendMessage(); }}>
          <input
            placeholder="Ask anything about your debts…"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="btn primary" disabled={loading || !input.trim()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/>
            </svg>
            Send
          </button>
        </form>
      </div>

      {/* Advisor Tools */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Advisor Tools</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => setActiveToolPanel(prev => prev === tool.id ? null : tool.id)}
              style={{
                padding: "14px 16px",
                border: `1px solid ${activeToolPanel === tool.id ? "var(--info)" : "var(--line)"}`,
                borderRadius: 14,
                background: activeToolPanel === tool.id ? "var(--info-soft)" : "var(--surface)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 6 }}>{tool.icon}</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: activeToolPanel === tool.id ? "var(--info)" : "var(--ink)", marginBottom: 2 }}>{tool.title}</div>
              <div style={{ fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.4 }}>{tool.desc}</div>
            </button>
          ))}
        </div>

        {/* Active tool panel */}
        {activeToolPanel && (
          <div className="card" style={{ marginTop: 12 }}>
            {activeToolPanel === "challenge" && <ChallengePanel debts={debts} settings={settings} summary={summary} />}
            {activeToolPanel === "card" && <DebtFreeCard summary={summary} userDoc={userDoc} />}
            {activeToolPanel === "scripts" && <NegotiationScripts debts={debts} />}
            {activeToolPanel === "refinancing" && <RefinancingDetector debts={debts} summary={summary} />}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="callout" style={{ marginTop: 24 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="callout-icon">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <div>
          <strong>Not financial advice.</strong> Exhale Advisor uses your data to suggest strategies, but final decisions are yours. Consider talking to a licensed financial planner for major changes.
        </div>
      </div>
    </div>
  );
}
