"use client";

import { formatCurrency, formatMonth, type UIDebt, type UISettings, type Summary, type ScheduleEntry } from "@/lib/snowball";

interface SnowballSettingsProps {
  settings: UISettings;
  setSettings: (s: UISettings | ((prev: UISettings) => UISettings)) => void;
  summary: Summary;
}

function SnowballSettings({ settings, setSettings, summary }: SnowballSettingsProps) {
  const shortfall = summary.totalMinPayments > 0 && Number(settings.monthlyBudget) < summary.totalMinPayments;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
      <h3 className="text-base font-semibold text-gray-700 uppercase tracking-wide mb-4">Snowball Settings</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">Monthly Budget ($)</label>
          <input type="number" step="0.01" min="0"
            value={settings.monthlyBudget}
            onChange={e => setSettings(s => ({ ...s, monthlyBudget: Number(e.target.value) }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">Plan Start Date</label>
          <input type="month"
            value={settings.startDate}
            onChange={e => setSettings(s => ({ ...s, startDate: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div className="flex gap-6 mt-4 text-base">
        <div><span className="text-gray-400">Total Minimums: </span><span className="font-semibold text-gray-700">{formatCurrency(summary.totalMinPayments)}</span></div>
        <div>
          <span className="text-gray-400">Snowball Extra: </span>
          <span className={`font-medium ${summary.snowballExtra < 0 ? "text-red-600" : "text-green-600"}`}>{formatCurrency(summary.snowballExtra)}</span>
        </div>
      </div>
      {shortfall && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-xs text-red-700">
          ⚠ Budget is {formatCurrency(summary.totalMinPayments - Number(settings.monthlyBudget))} short of covering all minimum payments. Increase your budget to generate a schedule.
        </div>
      )}
    </div>
  );
}

interface DebtListProps {
  debts: UIDebt[];
  settings: UISettings;
  setSettings: (s: UISettings | ((prev: UISettings) => UISettings)) => void;
  summary: Summary;
  schedule: ScheduleEntry[];
  onAdd: () => void;
  onEdit: (d: UIDebt) => void;
  onDelete: (id: string) => void;
}

export default function DebtList({ debts, settings, setSettings, summary, onAdd, onEdit, onDelete }: DebtListProps) {
  const sorted = [...debts].sort((a, b) => Number(a.balance) - Number(b.balance));
  return (
    <div>
      <SnowballSettings settings={settings} setSettings={setSettings} summary={summary} />
      <div className="space-y-3">
        {sorted.map((d, i) => {
          const payoff = summary.debtPayoffDates[d.id];
          const interest = summary.debtInterestTotals[d.id] || 0;
          const isTarget = i === 0;
          return (
            <div key={d.id} className={`bg-white rounded-2xl shadow-sm border p-5 ${isTarget ? "border-blue-300" : "border-gray-100"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isTarget ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}>{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-gray-800 truncate">{d.name}</p>
                    <p className="text-sm text-gray-400 mt-0.5">{d.apr}% APR</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => onEdit(d)} className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg px-4 py-2 font-medium min-h-[40px]">Edit</button>
                  <button onClick={() => onDelete(d.id)} className="text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded-lg px-4 py-2 font-medium min-h-[40px]">Delete</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div><p className="text-sm text-gray-400 mb-0.5">Balance</p><p className="text-base font-semibold text-gray-800">{formatCurrency(d.balance)}</p></div>
                <div><p className="text-sm text-gray-400 mb-0.5">Min Payment</p><p className="text-base font-semibold text-gray-800">{formatCurrency(d.minPayment)}/mo</p></div>
                <div><p className="text-sm text-gray-400 mb-0.5">Payoff Date</p><p className="text-base font-semibold text-gray-800">{payoff ? formatMonth(payoff) : "—"}</p></div>
                <div><p className="text-sm text-gray-400 mb-0.5">Total Interest</p><p className="text-base font-semibold text-orange-500">{formatCurrency(interest)}</p></div>
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={onAdd} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-4 text-base font-semibold min-h-[52px]">
        + Add Debt
      </button>
    </div>
  );
}
