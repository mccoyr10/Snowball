"use client";

import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
      />
      <div style={{
        position: "relative", zIndex: 10,
        background: "var(--surface)",
        borderRadius: "var(--r-xl) var(--r-xl) 0 0",
        boxShadow: "0 -4px 32px rgba(0,0,0,0.12)",
        width: "100%",
        maxWidth: 480,
        padding: "24px 20px",
        paddingBottom: "max(20px, env(safe-area-inset-bottom))",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", margin: 0 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: "50%",
              border: "none", background: "var(--surface-sunk)",
              color: "var(--ink-muted)", fontSize: 18, lineHeight: 1,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
