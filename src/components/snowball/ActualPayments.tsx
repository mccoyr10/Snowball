"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  formatCurrency, formatMonth, prevMonth, nextMonth, todayYYYYMM,
  type UIDebt, type UIActual, type ScheduleEntry,
} from "@/lib/snowball";

interface ActualPaymentsProps {
  debts: UIDebt[];
  schedule: ScheduleEntry[];
  actuals: UIActual[];
  onSetActual: (month: string, debtId: string, amount: number) => void;
}

// Distribute extra dollars snowball-style: smallest balance first, cascade on overflow.
function distributeExtra(
  extraAmount: number,
  debts: UIDebt[],
): { debtId: string; name: string; amount: number; clearsDebt: boolean }[] {
  const sorted = [...debts].sort((a, b) => Number(a.balance) - Number(b.balance));
  const result: { debtId: string; name: string; amount: number; clearsDebt: boolean }[] = [];
  let remaining = extraAmount;

  for (const debt of sorted) {
    if (remaining <= 0) break;
    const cap = Number(debt.balance);
    const amount = Math.round(Math.min(remaining, cap) * 100) / 100;
    if (amount > 0) {
      result.push({ debtId: debt.id, name: debt.name, amount, clearsDebt: amount >= cap - 0.005 });
      remaining = Math.round((remaining - amount) * 100) / 100;
    }
  }

  return result;
}

function ProgressBar({ value, color = "var(--info)" }: { value: number; color?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div style={{ position: "relative", height: 6, borderRadius: 3, background: "var(--surface-sunk)", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: "0 auto 0 0", width: pct + "%", background: color, borderRadius: 3, transition: "width 0.5s ease" }} />
    </div>
  );
}

const inputBase: React.CSSProperties = {
  border: "1px solid var(--line-strong)",
  borderRadius: "var(--r-md)",
  padding: "7px 10px",
  fontSize: 14,
  color: "var(--ink)",
  background: "var(--surface)",
  fontVariantNumeric: "tabular-nums",
  outline: "none",
  fontFamily: "var(--font-ui)",
};

