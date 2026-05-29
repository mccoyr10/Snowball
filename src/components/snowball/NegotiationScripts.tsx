"use client";

import { useState } from "react";
import { getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { type UIDebt } from "@/lib/snowball";

interface NegotiationScript {
  debtName: string;
  currentApr: number;
  targetApr: number;
  openingLine: string;
  requestStatement: string;
  pushbackResponse: string;
  closing: string;
  proTips: string[];
}

interface NegotiationScriptsProps {
  debts: UIDebt[];
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  }
  return (
    <button className="btn sm" onClick={handleCopy} style={{ fontSize: 11 }}>
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function NegotiationScripts({ debts }: NegotiationScriptsProps) {
  const qualifying = debts.filter(d => d.apr > 15);
  const [scripts, setScripts] = useState<NegotiationScript[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [generated, setGenerated] = useState(false);

  async function generate() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const idToken = auth.currentUser ? await getIdToken(auth.currentUser) : "";
      const res = await fetch("/api/advisor/negotiation-scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({
          debts: qualifying.map(d => ({ name: d.name, apr: d.apr, balance: d.balance })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error || "Generation failed");
      }
      const data = await res.json() as { scripts: NegotiationScript[] };
      setScripts(data.scripts);
      setGenerated(true);
      if (data.scripts.length > 0) setOpenIdx(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (qualifying.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>APR Negotiation Scripts</h3>
        <div className="callout">
          <div>None of your debts are above 15% APR — great work! Scripts are generated for high-interest debts where negotiation has the most impact.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>APR Negotiation Scripts</h3>
      <p style={{ fontSize: 14, color: "var(--ink-muted)", marginBottom: 16, lineHeight: 1.5 }}>
        Word-for-word scripts for calling {qualifying.map(d => d.name).join(", ")} to request a lower rate.
        One successful call could save you hundreds of dollars.
      </p>

      {!generated && (
        <>
          {error && <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 10 }}>{error}</p>}
          <button className="btn primary" onClick={generate} disabled={loading} style={{ borderRadius: 24 }}>
            {loading ? "Generating scripts…" : `Generate Scripts for ${qualifying.length} Debt${qualifying.length > 1 ? "s" : ""}`}
          </button>
        </>
      )}

      {generated && scripts.length === 0 && (
        <div className="callout">No scripts could be generated. Please try again.</div>
      )}

      {scripts.map((script, idx) => (
        <div key={idx} style={{ border: "1px solid var(--line)", borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
          <button
            onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
            style={{ width: "100%", padding: "14px 16px", background: "var(--surface)", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left" }}
          >
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{script.debtName}</div>
              <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>{script.currentApr}% → target {script.targetApr}%</div>
            </div>
            <span style={{ color: "var(--ink-muted)", fontSize: 12 }}>{openIdx === idx ? "▲" : "▼"}</span>
          </button>
          {openIdx === idx && (
            <div style={{ padding: "0 16px 16px", background: "#fff", borderTop: "1px solid var(--line)" }}>
              {[
                { label: "Opening Line", text: script.openingLine },
                { label: "Your Request", text: script.requestStatement },
                { label: "If They Say No", text: script.pushbackResponse },
                { label: "Closing", text: script.closing },
              ].map(({ label, text }) => (
                <div key={label} style={{ marginTop: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--info)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
                    <CopyButton text={text} />
                  </div>
                  <div style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.6, background: "var(--surface)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--line)" }}>
                    {text}
                  </div>
                </div>
              ))}
              {script.proTips.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--warn)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Pro Tips</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {script.proTips.map((tip, i) => (
                      <li key={i} style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 4, lineHeight: 1.5 }}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {generated && (
        <button className="btn sm" onClick={generate} disabled={loading} style={{ marginTop: 8 }}>
          {loading ? "Regenerating…" : "Regenerate Scripts"}
        </button>
      )}
    </div>
  );
}
