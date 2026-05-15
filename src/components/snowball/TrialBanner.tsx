"use client";

import { useState } from "react";
import { getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { getTrialDaysRemaining } from "@/components/PaywallGate";

export default function TrialBanner() {
  const { user, userDoc } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!userDoc || userDoc.subscriptionStatus !== "trialing" || dismissed) return null;

  const daysRemaining = getTrialDaysRemaining(userDoc.trialStartedAt);
  if (daysRemaining > 10) return null; // only show when 10 days or fewer remain

  async function handleSubscribe() {
    if (!user) return;
    setLoading(true);
    try {
      const idToken = await getIdToken(user);
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ email: user.email }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      setLoading(false);
    }
  }

  const urgent = daysRemaining <= 3;

  return (
    <div className={`${urgent ? "bg-orange-50 border-orange-200" : "bg-blue-50 border-blue-100"} border-b px-4 py-2.5 flex items-center justify-between gap-3`}>
      <p className={`text-xs font-medium ${urgent ? "text-orange-700" : "text-blue-700"}`}>
        {daysRemaining === 0
          ? "Your free trial ends today."
          : `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} left in your free trial.`}
        {" "}Subscribe to keep your plan.
      </p>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${urgent ? "bg-orange-600 hover:bg-orange-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"} disabled:opacity-50`}
        >
          {loading ? "…" : "Subscribe"}
        </button>
        <button onClick={() => setDismissed(true)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
      </div>
    </div>
  );
}
