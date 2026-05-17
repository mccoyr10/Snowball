"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { getIdToken } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";
import type { SubscriptionStatus } from "@/types";
import { Timestamp } from "firebase/firestore";

const TRIAL_DAYS = 14;

export function getTrialDaysRemaining(trialStartedAt: Timestamp | undefined): number {
  if (!trialStartedAt) return TRIAL_DAYS;
  const start = trialStartedAt.toDate().getTime();
  const elapsed = (Date.now() - start) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(TRIAL_DAYS - elapsed));
}

export function isAccessAllowed(status: SubscriptionStatus | undefined, trialStartedAt: Timestamp | undefined): boolean {
  if (!status) return true; // grandfathered user
  if (status === "active") return true;
  if (status === "trialing") return getTrialDaysRemaining(trialStartedAt) > 0;
  return false; // incomplete, past_due, canceled
}

export default function PaywallGate({ children }: { children: React.ReactNode }) {
  const { user, userDoc, refreshUserDoc } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const searchParams = useSearchParams();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // When Stripe redirects back with ?subscribed=true, poll until status updates
  useEffect(() => {
    if (searchParams.get("subscribed") !== "true") return;
    setProcessing(true);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      await refreshUserDoc();
      if (attempts >= 15) {
        clearInterval(pollRef.current!);
        setProcessing(false);
      }
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Stop polling once access is granted
  useEffect(() => {
    if (processing && isAccessAllowed(userDoc?.subscriptionStatus, userDoc?.trialStartedAt)) {
      if (pollRef.current) clearInterval(pollRef.current);
      setProcessing(false);
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [userDoc, processing]);

  if (!userDoc) return <>{children}</>;

  const allowed = isAccessAllowed(userDoc.subscriptionStatus, userDoc.trialStartedAt);
  if (allowed) return <>{children}</>;

  if (processing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 max-w-md w-full text-center space-y-6">
          <div className="text-5xl">❄️</div>
          <h2 className="text-2xl font-bold text-gray-800">Activating your subscription…</h2>
          <p className="text-gray-500 text-sm">This usually takes just a moment. Please wait.</p>
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  async function handleSubscribe() {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const idToken = await getIdToken(user);
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ email: user.email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not start checkout.");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  }

  const isIncomplete = userDoc.subscriptionStatus === "incomplete";
  const daysRemaining = getTrialDaysRemaining(userDoc.trialStartedAt);
  const isExpired = userDoc.subscriptionStatus === "past_due" || userDoc.subscriptionStatus === "canceled" || (userDoc.subscriptionStatus === "trialing" && daysRemaining === 0);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 max-w-md w-full text-center space-y-6">
        <div className="text-5xl">❄️</div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {isIncomplete ? "Complete your setup" : isExpired ? "Your trial has ended" : "Subscribe to continue"}
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            {isIncomplete
              ? "Start your 14-day free trial to access Snowball. Cancel any time."
              : isExpired
              ? "Your free trial is over. Subscribe to keep tracking your debt payoff progress."
              : "You've been using Snowball during your trial. Subscribe to keep full access."}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-left space-y-2">
          {["Full snowball & schedule planner", "Track actual payments vs. plan", "What-If scenario planner", "AI financial advisor", "Household sharing with partner"].map(f => (
            <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-green-500 font-bold">✓</span> {f}
            </div>
          ))}
        </div>

        <div>
          <p className="text-3xl font-bold text-gray-800 mb-1">$4.99<span className="text-base font-normal text-gray-400">/month</span></p>
          <p className="text-xs text-gray-400">14 days free, then $4.99/month. Cancel any time.</p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-4 font-semibold text-base"
        >
          {loading ? "Redirecting to checkout…" : isIncomplete ? "Start free trial →" : "Subscribe now →"}
        </button>
        <p className="text-xs text-gray-400">Secure payment via Stripe</p>
      </div>
    </div>
  );
}
