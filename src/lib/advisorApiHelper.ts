import Anthropic from "@anthropic-ai/sdk";
import { getAdminAuth } from "@/lib/firebase-admin";

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

export async function verifyAdvisorRequest(request: Request): Promise<{ uid: string } | Response> {
  const token = request.headers.get("Authorization")?.slice(7);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit(uid)) {
    return Response.json({ error: "Too many requests. Please wait before generating more." }, { status: 429 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Advisor not configured on this server." }, { status: 503 });
  }

  return { uid };
}

export function buildAnthropicClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}
