'use client'

// ══════════════════════════════════════════════════════════════
// AI PANEL — Interface IA premium THW Coaching
//
// [FIX LAYOUT] createPortal → rendu sur document.body
//   La <main> du layout a z-index:10 (stacking context).
//   Sans portal, le z-index:1200 du panel est relatif à ce
//   contexte et reste sous la barre mobile (z-index:50 root).
//   Avec portal, le panel est dans le root stacking context
//   et z-index:1200 > z-index:50 de la barre mobile.
//
// [FIX SAFE AREA] padding-top: env(safe-area-inset-top)
//   Gère le notch iPhone / Dynamic Island.
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { PageAgent } from './agentConfig'
import { AGENT_CONFIGS, MAIN_AGENTS, AGENT_DISPLAY } from './agentConfig'
import type { QuickAction } from './agentConfig'

// ── Types ──────────────────────────────────────────────────────

interface AIMsg {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: number
}
interface AIConv {
  id: string
  title: string
  agentId: PageAgent
  createdAt: number
  updatedAt: number
  msgs: AIMsg[]
}
type ConvStore = Partial<Record<PageAgent, AIConv[]>>

interface Props {
  open: boolean
  onClose: () => void
  initialAgent: PageAgent
  context?: Record<string, unknown>
  prefillMessage?: string
  /** Pré-remplit une conversation avec un message IA déjà généré (ex: analyse de profil) */
  initialUserLabel?: string
  initialAssistantMsg?: string
}

// ── Routes par agent ──────────────────────────────────────────

const AGENT_ROUTES: Record<string, string> = {
  planning:       '/planning',
  strategy:       '/calendar',
  readiness:      '/recovery',
  sessionBuilder: '/session',
  nutrition:      '/nutrition',
  performance:    '/activities',
  profiling:      '/performance',
  adjustment:     '/planning',
}

// ── Storage ────────────────────────────────────────────────────

const STORE_KEY  = 'thw_ai_convs_v2'
const MAX_AGENT  = 20

