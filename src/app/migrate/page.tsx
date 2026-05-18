"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { readLegacyData, migrateLegacyData } from "@/lib/firestore";
import type { LegacyData } from "@/types";

function MigrateContent() {
  const { userDoc } = useAuth();
  const router = useRouter();

  const [legacy, setLegacy] = useState<LegacyData | null>(null);
  const [checking, setChecking] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    readLegacyData()
      .then(setLegacy)
      .finally(() => setChecking(false));
  }, []);

  async function handleMigrate() {
    if (!legacy) return;
    if (!userDoc?.householdId) {
      setError("Your account isn't fully set up yet. Please sign out and sign back in, then try again.");
      return;
    }
    setMigrating(true);
    setError("");
    try {
      await migrateLegacyData(userDoc.householdId, legacy);
      setDone(true);
    } catch (e) {
      console.error(e);
      setError("Migration failed — check the browser console for details and verify your Firestore security rules are published.");
    } finally {
      setMigrating(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="text-4xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-blue-800 mb-2">Migration complete</h1>
          <p className="text-gray-500 mb-6">Your debts and settings have been imported into your new account.</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-full bg-blue-700 px-8 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!legacy) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h1 className="text-2xl font-bold text-blue-800 mb-2">No legacy data found</h1>
          <p className="text-gray-500 mb-6">We couldn&apos;t find any data from the old app to import.</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-full bg-blue-700 px-8 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  const totalBalance = legacy.debts.reduce((s, d) => s + d.balance, 0);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h1 className="text-2xl font-bold text-blue-800 mb-1">Import your existing data</h1>
          <p className="text-sm text-gray-500 mb-6">
            We found your previous debts. Review them below and click Import to bring them into your new account.
          </p>

          <div className="space-y-3 mb-6">
            {legacy.debts.map((d) => (
              <div key={d.id} className="flex justify-between items-center rounded-lg border border-gray-100 px-4 py-3">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{d.name}</p>
                  <p className="text-xs text-gray-400">{d.apr}% APR · ${d.minPayment.toFixed(2)}/mo minimum</p>
                </div>
                <p className="font-semibold text-gray-800">${d.balance.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-between text-sm font-medium text-gray-700 border-t pt-3 mb-2">
            <span>Total debt</span>
            <span>${totalBalance.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500 mb-6">
            <span>Monthly budget</span>
            <span>${legacy.settings.monthlyBudget.toLocaleString()}/mo</span>
          </div>

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="w-full rounded-full bg-blue-700 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors disabled:opacity-50"
          >
            {migrating ? "Importing…" : "Import my data"}
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full mt-3 text-center text-sm text-gray-400 hover:text-gray-600"
          >
            Skip — I&apos;ll enter data manually
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MigratePage() {
  return (
    <AuthGuard>
      <MigrateContent />
    </AuthGuard>
  );
}
