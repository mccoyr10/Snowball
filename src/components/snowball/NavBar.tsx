"use client";

interface NavBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  saveStatus: string;
  displayName: string;
  onSignOut: () => void;
  onOpenHousehold: () => void;
}

// Inline SVG icons
function IconLayout({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  );
}
function IconWallet({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  );
}
function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}
function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20,6 9,17 4,12"/>
    </svg>
  );
}
function IconSpark({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/>
    </svg>
  );
}
function IconSnowflake() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/>
      <line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  );
}
function IconLogout({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

const navItems = [
  { id: "dashboard", label: "Dashboard", mobileLabel: "Home", Icon: IconLayout },
  { id: "debts",     label: "Debts",     mobileLabel: "Debts", Icon: IconWallet },
  { id: "schedule",  label: "Schedule",  mobileLabel: "Plan",  Icon: IconCalendar },
  { id: "actuals",   label: "Actuals",   mobileLabel: "Log",   Icon: IconCheck },
  { id: "advisor",   label: "Advisor",   mobileLabel: "Help",  Icon: IconSpark },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function NavBar({ activeTab, setActiveTab, saveStatus, displayName, onSignOut, onOpenHousehold }: NavBarProps) {
  const initials = displayName ? getInitials(displayName) : "SB";
  const firstName = displayName ? displayName.split(" ")[0] : displayName;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <IconSnowflake />
          </div>
          <div className="brand-name">Snowball</div>
        </div>

        <nav className="nav">
          {navItems.map(({ id, label, Icon }) => (
            <button
              key={id}
              className="nav-item"
              aria-current={activeTab === id ? "page" : undefined}
              onClick={() => setActiveTab(id)}
            >
              <Icon className="nav-icon" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          {saveStatus !== "idle" && (
            <div style={{
              fontSize: 12,
              color: saveStatus === "saved" ? "var(--sage)" : saveStatus === "error" ? "var(--danger)" : "var(--ink-muted)",
              padding: "4px 10px",
            }}>
              {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "Error saving"}
            </div>
          )}
          <div className="user-chip">
            <div className="avatar">{initials}</div>
            <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
              <div className="user-name">{firstName || "Account"}</div>
              <div className="user-meta">Personal plan</div>
            </div>
          </div>
          <button className="signout" onClick={onOpenHousehold}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: -1, marginRight: 6 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span className="signout-label">Account</span>
          </button>
          <button className="signout" onClick={onSignOut}>
            <IconLogout />
            <span className="signout-label">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-nav">
        {navItems.map(({ id, mobileLabel, Icon }) => (
          <button
            key={id}
            className="nav-item"
            aria-current={activeTab === id ? "page" : undefined}
            onClick={() => setActiveTab(id)}
          >
            <Icon className="nav-icon" />
            <span>{mobileLabel}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
