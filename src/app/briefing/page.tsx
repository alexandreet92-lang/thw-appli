'use client'

// ══════════════════════════════════════════════════════════════
// /briefing — page Briefing Matinal
// Lit le briefing du jour via GET /api/briefing, marque comme lu
// via PATCH au chargement. Design premium THW : tabs, cards,
// badges d'importance. Aucun emoji, aucun mock.
// ══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────

type ImportanceLevel = 'Majeur' | 'Important' | 'A suivre'

interface Article {
  titre: string
  importance: ImportanceLevel
  resume: string
  source: string
}

type TabKey = 'ia_tech' | 'business' | 'bourse' | 'sport' | 'tech_innovation'

interface BriefingContent {
  a_retenir?: string[]
  temps_lecture_min?: number
  categories?: Partial<Record<TabKey, Article[]>>
}

interface Briefing {
  id: string
  date: string
  created_at: string
  lu: boolean
  content: BriefingContent
}

interface TabDef {
  key: TabKey
  label: string
}

const TABS: readonly TabDef[] = [
  { key: 'ia_tech',         label: 'IA & Tech' },
  { key: 'business',        label: 'Business' },
  { key: 'bourse',          label: 'Bourse' },
  { key: 'sport',           label: 'Sport' },
  { key: 'tech_innovation', label: 'Tech & Innovation' },
] as const

// ── Helpers ───────────────────────────────────────────────────

function formatFrenchDate(isoDate: string): string {
  try {
    const d = new Date(isoDate + 'T00:00:00')
    const s = d.toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
    // Capitalize first letter (Vendredi au lieu de vendredi)
    return s.charAt(0).toUpperCase() + s.slice(1)
  } catch {
    return isoDate
  }
}

function countWords(text: string | undefined): number {
  if (!text) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

function computeReadingMinutes(content: BriefingContent): number {
  if (typeof content.temps_lecture_min === 'number' && content.temps_lecture_min > 0) {
    return Math.round(content.temps_lecture_min)
  }
  let words = 0
  for (const bullet of content.a_retenir ?? []) words += countWords(bullet)
  for (const articles of Object.values(content.categories ?? {})) {
    if (!Array.isArray(articles)) continue
    for (const a of articles) {
      words += countWords(a.titre) + countWords(a.resume) + countWords(a.source)
    }
  }
  const minutes = Math.ceil(words / 200)
  return Math.max(1, minutes)
}

function importanceColors(level: ImportanceLevel): { bg: string; fg: string } {
  switch (level) {
    case 'Majeur':    return { bg: 'rgba(239, 68, 68, 0.12)', fg: '#ef4444' }
    case 'Important': return { bg: 'rgba(249, 115, 22, 0.12)', fg: '#f97316' }
    case 'A suivre':  return { bg: 'rgba(107, 114, 128, 0.14)', fg: '#6b7280' }
  }
}

function isImportance(v: unknown): v is ImportanceLevel {
  return v === 'Majeur' || v === 'Important' || v === 'A suivre'
}

function sanitizeArticle(raw: unknown): Article | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const titre = typeof o.titre === 'string' ? o.titre : null
  const resume = typeof o.resume === 'string' ? o.resume : null
  const source = typeof o.source === 'string' ? o.source : ''
  const importance = isImportance(o.importance) ? o.importance : 'A suivre'
  if (!titre || !resume) return null
  return { titre, resume, source, importance }
}

function sanitizeContent(raw: unknown): BriefingContent {
  const out: BriefingContent = { categories: {} }
  if (!raw || typeof raw !== 'object') return out
  const o = raw as Record<string, unknown>

  if (Array.isArray(o.a_retenir)) {
    out.a_retenir = o.a_retenir.filter((s): s is string => typeof s === 'string')
  }
  if (typeof o.temps_lecture_min === 'number') {
    out.temps_lecture_min = o.temps_lecture_min
  }

  const cats = (typeof o.categories === 'object' && o.categories !== null)
    ? o.categories as Record<string, unknown>
    : {}

  for (const tab of TABS) {
    const arr = cats[tab.key]
    if (Array.isArray(arr)) {
      const cleaned = arr.map(sanitizeArticle).filter((a): a is Article => a !== null)
      if (cleaned.length > 0) {
        out.categories = { ...out.categories, [tab.key]: cleaned }
      }
    }
  }
  return out
}

