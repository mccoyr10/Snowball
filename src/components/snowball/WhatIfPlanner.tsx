"use client";

import { useState, useMemo } from "react";
import {
  buildSnowballSchedule, calculateSummary, formatCurrency, formatMonth, todayYYYYMM,
  type UIDebt, type UISettings, type Summary, type ScheduleEntry,
} from "@/lib/snowball";

interface MonthlyOverride {
  key: number; // stable local id for React key
  month: string;
  amount: string;
}

interface WhatIfPlannerProps {
  debts: UIDebt[];
  settings: UISettings;
  summary: Summary;
  schedule: ScheduleEntry[];
}

let _keyCounter = 0;
function newOverride(): MonthlyOverride {
  return { key: ++_keyCounter, month: todayYYYYMM(), amount: "" };
}

export default function WhatIfPlanner({ debts, settings, summary }: WhatIfPlannerProps) {
  const [open, setOpen] = useState(false);
  const [extraMonthly, setExtraMonthly] = useState("");
  const [lumpSum, setLumpSum] = useState("");
  const [overrides, setOverrides] = useState<MonthlyOverride[]>([]);

  function addRow() {
    setOverrides(prev => [...prev, newOverride()]);
  }

  function removeRow(key: number) {
    setOverrides(prev => prev.filter(r => r.key !== key));
  }

  function updateRow(key: number, field: "month" | "amount", value: string) {
    setOverrides(prev => prev.map(r => r.key === key ? { ...r, [field]: value } : r));
  }

  const result = useMemo(() => {
    if (!open || debts.length === 0) return null;
    const extra = Number(extraMonthly) || 0;
    const lump = Number(lumpSum) || 0;
    const hasOverrides = overrides.some(r => r.month && Number(r.amount) > 0);
    if (extra === 0 && lump === 0 && !hasOverrides) return null;

    // Apply lump sum to the snowball target (lowest balance debt)
    const sorted = [...debts].sort((a, b) => Number(a.balance) - Number(b.balance));
    const hypotheticalDebts: UIDebt[] = debts.map(d => {
      if (d.id === sorted[0].id && lump > 0) {
        return { ...d, balance: Math.max(0, Number(d.balance) - lump) };
      }
      return d;
    });

    // Build per-month overrides map: sum all rows for the same month + consistent extra
    const overrideMap: Record<string, number> = {};
    for (const row of overrides) {
      const amt = Number(row.amount) || 0;
      if (row.month && amt > 0) {
        overrideMap[row.month] = (overrideMap[row.month] ?? 0) + amt;
      }
    }
    // Add the consistent extra to every month that doesn't have an override,
    // and on top of months that do (by baking it into the base budget instead)
    const hypotheticalSettings: UISettings = {
      ...settings,
      monthlyBudget: Number(settings.monthlyBudget) + extra,
    };

    const newSchedule = buildSnowballSchedule(hypotheticalDebts, hypotheticalSettings, overrideMap);
    const newSummary = calculateSummary(hypotheticalDebts, newSchedule, hypotheticalSettings);

    const monthsSaved = summary.monthsRemaining - newSummary.monthsRemaining;
    const interestSaved = summary.totalInterestPlanned - newSummary.totalInterestPlanned;

    // Per-debt comparison
    const sortedDebts = [...debts].sort((a, b) => Number(a.balance) - Number(b.balance));
    const debtRows = sortedDebts.map(d => {
      const currentPayoff = summary.debtPayoffDates[d.id] ?? null;
      const newPayoff = newSummary.debtPayoffDates[d.id] ?? null;
      const currentInterest = summary.debtInterestTotals[d.id] ?? 0;
      const newInterest = newSummary.debtInterestTotals[d.id] ?? 0;

      // Count months between two YYYY-MM strings
      function monthDiff(a: string | null, b: string | null): number {
        if (!a || !b) return 0;
        const [ay, am] = a.split("-").map(Number);
        const [by, bm] = b.split("-").map(Number);
        return (ay * 12 + am) - (by * 12 + bm);
      }

      return {
        debt: d,
        currentPayoff,
        newPayoff,
        monthsSaved: monthDiff(currentPayoff, newPayoff),
        currentInterest,
        newInterest,
        interestSaved: currentInterest - newInterest,
      };
    });

    return { newSummary, monthsSaved, interestSaved, debtRows };
  }, [open, debts, settings, summary, extraMonthly, lumpSum, overrides]);

  if (debts.length === 0) return null;

  const targetDebtName = [...debts].sort((a, b) => Number(a.balance) - Number(b.balance))[0]?.name;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid var(--line-strong)",
    borderRadius: "var(--r-md)",
    padding: "9px 12px",
    fontSize: 14,
    color: "var(--ink)",
    background: "var(--surface)",
    fontFamily: "var(--font-ui)",
    outline: "none",
  };

  return (
    <div className="card">
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", padding: "16px 22px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "none", border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "var(--gold-soft)", display: "grid", placeItems: "center",
            color: "var(--gold)", flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>What-If Scenario Planner</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-muted)", marginTop: 2 }}>See how extra payments change your payoff date</div>
          </div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ color: "var(--ink-faint)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
          <path d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid var(--line)", padding: 22, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Inputs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Extra every month
              </label>
              <input type="number" min="0" step="0.01" value={extraMonthly}
                onChange={e => setExtraMonthly(e.target.value)}
                placeholder="e.g. 200" style={inputStyle}
              />
              <p style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 5 }}>
                Added on top of your {formatCurrency(Number(settings.monthlyBudget))} budget
              </p>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                One-time lump sum
              </label>
              <input type="number" min="0" step="0.01" value={lumpSum}
                onChange={e => setLumpSum(e.target.value)}
                placeholder="e.g. 1000" style={inputStyle}
              />
              <p style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 5 }}>
                Applied to <span style={{ fontWeight: 600, color: "var(--ink-muted)" }}>{targetDebtName}</span>
              </p>
            </div>
          </div>

          {/* Per-month overrides */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Specific month extras
              </span>
              <button onClick={addRow} className="btn sm">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add month
              </button>
            </div>
            {overrides.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "var(--ink-faint)", padding: "8px 0" }}>
                Add a specific month to model a one-off extra payment — e.g. a tax refund in April.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {overrides.map(row => (
                  <div key={row.key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="month" value={row.month}
                      onChange={e => updateRow(row.key, "month", e.target.value)}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <input type="number" min="0" step="0.01" value={row.amount}
                      onChange={e => updateRow(row.key, "amount", e.target.value)}
                      placeholder="0.00" style={{ ...inputStyle, flex: 1 }}
                    />
                    <button onClick={() => removeRow(row.key)}
                      style={{ width: 32, height: 32, border: "1px solid var(--line)", borderRadius: "var(--r-md)", background: "none", color: "var(--ink-faint)", cursor: "pointer", flexShrink: 0, fontSize: 18, display: "grid", placeItems: "center" }}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Results */}
          {result ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Overall impact */}
              <div style={{
                background: "var(--sage-soft)",
                border: "1px solid color-mix(in oklab, var(--sage) 25%, var(--sage-soft))",
                borderRadius: "var(--r-lg)", padding: 16,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sage-deep)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
                  Overall impact
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
                  {[
                    { label: "New payoff date", value: formatMonth(result.newSummary.projectedPayoffDate), sub: result.monthsSaved > 0 ? `${result.monthsSaved} mo. sooner` : null, subColor: "var(--sage-deep)" },
                    { label: "Months left", value: String(result.newSummary.monthsRemaining), sub: result.monthsSaved > 0 ? `vs. ${summary.monthsRemaining} now` : null, subColor: "var(--sage-deep)" },
                    { label: "New total interest", value: formatCurrency(result.newSummary.totalInterestPlanned), sub: null, valueColor: "var(--warn)" },
                    { label: "Interest saved", value: result.interestSaved > 0 ? formatCurrency(result.interestSaved) : "—", sub: null, valueColor: result.interestSaved > 0 ? "var(--sage-deep)" : "var(--ink-faint)" },
                  ].map(item => (
                    <div key={item.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", padding: "10px 12px" }}>
                      <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginBottom: 4 }}>{item.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: item.valueColor || "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{item.value}</div>
                      {item.sub && <div style={{ fontSize: 11.5, color: item.subColor, fontWeight: 600, marginTop: 2 }}>{item.sub}</div>}
                    </div>
                  ))}
                </div>
                {result.monthsSaved > 0 && (
                  <div style={{ marginTop: 12, fontSize: 13.5, fontWeight: 600, color: "var(--sage-deep)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>🎉</span>
                    <span>Debt-free {result.monthsSaved} month{result.monthsSaved !== 1 ? "s" : ""} earlier!</span>
                  </div>
                )}
              </div>

              {/* Per-debt table */}
              <div className="card">
                <div className="card-head">
                  <div className="card-title">Per-debt breakdown</div>
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Debt</th>
                      <th className="right">Current payoff</th>
                      <th className="right">New payoff</th>
                      <th className="right">Mo. saved</th>
                      <th className="right">Current interest</th>
                      <th className="right">New interest</th>
                      <th className="right">Int. saved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.debtRows.map(row => (
                      <tr key={row.debt.id}>
                        <td style={{ fontWeight: 500 }}>{row.debt.name}</td>
                        <td className="num" style={{ color: "var(--ink-muted)" }}>{formatMonth(row.currentPayoff)}</td>
                        <td className="num" style={{ fontWeight: 600 }}>{formatMonth(row.newPayoff)}</td>
                        <td className="num">
                          {row.monthsSaved > 0
                            ? <span style={{ color: "var(--sage-deep)", fontWeight: 600 }}>{row.monthsSaved} mo.</span>
                            : <span style={{ color: "var(--ink-faint)" }}>—</span>}
                        </td>
                        <td className="num" style={{ color: "var(--warn)" }}>{formatCurrency(row.currentInterest)}</td>
                        <td className="num" style={{ color: "var(--warn)", fontWeight: 600 }}>{formatCurrency(row.newInterest)}</td>
                        <td className="num">
                          {row.interestSaved > 0
                            ? <span style={{ color: "var(--sage-deep)", fontWeight: 600 }}>{formatCurrency(row.interestSaved)}</span>
                            : <span style={{ color: "var(--ink-faint)" }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "16px 0", fontSize: 13.5, color: "var(--ink-faint)" }}>
              Enter values above to see the projected impact.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
