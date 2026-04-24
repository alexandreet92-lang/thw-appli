'use client'

// ══════════════════════════════════════════════════════════════
// /briefing — page Briefing Matinal
//
// Structure :
//   1. Séance du jour        (tous users)  → planned_sessions (today)
//   2. Tâches du jour        (tous users)  → week_tasks       (today)
//   3. Actu du jour          (créateur)    → /api/briefing
//
// Section 3 affichée uniquement si l'utilisateur connecté = CREATOR_USER_ID
// (comparé côté client via NEXT_PUBLIC_CREATOR_USER_ID).
// ══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────

type ImportanceLevel = 'Majeur' | 'Important' | 'A suivre'

interface Article {
  titre: string
  importance: ImportanceLevel
  resume: string
  source_nom: string
  source_date: string
}

interface SubTheme {
  nom: string
  articles: Article[]
}

type TabKey =
  | 'ia_tech'
  | 'business'
  | 'bourse'
  | 'international'
  | 'sport'
  | 'tech_innovation'

interface Category {
  key: TabKey
  nom: string
  sous_themes: SubTheme[]
}

interface BriefingContent {
  a_retenir?: string[]
  temps_lecture_min?: number
  categories: Category[]
}

interface Briefing {
  id: string
  date: string
  created_at: string
  lu: boolean
  content: BriefingContent
}

interface PlannedSession {
  id: string
  sport: string
  title: string
  time: string | null
  duration_min: number | null
  tss: number | null
  intensity: string | null
  notes: string | null
  rpe: number | null
}

interface WeekTask {
  id: string
  title: string
  description: string | null
  start_hour: number
  start_min: number | null
  duration_min: number | null
  is_main: boolean
  priority: boolean | null
  type: string | null
  completed: boolean
}

interface TabDef { key: TabKey; label: string }

const TABS: readonly TabDef[] = [
  { key: 'ia_tech',         label: 'IA & Tech' },
  { key: 'business',        label: 'Business' },
  { key: 'bourse',          label: 'Bourse' },
  { key: 'international',   label: 'International' },
  { key: 'sport',           label: 'Sport' },
  { key: 'tech_innovation', label: 'Tech & Innovation' },
] as const

const KEY_LABELS: Record<TabKey, string> = {
  ia_tech:         'IA & Tech',
  business:        'Business',
  bourse:          'Bourse',
  international:   'International',
  sport:           'Sport',
  tech_innovation: 'Tech & Innovation',
}

// Priority-ordered mapping nom libre → TabKey canonique.
function mapNomToKey(nom: string, positionIndex: number): TabKey {
  const n = (nom ?? '').toLowerCase()
  if (/\bia\b/.test(n) || n.includes('intelligence artificielle')) return 'ia_tech'
  if (n.includes('international') || n.includes('geopolit') || n.includes('géopolit')) return 'international'
  if (n.includes('bourse') || n.includes('cac') || n.includes('nasdaq') ||
      n.includes('sp500') || n.includes('s&p') || n.includes('finance')) return 'bourse'
  if (n.includes('sport') || n.includes('endurance') ||
      n.includes('hybride') || n.includes('hyrox')) return 'sport'
  if (n.includes('business') || n.includes('economi') || n.includes('économi')) return 'business'
  if (n.includes('tech') || n.includes('innovation')) return 'tech_innovation'
  const ORDER: readonly TabKey[] = [
    'ia_tech', 'business', 'bourse', 'international', 'sport', 'tech_innovation',
  ]
  return ORDER[Math.min(Math.max(positionIndex, 0), ORDER.length - 1)]
}

// ── Helpers dates ─────────────────────────────────────────────

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// Lundi de la semaine courante (ISO : week starts Monday)
function mondayIso(): string {
  const d = new Date()
  const jsDay = d.getDay()        // 0=Dim … 6=Sam
  const dayIndex = (jsDay + 6) % 7 // 0=Lun … 6=Dim
  const monday = new Date(d)
  monday.setDate(d.getDate() - dayIndex)
  return toIsoDate(monday)
}

