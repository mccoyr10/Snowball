"use client";

import { useState, useEffect } from "react";

const DISMISSED_KEY = "exhale_migration_v1_dismissed";

interface MigrationBannerProps {
  onGoToDebts: () => void;
}

export default function MigrationBanner({ onGoToDebts }: MigrationBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(DISMISSED_KEY)) setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={{
      background: "var(--info-soft)",
      borderBottom: "1px solid var(--line)",
      padding: "10px 20px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      fontSize: 13,
      color: "var(--ink)",
      flexWrap: "wrap",
    }}>
      <span style={{ flex: 1, minWidth: 200 }}>
        <strong>New:</strong> We now track lifetime progress per debt. Edit each debt to add its <em>original balance</em> for accurate progress rings.
      </span>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button
          className="btn primary sm"
          onClick={() => { dismiss(); onGoToDebts(); }}
        >
          Update debts
        </button>
        <button className="btn sm" onClick={dismiss}>Dismiss</button>
      </div>
    </div>
  );
}
