import Stripe from "stripe";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

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
