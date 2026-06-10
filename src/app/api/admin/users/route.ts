import { getAdminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function GET(request: Request) {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) return Response.json({ error: "Admin API not configured." }, { status: 503 });
  if (request.headers.get("Authorization") !== `Bearer ${adminKey}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const snap = await db.collection("users").orderBy("createdAt", "desc").get();

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const statusCounts: Record<string, number> = {};
  let newLast7 = 0;
  let newLast30 = 0;
  let lifetimeCount = 0;

  const users = snap.docs.map((d) => {
    const data = d.data();
    const createdAtMs =
      data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : null;

    const status: string = data.lifetimeAccess
      ? "lifetime"
      : (data.subscriptionStatus ?? "none");

    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    if (data.lifetimeAccess) lifetimeCount++;
    if (createdAtMs) {
      if (createdAtMs >= sevenDaysAgo) newLast7++;
      if (createdAtMs >= thirtyDaysAgo) newLast30++;
    }

    return {
      uid: d.id,
      email: data.email ?? null,
      displayName: data.displayName ?? null,
      subscriptionStatus: data.subscriptionStatus ?? null,
      lifetimeAccess: data.lifetimeAccess ?? false,
      accessGrantedVia: data.accessGrantedVia ?? null,
      stripeCustomerId: data.stripeCustomerId ?? null,
      createdAt: createdAtMs,
      trialStartedAt:
        data.trialStartedAt instanceof Timestamp
          ? data.trialStartedAt.toMillis()
          : null,
    };
  });

  return Response.json({
    stats: {
      total: users.length,
      newLast7,
      newLast30,
      lifetimeCount,
      byStatus: statusCounts,
    },
    users,
  });
}
