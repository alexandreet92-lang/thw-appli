"use client";

import { useEffect, useState } from "react";
import type { DailyBrief, BriefIdea, RawIdea } from "@/lib/marketing/types";

const PILLAR_COLORS: Record<string, string> = {
  athlete: "#00c8e0",
  expert: "#5b6fff",
  builder: "#f59e0b",
};

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  express: { label: "EXPRESS · 5 min", color: "#10b981" },
  standard: { label: "STANDARD · 20 min", color: "#5b6fff" },
  deep: { label: "DEEP · 1h+", color: "#ef4444" },
};

interface ContextSummary {
  activities_count: number;
  commits_count: number;
  raw_ideas_count: number;
  recent_posts_count: number;
}

interface BriefHistoryItem {
  id: string;
  brief_date: string;
  brief_content: DailyBrief;
  tokens_in: number;
  tokens_out: number;
  generation_ms: number;
}

export default function MarketingAdminPage() {
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextSummary, setContextSummary] = useState<ContextSummary | null>(null);

  const [ideas, setIdeas] = useState<RawIdea[]>([]);
  const [newIdea, setNewIdea] = useState("");
  const [newIdeaContext, setNewIdeaContext] = useState("");

  const [history, setHistory] = useState<BriefHistoryItem[]>([]);

  useEffect(() => {
    void loadHistory();
    void loadIdeas();
  }, []);

  async function loadHistory() {
    const res = await fetch("/api/marketing/daily-brief");
    if (res.ok) {
      const json = await res.json() as { briefs: BriefHistoryItem[] };
      setHistory(json.briefs ?? []);
      const today = new Date().toISOString().split("T")[0];
      const todayBrief = (json.briefs ?? []).find(
        (b) => b.brief_date === today
      );
      if (todayBrief) {
        setBrief(todayBrief.brief_content);
      }
    }
  }

  async function loadIdeas() {
    const res = await fetch("/api/marketing/ideas");
    if (res.ok) {
      const json = await res.json() as { ideas: RawIdea[] };
      setIdeas(json.ideas ?? []);
    }
  }

  async function generateBrief() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketing/daily-brief", { method: "POST" });
      const json = await res.json() as {
        brief?: DailyBrief;
        error?: string;
        context_summary?: ContextSummary;
      };
      if (!res.ok) throw new Error(json.error ?? "Erreur génération");
      setBrief(json.brief ?? null);
      setContextSummary(json.context_summary ?? null);
      void loadHistory();
      void loadIdeas();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  async function addIdea() {
    if (!newIdea.trim()) return;
    const res = await fetch("/api/marketing/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: newIdea,
        context: newIdeaContext || undefined,
      }),
    });
    if (res.ok) {
      setNewIdea("");
      setNewIdeaContext("");
      void loadIdeas();
    }
  }

  async function deleteIdea(id: string) {
    await fetch(`/api/marketing/ideas?id=${id}`, { method: "DELETE" });
    void loadIdeas();
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24, fontFamily: "DM Sans, system-ui, sans-serif" }}>
      <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: 32, marginBottom: 4 }}>
        Marketing Agent
      </h1>
      <p style={{ color: "#666", marginBottom: 24 }}>
        Brief quotidien généré à partir de tes activités, commits, et idées brutes.
      </p>

      {/* ── Générer ────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={generateBrief}
          disabled={loading}
          style={{
            background: "linear-gradient(135deg, #00c8e0 0%, #5b6fff 100%)",
            color: "white",
            border: "none",
            padding: "12px 24px",
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Génération en cours..." : "Générer le brief du jour"}
        </button>

        {contextSummary && (
          <div style={{ fontSize: 13, color: "#666" }}>
            Contexte : {contextSummary.activities_count} activités · {contextSummary.commits_count} commits ·{" "}
            {contextSummary.raw_ideas_count} idées · {contextSummary.recent_posts_count} posts récents
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: "#fee", border: "1px solid #fcc", padding: 12, borderRadius: 8, marginBottom: 16, color: "#c33" }}>
          {error}
        </div>
      )}

      {/* ── Brief du jour ──────────────────────────────────────────── */}
      {brief && (
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: 22, marginBottom: 16 }}>
            Brief du {brief.date}
          </h2>

          {brief.weekly_analysis && (
            <div
              style={{
                background: "#f7f8fa",
                border: "1px solid #e5e7eb",
                padding: 16,
                borderRadius: 12,
                marginBottom: 24,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
                Analyse de la semaine
              </div>
              <div style={{ fontSize: 14, marginBottom: 8 }}>
                <strong>Équilibre piliers</strong> · Athlète : {brief.weekly_analysis.pillar_balance.athlete} · Expert : {brief.weekly_analysis.pillar_balance.expert} · Builder : {brief.weekly_analysis.pillar_balance.builder}
              </div>
              <div style={{ fontSize: 14, marginBottom: 4 }}>{brief.weekly_analysis.recommendation}</div>
              <div style={{ fontSize: 12, color: "#666" }}>
                Urgence : <strong>{brief.weekly_analysis.urgency}</strong>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gap: 16 }}>
            {brief.ideas?.map((idea, i) => (
              <IdeaCard key={i} idea={idea} />
            ))}
          </div>
        </section>
      )}

      {/* ── Banque d'idées ─────────────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: 22, marginBottom: 16 }}>
          Banque d&apos;idées brutes
        </h2>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 12 }}>
          Balance ici les pensées que tu as pendant tes footings, lectures, conversations. L&apos;agent les utilisera dans les prochains briefs.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <textarea
            value={newIdea}
            onChange={(e) => setNewIdea(e.target.value)}
            placeholder="Une pensée, une remarque, un sujet en tête..."
            rows={2}
            style={{
              flex: "1 1 300px",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #ddd",
              fontFamily: "inherit",
              fontSize: 14,
              resize: "vertical",
            }}
          />
          <input
            value={newIdeaContext}
            onChange={(e) => setNewIdeaContext(e.target.value)}
            placeholder="Contexte (optionnel)"
            style={{
              flex: "0 1 200px",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #ddd",
              fontFamily: "inherit",
              fontSize: 14,
            }}
          />
          <button
            onClick={addIdea}
            disabled={!newIdea.trim()}
            style={{
              background: "#1a1a1a",
              color: "white",
              border: "none",
              padding: "0 20px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: newIdea.trim() ? "pointer" : "not-allowed",
              opacity: newIdea.trim() ? 1 : 0.4,
            }}
          >
            Ajouter
          </button>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {ideas.length === 0 && (
            <div style={{ color: "#999", fontSize: 14, fontStyle: "italic" }}>
              Aucune idée encore. Balance-en quelques-unes !
            </div>
          )}
          {ideas.map((idea) => (
            <div
              key={idea.id}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                padding: 12,
                background: idea.used ? "#f9f9f9" : "white",
                border: "1px solid #eee",
                borderRadius: 8,
                opacity: idea.used ? 0.5 : 1,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14 }}>{idea.content}</div>
                {idea.context && (
                  <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                    [{idea.context}]
                  </div>
                )}
                {idea.used && (
                  <div style={{ fontSize: 11, color: "#10b981", marginTop: 4 }}>
                    ✓ utilisée
                  </div>
                )}
              </div>
              <button
                onClick={() => deleteIdea(idea.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#999",
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                }}
                aria-label="Supprimer"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Historique ─────────────────────────────────────────────── */}
      <section>
        <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: 22, marginBottom: 16 }}>
          Historique
        </h2>
        <div style={{ display: "grid", gap: 8 }}>
          {history.slice(0, 10).map((h) => (
            <details
              key={h.id}
              style={{
                background: "white",
                border: "1px solid #eee",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <summary style={{ cursor: "pointer", fontSize: 14 }}>
                <strong>{h.brief_date}</strong> · {h.brief_content?.ideas?.length ?? 0} idées · {h.tokens_in}+{h.tokens_out} tokens · {h.generation_ms}ms
              </summary>
              <pre style={{ fontSize: 11, marginTop: 8, overflow: "auto", maxHeight: 400 }}>
                {JSON.stringify(h.brief_content, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

function IdeaCard({ idea }: { idea: BriefIdea }) {
  const tierMeta = TIER_LABELS[idea.tier] ?? TIER_LABELS.standard;
  const pillarColor = PILLAR_COLORS[idea.pillar] ?? "#666";

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 20,
        position: "relative",
      }}
    >
      {/* ── Badges ────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 11, fontWeight: 700,
            padding: "4px 10px",
            background: tierMeta.color, color: "white",
            borderRadius: 999, letterSpacing: 0.5,
          }}
        >
          {tierMeta.label}
        </span>
        <span
          style={{
            fontSize: 11, fontWeight: 600,
            padding: "4px 10px",
            background: pillarColor, color: "white",
            borderRadius: 999, textTransform: "uppercase", letterSpacing: 1,
          }}
        >
          {idea.pillar}
        </span>
        <span
          style={{
            fontSize: 11, fontWeight: 600,
            padding: "4px 10px",
            background: "#1a1a1a", color: "white",
            borderRadius: 999, textTransform: "uppercase", letterSpacing: 1,
          }}
        >
          {idea.format}
        </span>
        <span style={{ fontSize: 11, color: "#666", padding: "4px 0", marginLeft: "auto" }}>
          ~{idea.production_minutes} min
        </span>
      </div>

      <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 18, marginBottom: 12, lineHeight: 1.3 }}>
        {idea.hook}
      </h3>

      <div style={{ fontSize: 12, fontWeight: 600, color: "#666", marginTop: 12, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
        Structure
      </div>
      <div style={{ fontSize: 14, whiteSpace: "pre-wrap", marginBottom: 12 }}>
        {idea.structure}
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
        Caption
      </div>
      <div
        style={{
          fontSize: 14,
          background: "#f7f8fa",
          padding: 12, borderRadius: 8,
          whiteSpace: "pre-wrap", marginBottom: 12,
        }}
      >
        {idea.caption}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {idea.hashtags?.map((h) => (
          <span
            key={h}
            style={{
              fontSize: 12, color: "#5b6fff",
              background: "#eef0ff",
              padding: "2px 8px", borderRadius: 6,
            }}
          >
            #{h.replace(/^#/, "")}
          </span>
        ))}
      </div>

      <div style={{ fontSize: 12, color: "#888", fontStyle: "italic", borderTop: "1px solid #f0f0f0", paddingTop: 8 }}>
        💡 {idea.why_it_works}
      </div>

      {/* ── Copy button ───────────────────────────────────────── */}
      <button
        onClick={() => {
          const text = `${idea.caption}\n\n${idea.hashtags?.map((h) => `#${h.replace(/^#/, "")}`).join(" ") ?? ""}`;
          void navigator.clipboard?.writeText(text);
        }}
        style={{
          position: "absolute", top: 16, right: 16,
          background: "transparent",
          border: "1px solid #ddd", borderRadius: 6,
          padding: "4px 10px", fontSize: 12,
          cursor: "pointer", color: "#666",
        }}
      >
        Copier
      </button>
    </div>
  );
}
