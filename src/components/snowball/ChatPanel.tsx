"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency, type UIDebt, type UISettings, type Summary } from "@/lib/snowball";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  debts: UIDebt[];
  settings: UISettings;
  summary: Summary;
}

export default function ChatPanel({ debts, settings, summary }: ChatPanelProps) {
  const { userDoc } = useAuth();
  const firstName = userDoc?.displayName?.split(" ")[0] || "there";
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataChanged, setDataChanged] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef<string | null>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Key that changes whenever the user's debt data changes
  const dataKey = `${debts.length}-${summary.totalBalance}-${summary.monthsRemaining}`;

  // Build enriched context from current state
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

  // Dynamic suggestion chips based on actual debt data
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

  // Core send function — hidden=true sends the prompt to API but only shows the assistant reply
  async function sendMessage(text?: string, hidden = false) {
    const msgText = (text || input).trim();
    if (!msgText || loading) return;
    if (!hidden) setInput("");

    const userMsg: Message = { role: "user", content: msgText };
    const newMessages: Message[] = hidden ? [...messages] : [...messages, userMsg];
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
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({ messages: apiMessages, context: buildContext() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
      }

      const data = await res.json() as { reply: string };
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      if (!hidden) {
        setMessages(prev => [...prev, { role: "assistant", content: `Sorry, I couldn't respond right now. (${msg})` }]);
      }
    } finally {
      setLoading(false);
    }
  }

  // Auto-trigger proactive analysis when debts first load or data changes significantly
  useEffect(() => {
    if (debts.length === 0) return;
    if (initializedRef.current === null) {
      // First load — auto-analyze
      initializedRef.current = dataKey;
      sendMessage(
        "Give me a brief personalized assessment of my debt situation: my #1 opportunity and my #1 risk, specific to my actual debts and numbers. Keep it to 3-4 sentences.",
        true
      );
    } else if (initializedRef.current !== dataKey && messages.length > 0) {
      // Data changed while conversation is active
      initializedRef.current = dataKey;
      setDataChanged(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey]);

  const snowballTarget = debts.length > 0 ? [...debts].sort((a, b) => a.balance - b.balance)[0] : null;

  return (
    <div>
      {/* Greeting */}
      <div className="greeting">
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Hi {firstName}!</div>
          <h1>
            Your <span className="h1-italic">advisor.</span>
          </h1>
          <p>Personalized guidance based on your actual debts and payoff plan.</p>
        </div>
      </div>

      {/* Chat card */}
      <div className="card">
        {/* Card header */}
        <div className="card-head">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "linear-gradient(135deg, var(--info), #6b8fd9)",
              display: "grid", placeItems: "center", color: "#fff", flexShrink: 0,
            }}>
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
          <button className="btn sm" onClick={() => { setMessages([]); initializedRef.current = null; }}>
            New conversation
          </button>
        </div>

        {/* Messages */}
        <div
          ref={chatRef}
          className="chat"
          style={{ maxHeight: 480, overflowY: "auto" }}
        >
          {messages.length === 0 && !loading && (
            <div className="msg bot">
              <div>
                {snowballTarget && summary.projectedPayoffDate
                  ? `Hi ${firstName}! You're currently focused on your ${snowballTarget.name}. Your debt-free date is ${summary.projectedPayoffDate} — ${summary.monthsRemaining} months away. Analyzing your plan now…`
                  : "Hi there! I know your debts and snowball plan inside out. Ask me anything about your payoff strategy."}
              </div>
              <div className="msg-meta">Just now</div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role === "user" ? "you" : "bot"}`}>
              {m.role === "assistant" ? (
                <div className="md-body">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
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

        {/* Data changed notification */}
        {dataChanged && !loading && (
          <div style={{
            padding: "8px 16px",
            background: "var(--info-soft)",
            borderTop: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}>
            <span style={{ fontSize: 13, color: "var(--info)" }}>
              📊 Your debt data changed — refresh for an updated analysis.
            </span>
            <button
              className="btn sm"
              onClick={() => sendMessage(
                "My debt data just changed. Give me a quick updated assessment of where I stand now.",
                true
              )}
            >
              Refresh analysis
            </button>
          </div>
        )}

        {/* Suggestions */}
        <div className="suggested">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => sendMessage(s)} disabled={loading}>
              {s}
            </button>
          ))}
        </div>

        {/* Input */}
        <form
          className="chat-input"
          onSubmit={e => { e.preventDefault(); sendMessage(); }}
        >
          <input
            placeholder="Ask anything about your debts…"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className="btn primary"
            disabled={loading || !input.trim()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/>
            </svg>
            Send
          </button>
        </form>
      </div>

      {/* Disclaimer */}
      <div className="callout" style={{ marginTop: 24 }}>
        <svg
          width="18" height="18"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="callout-icon"
        >
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <div>
          <strong>Not financial advice.</strong> Exhale Advisor uses your data to suggest strategies, but final decisions are yours.
          Consider talking to a licensed financial planner for major changes.
        </div>
      </div>
    </div>
  );
}
