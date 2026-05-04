import Anthropic from "@anthropic-ai/sdk";
import { MARKETING_SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import type { DailyBrief, ActivityContext, CommitContext, RawIdea, InstaSnapshot } from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Sonnet : meilleur rapport qualité/coût pour la génération créative longue
const MODEL = "claude-sonnet-4-6";

export async function generateDailyBrief(context: {
  activities: ActivityContext[];
  commits: CommitContext[];
  rawIdeas: RawIdea[];
  recentPosts: Array<{
    pillar: string | null;
    format: string | null;
    hook: string | null;
    published_at: string | null;
    likes: number | null;
  }>;
  instaSnapshot?: InstaSnapshot | null;
}): Promise<{
  brief: DailyBrief;
  meta: {
    model_used: string;
    tokens_in: number;
    tokens_out: number;
    generation_ms: number;
  };
}> {
  const start = Date.now();
  const todayDate = new Date().toISOString().split("T")[0];

  const userPrompt = buildUserPrompt({
    ...context,
    todayDate,
    instaSnapshot: context.instaSnapshot ?? null,
  });

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: MARKETING_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const generation_ms = Date.now() - start;

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Aucun bloc text dans la réponse Claude");
  }

  // Parsing JSON robuste (au cas où Claude enrobe en markdown)
  let raw = textBlock.text.trim();
  raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "");

  let brief: DailyBrief;
  try {
    brief = JSON.parse(raw) as DailyBrief;
  } catch (err) {
    console.error("[marketing] JSON parse error:", err);
    console.error("[marketing] Raw response:", raw);
    throw new Error("La réponse de l'agent n'est pas un JSON valide");
  }

  return {
    brief,
    meta: {
      model_used: MODEL,
      tokens_in: response.usage.input_tokens,
      tokens_out: response.usage.output_tokens,
      generation_ms,
    },
  };
}
