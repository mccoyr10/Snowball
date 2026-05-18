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

// Map Firestore Debt shape → UI shape
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

export default function SnowballApp() {
  const { user, userDoc, signOut } = useAuth();
  const householdId = userDoc?.householdId ?? null;

  const { debts: firestoreDebts, loading: debtsLoading } = useDebts(householdId);
  const { strategy, loading: strategyLoading } = useStrategy(householdId);
  const { actuals, loading: actualsLoading } = useActuals(householdId);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<UIDebt | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHousehold, setShowHousehold] = useState(false);

  const [settings, setSettingsLocal] = useState<UISettings>({
    monthlyBudget: 0,
    startDate: todayYYYYMM(),
  });

  const strategyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

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

  // Show onboarding once for new users who have no debts yet
  useEffect(() => {
    if (!loading && firestoreDebts.length === 0 && shouldShowOnboarding()) {
      setShowOnboarding(true);
    }
  }, [loading, firestoreDebts.length]);

  const debts = firestoreDebts.map(toUIDebt);
  const { adjustedDebts } = computeActualAdjustedDebts(debts, [], actuals);
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
        startingBalance: debt.balance,
      };
      if (editingDebt) {
        await updateDebt(householdId, debt.id, firestoreData);
      } else {
        await addDebt(householdId, firestoreData);
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    }
    setModalOpen(false);
    setEditingDebt(null);
  }

  async function handleDeleteDebt(id: string) {
    if (!householdId) return;
    if (!confirm("Delete this debt?")) return;
    setSaveStatus("saving");
    try {
      await deleteDebt(householdId, id);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
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
          <span className="loading-icon">❄️</span>
          <p className="loading-text">Loading your plan…</p>
        </div>
      </div>
    );
  }

  const displayName = userDoc?.displayName || user?.email || "";

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
    schedule: <PayoffSchedule debts={adjustedDebts} schedule={schedule} />,
    actuals: (
      <ActualPayments
        debts={debts}
        schedule={schedule}
        actuals={actuals}
        onSetActual={handleSetActual}
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

      {showOnboarding && (
        <OnboardingModal onComplete={() => setShowOnboarding(false)} />
      )}

      {showHousehold && (
        <HouseholdModal onClose={() => setShowHousehold(false)} />
      )}
    </PaywallGate>
  );
}
