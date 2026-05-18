"use client";

import { useState, useCallback } from "react";
import { formatCurrency, formatMonth, prevMonth, nextMonth, todayYYYYMM, type UIDebt, type UIActual, type ScheduleEntry } from "@/lib/snowball";

interface ActualPaymentsProps {
  debts: UIDebt[];
  schedule: ScheduleEntry[];
  actuals: UIActual[];
  onSetActual: (month: string, debtId: string, amount: number) => void;
  onGoToDebts?: () => void;
  planStartDate?: string;
}

// Individual row with local input state so decimal entry works correctly.
// Saves to Firestore only on blur or Enter, not on every keystroke.
function DebtRow({
  debt, planned, savedExtra, month, onSetActual,
}: {
  debt: UIDebt;
  planned: number;
  savedExtra: number | undefined;
  month: string;
  onSetActual: (month: string, debtId: string, amount: number) => void;
}) {
  const [localValue, setLocalValue] = useState(savedExtra != null ? String(savedExtra) : "");
  const [saved, setSaved] = useState(false);

  // Keep local value in sync when savedExtra changes from outside (e.g. another device)
  const prevSaved = savedExtra != null ? savedExtra : null;
  if (savedExtra != null && localValue === "" && prevSaved !== null) {
    setLocalValue(String(savedExtra));
  }

  function commit(raw: string) {
    const amount = parseFloat(raw) || 0;
    onSetActual(month, debt.id, amount);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const extra = parseFloat(localValue) || 0;
  const total = planned + extra;

  return (
    <tr>
      <td style={{ fontWeight: 500 }}>{debt.name}</td>
      <td className="num" style={{ color: "var(--ink-muted)" }}>{formatCurrency(planned)}</td>
      <td className="num">
        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
          <input
            type="number"
            step="0.01"
            min="0"
            value={localValue}
            placeholder="0.00"
            onChange={e => setLocalValue(e.target.value)}
            onBlur={e => commit(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { commit(localValue); (e.target as HTMLInputElement).blur(); } }}
            style={{
              width: 100, textAlign: "right",
              border: `1px solid ${saved ? "var(--sage)" : "var(--line-strong)"}`,
              borderRadius: "var(--r-md)",
              padding: "6px 10px",
              fontSize: 13.5,
              color: "var(--ink)",
              background: "var(--surface)",
              fontFamily: "var(--font-num)",
              transition: "border-color 0.2s",
            }}
            onFocus={e => (e.target.style.borderColor = "var(--info)")}
          />
          {saved && <span style={{ fontSize: 12, color: "var(--sage)", fontWeight: 500 }}>✓</span>}
        </div>
      </td>
      <td className="num" style={{ color: "var(--ink-muted)" }}>{formatCurrency(total)}</td>
    </tr>
  );
}

export default function ActualPayments({ debts, schedule, actuals, onSetActual, onGoToDebts, planStartDate }: ActualPaymentsProps) {
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

  const canGoPrev = true;
  const canGoNext = selectedMonth < todayYYYYMM();
  const isBeforeStart = planStartDate ? selectedMonth < planStartDate : false;

  function getPlanned(debtId: string): number {
    const entry = schedule.find(e => e.month === selectedMonth);
    if (!entry) return 0;
    return entry.debtSnapshots.find(s => s.debtId === debtId)?.payment ?? 0;
  }

  function getSavedExtra(debtId: string): number | undefined {
    return actuals.find(a => a.month === selectedMonth && a.debtId === debtId)?.amount;
  }

  // All-time KPIs from saved actuals
  const totalExtraLogged = actuals.reduce((s, a) => s + a.amount, 0);

  // Cumulative extra vs what extra was planned (scheduled surplus above minimums)
  let cumulativeExtra = 0;
  for (const a of actuals) {
    if (a.month <= selectedMonth) cumulativeExtra += a.amount;
  }

  // Months where any extra was logged
  const monthsWithPayments = new Set(actuals.map(a => a.month)).size;

  const monthRows = debts.map(d => ({
    debt: d,
    planned: getPlanned(d.id),
    savedExtra: getSavedExtra(d.id),
  }));

  const totalPlanned = monthRows.reduce((s, r) => s + r.planned, 0);
  const totalExtra = monthRows.reduce((s, r) => s + (r.savedExtra ?? 0), 0);

  return (
    <div>
      <div className="greeting">
        <div>
          <h1>Actual <span className="h1-italic">payments.</span></h1>
          <p>Log any extra you paid above the plan. Minimums are always assumed paid.</p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 24 }}>
        <div className="kpi">
          <div className="kpi-label">Extra paid (all time)</div>
          <div className="kpi-value" style={{ color: "var(--sage-deep)" }}>{formatCurrency(totalExtraLogged)}</div>
          <div className="kpi-sub">Across {monthsWithPayments} month{monthsWithPayments !== 1 ? "s" : ""}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Extra to date</div>
          <div className="kpi-value">{formatCurrency(cumulativeExtra)}</div>
          <div className="kpi-sub">Through {formatMonth(selectedMonth)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Entries logged</div>
          <div className="kpi-value">{actuals.length}</div>
          <div className="kpi-sub">Total payment records</div>
        </div>
      </div>

      {/* Month navigator */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--surface)", border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)", padding: "12px 20px", marginBottom: 16,
      }}>
        <button onClick={() => setSelectedMonth(prevMonth(selectedMonth))} disabled={!canGoPrev} className="btn sm" style={{ opacity: canGoPrev ? 1 : 0.3 }}>
          ‹ Prev
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{formatMonth(selectedMonth)}</span>
        <button onClick={() => setSelectedMonth(nextMonth(selectedMonth))} disabled={!canGoNext} className="btn sm" style={{ opacity: canGoNext ? 1 : 0.3 }}>
          Next ›
        </button>
      </div>

      {/* Pre-start-date warning */}
      {isBeforeStart && (
        <div style={{
          background: "var(--warn-soft)", border: "1px solid var(--warn-soft)",
          borderRadius: "var(--r-md)", padding: "10px 14px",
          fontSize: 13, color: "var(--warn)", marginBottom: 16,
        }}>
          This month is before your plan start date. Payments logged here won't affect your projected schedule.
        </div>
      )}

      {/* Payments table */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Log extra payments — {formatMonth(selectedMonth)}</div>
          <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
            Minimums assumed paid. Enter any amount above the plan.
          </span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Debt</th>
              <th className="right">Planned (min+snowball)</th>
              <th className="right">Extra paid</th>
              <th className="right">Total this month</th>
            </tr>
          </thead>
          <tbody>
            {monthRows.map(({ debt, planned, savedExtra }) => (
              <DebtRow
                key={`${debt.id}-${selectedMonth}`}
                debt={debt}
                planned={planned}
                savedExtra={savedExtra}
                month={selectedMonth}
                onSetActual={onSetActual}
              />
            ))}
            <tr style={{ background: "var(--surface-2)" }}>
              <td style={{ fontWeight: 600 }}>Total</td>
              <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(totalPlanned)}</td>
              <td className="num" style={{ fontWeight: 600, color: totalExtra > 0 ? "var(--sage-deep)" : "var(--ink-faint)" }}>
                {totalExtra > 0 ? `+${formatCurrency(totalExtra)}` : "—"}
              </td>
              <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(totalPlanned + totalExtra)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--ink-muted)", textAlign: "center" }}>
        Extra payments update your dashboard, schedule, and payoff date automatically.
      </div>
    </div>
  );
}
