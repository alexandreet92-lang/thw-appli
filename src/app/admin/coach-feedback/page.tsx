"use client";

// ══════════════════════════════════════════════════════════════
// Page admin — Curation des retours coach (phase 1 de l'apprentissage)
// Lit les 👍/👎 des athlètes pour repérer ce qui marche / ce qui rate.
// Accès réservé (NEXT_PUBLIC_ADMIN_EMAIL) ; la donnée vient de
// GET /api/coach/feedback (gardé côté serveur par compte créateur).
// ══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { currentLocale } from '@/lib/i18n'

function isAdminEmail(email: string | undefined | null): boolean {
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (!adminEmail || !email) return false;
  return email.toLowerCase() === adminEmail.toLowerCase();
}

interface FeedbackRow {
  id: string;
  created_at: string;
  rating: 1 | -1;
  sport: string | null;
  model: string | null;
  reason: string | null;
  user_message: string | null;
  assistant_message: string | null;
  conversation_id: string | null;
}

type RatingFilter = "all" | "up" | "down";

export default function CoachFeedbackAdminPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [sportFilter, setSportFilter] = useState<string>("all");

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isAdminEmail(user?.email)) {
        void router.replace("/");
        return;
      }
      setAuthChecked(true);
      try {
        const res = await fetch("/api/coach/feedback");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? t("admin.error"));
        setRows((json.feedback ?? []) as FeedbackRow[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("admin.loadError"));
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const sports = useMemo(() => {
    const s = new Set<string>();
    rows.forEach(r => { if (r.sport) s.add(r.sport); });
    return Array.from(s).sort();
  }, [rows]);

  const stats = useMemo(() => {
    const up = rows.filter(r => r.rating === 1).length;
    const down = rows.filter(r => r.rating === -1).length;
    const total = up + down;
    const winRate = total ? Math.round((up / total) * 100) : 0;
    return { up, down, total, winRate };
  }, [rows]);

  const filtered = useMemo(() => rows.filter(r => {
    if (ratingFilter === "up" && r.rating !== 1) return false;
    if (ratingFilter === "down" && r.rating !== -1) return false;
    if (sportFilter !== "all" && r.sport !== sportFilter) return false;
    return true;
  }), [rows, ratingFilter, sportFilter]);

  if (!authChecked) return null;

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 20px", fontFamily: "DM Sans, sans-serif", color: "#111827" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{t("admin.feedback.title")}</h1>
        <Link href="/admin/coach-insights" style={{ fontSize: 13, color: "#06B6D4" }}>{t("admin.feedback.curateLink")}</Link>
      </div>
      <p style={{ color: "#6B7280", fontSize: 14, marginTop: 6 }}>
        {t("admin.feedback.intro")}
      </p>

      {/* Stats */}
      <div style={{ display: "flex", gap: 12, margin: "20px 0", flexWrap: "wrap" }}>
        <StatCard label={t("admin.feedback.totalFeedback")} value={String(stats.total)} />
        <StatCard label={t("admin.feedback.positive")} value={String(stats.up)} color="#16A34A" />
        <StatCard label={t("admin.feedback.negative")} value={String(stats.down)} color="#DC2626" />
        <StatCard label={t("admin.feedback.satisfactionRate")} value={`${stats.winRate}%`} color="#06B6D4" />
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {(["all", "up", "down"] as RatingFilter[]).map(f => (
          <button key={f} onClick={() => setRatingFilter(f)}
            style={chip(ratingFilter === f)}>
            {f === "all" ? t("admin.filterAll") : f === "up" ? t("admin.feedback.positive") : t("admin.feedback.negative")}
          </button>
        ))}
        {sports.length > 0 && (
          <select value={sportFilter} onChange={e => setSportFilter(e.target.value)}
            style={{ ...chip(false), cursor: "pointer", appearance: "auto" as const }}>
            <option value="all">{t("admin.allSports")}</option>
            {sports.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {loading && <p style={{ color: "#6B7280" }}>{t("admin.loading")}</p>}
      {error && <p style={{ color: "#DC2626" }}>{error}</p>}
      {!loading && !error && filtered.length === 0 && (
        <p style={{ color: "#6B7280" }}>{t("admin.feedback.noFeedback")}</p>
      )}

      {/* Liste */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map(r => (
          <div key={r.id} style={{
            border: `1px solid ${r.rating === 1 ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)"}`,
            borderLeft: `4px solid ${r.rating === 1 ? "#22c55e" : "#ef4444"}`,
            borderRadius: 12, padding: "14px 16px", background: "#fff",
          }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>{r.rating === 1 ? "👍" : "👎"}</span>
              {r.sport && <span style={tag()}>{r.sport}</span>}
              {r.model && <span style={tag("#EEF2FF", "#4338CA")}>{r.model}</span>}
              <span style={{ marginLeft: "auto", fontSize: 12, color: "#9CA3AF" }}>
                {new Date(r.created_at).toLocaleString(currentLocale())}
              </span>
            </div>
            {r.user_message && (
              <p style={{ margin: "4px 0", fontSize: 13 }}>
                <strong style={{ color: "#6B7280" }}>{t("admin.feedback.qLabel")}</strong>{r.user_message}
              </p>
            )}
            {r.assistant_message && (
              <p style={{ margin: "4px 0", fontSize: 13, color: "#374151", whiteSpace: "pre-wrap" }}>
                <strong style={{ color: "#6B7280" }}>{t("admin.feedback.rLabel")}</strong>
                {r.assistant_message.length > 600 ? r.assistant_message.slice(0, 600) + "…" : r.assistant_message}
              </p>
            )}
            {r.reason && (
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9CA3AF", fontStyle: "italic" }}>{t("admin.feedback.reasonLabel")}{r.reason}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, color = "#111827" }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ flex: "1 1 140px", border: "1px solid #E5E7EB", borderRadius: 12, padding: "12px 14px", background: "#fff" }}>
      <div style={{ fontSize: 12, color: "#6B7280" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function chip(active: boolean): React.CSSProperties {
  return {
    padding: "6px 12px", borderRadius: 999, fontSize: 13, cursor: "pointer",
    border: `1px solid ${active ? "#06B6D4" : "#E5E7EB"}`,
    background: active ? "rgba(6,182,212,0.10)" : "#fff",
    color: active ? "#0E7490" : "#374151",
  };
}

function tag(bg = "rgba(6,182,212,0.10)", color = "#0E7490"): React.CSSProperties {
  return { padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: bg, color };
}
