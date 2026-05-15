"use client";

import { useState } from "react";
import { formatCurrency, formatMonth, prevMonth, nextMonth, todayYYYYMM, type UIDebt, type UIActual, type ScheduleEntry } from "@/lib/snowball";

interface ActualPaymentsProps {
  debts: UIDebt[];
  schedule: ScheduleEntry[];
  actuals: UIActual[];
  onSetActual: (month: string, debtId: string, amount: number) => void;
}

export default function ActualPayments({ debts, schedule, actuals, onSetActual }: ActualPaymentsProps) {
  const [selectedMonth, setSelectedMonth] = useState(todayYYYYMM());

  if (debts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-5xl mb-4">✏️</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">No debts yet</h2>
        <p className="text-gray-400 max-w-xs">Add your debts to start tracking actual payments.</p>
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
    <div className="space-y-4">
      {/* Month navigator */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
        <button
          onClick={() => setSelectedMonth(prevMonth(selectedMonth))}
          disabled={!canGoPrev}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 text-gray-600 text-lg"
        >
          ‹
        </button>
        <span className="text-base font-semibold text-gray-700">{formatMonth(selectedMonth)}</span>
        <button
          onClick={() => setSelectedMonth(nextMonth(selectedMonth))}
          disabled={!canGoNext}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 text-gray-600 text-lg"
        >
          ›
        </button>
      </div>

      {/* Cumulative variance banner */}
      {cumulativeVariance !== 0 && (
        <div className={`rounded-2xl border px-4 py-3 flex items-center gap-3 ${cumulativeVariance >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          <span className="text-2xl">{cumulativeVariance >= 0 ? "💚" : "⚠"}</span>
          <div>
            <p className={`text-sm font-semibold ${cumulativeVariance >= 0 ? "text-green-700" : "text-red-700"}`}>
              Cumulative variance: {cumulativeVariance >= 0 ? "+" : ""}{formatCurrency(cumulativeVariance)}
            </p>
            <p className={`text-xs mt-0.5 ${cumulativeVariance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {cumulativeVariance >= 0 ? "You've paid more than planned" : "You've paid less than planned"}
            </p>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Debt</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Planned</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Actual</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Variance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {monthActuals.map(({ debt, planned, actual }) => {
              const variance = actual != null ? actual - planned : null;
              return (
                <tr key={debt.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-700">{debt.name}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(planned)}</td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={actual ?? ""}
                      placeholder={formatCurrency(planned).replace("$", "")}
                      onChange={e => onSetActual(selectedMonth, debt.id, Number(e.target.value) || 0)}
                      className="w-28 text-right border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${variance == null ? "text-gray-300" : variance >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {variance == null ? "—" : `${variance >= 0 ? "+" : ""}${formatCurrency(variance)}`}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-gray-50 font-semibold">
              <td className="px-4 py-3 text-gray-700">Total</td>
              <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(totalPlanned)}</td>
              <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(totalActual)}</td>
              <td className={`px-4 py-3 text-right ${totalActual - totalPlanned >= 0 ? "text-green-600" : "text-red-500"}`}>
                {totalActual > 0 ? `${totalActual - totalPlanned >= 0 ? "+" : ""}${formatCurrency(totalActual - totalPlanned)}` : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {monthActuals.map(({ debt, planned, actual }) => {
          const variance = actual != null ? actual - planned : null;
          return (
            <div key={debt.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-800">{debt.name}</p>
                  <p className="text-sm text-gray-400 mt-0.5">Planned: {formatCurrency(planned)}</p>
                </div>
                {variance != null && (
                  <span className={`text-sm font-medium px-2 py-1 rounded-lg ${variance >= 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                    {variance >= 0 ? "+" : ""}{formatCurrency(variance)}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Actual Payment ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={actual ?? ""}
                  placeholder={String(planned.toFixed(2))}
                  onChange={e => onSetActual(selectedMonth, debt.id, Number(e.target.value) || 0)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
