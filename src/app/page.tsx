"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function ExhaleLogo() {
  return (
    <svg width="64" height="40" viewBox="0 0 56 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 22 C10 15 14 11 19 11 C19 6 23 3 28 3 C33 3 37 6 37 11 C40 9 44 12 44 16 C44 20 41 22 37 22"
        stroke="#7CB9AD" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"
      />
      <path d="M3 28 C10 23 18 25 25 29 C30 32 36 29 38 25" stroke="#7CB9AD" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M38 25 C40 20 37 16 33 18" stroke="#7CB9AD" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

function FeatureRow({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14, marginBottom: 2 }}>{title}</div>
        <div style={{ color: "var(--ink-muted)", fontSize: 13.5, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

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
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
    }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        {/* Logo mark */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <ExhaleLogo />
        </div>

        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6, marginBottom: 20 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 32, fontWeight: 400, color: "#7CB9AD", letterSpacing: "-0.02em" }}>Exhale</span>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 32, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>Debt</span>
        </div>

        <p style={{ fontSize: 17, color: "var(--ink-muted)", lineHeight: 1.6, marginBottom: 10 }}>
          Pay off your debt faster with the snowball method. Track every balance,
          visualize your payoff timeline, and celebrate every win.
        </p>

        <p style={{ fontSize: 13.5, color: "var(--sage-deep)", fontWeight: 500, marginBottom: 32 }}>
          Start free — no credit card required. 14-day trial, then $4.99/mo.
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
          <a
            href="/register"
            className="btn primary"
            style={{ justifyContent: "center", fontSize: 15, padding: "14px 24px", borderRadius: "var(--r-pill)" }}
          >
            Start your free trial
          </a>
          <a
            href="/login"
            className="btn"
            style={{ justifyContent: "center", fontSize: 15, padding: "14px 24px", borderRadius: "var(--r-pill)" }}
          >
            Sign in
          </a>
        </div>

        {/* Feature highlights */}
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-xl)",
          padding: "24px 20px",
          textAlign: "left",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}>
          <FeatureRow
            icon="❄️"
            title="Debt snowball method"
            desc="Minimums on everything, surplus attacks the smallest balance first — proven to build momentum."
          />
          <FeatureRow
            icon="📊"
            title="Live payoff schedule"
            desc="See exactly when every debt disappears and how much interest you'll save."
          />
          <FeatureRow
            icon="✅"
            title="Track actual payments"
            desc="Log extra payments each month and watch the schedule update in real time."
          />
          <FeatureRow
            icon="🤖"
            title="AI financial advisor"
            desc="Ask what-if questions and get personalized strategies from your built-in advisor."
          />
        </div>

        <p style={{ marginTop: 24, fontSize: 12, color: "var(--ink-faint)" }}>
          By signing up you agree to our{" "}
          <a href="/terms" style={{ color: "var(--ink-muted)", textDecoration: "underline" }}>Terms</a>
          {" "}and{" "}
          <a href="/privacy" style={{ color: "var(--ink-muted)", textDecoration: "underline" }}>Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