// ── Page ──────────────────────────────────────────────────────

export default function BriefingPage() {
  const [loading, setLoading]   = useState(true)
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('ia_tech')

  // Fetch + mark as read
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/briefing', { cache: 'no-store' })
        if (!res.ok) {
          if (res.status === 401) {
            if (!cancelled) { setError('auth'); setLoading(false) }
            return
          }
          throw new Error(`HTTP ${res.status}`)
        }
        const json = await res.json() as { briefing: Briefing | null }
        if (cancelled) return
        if (json.briefing) {
          // Sanitize content — défensif sur le JSONB libre de l'agent
          const cleaned: Briefing = {
            ...json.briefing,
            content: sanitizeContent(json.briefing.content),
          }
          setBriefing(cleaned)
          // Mark as read si pas déjà lu
          if (!cleaned.lu) {
            void fetch('/api/briefing', { method: 'PATCH' }).catch(() => {})
          }
        } else {
          setBriefing(null)
        }
        setLoading(false)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Erreur de chargement')
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const readingMinutes = useMemo(
    () => briefing ? computeReadingMinutes(briefing.content) : 0,
    [briefing],
  )

  const activeArticles = briefing?.content.categories?.[activeTab] ?? []

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={page}>
        <div style={{ ...card, textAlign: 'center', padding: 40 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            border: '3px solid rgba(0,200,224,0.18)',
            borderTopColor: '#00c8e0',
            margin: '0 auto 14px',
            animation: 'thw_spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes thw_spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ margin: 0, color: 'var(--text-mid)', fontSize: 13 }}>
            Chargement du briefing…
          </p>
        </div>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────
  if (error === 'auth') {
    return (
      <div style={page}>
        <div style={{ ...card, padding: 24 }}>
          <h1 style={h1Style}>Authentification requise</h1>
          <p style={{ margin: 0, color: 'var(--text-mid)', fontSize: 14, lineHeight: 1.6 }}>
            Connecte-toi pour accéder à ton briefing du jour.
          </p>
        </div>
      </div>
    )
  }
  if (error) {
    return (
      <div style={page}>
        <div style={{ ...card, padding: 24 }}>
          <h1 style={h1Style}>Briefing du jour</h1>
          <p style={{ margin: 0, color: '#ef4444', fontSize: 14 }}>
            Une erreur est survenue : {error}
          </p>
        </div>
      </div>
    )
  }

  // ── Pas de briefing ────────────────────────────────────────
  if (!briefing) {
    return (
      <div style={page}>
        <header style={{ marginBottom: 20 }}>
          <h1 style={h1Style}>Briefing du jour</h1>
          <p style={dateStyle}>{formatFrenchDate(new Date().toISOString().slice(0, 10))}</p>
        </header>
        <div style={{
          ...card,
          padding: '40px 32px',
          textAlign: 'center',
          borderStyle: 'dashed',
        }}>
          <p style={{
            margin: '0 0 8px',
            fontFamily: 'Syne, sans-serif',
            fontWeight: 700,
            fontSize: 16,
            color: 'var(--text)',
          }}>
            Pas encore disponible
          </p>
          <p style={{ margin: 0, color: 'var(--text-mid)', fontSize: 14, lineHeight: 1.7 }}>
            Le briefing de ce matin n&apos;est pas encore disponible.<br />
            Il sera généré automatiquement à 7h00.
          </p>
        </div>
      </div>
    )
  }

  // ── Briefing présent ───────────────────────────────────────
  const aRetenir = briefing.content.a_retenir ?? []

  return (
    <div style={page}>

      {/* Header */}
      <header style={{ marginBottom: 24 }}>
        <h1 style={h1Style}>Briefing du jour</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 6 }}>
          <p style={dateStyle}>{formatFrenchDate(briefing.date)}</p>
          <span style={{
            fontSize: 12,
            color: 'var(--text-dim)',
            padding: '3px 10px',
            borderRadius: 99,
            background: 'var(--bg2, rgba(0,0,0,0.04))',
            border: '1px solid var(--border, rgba(0,0,0,0.08))',
          }}>
            {readingMinutes} min de lecture
          </span>
        </div>
      </header>

      {/* À retenir */}
      {aRetenir.length > 0 && (
        <section style={{
          ...card,
          background: 'linear-gradient(135deg, rgba(0,200,224,0.08), rgba(91,111,255,0.06))',
          border: '1px solid rgba(0,200,224,0.22)',
          padding: 20,
          marginBottom: 20,
        }}>
          <p style={{
            margin: '0 0 12px',
            fontFamily: 'Syne, sans-serif',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#00c8e0',
          }}>
            À retenir
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {aRetenir.slice(0, 3).map((b, i) => (
              <li key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                fontSize: 14, lineHeight: 1.65, color: 'var(--text)',
              }}>
                <span style={{
                  flexShrink: 0, marginTop: 7,
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#00c8e0',
                }} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, flexWrap: 'wrap',
        marginBottom: 16,
        borderBottom: '1px solid var(--border, rgba(0,0,0,0.08))',
      }}>
        {TABS.map(tab => {
          const active = tab.key === activeTab
          const count = briefing.content.categories?.[tab.key]?.length ?? 0
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: '10px 14px',
                marginBottom: -1,
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                color: active ? '#00c8e0' : 'var(--text-mid)',
                borderBottom: `2px solid ${active ? '#00c8e0' : 'transparent'}`,
                transition: 'color 0.14s, border-color 0.14s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {tab.label}
              {count > 0 && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '1px 7px',
                  borderRadius: 99,
                  background: active ? 'rgba(0,200,224,0.14)' : 'var(--bg2, rgba(0,0,0,0.05))',
                  color: active ? '#00c8e0' : 'var(--text-dim)',
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Articles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {activeArticles.length === 0 && (
          <div style={{ ...card, padding: 24, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dim)' }}>
              Aucune actualité dans cette catégorie aujourd&apos;hui.
            </p>
          </div>
        )}
        {activeArticles.map((a, i) => {
          const c = importanceColors(a.importance)
          return (
            <article key={i} style={{ ...card, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                <h2 style={{
                  flex: 1, minWidth: 240,
                  margin: 0,
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 700,
                  fontSize: 16,
                  lineHeight: 1.35,
                  color: 'var(--text)',
                }}>
                  {a.titre}
                </h2>
                <span style={{
                  flexShrink: 0,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 99,
                  background: c.bg,
                  color: c.fg,
                  letterSpacing: '0.02em',
                }}>
                  {a.importance}
                </span>
              </div>
              <p style={{
                margin: '0 0 12px',
                fontSize: 14,
                lineHeight: 1.7,
                color: 'var(--text-mid)',
              }}>
                {a.resume}
              </p>
              {a.source && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{
                    fontSize: 11,
                    color: 'var(--text-dim)',
                    fontStyle: 'italic',
                  }}>
                    Source : {a.source}
                  </span>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}

// ── Styles partagés ───────────────────────────────────────────

const page: React.CSSProperties = {
  maxWidth: 820,
  margin: '0 auto',
  padding: '28px 20px 60px',
  fontFamily: 'DM Sans, sans-serif',
  color: 'var(--text)',
}

const card: React.CSSProperties = {
  background: 'var(--bg2, #fff)',
  border: '1px solid var(--border, rgba(0,0,0,0.08))',
  borderRadius: 14,
}

const h1Style: React.CSSProperties = {
  margin: 0,
  fontFamily: 'Syne, sans-serif',
  fontWeight: 800,
  fontSize: 28,
  letterSpacing: '-0.015em',
  color: 'var(--text)',
  lineHeight: 1.15,
}

const dateStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: 'var(--text-mid)',
  fontWeight: 500,
}
