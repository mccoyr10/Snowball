"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getHousehold, generateInviteCode, lookupInviteCode, joinHousehold } from "@/lib/firestore";
import type { Household } from "@/types";

interface HouseholdModalProps {
  onClose: () => void;
}

export default function HouseholdModal({ onClose }: HouseholdModalProps) {
  const { user, userDoc, refreshUserDoc } = useAuth();
  const [tab, setTab] = useState<"invite" | "join">("invite");
  const [household, setHousehold] = useState<Household | null>(null);
  const [loadingHousehold, setLoadingHousehold] = useState(true);

  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState(false);

  useEffect(() => {
    if (!userDoc?.householdId) return;
    getHousehold(userDoc.householdId).then(h => {
      setHousehold(h);
      setLoadingHousehold(false);
    });
  }, [userDoc?.householdId]);

  async function handleGenerate() {
    if (!userDoc?.householdId || !user) return;
    setGenerating(true);
    try {
      const code = await generateInviteCode(userDoc.householdId, user.uid);
      setHousehold(prev => prev ? { ...prev, inviteCode: code } : prev);
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!household?.inviteCode) return;
    await navigator.clipboard.writeText(household.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleJoin() {
    if (!user || !joinCode.trim()) return;
    setJoinError("");
    setJoining(true);
    try {
      const result = await lookupInviteCode(joinCode.trim());
      if (!result) {
        setJoinError("Code not found. Check for typos and try again.");
        return;
      }
      if (result.householdId === userDoc?.householdId) {
        setJoinError("You're already in this household.");
        return;
      }
      await joinHousehold(user.uid, result.householdId);
      await refreshUserDoc();
      setJoinSuccess(true);
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black bg-opacity-40" onClick={onClose} />
      <div
        className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md z-10"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Household</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl w-9 h-9 flex items-center justify-center">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5">
          <button
            onClick={() => setTab("invite")}
            className={`py-3 text-sm font-medium border-b-2 mr-6 transition-colors ${tab === "invite" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400"}`}
          >
            Invite someone
          </button>
          <button
            onClick={() => setTab("join")}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${tab === "join" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400"}`}
          >
            Join a household
          </button>
        </div>

        <div className="p-5">
          {tab === "invite" ? (
            <div className="space-y-4">
              {loadingHousehold ? (
                <div className="flex justify-center py-6">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                </div>
              ) : (
                <>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">Members in this household</p>
                    <p className="text-2xl font-bold text-gray-800">{household?.memberIds.length ?? 1}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-3">
                      Share an invite code with your partner. They&apos;ll enter it in the &ldquo;Join a household&rdquo; tab after signing up.
                    </p>

                    {household?.inviteCode ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-center">
                            <span className="text-2xl font-bold tracking-widest text-blue-700 font-mono">
                              {household.inviteCode}
                            </span>
                          </div>
                          <button
                            onClick={handleCopy}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-3 text-sm font-medium min-w-[72px]"
                          >
                            {copied ? "Copied!" : "Copy"}
                          </button>
                        </div>
                        <button
                          onClick={handleGenerate}
                          disabled={generating}
                          className="text-xs text-gray-400 hover:text-gray-600 w-full text-center py-1"
                        >
                          Generate a new code
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-semibold"
                      >
                        {generating ? "Generating…" : "Generate invite code"}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {joinSuccess ? (
                <div className="text-center py-6 space-y-3">
                  <div className="text-5xl">🎉</div>
                  <p className="text-base font-semibold text-gray-800">You&apos;re in!</p>
                  <p className="text-sm text-gray-500">You&apos;re now sharing a household. Your data is synced.</p>
                  <button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-2.5 text-sm font-medium">
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    Enter the invite code from the person whose household you want to join. This will connect you to their debt plan.
                  </p>
                  <div>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(""); }}
                      placeholder="XXXXXXXX"
                      maxLength={8}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-xl font-bold tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    />
                    {joinError && <p className="text-red-500 text-xs mt-1.5">{joinError}</p>}
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <p className="text-xs text-amber-700">
                      ⚠ After joining, you&apos;ll see the other household&apos;s debts. Your current household data won&apos;t be deleted, but you won&apos;t have access to it while in a shared household.
                    </p>
                  </div>
                  <button
                    onClick={handleJoin}
                    disabled={joining || joinCode.length < 6}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl py-3 text-sm font-semibold"
                  >
                    {joining ? "Joining…" : "Join household"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
