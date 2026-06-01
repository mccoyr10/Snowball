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

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [auditInputs, setAuditInputs] = useState({ debt: "", apr: "", income: "" });
  const [auditEmail, setAuditEmail] = useState("");
  const [auditResults, setAuditResults] = useState<{
    dailyCost: number;
    annualInterest: number;
    monthlyInterest: number;
    interestRatio: number;
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
    const n = 120;
    const monthlyPayment = monthlyRate > 0
      ? debt * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
      : debt / n;
    const interestRatio = Math.min(Math.round((monthlyInterest / monthlyPayment) * 100), 99);

    setAuditResults({
      dailyCost: annualInterest / 365,
      annualInterest,
      monthlyInterest,
      interestRatio,
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

              {/* Header */}
              <div style={{ padding: "1.75rem 2rem 1.25rem" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                  Here&apos;s what your debt is costing you
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-muted)", fontWeight: 300 }}>
                  Based on ${parseFloat(auditInputs.debt.replace(/,/g, "")).toLocaleString()} at {auditInputs.apr}% APR
                </div>
              </div>

              {/* 3 key numbers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
                {[
                  {
                    value: `$${auditResults.dailyCost.toFixed(2)}`,
                    label: "per day in interest",
                    sub: "While you sleep, eat, work — the meter runs.",
                    color: "var(--danger)",
                  },
                  {
                    value: `$${Math.round(auditResults.annualInterest).toLocaleString()}`,
                    label: "per year to lenders",
                    sub: "Money that could be building your future.",
                    color: "var(--warn)",
                  },
                  {
                    value: `${auditResults.interestRatio}%`,
                    label: "of each payment is interest",
                    sub: auditResults.interestRatio > 50
                      ? "More than half goes to the lender, not your balance."
                      : "The rest actually reduces what you owe.",
                    color: auditResults.interestRatio > 50 ? "var(--danger)" : "var(--ink)",
                  },
                ].map((stat, i) => (
                  <div key={i} style={{ padding: "1.5rem 1.75rem", borderRight: i < 2 ? "1px solid var(--line)" : "none" }}>
                    <div style={{ fontSize: "clamp(26px, 4vw, 34px)", fontWeight: 800, color: stat.color, lineHeight: 1, marginBottom: 4 }}>
                      {stat.value}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", marginBottom: 4 }}>{stat.label}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.5 }}>{stat.sub}</div>
                  </div>
                ))}
              </div>

              {/* Encouragement + CTA */}
              <div style={{ padding: "1.75rem 2rem" }}>
                <p style={{ fontSize: 15, color: "var(--ink-muted)", lineHeight: 1.7, marginBottom: "1.5rem", fontWeight: 300 }}>
                  The good news? <strong style={{ color: "var(--ink)", fontWeight: 600 }}>This is completely fixable.</strong> The debt snowball method gives you a specific payoff date for every debt — not a rough estimate, an actual month and year you can work toward. Thousands of people use it to get out faster than they thought possible.{" "}
                  <strong style={{ color: "var(--sage)", fontWeight: 500 }}>The tracker is free.</strong>
                </p>

                {/* Email capture */}
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
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      const trimmed = auditEmail.trim();
                      // Fire-and-forget — never block the redirect
                      if (trimmed) {
                        fetch("/api/subscribe", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: trimmed }),
                        }).catch(() => {});
                      }
                      const enc = encodeURIComponent(trimmed);
                      window.location.href = enc ? `/register?email=${enc}` : "/register";
                    }}
                    style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}
                  >
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
                onClick={() => { setAuditResults(null); setAuditInputs({ debt: "", apr: "", income: "" }); setAuditEmail(""); }}
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
