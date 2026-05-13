"use client";

import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

function DashboardContent() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

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

      <main className="max-w-4xl mx-auto px-6 py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">Your debt dashboard is coming soon</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Authentication is set up. Next up: your household, your debts, and your
          snowball timeline will all live here.
        </p>
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
