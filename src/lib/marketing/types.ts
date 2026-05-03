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
