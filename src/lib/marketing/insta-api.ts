/**
 * Instagram Graph API — direct data fetching
 * Requires env vars: INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID
 *
 * All functions:
 * - Return null on missing env vars (with console.warn)
 * - Return null on API errors (with detailed logging)
 * - Log token-expiry error (code 190) explicitly
 */

const BASE = "https://graph.facebook.com/v21.0";

function getEnv(): { token: string; igId: string } | null {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igId  = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!token || !igId) {
    console.warn("[insta-api] Env vars manquantes: INSTAGRAM_ACCESS_TOKEN ou INSTAGRAM_BUSINESS_ACCOUNT_ID");
    return null;
  }
  return { token, igId };
}

/** Handle Graph API errors — log token expiry separately */
async function handleGraphError(res: Response, context: string): Promise<null> {
  let body = "";
  try { body = await res.text(); } catch { /* ignore */ }

  let parsed: { error?: { code?: number; message?: string; type?: string } } = {};
  try { parsed = JSON.parse(body); } catch { /* ignore */ }

  const code = parsed?.error?.code;
  if (code === 190) {
    console.error(`[insta-api] 🔑 Token Instagram EXPIRÉ (code 190) — renouvelle le token longue durée. Context: ${context}`);
  } else {
    console.error(
      `[insta-api] ❌ ${context} — HTTP ${res.status}`,
      parsed?.error ? JSON.stringify(parsed.error) : body.slice(0, 300)
    );
  }
  return null;
}

// ── a) Profile ───────────────────────────────────────────────────

export interface InstaProfile {
  id: string;
  username: string;
  followers_count: number;
  media_count: number;
  profile_picture_url: string | null;
}

export async function fetchInstaProfile(): Promise<InstaProfile | null> {
  const env = getEnv();
  if (!env) return null;
  const { token, igId } = env;

  try {
    const url = `${BASE}/${igId}?fields=username,followers_count,media_count,profile_picture_url&access_token=${token}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return handleGraphError(res, "fetchInstaProfile");
    const data = await res.json() as InstaProfile;
    console.log(`[insta-api] Profile OK — @${data.username}, ${data.followers_count} followers`);
    return data;
  } catch (err) {
    console.error("[insta-api] fetchInstaProfile exception:", err);
    return null;
  }
}

// ── b) Media list ────────────────────────────────────────────────

export interface InstaMediaItem {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_product_type?: string;
  permalink: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
}

export async function fetchInstaMedia(limit = 25): Promise<InstaMediaItem[] | null> {
  const env = getEnv();
  if (!env) return null;
  const { token, igId } = env;

  try {
    const fields = "id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count";
    const url = `${BASE}/${igId}/media?fields=${fields}&limit=${limit}&access_token=${token}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return handleGraphError(res, "fetchInstaMedia");
    const data = await res.json() as { data: InstaMediaItem[] };
    console.log(`[insta-api] Media OK — ${data.data?.length ?? 0} posts récupérés`);
    return data.data ?? [];
  } catch (err) {
    console.error("[insta-api] fetchInstaMedia exception:", err);
    return null;
  }
}

// ── c) Per-post insights ─────────────────────────────────────────

export interface MediaInsights {
  impressions: number | null;
  reach: number | null;
  saved: number | null;
}

export async function fetchMediaInsights(mediaId: string): Promise<MediaInsights | null> {
  const env = getEnv();
  if (!env) return null;
  const { token } = env;

  try {
    const url = `${BASE}/${mediaId}/insights?metric=impressions,reach,saved&access_token=${token}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return handleGraphError(res, `fetchMediaInsights(${mediaId})`);
    const data = await res.json() as { data: { name: string; values?: { value: number }[]; value?: number }[] };

    const getMetric = (name: string): number | null => {
      const m = data.data?.find((d) => d.name === name);
      if (!m) return null;
      // Lifetime metrics return { value: N }, period metrics return { values: [{value: N}] }
      if (typeof m.value === "number") return m.value;
      if (Array.isArray(m.values) && m.values.length > 0) return m.values[0].value ?? null;
      return null;
    };

    return {
      impressions: getMetric("impressions"),
      reach:       getMetric("reach"),
      saved:       getMetric("saved"),
    };
  } catch (err) {
    console.error(`[insta-api] fetchMediaInsights(${mediaId}) exception:`, err);
    return null;
  }
}

// ── d) Account-level insights ────────────────────────────────────

export interface InstaAccountInsights {
  reach:         number | null;
  impressions:   number | null;
  profile_views: number | null;
  follower_count: number | null;
}

export async function fetchInstaInsights(
  period: "day" | "week" | "days_28" = "days_28"
): Promise<InstaAccountInsights | null> {
  const env = getEnv();
  if (!env) return null;
  const { token, igId } = env;

  try {
    const metric = "reach,impressions,profile_views,follower_count";
    const url = `${BASE}/${igId}/insights?metric=${metric}&period=${period}&access_token=${token}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return handleGraphError(res, `fetchInstaInsights(${period})`);
    const data = await res.json() as { data: { name: string; values?: { value: number }[]; value?: number }[] };

    const getLatest = (name: string): number | null => {
      const m = data.data?.find((d) => d.name === name);
      if (!m) return null;
      if (typeof m.value === "number") return m.value;
      if (Array.isArray(m.values) && m.values.length > 0) {
        // Last value in the array is the most recent
        return m.values[m.values.length - 1]?.value ?? null;
      }
      return null;
    };

    console.log(`[insta-api] AccountInsights OK — period=${period}`);
    return {
      reach:          getLatest("reach"),
      impressions:    getLatest("impressions"),
      profile_views:  getLatest("profile_views"),
      follower_count: getLatest("follower_count"),
    };
  } catch (err) {
    console.error("[insta-api] fetchInstaInsights exception:", err);
    return null;
  }
}
