import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createOpenRouterProvider } from "./ai-gateway.server";

const Input = z.object({
  pdfText: z.string().min(1),
});

const ExtractedAnswers = z.object({
  pilotName: z.string().describe("Name or working title of the AI pilot"),
  sponsor: z.string().describe("Name, role, and business unit of the accountable sponsor"),
  hypothesis: z.string().describe("What the team believes AI will change"),
  budgetCeiling: z.string().describe("Maximum budget or resources the team can afford to lose"),
  timeBox: z.string().describe("How long before the team walks away if it isn't working"),
  reputationalRisk: z.string().describe("Reputational exposure if the pilot fails publicly"),
  opportunityCost: z.string().describe("What the team is choosing NOT to do during this pilot"),
  killCriteria: z.string().describe("Specific conditions that would trigger stopping the pilot early"),
  successSignals: z.string().describe("What 'worth continuing' looks like — concrete signals"),
});

export type PdfExtractResult = {
  answers: Partial<z.infer<typeof ExtractedAnswers>>;
  missing: (keyof z.infer<typeof ExtractedAnswers>)[];
};

export const extractFromPdf = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<PdfExtractResult> => {
    const key = process.env.OPENROUTER_API_KEY;

    console.log("PDF Intake using OpenRouter");
    console.log("Key exists:", !!key);

    if (!key) {
      throw new Error("Missing OPENROUTER_API_KEY");
    }

    const gateway = createOpenRouterProvider(key);

    const system = `You are extracting structured information from a business document to pre-fill a pre-commitment form for an AI pilot.

Extract exactly what is stated in the document. Do not invent or infer beyond what is written.
If a field cannot be answered from the document, return an empty string "" for that field.
Be concise — these are form field answers, not paragraphs.`;

    const prompt = `Extract answers to the following nine questions from this document. Return only what is explicitly stated or clearly implied. Use "" for anything not found.

Questions:
1. pilotName — What is the AI pilot called?
2. sponsor — Who is the accountable sponsor (name, role, business unit)?
3. hypothesis — What does the team believe AI will change here?
4. budgetCeiling — What is the maximum the team can afford to lose (budget/resources)?
5. timeBox — How long before the team walks away if it isn't working?
6. reputationalRisk — What is the reputational exposure if this fails?
7. opportunityCost — What is the team choosing NOT to do during this pilot?
8. killCriteria — What specific conditions would trigger stopping the pilot early?
9. successSignals — What does "worth continuing" look like?

Document:
${data.pdfText}`;

    try {
      const { output } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        system,
        prompt,
        output: Output.object({ schema: ExtractedAnswers }),
      });

      const missing = (Object.keys(output) as (keyof typeof output)[]).filter(
        (k) => !output[k] || output[k].trim() === "",
      );

      return {
        answers: output,
        missing,
      };
    } catch (error) {
      console.error("PDF INTAKE ERROR:", error);

      return {
        answers: {},
        missing: [
          "pilotName",
          "sponsor",
          "hypothesis",
          "budgetCeiling",
          "timeBox",
          "reputationalRisk",
          "opportunityCost",
          "killCriteria",
          "successSignals",
        ],
      };
    }
  });
