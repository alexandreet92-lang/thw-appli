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

import { useEffect, useMemo, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DailyBrief, BriefIdea, RawIdea, InstaSnapshot } from '@/lib/marketing/types'

// ── Marketing constants ────────────────────────────────────────
const MKT_PILLAR_COLORS: Record<string, string> = {
  athlete: '#00c8e0',
  expert:  '#5b6fff',
  builder: '#f59e0b',
}
const MKT_TIER: Record<string, { label: string; color: string }> = {
  express:  { label: 'EXPRESS · 5 min',  color: '#10b981' },
  standard: { label: 'STANDARD · 20 min', color: '#5b6fff' },
  deep:     { label: 'DEEP · 1h+',        color: '#ef4444' },
}

interface MktContextSummary {
  activities_count: number; commits_count: number
  raw_ideas_count: number;  recent_posts_count: number
}
interface MktHistoryItem {
  id: string; brief_date: string; brief_content: DailyBrief
  tokens_in: number; tokens_out: number; generation_ms: number
}

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

  // ── Marketing state (visible uniquement si isCreator) ────────
  const [mktBrief,    setMktBrief]    = useState<DailyBrief | null>(null)
  const [mktLoading,  setMktLoading]  = useState(false)
  const [mktError,    setMktError]    = useState<string | null>(null)
  const [mktCtxSum,   setMktCtxSum]   = useState<MktContextSummary | null>(null)
  const [mktIdeas,    setMktIdeas]    = useState<RawIdea[]>([])
  const [mktHistory,  setMktHistory]  = useState<MktHistoryItem[]>([])
  const [mktNewIdea,  setMktNewIdea]  = useState('')
  const [mktNewCtx,   setMktNewCtx]   = useState('')

  // ── Instagram Insights state ───────────────────────────────
  const [instaSnapshots,   setInstaSnapshots]   = useState<InstaSnapshot[]>([])
  const [instaUploading,   setInstaUploading]   = useState(false)
  const [instaError,       setInstaError]       = useState<string | null>(null)
  const [instaDragOver,    setInstaDragOver]    = useState(false)
  const [instaAmbiguities, setInstaAmbiguities] = useState<string[]>([])

  const loadInstaSnapshots = useCallback(async () => {
    const res = await fetch('/api/marketing/insta-upload')
    if (!res.ok) return
    const json = await res.json() as { snapshots: InstaSnapshot[] }
    setInstaSnapshots(json.snapshots ?? [])
  }, [])

  async function uploadInstaScreenshots(files: FileList | File[]) {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (arr.length === 0) return
    setInstaUploading(true)
    setInstaError(null)
    setInstaAmbiguities([])
    try {
      const form = new FormData()
      arr.forEach(f => form.append('screenshots', f))
      const res = await fetch('/api/marketing/insta-upload', { method: 'POST', body: form })
      const json = await res.json() as { insights?: unknown; error?: string; ambiguities?: string[] }
      if (!res.ok) throw new Error(json.error ?? 'Erreur upload')
      if (json.ambiguities && json.ambiguities.length > 0) {
        setInstaAmbiguities(json.ambiguities)
      }
      void loadInstaSnapshots()
    } catch (err) {
      setInstaError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setInstaUploading(false)
    }
  }

  const loadMktHistory = useCallback(async () => {
    const res = await fetch('/api/marketing/daily-brief')
    if (!res.ok) return
    const json = await res.json() as { briefs: MktHistoryItem[] }
    setMktHistory(json.briefs ?? [])
    const today = new Date().toISOString().split('T')[0]
    const todayBrief = (json.briefs ?? []).find(b => b.brief_date === today)
    if (todayBrief) setMktBrief(todayBrief.brief_content)
  }, [])

  const loadMktIdeas = useCallback(async () => {
    const res = await fetch('/api/marketing/ideas')
    if (!res.ok) return
    const json = await res.json() as { ideas: RawIdea[] }
    setMktIdeas(json.ideas ?? [])
  }, [])

  // Charge les données marketing dès que l'on sait que c'est le créateur
  useEffect(() => {
    if (!isCreator) return
    void loadMktHistory()
    void loadMktIdeas()
    void loadInstaSnapshots()
  }, [isCreator, loadMktHistory, loadMktIdeas, loadInstaSnapshots])

  async function generateMktBrief() {
    setMktLoading(true); setMktError(null)
    try {
      const res  = await fetch('/api/marketing/daily-brief', { method: 'POST' })
      const json = await res.json() as { brief?: DailyBrief; error?: string; context_summary?: MktContextSummary }
      if (!res.ok) throw new Error(json.error ?? 'Erreur génération')
      setMktBrief(json.brief ?? null)
      setMktCtxSum(json.context_summary ?? null)
      void loadMktHistory()
      void loadMktIdeas()
    } catch (err) {
      setMktError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setMktLoading(false)
    }
  }

  async function addMktIdea() {
    if (!mktNewIdea.trim()) return
    const res = await fetch('/api/marketing/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: mktNewIdea, context: mktNewCtx || undefined }),
    })
    if (res.ok) { setMktNewIdea(''); setMktNewCtx(''); void loadMktIdeas() }
  }

  async function deleteMktIdea(id: string) {
    await fetch(`/api/marketing/ideas?id=${id}`, { method: 'DELETE' })
    void loadMktIdeas()
  }

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

      {/* ─────────── SECTION 4 : MARKETING (créateur only) ──────────── */}
      {isCreator && (
        <section style={{ marginTop: 40 }}>

          {/* Séparateur visuel */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
          }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border, rgba(0,0,0,0.08))' }} />
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: '#f59e0b',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 11l19-9-9 19-2-8-8-2z"/>
              </svg>
              Marketing
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border, rgba(0,0,0,0.08))' }} />
          </div>

          {/* Bouton générer + résumé contexte */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
            <button
              onClick={() => { void generateMktBrief() }}
              disabled={mktLoading}
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                color: 'white', border: 'none',
                padding: '10px 20px', borderRadius: 10,
                fontSize: 14, fontWeight: 600,
                cursor: mktLoading ? 'wait' : 'pointer',
                opacity: mktLoading ? 0.65 : 1,
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              {mktLoading ? 'Génération…' : 'Générer le brief du jour'}
            </button>
            {mktCtxSum && (
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                {mktCtxSum.activities_count} activités · {mktCtxSum.commits_count} commits · {mktCtxSum.raw_ideas_count} idées · {mktCtxSum.recent_posts_count} posts
              </span>
            )}
          </div>

          {mktError && (
            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              padding: '10px 14px', borderRadius: 8, marginBottom: 14,
              fontSize: 13, color: '#ef4444',
            }}>
              {mktError}
            </div>
          )}

          {/* Brief du jour */}
          {mktBrief && (
            <div style={{ marginBottom: 32 }}>
              <p style={{ ...sectionLabel, color: '#f59e0b', marginBottom: 12 }}>
                Brief du {mktBrief.date}
              </p>

              {/* Analyse hebdo */}
              {mktBrief.weekly_analysis && (
                <div style={{
                  ...card,
                  background: 'rgba(245,158,11,0.04)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  padding: 14, marginBottom: 16,
                }}>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>
                    <strong>Équilibre</strong> — Athlète&nbsp;{mktBrief.weekly_analysis.pillar_balance.athlete} · Expert&nbsp;{mktBrief.weekly_analysis.pillar_balance.expert} · Builder&nbsp;{mktBrief.weekly_analysis.pillar_balance.builder}
                    &nbsp;·&nbsp;Urgence&nbsp;<strong>{mktBrief.weekly_analysis.urgency}</strong>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-mid)' }}>
                    {mktBrief.weekly_analysis.recommendation}
                  </div>
                </div>
              )}

              {/* Idées */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {mktBrief.ideas?.map((idea, i) => (
                  <MktIdeaCard key={i} idea={idea} />
                ))}
              </div>
            </div>
          )}

          {/* Banque d'idées brutes */}
          <p style={{ ...sectionLabel, color: '#f59e0b', marginBottom: 10 }}>
            Idées brutes
          </p>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            Balance ici tes pensées en footing, lecture, conversation. L&apos;agent les utilise dans les prochains briefs.
          </p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <textarea
              value={mktNewIdea}
              onChange={e => setMktNewIdea(e.target.value)}
              placeholder="Une pensée, un sujet, une remarque…"
              rows={2}
              style={{
                flex: '1 1 260px', padding: '10px 12px', borderRadius: 8,
                border: '1px solid var(--border, rgba(0,0,0,0.1))',
                fontFamily: 'DM Sans, sans-serif', fontSize: 13,
                resize: 'vertical', background: 'var(--bg2)',
                color: 'var(--text)',
              }}
            />
            <input
              value={mktNewCtx}
              onChange={e => setMktNewCtx(e.target.value)}
              placeholder="Contexte (optionnel)"
              style={{
                flex: '0 1 180px', padding: '10px 12px', borderRadius: 8,
                border: '1px solid var(--border, rgba(0,0,0,0.1))',
                fontFamily: 'DM Sans, sans-serif', fontSize: 13,
                background: 'var(--bg2)', color: 'var(--text)',
              }}
            />
            <button
              onClick={() => { void addMktIdea() }}
              disabled={!mktNewIdea.trim()}
              style={{
                background: mktNewIdea.trim() ? '#1a1a1a' : 'var(--border)',
                color: 'white', border: 'none',
                padding: '0 18px', borderRadius: 8,
                fontSize: 13, fontWeight: 600,
                cursor: mktNewIdea.trim() ? 'pointer' : 'not-allowed',
                opacity: mktNewIdea.trim() ? 1 : 0.4,
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Ajouter
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 32 }}>
            {mktIdeas.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--text-dim)', fontStyle: 'italic', margin: 0 }}>
                Aucune idée pour l&apos;instant.
              </p>
            )}
            {mktIdeas.map(idea => (
              <div key={idea.id} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                padding: '10px 12px',
                ...card,
                opacity: idea.used ? 0.5 : 1,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>{idea.content}</div>
                  {idea.context && (
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>
                      [{idea.context}]
                    </div>
                  )}
                  {idea.used && (
                    <div style={{ fontSize: 11, color: '#10b981', marginTop: 3 }}>✓ utilisée</div>
                  )}
                </div>
                <button
                  onClick={() => { void deleteMktIdea(idea.id) }}
                  style={{
                    background: 'transparent', border: 'none',
                    color: 'var(--text-dim)', cursor: 'pointer',
                    fontSize: 18, lineHeight: 1, padding: 0,
                  }}
                  aria-label="Supprimer"
                >×</button>
              </div>
            ))}
          </div>

          {/* Instagram Insights */}
          <p style={{ ...sectionLabel, color: '#f59e0b', marginBottom: 10 }}>
            Instagram Insights
          </p>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            Dépose tes screenshots Insights pour que l&apos;IA les analyse et enrichisse le prochain brief.
          </p>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setInstaDragOver(true) }}
            onDragLeave={() => setInstaDragOver(false)}
            onDrop={e => {
              e.preventDefault(); setInstaDragOver(false)
              void uploadInstaScreenshots(e.dataTransfer.files)
            }}
            onClick={() => {
              const inp = document.createElement('input')
              inp.type = 'file'; inp.multiple = true; inp.accept = 'image/*'
              inp.onchange = () => { if (inp.files) void uploadInstaScreenshots(inp.files) }
              inp.click()
            }}
            style={{
              border: `2px dashed ${instaDragOver ? '#f59e0b' : 'var(--border, rgba(0,0,0,0.12))'}`,
              borderRadius: 12,
              padding: '24px 16px',
              textAlign: 'center',
              cursor: instaUploading ? 'wait' : 'pointer',
              background: instaDragOver ? 'rgba(245,158,11,0.05)' : 'transparent',
              transition: 'all 0.15s',
              marginBottom: 12,
              userSelect: 'none',
            }}
          >
            {instaUploading ? (
              <p style={{ margin: 0, fontSize: 13, color: '#f59e0b' }}>
                Analyse en cours par Claude Vision…
              </p>
            ) : (
              <>
                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  Dépose tes screenshots ici
                </p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)' }}>
                  ou clique pour choisir des fichiers (max 10 images)
                </p>
              </>
            )}
          </div>

          {instaError && (
            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              padding: '10px 14px', borderRadius: 8, marginBottom: 10,
              fontSize: 13, color: '#ef4444',
            }}>
              {instaError}
            </div>
          )}

          {instaAmbiguities.length > 0 && (
            <div style={{
              background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
              padding: '10px 14px', borderRadius: 8, marginBottom: 10,
              fontSize: 12, color: '#f59e0b',
            }}>
              <strong>Ambiguïtés détectées :</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: 16 }}>
                {instaAmbiguities.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}

          {/* Dernier snapshot */}
          {instaSnapshots.length > 0 && (
            <InstaSnapshotCard snapshot={instaSnapshots[0]} />
          )}

          {/* Snapshots précédents */}
          {instaSnapshots.length > 1 && (
            <details style={{ marginBottom: 32, marginTop: 8 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--text-dim)' }}>
                Voir les {instaSnapshots.length - 1} snapshot(s) précédent(s)
              </summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {instaSnapshots.slice(1).map(s => (
                  <InstaSnapshotCard key={s.id} snapshot={s} compact />
                ))}
              </div>
            </details>
          )}

          {/* Historique */}
          {mktHistory.length > 0 && (
            <>
              <p style={{ ...sectionLabel, color: '#f59e0b', marginBottom: 10 }}>
                Historique
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {mktHistory.slice(0, 10).map(h => (
                  <details key={h.id} style={{ ...card, padding: 12 }}>
                    <summary style={{ cursor: 'pointer', fontSize: 13 }}>
                      <strong>{h.brief_date}</strong> · {h.brief_content?.ideas?.length ?? 0} idées · {h.tokens_in ?? 0}+{h.tokens_out ?? 0} tokens · {h.generation_ms ?? 0}ms
                    </summary>
                    <pre style={{
                      fontSize: 11, marginTop: 8, overflow: 'auto',
                      maxHeight: 320, background: 'var(--bg2)',
                      padding: 10, borderRadius: 6,
                    }}>
                      {JSON.stringify(h.brief_content, null, 2)}
                    </pre>
                  </details>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  )
}

// ── Carte idée marketing ───────────────────────────────────────

function MktIdeaCard({ idea }: { idea: BriefIdea }) {
  const tier    = MKT_TIER[idea.tier]    ?? MKT_TIER.standard
  const pillarC = MKT_PILLAR_COLORS[idea.pillar] ?? '#666'
  return (
    <div style={{ ...card, padding: 18, position: 'relative' } as React.CSSProperties}>
      {/* Badges */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: tier.color, color: '#fff', letterSpacing: 0.4 }}>
          {tier.label}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: pillarC, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {idea.pillar}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: '#1a1a1a', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {idea.format}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 'auto', alignSelf: 'center' }}>
          ~{idea.production_minutes} min
        </span>
      </div>

      {/* Hook */}
      <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, margin: '0 0 10px', lineHeight: 1.35, color: 'var(--text)' }}>
        {idea.hook}
      </h3>

      {/* Structure */}
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 4 }}>Structure</div>
      <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', color: 'var(--text-mid)', marginBottom: 12 }}>{idea.structure}</div>

      {/* Caption */}
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 4 }}>Caption</div>
      <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', background: 'var(--bg2, rgba(0,0,0,0.03))', padding: '10px 12px', borderRadius: 8, marginBottom: 10, color: 'var(--text-mid)' }}>
        {idea.caption}
      </div>

      {/* Hashtags */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
        {idea.hashtags?.map(h => (
          <span key={h} style={{ fontSize: 12, color: '#5b6fff', background: 'rgba(91,111,255,0.1)', padding: '2px 8px', borderRadius: 6 }}>
            #{h.replace(/^#/, '')}
          </span>
        ))}
      </div>

      {/* Why it works */}
      <div style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic', borderTop: '1px solid var(--border, rgba(0,0,0,0.06))', paddingTop: 8 }}>
        💡 {idea.why_it_works}
      </div>

      {/* Copier */}
      <button
        onClick={() => {
          const text = `${idea.caption}\n\n${idea.hashtags?.map(h => `#${h.replace(/^#/, '')}`).join(' ') ?? ''}`
          void navigator.clipboard?.writeText(text)
        }}
        style={{
          position: 'absolute', top: 14, right: 14,
          background: 'transparent', border: '1px solid var(--border, rgba(0,0,0,0.1))',
          borderRadius: 6, padding: '3px 9px', fontSize: 11,
          cursor: 'pointer', color: 'var(--text-dim)',
        }}
      >Copier</button>
    </div>
  )
}

