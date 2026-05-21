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

export function isAccessAllowed(
  status: SubscriptionStatus | undefined,
  trialStartedAt: Timestamp | undefined,
  lifetimeAccess?: boolean,
  extendedTrialEndsAt?: Timestamp
): boolean {
  if (lifetimeAccess) return true;
  if (!status) return true;
  if (status === "active") return true;
  if (status === "trialing") return getTrialDaysRemaining(trialStartedAt) > 0;
  if (extendedTrialEndsAt) return extendedTrialEndsAt.toDate() > new Date();
  return false;
}

export default function PaywallGate({ children }: { children: React.ReactNode }) {
  const { user, userDoc, refreshUserDoc } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");
  const searchParams = useSearchParams();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (processing && isAccessAllowed(userDoc?.subscriptionStatus, userDoc?.trialStartedAt, userDoc?.lifetimeAccess, userDoc?.extendedTrialEndsAt)) {
      if (pollRef.current) clearInterval(pollRef.current);
      setProcessing(false);
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [userDoc, processing]);

  async function handleRedeemPromo() {
    if (!user || !promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError("");
    setPromoSuccess("");
    try {
      const idToken = await getIdToken(user);
      const res = await fetch("/api/discount/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ code: promoCode.trim() }),
      });
      const data = await res.json() as { error?: string; type?: string };
      if (!res.ok) throw new Error(data.error || "Invalid code.");
      setPromoSuccess(data.type === "lifetime" ? "Lifetime access granted!" : "Extended access granted!");
      await refreshUserDoc();
    } catch (e) {
      setPromoError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPromoLoading(false);
    }
  }

  if (!userDoc) return <>{children}</>;

  const allowed = isAccessAllowed(userDoc.subscriptionStatus, userDoc.trialStartedAt, userDoc.lifetimeAccess, userDoc.extendedTrialEndsAt);
  if (allowed) return <>{children}</>;

  if (processing) {
    return (
      <div className="paywall-wrap">
        <div className="paywall-card">
          <div style={{ fontSize: 48, marginBottom: 16 }}>❄️</div>
          <h2 style={{
            fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400,
            color: "var(--ink)", margin: "0 0 12px",
          }}>
            Activating your subscription…
          </h2>
          <p style={{ color: "var(--ink-muted)", fontSize: 14 }}>
            This usually takes just a moment. Please wait.
          </p>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
            <div style={{
              width: 32, height: 32,
              border: "3px solid var(--info)",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }} />
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error || "Could not start checkout.");
      }
      const { url } = await res.json() as { url: string };
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  }

  const isIncomplete = userDoc.subscriptionStatus === "incomplete";
  const daysRemaining = getTrialDaysRemaining(userDoc.trialStartedAt);
  const isExpired = userDoc.subscriptionStatus === "past_due" ||
    userDoc.subscriptionStatus === "canceled" ||
    (userDoc.subscriptionStatus === "trialing" && daysRemaining === 0);

  const features = [
    "Full snowball & schedule planner",
    "Track actual payments vs. plan",
    "What-If scenario planner",
    "AI financial advisor",
    "Household sharing with partner",
  ];

  return (
    <div className="paywall-wrap">
      <div className="paywall-card">
        {/* Brand mark */}
        <div style={{
          width: 56, height: 56,
          borderRadius: 14,
          background: "linear-gradient(135deg, var(--info) 0%, #4a7cc8 100%)",
          display: "grid", placeItems: "center",
          margin: "0 auto 20px",
          color: "#fff",
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/>
            <line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/>
            <circle cx="12" cy="12" r="2"/>
          </svg>
        </div>

        <h2 style={{
          fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 400,
          color: "var(--ink)", margin: "0 0 8px",
        }}>
          {isIncomplete ? "Complete your setup" : isExpired ? "Your trial has ended" : "Subscribe to continue"}
        </h2>
        <p style={{ color: "var(--ink-muted)", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
          {isIncomplete
            ? "Start your 14-day free trial. A card is required — cancel any time before it ends and you won't be charged."
            : isExpired
            ? "Your free trial is over. Subscribe to keep tracking your debt payoff progress."
            : "You've been using Snowball during your trial. Subscribe to keep full access."}
        </p>

        <div className="paywall-features">
          {features.map(f => (
            <div key={f} style={{
              display: "flex", alignItems: "center", gap: 10,
              fontSize: 13.5, color: "var(--ink-2)", padding: "5px 0",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--sage)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
              {f}
            </div>
          ))}
        </div>

        <div style={{ margin: "20px 0" }}>
          <div style={{
            fontSize: 32, fontWeight: 700, color: "var(--ink)",
            fontVariantNumeric: "tabular-nums",
          }}>
            $4.99
            <span style={{ fontSize: 16, fontWeight: 400, color: "var(--ink-muted)" }}>/month</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 4 }}>
            14-day free trial, then $4.99/month. Card required. Cancel any time.
          </div>
        </div>

        {error && (
          <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{error}</p>
        )}

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="btn primary"
          style={{
            width: "100%", justifyContent: "center",
            padding: "14px 20px", fontSize: 15,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading
            ? "Redirecting to checkout…"
            : isIncomplete
            ? "Start free trial →"
            : "Subscribe now →"}
        </button>
        <p style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 12 }}>
          Secure payment via Stripe
        </p>

        <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <button
            onClick={() => { setPromoOpen(o => !o); setPromoError(""); setPromoSuccess(""); }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 13, color: "var(--ink-muted)", padding: 0,
              textDecoration: "underline",
            }}
          >
            {promoOpen ? "Hide" : "Have a promo code?"}
          </button>

          {promoOpen && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && handleRedeemPromo()}
                  placeholder="ENTER CODE"
                  style={{
                    flex: 1, padding: "10px 12px", borderRadius: 8,
                    border: "1px solid var(--border)", fontSize: 13,
                    fontFamily: "monospace", letterSpacing: 1,
                    background: "var(--surface)", color: "var(--ink)",
                  }}
                />
                <button
                  onClick={handleRedeemPromo}
                  disabled={promoLoading || !promoCode.trim()}
                  className="btn primary"
                  style={{ padding: "10px 16px", fontSize: 13, opacity: promoLoading ? 0.6 : 1 }}
                >
                  {promoLoading ? "…" : "Apply"}
                </button>
              </div>
              {promoError && <p style={{ fontSize: 12, color: "var(--danger)", margin: 0 }}>{promoError}</p>}
              {promoSuccess && <p style={{ fontSize: 12, color: "var(--sage)", margin: 0 }}>{promoSuccess}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
