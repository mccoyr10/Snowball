"use client";

interface NavBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  saveStatus: string;
  displayName: string;
  onSignOut: () => void;
  onOpenHousehold: () => void;
}

export default function NavBar({ activeTab, setActiveTab, saveStatus, displayName, onSignOut, onOpenHousehold }: NavBarProps) {
  const tabs = [
    {
      id: "dashboard", label: "Dashboard",
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,
    },
    {
      id: "debts", label: "Debts",
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    },
    {
      id: "schedule", label: "Schedule",
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    },
    {
      id: "actuals", label: "Actuals",
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    },
    {
      id: "advisor", label: "Advisor",
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    },
  ];
  const statusColors: Record<string, string> = { saving: "text-yellow-500", saved: "text-green-500", error: "text-red-500" };
  const statusLabels: Record<string, string> = { saving: "Saving…", saved: "Saved", error: "Error saving" };

  return (
    <>
      {/* Desktop: top nav */}
      <nav className="hidden sm:block bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
          <div className="flex">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === t.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {saveStatus !== "idle" && (
              <span className={`text-xs font-medium ${statusColors[saveStatus] || ""}`}>
                {statusLabels[saveStatus] || ""}
              </span>
            )}
            <button onClick={onOpenHousehold} className="text-sm text-gray-500 hover:text-blue-600 transition-colors">
              {displayName}
            </button>
            <button onClick={onSignOut} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
              Sign out
            </button>
            <span className="text-sm font-bold text-blue-700">❄ Snowball</span>
          </div>
        </div>
      </nav>

      {/* Mobile: bottom tab bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200"
           style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] transition-colors ${
                activeTab === t.id ? "text-blue-600" : "text-gray-400"
              }`}>
              {t.icon}
              <span className="text-[10px] font-medium mt-0.5">{t.label}</span>
            </button>
          ))}
          <button onClick={onOpenHousehold}
            className="flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] transition-colors text-gray-400 hover:text-blue-600">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span className="text-[10px] font-medium mt-0.5">Account</span>
          </button>
        </div>
      </nav>
    </>
  );
}