function loadStore(): ConvStore {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') }
  catch { return {} }
}
function saveStore(s: ConvStore) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)) } catch {}
}
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'matin'
  if (h >= 12 && h < 18) return 'après-midi'
  return 'soir'
}
function fmtDate(ts: number) {
  const d = Date.now() - ts
  if (d < 60_000) return "instant"
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}min`
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// ── Markdown renderer — aucun hashtag ou tiret visible ─────────

function MsgContent({ text }: { text: string }) {
  const blocks: React.ReactNode[] = []
  const lines = text.split('\n')
  let i = 0

  while (i < lines.length) {
    const raw = lines[i]
    const line = raw.trimEnd()

    // Ligne vide → espace
    if (!line.trim()) { blocks.push(<div key={i} style={{ height: 7 }} />); i++; continue }

    // Séparateur --- ou === → ignoré
    if (/^[-=]{3,}$/.test(line.trim())) { i++; continue }

    // Heading ## ou # → titre stylé sans symboles
    const hMatch = line.match(/^(#{1,4})\s+(.+)/)
    if (hMatch) {
      const lvl = hMatch[1].length
      blocks.push(
        <div key={i} style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 700,
          fontSize: lvl <= 2 ? 14 : 12,
          color: 'inherit',
          marginTop: lvl <= 2 ? 14 : 10,
          marginBottom: 5,
          letterSpacing: lvl >= 3 ? '0.05em' : undefined,
          textTransform: lvl >= 3 ? 'uppercase' as const : undefined,
          opacity: lvl >= 3 ? 0.5 : 1,
          borderBottom: lvl === 1 ? '1px solid rgba(91,111,255,0.2)' : undefined,
          paddingBottom: lvl === 1 ? 6 : undefined,
        }}>
          {parseBold(hMatch[2])}
        </div>
      )
      i++; continue
    }

    // Liste numérotée
    const nMatch = line.match(/^(\d+)[.)]\s+(.+)/)
    if (nMatch) {
      blocks.push(
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
          <span style={{ color: '#5b6fff', minWidth: 18, fontSize: 12, fontWeight: 600, flexShrink: 0, marginTop: 2 }}>
            {nMatch[1]}.
          </span>
          <span style={{ fontSize: 13, lineHeight: 1.6 }}>{parseBold(nMatch[2])}</span>
        </div>
      )
      i++; continue
    }

    // Bullet
    const bMatch = line.match(/^[-•*]\s+(.+)/)
    if (bMatch) {
      blocks.push(
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
          <span style={{ color: '#5b6fff', flexShrink: 0, fontSize: 9, marginTop: 5 }}>▸</span>
          <span style={{ fontSize: 13, lineHeight: 1.6 }}>{parseBold(bMatch[1])}</span>
        </div>
      )
      i++; continue
    }

    // Texte normal
    blocks.push(
      <p key={i} style={{ fontSize: 13, lineHeight: 1.65, margin: '0 0 5px 0' }}>
        {parseBold(line)}
      </p>
    )
    i++
  }

  return <div style={{ fontFamily: 'DM Sans, sans-serif' }}>{blocks}</div>
}

function parseBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*([^*]+)\*\*/g)
  if (parts.length === 1) return text
  return <>{parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : <span key={j}>{p}</span>)}</>
}

// ══════════════════════════════════════════════════════════════
// SESSION DETECTION & RENDERING
// Détecte les séances d'entraînement dans les réponses IA et
// les affiche sous forme de carte visuelle avec graphique,
// édition inline et ajout direct au Planning Supabase.
// ══════════════════════════════════════════════════════════════

// Zone colors — identiques à Z_COLORS dans Performance
const SESSION_ZONE_COLORS = ['#9ca3af', '#22c55e', '#eab308', '#f97316', '#ef4444']

interface SessionBlock {
  label: string
  duration_min: number
  zone: number      // 1–5
  intensity: string // e.g. "Z3 · 75-85%"
  notes: string
}
interface ParsedSession {
  title: string
  sport: string
  total_min: number
  blocks: SessionBlock[]
}

const PHASE_RE = /échauffement|warm.?up|retour au calme|cool.?down|intervalle|récupér|fractionné|effort|tempo|seuil|vma|vo2\s*max|progressif|activation/i

function zoneFromText(text: string): number {
  const t = text.toLowerCase()
  if (/retour au calme|cool.?down/.test(t)) return 1
  if (/récupér/.test(t)) return 1
  if (/échauffement|warm.?up|activation/.test(t)) return 2
  if (/z5|vma|vo2|sprint/.test(t)) return 5
  if (/z4|seuil|threshold/.test(t)) return 4
  if (/z3|tempo/.test(t)) return 3
  if (/z2|endurance|aérobie/.test(t)) return 2
  if (/z1/.test(t)) return 1
  const pct = text.match(/(\d+)[-–]?\d*%/)
  if (pct) {
    const v = parseInt(pct[1])
    if (v < 65) return 1
    if (v < 75) return 2
    if (v < 82) return 3
    if (v < 90) return 4
    return 5
  }
  return 2
}

function durFromText(text: string): number {
  const rep = text.match(/(\d+)\s*[x×]\s*(\d+)\s*min/i)
  if (rep) return parseInt(rep[1]) * parseInt(rep[2])
  const min = text.match(/(\d+)\s*min/i)
  return min ? parseInt(min[1]) : 0
}

function detectSport(text: string): string {
  const t = text.toLowerCase()
  if (/\bcyclisme\b|vélo|watt|ftp/.test(t)) return 'cycling'
  if (/\bnatation\b|piscine|nage|css/.test(t)) return 'swim'
  if (/\baviron\b|rowing|ergomètre/.test(t)) return 'rowing'
  if (/\bhyrox\b|skierg|sled|wall ball/.test(t)) return 'hyrox'
  if (/muscu|squat|bench|deadlift/.test(t)) return 'gym'
  return 'running'
}

function mapBlockType(label: string): string {
  const l = label.toLowerCase()
  if (/échauffement|warm.?up|activation/.test(l)) return 'warmup'
  if (/retour au calme|cool.?down/.test(l)) return 'cooldown'
  if (/récup/.test(l)) return 'recovery'
  if (/intervalle|fractionné/.test(l)) return 'interval'
  if (/effort|seuil|vma|tempo/.test(l)) return 'effort'
  return 'steady'
}

/** Détecte et parse une séance d'entraînement dans le texte IA.
 *  Retourne null si le texte ne contient pas de séance structurée. */
function parseSession(text: string): ParsedSession | null {
  const lower = text.toLowerCase()
  // Garde-fou : doit contenir échauffement ET retour au calme ET au moins une durée
  if (!/échauffement|warm.?up/.test(lower)) return null
  if (!/retour au calme|cool.?down/.test(lower)) return null
  if (!/\d+\s*min/.test(lower)) return null

  const lines = text.split('\n')

  // Stratégie 1 — sections délimitées par des titres Markdown (#, ##, ###, ####)
  type Sec = { headingText: string; bodyLines: string[] }
  const sections: Sec[] = []
  let cur: Sec | null = null
  for (const line of lines) {
    const hm = line.match(/^#{1,4}\s+(.+)/)
    if (hm) {
      if (cur) sections.push(cur)
      cur = { headingText: hm[1].replace(/\*\*/g, '').trim(), bodyLines: [] }
    } else if (cur) {
      cur.bodyLines.push(line)
    }
  }
  if (cur) sections.push(cur)

  const phaseSections = sections.filter(s => {
    const combined = s.headingText + ' ' + s.bodyLines.join(' ')
    return PHASE_RE.test(s.headingText) && durFromText(combined) > 0
  })

  if (phaseSections.length >= 2) {
    const blocks: SessionBlock[] = phaseSections.map(s => {
      const combined = s.headingText + ' ' + s.bodyLines.join(' ')
      const zone = zoneFromText(combined)
      const pctM = combined.match(/(\d+[-–]\d+)%/)
      const intensity = pctM ? `Z${zone} · ${pctM[1]}%` : `Z${zone}`
      const notes = s.bodyLines
        .map(l => l.replace(/^[-•*]\s*/, '').trim())
        .filter(l => l && !/^\d+\s*min/.test(l))[0] ?? ''
      return {
        label: s.headingText.replace(/^\d+[.):\s]+/, '').trim(),
        duration_min: durFromText(combined),
        zone, intensity, notes,
      }
    })
    const total = blocks.reduce((s, b) => s + b.duration_min, 0)
    return { title: 'Séance proposée', sport: detectSport(text), total_min: total, blocks }
  }

  // Stratégie 2 — lignes avec label en gras + durée
  // ex: "**Échauffement** : 10 min — Z2 · 65-70% FCmax"
  const boldBlocks: SessionBlock[] = []
  for (const line of lines) {
    if (!/\*\*[^*]+\*\*/.test(line)) continue
    if (!PHASE_RE.test(line)) continue
    const dur = durFromText(line)
    if (!dur) continue
    const labelM = line.match(/\*\*([^*]+)\*\*/)
    const label = labelM ? labelM[1] : line.slice(0, 30)
    const zone = zoneFromText(line)
    const pctM = line.match(/(\d+[-–]\d+)%/)
    const intensity = pctM ? `Z${zone} · ${pctM[1]}%` : `Z${zone}`
    const notes = line
      .replace(/\*\*[^*]+\*\*/, '').replace(/\d+\s*min/ig, '')
      .replace(/[-•*:·]/g, '').trim().slice(0, 80)
    boldBlocks.push({ label, duration_min: dur, zone, intensity, notes })
  }

  if (boldBlocks.length >= 2) {
    const total = boldBlocks.reduce((s, b) => s + b.duration_min, 0)
    return { title: 'Séance proposée', sport: detectSport(text), total_min: total, blocks: boldBlocks }
  }

  return null
}

// ── Session Block Chart (SVG-free, div-based) ─────────────────

function SessionBlockChart({ blocks, total }: { blocks: SessionBlock[]; total: number }) {
  const [hovIdx, setHovIdx] = useState<number | null>(null)

  return (
    <div style={{ position: 'relative', userSelect: 'none' }}>
      {hovIdx !== null && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--ai-bg)', border: '1px solid var(--ai-border)',
          borderRadius: 7, padding: '5px 10px', zIndex: 20,
          fontSize: 11, whiteSpace: 'nowrap', marginBottom: 6,
          boxShadow: '0 4px 14px rgba(0,0,0,0.20)', pointerEvents: 'none',
        }}>
          <span style={{ fontWeight: 600, color: 'var(--ai-text)' }}>{blocks[hovIdx].label}</span>
          <span style={{ color: 'var(--ai-dim)', margin: '0 5px' }}>·</span>
          <span style={{ color: 'var(--ai-text)' }}>{blocks[hovIdx].duration_min} min</span>
          <span style={{ color: 'var(--ai-dim)', margin: '0 5px' }}>·</span>
          <span style={{ color: SESSION_ZONE_COLORS[(blocks[hovIdx].zone - 1) % 5], fontWeight: 600 }}>
            {blocks[hovIdx].intensity}
          </span>
        </div>
      )}
      {/* Barre horizontale */}
      <div style={{ display: 'flex', height: 38, borderRadius: 8, overflow: 'hidden', marginBottom: 5 }}>
        {blocks.map((b, i) => {
          const pct = total > 0 ? (b.duration_min / total) * 100 : 100 / blocks.length
          const col = SESSION_ZONE_COLORS[(b.zone - 1) % 5]
          const isHov = hovIdx === i
          return (
            <div key={i}
              style={{
                width: `${pct}%`, background: isHov ? col : `${col}cc`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'default', transition: 'background 0.1s',
                borderLeft: i > 0 ? '1px solid rgba(0,0,0,0.1)' : 'none',
              }}
              onMouseEnter={() => setHovIdx(i)}
              onMouseLeave={() => setHovIdx(null)}
            >
              {pct > 12 && (
                <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.03em' }}>
                  {b.duration_min}′
                </span>
              )}
            </div>
          )
        })}
      </div>
      {/* Labels sous la barre */}
      <div style={{ display: 'flex' }}>
        {blocks.map((b, i) => {
          const pct = total > 0 ? (b.duration_min / total) * 100 : 100 / blocks.length
          const col = SESSION_ZONE_COLORS[(b.zone - 1) % 5]
          const isHov = hovIdx === i
          return (
            <div key={i}
              style={{ width: `${pct}%`, overflow: 'hidden', paddingRight: 2 }}
              onMouseEnter={() => setHovIdx(i)}
              onMouseLeave={() => setHovIdx(null)}
            >
              {pct > 8 && (
                <div style={{
                  fontSize: 9, lineHeight: 1.2,
                  color: isHov ? col : 'var(--ai-dim)',
                  fontWeight: isHov ? 600 : 400,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {b.label}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── AddToPlanningModal ────────────────────────────────────────

const SPORT_LABELS_FR: Record<string, string> = {
  running: 'Course à pied', cycling: 'Vélo', swim: 'Natation',
  rowing: 'Aviron', hyrox: 'Hyrox', gym: 'Muscu',
}
const SPORT_EMOJIS: Record<string, string> = {
  running: '🏃', cycling: '🚴', swim: '🏊', rowing: '🚣', hyrox: '💪', gym: '🏋️',
}

function weekStartOf(dateStr: string): string {
  const d = new Date(dateStr)
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
  d.setDate(d.getDate() - dow)
  return d.toISOString().slice(0, 10)
}
function dayIdxOf(dateStr: string): number {
  const dow = new Date(dateStr).getDay()
  return dow === 0 ? 6 : dow - 1
}

function AddToPlanningModal({ session, onClose }: { session: ParsedSession; onClose: () => void }) {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const [date,   setDate]   = useState(tomorrow.toISOString().slice(0, 10))
  const [time,   setTime]   = useState('09:00')
  const [sport,  setSport]  = useState(session.sport)
  const [plan,   setPlan]   = useState<'A' | 'B'>('A')
  const [saving, setSaving] = useState(false)
  const [done,   setDone]   = useState(false)
  const [errMsg, setErrMsg] = useState('')

  async function save() {
    setSaving(true); setErrMsg('')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setErrMsg('Non connecté'); setSaving(false); return }
      const planBlocks = session.blocks.map((b, i) => ({
        id: `ai-${Date.now()}-${i}`,
        type: mapBlockType(b.label),
        durationMin: b.duration_min,
        zone: b.zone,
        value: '',
        hrAvg: '',
        label: b.label,
      }))
      const { error } = await sb.from('planned_sessions').insert({
        user_id: user.id,
        week_start: weekStartOf(date),
        day_index: dayIdxOf(date),
        sport, title: session.title, time,
        duration_min: session.total_min,
        tss: null, status: 'planned',
        notes: `Générée par Coach IA · Plan ${plan}`,
        rpe: null, blocks: planBlocks,
        validation_data: { plan, source: 'ai_coach', at: new Date().toISOString() },
      })
      if (error) { setErrMsg(error.message); setSaving(false); return }
      setDone(true)
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Erreur réseau')
      setSaving(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--ai-bg)', borderRadius: 14, padding: 22,
        width: 320, border: '1px solid var(--ai-border)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 15, fontWeight: 700, margin: '0 0 5px', color: 'var(--ai-text)' }}>Séance ajoutée !</p>
            <p style={{ fontSize: 12, color: 'var(--ai-dim)', margin: '0 0 16px' }}>
              Plan {plan} · {new Date(date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <button onClick={onClose} style={{ padding: '8px 22px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#00c8e0,#5b6fff)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Fermer
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--ai-text)' }}>
                Ajouter au Planning
              </h3>
              <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-dim)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Plan A / B */}
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ai-dim)', marginBottom: 6 }}>Plan</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['A', 'B'] as const).map(p => (
                    <button key={p} onClick={() => setPlan(p)} style={{
                      flex: 1, padding: '7px', borderRadius: 8,
                      border: `1px solid ${plan === p ? '#5b6fff' : 'var(--ai-border)'}`,
                      background: plan === p ? 'rgba(91,111,255,0.12)' : 'var(--ai-bg2)',
                      color: plan === p ? '#5b6fff' : 'var(--ai-mid)',
                      fontSize: 13, fontWeight: plan === p ? 700 : 400, cursor: 'pointer',
                    }}>Plan {p}</button>
                  ))}
                </div>
              </div>
              {/* Date */}
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ai-dim)', marginBottom: 6 }}>Date</p>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', color: 'var(--ai-text)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              {/* Heure */}
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ai-dim)', marginBottom: 6 }}>Heure</p>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', color: 'var(--ai-text)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              {/* Sport */}
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ai-dim)', marginBottom: 6 }}>Sport</p>
                <select value={sport} onChange={e => setSport(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', color: 'var(--ai-text)', fontSize: 12, outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
                  {Object.entries(SPORT_LABELS_FR).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              {errMsg && <p style={{ fontSize: 11, color: '#ef4444', margin: 0 }}>{errMsg}</p>}
              <button onClick={() => void save()} disabled={saving} style={{
                padding: '10px', borderRadius: 9, border: 'none', marginTop: 2,
                background: saving ? 'var(--ai-border)' : 'linear-gradient(135deg,#00c8e0,#5b6fff)',
                color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}>
                {saving ? 'Ajout…' : `Ajouter au Plan ${plan}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── SessionCard ───────────────────────────────────────────────
