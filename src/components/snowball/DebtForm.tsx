"use client";

import { useState } from "react";
import { generateId, formatCurrency, type UIDebt } from "@/lib/snowball";

interface DebtFormProps {
  initial?: UIDebt | null;
  onSave: (debt: UIDebt) => void;
  onClose: () => void;
}

export default function DebtForm({ initial, onSave, onClose }: DebtFormProps) {
  const isEditing = !!initial;

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    originalBalance: initial?.startingBalance ?? initial?.balance ?? "",
    balance: initial?.balance ?? "",
    apr: initial?.apr ?? "",
    minPayment: initial?.minPayment ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!String(form.name).trim()) e.name = "Required";
    if (!form.originalBalance || Number(form.originalBalance) <= 0) e.originalBalance = "Must be > 0";
    if (!form.balance || Number(form.balance) <= 0) e.balance = "Must be > 0";
    if (Number(form.balance) > Number(form.originalBalance)) e.balance = "Can't exceed original balance";
    if (form.apr === "" || Number(form.apr) < 0) e.apr = "Must be ≥ 0";
    if (!form.minPayment || Number(form.minPayment) <= 0) e.minPayment = "Must be > 0";
    return e;
  }

  function handleSave() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({
      id: initial ? initial.id : generateId(),
      name: String(form.name).trim(),
      balance: Number(form.balance),
      apr: Number(form.apr),
      minPayment: Number(form.minPayment),
      startingBalance: Number(form.originalBalance),
    });
  }

  function set(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(er => ({ ...er, [key]: "" }));
  }

  const inputClass = (key: string) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors[key] ? "border-red-400" : "border-gray-300"}`;

  const paidPct = form.originalBalance && form.balance && Number(form.originalBalance) > 0
    ? Math.max(0, Math.min(100, Math.round((1 - Number(form.balance) / Number(form.originalBalance)) * 100)))
    : null;

  return (
    <div>
      {/* Debt name */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Debt name</label>
        <input
          type="text"
          value={String(form.name)}
          onChange={e => set("name", e.target.value)}
          className={inputClass("name")}
          placeholder="e.g. Capital One Card"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>

      {/* Original balance */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Original balance ($)</label>
        <input
          type="number" step="0.01" min="0"
          value={String(form.originalBalance)}
          onChange={e => set("originalBalance", e.target.value)}
          className={inputClass("originalBalance")}
          placeholder="e.g. 15000.00"
        />
        <p className="text-gray-400 text-xs mt-1">
          What this debt was when you first took it out — used to calculate your total progress.
        </p>
        {errors.originalBalance && <p className="text-red-500 text-xs mt-1">{errors.originalBalance}</p>}
      </div>

      {/* Current balance + progress preview */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Current balance ($)</label>
        <input
          type="number" step="0.01" min="0"
          value={String(form.balance)}
          onChange={e => set("balance", e.target.value)}
          className={inputClass("balance")}
          placeholder="e.g. 8200.00"
        />
        {paidPct !== null && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${paidPct}%` }} />
            </div>
            <span className="text-xs font-medium text-blue-600">{paidPct}% paid</span>
          </div>
        )}
        {errors.balance && <p className="text-red-500 text-xs mt-1">{errors.balance}</p>}
      </div>

      {/* APR */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Annual interest rate (APR %)</label>
        <input
          type="number" step="0.01" min="0"
          value={String(form.apr)}
          onChange={e => set("apr", e.target.value)}
          className={inputClass("apr")}
          placeholder="e.g. 24.99"
        />
        {errors.apr && <p className="text-red-500 text-xs mt-1">{errors.apr}</p>}
      </div>

      {/* Min payment */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Minimum monthly payment ($)</label>
        <input
          type="number" step="0.01" min="0"
          value={String(form.minPayment)}
          onChange={e => set("minPayment", e.target.value)}
          className={inputClass("minPayment")}
          placeholder="e.g. 35.00"
        />
        {errors.minPayment && <p className="text-red-500 text-xs mt-1">{errors.minPayment}</p>}
      </div>

      <div className="flex gap-3 mt-2">
        <button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-3 text-sm font-medium min-h-[44px]">
          {isEditing ? "Save changes" : "Add debt"}
        </button>
        <button onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-4 py-3 text-sm font-medium min-h-[44px]">
          Cancel
        </button>
      </div>
    </div>
  );
}
