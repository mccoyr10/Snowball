"use client";

import { formatCurrency, formatMonth, type UIDebt, type UISettings, type Summary, type ScheduleEntry } from "@/lib/snowball";
import WhatIfPlanner from "@/components/snowball/WhatIfPlanner";

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string | null; color?: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-2xl font-bold leading-tight ${color || "text-gray-800"}`}>{value}</p>
      {sub && <p className="text-sm text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

interface DashboardTabProps {
  debts: UIDebt[];
  settings: UISettings;
  summary: Summary;
  schedule: ScheduleEntry[];
  setActiveTab: (tab: string) => void;
}

export default function DashboardTab({ debts, settings, summary, schedule, setActiveTab }: DashboardTabProps) {
  if (debts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-5xl mb-4">❄️</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">No debts yet</h2>
        <p className="text-gray-400 mb-6 max-w-xs">Add your debts and a monthly budget to see your snowball payoff plan.</p>
        <button onClick={() => setActiveTab("debts")} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2 text-sm font-medium">
          Add Your First Debt
        </button>
      </div>
    );
  }

  const sorted = [...debts].sort((a, b) => Number(a.balance) - Number(b.balance));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total Debt" value={formatCurrency(summary.totalBalance)} color="text-red-600" />
        <SummaryCard label="Projected Payoff" value={formatMonth(summary.projectedPayoffDate)} sub={summary.monthsRemaining ? `${summary.monthsRemaining} months` : null} />
        <SummaryCard label="Total Interest" value={formatCurrency(summary.totalInterestPlanned)} color="text-orange-500" />
        <SummaryCard label="Months Left" value={summary.monthsRemaining ? String(summary.monthsRemaining) : "—"} color="text-blue-600" />
      </div>

      {summary.savingsVsMinOnly > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 sm:p-5 flex items-center gap-4">
          <div className="text-3xl">💚</div>
          <div>
            <p className="text-base font-semibold text-green-700">You save {formatCurrency(summary.savingsVsMinOnly)} vs. minimums-only</p>
            <p className="text-sm text-green-600 mt-0.5">Min-only interest: {formatCurrency(summary.interestIfMinOnly)}</p>
          </div>
        </div>
      )}

      <WhatIfPlanner debts={debts} settings={settings} summary={summary} schedule={schedule} />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Payoff Order (Snowball)</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {sorted.map((d, i) => {
            const payoff = summary.debtPayoffDates[d.id];
            const interest = summary.debtInterestTotals[d.id] || 0;
            const isTarget = i === 0;
            return (
              <div key={d.id} className={`px-4 sm:px-5 py-4 sm:py-5 ${isTarget ? "bg-blue-50" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isTarget ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-gray-800 truncate">{d.name}</p>
                    <p className="text-sm text-gray-400 mt-0.5">{d.apr}% APR · Min {formatCurrency(d.minPayment)}/mo</p>
                    {d.startingBalance && d.startingBalance > 0 && (() => {
                      const pct = Math.max(0, Math.min(100, ((d.startingBalance - d.balance) / d.startingBalance) * 100));
                      return (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>{Math.round(pct)}% paid off</span>
                            <span>{formatCurrency(d.balance)} left</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${isTarget ? "bg-blue-500" : "bg-gray-400"}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="hidden sm:block text-right flex-shrink-0">
                    <p className="text-base font-bold text-gray-800">{formatCurrency(d.balance)}</p>
                    <p className="text-sm text-gray-400 mt-0.5">{payoff ? formatMonth(payoff) : "—"}</p>
                    <p className="text-sm text-orange-400">{formatCurrency(interest)} int.</p>
                  </div>
                </div>
                <div className="sm:hidden ml-12 mt-2 flex items-baseline gap-3 flex-wrap">
                  <span className="text-base font-bold text-gray-800">{formatCurrency(d.balance)}</span>
                  <span className="text-sm text-gray-400">{payoff ? formatMonth(payoff) : "—"}</span>
                  <span className="text-sm text-orange-400">{formatCurrency(interest)} int.</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
