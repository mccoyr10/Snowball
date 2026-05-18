import Stripe from "stripe";
import { getAdminDb } from "@/lib/firebase-admin";
import type { SubscriptionStatus } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return new Response("Stripe not configured", { status: 503 });
  }

  const stripe = new Stripe(stripeKey);
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature error:", err instanceof Error ? err.message : err);
    return new Response("Invalid signature", { status: 400 });
  }

  function stripeStatusToApp(status: string): SubscriptionStatus {
    if (status === "trialing") return "trialing";
    if (status === "active") return "active";
    if (status === "past_due") return "past_due";
    return "canceled";
  }

  const db = getAdminDb();

  // Resolve a Firestore user doc ref by customerId, cross-checking the uid from
  // metadata. Using customerId (from Stripe's side) as the authoritative lookup
  // prevents metadata-tampering from affecting arbitrary accounts.
  async function resolveUserRef(customerId: string, metaUid: string | undefined) {
    if (!customerId) return null;

    if (metaUid) {
      const userSnap = await db.doc(`users/${metaUid}`).get();
      if (userSnap.exists) {
        const stored = userSnap.data()?.stripeCustomerId as string | undefined;
        // Only trust metadata uid if the stored customerId matches or is unset
        if (!stored || stored === customerId) {
          return userSnap.ref;
        }
      }
    }

    // Fall back to a Firestore lookup by customerId
    const snap = await db.collection("users").where("stripeCustomerId", "==", customerId).limit(1).get();
    return snap.empty ? null : snap.docs[0].ref;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const metaUid = session.metadata?.firebaseUid;
        const ref = await resolveUserRef(customerId, metaUid);
        if (ref) {
          await ref.update({
            subscriptionStatus: "trialing" as SubscriptionStatus,
            trialStartedAt: new Date(),
            stripeCustomerId: customerId,
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const ref = await resolveUserRef(customerId, sub.metadata?.firebaseUid);
        if (ref) await ref.update({ subscriptionStatus: stripeStatusToApp(sub.status) });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const ref = await resolveUserRef(customerId, sub.metadata?.firebaseUid);
        if (ref) await ref.update({ subscriptionStatus: "canceled" as SubscriptionStatus });
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const ref = await resolveUserRef(customerId, undefined);
        if (ref) await ref.update({ subscriptionStatus: "past_due" as SubscriptionStatus });
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response("Handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
