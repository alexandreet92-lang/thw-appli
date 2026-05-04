export type Pillar = "athlete" | "expert" | "builder";
export type Format = "reel" | "carousel" | "photo" | "story";
export type Tier = "express" | "standard" | "deep";
export type Urgency = "low" | "medium" | "high";

export interface BriefIdea {
  tier: Tier;
  pillar: Pillar;
  format: Format;
  hook: string;
  structure: string;
  caption: string;
  hashtags: string[];
  production_minutes: number;
  why_it_works: string;
}

export interface WeeklyAnalysis {
  pillar_balance: {
    athlete: number;
    expert: number;
    builder: number;
  };
  recommendation: string;
  urgency: Urgency;
}

export interface DailyBrief {
  date: string;
  ideas: BriefIdea[];
  weekly_analysis: WeeklyAnalysis;
}

export interface RawIdea {
  id: string;
  content: string;
  context: string | null;
  used: boolean;
  used_at: string | null;
  created_at: string;
}

export interface MarketingPost {
  id: string;
  brief_id: string | null;
  pillar: Pillar | null;
  format: Format | null;
  hook: string | null;
  caption: string | null;
  hashtags: string[] | null;
  status: "suggested" | "planned" | "published" | "skipped";
  published_at: string | null;
  likes: number | null;
  views: number | null;
  saves: number | null;
  comments: number | null;
  created_at: string;
}

export interface ActivityContext {
  date: string;
  sport: string;
  duration_min: number;
  distance_km?: number;
  avg_hr?: number;
  avg_power?: number;
  notes?: string;
}

export interface CommitContext {
  date: string;
  message: string;
  sha: string;
}

// ── Instagram Insights ─────────────────────────────────────────

export interface InstaTopPost {
  caption_excerpt: string;
  format: "reel" | "carousel" | "photo";
  likes: number;
  saves: number;
  reach: number;
  comments?: number;
}

export interface InstaDemographics {
  age_groups?: Record<string, number>;
  gender?: Record<string, number>;
  top_locations?: string[];
}

export interface InstaSnapshot {
  id: string;
  snapshot_date: string;
  period_start: string | null;
  period_end: string | null;
  reach_total: number | null;
  impressions_total: number | null;
  followers_count: number | null;
  followers_delta_7d: number | null;
  top_posts: InstaTopPost[] | null;
  audience_demographics: InstaDemographics | null;
  insights_summary: string | null;
  best_format: string | null;
  best_posting_times: Record<string, number> | null;
  raw_extracted_text?: string | null;
  screenshot_count?: number | null;
}

// Retour de Claude Vision avant sauvegarde en base
export interface InstaInsights {
  reach_total: number | null;
  impressions_total: number | null;
  profile_visits: number | null;
  followers_count: number | null;
  followers_delta_7d: number | null;
  top_posts: InstaTopPost[];
  audience_demographics: InstaDemographics | null;
  insights_summary: string;
  best_format: "reel" | "carousel" | "photo" | null;
  best_posting_times: Record<string, number> | null;
  period_start: string | null;
  period_end: string | null;
  raw_extracted_text: string;
  ambiguities?: string[];
}
