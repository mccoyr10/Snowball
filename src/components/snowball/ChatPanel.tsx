"use client";

import { useState, useRef, useEffect } from "react";
import { getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
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
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setMessages(prev => [...prev, { role: "assistant", content: `Sorry, I couldn't respond right now. (${msg})` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] sm:h-[600px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="text-5xl mb-4">🤖</div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Ask your debt advisor</h2>
            <p className="text-sm text-gray-400 max-w-xs">I know your debts and budget. Ask me anything about your payoff strategy.</p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {[
                "How much interest will I save?",
                "Should I use avalanche instead?",
                "What if I add $200/month?",
              ].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full px-3 py-1.5"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-white border border-gray-100 text-gray-700 rounded-bl-sm shadow-sm"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Ask about your debt strategy…"
          disabled={loading}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl px-4 py-3 text-sm font-medium min-w-[56px]"
        >
          Send
        </button>
      </div>
    </div>
  );
}
