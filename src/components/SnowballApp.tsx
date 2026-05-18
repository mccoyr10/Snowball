"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDebts } from "@/hooks/useDebts";
import { useStrategy } from "@/hooks/useStrategy";
import { useActuals } from "@/hooks/useActuals";
import {
  addDebt, updateDebt, deleteDebt,
  setStrategy, setActual, deleteActual,
} from "@/lib/firestore";
import {
  buildSnowballSchedule, computeActualAdjustedDebts, calculateSummary,
  todayYYYYMM,
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
import PaywallGate from "@/components/PaywallGate";
import TrialBanner from "@/components/snowball/TrialBanner";

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

const STRATEGY_DEBOUNCE_MS = 800;
let toastCounter = 0;

export default function SnowballApp() {
  const { user, userDoc, signOut } = useAuth();
  const householdId = userDoc?.householdId ?? null;

  const { debts: firestoreDebts, loading: debtsLoading } = useDebts(householdId);
  const { strategy, loading: strategyLoading } = useStrategy(householdId);
  const { actuals, loading: actualsLoading } = useActuals(householdId);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<UIDebt | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHousehold, setShowHousehold] = useState(false);

  const [settings, setSettingsLocal] = useState<UISettings>({
    monthlyBudget: 0,
    startDate: todayYYYYMM(),
  });

  const strategyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  function addToast(message: string, type: ToastItem["type"] = "success") {
    const id = String(++toastCounter);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }

  // Sync strategy from Firestore on first load
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

  const loading = debtsLoading || strategyLoading || actualsLoading;

  // Show onboarding only for genuinely new users: householdId must be loaded
  // (rules out the brief window where useDebts(null) returns empty before auth resolves)
  useEffect(() => {
    if (householdId && !loading && firestoreDebts.length === 0 && shouldShowOnboarding()) {
      setShowOnboarding(true);
    }
  }, [householdId, loading, firestoreDebts.length]);

  const debts = firestoreDebts.map(toUIDebt);
  // Two-pass calculation: build a preliminary schedule so computeActualAdjustedDebts
  // has month-by-month entries to apply interest + scheduled payments against.
  const prelimSchedule = buildSnowballSchedule(debts, settings);
  const { adjustedDebts } = computeActualAdjustedDebts(debts, prelimSchedule, actuals);
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

  async function handleSetActual(month: string, debtId: string, amount: number) {
    if (!householdId) return;
    try {
      if (amount === 0) {
        await deleteActual(householdId, month, debtId);
      } else {
        await setActual(householdId, month, debtId, amount);
      }
    } catch {
      // silent — actuals are best-effort
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
        debts={adjustedDebts}
        schedule={schedule}
        actuals={actuals}
        onSetActual={handleSetActual}
        onGoToDebts={() => setActiveTab("debts")}
      />
    ),
    advisor: <ChatPanel debts={adjustedDebts} settings={settings} summary={summary} />,
  };

  return (
    <PaywallGate>
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
        <OnboardingModal onComplete={() => setShowOnboarding(false)} />
      )}

      {showHousehold && (
        <HouseholdModal onClose={() => setShowHousehold(false)} />
      )}
    </PaywallGate>
  );
}
