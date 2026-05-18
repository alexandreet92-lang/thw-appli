/**
 * POST /api/marketing/analyze-performance
 * Admin-only. Analyse les performances Instagram avec Claude
 * et sauvegarde le résultat dans marketing_performance_analyses.
 */
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/marketing/auth";
import { getAnthropicClient, MODELS } from "@/lib/agents/base";

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
  action: string;
}

interface Recommendation {
  priority: number;
  action: string;
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
  summary: string;
  what_works: WhatWorksItem[];
  what_doesnt_work: WhatWorksItem[];
  recommendations: Recommendation[];
  growth_projection: GrowthProjection;
}

// ── System prompt (court et ferme) ────────────────────────────
const SYSTEM = `Tu es un expert en marketing Instagram.
Réponds UNIQUEMENT en JSON valide. Sois CONCIS : max 2 phrases par champ.
Max 3 items par tableau. Pas de markdown autour.`;

// ── JSON repair utility ────────────────────────────────────────
function repairJSON(raw: string): PerformanceAnalysis {
  // 1. Try as-is
  try { return JSON.parse(raw) as PerformanceAnalysis; } catch { /* continue */ }

  // 2. Strip markdown fences
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
  try { return JSON.parse(cleaned) as PerformanceAnalysis; } catch { /* continue */ }

  // 3. Try to close a truncated JSON string
  let attempt = cleaned;

  // Remove any trailing incomplete key or value (last unclosed string)
  attempt = attempt.replace(/,?\s*"[^"]*$/s, '');

  // Remove trailing comma
  attempt = attempt.replace(/,\s*$/, '');

  // Count and close open brackets/braces
  const opens   = (attempt.match(/{/g)  || []).length - (attempt.match(/}/g)  || []).length;
  const arrs    = (attempt.match(/\[/g) || []).length - (attempt.match(/\]/g) || []).length;
  for (let i = 0; i < arrs;  i++) attempt += ']';
  for (let i = 0; i < opens; i++) attempt += '}';

  try { return JSON.parse(attempt) as PerformanceAnalysis; } catch { /* continue */ }

  // 4. Last resort — safe partial object
  return {
    overall_score: "C" as const,
    engagement_rate: "N/A",
    follower_trend: "stable" as const,
    summary: "L'analyse a été partiellement générée. Réessaie dans quelques instants.",
    what_works: [],
    what_doesnt_work: [],
    recommendations: [],
    growth_projection: {
      current_followers: 0,
      projected_dec_2026: 0,
      on_track: false,
      acceleration_needed: "Données insuffisantes — relance l'analyse.",
    },
  };
}

export async function POST() {
  const t0 = Date.now();
  try {
    const cookieStore = await cookies();
    const supabase = makeSupabase(cookieStore);

    const denied = await requireAdmin(supabase);
    if (denied) return denied;

    const { data: { user } } = await supabase.auth.getUser();
    console.log(`[analyze-performance] Démarrage pour ${user!.email}`);

    // ── 1. Récupère les snapshots ─────────────────────────────
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

    // ── 2. Prompt court + schema strict ──────────────────────
    const userPrompt = `Données Instagram (snapshot récent) :
${JSON.stringify(latestSnapshot)}

Historique (${previousSnapshots.length} snapshots précédents) :
${JSON.stringify(previousSnapshots)}

Cible : atteindre 5000-10000 followers fin 2026.

Réponds UNIQUEMENT avec ce JSON (max 3 items par tableau, 1-2 phrases par champ) :
{
  "overall_score": "A|B|C|D|F",
  "engagement_rate": "X.X%",
  "follower_trend": "growing|stable|declining",
  "summary": "2 phrases max, brutal et honnête",
  "what_works": [
    { "insight": "1 phrase", "action": "1 phrase" }
  ],
  "what_doesnt_work": [
    { "insight": "1 phrase", "action": "1 phrase" }
  ],
  "recommendations": [
    { "priority": 1, "action": "1 phrase", "effort": "low|medium|high" }
  ],
  "growth_projection": {
    "current_followers": ${latestSnapshot.followers_count ?? 0},
    "projected_dec_2026": 0,
    "on_track": true,
    "acceleration_needed": "1 phrase"
  }
}`;

    // ── 3. Appel Claude ───────────────────────────────────────
    const client = getAnthropicClient();
    const resp = await client.messages.create({
      model: MODELS.balanced,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = resp.content.find(b => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Pas de réponse du modèle" }, { status: 500 });
    }

    console.log(`[analyze-performance] raw length: ${textBlock.text.length} chars, stop_reason: ${resp.stop_reason}`);

    const analysis = repairJSON(textBlock.text);
    const generationMs = Date.now() - t0;
    const tokensIn  = resp.usage.input_tokens;
    const tokensOut = resp.usage.output_tokens;

    console.log(`[analyze-performance] Analyse générée en ${generationMs}ms — score: ${analysis.overall_score}, tokens_out: ${tokensOut}`);

    // ── 4. Sauvegarde ─────────────────────────────────────────
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
        stop_reason: resp.stop_reason,
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
