import Stripe from "stripe";
import { setSubscriptionStatus } from "@/lib/firestore";
import type { SubscriptionStatus } from "@/types";

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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const uid = session.metadata?.firebaseUid;
        const customerId = session.customer as string;
        if (uid) await setSubscriptionStatus(uid, "active", customerId);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const uid = sub.metadata?.firebaseUid;
        if (uid) await setSubscriptionStatus(uid, stripeStatusToApp(sub.status));
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const uid = sub.metadata?.firebaseUid;
        if (uid) await setSubscriptionStatus(uid, "canceled");
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        // Look up uid via customer — handled when subscription.updated fires
        console.warn("Payment failed for customer:", customerId);
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response("Handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
