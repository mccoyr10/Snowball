"use client";

import { useState } from "react";
import { generateId, type UIDebt } from "@/lib/snowball";

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

  const inputStyle = (key: string): React.CSSProperties =>
    errors[key] ? { borderColor: "var(--danger)" } : {};

  const paidPct = form.originalBalance && form.balance && Number(form.originalBalance) > 0
    ? Math.max(0, Math.min(100, Math.round((1 - Number(form.balance) / Number(form.originalBalance)) * 100)))
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label className="form-label">Debt name</label>
        <input
          type="text"
          value={String(form.name)}
          onChange={e => set("name", e.target.value)}
          className="form-input"
          style={inputStyle("name")}
          placeholder="e.g. Capital One Card"
        />
        {errors.name && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>{errors.name}</p>}
      </div>

      <div>
        <label className="form-label">Original balance ($)</label>
        <input
          type="number" step="0.01" min="0"
          value={String(form.originalBalance)}
          onChange={e => set("originalBalance", e.target.value)}
          className="form-input"
          style={inputStyle("originalBalance")}
          placeholder="e.g. 15000.00"
        />
        <p style={{ color: "var(--ink-muted)", fontSize: 12, marginTop: 4 }}>
          What this debt was when you first took it out — used to calculate your total progress.
        </p>
        {errors.originalBalance && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>{errors.originalBalance}</p>}
      </div>

      <div>
        <label className="form-label">Current balance ($)</label>
        <input
          type="number" step="0.01" min="0"
          value={String(form.balance)}
          onChange={e => set("balance", e.target.value)}
          className="form-input"
          style={inputStyle("balance")}
          placeholder="e.g. 8200.00"
        />
        {paidPct !== null && (
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 6, background: "var(--surface-sunk)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${paidPct}%`, background: "var(--sage)", borderRadius: 99, transition: "width 0.2s" }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--sage-deep)" }}>{paidPct}% paid</span>
          </div>
        )}
        {errors.balance && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>{errors.balance}</p>}
      </div>

      <div>
        <label className="form-label">Annual interest rate (APR %)</label>
        <input
          type="number" step="0.01" min="0"
          value={String(form.apr)}
          onChange={e => set("apr", e.target.value)}
          className="form-input"
          style={inputStyle("apr")}
          placeholder="e.g. 24.99"
        />
        {errors.apr && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>{errors.apr}</p>}
      </div>

      <div>
        <label className="form-label">Minimum monthly payment ($)</label>
        <input
          type="number" step="0.01" min="0"
          value={String(form.minPayment)}
          onChange={e => set("minPayment", e.target.value)}
          className="form-input"
          style={inputStyle("minPayment")}
          placeholder="e.g. 35.00"
        />
        {errors.minPayment && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>{errors.minPayment}</p>}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button onClick={handleSave} className="btn primary" style={{ flex: 1, justifyContent: "center", minHeight: 44 }}>
          {isEditing ? "Save changes" : "Add debt"}
        </button>
        <button onClick={onClose} className="btn" style={{ flex: 1, justifyContent: "center", minHeight: 44 }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
