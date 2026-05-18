import Anthropic from "@anthropic-ai/sdk";
import { getAdminAuth } from "@/lib/firebase-admin";

const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_CONTEXT_LENGTH = 2000;

function sanitizeString(v: unknown, maxLen = 200): string | undefined {
  if (typeof v !== "string") return undefined;
  return v.slice(0, maxLen);
}

function sanitizeContext(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const ctx = raw as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  if (typeof ctx.monthlyBudget === "string") result.monthlyBudget = sanitizeString(ctx.monthlyBudget);
  if (typeof ctx.totalDebt === "string") result.totalDebt = sanitizeString(ctx.totalDebt);
  if (typeof ctx.projectedPayoff === "string") result.projectedPayoff = sanitizeString(ctx.projectedPayoff);
  if (typeof ctx.monthsRemaining === "number") result.monthsRemaining = ctx.monthsRemaining;
  if (typeof ctx.totalInterest === "string") result.totalInterest = sanitizeString(ctx.totalInterest);

  if (Array.isArray(ctx.debts)) {
    result.debts = ctx.debts.slice(0, 20).map((d: unknown) => {
      if (!d || typeof d !== "object" || Array.isArray(d)) return {};
      const debt = d as Record<string, unknown>;
      return {
        name: sanitizeString(debt.name),
        balance: sanitizeString(debt.balance),
        apr: sanitizeString(debt.apr),
        minPayment: sanitizeString(debt.minPayment),
      };
    });
  }

  return result;
}

// Per-user rate limiting: max 30 requests per hour
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(uid: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(uid);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateLimitMap.set(uid, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

async function verifyToken(idToken: string): Promise<string | null> {
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const uid = await verifyToken(idToken);
  if (!uid) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (!checkRateLimit(uid)) {
    return Response.json({ error: "Too many requests. Please wait before sending more messages." }, { status: 429 });
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
  // Sanitize context: only allow the known fields the frontend sends.
  // This prevents prompt injection via unexpected context keys.
  const safeContext = sanitizeContext(context);
  const contextStr = JSON.stringify(safeContext);
  if (contextStr.length > MAX_CONTEXT_LENGTH) {
    return Response.json({ error: "Context too large." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const systemPrompt = `You are a helpful, encouraging financial advisor inside a debt snowball tracker app.
The user's current debt situation (verified app data):
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
