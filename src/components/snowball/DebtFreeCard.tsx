"use client";

import { useState } from "react";
import { getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { formatCurrency, type Summary } from "@/lib/snowball";
import type { UserDoc } from "@/types";

interface DebtFreeCardProps {
  summary: Summary;
  userDoc: UserDoc | null;
}

export default function DebtFreeCard({ summary, userDoc }: DebtFreeCardProps) {
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const firstName = userDoc?.displayName?.split(" ")[0] || "You";

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    setError(null);
    try {
      const idToken = auth.currentUser ? await getIdToken(auth.currentUser) : "";
      const res = await fetch("/api/advisor/create-share-token", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({
          firstName,
          payoffDate: summary.projectedPayoffDate ?? "Unknown",
          monthsRemaining: summary.monthsRemaining,
          totalDebt: formatCurrency(summary.totalBalance),
          totalInterest: formatCurrency(summary.savingsVsMinOnly),
        }),
      });
      if (!res.ok) throw new Error("Share failed");
      const { token } = await res.json() as { token: string };
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://exhaledebt.com";
      const url = `${appUrl}/share/${token}`;
      setShareUrl(url);

      let copied = false;
      try {
        await navigator.clipboard.writeText(url);
        copied = true;
      } catch {
        // clipboard unavailable
      }

      if (!copied && navigator.share && typeof navigator.share === "function") {
        try {
          await navigator.share({ title: "My Debt-Free Journey", url });
          copied = true;
        } catch {
          // share cancelled or unavailable
        }
      }

      setShared(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSharing(false);
    }
  }

  const hasData = summary.projectedPayoffDate && summary.totalBalance > 0;

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>Debt-Free Countdown Card</h3>
      <p style={{ fontSize: 14, color: "var(--ink-muted)", marginBottom: 20, lineHeight: 1.5 }}>
        Share your debt-free date with friends and family — no account numbers, just your milestone.
      </p>

      {/* Card preview */}
      <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid var(--line)", maxWidth: 360, marginBottom: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
        <div style={{ background: "#0f172a", padding: "24px 24px 18px", color: "#fff" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 2 }}>Debt-Free Progress</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{firstName}&apos;s Journey</div>
        </div>
        <div style={{ background: "#fff", padding: "20px 24px 24px" }}>
          {hasData ? (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>Debt-free date</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#2563eb" }}>{summary.projectedPayoffDate}</div>
                <div style={{ fontSize: 13, color: "#94a3b8" }}>{summary.monthsRemaining} months away</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>Total debt</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{formatCurrency(summary.totalBalance)}</div>
                </div>
                <div style={{ background: "#f0fdf4", borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>Interest saved</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#16a34a" }}>{formatCurrency(summary.savingsVsMinOnly)}</div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: "#94a3b8", fontSize: 14, padding: "8px 0" }}>Add your debts to see your countdown card.</div>
          )}
        </div>
      </div>

      {hasData && (
        <>
          <button className="btn primary" onClick={handleShare} disabled={sharing} style={{ borderRadius: 24, marginBottom: shared ? 12 : 0 }}>
            {sharing ? "Creating link…" : "Share My Progress"}
          </button>

          {shared && shareUrl && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, color: "var(--sage)", fontWeight: 600, marginBottom: 6 }}>✓ Link ready to share!</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  readOnly
                  value={shareUrl}
                  onClick={e => (e.target as HTMLInputElement).select()}
                  style={{ flex: 1, fontSize: 12, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface)", color: "var(--ink)", outline: "none" }}
                />
                <button className="btn sm" onClick={() => { navigator.clipboard.writeText(shareUrl).catch(() => {}); }}>
                  Copy
                </button>
              </div>
            </div>
          )}

          {error && <p style={{ color: "var(--danger)", fontSize: 13, marginTop: 8 }}>{error}</p>}
        </>
      )}
    </div>
  );
}
