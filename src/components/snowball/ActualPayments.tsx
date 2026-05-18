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

// Distribute a total payment snowball-style:
// pay minimums on debts 2+ first, then dump the rest into the #1 target
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

  // Pay planned amounts for non-target debts first
  for (const debt of sorted.slice(1)) {
    const planned = entry?.debtSnapshots.find(s => s.debtId === debt.id)?.payment ?? debt.minPayment;
    const amount = Math.min(remaining, planned);
    result[debt.id] = Math.round(amount * 100) / 100;
    remaining -= amount;
  }

  // All remaining goes to the #1 attack target
  result[sorted[0].id] = Math.round(Math.max(0, remaining) * 100) / 100;

  return result;
}

export default function ActualPayments({ debts, schedule, actuals, onSetActual }: ActualPaymentsProps) {
  const { userDoc } = useAuth();
  const firstName = userDoc?.displayName?.split(" ")[0] || "there";

  const [selectedMonth, setSelectedMonth] = useState(todayYYYYMM());
  const [totalInput, setTotalInput] = useState("");
  const [saved, setSaved] = useState(false);

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

  // Planned total for selected month
  const entry = schedule.find(e => e.month === selectedMonth);
  const plannedTotal = entry?.debtSnapshots.reduce((s, ds) => s + ds.payment, 0) ?? 0;

  // What's already logged for this month
  const loggedTotal = actuals
    .filter(a => a.month === selectedMonth)
    .reduce((s, a) => s + a.amount, 0);

  // Preview distribution for the entered amount
  const previewAmount = Number(totalInput) || 0;
  const preview = previewAmount > 0
    ? distributeSnowball(previewAmount, debts, schedule, selectedMonth)
    : null;

  function handleLog() {
    if (previewAmount <= 0) return;
    const dist = distributeSnowball(previewAmount, debts, schedule, selectedMonth);
    for (const [debtId, amount] of Object.entries(dist)) {
      onSetActual(selectedMonth, debtId, amount);
    }
    setTotalInput("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // Summary KPIs from all actuals
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
            Enter what you paid — we{"'"}ll apply it to{" "}
            <strong style={{ color: "var(--ink)" }}>{target.name}</strong> first, then the rest snowballs from there.
          </p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 24 }}>
        <div className="kpi">
          <div className="kpi-label">Paid (all time)</div>
          <div className="kpi-value">{formatCurrency(totalPaid)}</div>
          <div className="kpi-sub">Across {actuals.length} payment{actuals.length !== 1 ? "s" : ""}</div>
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
        <button onClick={() => { setSelectedMonth(prevMonth(selectedMonth)); setTotalInput(""); setSaved(false); }}
          disabled={!canGoPrev} className="btn sm" style={{ opacity: canGoPrev ? 1 : 0.3 }}>
          ‹ Prev
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{formatMonth(selectedMonth)}</span>
        <button onClick={() => { setSelectedMonth(nextMonth(selectedMonth)); setTotalInput(""); setSaved(false); }}
          disabled={!canGoNext} className="btn sm" style={{ opacity: canGoNext ? 1 : 0.3 }}>
          Next ›
        </button>
      </div>

      {/* Payment entry card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div className="card-title">Log payment — {formatMonth(selectedMonth)}</div>
          {loggedTotal > 0 && (
            <span className="tag sage">{formatCurrency(loggedTotal)} logged</span>
          )}
        </div>
        <div style={{ padding: 22 }}>

          {/* Total amount input */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Total amount paid this month
            </label>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "var(--ink-muted)", fontWeight: 500, pointerEvents: "none" }}>
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalInput}
                  onChange={e => { setTotalInput(e.target.value); setSaved(false); }}
                  placeholder={plannedTotal > 0 ? plannedTotal.toFixed(2) : "0.00"}
                  style={{
                    width: "100%",
                    border: "1px solid var(--line-strong)",
                    borderRadius: "var(--r-md)",
                    padding: "12px 14px 12px 32px",
                    fontSize: 20,
                    fontWeight: 600,
                    color: "var(--ink)",
                    background: "var(--surface)",
                    fontVariantNumeric: "tabular-nums",
                    outline: "none",
                  }}
                  onFocus={e => (e.target.style.borderColor = "var(--info)")}
                  onBlur={e => (e.target.style.borderColor = "var(--line-strong)")}
                />
              </div>
              <button
                onClick={handleLog}
                disabled={previewAmount <= 0 || saved}
                className="btn primary"
                style={{ flexShrink: 0, padding: "12px 20px", fontSize: 14, opacity: previewAmount <= 0 ? 0.4 : 1 }}
              >
                {saved ? "✓ Logged!" : "Log payment"}
              </button>
            </div>
            {plannedTotal > 0 && (
              <p style={{ fontSize: 12.5, color: "var(--ink-faint)", marginTop: 8 }}>
                Planned for this month: <strong style={{ color: "var(--ink-muted)" }}>{formatCurrency(plannedTotal)}</strong>
              </p>
            )}
          </div>

          {/* Distribution preview */}
          {preview && (
            <div style={{
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              overflow: "hidden",
            }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)", fontSize: 11, fontWeight: 700, color: "var(--ink-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                How it{"'"}s distributed
              </div>
              {sorted.map((debt, i) => {
                const amount = preview[debt.id] ?? 0;
                const isTarget = i === 0;
                return (
                  <div key={debt.id} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "12px 16px",
                    borderBottom: i < sorted.length - 1 ? "1px solid var(--line)" : "none",
                    background: isTarget ? "var(--info-soft)" : "transparent",
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: isTarget ? "var(--info)" : "var(--surface-sunk)",
                      color: isTarget ? "#fff" : "var(--ink-muted)",
                      display: "grid", placeItems: "center",
                      fontSize: 12, fontWeight: 700, flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{debt.name}</div>
                      {isTarget && (
                        <div style={{ fontSize: 11.5, color: "var(--info)", fontWeight: 600, marginTop: 1 }}>
                          Attack target — extra goes here
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: isTarget ? "var(--info)" : "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
                      {formatCurrency(amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Payment history */}
      {actuals.length > 0 && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">Payment history</div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Debt</th>
                <th className="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {[...actuals]
                .sort((a, b) => b.month.localeCompare(a.month))
                .map((a, i) => {
                  const debt = debts.find(d => d.id === a.debtId);
                  return (
                    <tr key={i}>
                      <td style={{ color: "var(--ink-muted)" }}>{formatMonth(a.month)}</td>
                      <td style={{ fontWeight: 500 }}>{debt?.name ?? "—"}</td>
                      <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(a.amount)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
