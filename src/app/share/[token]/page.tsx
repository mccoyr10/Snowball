import { getAdminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

interface ShareData {
  firstName: string;
  payoffDate: string;
  monthsRemaining: number;
  totalDebt: string;
  totalInterest: string;
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // Try to get data for metadata
  try {
    const db = getAdminDb();
    const tokenSnap = await db.doc(`shareTokens/${token}`).get();
    if (tokenSnap.exists) {
      const { uid } = tokenSnap.data() as { uid: string };
      const cardSnap = await db.doc(`users/${uid}/shareCard/current`).get();
      if (cardSnap.exists) {
        const data = cardSnap.data() as ShareData;
        return {
          title: `${data.firstName}'s Debt-Free Journey — Exhale Debt`,
          description: `${data.firstName} is on track to be debt-free by ${data.payoffDate}, saving ${data.totalInterest} in interest. Track your own at exhaledebt.com.`,
          openGraph: {
            title: `${data.firstName}'s Debt-Free Journey`,
            description: `Debt-free by ${data.payoffDate} · ${data.totalInterest} interest saved`,
            type: "website",
          },
          twitter: { card: "summary" },
        };
      }
    }
  } catch {
    // Fall through to defaults
  }
  return { title: "Debt-Free Progress — Exhale Debt" };
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let data: ShareData | null = null;
  try {
    const db = getAdminDb();
    const tokenSnap = await db.doc(`shareTokens/${token}`).get();
    if (tokenSnap.exists) {
      const { uid } = tokenSnap.data() as { uid: string };
      const cardSnap = await db.doc(`users/${uid}/shareCard/current`).get();
      if (cardSnap.exists) {
        data = cardSnap.data() as ShareData;
      }
    }
  } catch {
    // Show expired state
  }

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>This link is no longer active</h1>
          <p style={{ color: "#64748b", marginBottom: 24 }}>The progress card may have been removed or expired.</p>
          <a href="https://exhaledebt.com" style={{ display: "inline-block", padding: "10px 24px", background: "#2563eb", color: "#fff", borderRadius: 24, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
            Track your own debt →
          </a>
        </div>
      </div>
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://exhaledebt.com";

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
      {/* Card */}
      <div style={{ width: "100%", maxWidth: 440, borderRadius: 20, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        {/* Header */}
        <div style={{ background: "#0f172a", padding: "32px 32px 24px", color: "#fff" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Debt-Free Progress</div>
          <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2 }}>{data.firstName}&apos;s Journey</div>
        </div>
        {/* Body */}
        <div style={{ background: "#fff", padding: "28px 32px 32px" }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Debt-free date</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#2563eb", lineHeight: 1 }}>{data.payoffDate}</div>
            <div style={{ fontSize: 14, color: "#94a3b8", marginTop: 4 }}>{data.monthsRemaining} months away</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
            <div style={{ background: "#f8fafc", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Total debt</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{data.totalDebt}</div>
            </div>
            <div style={{ background: "#f0fdf4", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Interest saved</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#16a34a" }}>{data.totalInterest}</div>
            </div>
          </div>
          <a
            href={`${appUrl}/register`}
            style={{ display: "block", textAlign: "center", padding: "12px 24px", background: "#2563eb", color: "#fff", borderRadius: 24, textDecoration: "none", fontSize: 14, fontWeight: 600 }}
          >
            Track your own debt at exhaledebt.com →
          </a>
        </div>
      </div>
      <p style={{ marginTop: 20, fontSize: 12, color: "#94a3b8" }}>Made with Exhale Debt · exhaledebt.com</p>
    </div>
  );
}
