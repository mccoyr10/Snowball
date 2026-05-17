"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import AuthFormCard from "@/components/AuthFormCard";
import { FirebaseError } from "firebase/app";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      if (err instanceof FirebaseError && err.code === "auth/user-not-found") {
        // Don't reveal whether the email exists
        setSent(true);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthFormCard title="Check your email">
        <p className="text-sm text-gray-600 mb-6">
          If an account exists for <strong>{email}</strong>, you&apos;ll receive a
          password reset link shortly.
        </p>
        <Link
          href="/login"
          className="block text-center text-sm text-blue-700 hover:underline font-medium"
        >
          Back to sign in
        </Link>
      </AuthFormCard>
    );
  }

  return (
    <AuthFormCard
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-blue-700 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send reset link"}
        </button>

        <Link
          href="/login"
          className="block text-center text-sm text-blue-700 hover:underline"
        >
          Back to sign in
        </Link>
      </form>
    </AuthFormCard>
  );
}
