"use client";

export interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export default function Toast({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;
  return (
    <div style={{
      position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
      zIndex: 100, display: "flex", flexDirection: "column", gap: 8,
      alignItems: "center", pointerEvents: "none",
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => onDismiss(t.id)}
          style={{
            pointerEvents: "auto",
            background: t.type === "error" ? "var(--danger)" : t.type === "success" ? "var(--sage-deep)" : "var(--ink)",
            color: "#fff",
            borderRadius: "var(--r-pill)",
            padding: "10px 18px",
            fontSize: 13.5,
            fontWeight: 500,
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
            cursor: "pointer",
            animation: "toastIn 0.2s ease",
            whiteSpace: "nowrap",
          }}
        >
          {t.message}
        </div>
      ))}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
