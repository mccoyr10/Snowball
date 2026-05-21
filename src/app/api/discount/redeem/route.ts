import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { Transaction } from "firebase-admin/firestore";

async function verifyToken(idToken: string): Promise<string | null> {
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const token = request.headers.get("Authorization")?.slice(7);
  const uid = token ? await verifyToken(token) : null;
  if (!uid) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { code?: string };
  const raw = body.code?.trim();
  if (!raw) return Response.json({ error: "Code is required." }, { status: 400 });

  const code = raw.toUpperCase();
  const db = getAdminDb();
  const codeRef = db.collection("discountCodes").doc(code);
  const userRef = db.collection("users").doc(uid);

  try {
    const result = await db.runTransaction(async (tx: Transaction) => {
      const [codeSnap, userSnap] = await Promise.all([tx.get(codeRef), tx.get(userRef)]);

      if (!codeSnap.exists) {
        return { error: "Code not found.", status: 404 };
      }

      const codeData = codeSnap.data()!;

      if (!codeData.isActive) {
        return { error: "This code is no longer active.", status: 400 };
      }

      if (codeData.expiresAt && (codeData.expiresAt as Timestamp).toDate() < new Date()) {
        return { error: "This code has expired.", status: 400 };
      }

      if (codeData.maxUses !== null && codeData.currentUses >= codeData.maxUses) {
        return { error: "This code has reached its maximum uses.", status: 400 };
      }

      const userData = userSnap.data();
      if (userData?.accessGrantedVia) {
        return { error: "You have already redeemed a promo code.", status: 409 };
      }

      tx.update(codeRef, { currentUses: FieldValue.increment(1) });

      if (codeData.type === "lifetime") {
        tx.update(userRef, {
          lifetimeAccess: true,
          accessGrantedVia: code,
        });
      } else {
        const days = (codeData.trialDays as number) || 30;
        const endsAt = Timestamp.fromDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
        tx.update(userRef, {
          extendedTrialEndsAt: endsAt,
          subscriptionStatus: "trialing",
          accessGrantedVia: code,
        });
      }

      return { type: codeData.type as string };
    });

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json({ success: true, type: result.type });
  } catch (err) {
    console.error("Discount redeem error:", err instanceof Error ? err.message : err);
    return Response.json({ error: "Failed to redeem code." }, { status: 500 });
  }
}