// ── Carte Instagram Snapshot ──────────────────────────────────

function InstaSnapshotCard({ snapshot, compact = false }: { snapshot: InstaSnapshot; compact?: boolean }) {
  if (compact) {
    return (
      <div style={{ ...cardStyle, padding: '10px 14px', opacity: 0.7 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{snapshot.snapshot_date}</span>
          {snapshot.reach_total != null && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Reach {snapshot.reach_total.toLocaleString('fr-FR')}</span>}
          {snapshot.followers_count != null && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Followers {snapshot.followers_count.toLocaleString('fr-FR')}</span>}
          {snapshot.best_format && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontWeight: 600 }}>{snapshot.best_format}</span>}
        </div>
      </div>
    )
  }

  const delta = snapshot.followers_delta_7d
  const topPosts = snapshot.top_posts ?? []

  return (
    <div style={{ ...cardStyle, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f59e0b' }}>
          Snapshot {snapshot.snapshot_date}
        </span>
        {snapshot.period_start && snapshot.period_end && (
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            {snapshot.period_start} → {snapshot.period_end}
          </span>
        )}
        {snapshot.screenshot_count != null && (
          <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 'auto' }}>
            {snapshot.screenshot_count} screenshot{snapshot.screenshot_count > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Métriques */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
        {snapshot.reach_total != null && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>Reach</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{snapshot.reach_total.toLocaleString('fr-FR')}</div>
          </div>
        )}
        {snapshot.impressions_total != null && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>Impressions</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{snapshot.impressions_total.toLocaleString('fr-FR')}</div>
          </div>
        )}
        {snapshot.followers_count != null && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>Followers</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'center', gap: 6 }}>
              {snapshot.followers_count.toLocaleString('fr-FR')}
              {delta != null && (
                <span style={{ fontSize: 13, color: delta >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                  {delta >= 0 ? '+' : ''}{delta}
                </span>
              )}
            </div>
          </div>
        )}
        {snapshot.best_format && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>Meilleur format</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f59e0b', textTransform: 'capitalize' }}>{snapshot.best_format}</div>
          </div>
        )}
      </div>

      {/* Résumé */}
      {snapshot.insights_summary && (
        <div style={{
          padding: '10px 12px', borderRadius: 8,
          background: 'rgba(245,158,11,0.05)', borderLeft: '3px solid #f59e0b',
          fontSize: 13, lineHeight: 1.6, color: 'var(--text-mid)',
          marginBottom: topPosts.length > 0 ? 12 : 0,
        }}>
          {snapshot.insights_summary}
        </div>
      )}

      {/* Top posts */}
      {topPosts.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', marginBottom: 8, marginTop: 4 }}>
            Top posts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topPosts.slice(0, 3).map((p, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                padding: '8px 10px', borderRadius: 8,
                background: 'var(--bg2, rgba(0,0,0,0.03))',
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                  background: '#1a1a1a', color: '#fff', textTransform: 'uppercase',
                  letterSpacing: 0.5, flexShrink: 0,
                }}>{p.format}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--text)', fontStyle: 'italic', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.caption_excerpt}
                  </div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
                    <span>❤ {p.likes.toLocaleString('fr-FR')}</span>
                    <span>🔖 {p.saves.toLocaleString('fr-FR')}</span>
                    <span>👁 {p.reach.toLocaleString('fr-FR')}</span>
                    {p.comments != null && <span>💬 {p.comments}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Local style alias for InstaSnapshotCard (can't reference const card from outer scope)
const cardStyle: React.CSSProperties = {
  background: 'var(--bg2, #fff)',
  border: '1px solid var(--border, rgba(0,0,0,0.08))',
  borderRadius: 14,
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
