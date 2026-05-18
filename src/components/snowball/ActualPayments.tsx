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

function distributeSnowball(
  totalPaid: number,
  debts: UIDebt[],
  schedule: ScheduleEntry[],
  month: string,
): Record<string, number> {
  const entry = schedule.find(e => e.month === month);
  const sorted = [...debts].sort((a, b) => Number(a.balance) - Number(b.balance));
  const result: Record<string, number> = {};
  let remaining = totalPaid;
  for (const debt of sorted.slice(1)) {
    const planned = entry?.debtSnapshots.find(s => s.debtId === debt.id)?.payment ?? debt.minPayment;
    const amount = Math.min(remaining, planned);
    result[debt.id] = Math.round(amount * 100) / 100;
    remaining -= amount;
  }
  result[sorted[0].id] = Math.round(Math.max(0, remaining) * 100) / 100;
  return result;
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
  const [totalInput, setTotalInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [paymentLog, setPaymentLog] = useState<{ amount: number; label: string }[]>([]);

  // Inline editing state: debtId → draft value string
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  // Confirmation for destructive actions
  const [confirmClear, setConfirmClear] = useState<string | null>(null); // month string

  if (debts.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "96px 0", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✏️</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, color: "var(--ink)", marginBottom: 8, marginTop: 0 }}>
          No debts yet
        </h2>
        <p style={{ color: "var(--ink-muted)", maxWidth: 300, margin: "0 auto" }}>
          Add your debts to start tracking actual payments.
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
    setTotalInput("");
    setSaved(false);
    setPaymentLog([]);
    setEditingId(null);
    setConfirmClear(null);
  }

  const entry = schedule.find(e => e.month === selectedMonth);
  const plannedTotal = entry?.debtSnapshots.reduce((s, ds) => s + ds.payment, 0) ?? 0;
  const monthActuals = actuals.filter(a => a.month === selectedMonth);
  const loggedTotal = monthActuals.reduce((s, a) => s + a.amount, 0);

  const previewAmount = Number(totalInput) || 0;
  const preview = previewAmount > 0
    ? distributeSnowball(previewAmount, debts, schedule, selectedMonth)
    : null;

  function handleLog() {
    if (previewAmount <= 0) return;
    const dist = distributeSnowball(previewAmount, debts, schedule, selectedMonth);
    for (const [debtId, amount] of Object.entries(dist)) {
      const existing = actuals.find(a => a.month === selectedMonth && a.debtId === debtId)?.amount ?? 0;
      onSetActual(selectedMonth, debtId, Math.round((existing + amount) * 100) / 100);
    }
    const timeLabel = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setPaymentLog(prev => [...prev, { amount: previewAmount, label: timeLabel }]);
    setTotalInput("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
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
    const monthEntries = actuals.filter(a => a.month === month);
    for (const a of monthEntries) onSetActual(month, a.debtId, 0);
    if (month === selectedMonth) setPaymentLog([]);
    setConfirmClear(null);
  }

  // Summary KPIs
  const totalPaid = actuals.reduce((s, a) => s + a.amount, 0);
  let totalPrincipalApprox = 0;
  let totalInterestApprox = 0;
  for (const ent of schedule) {
    for (const ds of ent.debtSnapshots) {
      const act = actuals.find(a => a.month === ent.month && a.debtId === ds.debtId);
      if (act) {
        const intFrac = ds.payment > 0 ? ds.interestCharge / ds.payment : 0;
        totalInterestApprox += act.amount * intFrac;
        totalPrincipalApprox += act.amount * (1 - intFrac);
      }
    }
  }

  // Group history by month for the bottom table
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
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 400, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
            Log a <span className="h1-italic">payment.</span>
          </h1>
          <p style={{ color: "var(--ink-muted)", marginTop: 6 }}>
            Enter what you paid — we&apos;ll apply it to{" "}
            <strong style={{ color: "var(--ink)" }}>{target.name}</strong> first, then the rest snowballs from there.
          </p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 24 }}>
        <div className="kpi">
          <div className="kpi-label">Paid (all time)</div>
          <div className="kpi-value">{formatCurrency(totalPaid)}</div>
          <div className="kpi-sub">Across {actuals.length} entr{actuals.length !== 1 ? "ies" : "y"}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">To principal</div>
          <div className="kpi-value" style={{ color: "var(--sage-deep)" }}>{formatCurrency(totalPrincipalApprox)}</div>
          <div className="kpi-sub">{totalPaid > 0 ? ((totalPrincipalApprox / totalPaid) * 100).toFixed(0) : 0}% of total</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">To interest</div>
          <div className="kpi-value warn">{formatCurrency(totalInterestApprox)}</div>
          <div className="kpi-sub">{totalPaid > 0 ? ((totalInterestApprox / totalPaid) * 100).toFixed(0) : 0}% of total</div>
        </div>
      </div>

      {/* Month navigator */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--surface)", border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)", padding: "12px 20px", marginBottom: 16,
      }}>
        <button onClick={() => changeMonth(prevMonth(selectedMonth))} disabled={!canGoPrev}
          className="btn sm" style={{ opacity: canGoPrev ? 1 : 0.3 }}>‹ Prev</button>
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{formatMonth(selectedMonth)}</span>
        <button onClick={() => changeMonth(nextMonth(selectedMonth))} disabled={!canGoNext}
          className="btn sm" style={{ opacity: canGoNext ? 1 : 0.3 }}>Next ›</button>
      </div>

      {/* Log payment card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div className="card-title">Log payment — {formatMonth(selectedMonth)}</div>
          {loggedTotal > 0 && <span className="tag sage">{formatCurrency(loggedTotal)} logged</span>}
        </div>
        <div style={{ padding: 22 }}>
          <div style={{ marginBottom: preview ? 20 : 0 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Amount paid
            </label>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "var(--ink-muted)", fontWeight: 500, pointerEvents: "none" }}>$</span>
                <input
                  type="number" min="0" step="0.01" value={totalInput}
                  onChange={e => { setTotalInput(e.target.value); setSaved(false); }}
                  placeholder={plannedTotal > 0 ? plannedTotal.toFixed(2) : "0.00"}
                  style={{ ...inputBase, width: "100%", padding: "12px 14px 12px 32px", fontSize: 20, fontWeight: 600 }}
                  onFocus={e => (e.target.style.borderColor = "var(--info)")}
                  onBlur={e => (e.target.style.borderColor = "var(--line-strong)")}
                />
              </div>
              <button onClick={handleLog} disabled={previewAmount <= 0 || saved}
                className="btn primary"
                style={{ flexShrink: 0, padding: "12px 20px", fontSize: 14, opacity: previewAmount <= 0 ? 0.4 : 1 }}>
                {saved ? "✓ Logged!" : "Log payment"}
              </button>
            </div>
            {plannedTotal > 0 && (
              <p style={{ fontSize: 12.5, color: "var(--ink-faint)", marginTop: 8 }}>
                Planned: <strong style={{ color: "var(--ink-muted)" }}>{formatCurrency(plannedTotal)}</strong>
              </p>
            )}
          </div>

          {preview && (
            <div style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)", fontSize: 11, fontWeight: 700, color: "var(--ink-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Distribution preview
              </div>
              {sorted.map((debt, i) => {
                const amount = preview[debt.id] ?? 0;
                const isTarget = i === 0;
                return (
                  <div key={debt.id} style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
                    borderBottom: i < sorted.length - 1 ? "1px solid var(--line)" : "none",
                    background: isTarget ? "var(--info-soft)" : "transparent",
                  }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: isTarget ? "var(--info)" : "var(--surface-sunk)", color: isTarget ? "#fff" : "var(--ink-muted)", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{debt.name}</div>
                      {isTarget && <div style={{ fontSize: 11.5, color: "var(--info)", fontWeight: 600, marginTop: 1 }}>Attack target</div>}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: isTarget ? "var(--info)" : "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{formatCurrency(amount)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Session log */}
      {paymentLog.length > 0 && (
        <div style={{ background: "var(--sage-soft)", border: "1px solid color-mix(in oklab, var(--sage) 25%, var(--sage-soft))", borderRadius: "var(--r-lg)", padding: "14px 18px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sage-deep)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Logged this session
          </div>
          {paymentLog.map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5 }}>
              <span style={{ color: "var(--sage-deep)", fontWeight: 500 }}>Payment {i + 1}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--ink-muted)", fontSize: 12 }}>
                <span>{p.label}</span>
                <span style={{ fontWeight: 700, fontSize: 15, color: "var(--sage-deep)", fontVariantNumeric: "tabular-nums" }}>{formatCurrency(p.amount)}</span>
              </span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid color-mix(in oklab, var(--sage) 20%, transparent)", paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 13.5, fontWeight: 700, color: "var(--sage-deep)" }}>
            <span>Session total</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatCurrency(paymentLog.reduce((s, p) => s + p.amount, 0))}</span>
          </div>
        </div>
      )}

      {/* Logged amounts for this month — editable */}
      {monthActuals.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-head">
            <div className="card-title">Logged — {formatMonth(selectedMonth)}</div>
            {confirmClear === selectedMonth ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12.5, color: "var(--danger)" }}>Clear all entries?</span>
                <button onClick={() => clearMonth(selectedMonth)} className="btn sm" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>Yes, clear</button>
                <button onClick={() => setConfirmClear(null)} className="btn sm">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmClear(selectedMonth)} className="btn sm" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
                Clear all
              </button>
            )}
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Debt</th>
                <th className="right">Amount</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {monthActuals.map(a => {
                const debt = debts.find(d => d.id === a.debtId);
                const isEditing = editingId === a.debtId;
                return (
                  <tr key={a.debtId}>
                    <td style={{ fontWeight: 500 }}>{debt?.name ?? "—"}</td>
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
                        <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{formatCurrency(a.amount)}</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        {isEditing ? (
                          <button onClick={() => commitEdit(a.debtId)} className="btn sm" style={{ color: "var(--sage-deep)", borderColor: "var(--sage)" }}>Save</button>
                        ) : (
                          <button onClick={() => startEdit(a.debtId, a.amount)} className="btn sm">Edit</button>
                        )}
                        <button
                          onClick={() => deleteEntry(a.debtId)}
                          className="btn sm"
                          style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Full payment history grouped by month */}
      {monthGroups.length > 0 && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">Payment history</div>
          </div>
          {monthGroups.map(([month, entries]) => {
            const monthTotal = entries.reduce((s, a) => s + a.amount, 0);
            return (
              <div key={month} style={{ borderBottom: "1px solid var(--line)" }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 22px", background: "var(--surface-2)",
                }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{formatMonth(month)}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{formatCurrency(monthTotal)}</span>
                    {confirmClear === month ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "var(--danger)" }}>Clear?</span>
                        <button onClick={() => clearMonth(month)} className="btn sm" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>Yes</button>
                        <button onClick={() => setConfirmClear(null)} className="btn sm">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmClear(month)} className="btn sm" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>Clear</button>
                    )}
                  </div>
                </div>
                {entries.map(a => {
                  const debt = debts.find(d => d.id === a.debtId);
                  return (
                    <div key={a.debtId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 22px 10px 36px", borderTop: "1px solid var(--line)" }}>
                      <span style={{ fontSize: 13.5, color: "var(--ink-muted)" }}>{debt?.name ?? "—"}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{formatCurrency(a.amount)}</span>
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
