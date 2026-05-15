import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: Request) {
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

  if (!messages?.length) {
    return Response.json({ error: "No messages provided." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const systemPrompt = `You are a helpful, encouraging financial advisor inside a debt snowball tracker app.
The user's current debt situation:
${JSON.stringify(context, null, 2)}

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
    const message = err instanceof Error ? err.message : String(err);
    console.error("Anthropic API error:", message);
    return Response.json({ error: `Advisor error: ${message}` }, { status: 500 });
  }
}
