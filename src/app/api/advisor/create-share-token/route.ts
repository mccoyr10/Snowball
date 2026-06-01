import { verifyAdvisorRequest } from "@/lib/advisorApiHelper";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

interface ShareData {
  firstName: string;
  payoffDate: string;
  monthsRemaining: number;
  totalDebt: string;
  totalInterest: string;
}

export async function POST(request: Request) {
  const auth = await verifyAdvisorRequest(request);
  if (auth instanceof Response) return auth;
  const { uid } = auth;

  let shareData: ShareData;
  try {
    shareData = await request.json() as ShareData;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Sanitize
  const safe: ShareData = {
    firstName: String(shareData.firstName || "").slice(0, 50),
    payoffDate: String(shareData.payoffDate || "").slice(0, 30),
    monthsRemaining: Number(shareData.monthsRemaining) || 0,
    totalDebt: String(shareData.totalDebt || "").slice(0, 20),
    totalInterest: String(shareData.totalInterest || "").slice(0, 20),
  };

  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);

  const db = getAdminDb();
  await Promise.all([
    db.doc(`users/${uid}/shareCard/current`).set({ ...safe, token, updatedAt: FieldValue.serverTimestamp() }),
    db.doc(`shareTokens/${token}`).set({ uid, createdAt: FieldValue.serverTimestamp() }),
  ]);

  return Response.json({ token });
}
