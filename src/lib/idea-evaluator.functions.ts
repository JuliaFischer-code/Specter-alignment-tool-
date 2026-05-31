import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createOpenRouterProvider } from "./ai-gateway.server";

const Input = z.object({
  problem: z.string(),
  whoHasIt: z.string(),
  experiment: z.string(),
  willingToRisk: z.string(),
  goSignal: z.string(),
  stopSignal: z.string(),
});

export const EvaluationSchema = z.object({
  verdict: z.enum(["pursue", "pause", "drop"]),
  verdictReason: z.string(),
  problemStrength: z.enum(["strong", "weak", "unclear"]),
  experimentQuality: z.enum(["sharp", "vague", "too big"]),
  biggestBlindspot: z.string(),
  mentorNote: z.string(),
});

export type MentorEvaluation = z.infer<typeof EvaluationSchema>;

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

export const evaluateIdea = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<MentorEvaluation> => {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error("Missing OPENROUTER_API_KEY");

    const gateway = createOpenRouterProvider(key);

    const system = `You are a startup mentor at a top accelerator (YC, Antler, Sequoia Scout). You evaluate early-stage ideas from engineers inside large companies. You are direct, honest, and never waste their time with vague encouragement. Your job is to tell them if this idea is worth one week of their life — and exactly why.`;

    const schemaInstructions = `Return only a valid JSON object with this exact shape:
{
  "verdict": "pursue" | "pause" | "drop",
  "verdictReason": "one sharp sentence, max 20 words",
  "problemStrength": "strong" | "weak" | "unclear",
  "experimentQuality": "sharp" | "vague" | "too big",
  "biggestBlindspot": "one thing they haven't considered that could kill this, max 25 words",
  "mentorNote": "2-3 sentences in direct mentor voice, no fluff, ends with a concrete next action"
}
Do not wrap the JSON in markdown.`;

    try {
      const { text } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        system,
        prompt: `Evaluate this one-week experiment idea:\n\n${JSON.stringify(data, null, 2)}\n\n${schemaInstructions}`,
      });

      console.log("IDEA EVALUATOR RESPONSE:", text);
      return EvaluationSchema.parse(parseJsonObject(text));
    } catch (error) {
      console.error("IDEA EVALUATOR ERROR:", error);
      return {
        verdict: "pause",
        verdictReason: "Evaluation unavailable — review the idea manually.",
        problemStrength: "unclear",
        experimentQuality: "vague",
        biggestBlindspot: "Could not complete AI analysis. Check OpenRouter API key and try again.",
        mentorNote:
          "AI evaluation could not be completed. Verify your OpenRouter API key is set and the model is accessible, then reload this page.",
      };
    }
  });
