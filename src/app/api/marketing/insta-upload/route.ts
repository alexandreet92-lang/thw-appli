import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/marketing/auth";
import { analyzeInstaScreenshots } from "@/lib/marketing/insta-analyzer";

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

/**
 * POST /api/marketing/insta-upload
 * Body: multipart/form-data with field "screenshots" (multiple files)
 * Analyzes via Claude Vision, saves result to instagram_insights_snapshots.
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = makeSupabase(cookieStore);

    const denied = await requireAdmin(supabase);
    if (denied) return denied;

    const { data: { user } } = await supabase.auth.getUser();

    // Parse multipart form
    const formData = await req.formData();
    const files = formData.getAll("screenshots") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    if (files.length > 10) {
      return NextResponse.json({ error: "Maximum 10 screenshots à la fois" }, { status: 400 });
    }

    console.log(`[insta-upload] ${files.length} screenshot(s) reçus pour ${user!.email}`);

    // Convert files to base64 data URLs
    const dataUrls: string[] = await Promise.all(
      files.map(async (file) => {
        const buffer = await file.arrayBuffer();
        const b64 = Buffer.from(buffer).toString("base64");
        const mime = file.type || "image/jpeg";
        return `data:${mime};base64,${b64}`;
      })
    );

    // Analyze via Claude Vision
    const insights = await analyzeInstaScreenshots(dataUrls);

    console.log(`[insta-upload] Analyse OK — reach: ${insights.reach_total ?? "N/A"}, followers: ${insights.followers_count ?? "N/A"}`);

    // Save to DB
    const today = new Date().toISOString().split("T")[0];

    const { data: saved, error: saveError } = await supabase
      .from("instagram_insights_snapshots")
      .insert({
        user_id: user!.id,
        snapshot_date: today,
        period_start: insights.period_start,
        period_end: insights.period_end,
        reach_total: insights.reach_total,
        impressions_total: insights.impressions_total,
        followers_count: insights.followers_count,
        followers_delta_7d: insights.followers_delta_7d,
        top_posts: insights.top_posts,
        audience_demographics: insights.audience_demographics,
        insights_summary: insights.insights_summary,
        best_format: insights.best_format,
        best_posting_times: insights.best_posting_times,
        raw_extracted_text: insights.raw_extracted_text,
        screenshot_count: files.length,
      })
      .select()
      .single();

    if (saveError) {
      console.error("[insta-upload] Erreur Supabase:", saveError.message);
      return NextResponse.json({ error: saveError.message }, { status: 500 });
    }

    return NextResponse.json({
      insights,
      saved_id: saved?.id ?? null,
      ambiguities: insights.ambiguities ?? [],
    });

  } catch (err) {
    console.error("[insta-upload] ❌ ERREUR:", err);
    if (err instanceof Error) {
      console.error("[insta-upload] Message:", err.message);
      console.error("[insta-upload] Stack:", err.stack);
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur inconnue" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/marketing/insta-upload
 * Returns the last 10 Instagram snapshots.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = makeSupabase(cookieStore);

    const denied = await requireAdmin(supabase);
    if (denied) return denied;

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("instagram_insights_snapshots")
      .select("*")
      .eq("user_id", user!.id)
      .order("snapshot_date", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ snapshots: data ?? [] });

  } catch (err) {
    console.error("[insta-upload] ❌ GET ERREUR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur inconnue" },
      { status: 500 }
    );
  }
}
