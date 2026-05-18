"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency, formatMonth, type UIDebt, type ScheduleEntry } from "@/lib/snowball";

// Simple burndown SVG chart
function BurndownChart({
  schedule, height = 320, showMinOnly = false,
}: {
  schedule: ScheduleEntry[];
  height?: number;
  showMinOnly?: boolean;
}) {
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

  const toPoint = (v: number, i: number) => {
    const x = pad.left + (i / Math.max(points.length - 1, 1)) * chartW;
    const y = pad.top + (1 - v / maxVal) * chartH;
    return `${x},${y}`;
  };

  const pts = points.map((v, i) => toPoint(v, i));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height }} preserveAspectRatio="none">
      <polygon
        points={`${pad.left},${pad.top + chartH} ${pts.join(" ")} ${pad.left + chartW},${pad.top + chartH}`}
        fill="var(--info-soft)"
        opacity="0.6"
      />
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

interface PayoffScheduleProps {
  debts: UIDebt[];
  schedule: ScheduleEntry[];
}

export default function PayoffSchedule({ debts, schedule }: PayoffScheduleProps) {
  const { userDoc } = useAuth();
  const firstName = userDoc?.displayName?.split(" ")[0] || "there";
  const [showAll, setShowAll] = useState(false);
  const [view, setView] = useState<"snowball" | "compare">("snowball");

  if (schedule.length === 0) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "96px 0", textAlign: "center",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
        <h2 style={{
          fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400,
          color: "var(--ink)", marginBottom: 8, marginTop: 0,
        }}>
          No schedule yet
        </h2>
        <p style={{ color: "var(--ink-muted)", maxWidth: 300, margin: "0 auto" }}>
          Add your debts and set a monthly budget to generate a payoff schedule.
        </p>
      </div>
    );
  }

  const displayed = showAll ? schedule : schedule.slice(0, 24);
  const paidOff = new Set<string>();

  // Projected payoff date from last entry
  const lastEntry = schedule[schedule.length - 1];
  const projectedPayoff = lastEntry ? formatMonth(lastEntry.month) : "—";

  return (
    <div>
      {/* Greeting */}
      <div className="greeting">
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Hi {firstName}!</div>
          <h1>
            Your payoff <span className="h1-italic">schedule.</span>
          </h1>
          <p>Every payment, every month — through {projectedPayoff}.</p>
        </div>
      </div>

      {/* Burndown chart */}
      <div className="section-head" style={{ marginBottom: 16, marginTop: 0 }}>
        <h2 style={{ fontSize: 22 }}>Burndown</h2>
        <div className="pill-group">
          <button
            className="pill"
            aria-pressed={view === "snowball" ? "true" : "false"}
            onClick={() => setView("snowball")}
          >
            Snowball only
          </button>
          <button
            className="pill"
            aria-pressed={view === "compare" ? "true" : "false"}
            onClick={() => setView("compare")}
          >
            Compare to min-only
          </button>
        </div>
      </div>

      <div className="chart-card" style={{ marginBottom: 32 }}>
        <BurndownChart schedule={schedule} height={320} showMinOnly={view === "compare"} />
        <div className="chart-legend">
          <span>
            <span className="legend-dot" style={{ background: "var(--info)" }} />
            Snowball plan
          </span>
          {view === "compare" && (
            <span>
              <span className="legend-dot" style={{ background: "var(--ink-faint)" }} />
              Minimums only
            </span>
          )}
          <span style={{ marginLeft: "auto", color: "var(--ink-faint)" }}>
            {schedule.length} months total
          </span>
        </div>
      </div>

      {/* Monthly schedule table */}
      <div className="section">
        <div className="section-head">
          <h2>Monthly schedule</h2>
          <span className="sub">
            {showAll ? `All ${schedule.length} months` : "Next 24 months"}
          </span>
        </div>
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Month</th>
                <th className="right">Total payment</th>
                <th className="right">Principal</th>
                <th className="right">Interest</th>
                <th className="right">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((entry) => {
                const rowPaidOff = new Set<string>();
                entry.debtSnapshots.forEach(ds => {
                  if (ds.closingBalance === 0 && ds.openingBalance > 0) rowPaidOff.add(ds.debtId);
                });

                const totalPaid = entry.debtSnapshots.reduce((s, ds) => s + ds.payment, 0);
                const totalInterest = entry.debtSnapshots.reduce((s, ds) => s + ds.interestCharge, 0);
                const totalPrincipal = totalPaid - totalInterest;
                const remaining = entry.debtSnapshots.reduce((s, ds) => s + ds.closingBalance, 0);

                // Mark newly paid off debts
                rowPaidOff.forEach(id => paidOff.add(id));

                return (
                  <tr key={entry.month}>
                    <td style={{ fontWeight: 500 }}>{formatMonth(entry.month)}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(totalPaid)}</td>
                    <td className="num" style={{ color: "var(--sage-deep)" }}>{formatCurrency(totalPrincipal)}</td>
                    <td className="num" style={{ color: "var(--warn)" }}>{formatCurrency(totalInterest)}</td>
                    <td className="num" style={{ color: "var(--ink-muted)" }}>{formatCurrency(remaining)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {schedule.length > 24 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="btn"
          style={{ marginTop: 16, width: "100%", justifyContent: "center" }}
        >
          {showAll ? "Show less" : `Show all ${schedule.length} months`}
        </button>
      )}
    </div>
  );
}
