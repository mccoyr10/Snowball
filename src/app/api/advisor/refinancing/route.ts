import { verifyAdvisorRequest, buildAnthropicClient } from "@/lib/advisorApiHelper";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface DebtInput {
  name: string;
  apr: number;
  balance: number;
}

interface RefinancingOpportunity {
  debtName: string;
  currentApr: number;
  refinanceRate: number;
  monthlyInterestSaved: number;
  annualInterestSaved: number;
  breakEvenMonths: number;
  recommendation: string;
}

const DEFAULT_MARKET_RATES = {
  creditCard: { low: 7.5, high: 12.0, label: "Personal loan (to refi card)" },
  autoLoan: { low: 5.0, high: 7.5, label: "Auto loan refinance" },
  studentLoan: { low: 4.5, high: 7.0, label: "Student loan refinance" },
  personalLoan: { low: 8.0, high: 14.0, label: "Personal loan" },
  mortgage: { low: 6.25, high: 7.25, label: "Mortgage refinance" },
};

function getMarketRates() {
  if (process.env.REFINANCING_REFERENCE_RATES) {
    try {
      return JSON.parse(process.env.REFINANCING_REFERENCE_RATES);
    } catch {
      console.warn("REFINANCING_REFERENCE_RATES env var is invalid JSON, using defaults");
    }
  }
  return DEFAULT_MARKET_RATES;
}

export async function POST(request: Request) {
  const auth = await verifyAdvisorRequest(request);
  if (auth instanceof Response) return auth;

  let debts: DebtInput[];
  try {
    const body = await request.json() as { debts: DebtInput[] };
    debts = body.debts?.slice(0, 15) ?? [];
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const marketRates = getMarketRates();
  const client = buildAnthropicClient();

  const prompt = `You are a financial analyst identifying refinancing opportunities.

Debts to analyze:
${JSON.stringify(debts, null, 2)}

Current approximate market reference rates (illustrative only):
${JSON.stringify(marketRates, null, 2)}

For each debt where refinancing could save meaningful money (current APR significantly above market rate for that debt type), calculate the opportunity. Only include debts where refinancing makes financial sense.

Return ONLY valid JSON (no markdown, no code fences):
{
  "opportunities": [
    {
      "debtName": "...",
      "currentApr": 24.99,
      "refinanceRate": 9.5,
      "monthlyInterestSaved": 85.50,
      "annualInterestSaved": 1026.0,
      "breakEvenMonths": 3,
      "recommendation": "Strong candidate — refinancing to a personal loan at ~9-10% could save you over $1,000/year."
    }
  ],
  "ratesAsOfNote": "Reference rates are illustrative as of early 2025. Shop multiple lenders to confirm current offers for your credit profile."
}

If no debts qualify, return { "opportunities": [], "ratesAsOfNote": "..." }`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const cleaned = text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(cleaned) as { opportunities: RefinancingOpportunity[]; ratesAsOfNote: string };
    if (!Array.isArray(parsed.opportunities)) throw new Error("Invalid structure");
    return Response.json(parsed);
  } catch {
    return Response.json({ error: "Refinancing analysis failed. Please try again." }, { status: 500 });
  }
}