// Carte visuelle de séance — s'affiche sous la bulle IA quand
// une séance structurée est détectée dans la réponse.

function SessionCard({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  const [session,      setSession]      = useState<ParsedSession | null>(null)
  const [editMode,     setEditMode]     = useState(false)
  const [editedBlocks, setEditedBlocks] = useState<SessionBlock[]>([])
  const [showModal,    setShowModal]    = useState(false)

  useEffect(() => {
    if (isStreaming) return
    const s = parseSession(text)
    setSession(s)
    if (s) setEditedBlocks(s.blocks)
  }, [text, isStreaming])

  if (!session) return null

  const displayBlocks = editMode ? editedBlocks : session.blocks
  const total = displayBlocks.reduce((s, b) => s + b.duration_min, 0)
  const emoji = SPORT_EMOJIS[session.sport] ?? '🏃'
  const sportLabel = SPORT_LABELS_FR[session.sport] ?? session.sport

  function updateBlock(i: number, field: keyof SessionBlock, value: string | number) {
    setEditedBlocks(prev => prev.map((b, j) => j === i ? { ...b, [field]: value } : b))
  }

  function confirmEdit() {
    const newTotal = editedBlocks.reduce((s, b) => s + b.duration_min, 0)
    setSession(prev => prev ? { ...prev, blocks: editedBlocks, total_min: newTotal } : prev)
    setEditMode(false)
  }

  return (
    <>
      <div style={{
        borderRadius: 12,
        border: '1px solid var(--ai-border)',
        background: 'var(--ai-bg2)',
        overflow: 'hidden',
        marginLeft: 34, // align with message bubble (skip avatar width + gap)
      }}>
        {/* ─ Header ─ */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 14px',
          background: 'linear-gradient(90deg,rgba(91,111,255,0.09) 0%,transparent 100%)',
          borderBottom: '1px solid var(--ai-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 15 }}>{emoji}</span>
            <span style={{ fontFamily: 'Syne,sans-serif', fontSize: 12, fontWeight: 700, color: 'var(--ai-text)' }}>
              {sportLabel} · {total} min
            </span>
            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: 'rgba(91,111,255,0.15)', color: '#5b6fff', fontWeight: 700, letterSpacing: '0.05em' }}>
              SÉANCE
            </span>
          </div>
          {/* Zone dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {session.blocks.map((b, i) => (
              <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: SESSION_ZONE_COLORS[(b.zone - 1) % 5], opacity: 0.85 }} />
            ))}
          </div>
        </div>

        {/* ─ Bar chart ─ */}
        <div style={{ padding: '12px 14px 8px' }}>
          <SessionBlockChart blocks={displayBlocks} total={total} />
        </div>

        {/* ─ Block list ─ */}
        <div style={{ padding: '2px 10px 10px' }}>
          {editMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {editedBlocks.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 7, background: 'rgba(0,0,0,0.04)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: SESSION_ZONE_COLORS[(b.zone - 1) % 5], flexShrink: 0 }} />
                  <input
                    value={b.label}
                    onChange={e => updateBlock(i, 'label', e.target.value)}
                    style={{ flex: 1, padding: '3px 7px', borderRadius: 5, border: '1px solid var(--ai-border)', background: 'var(--ai-bg)', color: 'var(--ai-text)', fontSize: 11, outline: 'none', fontFamily: 'DM Sans,sans-serif' }}
                  />
                  <input
                    type="number" value={b.duration_min} min={1}
                    onChange={e => updateBlock(i, 'duration_min', parseInt(e.target.value) || 1)}
                    style={{ width: 46, padding: '3px 6px', borderRadius: 5, border: '1px solid var(--ai-border)', background: 'var(--ai-bg)', color: 'var(--ai-text)', fontSize: 11, outline: 'none', textAlign: 'center', fontFamily: 'DM Mono,monospace' }}
                  />
                  <span style={{ fontSize: 10, color: 'var(--ai-dim)', flexShrink: 0 }}>min</span>
                  <select
                    value={b.zone}
                    onChange={e => {
                      const z = parseInt(e.target.value)
                      updateBlock(i, 'zone', z)
                      updateBlock(i, 'intensity', `Z${z}`)
                    }}
                    style={{ width: 50, padding: '3px 4px', borderRadius: 5, border: '1px solid var(--ai-border)', background: 'var(--ai-bg)', color: 'var(--ai-text)', fontSize: 11, outline: 'none', cursor: 'pointer' }}
                  >
                    {[1, 2, 3, 4, 5].map(z => <option key={z} value={z}>Z{z}</option>)}
                  </select>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {displayBlocks.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: SESSION_ZONE_COLORS[(b.zone - 1) % 5], flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--ai-text)', lineHeight: 1.3 }}>{b.label}</span>
                  <span style={{ fontSize: 11, fontFamily: 'DM Mono,monospace', color: 'var(--ai-mid)', minWidth: 32, textAlign: 'right' }}>{b.duration_min}′</span>
                  <span style={{ fontSize: 10, color: SESSION_ZONE_COLORS[(b.zone - 1) % 5], fontWeight: 700, minWidth: 20, textAlign: 'right' }}>
                    {b.intensity.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─ Actions ─ */}
        <div style={{ display: 'flex', gap: 6, padding: '0 10px 11px' }}>
          {editMode ? (
            <>
              <button
                onClick={() => setEditMode(false)}
                style={{ flex: 1, padding: '7px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg)', color: 'var(--ai-mid)', fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}
              >
                Annuler
              </button>
              <button
                onClick={confirmEdit}
                style={{ flex: 2, padding: '7px', borderRadius: 8, border: 'none', background: 'rgba(91,111,255,0.15)', color: '#5b6fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}
              >
                ✓ Valider les modifications
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setEditedBlocks(session.blocks); setEditMode(true) }}
                style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg)', color: 'var(--ai-mid)', fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}
              >
                ✏️ Modifier
              </button>
              <button
                onClick={() => setShowModal(true)}
                style={{ flex: 2, padding: '7px 10px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#00c8e0,#5b6fff)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}
              >
                + Ajouter au Planning
              </button>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <AddToPlanningModal
          session={{ ...session, blocks: editMode ? editedBlocks : session.blocks }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

// ── Loading dots ───────────────────────────────────────────────

function Dots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '2px 0' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
          background: 'var(--ai-dim)',
          animation: `ai_dot 1.2s ease-in-out ${i * 0.18}s infinite`,
        }} />
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════

export default function AIPanel({ open, onClose, initialAgent, context, prefillMessage, initialUserLabel, initialAssistantMsg }: Props) {

  // ── State ────────────────────────────────────────────────
  const [agent,    setAgent]    = useState<PageAgent>(initialAgent)
  const [store,    setStore]    = useState<ConvStore>({})
  const [activeId, setActiveId] = useState<string | null>(null)
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [mounted,  setMounted]  = useState(false)
  const [sbOpen,   setSbOpen]   = useState(false)   // sidebar mobile
  const [fullscr,  setFullscr]  = useState(false)   // fullscreen
  const [menuId,   setMenuId]   = useState<string | null>(null)  // conv "..."
  const [renId,    setRenId]    = useState<string | null>(null)  // conv rename
  const [renVal,   setRenVal]   = useState('')

  const areaRef      = useRef<HTMLTextAreaElement>(null)
  const menuRef      = useRef<HTMLDivElement>(null)
  const endRef       = useRef<HTMLDivElement>(null)
  const initMsgRef   = useRef<string | undefined>(undefined)

  const cfg    = AGENT_CONFIGS[agent]
  const convs  = store[agent] ?? []
  const active = convs.find(c => c.id === activeId) ?? null

  // ── Effects ──────────────────────────────────────────────

  useEffect(() => { setMounted(true); setStore(loadStore()) }, [])
  useEffect(() => { if (mounted) saveStore(store) }, [store, mounted])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: loading ? 'instant' : 'smooth' }) }, [activeId, loading, store])
  useEffect(() => { if (open) setTimeout(() => areaRef.current?.focus(), 260) }, [open])
  useEffect(() => { if (open && prefillMessage) setInput(prefillMessage) }, [open, prefillMessage])
  useEffect(() => { if (open) setAgent(initialAgent) }, [open, initialAgent])
  useEffect(() => { setActiveId(null) }, [agent])

  // Pré-remplir une conversation quand initialAssistantMsg est fourni
  useEffect(() => {
    if (!open) { initMsgRef.current = undefined; return }
    if (!initialAssistantMsg || !mounted) return
    if (initMsgRef.current === initialAssistantMsg) return  // déjà traité
    initMsgRef.current = initialAssistantMsg

    const label = (initialUserLabel ?? 'Analyse IA').slice(0, 60)
    const conv: AIConv = {
      id: genId(),
      title: label,
      agentId: 'performance',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      msgs: [
        { id: genId(), role: 'user',      content: label,                ts: Date.now() },
        { id: genId(), role: 'assistant', content: initialAssistantMsg,  ts: Date.now() + 1 },
      ],
    }
    setAgent('performance')
    setStore(p => ({ ...p, performance: [conv, ...(p.performance ?? [])].slice(0, MAX_AGENT) }))
    setActiveId(conv.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialAssistantMsg, mounted])

  // Escape key
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (menuId) { setMenuId(null) }
        else if (sbOpen) { setSbOpen(false) }
        else if (fullscr) { setFullscr(false) }
        else { onClose() }
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose, menuId, sbOpen, fullscr])

  // Close conv menu on outside click
  useEffect(() => {
    if (!menuId) return
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuId(null)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menuId])

  // ── Handlers ─────────────────────────────────────────────

  // TEXTAREA : gestion stable du state input
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 130) + 'px'
  }
  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() }
  }

  const switchAgent = (a: PageAgent) => {
    setAgent(a); setActiveId(null); setSbOpen(false)
  }

  const openConv = (c: AIConv) => {
    setAgent(c.agentId); setActiveId(c.id); setSbOpen(false); setMenuId(null)
  }

  const newConv = () => {
    setActiveId(null); setSbOpen(false)
    setTimeout(() => areaRef.current?.focus(), 80)
  }

  const delConv = (agId: PageAgent, cid: string) => {
    setStore(p => ({ ...p, [agId]: (p[agId] ?? []).filter(c => c.id !== cid) }))
    if (activeId === cid) setActiveId(null)
    setMenuId(null)
  }

  const startRen = (c: AIConv) => { setRenId(c.id); setRenVal(c.title); setMenuId(null) }
  const confirmRen = (agId: PageAgent, cid: string) => {
    const v = renVal.trim()
    if (v) setStore(p => ({ ...p, [agId]: (p[agId] ?? []).map(c => c.id === cid ? { ...c, title: v } : c) }))
    setRenId(null)
  }

  // SEND MESSAGE
  const send = useCallback(async (preset?: string) => {
    const txt = (preset ?? input).trim()
    if (!txt || loading) return

    setInput('')
    if (areaRef.current) { areaRef.current.style.height = 'auto'; areaRef.current.focus() }
    setLoading(true)

    const curAgent = agent
    let conv = active
    let isNew = false

    if (!conv) {
      conv = {
        id: genId(),
        title: txt.slice(0, 46) + (txt.length > 46 ? '…' : ''),
        agentId: curAgent, createdAt: Date.now(), updatedAt: Date.now(), msgs: [],
      }
      isNew = true
    }

    const userMsg: AIMsg = { id: genId(), role: 'user', content: txt, ts: Date.now() }
    const updated: AIConv = {
      ...conv,
      msgs: [...conv.msgs, userMsg],
      title: conv.msgs.length === 0 ? (txt.slice(0, 46) + (txt.length > 46 ? '…' : '')) : conv.title,
      updatedAt: Date.now(),
    }

    setStore(p => {
      const list = p[curAgent] ?? []
      const has  = list.some(c => c.id === updated.id)
      const next = has ? list.map(c => c.id === updated.id ? updated : c) : [updated, ...list]
      return { ...p, [curAgent]: next.slice(0, MAX_AGENT) }
    })
    if (isNew) setActiveId(updated.id)

    const cid = updated.id

    try {
      const res = await fetch('/api/coach-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: curAgent,
          messages: updated.msgs.map(m => ({ role: m.role, content: m.content })),
          context: context ?? {},
        }),
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const aiMsgId = genId()
      setStore(p => ({
        ...p,
        [curAgent]: (p[curAgent] ?? []).map(c =>
          c.id === cid
            ? { ...c, msgs: [...c.msgs, { id: aiMsgId, role: 'assistant' as const, content: '', ts: Date.now() }], updatedAt: Date.now() }
            : c
        ),
      }))

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        const text = accumulated
        setStore(p => ({
          ...p,
          [curAgent]: (p[curAgent] ?? []).map(c =>
            c.id === cid
              ? { ...c, msgs: c.msgs.map(m => m.id === aiMsgId ? { ...m, content: text } : m), updatedAt: Date.now() }
              : c
          ),
        }))
      }
    } catch {
      const err: AIMsg = { id: genId(), role: 'assistant', content: 'Erreur réseau. Réessaie.', ts: Date.now() }
      setStore(p => ({
        ...p,
        [curAgent]: (p[curAgent] ?? []).map(c =>
          c.id === cid ? { ...c, msgs: [...c.msgs, err], updatedAt: Date.now() } : c
        ),
      }))
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, loading, active, agent, context])

  // SEND via Managed Agent (pour les quickActions avec managedAgentAction)
  const sendManaged = useCallback(async (qa: QuickAction) => {
    if (loading || !qa.managedAgentAction) return

    const label = qa.label.replace(/^[^\w\s]+\s*/, '') // strip emoji prefix
    setLoading(true)

    const curAgent = agent
    const conv: AIConv = {
      id: genId(),
      title: label.slice(0, 46),
      agentId: curAgent,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      msgs: [{ id: genId(), role: 'user', content: label, ts: Date.now() }],
    }

    setStore(p => ({ ...p, [curAgent]: [conv, ...(p[curAgent] ?? [])].slice(0, MAX_AGENT) }))
    setActiveId(conv.id)
    const cid = conv.id

    try {
      const ctx = context as Record<string, unknown> | undefined
      const profile = ctx?.profile ?? {}

      // Build payload specific to each action
      let payload: Record<string, unknown>
      switch (qa.managedAgentAction) {
        case 'getLacunes':
          payload = { profile, testHistory: [] }
          break
        case 'getProgression':
          payload = { profile, historique: [] }
          break
        default:
          payload = { profile }
      }

      const res = await fetch('/api/performance-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: qa.managedAgentAction, payload }),
      })
      const data = await res.json() as { reply?: string; error?: string }
      const reply = data.reply ?? data.error ?? 'Désolé, une erreur est survenue.'
      const aiMsg: AIMsg = { id: genId(), role: 'assistant', content: reply, ts: Date.now() }
      setStore(p => ({
        ...p,
        [curAgent]: (p[curAgent] ?? []).map(c =>
          c.id === cid ? { ...c, msgs: [...c.msgs, aiMsg], updatedAt: Date.now() } : c
        ),
      }))
    } catch {
      const err: AIMsg = { id: genId(), role: 'assistant', content: 'Erreur réseau. Réessaie.', ts: Date.now() }
      setStore(p => ({
        ...p,
        [curAgent]: (p[curAgent] ?? []).map(c =>
          c.id === cid ? { ...c, msgs: [...c.msgs, err], updatedAt: Date.now() } : c
        ),
      }))
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, agent, context])

  // ══════════════════════════════════════════════════════════
  // RENDU
  // createPortal → body : échappe le stacking context de <main>
  // (main a z-index:10, ce qui bloquait l'AI panel sous la barre nav)
  // ══════════════════════════════════════════════════════════

  // SSR guard — portal ne peut s'ouvrir que côté client
  if (!mounted) return null

  return createPortal(
    <>
      {/* ── CSS global ───────────────────────────────────── */}
      <style>{`
        @keyframes ai_dot {
          0%,80%,100% { opacity:.2; transform:translateY(0); }
          40% { opacity:1; transform:translateY(-3px); }
        }

        /* Variables couleurs solides (fix transparence dark mode) */
        .aip-root {
          --ai-bg:      #ffffff;
          --ai-bg2:     #f6f8fc;
          --ai-border:  rgba(0,0,0,0.08);
          --ai-text:    #0d1117;
          --ai-mid:     rgba(13,17,23,0.58);
          --ai-dim:     rgba(13,17,23,0.36);
        }
        html.dark .aip-root {
          --ai-bg:      #13161e;
          --ai-bg2:     #0f121a;
          --ai-border:  rgba(255,255,255,0.09);
          --ai-text:    #eef2f7;
          --ai-mid:     rgba(238,242,247,0.60);
          --ai-dim:     rgba(238,242,247,0.35);
        }

        /* Panneau principal
           z-index 1200 dans le root stacking context (via createPortal)
           → au-dessus de la barre nav mobile (z-index 50) et desktop (z-index 35-40)
           padding-top: env(safe-area-inset-top) → notch iPhone / Dynamic Island */
        .aip-root {
          position: fixed;
          top: 0; right: 0; bottom: 0;
          width: 540px; max-width: 100vw;
          z-index: 1200;
          background: var(--ai-bg);
          border-left: 1px solid var(--ai-border);
          display: flex; flex-direction: column; overflow: hidden;
          box-shadow: -16px 0 48px rgba(0,0,0,0.18);
          transition: transform 0.3s cubic-bezier(0.32,1.06,0.64,1);
          color: var(--ai-text);
          /* Safe area pour iOS notch */
          padding-top: env(safe-area-inset-top, 0px);
        }
        .aip-root.closed { transform: translateX(100%); box-shadow: none; }
        .aip-root.fullscreen { width: 100vw !important; left: 0; border-left: none; }

        /* Body */
        .aip-body {
          display: flex; flex: 1; min-height: 0;
          overflow: hidden; position: relative;
        }

        /* Sidebar */
        .aip-sb {
          width: 200px; flex-shrink: 0;
          border-right: 1px solid var(--ai-border);
          background: var(--ai-bg2);
          display: flex; flex-direction: column;
          overflow: hidden;
          transition: width 0.2s ease;
        }
        .aip-root.fullscreen .aip-sb { width: 0; overflow: hidden; border: none; }

        /* Hamburger — hidden desktop, visible mobile */
        .aip-hbg { display: none !important; }

        /* Overlay sidebar mobile */
        .aip-overlay { display: none; }

        /* Mobile */
        @media (max-width: 767px) {
          .aip-root {
            width: 100% !important; left: 0; border-left: none;
            /* 100dvh = dynamic viewport height (suit le clavier virtuel) */
            height: 100dvh;
            top: 0; bottom: auto;
            box-shadow: none;
          }
          .aip-sb {
            position: absolute !important;
            left: 0; top: 0; bottom: 0;
            width: 76% !important; max-width: 280px;
            z-index: 20;
            transform: translateX(-105%);
            transition: transform 0.26s ease;
          }
          .aip-sb.open {
            transform: translateX(0);
            box-shadow: 4px 0 20px rgba(0,0,0,0.22);
          }
          .aip-hbg { display: flex !important; }
          .aip-overlay {
            display: block; position: absolute; inset: 0;
            z-index: 15; background: rgba(0,0,0,0.4);
            backdrop-filter: blur(1px);
          }
        }

        /* Textarea — font-size 16px minimum pour éviter zoom Safari */
        .aip-textarea {
          font-size: 16px !important;
        }
        @media (min-width: 768px) {
          .aip-textarea { font-size: 13px !important; }
        }

        /* Scroll messages — smooth sur iOS */
        .aip-messages {
          flex: 1; overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }

        /* Conv item hover — show ... button */
        .aip-conv-item:hover .aip-dots-btn { opacity: 1 !important; }
        .aip-conv-item.active-conv .aip-dots-btn { opacity: 0.6 !important; }

        /* Scrollbar discret */
        .aip-messages::-webkit-scrollbar,
        .aip-sb-list::-webkit-scrollbar { width: 3px; }
        .aip-messages::-webkit-scrollbar-thumb,
        .aip-sb-list::-webkit-scrollbar-thumb { background: var(--ai-border); border-radius: 2px; }
      `}</style>

      {/* ══ PANNEAU ══════════════════════════════════════════ */}
      <div className={`aip-root${open ? '' : ' closed'}${fullscr ? ' fullscreen' : ''}`}>

        {/* ══ HEADER compact ═══════════════════════════════ */}
        <div style={{
          height: 46, padding: '0 10px',
          borderBottom: `1px solid var(--ai-border)`,
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          background: 'var(--ai-bg)',
        }}>
          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png" alt="THW"
            style={{ height: 24, width: 'auto', objectFit: 'contain', flexShrink: 0 }}
          />

          {/* Agent label */}
          <span style={{
            flex: 1, fontSize: 13, fontWeight: 600,
            fontFamily: 'Syne, sans-serif',
            color: 'var(--ai-mid)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {cfg.name}
          </span>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setFullscr(f => !f)}
            title={fullscr ? 'Réduire' : 'Plein écran'}
            style={{
              width: 28, height: 28, borderRadius: 7,
              border: `1px solid var(--ai-border)`,
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: 'var(--ai-dim)',
            }}
          >
            {fullscr ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            )}
          </button>

          {/* Hamburger — mobile */}
          <button
            className="aip-hbg"
            onClick={() => setSbOpen(s => !s)}
            style={{
              width: 28, height: 28, borderRadius: 50,
              border: `1px solid var(--ai-border)`,
              background: 'transparent', cursor: 'pointer',
              alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: 'var(--ai-mid)',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 7,
              border: `1px solid var(--ai-border)`,
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: 'var(--ai-dim)',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ══ BODY ═════════════════════════════════════════ */}
        <div className="aip-body">

          {/* Overlay mobile sidebar */}
          {sbOpen && <div className="aip-overlay" onClick={() => setSbOpen(false)} />}

          {/* ══ SIDEBAR ══════════════════════════════════════ */}
          <div className={`aip-sb${sbOpen ? ' open' : ''}`}>

            {/* — SECTION DISCUSSIONS — */}
            <div style={{
              padding: '10px 10px 6px',
              borderBottom: `1px solid var(--ai-border)`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
                textTransform: 'uppercase', color: 'var(--ai-dim)',
              }}>
                Discussions
              </span>
              {/* Bouton nouvelle discussion — bulle bleue + */}
              <button
                onClick={newConv}
                title="Nouvelle discussion"
                style={{
                  width: 24, height: 24, borderRadius: 7, border: 'none',
                  background: 'linear-gradient(135deg,#00c8e0,#5b6fff)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, color: 'white',
                  boxShadow: '0 2px 8px rgba(91,111,255,0.3)',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  <path d="M12 8v4M10 10h4" />
                </svg>
              </button>
            </div>

            {/* Liste des conversations */}
            <div className="aip-sb-list" style={{ flex: 1, overflowY: 'auto', padding: '4px 6px' }}>
              {convs.length === 0 ? (
                <div style={{
                  padding: '16px 8px', textAlign: 'center',
                  color: 'var(--ai-dim)', fontSize: 11, lineHeight: 1.6,
                }}>
                  Aucune discussion.<br />Pose une question pour commencer.
                </div>
              ) : convs.map(conv => (
                <div key={conv.id} style={{ position: 'relative', marginBottom: 1 }}>

                  {/* Rename inline */}
                  {renId === conv.id ? (
                    <div style={{ padding: '3px 4px' }}>
                      <input
                        autoFocus
                        value={renVal}
                        onChange={e => setRenVal(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') confirmRen(conv.agentId, conv.id)
                          if (e.key === 'Escape') setRenId(null)
                        }}
                        onBlur={() => confirmRen(conv.agentId, conv.id)}
                        style={{
                          width: '100%', padding: '5px 8px', borderRadius: 6,
                          border: '1px solid rgba(91,111,255,0.5)',
                          background: 'var(--ai-bg)', color: 'var(--ai-text)',
                          fontFamily: 'DM Sans, sans-serif', fontSize: 12,
                          outline: 'none', boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className={`aip-conv-item${conv.id === activeId ? ' active-conv' : ''}`}
                      onClick={() => openConv(conv)}
                      style={{
                        padding: '7px 6px 7px 10px',
                        borderRadius: 7,
                        background: conv.id === activeId ? 'rgba(91,111,255,0.11)' : 'transparent',
                        border: `1px solid ${conv.id === activeId ? 'rgba(91,111,255,0.25)' : 'transparent'}`,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 12, fontWeight: conv.id === activeId ? 600 : 400,
                          color: conv.id === activeId ? 'var(--ai-text)' : 'var(--ai-mid)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          lineHeight: 1.35,
                        }}>
                          {conv.title}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--ai-dim)', marginTop: 1 }}>
                          {fmtDate(conv.updatedAt)}
                        </div>
                      </div>

                      {/* Bouton "..." */}
                      <div
                        style={{ position: 'relative', flexShrink: 0 }}
                        ref={menuId === conv.id ? menuRef : undefined}
                      >
                        <button
                          className="aip-dots-btn"
                          onClick={e => { e.stopPropagation(); setMenuId(menuId === conv.id ? null : conv.id) }}
                          style={{
                            width: 22, height: 22, borderRadius: 5,
                            border: 'none', background: 'transparent',
                            cursor: 'pointer', padding: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--ai-dim)', opacity: 0, transition: 'opacity 0.12s',
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="5" cy="12" r="2.2" />
                            <circle cx="12" cy="12" r="2.2" />
                            <circle cx="19" cy="12" r="2.2" />
                          </svg>
                        </button>

                        {/* Menu contextuel */}
                        {menuId === conv.id && (
                          <div style={{
                            position: 'absolute', right: 0, top: '100%', zIndex: 50,
                            background: 'var(--ai-bg)',
                            border: `1px solid var(--ai-border)`,
                            borderRadius: 8,
                            boxShadow: '0 6px 18px rgba(0,0,0,0.16)',
                            overflow: 'hidden', minWidth: 130,
                          }}>
                            {[
                              {
                                label: 'Renommer',
                                icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/></svg>,
                                action: () => startRen(conv),
                                color: 'var(--ai-mid)',
                                hover: 'var(--ai-bg2)',
                              },
                              {
                                label: 'Supprimer',
                                icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>,
                                action: () => delConv(conv.agentId, conv.id),
                                color: '#ef4444',
                                hover: 'rgba(239,68,68,0.08)',
                              },
                            ].map(item => (
                              <button
                                key={item.label}
                                onClick={e => { e.stopPropagation(); item.action() }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  width: '100%', padding: '8px 12px',
                                  border: 'none', background: 'transparent',
                                  cursor: 'pointer', color: item.color,
                                  fontFamily: 'DM Sans, sans-serif', fontSize: 12,
                                  textAlign: 'left',
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = item.hover }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                              >
                                {item.icon}
                                {item.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* — SECTION THÈMES — */}
            <div style={{
              borderTop: `1px solid var(--ai-border)`,
              padding: '8px 6px 8px',
              flexShrink: 0,
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
                textTransform: 'uppercase', color: 'var(--ai-dim)',
                padding: '0 4px 6px',
              }}>
                Thèmes
              </div>
              {MAIN_AGENTS.map(a => (
                <button
                  key={a}
                  onClick={() => switchAgent(a)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '7px 10px',
                    borderRadius: 7, border: 'none',
                    background: a === agent ? 'rgba(91,111,255,0.1)' : 'transparent',
                    cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif', fontSize: 12,
                    fontWeight: a === agent ? 600 : 400,
                    color: a === agent ? '#5b6fff' : 'var(--ai-mid)',
                    textAlign: 'left', marginBottom: 1,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (a !== agent) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(91,111,255,0.05)' }}
                  onMouseLeave={e => { if (a !== agent) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  <span>{AGENT_DISPLAY[a]}</span>
                  {a === agent && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#5b6fff" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ══ CHAT ═════════════════════════════════════════ */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            minWidth: 0, minHeight: 0, overflow: 'hidden',
          }}>

            {/* Messages — scroll indépendant */}
            <div className="aip-messages" style={{ padding: '14px 14px 0' }}>

              {/* Actions rapides (conv vide) */}
              {(!active || active.msgs.length === 0) && (
                <div>
                  <p style={{
                    textAlign: 'center', margin: '18px 0 22px',
                    fontSize: 15, fontWeight: 600, color: 'var(--ai-text)',
                    lineHeight: 1.4,
                  }}>
                    Comment puis-je vous aider ce {getGreeting()} ?
                  </p>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
                    textTransform: 'uppercase', color: 'var(--ai-dim)',
                    marginBottom: 10,
                  }}>
                    Actions rapides
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 18 }}>
                    {cfg.quickActions.map((qa, i) => (
                      <button
                        key={i}
                        onClick={() => qa.managedAgentAction ? void sendManaged(qa) : void send(qa.prompt)}
                        disabled={loading}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          gap: 10, padding: '10px 12px', borderRadius: 9,
                          border: `1px solid var(--ai-border)`,
                          background: 'var(--ai-bg2)',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          textAlign: 'left', width: '100%',
                          opacity: loading ? 0.5 : 1,
                          transition: 'border-color 0.12s, background 0.12s',
                        }}
                        onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.borderColor = cfg.accent + '55'; (e.currentTarget as HTMLButtonElement).style.background = cfg.accent + '0d' } }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--ai-border)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--ai-bg2)' }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ai-mid)', lineHeight: 1.3 }}>
                          {qa.label}
                        </span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--ai-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </div>
                  <p style={{ textAlign: 'center', color: 'var(--ai-dim)', fontSize: 11, paddingBottom: 12, margin: 0 }}>
                    ou tape directement ta question
                  </p>
                </div>
              )}

              {/* Messages */}
              {active && active.msgs.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 14 }}>
                  {active.msgs.map((msg, idx) => (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {/* ── Bulle message ── */}
                      <div style={{
                        display: 'flex',
                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        alignItems: 'flex-start', gap: 8,
                      }}>
                        {msg.role === 'assistant' && (
                          <div style={{
                            width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                            background: 'var(--ai-bg2)',
                            border: `1px solid var(--ai-border)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginTop: 2, overflow: 'hidden',
                          }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/logo.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                          </div>
                        )}
                        <div style={{
                          maxWidth: '84%',
                          padding: msg.role === 'user' ? '9px 13px' : '11px 14px',
                          borderRadius: msg.role === 'user'
                            ? '14px 14px 4px 14px'
                            : '14px 14px 14px 4px',
                          background: msg.role === 'user'
                            ? 'linear-gradient(135deg,#00c8e0,#5b6fff)'
                            : 'var(--ai-bg2)',
                          border: msg.role === 'user'
                            ? 'none'
                            : `1px solid var(--ai-border)`,
                          color: msg.role === 'user' ? '#fff' : 'var(--ai-text)',
                        }}>
                          {msg.role === 'user'
                            ? <span style={{ fontSize: 13, lineHeight: 1.55, display: 'block' }}>{msg.content}</span>
                            : <MsgContent text={msg.content} />
                          }
                        </div>
                      </div>
                      {/* ── Carte séance (détection automatique) ── */}
                      {msg.role === 'assistant' && (
                        <SessionCard
                          text={msg.content}
                          isStreaming={loading && idx === active.msgs.length - 1}
                        />
                      )}
                    </div>
                  ))}

                  {loading && active?.msgs[active.msgs.length - 1]?.role === 'user' && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                        background: 'var(--ai-bg2)', border: `1px solid var(--ai-border)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden',
                      }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                      </div>
                      <div style={{
                        padding: '10px 14px', borderRadius: '14px 14px 14px 4px',
                        background: 'var(--ai-bg2)', border: `1px solid var(--ai-border)`,
                      }}>
                        <Dots />
                      </div>
                    </div>
                  )}
                  <div ref={endRef} />
                </div>
              )}
            </div>

            {/* ══ INPUT ════════════════════════════════════════ */}
            <div style={{
              padding: '8px 12px 12px',
              borderTop: `1px solid var(--ai-border)`,
              flexShrink: 0, background: 'var(--ai-bg)',
            }}>
              <div style={{
                display: 'flex', gap: 8, alignItems: 'flex-end',
                background: 'var(--ai-bg2)',
                border: `1px solid var(--ai-border)`,
                borderRadius: 12, padding: '7px 7px 7px 13px',
              }}>
                {/* TEXTAREA — font-size 16px sur mobile pour éviter zoom Safari */}
                <textarea
                  ref={areaRef}
                  className="aip-textarea"
                  value={input}
                  onChange={handleInput}
                  onKeyDown={handleKey}
                  placeholder="Posez votre question à THW"
                  rows={1}
                  style={{
                    flex: 1, background: 'transparent',
                    border: 'none', outline: 'none', resize: 'none',
                    fontFamily: 'DM Sans, sans-serif',
                    lineHeight: 1.5, color: 'var(--ai-text)',
                    minHeight: 22, maxHeight: 130,
                    overflowY: 'auto', paddingTop: 2,
                  }}
                />
                <button
                  onClick={() => void send()}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    border: 'none',
                    background: input.trim() && !loading
                      ? 'linear-gradient(135deg,#00c8e0,#5b6fff)'
                      : 'var(--ai-border)',
                    cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>
              <div style={{
                fontSize: 10, color: 'var(--ai-dim)',
                marginTop: 5, textAlign: 'center',
              }}>
                Entrée · Shift+Entrée pour nouvelle ligne
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
