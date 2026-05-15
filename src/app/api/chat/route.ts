import Anthropic from "@anthropic-ai/sdk";

const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_CONTEXT_LENGTH = 2000;

async function verifyFirebaseToken(idToken: string): Promise<boolean> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return false;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  // Verify Firebase auth token
  const authHeader = request.headers.get("Authorization");
  const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken || !(await verifyFirebaseToken(idToken))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Chat advisor is not configured on this server." }, { status: 503 });
  }

  let messages: { role: string; content: string }[];
  let context: unknown;
  try {
    ({ messages, context } = await request.json());
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Input validation
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return Response.json({ error: "Invalid messages." }, { status: 400 });
  }
  for (const m of messages) {
    if (typeof m.content !== "string" || m.content.length > MAX_MESSAGE_LENGTH) {
      return Response.json({ error: "Message too long." }, { status: 400 });
    }
    if (m.role !== "user" && m.role !== "assistant") {
      return Response.json({ error: "Invalid message role." }, { status: 400 });
    }
  }
  const contextStr = JSON.stringify(context ?? {});
  if (contextStr.length > MAX_CONTEXT_LENGTH) {
    return Response.json({ error: "Context too large." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const systemPrompt = `You are a helpful, encouraging financial advisor inside a debt snowball tracker app.
The user's current debt situation:
${contextStr}

Answer what-if questions, explain payoff strategies, and provide motivation.
Be concise and actionable. Format dollar amounts clearly. Keep responses under 200 words unless a detailed breakdown is requested.`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const reply = response.content[0]?.type === "text" ? response.content[0].text : "";
    return Response.json({ reply });
  } catch (err) {
    console.error("Anthropic API error:", err instanceof Error ? err.name : "unknown");
    return Response.json({ error: "Advisor temporarily unavailable. Please try again." }, { status: 500 });
  }
}
