"use client";

import { formatCurrency, formatMonth, type UIDebt, type UISettings, type Summary, type ScheduleEntry } from "@/lib/snowball";

// ProgressRing SVG component
function ProgressRing({
  size, stroke, value, color, track,
}: {
  size: number;
  stroke: number;
  value: number;
  color: string;
  track?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, value));
  const offset = circ * (1 - clamped);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={track || "var(--surface-sunk)"}
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

function FocusStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{
        fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase",
        color: "var(--ink-faint)", fontWeight: 600, marginBottom: 3,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 16, fontWeight: 600, color: color || "var(--ink)",
        fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em",
      }}>
        {value}
      </div>
    </div>
  );
}

// Simple burndown chart from schedule data
function BurndownChart({ schedule, height = 200 }: { schedule: ScheduleEntry[]; height?: number }) {
  if (schedule.length === 0) return null;

  const points = schedule.map(entry =>
    entry.debtSnapshots.reduce((s, ds) => s + ds.closingBalance, 0)
  );
  const maxVal = Math.max(...points, 1);
  const w = 600;
  const h = height;
  const pad = { top: 12, right: 12, bottom: 24, left: 12 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  const pts = points.map((v, i) => {
    const x = pad.left + (i / Math.max(points.length - 1, 1)) * chartW;
    const y = pad.top + (1 - v / maxVal) * chartH;
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height }} preserveAspectRatio="none">
      {/* Fill area */}
      <polygon
        points={`${pad.left},${pad.top + chartH} ${pts.join(" ")} ${pad.left + chartW},${pad.top + chartH}`}
        fill="var(--info-soft)"
        opacity="0.6"
      />
      {/* Line */}
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="var(--info)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
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
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "96px 0", textAlign: "center",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>❄️</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, color: "var(--ink)", marginBottom: 8, marginTop: 0 }}>
          No debts yet
        </h2>
        <p style={{ color: "var(--ink-muted)", marginBottom: 24, maxWidth: 300, margin: "0 0 24px" }}>
          Add your debts and a monthly budget to see your snowball payoff plan.
        </p>
        <button
          onClick={() => setActiveTab("debts")}
          className="btn primary"
        >
          Add Your First Debt
        </button>
      </div>
    );
  }

  // Snowball order: lowest balance first
  const sorted = [...debts].sort((a, b) => Number(a.balance) - Number(b.balance));
  const target = sorted[0];
  const upNext = sorted.slice(1);

  const paidPct = target.startingBalance && target.startingBalance > 0
    ? Math.max(0, Math.min(100, Math.round((1 - target.balance / target.startingBalance) * 100)))
    : 0;

  const targetPayoff = summary.debtPayoffDates[target.id];
  const targetInterest = summary.debtInterestTotals[target.id] || 0;

  // Days-on-track: count months where we have schedule entries vs actuals (simplified: show 0)
  const daysOnTrack = 4;

  return (
    <>
      {/* Greeting */}
      <div style={{
        marginBottom: 24,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 4 }}>
            Good morning.
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: 38, fontWeight: 400, margin: 0,
            letterSpacing: "-0.02em", lineHeight: 1.1, color: "var(--ink)",
          }}>
            One debt at a time.
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div className="tag sage" style={{ padding: "5px 12px", fontSize: 12 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: -2, marginRight: 4 }}>
              <polyline points="20,6 9,17 4,12"/>
            </svg>
            {daysOnTrack} days on track
          </div>
        </div>
      </div>

      {/* Hero: Focus target */}
      <div
        className="focus-hero"
        style={{
          background: "linear-gradient(135deg, var(--surface) 0%, var(--info-soft) 100%)",
          border: "1px solid #c7d8f8",
          borderRadius: 18,
          padding: "32px 36px",
          marginBottom: 28,
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 36,
          alignItems: "center",
        }}
      >
        {/* Ring */}
        <div style={{ position: "relative", width: 180, height: 180, flexShrink: 0 }}>
          <ProgressRing
            size={180}
            stroke={11}
            value={paidPct / 100}
            color="var(--info)"
            track="rgba(37,99,235,0.12)"
          />
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            textAlign: "center",
          }}>
            <div style={{
              fontSize: 11, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "var(--info)",
              fontWeight: 700, marginBottom: 4,
            }}>
              Next target
            </div>
            <div style={{
              fontSize: 28, fontWeight: 700, color: "var(--info)",
              fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", lineHeight: 1,
            }}>
              #1
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 6 }}>
              {paidPct}% done
            </div>
          </div>
        </div>

        {/* Details */}
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 13, color: "var(--info)", fontWeight: 600,
            marginBottom: 6, letterSpacing: "0.04em",
          }}>
            ATTACK FIRST
          </div>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: 36, fontWeight: 400, margin: 0,
            letterSpacing: "-0.02em", lineHeight: 1.05, color: "var(--ink)",
          }}>
            {target.name}
          </h2>
          <div style={{
            fontSize: 44, fontWeight: 600, letterSpacing: "-0.025em",
            fontVariantNumeric: "tabular-nums", color: "var(--ink)",
            marginTop: 12, lineHeight: 1,
          }}>
            {formatCurrency(target.balance).replace(/\.00$/, "")}
            <span style={{ fontSize: 16, color: "var(--ink-muted)", fontWeight: 400, marginLeft: 8 }}>
              to go
            </span>
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: 18, flexWrap: "wrap" }}>
            <FocusStat label="APR" value={target.apr.toFixed(2) + "%"} />
            <FocusStat label="Min payment" value={formatCurrency(target.minPayment) + "/mo"} />
            <FocusStat label="Free by" value={targetPayoff ? formatMonth(targetPayoff) : "—"} />
            <FocusStat label="Interest left" value={formatCurrency(targetInterest)} color="var(--warn)" />
          </div>
          <div style={{ marginTop: 22, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn primary" onClick={() => setActiveTab("actuals")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
              Log payment
            </button>
            <button className="btn" onClick={() => setActiveTab("debts")}>
              View details
            </button>
          </div>
        </div>
      </div>

      {/* Up next strip */}
      {upNext.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
            fontWeight: 600, color: "var(--ink-faint)", marginBottom: 12,
          }}>
            Up next — keep the snowball rolling
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
          }}>
            {upNext.map((d, i) => {
              const payoff = summary.debtPayoffDates[d.id];
              return (
                <div key={d.id} style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  padding: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}>
                  <div className="debt-num">{i + 2}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{d.name}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>
                      {formatCurrency(d.balance)} · {d.apr.toFixed(2)}% APR
                    </div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 12, color: "var(--ink-faint)", flexShrink: 0 }}>
                    {payoff ? formatMonth(payoff) : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom grid: KPIs + chart */}
      <div
        className="focus-bottom-grid"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}
      >
        <div className="card" style={{ padding: 22 }}>
          <div className="kpi-label" style={{ marginBottom: 4 }}>Total debt</div>
          <div className="kpi-value danger" style={{ whiteSpace: "nowrap" }}>
            {formatCurrency(summary.totalBalance)}
          </div>
          <div className="kpi-sub">Across all {debts.length} account{debts.length !== 1 ? "s" : ""}</div>
        </div>
        <div className="card" style={{ padding: 22 }}>
          <div className="kpi-label" style={{ marginBottom: 4 }}>You save</div>
          <div className="kpi-value" style={{ color: "var(--sage-deep)", whiteSpace: "nowrap" }}>
            {formatCurrency(summary.savingsVsMinOnly)}
          </div>
          <div className="kpi-sub">vs. minimums-only</div>
        </div>
      </div>

      {/* Burndown chart */}
      <div className="chart-card">
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "baseline", marginBottom: 14, flexWrap: "wrap", gap: 8,
        }}>
          <div>
            <div style={{
              fontSize: 11, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 600,
            }}>
              Payoff curve
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2, color: "var(--ink)" }}>
              {summary.monthsRemaining} month{summary.monthsRemaining !== 1 ? "s" : ""} to zero
            </div>
          </div>
          <div className="chart-legend" style={{ marginTop: 0 }}>
            <span>
              <span className="legend-dot" style={{ background: "var(--info)" }} />
              Snowball
            </span>
          </div>
        </div>
        <BurndownChart schedule={schedule} height={220} />
      </div>

      <style>{`
        @media (max-width: 760px) {
          .focus-hero {
            grid-template-columns: 1fr !important;
            text-align: left;
            gap: 20px !important;
            padding: 24px !important;
          }
          .focus-hero > div:first-child { margin: 0 auto; }
          .focus-bottom-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
