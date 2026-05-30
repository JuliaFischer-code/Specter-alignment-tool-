export const analyzeCheckIn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
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

    try {
      const { output } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        system,
        prompt: `Commitment + current check-in data:\n\n${userPayload}\n\nProduce the structured accountability analysis.`,
        output: Output.object({ schema: FindingSchema }),
      });

      console.log("AI RESPONSE");
      console.dir(output, { depth: null });

      return output;
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