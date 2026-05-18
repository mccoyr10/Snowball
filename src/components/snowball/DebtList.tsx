"use client";

import { useAuth } from "@/context/AuthContext";
import { formatCurrency, formatMonth, type UIDebt, type UISettings, type Summary, type ScheduleEntry } from "@/lib/snowball";

// ProgressRing for debt rows
function ProgressRing({
  size, stroke, value, color,
}: {
  size: number;
  stroke: number;
  value: number;
  color: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, value));
  const offset = circ * (1 - clamped);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-sunk)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

function DebtCompositionBar({ debts, total }: { debts: UIDebt[]; total: number }) {
  const colors = ["var(--info)", "var(--sage)", "var(--gold)", "var(--warn)", "var(--danger)"];
  if (total === 0) return null;
  return (
    <div>
      <div style={{
        display: "flex", height: 14, borderRadius: 7, overflow: "hidden",
        background: "var(--surface-sunk)", marginBottom: 18,
      }}>
        {debts.map((d, i) => (
          <div key={d.id} style={{
            width: (d.balance / total * 100) + "%",
            background: colors[i % colors.length],
          }} />
        ))}
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 16,
      }}>
        {debts.map((d, i) => (
          <div key={d.id} style={{ paddingLeft: 14, borderLeft: `3px solid ${colors[i % colors.length]}` }}>
            <div style={{ fontSize: 12.5, color: "var(--ink-muted)" }}>{d.name}</div>
            <div style={{
              fontSize: 18, fontWeight: 600, fontVariantNumeric: "tabular-nums", marginTop: 2,
              color: "var(--ink)",
            }}>
              {formatCurrency(d.balance).replace(/\.00$/, "")}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 2 }}>
              {(d.balance / total * 100).toFixed(1)}% of total
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SnowballSettingsProps {
  settings: UISettings;
  setSettings: (s: UISettings | ((prev: UISettings) => UISettings)) => void;
  summary: Summary;
}

function SnowballSettings({ settings, setSettings, summary }: SnowballSettingsProps) {
  const shortfall = summary.totalMinPayments > 0 && Number(settings.monthlyBudget) < summary.totalMinPayments;
  return (
    <div className="settings-card">
      <div style={{
        fontSize: 11.5, fontWeight: 600, letterSpacing: "0.08em",
        textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: 16,
      }}>
        Snowball Settings
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label className="form-label">Monthly budget ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={settings.monthlyBudget}
            onChange={e => setSettings(s => ({ ...s, monthlyBudget: Number(e.target.value) }))}
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">Plan start date</label>
          <input
            type="month"
            value={settings.startDate}
            onChange={e => setSettings(s => ({ ...s, startDate: e.target.value }))}
            className="form-input"
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 24, marginTop: 12, fontSize: 13.5 }}>
        <div>
          <span style={{ color: "var(--ink-faint)" }}>Total minimums: </span>
          <span style={{ fontWeight: 600, color: "var(--ink)" }}>{formatCurrency(summary.totalMinPayments)}</span>
        </div>
        <div>
          <span style={{ color: "var(--ink-faint)" }}>Extra: </span>
          <span style={{ fontWeight: 600, color: summary.snowballExtra < 0 ? "var(--danger)" : "var(--sage)" }}>
            {formatCurrency(summary.snowballExtra)}
          </span>
        </div>
      </div>
      {shortfall && (
        <div style={{
          marginTop: 12, background: "var(--danger-soft)", border: "1px solid var(--danger-soft)",
          borderRadius: "var(--r-md)", padding: "10px 14px", fontSize: 12.5, color: "var(--danger)",
        }}>
          Budget is {formatCurrency(summary.totalMinPayments - Number(settings.monthlyBudget))} short of covering all minimum payments.
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
  const { userDoc } = useAuth();
  const firstName = userDoc?.displayName?.split(" ")[0] || "there";
  const sorted = [...debts].sort((a, b) => Number(a.balance) - Number(b.balance));
  const totalMin = sorted.reduce((s, d) => s + d.minPayment, 0);
  const totalDebt = summary.totalBalance;

  return (
    <div>
      {/* Greeting */}
      <div className="greeting">
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Hi {firstName}!</div>
          <h1>
            Your debts <span className="h1-italic">— all in one place.</span>
          </h1>
          <p>{sorted.length} account{sorted.length !== 1 ? "s" : ""} · {formatCurrency(totalMin)}/mo minimum payment</p>
        </div>
        <button className="btn primary" onClick={onAdd}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add debt
        </button>
      </div>

      <SnowballSettings settings={settings} setSettings={setSettings} summary={summary} />

      {/* Debts table — desktop only */}
      <div className="card desktop-debt-table">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 64 }}></th>
              <th>Debt</th>
              <th className="right">Balance</th>
              <th className="right">APR</th>
              <th className="right">Min / mo</th>
              <th className="right">Interest</th>
              <th className="right">Payoff</th>
              <th className="right table-actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", color: "var(--ink-faint)", padding: "40px 16px" }}>
                  No debts yet — add one above.
                </td>
              </tr>
            )}
            {sorted.map((d, i) => {
              const isTarget = i === 0;
              const paidPct = d.startingBalance && d.startingBalance > 0
                ? Math.min(1, Math.max(0, (1 - d.balance / d.startingBalance)))
                : 0;
              const payoff = summary.debtPayoffDates[d.id];
              const interest = summary.debtInterestTotals[d.id] || 0;
              return (
                <tr key={d.id}>
                  <td>
                    <div className="ring-cell">
                      <ProgressRing
                        size={42}
                        stroke={4}
                        value={paidPct}
                        color={isTarget ? "var(--info)" : "var(--sage)"}
                      />
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--ink)" }}>{d.name}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>
                      {isTarget && <span className="tag info" style={{ marginRight: 6 }}>Next up</span>}
                      {Math.round(paidPct * 100)}% paid
                    </div>
                  </td>
                  <td className="num" style={{ fontWeight: 600, color: "var(--ink)" }}>
                    {formatCurrency(d.balance)}
                  </td>
                  <td className="num">{d.apr.toFixed(2)}%</td>
                  <td className="num">{formatCurrency(d.minPayment)}</td>
                  <td className="num" style={{ color: "var(--warn)" }}>{formatCurrency(interest)}</td>
                  <td className="num">{payoff ? formatMonth(payoff) : "—"}</td>
                  <td className="right table-actions-col">
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button
                        onClick={() => onEdit(d)}
                        className="btn sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(d.id)}
                        className="btn sm"
                        style={{ color: "var(--danger)", borderColor: "var(--danger-soft)" }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list (visible only on mobile, replaces hidden table actions) */}
      <div className="mobile-debt-cards">
        {sorted.map((d, i) => {
          const isTarget = i === 0;
          const paidPct = d.startingBalance && d.startingBalance > 0
            ? Math.min(100, Math.max(0, Math.round((1 - d.balance / d.startingBalance) * 100)))
            : 0;
          const payoff = summary.debtPayoffDates[d.id];
          const interest = summary.debtInterestTotals[d.id] || 0;
          return (
            <div key={d.id} style={{
              background: "var(--surface)", border: "1px solid var(--line)",
              borderRadius: "var(--r-lg)", padding: "14px 16px", marginBottom: 10,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <ProgressRing size={40} stroke={4} value={paidPct / 100} color={isTarget ? "var(--info)" : "var(--sage)"} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14 }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>
                    {isTarget && <span className="tag info" style={{ marginRight: 6 }}>Next up</span>}
                    {paidPct}% paid
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 16 }}>{formatCurrency(d.balance)}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>{d.apr.toFixed(2)}% APR</div>
                </div>
              </div>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
                fontSize: 12.5, color: "var(--ink-muted)", marginBottom: 12,
              }}>
                <div>Min: <span style={{ color: "var(--ink)", fontWeight: 500 }}>{formatCurrency(d.minPayment)}/mo</span></div>
                <div>Interest: <span style={{ color: "var(--warn)", fontWeight: 500 }}>{formatCurrency(interest)}</span></div>
                <div>Payoff: <span style={{ color: "var(--ink)", fontWeight: 500 }}>{payoff ? formatMonth(payoff) : "—"}</span></div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => onEdit(d)}>Edit</button>
                <button className="btn sm" style={{ flex: 1, justifyContent: "center", color: "var(--danger)", borderColor: "var(--danger-soft)" }} onClick={() => onDelete(d.id)}>Delete</button>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--ink-faint)", padding: "40px 16px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)" }}>
            No debts yet — tap Add debt above.
          </div>
        )}
      </div>

      {/* Composition */}
      {sorted.length > 0 && (
        <div className="section">
          <div className="section-head">
            <h2>Composition</h2>
            <span className="sub">By balance</span>
          </div>
          <div className="card" style={{ padding: 24 }}>
            <DebtCompositionBar debts={sorted} total={totalDebt} />
          </div>
        </div>
      )}

      <style>{`
        .mobile-debt-cards { display: none; }
        @media (max-width: 640px) {
          .mobile-debt-cards { display: block; }
          .desktop-debt-table { display: none; }
        }
      `}</style>
    </div>
  );
}
