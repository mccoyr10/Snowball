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
  if (daysRemaining > 10) return null;

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
      const { url } = await res.json() as { url?: string };
      if (url) window.location.href = url;
    } catch {
      setLoading(false);
    }
  }

  const urgent = daysRemaining <= 3;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: "10px 20px",
      background: urgent ? "var(--warn-soft)" : "var(--sage-soft)",
      border: `1px solid ${urgent ? "var(--warn-soft)" : "var(--sage-soft)"}`,
      borderRadius: "var(--r-md)",
      marginBottom: 20,
      fontSize: 13,
      color: urgent ? "var(--warn)" : "var(--sage-deep)",
    }}>
      <span style={{ fontWeight: 500 }}>
        {daysRemaining === 0
          ? "Your free trial ends today."
          : `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} left in your free trial.`}
        {" "}Subscribe to keep your plan.
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="btn primary"
          style={{
            padding: "5px 14px",
            fontSize: 12.5,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "…" : "Subscribe"}
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--ink-faint)", fontSize: 18, lineHeight: 1,
          }}
        >
          &times;
        </button>
      </div>
    </div>
  );
}
