"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useDebts } from "@/hooks/useDebts";
import { useStrategy } from "@/hooks/useStrategy";
import { usePayments } from "@/hooks/usePayments";
import {
  addDebt, updateDebt, deleteDebt,
  setStrategy, addPayment, updatePayment, deletePayment,
} from "@/lib/firestore";
import {
  buildSnowballSchedule, computeActualAdjustedDebts, calculateSummary,
  allocatePaymentsToDebts, todayYYYYMM,
  type UIDebt, type UISettings,
} from "@/lib/snowball";
import type { Debt } from "@/types";

import NavBar from "@/components/snowball/NavBar";
import Modal from "@/components/snowball/Modal";
import ConfirmModal from "@/components/snowball/ConfirmModal";
import Toast, { type ToastItem } from "@/components/snowball/Toast";
import DebtForm from "@/components/snowball/DebtForm";
import DashboardTab from "@/components/snowball/DashboardTab";
import DebtList from "@/components/snowball/DebtList";
import PayoffSchedule from "@/components/snowball/PayoffSchedule";
import ActualPayments from "@/components/snowball/ActualPayments";
import ChatPanel from "@/components/snowball/ChatPanel";
import OnboardingModal, { shouldShowOnboarding } from "@/components/snowball/OnboardingModal";
import HouseholdModal from "@/components/snowball/HouseholdModal";
import { isAccessAllowed } from "@/components/PaywallGate";
import TrialBanner from "@/components/snowball/TrialBanner";
import MigrationBanner from "@/components/snowball/MigrationBanner";

function toUIDebt(d: Debt): UIDebt {
  return {
    id: d.id,
    name: d.name,
    balance: d.balance,
    apr: d.interestRate,
    minPayment: d.minimumPayment,
    startingBalance: d.startingBalance,
  };
}

