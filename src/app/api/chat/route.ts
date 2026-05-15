import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Chat is not configured on this server." }, { status: 503 });
  }

  try {
    const { messages, context } = await request.json();

    const client = new Anthropic({ apiKey });

    const systemPrompt = `You are a helpful, encouraging financial advisor inside a debt snowball tracker app.
The user's current debt situation:
${JSON.stringify(context, null, 2)}

Answer what-if questions, explain payoff strategies, and provide motivation.
Be concise and actionable. Format dollar amounts clearly. Keep responses under 200 words unless a detailed breakdown is requested.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const content = response.content[0].type === "text" ? response.content[0].text : "";
    return Response.json({ content });
  } catch (err) {
    console.error("Chat API error:", err);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
