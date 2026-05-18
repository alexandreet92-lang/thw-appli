/**
 * POST /api/marketing/analyze-performance
 * Admin-only. Analyse les performances Instagram avec Claude
 * et sauvegarde le résultat dans marketing_performance_analyses.
 */
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/marketing/auth";
import { getAnthropicClient, MODELS, parseJsonResponse } from "@/lib/agents/base";

export const runtime = "nodejs";
export const maxDuration = 60;

function makeSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
}

interface WhatWorksItem {
  insight: string;
  evidence: string;
  action: string;
}

interface Recommendation {
  priority: number;
  action: string;
  expected_impact: string;
  effort: "low" | "medium" | "high";
}

interface GrowthProjection {
  current_followers: number;
  projected_dec_2026: number;
  on_track: boolean;
  acceleration_needed: string;
}

export interface PerformanceAnalysis {
  overall_score: "A" | "B" | "C" | "D" | "F";
  engagement_rate: string;
  follower_trend: "growing" | "stable" | "declining";
  what_works: WhatWorksItem[];
  what_doesnt_work: WhatWorksItem[];
  recommendations: Recommendation[];
  growth_projection: GrowthProjection;
  summary: string;
}

const SYSTEM = `Tu es un expert en marketing Instagram et analyse de données sociales.
Tu réponds UNIQUEMENT avec un objet JSON valide. Aucun texte avant ni après, aucun commentaire, aucun bloc markdown.
Sois précis, direct et brutal dans ton analyse. Pas de compliments gratuits.`;

export async function POST() {
  const t0 = Date.now();
  try {
    const cookieStore = await cookies();
    const supabase = makeSupabase(cookieStore);

    const denied = await requireAdmin(supabase);
    if (denied) return denied;

    const { data: { user } } = await supabase.auth.getUser();
    console.log(`[analyze-performance] Démarrage pour ${user!.email}`);

    // ── 1. Récupère le snapshot le plus récent ─────────────────
    const { data: snapshots, error: snapErr } = await supabase
      .from("instagram_insights_snapshots")
      .select("*")
      .eq("user_id", user!.id)
      .order("snapshot_date", { ascending: false })
      .limit(6);

    if (snapErr) {
      console.error("[analyze-performance] snapshots error:", snapErr.message);
      return NextResponse.json({ error: snapErr.message }, { status: 500 });
    }

    if (!snapshots || snapshots.length === 0) {
      return NextResponse.json(
        { error: "Aucun snapshot Instagram disponible. Synchronise d'abord ton compte." },
        { status: 422 }
      );
    }

    const latestSnapshot = snapshots[0];
    const previousSnapshots = snapshots.slice(1);

    // ── 2. Appel Claude ────────────────────────────────────────
    const userPrompt = `Analyse les performances Instagram avec ces données.

DONNÉES DU COMPTE (snapshot le plus récent) :
${JSON.stringify(latestSnapshot, null, 2)}

HISTORIQUE DES SNAPSHOTS (évolution) :
${JSON.stringify(previousSnapshots, null, 2)}

ANALYSE DEMANDÉE — Sois PRÉCIS et ACTIONNABLE :

1. PERFORMANCE GLOBALE
   - Taux d'engagement moyen
   - Reach par rapport au nombre de followers (bon/moyen/faible)
   - Tendance followers (croissance, stagnation, perte)

2. CE QUI MARCHE
   - Les posts qui performent le mieux et POURQUOI
   - Le format gagnant (Reel vs Carrousel vs Photo) avec chiffres
   - Les sujets/thèmes qui engagent le plus

3. CE QUI NE MARCHE PAS
   - Les posts qui sous-performent et POURQUOI
   - Les formats à éviter ou améliorer
   - Les erreurs récurrentes détectées

4. RECOMMANDATIONS CONCRÈTES
   - Top 3 actions à faire cette semaine
   - Format prioritaire à utiliser
   - Fréquence recommandée
   - Type de contenu à tester

5. OBJECTIFS
   - Situation actuelle : ${latestSnapshot.followers_count ?? "?"} followers
   - Cible : 5000-10000 followers fin 2026
   - Estimation de la croissance au rythme actuel
   - Ce qu'il faut changer pour accélérer

Réponds en JSON avec exactement ce schéma :
{
  "overall_score": "A" | "B" | "C" | "D" | "F",
  "engagement_rate": "X.X%",
  "follower_trend": "growing" | "stable" | "declining",
  "what_works": [
    { "insight": "...", "evidence": "...", "action": "..." }
  ],
  "what_doesnt_work": [
    { "insight": "...", "evidence": "...", "action": "..." }
  ],
  "recommendations": [
    { "priority": 1, "action": "...", "expected_impact": "...", "effort": "low|medium|high" }
  ],
  "growth_projection": {
    "current_followers": ${latestSnapshot.followers_count ?? 0},
    "projected_dec_2026": 0,
    "on_track": true,
    "acceleration_needed": "..."
  },
  "summary": "2-3 phrases résumé brutal et honnête"
}`;

    const client = getAnthropicClient();
    const resp = await client.messages.create({
      model: MODELS.balanced,
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = resp.content.find(b => b.type === "text");
    if (!text || text.type !== "text") {
      return NextResponse.json({ error: "Pas de réponse du modèle" }, { status: 500 });
    }

    const analysis = parseJsonResponse<PerformanceAnalysis>(text.text);
    const generationMs = Date.now() - t0;
    const tokensIn = resp.usage.input_tokens;
    const tokensOut = resp.usage.output_tokens;

    console.log(`[analyze-performance] Analyse générée en ${generationMs}ms — score: ${analysis.overall_score}`);

    // ── 3. Sauvegarde ──────────────────────────────────────────
    const { data: saved, error: saveErr } = await supabase
      .from("marketing_performance_analyses")
      .insert({
        user_id: user!.id,
        analysis_date: new Date().toISOString().split("T")[0],
        snapshot_id: latestSnapshot.id,
        analysis_content: analysis,
        model_used: MODELS.balanced,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        generation_ms: generationMs,
      })
      .select("id")
      .single();

    if (saveErr) {
      console.warn("[analyze-performance] Erreur sauvegarde (non bloquante):", saveErr.message);
    }

    return NextResponse.json({
      analysis,
      meta: {
        saved_id: saved?.id ?? null,
        generation_ms: generationMs,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        snapshot_date: latestSnapshot.snapshot_date,
      },
    });

  } catch (err) {
    console.error("[analyze-performance] ❌ ERREUR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur inconnue" },
      { status: 500 }
    );
  }
}
