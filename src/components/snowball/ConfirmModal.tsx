"use client";

import { useEffect } from "react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmModal({
  open, title, message, confirmLabel = "Confirm",
  onConfirm, onCancel, danger = false,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }}
        onClick={onCancel}
      />
      <div style={{
        position: "relative", zIndex: 10,
        background: "var(--surface)",
        borderRadius: "var(--r-xl)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
        width: "100%",
        maxWidth: 380,
        padding: 24,
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", margin: "0 0 8px" }}>{title}</h2>
        <p style={{ fontSize: 14, color: "var(--ink-muted)", margin: "0 0 20px", lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onConfirm}
            className="btn primary"
            style={{
              flex: 1, justifyContent: "center",
              ...(danger ? { background: "var(--danger)", borderColor: "var(--danger)" } : {}),
            }}
          >
            {confirmLabel}
          </button>
          <button onClick={onCancel} className="btn" style={{ flex: 1, justifyContent: "center" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
