import Stripe from "stripe";
import { getAdminDb } from "@/lib/firebase-admin";

async function verifyFirebaseToken(idToken: string): Promise<string | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.users?.[0]?.localId ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const token = request.headers.get("Authorization")?.slice(7);
  const uid = token ? await verifyFirebaseToken(token) : null;
  if (!uid) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return Response.json({ error: "Stripe is not configured." }, { status: 503 });

  const db = getAdminDb();
  const userSnap = await db.doc(`users/${uid}`).get();
  if (!userSnap.exists) return Response.json({ error: "User not found." }, { status: 404 });

  const stripeCustomerId = userSnap.data()?.stripeCustomerId as string | undefined;
  if (!stripeCustomerId) {
    return Response.json({ error: "No active subscription found." }, { status: 400 });
  }

  const stripe = new Stripe(stripeKey);

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "all",
      limit: 5,
    });

    const active = subscriptions.data.find(
      (s: { id: string; status: string }) => s.status === "active" || s.status === "trialing"
    );

    if (!active) {
      return Response.json({ error: "No active subscription to cancel." }, { status: 400 });
    }

    await stripe.subscriptions.update(active.id, { cancel_at_period_end: true });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Cancel subscription error:", err instanceof Error ? err.message : err);
    return Response.json({ error: "Could not cancel subscription." }, { status: 500 });
  }
}
