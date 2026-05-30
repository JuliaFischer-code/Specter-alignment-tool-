import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createOpenRouterProvider } from "./ai-gateway.server";

const Status = z.enum(["on-track", "watch", "breach"]);

const DimensionInput = z.object({
  key: z.string(),
  label: z.string(),
  original: z.string(),
  current: z.string(),
  selfScore: Status.optional(),
  notes: z.string().optional(),
});

const Input = z.object({
  pilotName: z.string(),
  sponsor: z.string(),
  hypothesis: z.string(),
  killCriteria: z.string(),
  successSignals: z.string(),
  dimensions: z.array(DimensionInput),
});

const FindingSchema = z.object({
  dimensions: z.array(
    z.object({
      key: z.string(),
      verdict: Status,
      driftSummary: z.string(),
    }),
  ),
  violatedKillCriteria: z.array(z.string()),
  overallVerdict: Status,
  headline: z.string(),
  accountabilityResponse: z.string(),
});

export type CheckInAnalysis = z.infer<typeof FindingSchema>;

function parseJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonText = fenced?.[1] ?? text;
  const firstBrace = jsonText.indexOf("{");
  const lastBrace = jsonText.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("AI response did not contain a JSON object.");
  }

  return JSON.parse(jsonText.slice(firstBrace, lastBrace + 1));
}

export const analyzeCheckIn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<CheckInAnalysis> => {
    const key = process.env.OPENROUTER_API_KEY;

    console.log("Using OpenRouter");
    console.log("Key exists:", !!key);

    if (!key) {
      throw new Error("Missing OPENROUTER_API_KEY");
    }

    const gateway = createOpenRouterProvider(key);

    const system = `You are a disciplined pilot-governance reviewer in the tradition of effectuation and affordable-loss reasoning. Your job is NOT to summarize. Your job is to hold the team accountable to the commitment they wrote at kickoff.

Rules:
- Compare each CURRENT value against the ORIGINAL commitment value for the same dimension.
- Quantify drift whenever values are numeric (money, %, time). Format like "+180%" or "-25%" or "8 of 12 weeks elapsed".
- A dimension is BREACH if the current value crosses the original ceiling/limit, or if a documented kill criterion is now true. WATCH if drift is material but inside the line. ON-TRACK only if clearly within commitment.
- Read the kill criteria literally. List every one that is now triggered by the current values.
- The accountability response must be blunt, specific, and end with a directive: "stop", "explicitly recommit to a new written ceiling of X", or "continue inside the existing envelope".
- Do not soften. Do not invent data. If a current value is missing, say so.`;

    const userPayload = JSON.stringify(
      {
        pilot: data.pilotName,
        sponsor: data.sponsor,
        hypothesis: data.hypothesis,
        killCriteria: data.killCriteria,
        successSignals: data.successSignals,
        dimensions: data.dimensions,
      },
      null,
      2,
    );

    const schemaInstructions = `Return only a valid JSON object with this exact shape:
{
  "dimensions": [
    {
      "key": "budgetCeiling | timeBox | killCriteria | reputationalRisk | opportunityCost",
      "verdict": "on-track | watch | breach",
      "driftSummary": "short specific analysis for this dimension"
    }
  ],
  "violatedKillCriteria": ["triggered kill criterion text, or []"],
  "overallVerdict": "on-track | watch | breach",
  "headline": "short accountability headline",
  "accountabilityResponse": "blunt directive ending with stop, explicitly recommit to a new written ceiling of X, or continue inside the existing envelope"
}

Do not wrap the JSON in markdown. Include one dimensions entry for every input dimension key.`;

    try {
      const { text } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        system,
        prompt: `Commitment + current check-in data:\n\n${userPayload}\n\n${schemaInstructions}`,
      });

      console.log("AI RESPONSE");
      console.dir(text, { depth: null });

      const parsed = FindingSchema.parse(parseJsonObject(text));
      return parsed;
    } catch (error) {
      console.error("CHECK-IN ERROR:", error);

      return {
        dimensions: [],
        violatedKillCriteria: [],
        overallVerdict: "watch",
        headline: "Analysis unavailable",
        accountabilityResponse:
          "AI analysis could not be completed. Please verify the OpenRouter API key, model access, and response schema.",
      };
    }
  });
