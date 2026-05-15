"use client";

import { useState } from "react";
import { generateId, type UIDebt } from "@/lib/snowball";

interface DebtFormProps {
  initial?: UIDebt | null;
  onSave: (debt: UIDebt) => void;
  onClose: () => void;
}

export default function DebtForm({ initial, onSave, onClose }: DebtFormProps) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    balance: initial?.balance ?? "",
    apr: initial?.apr ?? "",
    minPayment: initial?.minPayment ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!String(form.name).trim()) e.name = "Required";
    if (!form.balance || Number(form.balance) <= 0) e.balance = "Must be > 0";
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
    });
  }

  function field(label: string, key: keyof typeof form, opts: { type?: string; step?: string; placeholder?: string } = {}) {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
          type={opts.type || "text"}
          step={opts.step}
          value={String(form[key])}
          onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setErrors(er => ({ ...er, [key]: "" })); }}
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors[key] ? "border-red-400" : "border-gray-300"}`}
          placeholder={opts.placeholder || ""}
        />
        {errors[key] && <p className="text-red-500 text-xs mt-1">{errors[key]}</p>}
      </div>
    );
  }

  return (
    <div>
      {field("Debt Name", "name", { placeholder: "e.g. Capital One Card" })}
      {field("Current Balance ($)", "balance", { type: "number", step: "0.01", placeholder: "1450.00" })}
      {field("Annual Interest Rate (APR %)", "apr", { type: "number", step: "0.01", placeholder: "24.99" })}
      {field("Minimum Monthly Payment ($)", "minPayment", { type: "number", step: "0.01", placeholder: "35.00" })}
      <div className="flex gap-3 mt-2">
        <button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-3 text-sm font-medium min-h-[44px]">
          {initial ? "Save Changes" : "Add Debt"}
        </button>
        <button onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-4 py-3 text-sm font-medium min-h-[44px]">
          Cancel
        </button>
      </div>
    </div>
  );
}
