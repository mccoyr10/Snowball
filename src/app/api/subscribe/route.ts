export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const apiKey = process.env.MAILERLITE_API_KEY;
  const groupId = process.env.MAILERLITE_GROUP_ID;

  // Silently succeed if MailerLite isn't configured — never block the app flow
  if (!apiKey) return Response.json({ ok: true });

  let email: string;
  let name: string | undefined;
  try {
    const body = await request.json() as { email?: unknown; name?: unknown };
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : undefined;
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Invalid email" }, { status: 400 });
  }

  const payload: Record<string, unknown> = { email };
  if (name) payload.fields = { name };
  if (groupId) payload.groups = [groupId];

  try {
    await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("MailerLite subscribe error:", err instanceof Error ? err.message : err);
  }

  // Always return success — a MailerLite failure must never break signup
  return Response.json({ ok: true });
}
