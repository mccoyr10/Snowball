"use client";

import { useState, useRef, useEffect } from "react";
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

const suggestions = [
  "Should I switch to avalanche?",
  "What if I add $200/month?",
  "How can I find extra money?",
  "When can I refinance?",
];

export default function ChatPanel({ debts, settings, summary }: ChatPanelProps) {
  const { userDoc } = useAuth();
  const firstName = userDoc?.displayName?.split(" ")[0] || "there";
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function sendMessage(text?: string) {
    const msgText = (text || input).trim();
    if (!msgText || loading) return;
    setInput("");

    const newMessages: Message[] = [...messages, { role: "user", content: msgText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const context = {
        debts: debts.map(d => ({
          name: d.name,
          balance: formatCurrency(d.balance),
          apr: d.apr + "%",
          minPayment: formatCurrency(d.minPayment),
        })),
        monthlyBudget: formatCurrency(settings.monthlyBudget),
        totalDebt: formatCurrency(summary.totalBalance),
        projectedPayoff: summary.projectedPayoffDate ?? "unknown",
        monthsRemaining: summary.monthsRemaining,
        totalInterest: formatCurrency(summary.totalInterestPlanned),
        savingsVsMinOnly: formatCurrency(summary.savingsVsMinOnly),
      };

      const idToken = auth.currentUser ? await getIdToken(auth.currentUser) : "";
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({ messages: newMessages, context }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
      }

      const data = await res.json() as { reply: string };
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setMessages(prev => [...prev, { role: "assistant", content: `Sorry, I couldn't respond right now. (${msg})` }]);
    } finally {
      setLoading(false);
    }
  }

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
              {/* Spark icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>Snowball Advisor</div>
              <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                <span style={{ color: "var(--sage)" }}>●</span> Online · Tailored to your plan
              </div>
            </div>
          </div>
          <button className="btn sm" onClick={() => setMessages([])}>
            New conversation
          </button>
        </div>

        {/* Messages */}
        <div
          ref={chatRef}
          className="chat"
          style={{ maxHeight: 480, overflowY: "auto" }}
        >
          {messages.length === 0 && (
            <div className="msg bot">
              <div>
                Hi there! I know your debts and snowball plan. Ask me anything about your payoff strategy.
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
          <div ref={bottomRef} />
        </div>

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
          <strong>Not financial advice.</strong> Snowball Advisor uses your data to suggest strategies, but final decisions are yours.
          Consider talking to a licensed financial planner for major changes.
        </div>
      </div>
    </div>
  );
}
