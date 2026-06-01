"use client";

import { useState } from "react";

const STORAGE_KEY = "exhale_onboarding_v1";

function IOSIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
      <polyline points="16 6 12 2 8 6"/>
      <line x1="12" y1="2" x2="12" y2="15"/>
    </svg>
  );
}

const STEPS = [
  {
    icon: "🌬️",
    title: "Welcome to Exhale Debt",
    body: "Your personal debt payoff planner. We'll help you get out of debt faster using the snowball method — attacking the smallest balance first so you build momentum along the way.",
    tip: null,
    navigateTo: null,
  },
  {
    icon: "💳",
    title: "Add your debts",
    body: "We've taken you to the Debts tab. Add each debt you want to pay off — you'll need three things for each one:",
    tip: "Balance · Annual interest rate (APR) · Minimum monthly payment",
    navigateTo: "debts",
  },
  {
    icon: "💰",
    title: "Set your monthly budget",
    body: "At the top of this tab, enter how much you can put toward debt each month. This should be at least your total minimum payments — anything extra accelerates your payoff.",
    tip: "Even $50–$100 extra per month can save thousands in interest.",
    navigateTo: "debts",
  },
  {
    icon: "🎯",
    title: "How snowball works",
    body: "We sort your debts smallest balance first. Every month you pay minimums on all debts, then throw every extra dollar at the target (smallest) debt. Once it's paid off, that payment rolls into the next one.",
    tip: "This builds psychological momentum and keeps you motivated.",
    navigateTo: null,
  },
  {
    icon: "✏️",
    title: "Track your actual payments",
    body: "We've navigated you to the Actuals tab. Each month, log what you actually paid here and we'll adjust your future projections automatically so your schedule stays accurate.",
    tip: null,
    navigateTo: "actuals",
  },
  {
    icon: "📱",
    title: "Save to your home screen",
    body: "Add Exhale Debt to your home screen for one-tap access — it works just like a native app.",
    tip: null,
    navigateTo: null,
    isHomeScreen: true,
  },
];

interface OnboardingModalProps {
  onComplete: () => void;
  onNavigate?: (tab: string) => void;
}

export default function OnboardingModal({ onComplete, onNavigate }: OnboardingModalProps) {
  const [step, setStep] = useState(0);

  function finish() {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    onComplete();
  }

  function goToStep(next: number) {
    const target = STEPS[next];
    if (target?.navigateTo && onNavigate) onNavigate(target.navigateTo);
    setStep(next);
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={finish} />
      <div style={{
        position: "relative", zIndex: 10,
        background: "var(--surface)",
        borderRadius: "var(--r-xl) var(--r-xl) 0 0",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
        width: "100%",
        maxWidth: 480,
        overflow: "hidden",
        paddingBottom: "max(24px, env(safe-area-inset-bottom))",
      }}>
        {/* Progress bar */}
        <div style={{ height: 3, background: "var(--surface-sunk)" }}>
          <div style={{
            height: 3, background: "var(--info)",
            width: `${((step + 1) / STEPS.length) * 100}%`,
            transition: "width 0.3s ease",
          }} />
        </div>

        <div style={{ padding: "28px 24px 20px" }}>
          {/* Step counter + skip */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <span style={{ fontSize: 12, color: "var(--ink-faint)", fontWeight: 500 }}>
              {step + 1} of {STEPS.length}
            </span>
            <button
              onClick={finish}
              style={{ fontSize: 12, color: "var(--ink-faint)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}
            >
              Skip
            </button>
          </div>

          {/* Content */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 56, marginBottom: 18, lineHeight: 1 }}>{current.icon}</div>
            <h2 style={{
              fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 400,
              color: "var(--ink)", margin: "0 0 10px",
            }}>
              {current.title}
            </h2>
            <p style={{ fontSize: 14, color: "var(--ink-muted)", lineHeight: 1.6, margin: 0 }}>
              {current.body}
            </p>
            {current.tip && (
              <div style={{
                marginTop: 14,
                background: "var(--info-soft)", border: "1px solid var(--line)",
                borderRadius: "var(--r-md)", padding: "10px 14px",
              }}>
                <p style={{ fontSize: 12.5, color: "var(--info)", fontWeight: 500, margin: 0 }}>{current.tip}</p>
              </div>
            )}

            {/* Home screen instructions */}
            {current.isHomeScreen && (
              <div style={{ marginTop: 14, textAlign: "left" }}>
                {/* iOS */}
                <div style={{
                  background: "var(--surface-sunk)", borderRadius: "var(--r-md)",
                  padding: "12px 14px", marginBottom: 10,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    iPhone / iPad (Safari)
                  </div>
                  <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.8 }}>
                    <li>Tap the <strong style={{ color: "var(--info)" }}>Share</strong> button <span style={{ display: "inline-flex", verticalAlign: "middle", marginLeft: 2 }}><IOSIcon /></span> at the bottom of Safari</li>
                    <li>Scroll down and tap <strong style={{ color: "var(--ink)" }}>Add to Home Screen</strong></li>
                    <li>Tap <strong style={{ color: "var(--ink)" }}>Add</strong> to confirm</li>
                  </ol>
                </div>
                {/* Android */}
                <div style={{
                  background: "var(--surface-sunk)", borderRadius: "var(--r-md)",
                  padding: "12px 14px",
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Android (Chrome)
                  </div>
                  <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.8 }}>
                    <li>Tap the <strong style={{ color: "var(--ink)" }}>⋮ menu</strong> in the top-right corner</li>
                    <li>Tap <strong style={{ color: "var(--ink)" }}>Add to Home screen</strong></li>
                    <li>Tap <strong style={{ color: "var(--ink)" }}>Add</strong> to confirm</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          {/* Step dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 20 }}>
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => goToStep(i)}
                style={{
                  width: i === step ? 20 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === step ? "var(--info)" : "var(--surface-sunk)",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  transition: "all 0.2s",
                }}
              />
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: "flex", gap: 10 }}>
            {step > 0 && (
              <button
                onClick={() => goToStep(step - 1)}
                className="btn"
                style={{ flex: 1, justifyContent: "center" }}
              >
                Back
              </button>
            )}
            <button
              onClick={() => isLast ? finish() : goToStep(step + 1)}
              className="btn primary"
              style={{ flex: 1, justifyContent: "center" }}
            >
              {isLast ? "Get started →" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function shouldShowOnboarding(): boolean {
  try {
    return !localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}
