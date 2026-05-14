"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import { useDebts } from "@/hooks/useDebts";
import { useStrategy } from "@/hooks/useStrategy";

function DashboardContent() {
  const { user, userDoc, signOut } = useAuth();
  const router = useRouter();
  const householdId = userDoc?.householdId ?? null;
  const { debts, loading: debtsLoading } = useDebts(householdId);
  const { strategy } = useStrategy(householdId);

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  const totalBalance = debts.reduce((s, d) => s + d.balance, 0);
  const totalMinimum = debts.reduce((s, d) => s + d.minimumPayment, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-blue-800">Snowball</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.displayName ?? user?.email}</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {debtsLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />
          </div>
        ) : debts.length === 0 ? (
          // No debts yet — prompt migration or manual entry
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Welcome to your dashboard</h2>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">
              Get started by importing your existing debts or entering them manually.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/migrate"
                className="rounded-full bg-blue-700 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-800 transition-colors"
              >
                Import existing data
              </Link>
              <button className="rounded-full border border-blue-700 px-8 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors">
                Add debt manually
              </button>
            </div>
          </div>
        ) : (
          // Debts exist — show summary
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total debt</p>
                <p className="text-2xl font-bold text-gray-800">${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Monthly minimums</p>
                <p className="text-2xl font-bold text-gray-800">${totalMinimum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Monthly budget</p>
                <p className="text-2xl font-bold text-gray-800">
                  {strategy ? `$${strategy.monthlyBudget.toLocaleString()}` : "—"}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Your debts</h2>
                <span className="text-xs text-gray-400">{strategy?.method === "avalanche" ? "Avalanche order" : "Snowball order"}</span>
              </div>
              <ul className="divide-y divide-gray-50">
                {debts.map((debt) => (
                  <li key={debt.id} className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{debt.name}</p>
                      <p className="text-xs text-gray-400">{debt.interestRate}% APR · ${debt.minimumPayment.toFixed(2)}/mo minimum</p>
                    </div>
                    <p className="font-semibold text-gray-800">${debt.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
