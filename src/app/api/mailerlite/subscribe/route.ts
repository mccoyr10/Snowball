import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
    }

    const apiKey = process.env.MAILERLITE_API_KEY;
    const groupId = process.env.MAILERLITE_GROUP_ID;
    if (!apiKey || !groupId) {
      return NextResponse.json({ ok: false, error: "MailerLite not configured" }, { status: 500 });
    }

    const res = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
      },
      body: JSON.stringify({ email, groups: [groupId] }),
    });

    if (!res.ok && res.status !== 409) {
      const body = await res.text();
      console.error("MailerLite error", res.status, body);
      return NextResponse.json({ ok: false, error: "MailerLite API error" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("MailerLite subscribe error", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
