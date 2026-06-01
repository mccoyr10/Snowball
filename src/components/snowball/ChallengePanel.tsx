"use client";

import { useState, useEffect } from "react";
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, Timestamp } from "firebase/firestore";
import { getIdToken } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency, type UIDebt, type UISettings, type Summary } from "@/lib/snowball";

interface ChallengeTask {
  id: string;
  week: number;
  description: string;
  estimatedSavings: number;
}

interface ChallengeDoc {
  tasks: ChallengeTask[];
  completedTaskIds?: string[];
  generatedAt?: Timestamp;
}

interface ChallengePanelProps {
  debts: UIDebt[];
  settings: UISettings;
  summary: Summary;
}

export default function ChallengePanel({ debts, settings, summary }: ChallengePanelProps) {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<ChallengeDoc | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "users", user.uid, "advisorChallenge", "current");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as ChallengeDoc;
        setChallenge(data);
        setCompletedIds(new Set(data.completedTaskIds ?? []));
      } else {
        setChallenge(null);
        setCompletedIds(new Set());
      }
      setLoading(false);
    }, () => { setLoading(false); });
    return () => unsub();
  }, [user]);

  async function generate() {
    if (!user || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const idToken = auth.currentUser ? await getIdToken(auth.currentUser) : "";
      const context = {
        debts: debts.map(d => ({ name: d.name, balance: d.balance, apr: d.apr, minPayment: d.minPayment })),
        monthlyBudget: settings.monthlyBudget,
        totalDebt: summary.totalBalance,
        projectedPayoff: summary.projectedPayoffDate,
        savingsVsMinOnly: summary.savingsVsMinOnly,
      };
      const res = await fetch("/api/advisor/generate-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify(context),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error || "Generation failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  async function toggleTask(taskId: string, completed: boolean) {
    if (!user) return;
    const ref = doc(db, "users", user.uid, "advisorChallenge", "current");
    await updateDoc(ref, {
      completedTaskIds: completed ? arrayRemove(taskId) : arrayUnion(taskId),
    });
  }

  if (loading) {
    return <div style={{ padding: 32, textAlign: "center", color: "var(--ink-muted)", fontSize: 14 }}>Loading your challenge…</div>;
  }

  if (!challenge) {
    const estimatedMonthly = formatCurrency(Math.round(settings.monthlyBudget * 0.15));
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>30-Day Payoff Challenge</h3>
          <p style={{ fontSize: 14, color: "var(--ink-muted)", lineHeight: 1.5 }}>
            Get a personalized 30-task challenge built around your actual debts and budget.
            Small, daily actions that could free up an extra <strong>{estimatedMonthly}/month</strong> for debt payoff.
          </p>
        </div>
        {error && <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <button className="btn primary" onClick={generate} disabled={generating} style={{ borderRadius: 24 }}>
          {generating ? "Generating your challenge…" : "Generate My 30-Day Challenge"}
        </button>
      </div>
    );
  }

  const weeks = [1, 2, 3, 4];
  const totalSavings = challenge.tasks.reduce((sum, t) => sum + (t.estimatedSavings || 0), 0);
  const completedCount = completedIds.size;
  const totalCount = challenge.tasks.length;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>30-Day Payoff Challenge</h3>
          <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>
            {completedCount}/{totalCount} tasks · Est. {formatCurrency(totalSavings)}/mo freed up
          </div>
        </div>
        <button className="btn sm" onClick={generate} disabled={generating}>
          {generating ? "Regenerating…" : "Regenerate"}
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, background: "var(--line)", borderRadius: 3, marginBottom: 20, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`, background: "var(--sage)", borderRadius: 3, transition: "width 0.3s" }} />
      </div>

      {weeks.map(week => {
        const weekTasks = challenge.tasks.filter(t => t.week === week);
        if (weekTasks.length === 0) return null;
        const weekCompleted = weekTasks.filter(t => completedIds.has(t.id)).length;
        return (
          <div key={week} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--info)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
              Week {week} · {weekCompleted}/{weekTasks.length} done
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {weekTasks.map(task => {
                const done = completedIds.has(task.id);
                return (
                  <label key={task.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: "10px 12px", borderRadius: 10, background: done ? "var(--info-soft)" : "var(--surface)", border: "1px solid var(--line)", transition: "all 0.15s" }}>
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => toggleTask(task.id, done)}
                      style={{ marginTop: 2, accentColor: "var(--info)", flexShrink: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, color: done ? "var(--ink-muted)" : "var(--ink)", textDecoration: done ? "line-through" : "none", lineHeight: 1.4 }}>
                        {task.description}
                      </div>
                      {task.estimatedSavings > 0 && (
                        <div style={{ fontSize: 11, color: "var(--sage)", marginTop: 3, fontWeight: 600 }}>
                          Est. +{formatCurrency(task.estimatedSavings)}/mo
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      {error && <p style={{ color: "var(--danger)", fontSize: 13, marginTop: 8 }}>{error}</p>}
    </div>
  );
}
