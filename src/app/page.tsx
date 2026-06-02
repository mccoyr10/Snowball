"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  buildSnowballSchedule,
  runMinOnlySchedule,
  generateId,
  todayYYYYMM,
} from "@/lib/snowball";
import type { UIDebt, UISettings, ScheduleEntry } from "@/lib/snowball";

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 400, color: "var(--sage)", letterSpacing: "-0.02em" }}>Exhale</span>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>Debt</span>
    </div>
  );
}

const features = [
  { icon: "📅", title: "Exact payoff dates", desc: "See the month and year each debt dies — not a rough estimate. A real date you can circle on the calendar." },
  { icon: "🔀", title: "Scenario modeling", desc: "What happens if you throw an extra $300/month? What about a $10K lump sum in October? Run it and see instantly." },
  { icon: "❄️", title: "True snowball logic", desc: "Payments roll automatically when a debt is gone. The math works exactly the way the method is supposed to." },
  { icon: "👥", title: "Built for households", desc: "Track debts across both spouses. One dashboard, every debt, full picture — no more separate spreadsheets." },
  { icon: "✏️", title: "Month-by-month editing", desc: "Life isn't linear. Adjust any month's payment and watch every future date recalculate in real time." },
  { icon: "🤖", title: "AI financial advisor", desc: "Ask what-if questions and get personalized strategies from your built-in advisor. Available as a paid add-on." },
];

const steps = [
  { n: "1", title: "Enter your debts", desc: "Add each debt — balance, interest rate, minimum payment. Doesn't matter how many. Doesn't matter how big." },
  { n: "2", title: "Set your snowball payment", desc: "Tell it how much you're throwing at debt each month. It figures out the order, the roll, and the payoff timeline automatically." },
  { n: "3", title: "Model \"what if\"", desc: "Add an extra $200. Drop in a lump sum. Change a payment in month 14. Watch every date shift in real time." },
  { n: "4", title: "Check in. Stay focused.", desc: "Come back monthly. Mark progress. Watch the numbers shrink. Keep breathing." },
];

interface AuditDebt {
  id: string;
  name: string;
  balance: string;
  apr: string;
  minPayment: string;
}

interface AuditResults {
  grade: "A" | "B" | "C" | "D" | "F";
  gradeColor: string;
  gradeReason: string;
  totalDailyInterest: number;
  totalMonthlyInterest: number;
  totalAnnualInterest: number;
  hoursOfWorkPerDay: number;
  debtDetails: Array<{
    id: string;
    name: string;
    balance: number;
    apr: number;
    minPayment: number;
    monthlyInterest: number;
    isRefinanceCandidate: boolean;
    estimatedAnnualSavings: number;
  }>;
  minOnlyMonths: number;
  minOnlyInterest: number;
  snowballPlusMonths: number;
  snowballPlusInterest: number;
  interestSavings: number;
  totalBalance: number;
  totalMinPayments: number;
  interestToIncomeRatio: number;
}

function parseNum(s: string): number {
  return parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
}

function scheduleInterest(sched: ScheduleEntry[]): number {
  return sched.reduce((s, e) => s + e.debtSnapshots.reduce((ss, ds) => ss + ds.interestCharge, 0), 0);
}

function computeGrade(
  totalMonthlyInterest: number,
  monthlyIncome: number,
  totalBalance: number
): { grade: "A" | "B" | "C" | "D" | "F"; gradeColor: string; gradeReason: string } {
  const ratio = (totalMonthlyInterest / monthlyIncome) * 100;
  const dti = totalBalance / (monthlyIncome * 12);
  if (ratio > 35 || dti > 5) return { grade: "F", gradeColor: "var(--danger)", gradeReason: "Critical debt burden — interest is consuming your income" };
  if (ratio > 20) return { grade: "D", gradeColor: "var(--warn)", gradeReason: "High interest burden relative to income" };
  if (ratio > 10) return { grade: "C", gradeColor: "var(--gold)", gradeReason: "Moderate interest burden — room to improve" };
  if (ratio > 5) return { grade: "B", gradeColor: "var(--info)", gradeReason: "Manageable debt load — you're on the right track" };
  return { grade: "A", gradeColor: "var(--sage)", gradeReason: "Low interest burden — strong financial position" };
}

