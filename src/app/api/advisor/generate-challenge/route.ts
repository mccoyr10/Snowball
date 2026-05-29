import { verifyAdvisorRequest, buildAnthropicClient } from "@/lib/advisorApiHelper";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface ChallengeTask {
  id: string;
  week: number;
  description: string;
  estimatedSavings: number;
}

export async function POST(request: Request) {
  const auth = await verifyAdvisorRequest(request);
  if (auth instanceof Response) return auth;
  const { uid } = auth;

  let body: { debts?: unknown; settings?: unknown; summary?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const client = buildAnthropicClient();
  const contextStr = JSON.stringify(body).slice(0, 3000);

  const prompt = `You are generating a personalized 30-day debt payoff challenge.

User's debt data: ${contextStr}

Generate exactly 30 tasks spread across 4 weeks (weeks 1-4, ~7-8 tasks each).
Each task should be specific to this user's actual debt names, balances, and budget.
Tasks should be actionable micro-challenges like "Cancel one unused subscription and redirect $X to [debt name]".

Return ONLY a valid JSON object with this exact structure (no markdown, no code fences):
{
  "tasks": [
    { "id": "t1", "week": 1, "description": "...", "estimatedSavings": 25 },
    ...
  ]
}

estimatedSavings is in dollars per month. Make tasks realistic and specific.`;

  let tasks: ChallengeTask[];
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text.trim()) as { tasks: ChallengeTask[] };
    if (!Array.isArray(parsed.tasks)) throw new Error("Invalid structure");
    tasks = parsed.tasks;
  } catch {
    return Response.json({ error: "Challenge generation failed. Please try again." }, { status: 500 });
  }

  try {
    const db = getAdminDb();
    await db.doc(`users/${uid}/advisorChallenge/current`).set(
      { tasks, generatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
  } catch {
    // Store failed but we still return the data
  }

  return Response.json({ tasks });
}