function currentDayIndex(): number {
  const jsDay = new Date().getDay()
  return (jsDay + 6) % 7
}

function formatFrenchDate(isoDate: string): string {
  try {
    const d = new Date(isoDate + 'T00:00:00')
    const s = d.toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
    return s.charAt(0).toUpperCase() + s.slice(1)
  } catch {
    return isoDate
  }
}

function formatStartTime(h: number, m: number | null): string {
  const hh = String(h).padStart(2, '0')
  const mm = String(m ?? 0).padStart(2, '0')
  return `${hh}:${mm}`
}

// ── Helpers briefing ──────────────────────────────────────────

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
  for (const cat of content.categories) {
    for (const st of cat.sous_themes) {
      for (const a of st.articles) {
        words += countWords(a.titre) + countWords(a.resume)
          + countWords(a.source_nom) + countWords(a.source_date)
      }
    }
  }
  return Math.max(1, Math.ceil(words / 200))
}

function importanceColors(level: ImportanceLevel): { bg: string; fg: string } {
  switch (level) {
    case 'Majeur':    return { bg: 'rgba(239, 68, 68, 0.12)',  fg: '#ef4444' }
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
  if (!titre || !resume) return null

  // Nouveau format : source_nom + source_date séparés.
  // Compat : si l'ancien champ `source` est seul, on le reporte dans source_nom.
  let source_nom = typeof o.source_nom === 'string' ? o.source_nom : ''
  let source_date = typeof o.source_date === 'string' ? o.source_date : ''
  if (!source_nom && !source_date && typeof o.source === 'string') {
    source_nom = o.source
  }

  return {
    titre, resume,
    source_nom, source_date,
    importance: isImportance(o.importance) ? o.importance : 'A suivre',
  }
}

function sanitizeSubTheme(raw: unknown): SubTheme | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as { nom?: unknown; articles?: unknown }
  const nom = typeof s.nom === 'string' && s.nom.trim() ? s.nom.trim() : 'Général'
  const articles = Array.isArray(s.articles)
    ? s.articles.map(sanitizeArticle).filter((a): a is Article => a !== null)
    : []
  if (articles.length === 0) return null
  return { nom, articles }
}

// Normalise dans la forme canonique :
//   categories: [{ key, nom, sous_themes: [{ nom, articles }] }]
//
// Accepte les 3 formes sources :
//   (A) NEW  array   : [{ nom, sous_themes: [{nom, articles}] }]
//   (B) OLD  array   : [{ nom, articles: [...] }]            → wrap en un seul sous-thème
//   (C) OLD  keyed   : { ia_tech: [...], business: [...] }   → wrap idem
function sanitizeContent(raw: unknown): BriefingContent {
  const out: BriefingContent = { categories: [] }
  if (!raw || typeof raw !== 'object') return out
  const o = raw as Record<string, unknown>

  if (Array.isArray(o.a_retenir)) {
    out.a_retenir = o.a_retenir.filter((s): s is string => typeof s === 'string')
  }
  if (typeof o.temps_lecture_min === 'number') {
    out.temps_lecture_min = o.temps_lecture_min
  }

  const rawCats = o.categories

  if (Array.isArray(rawCats)) {
    rawCats.forEach((cat, i) => {
      if (!cat || typeof cat !== 'object') return
      const c = cat as { nom?: unknown; sous_themes?: unknown; articles?: unknown }
      const nom = typeof c.nom === 'string' ? c.nom : ''
      const key = mapNomToKey(nom, i)

      let sous_themes: SubTheme[] = []
      if (Array.isArray(c.sous_themes) && c.sous_themes.length > 0) {
        // (A) forme NEW
        sous_themes = c.sous_themes
          .map(sanitizeSubTheme)
          .filter((s): s is SubTheme => s !== null)
      } else if (Array.isArray(c.articles)) {
        // (B) forme OLD array sans sous_themes
        const arts = c.articles.map(sanitizeArticle).filter((a): a is Article => a !== null)
        if (arts.length > 0) {
          sous_themes = [{ nom: nom || KEY_LABELS[key], articles: arts }]
        }
      }

      if (sous_themes.length > 0) {
        out.categories.push({ key, nom: nom || KEY_LABELS[key], sous_themes })
      }
    })
  } else if (rawCats && typeof rawCats === 'object') {
    // (C) forme OLD keyed : { ia_tech: [...], business: [...], ... }
    const obj = rawCats as Record<string, unknown>
    const ORDER: readonly TabKey[] = [
      'ia_tech', 'business', 'bourse', 'international', 'sport', 'tech_innovation',
    ]
    for (const key of ORDER) {
      const arr = obj[key]
      if (Array.isArray(arr)) {
        const arts = arr.map(sanitizeArticle).filter((a): a is Article => a !== null)
        if (arts.length > 0) {
          out.categories.push({
            key,
            nom: KEY_LABELS[key],
            sous_themes: [{ nom: KEY_LABELS[key], articles: arts }],
          })
        }
      }
    }
  }

  return out
}

