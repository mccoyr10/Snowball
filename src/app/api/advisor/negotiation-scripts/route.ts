import { verifyAdvisorRequest, buildAnthropicClient } from "@/lib/advisorApiHelper";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface DebtInput {
  name: string;
  apr: number;
  balance: number;
}

interface NegotiationScript {
  debtName: string;
  currentApr: number;
  targetApr: number;
  openingLine: string;
  requestStatement: string;
  pushbackResponse: string;
  closing: string;
  proTips: string[];
}

export async function POST(request: Request) {
  const auth = await verifyAdvisorRequest(request);
  if (auth instanceof Response) return auth;

  let debts: DebtInput[];
  try {
    const body = await request.json() as { debts: DebtInput[] };
    debts = body.debts?.slice(0, 10) ?? [];
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const qualifying = debts.filter(d => d.apr > 15);
  if (qualifying.length === 0) {
    return Response.json({ scripts: [] });
  }

  const client = buildAnthropicClient();

  const prompt = `Generate word-for-word phone call scripts for negotiating lower APRs on these debts:
${JSON.stringify(qualifying, null, 2)}

For each debt, create a complete script a real person would use to call their lender and request a rate reduction.

Return ONLY a valid JSON object (no markdown, no code fences):
{
  "scripts": [
    {
      "debtName": "Chase Freedom",
      "currentApr": 24.99,
      "targetApr": 18.0,
      "openingLine": "Hi, my name is [your name] and I've been a customer since...",
      "requestStatement": "I'd like to request a reduction in my interest rate from 24.99% to around 18%...",
      "pushbackResponse": "I understand. In that case, I'd like to ask if there's a hardship program...",
      "closing": "Thank you for your time. Could I get a reference number for this call?",
      "proTips": ["Call on a weekday morning when hold times are shorter", "Mention any competing offers you have"]
    }
  ]
}

Make scripts natural, confident, and specific to each debt name and APR. targetApr should be ~5-8% lower than current.`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text.trim()) as { scripts: NegotiationScript[] };
    if (!Array.isArray(parsed.scripts)) throw new Error("Invalid structure");
    return Response.json({ scripts: parsed.scripts });
  } catch {
    return Response.json({ error: "Script generation failed. Please try again." }, { status: 500 });
  }
}
