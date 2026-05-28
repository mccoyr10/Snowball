"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

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
  { icon: "🤖", title: "AI financial advisor", desc: "Ask what-if questions and get personalized strategies from your built-in advisor." },
];

const steps = [
  { n: "1", title: "Enter your debts", desc: "Add each debt — balance, interest rate, minimum payment. Doesn't matter how many. Doesn't matter how big." },
  { n: "2", title: "Set your snowball payment", desc: "Tell it how much you're throwing at debt each month. It figures out the order, the roll, and the payoff timeline automatically." },
  { n: "3", title: "Model \"what if\"", desc: "Add an extra $200. Drop in a lump sum. Change a payment in month 14. Watch every date shift in real time." },
  { n: "4", title: "Check in. Stay focused.", desc: "Come back monthly. Mark progress. Watch the numbers shrink. Keep breathing." },
];

const testimonials = [
  { quote: "I've tried every spreadsheet out there. This is the first thing that actually showed me a specific date to work toward. November 2028. I've got it on a Post-it on my monitor.", author: "Marcus T.", detail: "$84K paid off · 26 months in" },
  { quote: "We're a dual-income household with 4 debts and nothing was talking to anything else. Now we have one screen. One plan. We actually talk about money without fighting about it.", author: "Priya & Jordan K.", detail: "Household debt: $210K → $141K" },
  { quote: "The scenario modeling alone is worth it. I ran the numbers on picking up extra shifts and saw exactly how much faster we'd be done. Picked up the shifts. No regrets.", author: "Darnell W.", detail: "Accelerated payoff by 14 months" },
  { quote: "My wife and I have student loans, two cars, and a baby. I thought we were trapped. Exhale Debt showed me we're not. 2029 is the year. We're going to make it.", author: "Tyler R.", detail: "Tracking $230K in non-mortgage debt" },
];

