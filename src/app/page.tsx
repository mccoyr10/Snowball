"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 min-h-screen px-4">
      <div className="max-w-xl w-full text-center">
        <h1 className="text-4xl font-bold text-blue-800 mb-4">Snowball</h1>
        <p className="text-lg text-gray-600 mb-8">
          Pay off your debt faster with the snowball method. Track every balance,
          visualize your payoff timeline, and celebrate every win.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/login"
            className="rounded-full bg-blue-700 px-8 py-3 text-white font-semibold hover:bg-blue-800 transition-colors"
          >
            Sign in
          </a>
          <a
            href="/register"
            className="rounded-full border border-blue-700 px-8 py-3 text-blue-700 font-semibold hover:bg-blue-50 transition-colors"
          >
            Get started free
          </a>
        </div>
      </div>
    </div>
  );
}
