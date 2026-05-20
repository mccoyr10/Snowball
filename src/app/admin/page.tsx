"use client";

import { useState, useEffect, useCallback } from "react";

interface CodeRecord {
  id: string;
  type: "lifetime" | "extended_trial";
  trialDays?: number;
  maxUses: number | null;
  currentUses: number;
  isActive: boolean;
  purpose: string;
  expiresAt: { _seconds: number } | null;
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [authError, setAuthError] = useState("");

  const [codes, setCodes] = useState<CodeRecord[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);

  const [form, setForm] = useState({
    code: "",
    type: "lifetime" as "lifetime" | "extended_trial",
    trialDays: "30",
    maxUses: "1",
    unlimitedUses: false,
    purpose: "",
    expiresAt: "",
    noExpiry: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const fetchCodes = useCallback(async (key: string) => {
    setLoadingCodes(true);
    try {
      const res = await fetch("/api/admin/create-discount-code", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error || "Failed to load codes.");
      }
      const data = await res.json() as { codes: CodeRecord[] };
      setCodes(data.codes);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Failed to load codes.");
    } finally {
      setLoadingCodes(false);
    }
  }, []);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    const res = await fetch("/api/admin/create-discount-code", {
      headers: { Authorization: `Bearer ${adminKey}` },
    });
    if (res.status === 401) {
      setAuthError("Wrong admin key.");
      return;
    }
    if (!res.ok) {
      setAuthError("Something went wrong.");
      return;
    }
    const data = await res.json() as { codes: CodeRecord[] };
    setCodes(data.codes);
    setUnlocked(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");
    setSubmitting(true);

    const body = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      ...(form.type === "extended_trial" ? { trialDays: parseInt(form.trialDays) } : {}),
      maxUses: form.unlimitedUses ? null : parseInt(form.maxUses),
      purpose: form.purpose.trim(),
      expiresAt: form.noExpiry ? null : form.expiresAt || null,
    };

    try {
      const res = await fetch("/api/admin/create-discount-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminKey}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { error?: string; code?: string };
      if (!res.ok) throw new Error(data.error || "Failed to create code.");
      setSubmitSuccess(`Code "${data.code}" created successfully.`);
      setForm(f => ({ ...f, code: "", purpose: "" }));
      await fetchCodes(adminKey);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (unlocked) fetchCodes(adminKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!unlocked) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg, #f9fafb)", padding: 24 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: "100%", maxWidth: 400, boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 4px" }}>Admin</h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 24px" }}>Enter your admin key to manage discount codes.</p>
          <form onSubmit={handleUnlock} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="password"
              value={adminKey}
              onChange={e => setAdminKey(e.target.value)}
              placeholder="Admin key"
              required
              autoFocus
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14 }}
            />
            {authError && <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>{authError}</p>}
            <button
              type="submit"
              style={{ padding: "10px", borderRadius: 8, background: "#1d4ed8", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg, #f9fafb)", padding: 24 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Discount Codes</h1>
          <button
            onClick={() => setUnlocked(false)}
            style={{ fontSize: 13, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}
          >
            Lock
          </button>
        </div>

        {/* Create form */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px" }}>Create a new code</h2>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Code</label>
                <input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. LIFETIME-JANE"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as "lifetime" | "extended_trial" }))}
                  style={inputStyle}
                >
                  <option value="lifetime">Lifetime access</option>
                  <option value="extended_trial">Free trial (N days)</option>
                </select>
              </div>
            </div>

            {form.type === "extended_trial" && (
              <div style={{ maxWidth: 160 }}>
                <label style={labelStyle}>Trial length (days)</label>
                <input
                  type="number"
                  min={1}
                  value={form.trialDays}
                  onChange={e => setForm(f => ({ ...f, trialDays: e.target.value }))}
                  required
                  style={inputStyle}
                />
              </div>
            )}

            <div>
              <label style={labelStyle}>Max uses</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input
                  type="number"
                  min={1}
                  value={form.maxUses}
                  onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                  disabled={form.unlimitedUses}
                  style={{ ...inputStyle, width: 100, opacity: form.unlimitedUses ? 0.4 : 1 }}
                />
                <label style={{ fontSize: 13, color: "#374151", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.unlimitedUses}
                    onChange={e => setForm(f => ({ ...f, unlimitedUses: e.target.checked }))}
                  />
                  Unlimited
                </label>
              </div>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: "4px 0 0" }}>
                Use 1 for a personal code. Use more for a shared promo.
              </p>
            </div>

            <div>
              <label style={labelStyle}>Purpose <span style={{ fontWeight: 400, color: "#9ca3af" }}>(your private note)</span></label>
              <input
                value={form.purpose}
                onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                placeholder="e.g. Research participant Jane Smith"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Expiry date</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                  disabled={form.noExpiry}
                  style={{ ...inputStyle, width: 180, opacity: form.noExpiry ? 0.4 : 1 }}
                />
                <label style={{ fontSize: 13, color: "#374151", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.noExpiry}
                    onChange={e => setForm(f => ({ ...f, noExpiry: e.target.checked }))}
                  />
                  Never expires
                </label>
              </div>
            </div>

            {submitError && <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>{submitError}</p>}
            {submitSuccess && <p style={{ fontSize: 13, color: "#16a34a", margin: 0 }}>{submitSuccess}</p>}

            <button
              type="submit"
              disabled={submitting}
              style={{ padding: "11px", borderRadius: 8, background: "#1d4ed8", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.6 : 1, alignSelf: "flex-start", minWidth: 140 }}
            >
              {submitting ? "Creating…" : "Create code"}
            </button>
          </form>
        </div>

        {/* Existing codes */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Existing codes</h2>
            <button
              onClick={() => fetchCodes(adminKey)}
              style={{ fontSize: 13, color: "#1d4ed8", background: "none", border: "none", cursor: "pointer" }}
            >
              Refresh
            </button>
          </div>

          {loadingCodes ? (
            <p style={{ fontSize: 14, color: "#9ca3af" }}>Loading…</p>
          ) : codes.length === 0 ? (
            <p style={{ fontSize: 14, color: "#9ca3af" }}>No codes yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {codes.map(c => (
                <div key={c.id} style={{
                  display: "grid", gridTemplateColumns: "1fr auto",
                  alignItems: "start", gap: 12,
                  padding: "12px 14px", borderRadius: 10,
                  background: c.isActive ? "#f0fdf4" : "#f9fafb",
                  border: `1px solid ${c.isActive ? "#bbf7d0" : "#e5e7eb"}`,
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 14, letterSpacing: 0.5 }}>{c.id}</span>
                      <span style={{
                        fontSize: 11, padding: "2px 7px", borderRadius: 99,
                        background: c.type === "lifetime" ? "#dbeafe" : "#fef3c7",
                        color: c.type === "lifetime" ? "#1d4ed8" : "#92400e",
                        fontWeight: 600,
                      }}>
                        {c.type === "lifetime" ? "Lifetime" : `${c.trialDays ?? "?"} days`}
                      </span>
                      {!c.isActive && (
                        <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 99, background: "#fee2e2", color: "#991b1b", fontWeight: 600 }}>Inactive</span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 2px" }}>{c.purpose}</p>
                    {c.expiresAt && (
                      <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>
                        Expires {new Date(c.expiresAt._seconds * 1000).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                      {c.currentUses}{c.maxUses !== null ? ` / ${c.maxUses}` : ""} used
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 4,
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 11px", borderRadius: 8,
  border: "1px solid #d1d5db", fontSize: 13,
  boxSizing: "border-box", background: "#fff",
};
