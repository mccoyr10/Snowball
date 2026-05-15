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

    return { newSummary, monthsSaved, interestSaved };
  }, [open, debts, settings, summary, extraMonthly, lumpSum, overrides]);

  if (debts.length === 0) return null;

  const targetDebtName = [...debts].sort((a, b) => Number(a.balance) - Number(b.balance))[0]?.name;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🔮</span>
          <div>
            <p className="text-sm font-semibold text-gray-700">What-If Scenario Planner</p>
            <p className="text-xs text-gray-400">See how extra payments change your payoff date</p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100 p-5 space-y-5">

          {/* Consistent extra + lump sum */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                Extra every month ($)
              </label>
              <input
                type="number" min="0" step="0.01" value={extraMonthly}
                onChange={e => setExtraMonthly(e.target.value)}
                placeholder="e.g. 200"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Added on top of your current {formatCurrency(Number(settings.monthlyBudget))} budget every month</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                One-time lump sum ($)
              </label>
              <input
                type="number" min="0" step="0.01" value={lumpSum}
                onChange={e => setLumpSum(e.target.value)}
                placeholder="e.g. 1000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Applied to target: <span className="font-medium text-gray-600">{targetDebtName}</span>
              </p>
            </div>
          </div>

          {/* Per-month specific payments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-600">Specific month extra payments</label>
              <button
                onClick={addRow}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <span className="text-base leading-none">+</span> Add month
              </button>
            </div>

            {overrides.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">
                No specific months added — click &ldquo;+ Add month&rdquo; to enter a one-off extra payment for a particular month (e.g. a tax refund in April).
              </p>
            ) : (
              <div className="space-y-2">
                {overrides.map(row => (
                  <div key={row.key} className="flex items-center gap-2">
                    <input
                      type="month"
                      value={row.month}
                      onChange={e => updateRow(row.key, "month", e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-0"
                    />
                    <div className="relative flex-1 min-w-0">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number" min="0" step="0.01"
                        value={row.amount}
                        onChange={e => updateRow(row.key, "amount", e.target.value)}
                        placeholder="0.00"
                        className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={() => removeRow(row.key)}
                      className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-400 flex-shrink-0 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Results */}
          {result ? (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Projected Results</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <p className="text-xs text-gray-400 mb-1">New Payoff Date</p>
                  <p className="text-sm font-bold text-gray-800">{formatMonth(result.newSummary.projectedPayoffDate)}</p>
                  {result.monthsSaved > 0 && (
                    <p className="text-xs text-green-600 font-medium mt-0.5">{result.monthsSaved} mo. sooner</p>
                  )}
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <p className="text-xs text-gray-400 mb-1">Months Left</p>
                  <p className="text-sm font-bold text-blue-700">{result.newSummary.monthsRemaining}</p>
                  {result.monthsSaved > 0 && (
                    <p className="text-xs text-green-600 font-medium mt-0.5">vs. {summary.monthsRemaining} now</p>
                  )}
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <p className="text-xs text-gray-400 mb-1">New Total Interest</p>
                  <p className="text-sm font-bold text-orange-500">{formatCurrency(result.newSummary.totalInterestPlanned)}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <p className="text-xs text-gray-400 mb-1">Interest Saved</p>
                  <p className={`text-sm font-bold ${result.interestSaved > 0 ? "text-green-600" : "text-gray-500"}`}>
                    {result.interestSaved > 0 ? formatCurrency(result.interestSaved) : "—"}
                  </p>
                </div>
              </div>
              {result.monthsSaved > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                  <span>🎉</span>
                  <span>You&apos;d be debt-free {result.monthsSaved} month{result.monthsSaved !== 1 ? "s" : ""} earlier!</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400 text-sm">
              Enter values above to see the projected impact.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
