import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export async function GET(request: Request) {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) return Response.json({ error: "Admin API not configured." }, { status: 503 });
  if (request.headers.get("Authorization") !== `Bearer ${adminKey}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const snap = await db.collection("discountCodes").orderBy("createdAt", "desc").get();
  const codes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return Response.json({ codes });
}

export async function POST(request: Request) {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    return Response.json({ error: "Admin API not configured." }, { status: 503 });
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${adminKey}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as {
    code?: string;
    type?: string;
    trialDays?: number;
    maxUses?: number | null;
    purpose?: string;
    expiresAt?: string | null;
  };

  const { code, type, trialDays, maxUses, purpose, expiresAt } = body;

  if (!code || !type || !purpose) {
    return Response.json({ error: "code, type, and purpose are required." }, { status: 400 });
  }
  if (!["lifetime", "extended_trial"].includes(type)) {
    return Response.json({ error: "type must be 'lifetime' or 'extended_trial'." }, { status: 400 });
  }
  if (type === "extended_trial" && (!trialDays || trialDays < 1)) {
    return Response.json({ error: "trialDays is required for extended_trial codes." }, { status: 400 });
  }

  const normalizedCode = code.trim().toUpperCase();
  const db = getAdminDb();
  const ref = db.collection("discountCodes").doc(normalizedCode);

  const existing = await ref.get();
  if (existing.exists) {
    return Response.json({ error: `Code '${normalizedCode}' already exists.` }, { status: 409 });
  }

  const data: Record<string, unknown> = {
    type,
    maxUses: maxUses ?? null,
    currentUses: 0,
    isActive: true,
    purpose,
    expiresAt: expiresAt ? Timestamp.fromDate(new Date(expiresAt)) : null,
    createdAt: FieldValue.serverTimestamp(),
  };
  if (type === "extended_trial") data.trialDays = trialDays;

  await ref.set(data);

  return Response.json({ success: true, code: normalizedCode });
}
