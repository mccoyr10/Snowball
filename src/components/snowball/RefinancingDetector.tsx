"use client";

import { useState } from "react";
import { getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { formatCurrency, type UIDebt, type Summary } from "@/lib/snowball";

interface RefinancingOpportunity {
  debtName: string;
  currentApr: number;
  refinanceRate: number;
  monthlyInterestSaved: number;
  annualInterestSaved: number;
  breakEvenMonths: number;
  recommendation: string;
}

interface RefinancingResult {
  opportunities: RefinancingOpportunity[];
  ratesAsOfNote: string;
}

interface RefinancingDetectorProps {
  debts: UIDebt[];
  summary: Summary;
}

export default function RefinancingDetector({ debts, summary: _summary }: RefinancingDetectorProps) {
  const [result, setResult] = useState<RefinancingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const idToken = auth.currentUser ? await getIdToken(auth.currentUser) : "";
      const res = await fetch("/api/advisor/refinancing", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({
          debts: debts.map(d => ({ name: d.name, apr: d.apr, balance: d.balance })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error || "Analysis failed");
      }
      const data = await res.json() as RefinancingResult;
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>Refinancing Opportunities</h3>
      <p style={{ fontSize: 14, color: "var(--ink-muted)", marginBottom: 16, lineHeight: 1.5 }}>
        Compare your current APRs against market rates to find potential savings from refinancing.
      </p>

      {!result && (
        <>
          {error && <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 10 }}>{error}</p>}
          <button className="btn primary" onClick={analyze} disabled={loading} style={{ borderRadius: 24 }}>
            {loading ? "Analyzing…" : "Analyze Refinancing Opportunities"}
          </button>
        </>
      )}

      {result && (
        <>
          {result.opportunities.length === 0 ? (
            <div className="callout">
              <div>No refinancing opportunities identified based on your current APRs. Your rates are already competitive, or the savings wouldn&apos;t offset refinancing costs.</div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                {result.opportunities.map((opp, idx) => (
                  <div key={idx} style={{ border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ padding: "16px 20px", background: "var(--surface)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{opp.debtName}</div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>Annual savings</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--sage)" }}>{formatCurrency(opp.annualInterestSaved)}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                        <div style={{ textAlign: "center", padding: "8px 14px", background: "#fee2e2", borderRadius: 8 }}>
                          <div style={{ fontSize: 11, color: "#dc2626" }}>Current</div>
                          <div style={{ fontSize: 17, fontWeight: 800, color: "#dc2626" }}>{opp.currentApr}%</div>
                        </div>
                        <div style={{ fontSize: 18, color: "var(--ink-muted)" }}>→</div>
                        <div style={{ textAlign: "center", padding: "8px 14px", background: "#dcfce7", borderRadius: 8 }}>
                          <div style={{ fontSize: 11, color: "#16a34a" }}>Target</div>
                          <div style={{ fontSize: 17, fontWeight: 800, color: "#16a34a" }}>{opp.refinanceRate}%</div>
                        </div>
                        <div style={{ flex: 1, textAlign: "right" }}>
                          <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>Break even</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{opp.breakEvenMonths} mo</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.5 }}>{opp.recommendation}</div>
                    </div>
                    <div style={{ padding: "8px 20px", background: "var(--info-soft)", display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--info)" }}>
                      <span>Monthly savings: {formatCurrency(opp.monthlyInterestSaved)}</span>
                      <span>Annual: {formatCurrency(opp.annualInterestSaved)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <p style={{ fontSize: 11, color: "var(--ink-muted)", lineHeight: 1.5, marginBottom: 12 }}>
            {result.ratesAsOfNote}
          </p>
          <button className="btn sm" onClick={analyze} disabled={loading}>
            {loading ? "Re-analyzing…" : "Re-analyze"}
          </button>
        </>
      )}
    </div>
  );
}
