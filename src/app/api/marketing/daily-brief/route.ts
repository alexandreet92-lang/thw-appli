import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  fetchRecentActivities,
  fetchRecentCommits,
  fetchUnusedIdeas,
  fetchRecentPosts,
} from "@/lib/marketing/context-fetcher";
import { generateDailyBrief } from "@/lib/marketing/generate-brief";
import { requireAdmin } from "@/lib/marketing/auth";

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

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = makeSupabase(cookieStore);

    // ── Admin-only ─────────────────────────────────────────────
    const denied = await requireAdmin(supabase);
    if (denied) return denied;

    const { data: { user } } = await supabase.auth.getUser();
    // user is guaranteed non-null after requireAdmin passes
    console.log(`[marketing] POST /daily-brief — démarrage pour ${user!.email}`);

    const [activities, commits, rawIdeas, recentPosts] = await Promise.all([
      fetchRecentActivities(supabase, user!.id),
      fetchRecentCommits(),
      fetchUnusedIdeas(supabase, user!.id),
      fetchRecentPosts(supabase, user!.id),
    ]);

    console.log(
      `[marketing] Contexte: ${activities.length} activités, ${commits.length} commits, ` +
      `${rawIdeas.length} idées, ${recentPosts.length} posts`
    );

    const { brief, meta } = await generateDailyBrief({
      activities,
      commits,
      rawIdeas,
      recentPosts,
    });

    console.log(
      `[marketing] Brief généré en ${meta.generation_ms}ms — ` +
      `${meta.tokens_in} tokens in / ${meta.tokens_out} tokens out`
    );

    const { data: saved, error: saveError } = await supabase
      .from("marketing_briefs")
      .insert({
        user_id: user!.id,
        brief_date: new Date().toISOString().split("T")[0],
        brief_type: "daily",
        context_activities: activities,
        context_commits: commits,
        context_raw_ideas: rawIdeas,
        context_recent_posts: recentPosts,
        brief_content: brief,
        ...meta,
      })
      .select()
      .single();

    if (saveError) {
      console.error("[marketing] Erreur sauvegarde Supabase:", saveError.message);
    }

    if (rawIdeas.length > 0) {
      await supabase
        .from("marketing_raw_ideas")
        .update({ used: true, used_at: new Date().toISOString() })
        .in("id", rawIdeas.map((i) => i.id));
    }

    return NextResponse.json({
      brief,
      meta,
      saved_id: saved?.id ?? null,
      context_summary: {
        activities_count: activities.length,
        commits_count: commits.length,
        raw_ideas_count: rawIdeas.length,
        recent_posts_count: recentPosts.length,
      },
    });

  } catch (err) {
    // ── Logging exhaustif ──────────────────────────────────────
    console.error("[marketing] ❌ daily-brief ERREUR:", err);

    if (err instanceof Error) {
      console.error("[marketing] Message:", err.message);
      console.error("[marketing] Stack:", err.stack);
    }

    // Détail spécifique aux erreurs Anthropic SDK
    if (err && typeof err === "object" && "status" in err) {
      const apiErr = err as { status?: number; message?: string; error?: unknown };
      console.error("[marketing] Anthropic status:", apiErr.status);
      console.error("[marketing] Anthropic error body:", JSON.stringify(apiErr.error ?? null));
    }

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Erreur inconnue",
        type:
          err && typeof err === "object" && "status" in err
            ? "anthropic_api"
            : "internal",
        details:
          err instanceof Error
            ? err.stack?.split("\n").slice(0, 4)
            : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = makeSupabase(cookieStore);

    // ── Admin-only ───────────────────────────────────────────────
    const denied = await requireAdmin(supabase);
    if (denied) return denied;

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("marketing_briefs")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("[marketing] GET briefs error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ briefs: data ?? [] });
  } catch (err) {
    console.error("[marketing] ❌ GET /daily-brief ERREUR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur inconnue" },
      { status: 500 }
    );
  }
}
