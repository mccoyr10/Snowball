"use client";

import { useState } from "react";
import { formatCurrency, formatMonth, type UIDebt, type ScheduleEntry } from "@/lib/snowball";

interface PayoffScheduleProps {
  debts: UIDebt[];
  schedule: ScheduleEntry[];
}

export default function PayoffSchedule({ debts, schedule }: PayoffScheduleProps) {
  const [showAll, setShowAll] = useState(false);
  const [showInterest, setShowInterest] = useState(false);

  if (schedule.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-5xl mb-4">📅</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">No schedule yet</h2>
        <p className="text-gray-400 max-w-xs">Add your debts and set a monthly budget to generate a payoff schedule.</p>
      </div>
    );
  }

  const displayed = showAll ? schedule : schedule.slice(0, 24);
  const paidOff = new Set<string>();

  return (
    <div>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Month</th>
              {debts.map(d => (
                <th key={d.id} className="px-3 py-3 text-right font-semibold text-gray-600 whitespace-nowrap min-w-[110px]">{d.name}</th>
              ))}
              <th className="px-3 py-3 text-right font-semibold text-gray-600 whitespace-nowrap">Total Paid</th>
              <th className="px-3 py-3">
                <button
                  onClick={() => setShowInterest(v => !v)}
                  className="text-xs text-blue-500 hover:underline whitespace-nowrap"
                >
                  {showInterest ? "Hide Interest" : "Show Interest"}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {displayed.map(entry => {
              const rowPaidOff = new Set<string>();
              entry.debtSnapshots.forEach(ds => {
                if (ds.closingBalance === 0 && ds.openingBalance > 0) rowPaidOff.add(ds.debtId);
              });
              const isTarget = entry.snowballTarget;
              const totalPaid = entry.debtSnapshots.reduce((s, ds) => s + ds.payment, 0);

              return (
                <tr key={entry.month} className="hover:bg-gray-50 transition-colors">
                  <td className="sticky left-0 bg-white px-4 py-3 font-medium text-gray-700 whitespace-nowrap">{formatMonth(entry.month)}</td>
                  {debts.map(d => {
                    const ds = entry.debtSnapshots.find(s => s.debtId === d.id);
                    const justPaid = rowPaidOff.has(d.id);
                    const alreadyPaid = paidOff.has(d.id);
                    if (justPaid) paidOff.add(d.id);
                    return (
                      <td key={d.id} className="px-3 py-3 text-right whitespace-nowrap">
                        {alreadyPaid ? (
                          <span className="text-green-500 font-medium text-xs">✓ Paid</span>
                        ) : ds ? (
                          <div>
                            <div className={`font-medium ${d.id === isTarget ? "text-blue-600" : "text-gray-700"}`}>
                              {formatCurrency(ds.payment)}
                            </div>
                            {showInterest && <div className="text-xs text-orange-400">{formatCurrency(ds.interestCharge)} int.</div>}
                            <div className="text-xs text-gray-400">{formatCurrency(ds.closingBalance)}</div>
                          </div>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-right font-semibold text-gray-700 whitespace-nowrap">{formatCurrency(totalPaid)}</td>
                  <td />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {displayed.map(entry => {
          const totalPaid = entry.debtSnapshots.reduce((s, ds) => s + ds.payment, 0);
          const isTarget = entry.snowballTarget;
          return (
            <div key={entry.month} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-gray-700">{formatMonth(entry.month)}</span>
                <span className="text-sm font-medium text-gray-500">Total: {formatCurrency(totalPaid)}</span>
              </div>
              <div className="space-y-2">
                {debts.map(d => {
                  const ds = entry.debtSnapshots.find(s => s.debtId === d.id);
                  if (!ds || ds.openingBalance === 0) {
                    return (
                      <div key={d.id} className="flex items-center justify-between">
                        <span className="text-sm text-gray-400 truncate max-w-[60%]">{d.name}</span>
                        <span className="text-green-500 text-xs font-medium">✓ Paid</span>
                      </div>
                    );
                  }
                  return (
                    <div key={d.id} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <span className={`text-sm truncate block max-w-[140px] ${d.id === isTarget ? "font-semibold text-blue-600" : "text-gray-700"}`}>{d.name}</span>
                        <span className="text-xs text-gray-400">{formatCurrency(ds.closingBalance)} left</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-medium text-gray-700">{formatCurrency(ds.payment)}</div>
                        <div className="text-xs text-orange-400">{formatCurrency(ds.interestCharge)} int.</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {schedule.length > 24 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl py-3 text-sm font-medium"
        >
          {showAll ? "Show less" : `Show all ${schedule.length} months`}
        </button>
      )}
    </div>
  );
}
