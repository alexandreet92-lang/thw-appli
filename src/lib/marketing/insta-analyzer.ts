import Anthropic from "@anthropic-ai/sdk";
import type { InstaInsights } from "./types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const MODEL = "claude-sonnet-4-6";

const INSTA_SYSTEM_PROMPT = `Tu es un expert en analyse de statistiques Instagram.
Tu analyses des screenshots de l'interface Insights d'Instagram et tu extrais toutes les métriques visibles.

Tu dois retourner un JSON valide, sans markdown, avec la structure exacte suivante :

{
  "reach_total": number | null,
  "impressions_total": number | null,
  "profile_visits": number | null,
  "followers_count": number | null,
  "followers_delta_7d": number | null,
  "top_posts": [
    {
      "caption_excerpt": "texte partiel visible",
      "format": "reel" | "carousel" | "photo",
      "likes": number,
      "saves": number,
      "reach": number,
      "comments": number (optionnel)
    }
  ],
  "audience_demographics": {
    "age_groups": { "18-24": 23, "25-34": 41, ... } | null,
    "gender": { "homme": 62, "femme": 38 } | null,
    "top_locations": ["Paris", "Lyon", ...] | null
  } | null,
  "insights_summary": "Résumé textuel en 2-3 phrases des tendances clés",
  "best_format": "reel" | "carousel" | "photo" | null,
  "best_posting_times": { "lundi_18h": 4.2, "mardi_07h": 3.8 } | null,
  "period_start": "YYYY-MM-DD" | null,
  "period_end": "YYYY-MM-DD" | null,
  "raw_extracted_text": "Tout le texte brut extrait des screenshots",
  "ambiguities": ["Liste des données floues ou illisibles"]
}

Règles d'extraction :
- Si un chiffre n'est pas visible → null
- Pour les top posts : extrait tous ceux visibles (max 5)
- Pour format : "reel" si icône vidéo, "carousel" si icône multi-images, "photo" sinon
- best_format : le format qui génère le plus de reach ou d'engagement selon les données
- raw_extracted_text : copie verbatim tout le texte lisible (chiffres, labels, dates, captions partielles)
- ambiguities : note ce qui est flou, coupé, ou incertain
- insights_summary : synthèse stratégique actionnable pour un créateur de contenu sport`;

/**
 * Analyse des screenshots Instagram Insights via Claude Vision.
 * @param images Array de data URLs (data:image/jpeg;base64,...)
 */
export async function analyzeInstaScreenshots(
  images: string[]
): Promise<InstaInsights> {
  if (images.length === 0) {
    throw new Error("Aucune image fournie");
  }

  // Build content blocks: image blocks + final instruction
  const imageBlocks: Anthropic.ImageBlockParam[] = images.map((dataUrl) => {
    // Strip data: prefix → get media_type + base64
    const commaIdx = dataUrl.indexOf(",");
    if (commaIdx === -1 || !dataUrl.startsWith("data:image/")) {
      throw new Error(`Format d'image invalide : ${dataUrl.substring(0, 50)}`);
    }
    const header = dataUrl.substring(0, commaIdx); // "data:image/jpeg;base64"
    const base64Data = dataUrl.substring(commaIdx + 1);
    const rawMime = header.replace("data:", "").replace(";base64", "");
    const mediaType = (rawMime || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    return {
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: mediaType,
        data: base64Data,
      },
    };
  });

  const textBlock: Anthropic.TextBlockParam = {
    type: "text",
    text: `Voici ${images.length} screenshot(s) de mes Instagram Insights. Extrais toutes les métriques visibles et retourne le JSON demandé, sans markdown.`,
  };

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: INSTA_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [...imageBlocks, textBlock],
      },
    ],
  });

  const textContent = response.content.find((b) => b.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("Aucun texte dans la réponse Claude Vision");
  }

  let raw = textContent.text.trim();
  // Strip potential markdown fences
  raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "");

  let insights: InstaInsights;
  try {
    insights = JSON.parse(raw) as InstaInsights;
  } catch (err) {
    console.error("[insta-analyzer] JSON parse error:", err);
    console.error("[insta-analyzer] Raw:", raw.substring(0, 500));
    // Fallback : save raw text at minimum
    insights = {
      reach_total: null,
      impressions_total: null,
      profile_visits: null,
      followers_count: null,
      followers_delta_7d: null,
      top_posts: [],
      audience_demographics: null,
      insights_summary: "Analyse partielle — JSON invalide retourné par Claude.",
      best_format: null,
      best_posting_times: null,
      period_start: null,
      period_end: null,
      raw_extracted_text: raw,
      ambiguities: ["Réponse Claude non parseable en JSON"],
    };
  }

  return insights;
}
