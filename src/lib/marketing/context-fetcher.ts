import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityContext, CommitContext, RawIdea } from "./types";

/**
 * Récupère les activités Strava des 7 derniers jours depuis Supabase.
 * Colonnes réelles : started_at, sport_type, moving_time_s, distance_m,
 *                    avg_hr, avg_watts, title
 */
export async function fetchRecentActivities(
  supabase: SupabaseClient,
  userId: string
): Promise<ActivityContext[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from("activities")
    .select("started_at, sport_type, moving_time_s, distance_m, avg_hr, avg_watts, title")
    .eq("user_id", userId)
    .gte("started_at", sevenDaysAgo.toISOString())
    .order("started_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[marketing] fetchRecentActivities error:", error);
    return [];
  }

  return (data ?? []).map((a: Record<string, unknown>) => ({
    date: typeof a.started_at === "string" ? a.started_at.split("T")[0] : "",
    sport: typeof a.sport_type === "string" ? a.sport_type : "unknown",
    duration_min: Math.round(((a.moving_time_s as number) ?? 0) / 60),
    distance_km:
      typeof a.distance_m === "number" && a.distance_m > 0
        ? Math.round((a.distance_m / 1000) * 10) / 10
        : undefined,
    avg_hr:
      typeof a.avg_hr === "number" ? Math.round(a.avg_hr) : undefined,
    avg_power:
      typeof a.avg_watts === "number" ? Math.round(a.avg_watts) : undefined,
    notes: typeof a.title === "string" ? a.title : undefined,
  }));
}

/**
 * Récupère les commits récents du repo via API GitHub.
 */
export async function fetchRecentCommits(): Promise<CommitContext[]> {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;

  if (!owner || !repo || !token) {
    console.warn("[marketing] GitHub env vars manquantes, skip commits");
    return [];
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const since = sevenDaysAgo.toISOString();

  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?since=${since}&per_page=30`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        next: { revalidate: 0 },
      }
    );

    if (!res.ok) {
      console.error("[marketing] GitHub API error:", res.status, await res.text());
      return [];
    }

    const commits = await res.json() as Array<{
      sha: string;
      commit: { message: string; author?: { date?: string } };
    }>;

    return commits
      .filter((c) => !c.commit.message.startsWith("Merge"))
      .slice(0, 15)
      .map((c) => ({
        date: c.commit.author?.date?.split("T")[0] ?? "",
        message: c.commit.message.split("\n")[0],
        sha: c.sha.substring(0, 7),
      }));
  } catch (err) {
    console.error("[marketing] fetchRecentCommits exception:", err);
    return [];
  }
}

/**
 * Récupère les idées brutes non utilisées.
 */
export async function fetchUnusedIdeas(
  supabase: SupabaseClient,
  userId: string
): Promise<RawIdea[]> {
  const { data, error } = await supabase
    .from("marketing_raw_ideas")
    .select("*")
    .eq("user_id", userId)
    .eq("used", false)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[marketing] fetchUnusedIdeas error:", error);
    return [];
  }
  return (data ?? []) as RawIdea[];
}

/**
 * Récupère les posts publiés des 7 derniers jours.
 */
export async function fetchRecentPosts(
  supabase: SupabaseClient,
  userId: string
) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from("marketing_posts")
    .select("pillar, format, hook, published_at, likes, views, saves, comments")
    .eq("user_id", userId)
    .eq("status", "published")
    .gte("published_at", sevenDaysAgo.toISOString())
    .order("published_at", { ascending: false });

  if (error) {
    console.error("[marketing] fetchRecentPosts error:", error);
    return [];
  }
  return data ?? [];
}