// ── Advisor paywall panel (shown when user hasn't purchased advisor access) ──
function AdvisorPaywall() {
  const { user, refreshUserDoc } = useAuth();
  const [loading, setLoading] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");

  async function handleUnlock() {
    if (!user || loading) return;
    setLoading(true);
    try {
      const idToken = await getIdToken(user);
      const res = await fetch("/api/stripe/create-advisor-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ email: user.email ?? "" }),
      });
      if (!res.ok) throw new Error("Checkout unavailable.");
      const { url } = await res.json() as { url: string };
      window.location.href = url;
    } catch {
      setLoading(false);
    }
  }

  async function handleRedeemPromo() {
    if (!user || !promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError("");
    setPromoSuccess("");
    try {
      const idToken = await getIdToken(user);
      const res = await fetch("/api/discount/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ code: promoCode.trim() }),
      });
      const data = await res.json() as { error?: string; type?: string };
      if (!res.ok) throw new Error(data.error || "Invalid code.");
      setPromoSuccess(data.type === "lifetime" ? "Advisor unlocked!" : "Access granted!");
      await refreshUserDoc();
    } catch (e) {
      setPromoError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPromoLoading(false);
    }
  }

  return (
    <div>
      <div className="greeting">
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Exhale Advisor</div>
          <h1>Your <span className="h1-italic">advisor.</span></h1>
          <p>Personalized AI guidance based on your actual debt plan.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 440, margin: "0 auto 24px" }}>
        {/* Header */}
        <div className="card-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "var(--surface-sunk)", border: "1px solid var(--line)",
              display: "grid", placeItems: "center", flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>Exhale Advisor</div>
              <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>Unlock for lifetime access</div>
            </div>
          </div>
        </div>

        {/* Feature list */}
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "0.5px solid var(--line)" }}>
          {[
            "Personalized analysis of your specific debt plan",
            "What-if scenarios using your real balances and dates",
            "Proactive insights when your data changes",
            "Ask anything — strategy, refinancing, priorities",
          ].map(f => (
            <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
              <span style={{ color: "var(--sage)", marginTop: 1, flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.5 }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Price + CTA */}
        <div style={{ padding: "1.25rem 1.5rem" }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.5px" }}>
              $49
              <span style={{ fontSize: 13, fontWeight: 400, color: "var(--ink-muted)", marginLeft: 6 }}>
                one-time payment
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 2 }}>
              Lifetime access · No subscription · No renewals
            </div>
          </div>

          <button
            onClick={handleUnlock}
            disabled={loading}
            className="btn primary"
            style={{ width: "100%", justifyContent: "center", fontSize: 14, padding: "12px 20px", borderRadius: "var(--r-pill)" }}
          >
            {loading ? "Redirecting…" : "Unlock Exhale Advisor — $49 →"}
          </button>

          {/* Promo code */}
          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => setPromoOpen(p => !p)}
              style={{ background: "none", border: "none", fontSize: 12, color: "var(--info)", cursor: "pointer", padding: 0, fontFamily: "var(--font-ui)" }}
            >
              {promoOpen ? "▾" : "▸"} Have a promo code?
            </button>
            {promoOpen && (
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="Enter code"
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value)}
                  className="form-input"
                  style={{ flex: 1, fontSize: 13 }}
                />
                <button
                  onClick={handleRedeemPromo}
                  disabled={promoLoading || !promoCode.trim()}
                  className="btn"
                  style={{ fontSize: 13, flexShrink: 0 }}
                >
                  {promoLoading ? "…" : "Apply"}
                </button>
              </div>
            )}
            {promoError && (
              <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 6, margin: "6px 0 0" }}>{promoError}</p>
            )}
            {promoSuccess && (
              <p style={{ fontSize: 12, color: "var(--sage)", marginTop: 6, margin: "6px 0 0" }}>{promoSuccess}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ──────────────────────────────────────────────────────────────────────────── ──

const STRATEGY_DEBOUNCE_MS = 800;
let toastCounter = 0;

export default function SnowballApp() {
  const { user, userDoc, signOut, refreshUserDoc } = useAuth();
  const householdId = userDoc?.householdId ?? null;

  const { debts: firestoreDebts, loading: debtsLoading } = useDebts(householdId);
  const { strategy, loading: strategyLoading } = useStrategy(householdId);
  const { payments, loading: paymentsLoading } = usePayments(householdId);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<UIDebt | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHousehold, setShowHousehold] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [upsellDismissed, setUpsellDismissed] = useState(() => {
    try { return sessionStorage.getItem("advisor_upsell_dismissed") === "1"; } catch { return false; }
  });

  const [settings, setSettingsLocal] = useState<UISettings>({
    monthlyBudget: 0,
    startDate: todayYYYYMM(),
  });

  const strategyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for advisor activation after returning from Stripe checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("subscribed") !== "true") return;
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
    if (processing && userDoc?.lifetimeAccess) {
      if (pollRef.current) clearInterval(pollRef.current);
      setProcessing(false);
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [userDoc, processing]);

  function addToast(message: string, type: ToastItem["type"] = "success") {
    const id = String(++toastCounter);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }

  useEffect(() => {
    if (!strategyLoading && strategy) {
      setSettingsLocal({
        monthlyBudget: strategy.monthlyBudget,
        startDate: strategy.startDate,
      });
    }
  }, [strategyLoading, strategy]);

  const saveSettings = useCallback(
    (newSettings: UISettings) => {
      if (!householdId) return;
      if (strategyDebounceRef.current) clearTimeout(strategyDebounceRef.current);
      strategyDebounceRef.current = setTimeout(async () => {
        if (savingRef.current) return;
        savingRef.current = true;
        setSaveStatus("saving");
        try {
          await setStrategy(householdId, {
            monthlyBudget: Number(newSettings.monthlyBudget),
            method: "snowball",
            startDate: newSettings.startDate,
          });
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } catch {
          setSaveStatus("error");
        } finally {
          savingRef.current = false;
        }
      }, STRATEGY_DEBOUNCE_MS);
    },
    [householdId]
  );

  function handleSetSettings(update: UISettings | ((prev: UISettings) => UISettings)) {
    setSettingsLocal(prev => {
      const next = typeof update === "function" ? update(prev) : update;
      saveSettings(next);
      return next;
    });
  }

  const loading = debtsLoading || strategyLoading || paymentsLoading;

  useEffect(() => {
    if (householdId && !loading && firestoreDebts.length === 0 && shouldShowOnboarding()) {
      setShowOnboarding(true);
    }
  }, [householdId, loading, firestoreDebts.length]);

  const debts = firestoreDebts.map(toUIDebt);
  const prelimSchedule = buildSnowballSchedule(debts, settings);
  const allocatedActuals = allocatePaymentsToDebts(payments, prelimSchedule, debts);
  const { adjustedDebts } = computeActualAdjustedDebts(debts, prelimSchedule, allocatedActuals);
  const schedule = buildSnowballSchedule(adjustedDebts, settings);
  const summary = calculateSummary(adjustedDebts, schedule, settings);

  async function handleSaveDebt(debt: UIDebt) {
    if (!householdId) return;
    setSaveStatus("saving");
    try {
      const firestoreData = {
        name: debt.name,
        balance: debt.balance,
        interestRate: debt.apr,
        minimumPayment: debt.minPayment,
        startingBalance: debt.startingBalance ?? debt.balance,
      };
      if (editingDebt) {
        await updateDebt(householdId, debt.id, firestoreData);
        addToast("Debt updated");
      } else {
        await addDebt(householdId, firestoreData);
        addToast("Debt added");
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
      addToast("Failed to save — please try again", "error");
    }
    setModalOpen(false);
    setEditingDebt(null);
  }

  async function handleDeleteDebt(id: string) {
    setPendingDeleteId(id);
  }

  async function confirmDelete() {
    if (!householdId || !pendingDeleteId) return;
    setPendingDeleteId(null);
    setSaveStatus("saving");
    try {
      await deleteDebt(householdId, pendingDeleteId);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      addToast("Debt deleted");
    } catch {
      setSaveStatus("error");
      addToast("Failed to delete — please try again", "error");
    }
  }

  async function handleAddPayment(month: string, amount: number) {
    if (!householdId || amount <= 0) return;
    try {
      await addPayment(householdId, month, amount);
    } catch {
      addToast("Failed to save payment", "error");
    }
  }

  async function handleUpdatePayment(id: string, amount: number) {
    if (!householdId) return;
    try {
      await updatePayment(householdId, id, amount);
    } catch {
      addToast("Failed to update payment", "error");
    }
  }

  async function handleDeletePayment(id: string) {
    if (!householdId) return;
    try {
      await deletePayment(householdId, id);
    } catch {
      addToast("Failed to delete payment", "error");
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-inner">
          <span className="loading-icon">🌬️</span>
          <p className="loading-text">Loading your plan…</p>
        </div>
      </div>
    );
  }

  const displayName = userDoc?.displayName || user?.email || "";
  const pendingDebtName = pendingDeleteId ? (debts.find(d => d.id === pendingDeleteId)?.name ?? "this debt") : "";

  // Advisor is the only gated feature — check lifetimeAccess
  const advisorUnlocked = isAccessAllowed(
    userDoc?.subscriptionStatus,
    userDoc?.trialStartedAt,
    userDoc?.lifetimeAccess,
    userDoc?.extendedTrialEndsAt,
  );

  const tabs: Record<string, React.ReactNode> = {
    dashboard: <DashboardTab debts={adjustedDebts} settings={settings} summary={summary} schedule={schedule} setActiveTab={setActiveTab} />,
    debts: (
      <DebtList
        debts={debts}
        settings={settings}
        setSettings={handleSetSettings}
        summary={summary}
        schedule={schedule}
        onAdd={() => { setEditingDebt(null); setModalOpen(true); }}
        onEdit={d => { setEditingDebt(d); setModalOpen(true); }}
        onDelete={handleDeleteDebt}
      />
    ),
    schedule: <PayoffSchedule debts={adjustedDebts} schedule={schedule} onGoToDebts={() => setActiveTab("debts")} />,
    actuals: (
      <ActualPayments
        debts={debts}
        schedule={prelimSchedule}
        payments={payments}
        allocatedActuals={allocatedActuals}
        onAddPayment={handleAddPayment}
        onUpdatePayment={handleUpdatePayment}
        onDeletePayment={handleDeletePayment}
        onGoToDebts={() => setActiveTab("debts")}
        planStartDate={settings.startDate}
      />
    ),
    advisor: advisorUnlocked
      ? <ChatPanel debts={adjustedDebts} settings={settings} summary={summary} />
      : <AdvisorPaywall />,
  };

  return (
    <>
      {/* Activation overlay — shown while polling after Stripe checkout return */}
      {processing && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(246,248,250,0.92)",
          backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🌬️</div>
            <p style={{ fontSize: 15, color: "var(--ink-muted)", fontWeight: 500 }}>
              Activating your advisor…
            </p>
          </div>
        </div>
      )}

      <div className="app">
        <NavBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          saveStatus={saveStatus}
          displayName={displayName}
          onSignOut={signOut}
          onOpenHousehold={() => setShowHousehold(true)}
        />

        <div className="main">
          <TrialBanner />
          {debts.length > 0 && debts.some(d => !d.startingBalance || d.startingBalance === d.balance) && (
            <MigrationBanner onGoToDebts={() => setActiveTab("debts")} />
          )}
          {/* Advisor upsell — shown on free tabs when advisor not unlocked */}
          {!advisorUnlocked && !upsellDismissed && activeTab !== "advisor" && (
            <div style={{
              background: "var(--info-soft)",
              borderBottom: "0.5px solid #bfdbfe",
              padding: "10px 20px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 12, flexWrap: "wrap" as const,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>🤖</span>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
                    Want personalized guidance?
                  </span>{" "}
                  <span style={{ fontSize: 13, color: "var(--ink-muted)" }}>
                    Unlock Exhale Advisor — AI analysis of your actual plan — for $49, one-time.
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => setActiveTab("advisor")}
                  className="btn primary"
                  style={{ fontSize: 12, padding: "7px 14px", borderRadius: "var(--r-pill)" }}
                >
                  Learn more →
                </button>
                <button
                  onClick={() => {
                    setUpsellDismissed(true);
                    try { sessionStorage.setItem("advisor_upsell_dismissed", "1"); } catch { /* ignore */ }
                  }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--ink-faint)", lineHeight: 1, padding: 4 }}
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
            </div>
          )}
          <div className="main-inner">
            {tabs[activeTab] ?? tabs["dashboard"]}
          </div>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingDebt(null); }}
        title={editingDebt ? "Edit Debt" : "Add Debt"}
      >
        <DebtForm
          initial={editingDebt}
          onSave={handleSaveDebt}
          onClose={() => { setModalOpen(false); setEditingDebt(null); }}
        />
      </Modal>

      <ConfirmModal
        open={!!pendingDeleteId}
        title="Delete debt?"
        message={`Remove "${pendingDebtName}" from your plan? This can't be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />

      <Toast toasts={toasts} onDismiss={id => setToasts(prev => prev.filter(t => t.id !== id))} />

      {showOnboarding && (
        <OnboardingModal
          onComplete={() => { setShowOnboarding(false); setActiveTab("debts"); }}
          onNavigate={setActiveTab}
        />
      )}

      {showHousehold && (
        <HouseholdModal onClose={() => setShowHousehold(false)} />
      )}
    </>
  );
}
