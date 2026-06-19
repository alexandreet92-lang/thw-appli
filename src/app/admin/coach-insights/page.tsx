"use client";

// ══════════════════════════════════════════════════════════════
// Page admin — Curation des insights coach (phase 2 de l'apprentissage)
// Écrire / activer / retirer les enseignements injectés dans le coach.
// Validation 100 % manuelle. Accès réservé (NEXT_PUBLIC_ADMIN_EMAIL).
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function isAdminEmail(email: string | undefined | null): boolean {
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (!adminEmail || !email) return false;
  return email.toLowerCase() === adminEmail.toLowerCase();
}

type Status = "candidate" | "active" | "retired";
interface Insight {
  id: string;
  sport: string | null;
  topic: string;
  insight_text: string;
  source: string;
  status: Status;
  score: number;
  usage_count: number;
  created_at: string;
}

const SPORTS = ["", "running", "cycling", "hyrox", "gym"];
const STATUS_COLOR: Record<Status, string> = { active: "#16A34A", candidate: "#D97706", retired: "#9CA3AF" };

export default function CoachInsightsAdminPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [rows, setRows] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulaire de création
  const [sport, setSport] = useState("");
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/coach/insights");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      setRows((json.insights ?? []) as Insight[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isAdminEmail(user?.email)) { void router.replace("/"); return; }
      setAuthChecked(true);
      await load();
    })();
  }, [router]);

  async function create() {
    if (!topic.trim() || !text.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/coach/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sport: sport || null, topic, insight_text: text, status: "active" }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "Erreur"); }
      setTopic(""); setText(""); setSport("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur création");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: Status) {
    await fetch(`/api/coach/insights?id=${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cet insight ?")) return;
    await fetch(`/api/coach/insights?id=${id}`, { method: "DELETE" });
    await load();
  }

  if (!authChecked) return null;

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 20px", fontFamily: "DM Sans, sans-serif", color: "#111827" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Enseignements du coach</h1>
        <Link href="/admin/coach-feedback" style={{ fontSize: 13, color: "#06B6D4" }}>← Voir les retours 👍/👎</Link>
      </div>
      <p style={{ color: "#6B7280", fontSize: 14, marginTop: 6 }}>
        Phase 2 : les leçons que tu valides ici sont injectées dans le coach (ciblées par sport + mots-clés). Validation 100 % manuelle.
      </p>

      {/* Création */}
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, padding: 16, margin: "18px 0", background: "#fff" }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Nouvel enseignement</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <select value={sport} onChange={e => setSport(e.target.value)} style={input(140)}>
            {SPORTS.map(s => <option key={s} value={s}>{s || "Tous sports"}</option>)}
          </select>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Mots-clés (ex: pma, 30/30, seuil)" style={{ ...input(0), flex: 1, minWidth: 200 }} />
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
          placeholder="La leçon, formulée comme un conseil actionnable (anonyme, pas de données perso)…"
          style={{ ...input(0), width: "100%", resize: "vertical", marginBottom: 8 }} />
        <button onClick={() => void create()} disabled={saving || !topic.trim() || !text.trim()}
          style={{ padding: "9px 18px", borderRadius: 9, border: "none", cursor: "pointer", background: "#06B6D4", color: "#fff", fontWeight: 600, opacity: saving || !topic.trim() || !text.trim() ? 0.5 : 1 }}>
          {saving ? "Enregistrement…" : "Ajouter (actif)"}
        </button>
      </div>

      {loading && <p style={{ color: "#6B7280" }}>Chargement…</p>}
      {error && <p style={{ color: "#DC2626" }}>{error}</p>}
      {!loading && rows.length === 0 && <p style={{ color: "#6B7280" }}>Aucun enseignement pour l&apos;instant.</p>}

      {/* Liste */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map(r => (
          <div key={r.id} style={{
            border: "1px solid #E5E7EB", borderLeft: `4px solid ${STATUS_COLOR[r.status]}`,
            borderRadius: 12, padding: "12px 14px", background: "#fff",
          }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
              <span style={{ ...tag(STATUS_COLOR[r.status] + "22", STATUS_COLOR[r.status]), textTransform: "uppercase" as const }}>{r.status}</span>
              {r.sport && <span style={tag()}>{r.sport}</span>}
              <span style={tag("#F3F4F6", "#6B7280")}>{r.topic}</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#9CA3AF" }}>{r.source}</span>
            </div>
            <p style={{ margin: "4px 0 10px", fontSize: 14, color: "#374151", whiteSpace: "pre-wrap" }}>{r.insight_text}</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {r.status !== "active" && <button onClick={() => void setStatus(r.id, "active")} style={btn("#16A34A")}>Activer</button>}
              {r.status !== "candidate" && <button onClick={() => void setStatus(r.id, "candidate")} style={btn("#D97706")}>En attente</button>}
              {r.status !== "retired" && <button onClick={() => void setStatus(r.id, "retired")} style={btn("#6B7280")}>Retirer</button>}
              <button onClick={() => void remove(r.id)} style={btn("#DC2626")}>Supprimer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function input(width: number): React.CSSProperties {
  return { padding: "8px 10px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 14, fontFamily: "inherit", ...(width ? { width } : {}) };
}
function tag(bg = "rgba(6,182,212,0.10)", color = "#0E7490"): React.CSSProperties {
  return { padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: bg, color };
}
function btn(color: string): React.CSSProperties {
  return { padding: "5px 11px", borderRadius: 7, border: `1px solid ${color}40`, background: "transparent", color, fontSize: 12, cursor: "pointer", fontWeight: 500 };
}
