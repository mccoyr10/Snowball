"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "snowball_onboarding_v1";

const STEPS = [
  {
    icon: "🌬️",
    title: "Welcome to Exhale Debt",
    body: "Your personal debt payoff planner. We'll help you get out of debt faster using the snowball method — attacking the smallest balance first so you build momentum along the way.",
    tip: null,
  },
  {
    icon: "💳",
    title: "Add your debts",
    body: "Go to the Debts tab and add each debt you want to pay off. You'll need three things for each one:",
    tip: "Balance · Annual interest rate (APR) · Minimum monthly payment",
  },
  {
    icon: "💰",
    title: "Set your monthly budget",
    body: "At the top of the Debts tab, enter how much you can put toward debt each month. This should be at least your total minimum payments — anything extra accelerates your payoff.",
    tip: "Even $50–$100 extra per month can save thousands in interest.",
  },
  {
    icon: "🎯",
    title: "How snowball works",
    body: "We sort your debts smallest balance first. Every month you pay minimums on all debts, then throw every extra dollar at the target (smallest) debt. Once it's paid off, that payment rolls into the next one.",
    tip: "This builds psychological momentum and keeps you motivated.",
  },
  {
    icon: "✏️",
    title: "Track your actual payments",
    body: "Each month, visit the Actuals tab to log what you actually paid on each debt. We'll adjust your future projections automatically so your schedule stays accurate.",
    tip: null,
  },
  {
    icon: "🔮",
    title: "Run what-if scenarios",
    body: "On the Dashboard, the What-If Planner lets you see how an extra payment or a lump sum would change your payoff date and total interest — before you commit.",
    tip: null,
  },
];

interface OnboardingModalProps {
  onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0);

  function finish() {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    onComplete();
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={finish} />
      <div
        className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md z-10 overflow-hidden"
        style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
      >
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-1 bg-blue-500 transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="px-6 pt-8 pb-4">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-medium text-gray-400">{step + 1} of {STEPS.length}</span>
            <button onClick={finish} className="text-xs text-gray-400 hover:text-gray-600">Skip</button>
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-5">{current.icon}</div>
            <h2 className="text-xl font-bold text-gray-800 mb-3">{current.title}</h2>
            <p className="text-sm text-gray-500 leading-relaxed">{current.body}</p>
            {current.tip && (
              <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <p className="text-xs text-blue-700 font-medium">{current.tip}</p>
              </div>
            )}
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-2 mb-6">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === step ? "bg-blue-500 w-5" : "bg-gray-200"}`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl py-3.5 text-sm font-medium"
              >
                Back
              </button>
            )}
            <button
              onClick={() => isLast ? finish() : setStep(s => s + 1)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3.5 text-sm font-semibold"
            >
              {isLast ? "Get Started →" : "Next"}
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
