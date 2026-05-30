import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const DimensionInput = z.object({
  key: z.string(),
  label: z.string(),
  original: z.string(),
  current: z.string(),
  selfScore: z.enum(["on-track", "watch", "breach"]).optional(),
  notes: z.string().optional(),
});

const Input = z.object({
  pilotName: z.string(),
  sponsor: z.string(),
  hypothesis: z.string(),
  killCriteria: z.string(),
  successSignals: z.string(),
  dimensions: z.array(DimensionInput).min(1),
});

const FindingSchema = z.object({
  dimensions: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      verdict: z.enum(["on-track", "watch", "breach"]),
      driftSummary: z
        .string()
        .describe(
          "Short factual delta vs original. Include numeric drift like '+180%' when the values are numeric.",
        ),
    }),
  ),
  violatedKillCriteria: z
    .array(z.string())
    .describe("Specific kill criteria from the original commitment that are now triggered. Empty if none."),
  overallVerdict: z.enum(["on-track", "watch", "breach"]),
  headline: z
    .string()
    .describe(
      "One sentence accountability statement, e.g. 'You exceeded your original Affordable Loss commitment.'",
    ),
  accountabilityResponse: z
    .string()
    .describe(
      "Plain-text accountability response in the BCG/operator voice. Must explicitly compare original vs current, name the drift, and end with a clear directive: stop, recommit (with new written ceiling), or continue. Use line breaks. No markdown.",
    ),
});

export type CheckInAnalysis = z.infer<typeof FindingSchema>;

export const analyzeCheckIn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

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

    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system,
      prompt: `Commitment + current check-in data:\n\n${userPayload}\n\nProduce the structured accountability analysis.`,
      output: Output.object({ schema: FindingSchema }),
    });

    return output;
  });