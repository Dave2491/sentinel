export type TreasuryRationaleContext = {
  strategy: string;
  confidence: number;
  stance: string;
  policyStatus: string;
  liquidityCondition: string;
  reservePosture: string;
  apyContext: string;
  recommendation: string;
  expectedImpact: string;
};

export type TreasuryRationaleResult = {
  text: string;
  source: "ai" | "deterministic";
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "openrouter/free";

export function buildDeterministicTreasurySummary(context: TreasuryRationaleContext) {
  return `${context.reservePosture} while ${context.strategy} remains ${context.policyStatus.toLowerCase()} with ${context.liquidityCondition.toLowerCase()}, supporting ${context.recommendation.toLowerCase()}.`;
}

export async function fetchAiTreasuryRationale(
  context: TreasuryRationaleContext,
  signal?: AbortSignal,
): Promise<TreasuryRationaleResult> {
  const fallback = buildDeterministicTreasurySummary(context);
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;

  if (!apiKey) {
    return { text: fallback, source: "deterministic" };
  }

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "Sentinel Treasury Intelligence",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: "system",
            content:
                "You are an institutional treasury risk analyst writing for DAO governance review. Explain only the deterministic policy signal provided. Use formal, audit-ready language. Do not sound conversational. Do not say you are AI. Do not imply autonomous execution authority. Keep the response to one sentence under 34 words.",
          },
          {
            role: "user",
            content: JSON.stringify({
              instruction:
                  "Write a concise treasury rationale for this recommendation. Focus on policy alignment, reserve posture, liquidity conditions, and risk controls. Do not introduce new facts, predictions, investment advice, or execution authority.",
              context,
            }),
          },
        ],
        temperature: 0.2,
        max_tokens: 90,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter responded with ${response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = sanitizeRationale(payload.choices?.[0]?.message?.content);

    return text ? { text, source: "ai" } : { text: fallback, source: "deterministic" };
  } catch {
    return { text: fallback, source: "deterministic" };
  }
}

function sanitizeRationale(value: string | undefined) {
  if (!value) return "";

  return value
    .replace(/\s+/g, " ")
    .replace(/^["']|["']$/g, "")
    .trim()
    .slice(0, 260);
}
