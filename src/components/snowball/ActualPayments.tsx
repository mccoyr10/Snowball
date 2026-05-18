"use client";

import { useState } from "react";
import { formatCurrency, formatMonth, prevMonth, nextMonth, todayYYYYMM, type UIDebt, type UIActual, type ScheduleEntry } from "@/lib/snowball";

interface ActualPaymentsProps {
  debts: UIDebt[];
  schedule: ScheduleEntry[];
  actuals: UIActual[];
  onSetActual: (month: string, debtId: string, amount: number) => void;
  onGoToDebts?: () => void;
}

export default function ActualPayments({ debts, schedule, actuals, onSetActual, onGoToDebts }: ActualPaymentsProps) {
  const [selectedMonth, setSelectedMonth] = useState(todayYYYYMM());

  if (debts.length === 0) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "96px 0", textAlign: "center",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✏️</div>
        <h2 style={{
          fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400,
          color: "var(--ink)", marginBottom: 8, marginTop: 0,
        }}>
          No debts yet
        </h2>
        <p style={{ color: "var(--ink-muted)", maxWidth: 300, margin: "0 auto 20px" }}>
          Add your debts to start tracking actual payments.
        </p>
        {onGoToDebts && (
          <button className="btn primary" onClick={onGoToDebts}>Go to Debts →</button>
        )}
      </div>
    );
  }

  const months = schedule.length > 0 ? schedule.map(e => e.month) : [];
  const canGoPrev = months.length === 0 || selectedMonth > months[0];
  const canGoNext = selectedMonth < todayYYYYMM();

  function getPlanned(debtId: string): number {
    const entry = schedule.find(e => e.month === selectedMonth);
    if (!entry) return 0;
    return entry.debtSnapshots.find(s => s.debtId === debtId)?.payment ?? 0;
  }

  function getActual(debtId: string): number | undefined {
    return actuals.find(a => a.month === selectedMonth && a.debtId === debtId)?.amount;
  }

  // Compute summary KPIs from all actuals
  const totalPaid = actuals.reduce((s, a) => s + a.amount, 0);
  // Approximate principal/interest split from schedule
  let totalPrincipalApprox = 0;
  let totalInterestApprox = 0;
  for (const entry of schedule) {
    for (const ds of entry.debtSnapshots) {
      const act = actuals.find(a => a.month === entry.month && a.debtId === ds.debtId);
      if (act) {
        const intFrac = ds.payment > 0 ? ds.interestCharge / ds.payment : 0;
        totalInterestApprox += act.amount * intFrac;
        totalPrincipalApprox += act.amount * (1 - intFrac);
      }
    }
  }

  // cumulative variance across all months up to and including selectedMonth
  let cumulativeVariance = 0;
  for (const entry of schedule) {
    if (entry.month > selectedMonth) break;
    for (const ds of entry.debtSnapshots) {
      const act = actuals.find(a => a.month === entry.month && a.debtId === ds.debtId);
      if (act != null) cumulativeVariance += act.amount - ds.payment;
    }
  }

  const monthActuals = debts.map(d => ({
    debt: d,
    planned: getPlanned(d.id),
    actual: getActual(d.id),
  }));
  const totalPlanned = monthActuals.reduce((s, r) => s + r.planned, 0);
  const totalActual = monthActuals.reduce((s, r) => s + (r.actual ?? 0), 0);

  return (
    <div>
      {/* Greeting */}
      <div className="greeting">
        <div>
          <h1>
            Payment <span className="h1-italic">history.</span>
          </h1>
          <p>Every payment you{"'"}ve logged, with principal/interest breakdown.</p>
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
          <div className="kpi-sub">
            {totalPaid > 0 ? ((totalPrincipalApprox / totalPaid) * 100).toFixed(0) : 0}% of total
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">To interest</div>
          <div className="kpi-value warn">{formatCurrency(totalInterestApprox)}</div>
          <div className="kpi-sub">
            {totalPaid > 0 ? ((totalInterestApprox / totalPaid) * 100).toFixed(0) : 0}% of total
          </div>
        </div>
      </div>

      {/* Month navigator */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--surface)", border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)", padding: "12px 20px", marginBottom: 16,
      }}>
        <button
          onClick={() => setSelectedMonth(prevMonth(selectedMonth))}
          disabled={!canGoPrev}
          className="btn sm"
          style={{ opacity: canGoPrev ? 1 : 0.3 }}
        >
          ‹ Prev
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>
          {formatMonth(selectedMonth)}
        </span>
        <button
          onClick={() => setSelectedMonth(nextMonth(selectedMonth))}
          disabled={!canGoNext}
          className="btn sm"
          style={{ opacity: canGoNext ? 1 : 0.3 }}
        >
          Next ›
        </button>
      </div>

      {/* Cumulative variance banner */}
      {cumulativeVariance !== 0 && (
        <div style={{
          marginBottom: 16,
          background: cumulativeVariance >= 0 ? "var(--sage-soft)" : "var(--danger-soft)",
          border: `1px solid ${cumulativeVariance >= 0 ? "var(--sage-soft)" : "var(--danger-soft)"}`,
          borderRadius: "var(--r-lg)",
          padding: "12px 16px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>{cumulativeVariance >= 0 ? "💚" : "⚠️"}</span>
          <div>
            <div style={{
              fontWeight: 600, fontSize: 14,
              color: cumulativeVariance >= 0 ? "var(--sage-deep)" : "var(--danger)",
            }}>
              Cumulative variance: {cumulativeVariance >= 0 ? "+" : ""}{formatCurrency(cumulativeVariance)}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink-muted)", marginTop: 2 }}>
              {cumulativeVariance >= 0 ? "You've paid more than planned" : "You've paid less than planned"}
            </div>
          </div>
        </div>
      )}

      {/* Payments table */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Log payments — {formatMonth(selectedMonth)}</div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Debt</th>
              <th className="right">Planned</th>
              <th className="right">Actual paid</th>
              <th className="right">Variance</th>
            </tr>
          </thead>
          <tbody>
            {monthActuals.map(({ debt, planned, actual }) => {
              const variance = actual != null ? actual - planned : null;
              return (
                <tr key={debt.id}>
                  <td style={{ fontWeight: 500 }}>{debt.name}</td>
                  <td className="num" style={{ color: "var(--ink-muted)" }}>{formatCurrency(planned)}</td>
                  <td className="num">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={actual ?? ""}
                      placeholder={planned.toFixed(2)}
                      onChange={e => onSetActual(selectedMonth, debt.id, Number(e.target.value) || 0)}
                      style={{
                        width: 110, textAlign: "right",
                        border: "1px solid var(--line-strong)",
                        borderRadius: "var(--r-md)",
                        padding: "6px 10px",
                        fontSize: 13.5,
                        color: "var(--ink)",
                        background: "var(--surface)",
                        fontFamily: "var(--font-num)",
                      }}
                      onFocus={e => (e.target.style.borderColor = "var(--info)")}
                      onBlur={e => (e.target.style.borderColor = "var(--line-strong)")}
                    />
                  </td>
                  <td className="num" style={{
                    fontWeight: 500,
                    color: variance == null ? "var(--ink-faint)" : variance >= 0 ? "var(--sage)" : "var(--danger)",
                  }}>
                    {variance == null ? "—" : `${variance >= 0 ? "+" : ""}${formatCurrency(variance)}`}
                  </td>
                </tr>
              );
            })}
            <tr style={{ background: "var(--surface-2)" }}>
              <td style={{ fontWeight: 600, color: "var(--ink)" }}>Total</td>
              <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(totalPlanned)}</td>
              <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(totalActual)}</td>
              <td className="num" style={{
                fontWeight: 600,
                color: totalActual > 0
                  ? (totalActual - totalPlanned >= 0 ? "var(--sage)" : "var(--danger)")
                  : "var(--ink-faint)",
              }}>
                {totalActual > 0
                  ? `${totalActual - totalPlanned >= 0 ? "+" : ""}${formatCurrency(totalActual - totalPlanned)}`
                  : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