const MONO: React.CSSProperties = { fontFamily: '"Courier New", Courier, monospace' };

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [auditInputs, setAuditInputs] = useState({ debt: "", apr: "", income: "" });
  const [auditResults, setAuditResults] = useState<{
    dailyCost: number;
    bankHours: number;
    monthlyInterest: number;
    annualInterest: number;
    monthlyPayment: number;
    principalPayment: number;
    interestRatio: number;
    liquidityScore: number;
    liquidityStatus: string;
    incomeRaw: number;
  } | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  function runAudit(e: React.FormEvent) {
    e.preventDefault();
    const debt = parseFloat(auditInputs.debt.replace(/[^0-9.]/g, ""));
    const apr = parseFloat(auditInputs.apr.replace(/[^0-9.]/g, ""));
    const income = parseFloat(auditInputs.income.replace(/[^0-9.]/g, ""));
    if (!debt || !apr || !income || debt <= 0 || apr <= 0 || income <= 0) return;

    const annualInterest = debt * (apr / 100);
    const monthlyInterest = annualInterest / 12;
    const monthlyRate = apr / 100 / 12;
    const n = 120; // 10-year amortization baseline
    const monthlyPayment = monthlyRate > 0
      ? debt * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
      : debt / n;
    const principalPayment = Math.max(monthlyPayment - monthlyInterest, 0);
    const interestRatio = Math.min((monthlyInterest / monthlyPayment) * 100, 99);

    const dti = debt / income;
    const liquidityScore = dti > 18 ? 5 : dti > 12 ? 15 : dti > 6 ? 32 : 60;
    const liquidityStatus = liquidityScore < 20 ? "CRITICAL SYSTEM RISK" : liquidityScore < 40 ? "ELEVATED RISK" : "ADEQUATE";

    setAuditResults({
      dailyCost: annualInterest / 365,
      bankHours: monthlyInterest / (income / 160),
      monthlyInterest,
      annualInterest,
      monthlyPayment,
      principalPayment,
      interestRatio,
      liquidityScore,
      liquidityStatus,
      incomeRaw: income,
    });
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
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
      <section style={{ padding: "5rem 2rem 4rem", maxWidth: 760, margin: "0 auto" }}>

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
            <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" as const }}>
                  Total Debt Balance
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-muted)", fontSize: 14, pointerEvents: "none" as const }}>$</span>
                  <input type="text" inputMode="numeric" placeholder="45,000" value={auditInputs.debt}
                    onChange={(e) => { const r = e.target.value.replace(/[^0-9]/g, ""); setAuditInputs(p => ({ ...p, debt: r ? Number(r).toLocaleString() : "" })); }}
                    className="form-input" style={{ paddingLeft: 28 }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" as const }}>
                  Average APR
                </label>
                <div style={{ position: "relative" }}>
                  <input type="text" inputMode="decimal" placeholder="18.5" value={auditInputs.apr}
                    onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ""); const p = v.split("."); setAuditInputs(prev => ({ ...prev, apr: p.length > 2 ? p[0] + "." + p.slice(1).join("") : v })); }}
                    className="form-input" style={{ paddingRight: 28 }} />
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-muted)", fontSize: 14, pointerEvents: "none" as const }}>%</span>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" as const }}>
                  Monthly Income
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-muted)", fontSize: 14, pointerEvents: "none" as const }}>$</span>
                  <input type="text" inputMode="numeric" placeholder="6,500" value={auditInputs.income}
                    onChange={(e) => { const r = e.target.value.replace(/[^0-9]/g, ""); setAuditInputs(p => ({ ...p, income: r ? Number(r).toLocaleString() : "" })); }}
                    className="form-input" style={{ paddingLeft: 28 }} />
                </div>
              </div>
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

        {/* ══════════════════════════════════════════════════════
            EXECUTIVE AUDIT SUMMARY
        ══════════════════════════════════════════════════════ */}
        {auditResults && (
          <div ref={resultsRef} style={{ marginTop: "2.5rem" }}>

            {/* Outer document shell */}
            <div style={{
              background: "#fafaf7",
              border: "1.5px solid #94a3b8",
              borderRadius: 4,
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(15,23,42,0.14), 0 2px 6px rgba(15,23,42,0.06)",
            }}>

              {/* ── DOCUMENT HEADER ── */}
              <div style={{ background: "#0f172a", padding: "2rem", position: "relative" }}>
                {/* Gold top rule */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "var(--gold)" }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" as const }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase" as const, color: "#b45309", marginBottom: 10 }}>
                      Executive Debt Strategy Audit
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 400, color: "#ffffff", lineHeight: 1.15, marginBottom: 14, letterSpacing: "-0.5px" }}>
                      Debt Liability<br />Assessment Report
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.9 }}>
                      Prepared by:{" "}
                      <span style={{ color: "#e2e8f0" }}>Ricky Rishod McCoy, CPA, CISA</span><br />
                      Date:{" "}
                      <span style={{ color: "#cbd5e1" }}>
                        {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </span>
                      <br />
                      Ref:{" "}
                      <span style={{ ...MONO, color: "#94a3b8", fontSize: 11 }}>
                        AUDIT-{new Date().getFullYear()}-{String(new Date().getMonth() + 1).padStart(2, "0")}-CONF
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-end", gap: 14, flexShrink: 0 }}>
                    {/* CONFIDENTIAL stamp */}
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "2.5px", textTransform: "uppercase" as const, border: "1.5px solid #ef4444", color: "#ef4444", borderRadius: 2, padding: "3px 10px" }}>
                      Confidential
                    </div>
                    {/* CPA/CISA seal */}
                    <div style={{ width: 64, height: 64, borderRadius: "50%", border: "2px solid #b45309", background: "rgba(180,83,9,0.08)", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#b45309", letterSpacing: "0.5px", lineHeight: 1.2, textAlign: "center" as const }}>
                        CPA<br />CISA
                      </div>
                      <div style={{ fontSize: 7, color: "#b45309", opacity: 0.75, letterSpacing: "1px" }}>CERT.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Findings banner */}
              <div style={{ background: "#1e293b", padding: "0.55rem 2rem", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
                <div style={{ fontSize: 10, color: "#64748b", letterSpacing: "1.5px", textTransform: "uppercase" as const }}>
                  Findings Summary —{" "}
                  <span style={{ color: "#f1f5f9" }}>4 Risk Areas Identified</span>{" "}
                  — Preliminary Review
                </div>
              </div>

              {/* ── FINDING I: INTEREST LEAKAGE ── */}
              <div style={{ padding: "1.75rem 2rem", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase" as const, color: "#94a3b8", marginBottom: 4 }}>Finding I</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "#0f172a", marginBottom: 16 }}>Interest Leakage</div>

                <div style={{ display: "flex", alignItems: "flex-end", gap: 20, flexWrap: "wrap" as const, marginBottom: 20 }}>
                  <div>
                    <div style={{ ...MONO, fontSize: "clamp(32px, 5vw, 46px)", fontWeight: 700, color: "#dc2626", lineHeight: 1, letterSpacing: "-2px" }}>
                      ${auditResults.dailyCost.toFixed(2)}
                      <span style={{ fontSize: "0.38em", fontWeight: 400, color: "#94a3b8", letterSpacing: 0 }}> / DAY</span>
                    </div>
                  </div>
                  <div style={{ paddingBottom: 4 }}>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 3 }}>Annual hemorrhage</div>
                    <div style={{ ...MONO, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                      ${auditResults.annualInterest.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      <span style={{ fontSize: "0.6em", fontWeight: 400, color: "#94a3b8" }}> / yr</span>
                    </div>
                  </div>
                </div>

                {/* Daily erosion bar */}
                <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: 6 }}>Daily Income Erosion Rate</div>
                <div style={{ background: "#f1f5f9", borderRadius: 2, height: 10, overflow: "hidden", marginBottom: 4 }}>
                  <div style={{
                    width: `${Math.min((auditResults.dailyCost / (auditResults.incomeRaw / 30)) * 100, 100)}%`,
                    height: "100%", background: "linear-gradient(90deg, #dc2626, #f87171)", borderRadius: 2,
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94a3b8" }}>
                  <span>$0</span>
                  <span>Daily income: ${(auditResults.incomeRaw / 30).toFixed(0)}</span>
                </div>
              </div>

              {/* ── FINDING II: PRINCIPAL EFFICIENCY RATIO ── */}
              <div style={{ padding: "1.75rem 2rem", borderBottom: "1px solid #e2e8f0", background: "#fdf9f3" }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase" as const, color: "#94a3b8", marginBottom: 4 }}>Finding II</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "#0f172a", marginBottom: 6 }}>Principal Efficiency Ratio</div>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>
                  Of each estimated monthly payment, capital allocation breaks down as follows:
                </div>

                {auditResults.interestRatio > 50 && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 4, padding: "4px 10px", marginBottom: 16 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#dc2626", flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", letterSpacing: "1px" }}>
                      TREADING WATER — INTEREST EXCEEDS PRINCIPAL REDUCTION
                    </span>
                  </div>
                )}

                {/* Interest bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 72, fontSize: 11, color: "#64748b", textAlign: "right" as const, flexShrink: 0 }}>Interest</div>
                  <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 2, height: 24, overflow: "hidden" }}>
                    <div style={{ width: `${auditResults.interestRatio}%`, height: "100%", background: "linear-gradient(90deg, #dc2626, #f87171)", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8 }}>
                      <span style={{ ...MONO, fontSize: 10, color: "#fff", fontWeight: 600 }}>{auditResults.interestRatio.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div style={{ ...MONO, width: 76, fontSize: 12, color: "#dc2626", fontWeight: 600, flexShrink: 0 }}>
                    ${auditResults.monthlyInterest.toFixed(0)}/mo
                  </div>
                </div>

                {/* Principal bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 72, fontSize: 11, color: "#64748b", textAlign: "right" as const, flexShrink: 0 }}>Principal</div>
                  <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 2, height: 24, overflow: "hidden" }}>
                    <div style={{ width: `${100 - auditResults.interestRatio}%`, height: "100%", background: "linear-gradient(90deg, #10825a, #34d399)", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8 }}>
                      <span style={{ ...MONO, fontSize: 10, color: "#fff", fontWeight: 600 }}>{(100 - auditResults.interestRatio).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div style={{ ...MONO, width: 76, fontSize: 12, color: "#10825a", fontWeight: 600, flexShrink: 0 }}>
                    ${auditResults.principalPayment.toFixed(0)}/mo
                  </div>
                </div>

                <div style={{ marginTop: 12, fontSize: 11, color: "#94a3b8", fontStyle: "italic" as const }}>
                  * Estimated via standard 10-year amortization at stated APR.
                </div>
              </div>

              {/* ── FINDING III: WORK-FOR-THE-BANK HOURS ── */}
              <div style={{ padding: "1.75rem 2rem", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase" as const, color: "#94a3b8", marginBottom: 4 }}>Finding III</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "#0f172a", marginBottom: 8 }}>Work-for-the-Bank™ Hours</div>
                <div style={{ fontSize: 13, color: "#475569", marginBottom: 20 }}>
                  <span style={{ ...MONO, fontSize: 22, fontWeight: 700, color: "var(--warn)" }}>
                    {auditResults.bankHours.toFixed(1)}
                  </span>
                  {" "}hours per month earned exclusively for your lenders.
                </div>

                <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: 10 }}>
                  Weekly Visualization — Hours Stolen by Lenders
                </div>

                <div style={{ overflowX: "auto" as const }}>
                  <div style={{ minWidth: 320 }}>
                    {/* Day headers */}
                    <div style={{ display: "grid", gridTemplateColumns: "44px repeat(5, 1fr)", gap: 3, marginBottom: 3 }}>
                      <div />
                      {(["MON", "TUE", "WED", "THU", "FRI"] as const).map(d => (
                        <div key={d} style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1px", color: d === "MON" ? "#ef4444" : "#94a3b8", textAlign: "center" as const, paddingBottom: 3 }}>
                          {d}
                        </div>
                      ))}
                    </div>
                    {/* Hour rows — Mon 9–12 is highlighted */}
                    {["9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM"].map((time, ri) => (
                      <div key={time} style={{ display: "grid", gridTemplateColumns: "44px repeat(5, 1fr)", gap: 3, marginBottom: 3 }}>
                        <div style={{ fontSize: 9, color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6 }}>{time}</div>
                        {[0, 1, 2, 3, 4].map(di => {
                          const stolen = di === 0 && ri < 3;
                          return (
                            <div key={di} style={{ height: 22, borderRadius: 2, background: stolen ? "#ef4444" : "#f1f5f9", border: stolen ? "none" : "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {stolen && ri === 1 && (
                                <span style={{ fontSize: 7, color: "#fff", fontWeight: 800, letterSpacing: "0.5px" }}>LENDER</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 10, fontSize: 11, color: "#94a3b8", fontStyle: "italic" as const }}>
                  Monday 9:00 AM – 12:00 PM: Time allocated to servicing lender obligations. Not your goals. Not your savings. Your lenders&apos; bottom line.
                </div>
              </div>

              {/* ── FINDING IV: SYSTEMIC LIQUIDITY RISK ── */}
              <div style={{ padding: "1.75rem 2rem", borderBottom: "1px solid #e2e8f0", background: auditResults.liquidityScore < 20 ? "#fff9f9" : "#fafaf7" }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase" as const, color: "#94a3b8", marginBottom: 4 }}>Finding IV</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "#0f172a", marginBottom: 6 }}>Systemic Liquidity Risk</div>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
                  Liquidity buffer assessment based on debt-service obligations relative to income capacity. Research indicator: <strong>32% of households</strong> at this debt-service ratio maintain zero liquid savings.
                </div>

                {/* Status badge */}
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: auditResults.liquidityScore < 20 ? "#fef2f2" : auditResults.liquidityScore < 40 ? "#fffbeb" : "#f0fdf4",
                  border: `1px solid ${auditResults.liquidityScore < 20 ? "#fca5a5" : auditResults.liquidityScore < 40 ? "#fcd34d" : "#86efac"}`,
                  borderRadius: 4, padding: "6px 14px", marginBottom: 16,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: auditResults.liquidityScore < 20 ? "#dc2626" : auditResults.liquidityScore < 40 ? "#d97706" : "#16a34a", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.5px", color: auditResults.liquidityScore < 20 ? "#dc2626" : auditResults.liquidityScore < 40 ? "#d97706" : "#16a34a" }}>
                    {auditResults.liquidityStatus}
                  </span>
                </div>

                {/* Gauge */}
                <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: 6 }}>Liquidity Buffer Gauge</div>
                <div style={{ background: "#f1f5f9", borderRadius: 2, height: 14, overflow: "hidden", marginBottom: 6 }}>
                  <div style={{
                    width: `${auditResults.liquidityScore}%`, height: "100%", borderRadius: 2,
                    background: auditResults.liquidityScore < 20
                      ? "linear-gradient(90deg, #dc2626, #f87171)"
                      : auditResults.liquidityScore < 40
                      ? "linear-gradient(90deg, #d97706, #fbbf24)"
                      : "linear-gradient(90deg, #10825a, #34d399)",
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#94a3b8" }}>
                  <span>DEPLETED</span><span>3-MONTH BUFFER</span><span>ADEQUATE</span>
                </div>
              </div>

              {/* ── AUDITOR'S FORMAL ASSESSMENT ── */}
              <div style={{ padding: "2rem", background: "#f5f4f0" }}>

                {/* Ruled citation block */}
                <div style={{ borderLeft: "3px solid #0f172a", paddingLeft: "1.25rem", marginBottom: "1.75rem" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase" as const, color: "#94a3b8", marginBottom: 8 }}>
                    Auditor&apos;s Formal Assessment
                  </div>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "#0f172a", lineHeight: 1.8, margin: 0 }}>
                    Based on the foregoing analysis, this debt structure presents a systemic financial risk requiring immediate strategic intervention. At the current trajectory, interest obligations will absorb{" "}
                    <strong>${auditResults.annualInterest.toLocaleString("en-US", { maximumFractionDigits: 0 })}</strong> annually — capital that cannot be directed toward wealth accumulation, emergency reserves, or retirement stability.
                  </p>
                </div>

                <p style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "#475569", lineHeight: 1.8, fontStyle: "italic" as const, marginBottom: "1.75rem" }}>
                  The recommended course of action is immediate enrollment in the{" "}
                  <strong style={{ color: "#0f172a", fontStyle: "normal" as const }}>Exhale Debt Strategic Roadmap System</strong>{" "}
                  — a structured debt elimination protocol designed to restore cash flow, sequence payoffs with maximum efficiency, and establish a definitive exit date. The system transforms this liability profile into a managed, time-bounded commitment.
                </p>

                {/* Signature block */}
                <div style={{ borderTop: "0.5px solid #cbd5e1", paddingTop: "1rem", marginBottom: "1.75rem" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 400, color: "#0f172a", fontStyle: "italic" as const, letterSpacing: "-0.5px", marginBottom: 4 }}>
                    Ricky Rishod McCoy
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.25px" }}>
                    Ricky Rishod McCoy, CPA, CISA · Exhale Debt Advisory
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                    Certified Public Accountant · Certified Information Systems Auditor
                  </div>
                </div>

                {/* Engagement fee CTA */}
                <div style={{ background: "#0f172a", borderRadius: 4, padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "2px", textTransform: "uppercase" as const, marginBottom: 6 }}>
                      Strategic Engagement
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "#ffffff", marginBottom: 4 }}>
                      Unlock Your Full Debt Exit Roadmap
                    </div>
                    <div style={{ fontSize: 12, color: "#475569" }}>
                      One-time engagement fee · Lifetime system access · No recurring charges
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                    <a href="/register" style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      background: "var(--gold)", color: "#ffffff",
                      fontSize: 14, fontWeight: 600,
                      padding: "13px 24px", borderRadius: 4, textDecoration: "none",
                      letterSpacing: "0.25px", boxShadow: "0 2px 10px rgba(180,83,9,0.35)",
                    }}>
                      Engage the Full System — $49 →
                    </a>
                    <div style={{ fontSize: 11, color: "#475569" }}>Engagement fee: $49 one-time</div>
                  </div>
                </div>

              </div>
            </div>

            {/* Re-run */}
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <button
                onClick={() => { setAuditResults(null); setAuditInputs({ debt: "", apr: "", income: "" }); }}
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

      {/* ── TESTIMONIALS ── */}
      <section style={{ background: "var(--surface-sunk)", borderTop: "0.5px solid var(--line)", borderBottom: "0.5px solid var(--line)" }}>
        <div style={{ padding: "5rem 2rem", maxWidth: 760, margin: "0 auto" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "2px", color: "var(--sage)", marginBottom: "0.75rem", fontWeight: 500 }}>Real people, real progress</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 400, lineHeight: 1.2, maxWidth: 460, marginBottom: "2.75rem", color: "var(--ink)" }}>
            The finish line feels real now.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            {testimonials.map(t => (
              <div key={t.author} style={{ background: "var(--surface)", border: "0.5px solid var(--line)", borderRadius: "var(--r-lg)", padding: "1.5rem" }}>
                <div style={{ color: "var(--gold)", fontSize: 13, marginBottom: "0.75rem" }}>★★★★★</div>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--ink-muted)", fontWeight: 300, margin: "0 0 1rem" }}>&ldquo;{t.quote}&rdquo;</p>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{t.author}</div>
                <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>{t.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section style={{ textAlign: "center", padding: "6rem 2rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(34px, 6vw, 52px)", fontWeight: 400, marginBottom: "1rem", lineHeight: 1.08, letterSpacing: "-1px", color: "var(--ink)" }}>
          Ready to get your<br /><em style={{ color: "var(--sage)" }}>full debt exit plan?</em>
        </h2>
        <p style={{ fontSize: 16, color: "var(--ink-muted)", fontWeight: 300, maxWidth: 440, margin: "0 auto 2.5rem" }}>
          Enter your debts. Set your payment. Watch the math work for you — not against you.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" as const, marginBottom: "1rem" }}>
          <a href="/register" className="btn primary" style={{ fontSize: 15, padding: "14px 28px", borderRadius: "var(--r-pill)", justifyContent: "center" }}>
            Get Full Access — $49 →
          </a>
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>$49 one-time · Lifetime access · No subscription</div>
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
