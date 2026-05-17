import Stripe from "stripe";

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
  const priceId = process.env.STRIPE_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://snowball.netlify.app";

  if (!stripeKey || !priceId) {
    return Response.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const stripe = new Stripe(stripeKey);

  try {
    const { email } = await request.json();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_collection: "always",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { firebaseUid: uid },
      },
      customer_email: email,
      success_url: `${appUrl}/dashboard?subscribed=true`,
      cancel_url: `${appUrl}/dashboard`,
      metadata: { firebaseUid: uid },
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err instanceof Error ? err.message : err);
    return Response.json({ error: "Could not create checkout session." }, { status: 500 });
  }
}