export default function ActualPayments({ debts, schedule, actuals, onSetActual }: ActualPaymentsProps) {
  const { userDoc } = useAuth();
  const firstName = userDoc?.displayName?.split(" ")[0] || "there";

  const [selectedMonth, setSelectedMonth] = useState(todayYYYYMM());
  const [extraInput, setExtraInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [confirmClear, setConfirmClear] = useState<string | null>(null);

  if (debts.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "96px 0", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✏️</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, color: "var(--ink)", marginBottom: 8, marginTop: 0 }}>
          No debts yet
        </h2>
        <p style={{ color: "var(--ink-muted)", maxWidth: 300, margin: "0 auto" }}>
          Add your debts to start tracking extra payments.
        </p>
      </div>
    );
  }

  const sorted = [...debts].sort((a, b) => Number(a.balance) - Number(b.balance));
  const target = sorted[0];

  const months = schedule.length > 0 ? schedule.map(e => e.month) : [];
  const canGoPrev = months.length === 0 || selectedMonth > months[0];
  const canGoNext = selectedMonth < todayYYYYMM();

  function changeMonth(month: string) {
    setSelectedMonth(month);
    setExtraInput("");
    setSaved(false);
    setEditingId(null);
    setConfirmClear(null);
  }

  const monthActuals = actuals.filter(a => a.month === selectedMonth);
  const loggedTotal = monthActuals.reduce((s, a) => s + a.amount, 0);

  const extraAmount = Number(extraInput) || 0;
  const preview = extraAmount > 0 ? distributeExtra(extraAmount, debts) : null;

  function handleLog() {
    if (extraAmount <= 0) return;
    const dist = distributeExtra(extraAmount, debts);
    for (const { debtId, amount } of dist) {
      const existing = actuals.find(a => a.month === selectedMonth && a.debtId === debtId)?.amount ?? 0;
      onSetActual(selectedMonth, debtId, Math.round((existing + amount) * 100) / 100);
    }
    setExtraInput("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function startEdit(debtId: string, current: number) {
    setEditingId(debtId);
    setEditDraft(current.toFixed(2));
  }

  function commitEdit(debtId: string) {
    const val = Math.round((Number(editDraft) || 0) * 100) / 100;
    onSetActual(selectedMonth, debtId, val);
    setEditingId(null);
  }

  function deleteEntry(debtId: string) {
    onSetActual(selectedMonth, debtId, 0);
  }

  function clearMonth(month: string) {
    for (const a of actuals.filter(e => e.month === month)) {
      onSetActual(month, a.debtId, 0);
    }
    setConfirmClear(null);
  }

  // All-time extra totals
  const totalExtra = actuals.reduce((s, a) => s + a.amount, 0);
  const totalExtraMonths = new Set(actuals.map(a => a.month)).size;

  // Target progress
  const targetPct = target.startingBalance && target.startingBalance > 0
    ? Math.min(1, Math.max(0, 1 - Number(target.balance) / Number(target.startingBalance)))
    : 0;

  // History grouped by month, most recent first
  const monthGroups = Array.from(
    actuals.reduce((map, a) => {
      if (!map.has(a.month)) map.set(a.month, []);
      map.get(a.month)!.push(a);
      return map;
    }, new Map<string, UIActual[]>())
  ).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div>
      {/* Greeting */}
      <div className="greeting">
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Hi {firstName}!</div>
          <h1>
            Log an <span className="h1-italic">extra payment.</span>
          </h1>
          <p style={{ color: "var(--ink-muted)", maxWidth: 480 }}>
            Minimums are on autopilot. Any extra you throw at your debt goes straight to{" "}
            <strong style={{ color: "var(--ink)" }}>{target.name}</strong> — snowball-style.
          </p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 24 }}>
        <div className="kpi">
          <div className="kpi-label">Extra this month</div>
          <div className="kpi-value" style={{ color: loggedTotal > 0 ? "var(--sage-deep)" : "var(--ink)" }}>
            {formatCurrency(loggedTotal)}
          </div>
          <div className="kpi-sub">{formatMonth(selectedMonth)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Extra all time</div>
          <div className="kpi-value">{formatCurrency(totalExtra)}</div>
          <div className="kpi-sub">{totalExtraMonths} month{totalExtraMonths !== 1 ? "s" : ""} of payments</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Attack target</div>
          <div className="kpi-value" style={{ fontSize: 18, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {target.name}
          </div>
          <div className="kpi-sub">{formatCurrency(Number(target.balance))} remaining</div>
        </div>
      </div>

      {/* Month nav */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--surface)", border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)", padding: "12px 20px", marginBottom: 20,
      }}>
        <button onClick={() => changeMonth(prevMonth(selectedMonth))} disabled={!canGoPrev}
          className="btn sm" style={{ opacity: canGoPrev ? 1 : 0.3 }}>‹ Prev</button>
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{formatMonth(selectedMonth)}</span>
        <button onClick={() => changeMonth(nextMonth(selectedMonth))} disabled={!canGoNext}
          className="btn sm" style={{ opacity: canGoNext ? 1 : 0.3 }}>Next ›</button>
      </div>

      {/* Attack target card */}
      <div style={{
        background: "var(--info-soft)",
        border: "1px solid color-mix(in oklab, var(--info) 20%, var(--info-soft))",
        borderRadius: "var(--r-lg)", padding: "20px 22px", marginBottom: 16,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--info)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
          Attack target
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", lineHeight: 1.2 }}>{target.name}</div>
            <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 4 }}>
              {target.apr.toFixed(2)}% APR · min {formatCurrency(target.minPayment)}/mo
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--info)", fontVariantNumeric: "tabular-nums" }}>
              {formatCurrency(Number(target.balance))}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>remaining</div>
          </div>
        </div>
        <ProgressBar value={targetPct} color="var(--info)" />
        <div style={{ fontSize: 12, color: "var(--info)", fontWeight: 600, marginTop: 6 }}>
          {Math.round(targetPct * 100)}% paid off
          {sorted.length > 1 && (
            <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>
              {" · "}next up: {sorted[1].name} ({formatCurrency(Number(sorted[1].balance))})
            </span>
          )}
        </div>
      </div>

      {/* Log extra payment card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <div className="card-title">Log extra payment — {formatMonth(selectedMonth)}</div>
          {saved && (
            <span className="tag sage">Logged!</span>
          )}
        </div>
        <div style={{ padding: 22 }}>
          <p style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 0, marginBottom: 16 }}>
            Got a bonus, sold something, or just have extra cash? Enter any amount above your regular minimums.
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: preview ? 20 : 0 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <span style={{
                position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                fontSize: 18, color: "var(--ink-muted)", fontWeight: 500, pointerEvents: "none",
              }}>$</span>
              <input
                type="number" min="0" step="0.01" value={extraInput}
                onChange={e => { setExtraInput(e.target.value); setSaved(false); }}
                placeholder="0.00"
                style={{ ...inputBase, width: "100%", padding: "12px 14px 12px 32px", fontSize: 20, fontWeight: 600 }}
                onFocus={e => (e.target.style.borderColor = "var(--info)")}
                onBlur={e => (e.target.style.borderColor = "var(--line-strong)")}
                onKeyDown={e => { if (e.key === "Enter") handleLog(); }}
              />
            </div>
            <button
              onClick={handleLog}
              disabled={extraAmount <= 0 || saved}
              className="btn primary"
              style={{ flexShrink: 0, padding: "12px 22px", fontSize: 14, opacity: extraAmount <= 0 ? 0.4 : 1 }}
            >
              {saved ? "✓ Done!" : "Log it →"}
            </button>
          </div>

          {/* Cascade preview */}
          {preview && preview.length > 0 && (
            <div style={{
              background: "var(--surface-2)", border: "1px solid var(--line)",
              borderRadius: "var(--r-md)", overflow: "hidden",
            }}>
              <div style={{
                padding: "10px 16px", borderBottom: "1px solid var(--line)",
                fontSize: 11, fontWeight: 700, color: "var(--ink-muted)",
                letterSpacing: "0.08em", textTransform: "uppercase",
              }}>
                Where it goes
              </div>
              {preview.map((item, i) => (
                <div key={item.debtId} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "13px 16px",
                  borderBottom: i < preview.length - 1 ? "1px solid var(--line)" : "none",
                  background: i === 0 ? "var(--info-soft)" : "transparent",
                }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                    background: i === 0 ? "var(--info)" : "var(--ink-faint)",
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{item.name}</span>
                    {i === 0 && (
                      <span style={{ fontSize: 11.5, color: "var(--info)", fontWeight: 600, marginLeft: 8 }}>attack target</span>
                    )}
                    {i > 0 && (
                      <span style={{ fontSize: 11.5, color: "var(--ink-faint)", marginLeft: 8 }}>overflow</span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {item.clearsDebt && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: "var(--sage-deep)",
                        background: "var(--sage-soft)", borderRadius: "var(--r-sm)",
                        padding: "2px 7px", letterSpacing: "0.03em",
                      }}>PAID OFF</span>
                    )}
                    <span style={{
                      fontSize: 16, fontWeight: 700,
                      color: i === 0 ? "var(--info)" : "var(--ink)",
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Logged this month */}
      {monthActuals.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-head">
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div className="card-title">Extra logged — {formatMonth(selectedMonth)}</div>
              <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                {formatCurrency(loggedTotal)} total · edit or remove individual entries below
              </div>
            </div>
            {confirmClear === selectedMonth ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 12.5, color: "var(--danger)" }}>Clear all?</span>
                <button onClick={() => clearMonth(selectedMonth)} className="btn sm"
                  style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>Yes, clear</button>
                <button onClick={() => setConfirmClear(null)} className="btn sm">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmClear(selectedMonth)} className="btn sm"
                style={{ color: "var(--danger)", borderColor: "var(--danger)", flexShrink: 0 }}>
                Clear all
              </button>
            )}
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Debt</th>
                <th className="right">Extra paid</th>
                <th style={{ width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {monthActuals.map(a => {
                const debt = debts.find(d => d.id === a.debtId);
                const isEditing = editingId === a.debtId;
                const isTarget = a.debtId === target.id;
                return (
                  <tr key={a.debtId}>
                    <td>
                      <span style={{ fontWeight: 600, color: "var(--ink)" }}>{debt?.name ?? "—"}</span>
                      {isTarget && (
                        <span className="tag info" style={{ marginLeft: 8, fontSize: 10.5 }}>Target</span>
                      )}
                    </td>
                    <td className="right">
                      {isEditing ? (
                        <input
                          type="number" min="0" step="0.01"
                          value={editDraft}
                          onChange={e => setEditDraft(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") commitEdit(a.debtId); if (e.key === "Escape") setEditingId(null); }}
                          autoFocus
                          style={{ ...inputBase, width: 110, textAlign: "right" }}
                          onFocus={e => (e.target.style.borderColor = "var(--info)")}
                          onBlur={() => commitEdit(a.debtId)}
                        />
                      ) : (
                        <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                          {formatCurrency(a.amount)}
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        {isEditing ? (
                          <button onClick={() => commitEdit(a.debtId)} className="btn sm"
                            style={{ color: "var(--sage-deep)", borderColor: "var(--sage)" }}>Save</button>
                        ) : (
                          <button onClick={() => startEdit(a.debtId, a.amount)} className="btn sm">Edit</button>
                        )}
                        <button onClick={() => deleteEntry(a.debtId)} className="btn sm"
                          style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment history */}
      {monthGroups.length > 0 && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">History</div>
            <span className="sub">{monthGroups.length} month{monthGroups.length !== 1 ? "s" : ""}</span>
          </div>
          {monthGroups.map(([month, entries], groupIdx) => {
            const monthTotal = entries.reduce((s, a) => s + a.amount, 0);
            return (
              <div key={month} style={{ borderBottom: groupIdx < monthGroups.length - 1 ? "1px solid var(--line)" : "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "13px 22px", background: "var(--surface-2)",
                }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{formatMonth(month)}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>
                      {formatCurrency(monthTotal)}
                    </span>
                    {confirmClear === month ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "var(--danger)" }}>Clear?</span>
                        <button onClick={() => clearMonth(month)} className="btn sm"
                          style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>Yes</button>
                        <button onClick={() => setConfirmClear(null)} className="btn sm">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmClear(month)} className="btn sm"
                        style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>Clear</button>
                    )}
                  </div>
                </div>
                {entries.map(a => {
                  const debt = debts.find(d => d.id === a.debtId);
                  return (
                    <div key={a.debtId} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 22px 10px 36px",
                      borderTop: "1px solid var(--line)",
                    }}>
                      <span style={{ fontSize: 13.5, color: "var(--ink-muted)" }}>{debt?.name ?? "—"}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        {formatCurrency(a.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
