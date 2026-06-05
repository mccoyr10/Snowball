"use client";

import { useEffect, useState } from "react";
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
  { icon: "🤖", title: "AI financial advisor", desc: "Ask what-if questions and get personalized strategies from your built-in advisor. Available as a paid add-on." },
];

const steps = [
  { n: "1", title: "Enter your debts", desc: "Add each debt — balance, interest rate, minimum payment. Doesn't matter how many. Doesn't matter how big." },
  { n: "2", title: "Set your snowball payment", desc: "Tell it how much you're throwing at debt each month. It figures out the order, the roll, and the payoff timeline automatically." },
  { n: "3", title: "Model \"what if\"", desc: "Add an extra $200. Drop in a lump sum. Change a payment in month 14. Watch every date shift in real time." },
  { n: "4", title: "Check in. Stay focused.", desc: "Come back monthly. Mark progress. Watch the numbers shrink. Keep breathing." },
];

function SignUpForm({ email, setEmail, onSubmit }: {
  email: string;
  setEmail: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, justifyContent: "center" }}>
      <input
        type="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="form-input"
        style={{ flex: "1 1 220px", minWidth: 0, maxWidth: 300 }}
      />
      <button type="submit" className="btn primary" style={{ borderRadius: "var(--r-pill)", whiteSpace: "nowrap" as const }}>
        Sign up now for free →
      </button>
    </form>
  );
}

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = email.trim();
    if (val) {
      fetch("/api/mailerlite/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: val }),
      }).catch(() => {});
    }
    const enc = encodeURIComponent(val);
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

      {/* ── HERO ── */}
      <section style={{ padding: "5rem 2rem 4rem", maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(32px, 5.5vw, 52px)",
          fontWeight: 400, lineHeight: 1.1,
          letterSpacing: "-1.5px", color: "var(--ink)", margin: "0 0 1rem",
        }}>
          Know exactly when you&apos;ll<br />
          <em style={{ color: "var(--sage)" }}>be debt-free.</em>
        </h1>
        <p style={{ fontSize: 17, fontWeight: 300, lineHeight: 1.65, color: "var(--ink-muted)", maxWidth: 480, margin: "0 auto 2rem" }}>
          Exhale Debt gives you a real payoff date for every debt — not a rough estimate. Track your snowball, model what-ifs, and stay focused until it&apos;s done.
        </p>
        <SignUpForm email={email} setEmail={setEmail} onSubmit={handleEmailSubmit} />
        <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 12 }}>
          Free forever · No credit card required
        </div>
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
        <SignUpForm email={email} setEmail={setEmail} onSubmit={handleEmailSubmit} />
        <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: "1rem" }}>Free forever · No credit card required</div>
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