function formatMonths(m: number): string {
  if (m >= 600) return "50+ years";
  const yrs = Math.floor(m / 12);
  const mos = m % 12;
  if (yrs === 0) return `${mos} mo`;
  if (mos === 0) return `${yrs} yr`;
  return `${yrs} yr ${mos} mo`;
}

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [auditDebts, setAuditDebts] = useState<AuditDebt[]>([
    { id: generateId(), name: "", balance: "", apr: "", minPayment: "" },
  ]);
  const [auditIncome, setAuditIncome] = useState("");
  const [auditEmail, setAuditEmail] = useState("");
  const [auditResults, setAuditResults] = useState<AuditResults | null>(null);
  const [debtErrors, setDebtErrors] = useState<Record<string, string>>({});
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  function addDebt() {
    if (auditDebts.length >= 10) return;
    setAuditDebts(prev => [...prev, { id: generateId(), name: "", balance: "", apr: "", minPayment: "" }]);
  }

  function removeDebt(id: string) {
    setAuditDebts(prev => prev.filter(d => d.id !== id));
    setDebtErrors(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  function updateDebt(id: string, field: keyof AuditDebt, value: string) {
    setAuditDebts(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  }

  function runAudit(e: React.FormEvent) {
    e.preventDefault();
    const monthlyIncome = parseNum(auditIncome);
    if (!monthlyIncome || monthlyIncome <= 0) return;

    const errors: Record<string, string> = {};
    const parsed = auditDebts.map(d => ({
      id: d.id,
      name: d.name.trim() || "Debt",
      balance: parseNum(d.balance),
      apr: parseNum(d.apr),
      minPayment: parseNum(d.minPayment),
    }));

    for (const d of parsed) {
      if (d.balance <= 0 || d.apr <= 0 || d.minPayment <= 0) continue;
      const monthlyInterest = d.balance * (d.apr / 100 / 12);
      if (d.minPayment < monthlyInterest) {
        errors[d.id] = `Min payment is less than monthly interest ($${monthlyInterest.toFixed(2)}) — balance will never decrease`;
      }
    }
    setDebtErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const valid = parsed.filter(d => d.balance > 0 && d.apr > 0 && d.minPayment > 0);
    if (valid.length === 0) return;

    const totalBalance = valid.reduce((s, d) => s + d.balance, 0);
    const totalMinPayments = valid.reduce((s, d) => s + d.minPayment, 0);
    const totalMonthlyInterest = valid.reduce((s, d) => s + d.balance * (d.apr / 100 / 12), 0);
    const totalAnnualInterest = totalMonthlyInterest * 12;
    const totalDailyInterest = totalAnnualInterest / 365;
    const hourlyRate = (monthlyIncome * 12) / 2080;
    const hoursOfWorkPerDay = totalDailyInterest / hourlyRate;
    const interestToIncomeRatio = (totalMonthlyInterest / monthlyIncome) * 100;

    const { grade, gradeColor, gradeReason } = computeGrade(totalMonthlyInterest, monthlyIncome, totalBalance);

    const debtDetails = valid.map(d => {
      const monthlyInterest = d.balance * (d.apr / 100 / 12);
      const savingsMonthly = d.balance * ((d.apr - 10) / 100 / 12);
      return {
        id: d.id, name: d.name, balance: d.balance, apr: d.apr, minPayment: d.minPayment,
        monthlyInterest, isRefinanceCandidate: d.apr > 15,
        estimatedAnnualSavings: Math.max(0, savingsMonthly * 12),
      };
    });

    const uiDebts: UIDebt[] = valid.map(d => ({ ...d }));
    const settings: UISettings = { monthlyBudget: totalMinPayments, startDate: todayYYYYMM() };
    const settingsPlus: UISettings = { monthlyBudget: totalMinPayments + 100, startDate: todayYYYYMM() };

    const minOnlySched = runMinOnlySchedule(uiDebts, settings);
    const snowballPlusSched = buildSnowballSchedule(uiDebts, settingsPlus);

    setAuditResults({
      grade, gradeColor, gradeReason,
      totalDailyInterest, totalMonthlyInterest, totalAnnualInterest, hoursOfWorkPerDay,
      debtDetails,
      minOnlyMonths: minOnlySched.length,
      minOnlyInterest: scheduleInterest(minOnlySched),
      snowballPlusMonths: snowballPlusSched.length,
      snowballPlusInterest: scheduleInterest(snowballPlusSched),
      interestSavings: scheduleInterest(minOnlySched) - scheduleInterest(snowballPlusSched),
      totalBalance, totalMinPayments, interestToIncomeRatio,
    });
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    const email = auditEmail.trim();
    if (email) {
      fetch("/api/mailerlite/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }).catch(() => {});
    }
    const enc = encodeURIComponent(email);
    window.location.href = enc ? `/register?email=${enc}` : "/register";
  }

  if (loading || user) {
    return (
      <div className="loading-screen">
        <div className="loading-inner">
          <span className="loading-icon">🌬️</span>
          <p className="loading-text">Loading…</p>
        </div>
      </div>
    );
  }

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600,
    color: "var(--ink-muted)", marginBottom: 6,
    letterSpacing: "0.05em", textTransform: "uppercase",
  };

  return (
    <div style={{ background: "var(--bg)", fontFamily: "var(--font-ui)" }}>

      {/* ── NAV ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(246,248,250,0.9)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "0.5px solid var(--line)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "1rem 2rem",
      }}>
        <Logo />
        <a href="/login" style={{ fontSize: 13, color: "var(--ink-muted)", textDecoration: "none" }}>
          Sign in
        </a>
      </header>

      {/* ── HERO / AUDIT TOOL ── */}
      <section style={{ padding: "5rem 2rem 4rem", maxWidth: 800, margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{
            display: "inline-block", fontSize: 11, fontWeight: 600,
            letterSpacing: "2px", textTransform: "uppercase" as const,
            color: "var(--info)", background: "var(--info-soft)",
            padding: "5px 14px", borderRadius: 20, marginBottom: "1.5rem",
          }}>
            Financial Audit Tool
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(32px, 5.5vw, 52px)",
            fontWeight: 400, lineHeight: 1.1,
            letterSpacing: "-1.5px", color: "var(--ink)", margin: "0 0 1rem",
          }}>
            Is your debt costing you<br />
            <em style={{ color: "var(--info)" }}>more than you think?</em>
          </h1>
          <p style={{ fontSize: 17, fontWeight: 300, lineHeight: 1.65, color: "var(--ink-muted)", maxWidth: 480, margin: "0 auto" }}>
            Run a free 30-second audit to see exactly what your debt is costing you — in dollars and hours of your life.
          </p>
        </div>

        {/* Audit Input Card */}
        <form onSubmit={runAudit}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--line-strong)",
            borderRadius: "var(--r-lg)", padding: "2rem", boxShadow: "var(--shadow-md)",
          }}>
            {/* Monthly Income */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={labelStyle}>Monthly Income (after tax)</label>
              <div style={{ position: "relative", maxWidth: 220 }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-muted)", fontSize: 14, pointerEvents: "none" }}>$</span>
                <input
                  type="text" inputMode="numeric" placeholder="6,500"
                  value={auditIncome}
                  onChange={e => { const r = e.target.value.replace(/[^0-9]/g, ""); setAuditIncome(r ? Number(r).toLocaleString() : ""); }}
                  className="form-input" style={{ paddingLeft: 28 }}
                />
              </div>
            </div>

            {/* Debt rows */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ ...labelStyle, marginBottom: "0.75rem" }}>Your Debts</label>

              {/* Column headers */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "2fr 1.2fr 0.8fr 1.2fr 28px",
                gap: 8, marginBottom: 6,
              }}>
                {["Name", "Balance", "APR", "Min Payment", ""].map((h, i) => (
                  <div key={i} style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-faint)", letterSpacing: "0.05em", textTransform: "uppercase" as const }}>{h}</div>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                {auditDebts.map(debt => (
                  <div key={debt.id}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 0.8fr 1.2fr 28px", gap: 8, alignItems: "center" }}>
                      <input
                        type="text" placeholder="Chase Visa"
                        value={debt.name}
                        onChange={e => updateDebt(debt.id, "name", e.target.value)}
                        className="form-input"
                      />
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-muted)", fontSize: 13, pointerEvents: "none" }}>$</span>
                        <input
                          type="text" inputMode="numeric" placeholder="8,000"
                          value={debt.balance}
                          onChange={e => { const r = e.target.value.replace(/[^0-9]/g, ""); updateDebt(debt.id, "balance", r ? Number(r).toLocaleString() : ""); }}
                          className="form-input" style={{ paddingLeft: 24 }}
                        />
                      </div>
                      <div style={{ position: "relative" }}>
                        <input
                          type="text" inputMode="decimal" placeholder="18.5"
                          value={debt.apr}
                          onChange={e => { const v = e.target.value.replace(/[^0-9.]/g, ""); const p = v.split("."); updateDebt(debt.id, "apr", p.length > 2 ? p[0] + "." + p.slice(1).join("") : v); }}
                          className="form-input" style={{ paddingRight: 22 }}
                        />
                        <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-muted)", fontSize: 13, pointerEvents: "none" }}>%</span>
                      </div>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-muted)", fontSize: 13, pointerEvents: "none" }}>$</span>
                        <input
                          type="text" inputMode="numeric" placeholder="200"
                          value={debt.minPayment}
                          onChange={e => { const r = e.target.value.replace(/[^0-9]/g, ""); updateDebt(debt.id, "minPayment", r ? Number(r).toLocaleString() : ""); }}
                          className="form-input" style={{ paddingLeft: 24 }}
                        />
                      </div>
                      {auditDebts.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeDebt(debt.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-faint)", fontSize: 16, padding: 0, lineHeight: 1, fontFamily: "var(--font-ui)" }}
                          aria-label="Remove debt"
                        >×</button>
                      ) : <div />}
                    </div>
                    {debtErrors[debt.id] && (
                      <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 4, paddingLeft: 2 }}>
                        {debtErrors[debt.id]}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {auditDebts.length < 10 && (
                <button
                  type="button"
                  onClick={addDebt}
                  style={{
                    marginTop: 10, background: "none", border: "1px dashed var(--line-strong)",
                    borderRadius: "var(--r-sm)", cursor: "pointer", fontSize: 13,
                    color: "var(--ink-muted)", padding: "7px 16px", fontFamily: "var(--font-ui)",
                    width: "100%",
                  }}
                >
                  + Add another debt
                </button>
              )}
            </div>

            <div style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 12 }}>
              <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: 0 }}>
                Confidential · No account required · Results generated locally
              </p>
              <button type="submit" className="btn primary" style={{ fontSize: 14, padding: "11px 24px", borderRadius: "var(--r-pill)" }}>
                Run Audit →
              </button>
            </div>
          </div>
        </form>

        {/* ── AUDIT RESULTS ── */}
        {auditResults && (
          <div ref={resultsRef} style={{ marginTop: "2.5rem" }}>
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--line-strong)",
              borderRadius: "var(--r-lg)",
              overflow: "hidden",
              boxShadow: "var(--shadow-md)",
            }}>
              {/* Top accent */}
              <div style={{ height: 4, background: "linear-gradient(90deg, var(--info), var(--sage))" }} />

              {/* ── Grade ── */}
              <div style={{ padding: "2rem 2rem 1.5rem", borderBottom: "1px solid var(--line)", textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-faint)", letterSpacing: "2px", textTransform: "uppercase" as const, marginBottom: "0.75rem" }}>
                  Your Financial Health Grade
                </div>
                <div style={{
                  fontSize: 96, fontWeight: 800, lineHeight: 1,
                  color: auditResults.gradeColor,
                  fontFamily: "var(--font-display)",
                  marginBottom: "0.5rem",
                }}>
                  {auditResults.grade}
                </div>
                <div style={{ fontSize: 15, color: "var(--ink)", fontWeight: 500, marginBottom: 4 }}>
                  {auditResults.gradeReason}
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>
                  Based on your {auditResults.interestToIncomeRatio.toFixed(1)}% interest-to-income ratio
                </div>
              </div>

              {/* ── Interest Leakage ── */}
              <div style={{ borderBottom: "1px solid var(--line)" }}>
                <div style={{ padding: "1rem 2rem 0.5rem" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-faint)", letterSpacing: "2px", textTransform: "uppercase" as const }}>
                    Interest Leakage
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                  {[
                    {
                      value: `$${auditResults.totalDailyInterest.toFixed(2)}`,
                      label: "per day in interest",
                      sub: "While you sleep, eat, and work — the meter runs.",
                      color: "var(--danger)",
                    },
                    {
                      value: auditResults.hoursOfWorkPerDay >= 8
                        ? "a full workday"
                        : auditResults.hoursOfWorkPerDay < 0.1
                          ? `${Math.round(auditResults.hoursOfWorkPerDay * 60)} min`
                          : `${auditResults.hoursOfWorkPerDay.toFixed(1)} hrs`,
                      label: "of work/day just for interest",
                      sub: "Hours of your labor handed straight to lenders.",
                      color: "var(--warn)",
                    },
                    {
                      value: `$${Math.round(auditResults.totalMonthlyInterest).toLocaleString()}`,
                      label: "per month to lenders",
                      sub: "Money that could be building your future.",
                      color: "var(--ink)",
                    },
                  ].map((stat, i) => (
                    <div key={i} style={{ padding: "1.25rem 1.75rem", borderRight: i < 2 ? "1px solid var(--line)" : "none" }}>
                      <div style={{ fontSize: "clamp(22px, 3.5vw, 30px)", fontWeight: 800, color: stat.color, lineHeight: 1, marginBottom: 4 }}>
                        {stat.value}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", marginBottom: 4 }}>{stat.label}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.5 }}>{stat.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Payoff Timeline ── */}
              <div style={{ borderBottom: "1px solid var(--line)" }}>
                <div style={{ padding: "1rem 2rem 0.5rem" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-faint)", letterSpacing: "2px", textTransform: "uppercase" as const }}>
                    Payoff Timeline
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid var(--line)" }}>
                  <div style={{ padding: "1.25rem 1.75rem", borderRight: "1px solid var(--line)" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-faint)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 8 }}>
                      Minimums only
                    </div>
                    <div style={{ fontSize: "clamp(20px, 3vw, 26px)", fontWeight: 800, color: "var(--ink)", lineHeight: 1, marginBottom: 4 }}>
                      {formatMonths(auditResults.minOnlyMonths)}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>
                      ${Math.round(auditResults.minOnlyInterest).toLocaleString()} total interest
                    </div>
                  </div>
                  <div style={{ padding: "1.25rem 1.75rem", background: "var(--sage-soft)" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--sage-deep)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 8 }}>
                      Snowball + $100/mo extra
                    </div>
                    <div style={{ fontSize: "clamp(20px, 3vw, 26px)", fontWeight: 800, color: "var(--sage-deep)", lineHeight: 1, marginBottom: 4 }}>
                      {formatMonths(auditResults.snowballPlusMonths)}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--sage-deep)" }}>
                      Save ~${Math.round(auditResults.interestSavings).toLocaleString()} in interest
                    </div>
                  </div>
                </div>
                <div style={{ padding: "0.75rem 1.75rem", background: "var(--surface-sunk)", borderTop: "0.5px solid var(--line)" }}>
                  <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                    Just $100/month extra — put in the right order — can make a significant difference. The full tracker shows your exact payoff date for every extra dollar you contribute.
                  </div>
                </div>
              </div>

              {/* ── Refinancing Opportunities ── */}
              {auditResults.debtDetails.some(d => d.isRefinanceCandidate) && (
                <div style={{ borderBottom: "1px solid var(--line)" }}>
                  <div style={{ padding: "1rem 2rem 0.5rem" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-faint)", letterSpacing: "2px", textTransform: "uppercase" as const }}>
                      Refinancing Opportunities
                    </div>
                  </div>
                  <div style={{ padding: "0 1.75rem 1.25rem" }}>
                    <div style={{
                      background: "var(--warn-soft, #fef9ec)",
                      border: "1px solid var(--warn, #d97706)",
                      borderLeft: "4px solid var(--warn, #d97706)",
                      borderRadius: "var(--r-sm)",
                      padding: "1rem 1.25rem",
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", marginBottom: "0.75rem" }}>
                        These debts have high APRs — refinancing or a balance transfer could save you money:
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                        {auditResults.debtDetails.filter(d => d.isRefinanceCandidate).map(d => (
                          <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" as const }}>
                            <div>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{d.name}</span>
                              <span style={{ fontSize: 13, color: "var(--warn)", fontWeight: 500 }}> · {d.apr}% APR</span>
                            </div>
                            <div style={{ fontSize: 12, color: "var(--ink-muted)", textAlign: "right" as const }}>
                              Refi to ~10% → save ~${Math.round(d.estimatedAnnualSavings).toLocaleString()}/yr
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: "0.75rem" }}>
                        Consider personal loans, credit union offers, or balance transfer cards. Shop multiple lenders to confirm rates for your credit profile.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Encouragement + CTA ── */}
              <div style={{ padding: "1.75rem 2rem" }}>
                <p style={{ fontSize: 15, color: "var(--ink-muted)", lineHeight: 1.7, marginBottom: "1.5rem", fontWeight: 300 }}>
                  The good news? <strong style={{ color: "var(--ink)", fontWeight: 600 }}>This is completely fixable.</strong> The debt snowball method gives you a specific payoff date for every debt — not a rough estimate, an actual month and year you can work toward. Thousands of people use it to get out faster than they thought possible.{" "}
                  <strong style={{ color: "var(--sage)", fontWeight: 500 }}>The tracker is free.</strong>
                </p>

                <div style={{
                  background: "var(--info-soft)",
                  border: "1px solid #bfdbfe",
                  borderRadius: "var(--r-lg)",
                  padding: "1.5rem",
                }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                    Start tracking your debt — free
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: "1rem" }}>
                    Enter your email to create your free account and build your payoff plan.
                  </div>
                  <form onSubmit={handleEmailSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                    <input
                      type="email"
                      required
                      placeholder="your@email.com"
                      value={auditEmail}
                      onChange={e => setAuditEmail(e.target.value)}
                      className="form-input"
                      style={{ flex: "1 1 220px", minWidth: 0 }}
                    />
                    <button type="submit" className="btn primary" style={{ borderRadius: "var(--r-pill)", whiteSpace: "nowrap" as const }}>
                      Get started free →
                    </button>
                  </form>
                  <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 10 }}>
                    Free forever · No credit card · Cancel anytime
                  </div>
                </div>
              </div>
            </div>

            {/* Re-run */}
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <button
                onClick={() => { setAuditResults(null); setDebtErrors({}); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--ink-muted)", textDecoration: "underline", fontFamily: "var(--font-ui)" }}
              >
                Edit inputs / Re-run audit
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── TENSION STRIP ── */}
      <div style={{ background: "var(--surface-sunk)", borderTop: "0.5px solid var(--line)", borderBottom: "0.5px solid var(--line)", padding: "4rem 2rem", textAlign: "center" }}>
        <div style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "2px", color: "var(--ink-faint)", marginBottom: "1.25rem", fontWeight: 500 }}>
          Sound familiar?
        </div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 400, maxWidth: 560, margin: "0 auto 1.25rem", lineHeight: 1.25, color: "var(--ink)" }}>
          &ldquo;We make good money. Why does it still feel like we&apos;re drowning?&rdquo;
        </h2>
        <p style={{ fontSize: 16, color: "var(--ink-muted)", maxWidth: 460, margin: "0 auto", fontWeight: 300, lineHeight: 1.65 }}>
          You&apos;ve got spreadsheets. You&apos;ve got a plan. But the numbers don&apos;t tell you <em>when</em> — and without a finish line, motivation doesn&apos;t last.
        </p>
      </div>

      {/* ── FEATURES ── */}
      <section style={{ padding: "5rem 2rem", maxWidth: 760, margin: "0 auto" }}>
        <div style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "2px", color: "var(--sage)", marginBottom: "0.75rem", fontWeight: 500 }}>What it does</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 400, lineHeight: 1.2, maxWidth: 460, marginBottom: "2.75rem", color: "var(--ink)" }}>
          Built for people serious about getting out.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          {features.map(f => (
            <div key={f.title} style={{ background: "var(--surface)", border: "0.5px solid var(--line)", borderRadius: "var(--r-lg)", padding: "1.5rem" }}>
              <div style={{ fontSize: 22, marginBottom: "1rem" }}>{f.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: "0.4rem", color: "var(--ink)" }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.6, fontWeight: 300 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SNOWBALL VISUAL ── */}
      <div style={{ background: "var(--surface-sunk)", borderTop: "0.5px solid var(--line)", borderBottom: "0.5px solid var(--line)", padding: "4.5rem 2rem", textAlign: "center" }}>
        <div style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "2px", color: "var(--sage)", marginBottom: "0.75rem", fontWeight: 500 }}>The method, visualized</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 400, marginBottom: "0.6rem", color: "var(--ink)" }}>Every payoff fuels the next one.</h2>
        <p style={{ fontSize: 15, color: "var(--ink-muted)", fontWeight: 300, maxWidth: 420, margin: "0 auto" }}>
          Exhale Debt tracks it month by month so you always know what&apos;s rolling and what&apos;s next.
        </p>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 12, margin: "2.5rem auto 1rem", maxWidth: 480 }}>
          <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 6 }}>
            <div style={{ width: 80, height: 60, background: "var(--ink-faint)", opacity: 0.3, borderRadius: "6px 6px 0 0" }} />
            <div style={{ fontSize: 10, color: "var(--sage-deep)", background: "var(--sage-soft)", borderRadius: 20, padding: "2px 10px", fontWeight: 500 }}>✓ Paid</div>
            <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>Credit card</div>
            <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>$4,200</div>
          </div>
          <div style={{ fontSize: 18, color: "var(--sage)", paddingBottom: 44 }}>→</div>
          <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 6 }}>
            <div style={{ width: 80, height: 110, background: "var(--sage)", borderRadius: "6px 6px 0 0" }} />
            <div style={{ fontSize: 10, color: "var(--sage-deep)", background: "var(--sage-soft)", borderRadius: 20, padding: "2px 10px", fontWeight: 500 }}>In progress</div>
            <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>Car loan</div>
            <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>$18,000</div>
          </div>
          <div style={{ fontSize: 18, color: "var(--ink-faint)", paddingBottom: 44 }}>→</div>
          <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 6 }}>
            <div style={{ width: 80, height: 150, background: "var(--line-strong)", borderRadius: "6px 6px 0 0" }} />
            <div style={{ fontSize: 10, color: "var(--ink-faint)", padding: "2px 10px", fontWeight: 400 }}>Up next</div>
            <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>Student loans</div>
            <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>$140,000</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "var(--sage)", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          → Payment rolls forward automatically when each debt clears
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "5rem 2rem", maxWidth: 760, margin: "0 auto" }} id="how">
        <div style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "2px", color: "var(--sage)", marginBottom: "0.75rem", fontWeight: 500 }}>Getting started</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 400, lineHeight: 1.2, maxWidth: 460, marginBottom: "2.75rem", color: "var(--ink)" }}>
          Up and running in five minutes.
        </h2>
        <div>
          {steps.map((step, i) => (
            <div key={step.n} style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", padding: "1.5rem 0", borderBottom: i < steps.length - 1 ? "0.5px solid var(--line)" : "none" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--sage-soft)", color: "var(--sage-deep)", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                {step.n}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: "0.35rem", color: "var(--ink)" }}>{step.title}</div>
                <div style={{ fontSize: 13, color: "var(--ink-muted)", fontWeight: 300, lineHeight: 1.6 }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section style={{ textAlign: "center", padding: "6rem 2rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(34px, 6vw, 52px)", fontWeight: 400, marginBottom: "1rem", lineHeight: 1.08, letterSpacing: "-1px", color: "var(--ink)" }}>
          Ready to see your<br /><em style={{ color: "var(--sage)" }}>debt-free date?</em>
        </h2>
        <p style={{ fontSize: 16, color: "var(--ink-muted)", fontWeight: 300, maxWidth: 440, margin: "0 auto 2.5rem" }}>
          Enter your debts. Set your payment. See the exact month and year you become debt-free — free forever.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" as const, marginBottom: "1rem" }}>
          <a href="/register" className="btn primary" style={{ fontSize: 15, padding: "14px 28px", borderRadius: "var(--r-pill)", justifyContent: "center" }}>
            Start tracking — it&apos;s free →
          </a>
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>Free forever · No credit card required</div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: "1.75rem 2rem", borderTop: "0.5px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: 8 }}>
        <Logo />
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" as const }}>
          <a href="/terms" style={{ fontSize: 12, color: "var(--ink-faint)", textDecoration: "none" }}>Terms</a>
          <a href="/privacy" style={{ fontSize: 12, color: "var(--ink-faint)", textDecoration: "none" }}>Privacy</a>
          <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>© 2026 ExhaleDebt</span>
        </div>
      </footer>

    </div>
  );
}
