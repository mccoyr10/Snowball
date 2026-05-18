"use client";

import { useState, useRef } from "react";
import {
  formatCurrency, formatMonth, prevMonth, nextMonth, todayYYYYMM,
  type UIDebt, type UIActual, type ScheduleEntry, type UIPayment,
} from "@/lib/snowball";

interface ActualPaymentsProps {
  debts: UIDebt[];
  schedule: ScheduleEntry[];
  payments: UIPayment[];
  allocatedActuals: UIActual[];
  onAddPayment: (month: string, amount: number) => Promise<void>;
  onUpdatePayment: (id: string, amount: number) => Promise<void>;
  onDeletePayment: (id: string) => Promise<void>;
  onGoToDebts?: () => void;
  planStartDate?: string;
}

function AllocationSummary({
  month, debts, allocatedActuals,
}: {
  month: string;
  debts: UIDebt[];
  allocatedActuals: UIActual[];
}) {
  const monthAllocations = allocatedActuals.filter(a => a.month === month);
  if (monthAllocations.length === 0) return null;

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--line)",
      borderRadius: "var(--r-lg)", padding: "14px 16px", marginTop: 12,
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        How it was applied
      </div>
      {monthAllocations.map(a => {
        const debt = debts.find(d => d.id === a.debtId);
        return (
          <div key={a.debtId} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "5px 0", borderBottom: "1px solid var(--line-soft)",
          }}>
            <span style={{ fontSize: 13.5, color: "var(--ink)" }}>{debt?.name ?? a.debtId}</span>
            <span style={{ fontSize: 13.5, fontFamily: "var(--font-num)", fontWeight: 600, color: "var(--sage-deep)" }}>
              +{formatCurrency(a.amount)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PaymentRow({
  payment, onUpdate, onDelete,
}: {
  payment: UIPayment;
  onUpdate: (id: string, amount: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(payment.amount));
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setEditValue(String(payment.amount));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  async function commitEdit() {
    const amount = parseFloat(editValue);
    if (!isNaN(amount) && amount > 0 && amount !== payment.amount) {
      setBusy(true);
      await onUpdate(payment.id, amount);
      setBusy(false);
    }
    setEditing(false);
  }

  async function handleDelete() {
    setBusy(true);
    await onDelete(payment.id);
    setBusy(false);
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 14px", borderBottom: "1px solid var(--line-soft)",
      opacity: busy ? 0.5 : 1,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>💵</span>
      {editing ? (
        <input
          ref={inputRef}
          type="number"
          step="0.01"
          min="0.01"
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => {
            if (e.key === "Enter") commitEdit();
            if (e.key === "Escape") setEditing(false);
          }}
          style={{
            flex: 1, border: "1px solid var(--info)", borderRadius: "var(--r-md)",
            padding: "5px 8px", fontSize: 14, fontFamily: "var(--font-num)",
            color: "var(--ink)", background: "var(--surface)",
          }}
        />
      ) : (
        <span style={{ flex: 1, fontSize: 15, fontFamily: "var(--font-num)", fontWeight: 600, color: "var(--ink)" }}>
          {formatCurrency(payment.amount)}
        </span>
      )}
      {!editing && (
        <>
          <button
            onClick={startEdit}
            className="btn sm"
            style={{ padding: "4px 10px", fontSize: 12 }}
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="btn sm"
            style={{ padding: "4px 10px", fontSize: 12, color: "var(--danger)", borderColor: "var(--danger-soft)" }}
          >
            Delete
          </button>
        </>
      )}
      {editing && (
        <button
          onClick={() => setEditing(false)}
          className="btn sm"
          style={{ padding: "4px 10px", fontSize: 12 }}
        >
          Cancel
        </button>
      )}
    </div>
  );
}

export default function ActualPayments({
  debts, schedule, payments, allocatedActuals,
  onAddPayment, onUpdatePayment, onDeletePayment,
  onGoToDebts, planStartDate,
}: ActualPaymentsProps) {
  const [selectedMonth, setSelectedMonth] = useState(todayYYYYMM());
  const [inputValue, setInputValue] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
          Add your debts to start tracking payments.
        </p>
        {onGoToDebts && (
          <button className="btn primary" onClick={onGoToDebts}>Go to Debts →</button>
        )}
      </div>
    );
  }

  const canGoNext = selectedMonth < todayYYYYMM();
  const isBeforeStart = planStartDate ? selectedMonth < planStartDate : false;

  const monthPayments = payments.filter(p => p.month === selectedMonth);
  const monthTotal = monthPayments.reduce((s, p) => s + p.amount, 0);

  // KPIs
  const totalLogged = payments.reduce((s, p) => s + p.amount, 0);
  const activeMonths = new Set(payments.map(p => p.month)).size;

  // Planned totals for this month from schedule
  const schedEntry = schedule.find(e => e.month === selectedMonth);
  const plannedTotal = schedEntry
    ? schedEntry.debtSnapshots.reduce((s, ds) => s + ds.payment, 0)
    : 0;

  async function handleAdd() {
    const amount = parseFloat(inputValue);
    if (isNaN(amount) || amount <= 0) return;
    setAdding(true);
    await onAddPayment(selectedMonth, amount);
    setInputValue("");
    setAdding(false);
    inputRef.current?.focus();
  }

  return (
    <div>
      <div className="greeting">
        <div>
          <h1>Actual <span className="h1-italic">payments.</span></h1>
          <p>Log extra payments you made. They're auto-applied to your smallest debt first.</p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 24 }}>
        <div className="kpi">
          <div className="kpi-label">Total extra paid</div>
          <div className="kpi-value" style={{ color: "var(--sage-deep)" }}>{formatCurrency(totalLogged)}</div>
          <div className="kpi-sub">All time</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">This month</div>
          <div className="kpi-value">{formatCurrency(monthTotal)}</div>
          <div className="kpi-sub">{formatMonth(selectedMonth)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Months active</div>
          <div className="kpi-value">{activeMonths}</div>
          <div className="kpi-sub">With extra payments</div>
        </div>
      </div>

      {/* Month navigator */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--surface)", border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)", padding: "12px 20px", marginBottom: 16,
      }}>
        <button onClick={() => setSelectedMonth(prevMonth(selectedMonth))} className="btn sm">
          ‹ Prev
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{formatMonth(selectedMonth)}</span>
        <button onClick={() => setSelectedMonth(nextMonth(selectedMonth))} disabled={!canGoNext} className="btn sm" style={{ opacity: canGoNext ? 1 : 0.3 }}>
          Next ›
        </button>
      </div>

      {isBeforeStart && (
        <div style={{
          background: "var(--warn-soft)", border: "1px solid var(--warn-soft)",
          borderRadius: "var(--r-md)", padding: "10px 14px",
          fontSize: 13, color: "var(--warn)", marginBottom: 16,
        }}>
          This month is before your plan start date.
        </div>
      )}

      {/* Log payment input */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div className="card-title">Log a payment — {formatMonth(selectedMonth)}</div>
        </div>
        <div style={{ padding: "12px 16px", display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{
              position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
              fontSize: 14, color: "var(--ink-muted)", pointerEvents: "none",
            }}>$</span>
            <input
              ref={inputRef}
              type="number"
              step="0.01"
              min="0.01"
              value={inputValue}
              placeholder="0.00"
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
              style={{
                width: "100%", paddingLeft: 24, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
                border: "1px solid var(--line-strong)", borderRadius: "var(--r-md)",
                fontSize: 14, color: "var(--ink)", background: "var(--surface)",
                fontFamily: "var(--font-num)", boxSizing: "border-box",
              }}
            />
          </div>
          <button
            className="btn primary"
            onClick={handleAdd}
            disabled={adding || !inputValue || parseFloat(inputValue) <= 0}
            style={{ whiteSpace: "nowrap", opacity: adding ? 0.6 : 1 }}
          >
            {adding ? "Saving…" : "Log Payment"}
          </button>
        </div>
        {plannedTotal > 0 && (
          <div style={{ padding: "0 16px 12px", fontSize: 12.5, color: "var(--ink-muted)" }}>
            Planned for this month: {formatCurrency(plannedTotal)} (minimums + snowball). Log any <em>extra</em> above that.
          </div>
        )}
      </div>

      {/* Payment log */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Payment log — {formatMonth(selectedMonth)}</div>
          {monthPayments.length > 0 && (
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--sage-deep)" }}>
              Total: {formatCurrency(monthTotal)}
            </span>
          )}
        </div>

        {monthPayments.length === 0 ? (
          <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--ink-muted)", fontSize: 13.5 }}>
            No extra payments logged for {formatMonth(selectedMonth)} yet.
          </div>
        ) : (
          <div>
            {monthPayments.map(p => (
              <PaymentRow
                key={p.id}
                payment={p}
                onUpdate={onUpdatePayment}
                onDelete={onDeletePayment}
              />
            ))}
            <div style={{ padding: "10px 14px", display: "flex", justifyContent: "flex-end" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-num)" }}>
                Total extra: {formatCurrency(monthTotal)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Allocation breakdown */}
      {monthTotal > 0 && (
        <AllocationSummary
          month={selectedMonth}
          debts={debts}
          allocatedActuals={allocatedActuals}
        />
      )}

      <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--ink-muted)", textAlign: "center" }}>
        Extra payments are applied snowball-style: smallest balance first.
      </div>
    </div>
  );
}
