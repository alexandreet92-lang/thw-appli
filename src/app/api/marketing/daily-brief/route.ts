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

    const [activities, commits, rawIdeas, recentPosts] = await Promise.all([
      fetchRecentActivities(supabase, user!.id),
      fetchRecentCommits(),
      fetchUnusedIdeas(supabase, user!.id),
      fetchRecentPosts(supabase, user!.id),
    ]);

    const { brief, meta } = await generateDailyBrief({
      activities,
      commits,
      rawIdeas,
      recentPosts,
    });

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
      console.error("[marketing] Save error:", saveError);
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
    // Logging détaillé — distingue les erreurs Anthropic des autres
    const isApiError = err instanceof Error && "status" in err;
    if (isApiError) {
      const apiErr = err as Error & { status?: number };
      console.error(`[marketing] Anthropic API error — status: ${apiErr.status ?? "?"} — ${apiErr.message}`);
    } else {
      console.error("[marketing] daily-brief route error:", err);
    }
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Erreur inconnue",
        ...(process.env.NODE_ENV !== "production" && err instanceof Error
          ? { detail: err.stack }
          : {}),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ briefs: data ?? [] });
}