function intensityColor(intensity: string | null): string {
  switch (intensity) {
    case 'low':      return '#22c55e'
    case 'moderate': return '#eab308'
    case 'high':     return '#f97316'
    case 'max':      return '#ef4444'
    default:         return '#6b7280'
  }
}

function intensityLabel(intensity: string | null): string {
  switch (intensity) {
    case 'low':      return 'Facile'
    case 'moderate': return 'Modéré'
    case 'high':     return 'Intense'
    case 'max':      return 'Max'
    default:         return '—'
  }
}

// ══════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════

export default function BriefingPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const [sessions, setSessions]   = useState<PlannedSession[]>([])
  const [tasks, setTasks]         = useState<WeekTask[]>([])
  const [briefing, setBriefing]   = useState<Briefing | null>(null)
  const [isCreator, setIsCreator] = useState(false)

  const [activeTab, setActiveTab]           = useState<TabKey>('ia_tech')
  const [activeSubIndex, setActiveSubIndex] = useState(0)

  // Reset du sous-tab quand on change de catégorie principale
  useEffect(() => { setActiveSubIndex(0) }, [activeTab])

  // ── Fetch ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const sb = createClient()
        const { data: { user }, error: authErr } = await sb.auth.getUser()
        if (authErr || !user) {
          if (!cancelled) { setError('auth'); setLoading(false) }
          return
        }
        if (cancelled) return

        const weekStart = mondayIso()
        const dayIdx    = currentDayIndex()

        // Section 1 & 2 : parallel queries Supabase
        const [sessionsRes, tasksRes] = await Promise.all([
          sb.from('planned_sessions')
            .select('id, sport, title, time, duration_min, tss, intensity, notes, rpe')
            .eq('user_id', user.id)
            .eq('week_start', weekStart)
            .eq('day_index', dayIdx)
            .eq('status', 'planned')
            .order('time', { ascending: true, nullsFirst: false }),
          sb.from('week_tasks')
            .select('id, title, description, start_hour, start_min, duration_min, is_main, priority, type, completed')
            .eq('user_id', user.id)
            .eq('week_start', weekStart)
            .eq('day_index', dayIdx)
            .order('start_hour', { ascending: true })
            .order('start_min',  { ascending: true, nullsFirst: true }),
        ])

        if (cancelled) return
        if (sessionsRes.error) console.log('[briefing] sessions error:', sessionsRes.error.message)
        if (tasksRes.error)    console.log('[briefing] tasks error:',    tasksRes.error.message)

        setSessions((sessionsRes.data ?? []) as PlannedSession[])
        setTasks((tasksRes.data ?? []) as WeekTask[])

        // Section 3 : on appelle toujours /api/briefing qui renvoie
        // à la fois `briefing` (null pour les non-créateurs via RLS)
        // et `isCreator` (comparé côté serveur avec process.env.CREATOR_USER_ID).
        try {
          const res = await fetch('/api/briefing', { cache: 'no-store' })
          if (res.ok) {
            const json = await res.json() as {
              briefing: Briefing | null
              isCreator: boolean
            }
            if (cancelled) return
            setIsCreator(Boolean(json.isCreator))
            if (json.briefing) {
              const cleaned: Briefing = {
                ...json.briefing,
                content: sanitizeContent(json.briefing.content),
              }
              setBriefing(cleaned)
              if (!cleaned.lu && json.isCreator) {
                void fetch('/api/briefing', { method: 'PATCH' }).catch(() => {})
              }
            }
          }
        } catch { /* silent, section 3 reste masquée */ }

        if (!cancelled) setLoading(false)
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

  const activeCategory = briefing?.content.categories.find(c => c.key === activeTab) ?? null
  const subThemesCount = activeCategory?.sous_themes.length ?? 0
  const safeSubIndex   = subThemesCount > 0
    ? Math.min(Math.max(activeSubIndex, 0), subThemesCount - 1)
    : 0
  const activeSubTheme = activeCategory?.sous_themes[safeSubIndex] ?? null
  const activeArticles = activeSubTheme?.articles ?? []

  // ── Toggle tâche ────────────────────────────────────────
  async function toggleTask(taskId: string, nextCompleted: boolean) {
    // Optimistic UI
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: nextCompleted } : t))
    const sb = createClient()
    const { error: updErr } = await sb.from('week_tasks')
      .update({ completed: nextCompleted })
      .eq('id', taskId)
    if (updErr) {
      // Revert
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !nextCompleted } : t))
      console.log('[briefing] task toggle failed:', updErr.message)
    }
  }

  // ── Render : états préliminaires ─────────────────────────
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

  // ── Rendu principal ─────────────────────────────────────
  const today = toIsoDate(new Date())

  return (
    <div style={page}>

      {/* HEADER */}
      <header style={{ marginBottom: 24 }}>
        <h1 style={h1Style}>Briefing du jour</h1>
        <p style={dateStyle}>{formatFrenchDate(today)}</p>
      </header>

      {/* ─────────── SECTION 1 : SÉANCE DU JOUR ─────────── */}
      <section style={{ marginBottom: 20 }}>
        <p style={sectionLabel}>Séance du jour</p>
        {sessions.length === 0 ? (
          <div style={{ ...card, padding: 20, textAlign: 'center' }}>
            <p style={{
              margin: 0,
              fontFamily: 'Syne, sans-serif',
              fontSize: 15, fontWeight: 700,
              color: 'var(--text)',
            }}>
              Jour de repos
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-mid)' }}>
              Aucune séance planifiée aujourd&apos;hui.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sessions.map(s => (
              <div key={s.id} style={{ ...card, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                    padding: '3px 9px', borderRadius: 99,
                    background: 'rgba(139,92,246,0.12)', color: '#8b5cf6',
                    textTransform: 'uppercase',
                  }}>
                    {s.sport}
                  </span>
                  <h2 style={{
                    flex: 1, minWidth: 180,
                    margin: 0,
                    fontFamily: 'Syne, sans-serif',
                    fontWeight: 700, fontSize: 15, lineHeight: 1.35,
                    color: 'var(--text)',
                  }}>
                    {s.title}
                  </h2>
                  {s.time && (
                    <span style={{ fontSize: 12, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
                      {s.time}
                    </span>
                  )}
                </div>

                {/* Metrics row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: s.notes ? 10 : 0 }}>
                  {s.duration_min != null && (
                    <Metric label="Durée"    value={`${s.duration_min} min`} />
                  )}
                  {s.tss != null && (
                    <Metric label="TSS"      value={String(s.tss)} />
                  )}
                  {s.intensity && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: intensityColor(s.intensity),
                        flexShrink: 0,
                      }} />
                      <Metric label="Intensité" value={intensityLabel(s.intensity)} />
                    </div>
                  )}
                  {s.rpe != null && (
                    <Metric label="RPE"      value={String(s.rpe)} />
                  )}
                </div>

                {s.notes && (
                  <div style={{
                    marginTop: 4,
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'var(--bg2, rgba(0,0,0,0.03))',
                    borderLeft: '3px solid #00c8e0',
                  }}>
                    <p style={{
                      margin: 0,
                      fontSize: 13, lineHeight: 1.6,
                      color: 'var(--text-mid)',
                      fontStyle: 'italic',
                    }}>
                      {s.notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─────────── SECTION 2 : TÂCHES DU JOUR ─────────── */}
      {tasks.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <p style={sectionLabel}>Tâches du jour</p>
          <div style={{ ...card, padding: 8 }}>
            {tasks.map((t, i) => {
              const crossed = t.completed
              return (
                <label
                  key={t.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 12px',
                    borderTop: i > 0 ? '1px solid var(--border, rgba(0,0,0,0.06))' : 'none',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={t.completed}
                    onChange={e => { void toggleTask(t.id, e.target.checked) }}
                    style={{
                      marginTop: 3,
                      width: 16, height: 16,
                      accentColor: '#00c8e0',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 14,
                        fontWeight: t.is_main ? 700 : 500,
                        color: crossed ? 'var(--text-dim)' : 'var(--text)',
                        textDecoration: crossed ? 'line-through' : 'none',
                        lineHeight: 1.4,
                      }}>
                        {t.title}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatStartTime(t.start_hour, t.start_min)}
                        {t.duration_min != null ? ` · ${t.duration_min} min` : ''}
                      </span>
                      {t.priority && (
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          padding: '2px 7px', borderRadius: 99,
                          background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                        }}>
                          Priorité
                        </span>
                      )}
                    </div>
                    {t.description && (
                      <p style={{
                        margin: '4px 0 0',
                        fontSize: 12, lineHeight: 1.55,
                        color: crossed ? 'var(--text-dim)' : 'var(--text-mid)',
                        textDecoration: crossed ? 'line-through' : 'none',
                      }}>
                        {t.description}
                      </p>
                    )}
                  </div>
                </label>
              )
            })}
          </div>
        </section>
      )}

      {/* ─────────── SECTION 3 : ACTU DU JOUR (créateur only) ─────────── */}
      {isCreator && (
        <section>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
            <p style={{ ...sectionLabel, margin: 0 }}>Actus du jour</p>
            {briefing && (
              <span style={{
                fontSize: 11,
                color: 'var(--text-dim)',
                padding: '2px 8px',
                borderRadius: 99,
                background: 'var(--bg2, rgba(0,0,0,0.04))',
                border: '1px solid var(--border, rgba(0,0,0,0.08))',
              }}>
                {readingMinutes} min de lecture
              </span>
            )}
          </div>

          {!briefing ? (
            <div style={{
              ...card, padding: '32px 24px', textAlign: 'center', borderStyle: 'dashed',
            }}>
              <p style={{
                margin: '0 0 6px',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15,
                color: 'var(--text)',
              }}>
                Pas encore disponible
              </p>
              <p style={{ margin: 0, color: 'var(--text-mid)', fontSize: 13, lineHeight: 1.7 }}>
                Le briefing sera disponible à 7h00.
              </p>
            </div>
          ) : (
            <>
              {/* À retenir */}
              {(briefing.content.a_retenir?.length ?? 0) > 0 && (
                <div style={{
                  ...card,
                  background: 'linear-gradient(135deg, rgba(0,200,224,0.08), rgba(91,111,255,0.06))',
                  border: '1px solid rgba(0,200,224,0.22)',
                  padding: 20,
                  marginBottom: 16,
                }}>
                  <p style={{
                    margin: '0 0 12px',
                    fontFamily: 'Syne, sans-serif',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: '#00c8e0',
                  }}>
                    À retenir
                  </p>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(briefing.content.a_retenir ?? []).slice(0, 3).map((b, i) => (
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
                </div>
              )}

              {/* Main tabs */}
              <div style={{
                display: 'flex', gap: 4, flexWrap: 'wrap',
                marginBottom: activeCategory && subThemesCount > 1 ? 10 : 16,
                borderBottom: '1px solid var(--border, rgba(0,0,0,0.08))',
              }}>
                {TABS.map(tab => {
                  const active = tab.key === activeTab
                  const cat = briefing.content.categories.find(c => c.key === tab.key)
                  const count = cat?.sous_themes.reduce((s, st) => s + st.articles.length, 0) ?? 0
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      style={{
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        padding: '10px 14px', marginBottom: -1,
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
                          fontSize: 11, fontWeight: 600,
                          padding: '1px 7px', borderRadius: 99,
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

              {/* Sub-tabs — dynamiques selon la catégorie active.
                  Masquées si une seule sous-catégorie (cas "Général" unique). */}
              {activeCategory && subThemesCount > 1 && (
                <div style={{
                  display: 'flex', gap: 6, flexWrap: 'wrap',
                  marginBottom: 16,
                }}>
                  {activeCategory.sous_themes.map((st, idx) => {
                    const active = idx === safeSubIndex
                    return (
                      <button
                        key={`${activeTab}-${idx}-${st.nom}`}
                        onClick={() => setActiveSubIndex(idx)}
                        style={{
                          cursor: 'pointer',
                          padding: '5px 11px',
                          borderRadius: 99,
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: 12,
                          fontWeight: active ? 700 : 500,
                          border: active
                            ? '1px solid #00c8e0'
                            : '1px solid var(--border, rgba(0,0,0,0.08))',
                          background: active ? 'rgba(0,200,224,0.10)' : 'transparent',
                          color: active ? '#00c8e0' : 'var(--text-mid)',
                          display: 'flex', alignItems: 'center', gap: 6,
                          transition: 'all 0.14s',
                        }}
                      >
                        {st.nom}
                        <span style={{
                          fontSize: 10, fontWeight: 600,
                          padding: '0 6px', borderRadius: 99, minWidth: 16,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          background: active ? 'rgba(0,200,224,0.18)' : 'var(--bg2, rgba(0,0,0,0.05))',
                          color: active ? '#00c8e0' : 'var(--text-dim)',
                        }}>
                          {st.articles.length}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

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
                  const sourceParts = [a.source_nom, a.source_date].filter(s => s && s.trim())
                  const sourceLabel = sourceParts.join(' · ')
                  return (
                    <article key={i} style={{ ...card, padding: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                        <h3 style={{
                          flex: 1, minWidth: 240,
                          margin: 0,
                          fontFamily: 'Syne, sans-serif',
                          fontWeight: 700, fontSize: 16, lineHeight: 1.35,
                          color: 'var(--text)',
                        }}>
                          {a.titre}
                        </h3>
                        <span style={{
                          flexShrink: 0,
                          fontSize: 11, fontWeight: 700,
                          padding: '3px 10px', borderRadius: 99,
                          background: c.bg, color: c.fg,
                          letterSpacing: '0.02em',
                        }}>
                          {a.importance}
                        </span>
                      </div>
                      <p style={{
                        margin: '0 0 12px',
                        fontSize: 14, lineHeight: 1.7,
                        color: 'var(--text-mid)',
                      }}>
                        {a.resume}
                      </p>
                      {sourceLabel && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <span style={{
                            fontSize: 11,
                            color: 'var(--text-dim)',
                          }}>
                            {sourceLabel}
                          </span>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  )
}

// ── Sous-composant métrique ───────────────────────────────────

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: 'var(--text-dim)',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 14, fontWeight: 600,
        color: 'var(--text)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </span>
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
  fontWeight: 800, fontSize: 28,
  letterSpacing: '-0.015em',
  color: 'var(--text)',
  lineHeight: 1.15,
}

const dateStyle: React.CSSProperties = {
  margin: '6px 0 0',
  fontSize: 14,
  color: 'var(--text-mid)',
  fontWeight: 500,
}

const sectionLabel: React.CSSProperties = {
  margin: '0 0 10px',
  fontFamily: 'Syne, sans-serif',
  fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: '#00c8e0',
}
