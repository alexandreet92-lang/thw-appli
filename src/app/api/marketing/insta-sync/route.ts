/**
 * POST /api/marketing/insta-sync
 * Sync Instagram data directly from Graph API → save to instagram_insights_snapshots
 *
 * GET /api/marketing/insta-sync
 * Return the latest API-synced snapshot
 */
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/marketing/auth";
import {
  fetchInstaProfile,
  fetchInstaMedia,
  fetchMediaInsights,
  fetchInstaInsights,
  type InstaMediaItem,
} from "@/lib/marketing/insta-api";
import type { InstaTopPost } from "@/lib/marketing/types";
import { currentLocale } from '@/lib/i18n/locale'

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

/** Map Graph API media_type → frontend format */
function mediaTypeToFormat(item: InstaMediaItem): "reel" | "carousel" | "photo" {
  if (item.media_product_type === "REELS") return "reel";
  if (item.media_type === "CAROUSEL_ALBUM") return "carousel";
  if (item.media_type === "VIDEO") return "reel";
  return "photo";
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = makeSupabase(cookieStore);

    const denied = await requireAdmin(supabase);
    if (denied) return denied;

    const { data: { user } } = await supabase.auth.getUser();
    console.log(`[insta-sync] POST — démarrage pour ${user!.email}`);

    // ── 1. Fetch profile + media + account insights in parallel ──
    const [profile, mediaItems, accountInsights] = await Promise.all([
      fetchInstaProfile(),
      fetchInstaMedia(25),
      fetchInstaInsights("days_28"),
    ]);

    if (!profile && !mediaItems && !accountInsights) {
      return NextResponse.json(
        { error: "Impossible de contacter l'API Instagram. Vérifie INSTAGRAM_ACCESS_TOKEN." },
        { status: 502 }
      );
    }

    // ── 2. Enrich each post with per-post insights ────────────────
    const enrichedPosts: Array<{
      item: InstaMediaItem;
      insights: { impressions: number | null; reach: number | null; saved: number | null } | null;
    }> = [];

    if (mediaItems && mediaItems.length > 0) {
      // Fetch insights for all posts in parallel (cap at 25)
      const insightResults = await Promise.all(
        mediaItems.slice(0, 25).map((item) => fetchMediaInsights(item.id))
      );
      for (let i = 0; i < mediaItems.length; i++) {
        enrichedPosts.push({ item: mediaItems[i], insights: insightResults[i] ?? null });
      }
    }

    // ── 3. Score and rank posts by engagement ────────────────────
    // Formula: likes + saves*2 + comments*3
    const scored = enrichedPosts.map(({ item, insights }) => ({
      item,
      insights,
      score: item.like_count + (insights?.saved ?? 0) * 2 + item.comments_count * 3,
    }));
    scored.sort((a, b) => b.score - a.score);

    const top5 = scored.slice(0, 5);

    // ── 4. Detect best_format ────────────────────────────────────
    const formatScores: Record<string, number> = { reel: 0, carousel: 0, photo: 0 };
    for (const { item, score } of scored) {
      const fmt = mediaTypeToFormat(item);
      formatScores[fmt] = (formatScores[fmt] ?? 0) + score;
    }
    const bestFormat = (Object.entries(formatScores).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null) as
      | "reel" | "carousel" | "photo" | null;

    console.log(`[insta-sync] best_format=${bestFormat ?? "N/A"}, top post likes=${top5[0]?.item.like_count ?? 0}`);

    // ── 5. Build top_posts array (InstaTopPost schema) ──────────
    const topPosts: InstaTopPost[] = top5.map(({ item, insights }) => ({
      caption_excerpt: (item.caption ?? "").slice(0, 100),
      format:          mediaTypeToFormat(item),
      likes:           item.like_count,
      saves:           insights?.saved ?? 0,
      reach:           insights?.reach ?? 0,
      comments:        item.comments_count,
    }));

    // ── 6. Build insights_summary ────────────────────────────────
    const followerCount = profile?.followers_count ?? accountInsights?.follower_count ?? null;
    const summary = [
      profile    ? `@${profile.username} · ${profile.followers_count.toLocaleString(currentLocale())} followers` : null,
      accountInsights?.reach       != null ? `Reach (28j) : ${accountInsights.reach.toLocaleString(currentLocale())}` : null,
      accountInsights?.impressions != null ? `Impressions (28j) : ${accountInsights.impressions.toLocaleString(currentLocale())}` : null,
      bestFormat ? `Meilleur format : ${bestFormat}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    // ── 7. Persist to instagram_insights_snapshots ───────────────
    const today = new Date().toISOString().split("T")[0];

    const { data: saved, error: saveError } = await supabase
      .from("instagram_insights_snapshots")
      .upsert(
        {
          user_id:            user!.id,
          snapshot_date:      today,
          period_start:       null,
          period_end:         null,
          reach_total:        accountInsights?.reach     ?? null,
          impressions_total:  accountInsights?.impressions ?? null,
          followers_count:    followerCount,
          followers_delta_7d: null,           // Graph API doesn't expose this directly
          top_posts:          topPosts,
          audience_demographics: null,
          insights_summary:   summary || null,
          best_format:        bestFormat,
          best_posting_times: null,
          raw_extracted_text: null,
          screenshot_count:   null,
          source:             "api",
        },
        { onConflict: "user_id,snapshot_date" }
      )
      .select()
      .single();

    if (saveError) {
      console.error("[insta-sync] Erreur Supabase:", saveError.message, saveError.details);
      return NextResponse.json({ error: saveError.message }, { status: 500 });
    }

    console.log(`[insta-sync] ✅ Snapshot sauvegardé — id=${saved?.id}`);

    return NextResponse.json({
      snapshot: saved,
      meta: {
        followers:      followerCount,
        reach_28d:      accountInsights?.reach ?? null,
        impressions_28d: accountInsights?.impressions ?? null,
        posts_analyzed: enrichedPosts.length,
        best_format:    bestFormat,
        top5_scores:    top5.map(({ item, score }) => ({ id: item.id, score, likes: item.like_count })),
      },
    });

  } catch (err) {
    console.error("[insta-sync] ❌ ERREUR:", err);
    if (err instanceof Error) {
      console.error("[insta-sync] Message:", err.message);
      console.error("[insta-sync] Stack:", err.stack);
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur inconnue" },
      { status: 500 }
    );
  }
}

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
      .eq("source", "api")
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[insta-sync] GET error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ snapshot: data ?? null });

  } catch (err) {
    console.error("[insta-sync] ❌ GET ERREUR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur inconnue" },
      { status: 500 }
    );
  }
}
