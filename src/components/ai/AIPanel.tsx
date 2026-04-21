'use client'

// ══════════════════════════════════════════════════════════════
// AI PANEL — THW Coach · Interface IA centrale unique
//
// Refonte complète : un seul agent "THW Coach" orchestrateur.
// Pas de multi-agents visibles — l'IA route en interne via
// l'agentId 'central'.
//
// createPortal → document.body : échappe le stacking context
// de <main> (z-index:10). Safe-area pour iOS notch.
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

// ── Types ──────────────────────────────────────────────────────

type THWModel = 'hermes' | 'athena' | 'zeus'

interface AIMsg {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: number
  modelId?: THWModel   // modèle utilisé pour cette réponse
}
interface AIConv {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  msgs: AIMsg[]
}

type FlowId = 'weakpoints' | 'nutrition' | 'recharge' | 'analyzetest' | 'sessionbuilder' | null

interface ActiveQuickAction {
  label: string
  apiPrompt: string   // enriched prompt that goes to AI — never shown to user as-is
  model: THWModel
}

interface Props {
  open: boolean
  onClose: () => void
  initialAgent?: string              // gardé pour compat — non affiché
  context?: Record<string, unknown>
  prefillMessage?: string
  initialFlow?: FlowId
  initialUserLabel?: string
  initialAssistantMsg?: string
}

// ── Storage ────────────────────────────────────────────────────

const STORE_KEY = 'thw_ai_convs_v3'
const MAX_CONVS = 30

function loadConvs(): AIConv[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]') }
  catch { return [] }
}
function saveConvs(c: AIConv[]) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORE_KEY, JSON.stringify(c)) } catch {}
}
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

// ── Configs des 3 modèles ─────────────────────────────────────

interface ModelConfig {
  name: string
  color: string       // teinte principale
  colorBg: string     // fond teinté (light)
  colorBgDark: string // fond teinté (dark)
  desc: string        // description courte
  hint: string        // hint affiché dans le picker
}

const MODEL_CONFIGS: Record<THWModel, ModelConfig> = {
  hermes: {
    name: 'Hermès',
    color: '#d4a017',
    colorBg: 'rgba(212,160,23,0.1)',
    colorBgDark: 'rgba(212,160,23,0.13)',
    desc: 'Rapide et direct',
    hint: 'Réponse express',
  },
  athena: {
    name: 'Athéna',
    color: '#5b6fff',
    colorBg: 'rgba(91,111,255,0.1)',
    colorBgDark: 'rgba(91,111,255,0.13)',
    desc: 'Analyse approfondie',
    hint: 'Équilibre et expertise',
  },
  zeus: {
    name: 'Zeus',
    color: '#8b5cf6',
    colorBg: 'rgba(139,92,246,0.1)',
    colorBgDark: 'rgba(139,92,246,0.13)',
    desc: 'Vision stratégique',
    hint: 'Analyse maximale',
  },
}

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'matin'
  if (h >= 12 && h < 18) return 'après-midi'
  return 'soir'
}
function fmtDate(ts: number) {
  const d = Date.now() - ts
  if (d < 60_000) return 'instant'
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}min`
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// ── Markdown renderer ──────────────────────────────────────────

const HEADING_STYLES: Record<number, React.CSSProperties> = {
  1: { fontSize: 16, fontWeight: 800, lineHeight: 1.3,  marginTop: 20, marginBottom: 8  },
  2: { fontSize: 14, fontWeight: 700, lineHeight: 1.35, marginTop: 16, marginBottom: 6  },
  3: { fontSize: 13, fontWeight: 600, lineHeight: 1.4,  marginTop: 12, marginBottom: 4  },
  4: { fontSize: 12, fontWeight: 500, lineHeight: 1.4,  marginTop: 8,  marginBottom: 3,
       color: 'var(--ai-mid)', letterSpacing: '0.02em' },
}

function MsgContent({ text }: { text: string }) {
  const blocks: React.ReactNode[] = []
  const lines = text.split('\n')
  let i = 0

  while (i < lines.length) {
    const raw = lines[i]
    const line = raw.trimEnd()

    if (!line.trim()) { blocks.push(<div key={i} style={{ height: 10 }} />); i++; continue }
    if (/^[-=]{3,}$/.test(line.trim())) { i++; continue }

    const hMatch = line.match(/^(#{1,4})\s+(.+)/)
    if (hMatch) {
      const lvl = Math.min(hMatch[1].length, 4) as 1 | 2 | 3 | 4
      blocks.push(
        <div key={i} style={{
          fontFamily: 'Syne, sans-serif',
          color: 'var(--ai-text)',
          ...HEADING_STYLES[lvl],
        }}>
          {parseBold(hMatch[2])}
        </div>
      )
      i++; continue
    }

    const nMatch = line.match(/^(\d+)[.)]\s+(.+)/)
    if (nMatch) {
      blocks.push(
        <div key={i} style={{ display: 'flex', gap: 9, marginBottom: 5 }}>
          <span style={{ color: 'var(--ai-dim)', minWidth: 18, fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 3, fontFamily: 'DM Mono,monospace' }}>
            {nMatch[1]}.
          </span>
          <span style={{ fontSize: 13.5, lineHeight: 1.72 }}>{parseBold(nMatch[2])}</span>
        </div>
      )
      i++; continue
    }

    const bMatch = line.match(/^[-•*]\s+(.+)/)
    if (bMatch) {
      blocks.push(
        <div key={i} style={{ display: 'flex', gap: 9, marginBottom: 5 }}>
          <span style={{ color: 'var(--ai-dim)', flexShrink: 0, fontSize: 8, marginTop: 6, lineHeight: 1 }}>●</span>
          <span style={{ fontSize: 13.5, lineHeight: 1.72 }}>{parseBold(bMatch[1])}</span>
        </div>
      )
      i++; continue
    }

    blocks.push(
      <p key={i} style={{ fontSize: 13.5, lineHeight: 1.75, margin: '0 0 6px 0', color: 'var(--ai-text)' }}>
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
  return <>{parts.map((p, j) => j % 2 === 1
    ? <strong key={j} style={{ fontWeight: 700, color: 'var(--ai-text)' }}>{p}</strong>
    : <span key={j}>{p}</span>
  )}</>
}

// ══════════════════════════════════════════════════════════════
// SESSION DETECTION & RENDERING
// ══════════════════════════════════════════════════════════════

const SESSION_ZONE_COLORS = ['#9ca3af', '#22c55e', '#eab308', '#f97316', '#ef4444']

interface SessionBlock {
  label: string
  duration_min: number
  zone: number
  intensity: string
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

function parseSession(text: string): ParsedSession | null {
  const lower = text.toLowerCase()
  if (!/échauffement|warm.?up/.test(lower)) return null
  if (!/retour au calme|cool.?down/.test(lower)) return null
  if (!/\d+\s*min/.test(lower)) return null

  const lines = text.split('\n')

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

// ── Session Block Chart ────────────────────────────────────────

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
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ai-dim)', marginBottom: 6 }}>Date</p>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', color: 'var(--ai-text)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ai-dim)', marginBottom: 6 }}>Heure</p>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', color: 'var(--ai-text)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
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
        borderRadius: 12, border: '1px solid var(--ai-border)',
        background: 'var(--ai-bg2)', overflow: 'hidden',
        marginLeft: 34,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 14px',
          background: 'linear-gradient(90deg,rgba(91,111,255,0.09) 0%,transparent 100%)',
          borderBottom: '1px solid var(--ai-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontFamily: 'Syne,sans-serif', fontSize: 12, fontWeight: 700, color: 'var(--ai-text)' }}>
              {sportLabel} · {total} min
            </span>
            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: 'rgba(91,111,255,0.15)', color: '#5b6fff', fontWeight: 700, letterSpacing: '0.05em' }}>
              SÉANCE
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {session.blocks.map((b, i) => (
              <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: SESSION_ZONE_COLORS[(b.zone - 1) % 5], opacity: 0.85 }} />
            ))}
          </div>
        </div>

        <div style={{ padding: '12px 14px 8px' }}>
          <SessionBlockChart blocks={displayBlocks} total={total} />
        </div>

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

        <div style={{ display: 'flex', gap: 6, padding: '0 10px 11px' }}>
          {editMode ? (
            <>
              <button onClick={() => setEditMode(false)} style={{ flex: 1, padding: '7px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg)', color: 'var(--ai-mid)', fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                Annuler
              </button>
              <button onClick={confirmEdit} style={{ flex: 2, padding: '7px', borderRadius: 8, border: 'none', background: 'rgba(91,111,255,0.15)', color: '#5b6fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                Valider les modifications
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { setEditedBlocks(session.blocks); setEditMode(true) }} style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg)', color: 'var(--ai-mid)', fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                Modifier
              </button>
              <button onClick={() => setShowModal(true)} style={{ flex: 2, padding: '7px 10px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#00c8e0,#5b6fff)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
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
// MODEL EFFIGY — SVG animé identifiant le modèle actif
// ══════════════════════════════════════════════════════════════

function ModelEffigy({ model, isAnimating, size = 18, color }: {
  model: THWModel
  isAnimating: boolean
  size?: number
  color?: string   // override couleur (ex: 'var(--ai-mid)' pour monochrome)
}) {
  const cfg = MODEL_CONFIGS[model]
  const animName  = isAnimating ? `${model}_effigy_on` : `${model}_effigy_off`
  const animSpeed = isAnimating
    ? (model === 'hermes' ? '0.65s' : model === 'zeus' ? '1.1s' : '1.5s')
    : (model === 'zeus' ? '2.5s' : '3.5s')

  const svgStyle: React.CSSProperties = {
    color: color ?? cfg.color,
    display: 'block',
    flexShrink: 0,
    animation: `${animName} ${animSpeed} ease-in-out infinite`,
  }

  if (model === 'hermes') return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={svgStyle}>
      {/* Staff */}
      <line x1="10" y1="2.5" x2="10" y2="17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Left wing */}
      <path d="M10 4.5 Q8 2.5 5.5 3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      {/* Right wing */}
      <path d="M10 4.5 Q12 2.5 14.5 3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      {/* Snake 1 */}
      <path d="M10 6 C13.5 7 13.5 9.5 10 10.5 C6.5 11.5 6.5 14 10 15" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      {/* Snake 2 */}
      <path d="M10 6 C6.5 7 6.5 9.5 10 10.5 C13.5 11.5 13.5 14 10 15" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
    </svg>
  )

  if (model === 'athena') return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={svgStyle}>
      {/* Left wing */}
      <path d="M10 12 Q6.5 9.5 4 11 Q4.5 14 8 13" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" fill="currentColor" fillOpacity="0.15"/>
      {/* Right wing */}
      <path d="M10 12 Q13.5 9.5 16 11 Q15.5 14 12 13" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" fill="currentColor" fillOpacity="0.15"/>
      {/* Head */}
      <circle cx="10" cy="8" r="4" stroke="currentColor" strokeWidth="1.3"/>
      {/* Eyes */}
      <circle cx="8.5" cy="7.5" r="1.1" fill="currentColor"/>
      <circle cx="11.5" cy="7.5" r="1.1" fill="currentColor"/>
      {/* Ear tufts */}
      <path d="M8.5 4 L7.5 2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      <path d="M11.5 4 L12.5 2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  )

  // Zeus — éclair
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={svgStyle}>
      <path d="M12.5 1.5 L5.5 11 L10.5 11 L7.5 18.5 L14.5 9 L9.5 9 Z"
        stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round"
        fill="currentColor" fillOpacity="0.2"/>
    </svg>
  )
}

// ── ModelPicker — bouton rond + dropdown monochrome ──────────

function ModelPicker({ model, onChange }: {
  model: THWModel
  onChange: (m: THWModel) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const models: THWModel[] = ['hermes', 'athena', 'zeus']
  const cfg = MODEL_CONFIGS[model]

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>

      {/* Bouton trigger — rond, monochrome */}
      <button
        onClick={() => setOpen(p => !p)}
        title={`Modèle : ${cfg.name}`}
        style={{
          width: 28, height: 28, borderRadius: '50%',
          border: `1px solid ${open ? 'var(--ai-mid)' : 'var(--ai-border)'}`,
          background: open ? 'var(--ai-bg2)' : 'transparent',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.12s',
        }}
      >
        <ModelEffigy model={model} isAnimating={false} size={14} color="var(--ai-mid)" />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 10px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--ai-bg)',
          border: '1px solid var(--ai-border)',
          borderRadius: 13,
          boxShadow: '0 8px 28px rgba(0,0,0,0.13)',
          overflow: 'hidden',
          minWidth: 188,
          zIndex: 50,
          animation: 'ai_slidein 0.14s ease',
        }}>
          <div style={{
            padding: '10px 14px 6px',
            fontSize: 9, fontWeight: 700, color: 'var(--ai-dim)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            fontFamily: 'DM Sans,sans-serif',
          }}>
            Modèle IA
          </div>
          {models.map(m => {
            const mc  = MODEL_CONFIGS[m]
            const isA = model === m
            return (
              <button
                key={m}
                onClick={() => { onChange(m); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '9px 14px',
                  border: 'none',
                  background: isA ? 'var(--ai-bg2)' : 'transparent',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isA) (e.currentTarget as HTMLButtonElement).style.background = 'var(--ai-bg2)' }}
                onMouseLeave={e => { if (!isA) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                <ModelEffigy model={m} isAnimating={false} size={15}
                  color={isA ? 'var(--ai-text)' : 'var(--ai-dim)'}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: isA ? 700 : 500,
                    color: isA ? 'var(--ai-text)' : 'var(--ai-mid)',
                    fontFamily: 'Syne,sans-serif', lineHeight: 1.2,
                  }}>
                    {mc.name}
                  </div>
                  <div style={{
                    fontSize: 10, color: 'var(--ai-dim)',
                    fontFamily: 'DM Sans,sans-serif', marginTop: 2,
                  }}>
                    {mc.desc}
                  </div>
                </div>
                {isA && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--ai-text)" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// FLOW COMPONENTS — Actions interactives pré-envoi
// ══════════════════════════════════════════════════════════════

// ── WeakpointsFlow ─────────────────────────────────────────────

const WP_SPORTS = ['Cyclisme', 'Running', 'Natation', 'Hyrox', 'Musculation', 'Aviron', 'Trail']

function WeakpointsFlow({ onPrepare, onCancel }: { onPrepare: (apiPrompt: string, label: string) => void; onCancel: () => void }) {
  const [selected, setSelected] = useState<string[]>([])

  function toggle(s: string) {
    setSelected(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  function submit() {
    if (selected.length === 0) return
    const sports = selected.join(', ')
    const apiPrompt =
      `Analyse mes points faibles dans les sports suivants : ${sports}. ` +
      `Pour chaque discipline, identifie les lacunes spécifiques (technique, endurance, puissance, récupération, etc.) ` +
      `en te basant sur mes données réelles disponibles dans l'application. ` +
      `Propose ensuite des axes de travail concrets et priorisés pour progresser.`
    onPrepare(apiPrompt, `Points faibles — ${sports}`)
  }

  return (
    <div style={{ padding: '8px 0 4px' }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 5px', fontFamily: 'Syne,sans-serif' }}>
        Sur quels sports analyser tes points faibles ?
      </p>
      <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 14px' }}>
        Sélectionne un ou plusieurs sports
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
        {WP_SPORTS.map(s => {
          const on = selected.includes(s)
          return (
            <button key={s} onClick={() => toggle(s)} style={{
              padding: '7px 13px', borderRadius: 20,
              border: `1px solid ${on ? '#5b6fff' : 'var(--ai-border)'}`,
              background: on ? 'rgba(91,111,255,0.13)' : 'var(--ai-bg2)',
              color: on ? '#5b6fff' : 'var(--ai-mid)',
              fontSize: 12, fontWeight: on ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.12s',
              fontFamily: 'DM Sans,sans-serif',
            }}>
              {s}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{
          padding: '9px 16px', borderRadius: 9,
          border: '1px solid var(--ai-border)', background: 'transparent',
          color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer',
          fontFamily: 'DM Sans,sans-serif',
        }}>
          Annuler
        </button>
        <button onClick={submit} disabled={selected.length === 0} style={{
          flex: 1, padding: '9px 16px', borderRadius: 9,
          border: 'none',
          background: selected.length > 0 ? 'linear-gradient(135deg,#00c8e0,#5b6fff)' : 'var(--ai-border)',
          color: '#fff', fontSize: 12, fontWeight: 700,
          cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
          fontFamily: 'DM Sans,sans-serif', transition: 'background 0.15s',
        }}>
          Analyser {selected.length > 0 ? `(${selected.length})` : ''}
        </button>
      </div>
    </div>
  )
}

// ── NutritionFlow ──────────────────────────────────────────────

interface NutritionStep {
  question: string
  options: string[]
  multi?: boolean
}

const NUTRITION_STEPS: NutritionStep[] = [
  {
    question: 'Quel est ton objectif principal ?',
    options: ['Perte de poids', 'Performance sportive', 'Prise de masse musculaire', 'Maintenance'],
  },
  {
    question: 'As-tu des fluctuations de poids importantes ?',
    options: ['Oui, régulièrement', 'Parfois', 'Non, poids stable'],
  },
  {
    question: 'Quels sports pratiques-tu principalement ?',
    options: ['Course à pied', 'Cyclisme', 'Natation', 'Hyrox', 'Musculation', 'Aviron', 'Trail'],
    multi: true,
  },
  {
    question: 'Quelle est ta charge hebdomadaire d\'entraînement ?',
    options: ['Légère (moins de 3h)', 'Modérée (3 à 6h)', 'Élevée (6 à 10h)', 'Très élevée (plus de 10h)'],
  },
  {
    question: 'Comment décris-tu ton mode de vie hors entraînement ?',
    options: ['Sédentaire (bureau, télétravail)', 'Peu actif', 'Actif (debout, déplacements)', 'Très actif (travail physique)'],
  },
  {
    question: 'Quelles sont tes habitudes alimentaires actuelles ?',
    options: ['3 repas structurés', '3 repas + collations', 'Alimentation variable et irrégulière', 'Périodes de jeûne intentionnelles'],
  },
  {
    question: 'As-tu des préférences ou restrictions alimentaires ?',
    options: ['Aucune restriction', 'Végétarien', 'Vegan', 'Sans gluten', 'Sans lactose'],
    multi: true,
  },
  {
    question: 'Quel type de plan veux-tu ?',
    options: ['Principes et vue d\'ensemble', 'Plan jour type détaillé', 'Timing précis (avant / pendant / après effort)'],
  },
]

interface TemplateForPrompt {
  nom: string
  type_repas: string
  description: string | null
  kcal: number | null
  proteines: number | null
  glucides: number | null
  lipides: number | null
}

function NutritionFlow({ onPrepare, onCancel }: { onPrepare: (apiPrompt: string, label: string) => void; onCancel: () => void }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<string[][]>(Array(NUTRITION_STEPS.length).fill([]))
  const [activeTemplates, setActiveTemplates] = useState<TemplateForPrompt[]>([])

  useEffect(() => {
    async function loadTemplates() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const { data } = await sb
          .from('nutrition_meal_templates')
          .select('nom,type_repas,description,kcal,proteines,glucides,lipides')
          .eq('user_id', user.id)
          .eq('actif', true)
        setActiveTemplates((data ?? []) as TemplateForPrompt[])
      } catch { /* silently ignore */ }
    }
    void loadTemplates()
  }, [])

  const cur = NUTRITION_STEPS[step]

  function toggleOption(opt: string) {
    setAnswers(prev => {
      const current = prev[step]
      if (cur.multi) {
        const updated = current.includes(opt) ? current.filter(x => x !== opt) : [...current, opt]
        return prev.map((a, i) => i === step ? updated : a)
      }
      return prev.map((a, i) => i === step ? [opt] : a)
    })
  }

  function next() {
    if (step < NUTRITION_STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      const parts = NUTRITION_STEPS.map((s, i) => `${s.question} → ${answers[i].join(', ') || 'Non précisé'}`)
      let templatesBlock = ''
      if (activeTemplates.length > 0) {
        const lines = activeTemplates.map(t =>
          `- [${t.type_repas}] ${t.nom}${t.description ? ` — ${t.description}` : ''} | ${t.kcal ?? 0} kcal | P:${t.proteines ?? 0}g G:${t.glucides ?? 0}g L:${t.lipides ?? 0}g`
        )
        templatesBlock = `\n\nRepas types actifs de l'athlète à intégrer dans le plan :\n${lines.join('\n')}\nBase le plan sur ces repas ou fais-les légèrement évoluer selon l'objectif. Ne jamais ignorer un repas type actif.`
      }
      const apiPrompt =
        `Crée un plan nutritionnel personnalisé basé sur mes réponses :\n${parts.join('\n')}${templatesBlock}\n\n` +
        `Appuie-toi sur mes données réelles disponibles dans l'application (activités, poids, objectifs). ` +
        `Sois précis et pratique.`
      onPrepare(apiPrompt, 'Plan nutritionnel personnalisé')
    }
  }

  const canNext = answers[step].length > 0
  const isLast = step === NUTRITION_STEPS.length - 1

  return (
    <div style={{ padding: '8px 0 4px' }}>
      {/* Progression */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 3, background: 'var(--ai-border)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: `${((step + 1) / NUTRITION_STEPS.length) * 100}%`,
            background: 'linear-gradient(90deg,#00c8e0,#5b6fff)',
            transition: 'width 0.3s ease',
          }} />
        </div>
        <span style={{ fontSize: 10, color: 'var(--ai-dim)', flexShrink: 0, fontFamily: 'DM Mono,monospace' }}>
          {step + 1}/{NUTRITION_STEPS.length}
        </span>
      </div>

      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 12px', fontFamily: 'Syne,sans-serif', lineHeight: 1.4 }}>
        {cur.question}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {cur.options.map(opt => {
          const on = answers[step].includes(opt)
          return (
            <button key={opt} onClick={() => toggleOption(opt)} style={{
              padding: '9px 13px', borderRadius: 9, textAlign: 'left',
              border: `1px solid ${on ? '#5b6fff' : 'var(--ai-border)'}`,
              background: on ? 'rgba(91,111,255,0.1)' : 'var(--ai-bg2)',
              color: on ? '#5b6fff' : 'var(--ai-mid)',
              fontSize: 12, fontWeight: on ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.12s',
              fontFamily: 'DM Sans,sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>{opt}</span>
              {on && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5b6fff" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={{
            padding: '9px 14px', borderRadius: 9,
            border: '1px solid var(--ai-border)', background: 'transparent',
            color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer',
            fontFamily: 'DM Sans,sans-serif',
          }}>
            Retour
          </button>
        )}
        {step === 0 && (
          <button onClick={onCancel} style={{
            padding: '9px 14px', borderRadius: 9,
            border: '1px solid var(--ai-border)', background: 'transparent',
            color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer',
            fontFamily: 'DM Sans,sans-serif',
          }}>
            Annuler
          </button>
        )}
        <button onClick={next} disabled={!canNext} style={{
          flex: 1, padding: '9px 16px', borderRadius: 9, border: 'none',
          background: canNext ? 'linear-gradient(135deg,#00c8e0,#5b6fff)' : 'var(--ai-border)',
          color: '#fff', fontSize: 12, fontWeight: 700,
          cursor: canNext ? 'pointer' : 'not-allowed',
          fontFamily: 'DM Sans,sans-serif', transition: 'background 0.15s',
        }}>
          {isLast ? 'Générer mon plan' : 'Suivant'}
        </button>
      </div>
    </div>
  )
}

// ── RechargeFlow ───────────────────────────────────────────────

function RechargeFlow({ onPrepare, onCancel }: { onPrepare: (apiPrompt: string, label: string) => void; onCancel: () => void }) {
  const [type,      setType]      = useState<'competition' | 'training' | null>(null)
  const [intensity, setIntensity] = useState('')
  const [date,      setDate]      = useState('')

  function submit() {
    if (!type) return
    let apiPrompt: string
    if (type === 'competition') {
      apiPrompt =
        `Crée-moi un plan de recharge glucidique pour une compétition${date ? ` le ${date}` : ''}.` +
        ` Indique les quantités précises de glucides jour par jour avant l'épreuve, les aliments recommandés, ` +
        `le timing des repas et les points de vigilance. Base-toi sur mes données d'entraînement et mon profil.`
    } else {
      apiPrompt =
        `Crée-moi un plan de recharge glucidique pour une session d'entraînement de haute intensité.` +
        `${intensity ? ` Intensité prévue : ${intensity}.` : ''}` +
        ` Explique comment charger avant, comment gérer l'apport pendant et la récupération après. ` +
        `Adapte les quantités à mon profil et mes données disponibles dans l'application.`
    }
    onPrepare(apiPrompt, 'Recharge glucidique — ' + (type === 'competition' ? 'Compétition' : 'Entraînement'))
  }

  return (
    <div style={{ padding: '8px 0 4px' }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 5px', fontFamily: 'Syne,sans-serif' }}>
        Dans quel contexte ?
      </p>
      <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 14px' }}>
        La stratégie diffère selon l'objectif
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {([
          { id: 'competition' as const, label: 'Compétition', sub: 'Course ou événement cible' },
          { id: 'training' as const, label: 'Entraînement', sub: 'Séance haute intensité' },
        ]).map(opt => (
          <button key={opt.id} onClick={() => setType(opt.id)} style={{
            flex: 1, padding: '11px 10px', borderRadius: 10, textAlign: 'center',
            border: `1px solid ${type === opt.id ? '#5b6fff' : 'var(--ai-border)'}`,
            background: type === opt.id ? 'rgba(91,111,255,0.1)' : 'var(--ai-bg2)',
            cursor: 'pointer', transition: 'all 0.12s',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: type === opt.id ? '#5b6fff' : 'var(--ai-text)', fontFamily: 'Syne,sans-serif', marginBottom: 3 }}>
              {opt.label}
            </div>
            <div style={{ fontSize: 10, color: 'var(--ai-dim)', fontFamily: 'DM Sans,sans-serif' }}>
              {opt.sub}
            </div>
          </button>
        ))}
      </div>

      {type === 'competition' && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ai-dim)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Date de la compétition (optionnel)
          </p>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', color: 'var(--ai-text)', fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'DM Sans,sans-serif' }}
          />
        </div>
      )}

      {type === 'training' && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ai-dim)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Intensité prévue
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            {['Haute', 'Très haute'].map(lvl => (
              <button key={lvl} onClick={() => setIntensity(lvl)} style={{
                flex: 1, padding: '8px', borderRadius: 8,
                border: `1px solid ${intensity === lvl ? '#5b6fff' : 'var(--ai-border)'}`,
                background: intensity === lvl ? 'rgba(91,111,255,0.1)' : 'var(--ai-bg2)',
                color: intensity === lvl ? '#5b6fff' : 'var(--ai-mid)',
                fontSize: 12, fontWeight: intensity === lvl ? 600 : 400,
                cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
              }}>
                {lvl}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{
          padding: '9px 16px', borderRadius: 9,
          border: '1px solid var(--ai-border)', background: 'transparent',
          color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer',
          fontFamily: 'DM Sans,sans-serif',
        }}>
          Annuler
        </button>
        <button onClick={submit} disabled={!type} style={{
          flex: 1, padding: '9px 16px', borderRadius: 9, border: 'none',
          background: type ? 'linear-gradient(135deg,#00c8e0,#5b6fff)' : 'var(--ai-border)',
          color: '#fff', fontSize: 12, fontWeight: 700,
          cursor: type ? 'pointer' : 'not-allowed',
          fontFamily: 'DM Sans,sans-serif',
        }}>
          Créer mon plan
        </button>
      </div>
    </div>
  )
}

// ── AnalyzeTestFlow ───────────────────────────────────────────

const AT_SPORTS: { id: string; label: string }[] = [
  { id: 'running',  label: 'Running' },
  { id: 'cycling',  label: 'Vélo' },
  { id: 'natation', label: 'Natation' },
  { id: 'aviron',   label: 'Rowing' },
  { id: 'hyrox',    label: 'Hyrox' },
]

interface TestResultRow {
  id: string
  date: string
  valeurs: Record<string, unknown>
  notes: string | null
  test_definitions: { nom: string; sport: string } | null
}

function AnalyzeTestFlow({ onPrepare, onCancel }: { onPrepare: (apiPrompt: string, label: string) => void; onCancel: () => void }) {
  const [step,     setStep]     = useState<'sport' | 'results'>('sport')
  const [sport,    setSport]    = useState<string | null>(null)
  const [tests,    setTests]    = useState<TestResultRow[] | null>(null)
  const [loadingT, setLoadingT] = useState(false)

  async function loadTests(sp: string) {
    setLoadingT(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setTests([]); setLoadingT(false); setStep('results'); return }

      // Fetch test definitions for this sport
      const { data: defs } = await sb
        .from('test_definitions')
        .select('id')
        .eq('sport', sp)

      if (!defs?.length) { setTests([]); setLoadingT(false); setStep('results'); return }

      const defIds = defs.map((d: { id: string }) => d.id)

      const { data: results } = await sb
        .from('test_results')
        .select('id, date, valeurs, notes, test_definitions(nom, sport)')
        .in('test_definition_id', defIds)
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(10)

      setTests((results as unknown as TestResultRow[]) ?? [])
    } catch {
      setTests([])
    } finally {
      setLoadingT(false)
      setStep('results')
    }
  }

  function handleSportSelect(sp: string) {
    setSport(sp)
    void loadTests(sp)
  }

  function buildPrompt() {
    if (!tests?.length || !sport) return
    const sportLabel = AT_SPORTS.find(s => s.id === sport)?.label ?? sport
    const testLines = tests.map(t => {
      const nom = t.test_definitions?.nom ?? 'Test'
      const vals = Object.entries(t.valeurs)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
      return `- ${nom} (${t.date}) : ${vals}${t.notes ? ` — Notes: ${t.notes}` : ''}`
    }).join('\n')

    const apiPrompt =
      `Analyse mes résultats de tests en ${sportLabel}.\n\n` +
      `Résultats disponibles :\n${testLines}\n\n` +
      `Interprète ces données : progression, niveaux atteints, points forts, faiblesses identifiées. ` +
      `Propose des axes de travail concrets basés sur ces mesures réelles.`
    onPrepare(apiPrompt, `Analyser mes tests — ${sportLabel}`)
  }

  // ── Étape 1 : sélection du sport ──
  if (step === 'sport') {
    return (
      <div style={{ padding: '8px 0 4px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 5px', fontFamily: 'Syne,sans-serif' }}>
          Quel sport analyser ?
        </p>
        <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 14px' }}>
          Tes tests enregistrés pour ce sport seront affichés
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
          {AT_SPORTS.map(s => (
            <button key={s.id} onClick={() => handleSportSelect(s.id)}
              disabled={loadingT}
              style={{
                padding: '8px 16px', borderRadius: 20,
                border: '1px solid var(--ai-border)',
                background: 'var(--ai-bg2)', color: 'var(--ai-mid)',
                fontSize: 12, fontWeight: 500, cursor: loadingT ? 'not-allowed' : 'pointer',
                fontFamily: 'DM Sans,sans-serif', transition: 'all 0.12s',
              }}
              onMouseEnter={e => { if (!loadingT) { (e.currentTarget as HTMLButtonElement).style.borderColor = '#5b6fff'; (e.currentTarget as HTMLButtonElement).style.color = '#5b6fff' } }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--ai-border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--ai-mid)' }}
            >
              {s.label}
            </button>
          ))}
        </div>
        {loadingT && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ai-dim)', fontSize: 11 }}>
            <Dots />
            <span>Chargement des tests…</span>
          </div>
        )}
        <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
          Annuler
        </button>
      </div>
    )
  }

  // ── Étape 2 : résultats ──
  const sportLabel = AT_SPORTS.find(s => s.id === sport)?.label ?? sport

  if (!tests?.length) {
    return (
      <div style={{ padding: '8px 0 4px' }}>
        <div style={{
          padding: '16px', borderRadius: 10,
          border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)',
          marginBottom: 14,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 8px', fontFamily: 'Syne,sans-serif' }}>
            Aucun test en {sportLabel}
          </p>
          <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 4px', lineHeight: 1.5 }}>
            Tu n'as encore aucun test enregistré pour ce sport.
          </p>
          <p style={{ fontSize: 12, color: 'var(--ai-dim)', margin: 0, lineHeight: 1.5 }}>
            Va dans <strong style={{ color: 'var(--ai-text)' }}>Performance → Tests</strong> pour en ajouter.
            Cela permettra une analyse précise de ta progression.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setSport(null); setTests(null); setStep('sport') }}
            style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
            Autre sport
          </button>
          <button onClick={onCancel}
            style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: 'var(--ai-bg2)', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
            Fermer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 0 4px' }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 4px', fontFamily: 'Syne,sans-serif' }}>
        {tests.length} test{tests.length > 1 ? 's' : ''} en {sportLabel}
      </p>
      <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 12px' }}>
        Résultats les plus récents
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
        {tests.slice(0, 5).map(t => (
          <div key={t.id} style={{
            padding: '8px 12px', borderRadius: 8,
            border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ai-text)', fontFamily: 'DM Sans,sans-serif' }}>
                {t.test_definitions?.nom ?? 'Test'}
              </span>
              <span style={{ fontSize: 10, color: 'var(--ai-dim)', fontFamily: 'DM Mono,monospace' }}>
                {t.date}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ai-mid)', marginTop: 2, lineHeight: 1.4 }}>
              {Object.entries(t.valeurs).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' · ')}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => { setSport(null); setTests(null); setStep('sport') }}
          style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
          Retour
        </button>
        <button onClick={buildPrompt}
          style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#00c8e0,#5b6fff)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
          Analyser mes tests
        </button>
      </div>
    </div>
  )
}

// ── SessionBuilderFlow ─────────────────────────────────────────

const SB_SPORTS: { id: string; label: string; color: string }[] = [
  { id: 'muscu',     label: 'Muscu / Renfo',      color: '#5b6fff' },
  { id: 'running',   label: 'Running',             color: '#22c55e' },
  { id: 'velo',      label: 'Vélo / Home trainer', color: '#f97316' },
  { id: 'natation',  label: 'Natation',            color: '#00c8e0' },
  { id: 'hyrox',     label: 'Hyrox',               color: '#ef4444' },
  { id: 'aviron',    label: 'Aviron',              color: '#14b8a6' },
  { id: 'triathlon', label: 'Triathlon',           color: '#a855f7' },
]

const SB_TYPES: Record<string, string[]> = {
  muscu:     ['Strength','Strength endurance','Explosivité','Push','Pull','Legs','Full body','Abdos / gainage'],
  running:   ['1500m','5k','10k','Semi','Marathon','VMA','Aérobie','SL1','SL2','Hills','Mixte'],
  velo:      ['Aérobie','SL1','SL2','PMA','Mixte','Sprints'],
  natation:  ['Technique','Seuil','Sprints'],
  hyrox:     ['Compromised Run','Ergo','Spé wall ball','Spé ergo','Spé sled','Simulation'],
  aviron:    ['EF','Travail technique','Seuil','Vo2max','Sprints','Race pace'],
  triathlon: ['Brick Run','Simulation complète'],
}

const SB_VELO_SOUS_TYPES = ['Vélo route','Home Trainer','Elliptique','VTT','Cyclocross']

const INTENSITE_COLOR: Record<string, string> = {
  'Faible':  '#22c55e',
  'Modéré':  '#eab308',
  'Élevé':   '#f97316',
  'Maximum': '#ef4444',
}

interface SBBloc {
  nom: string
  repetitions: number
  duree_effort: number
  recup: number
  zone_effort: string[]
  zone_recup: string[]
  watts: number | null
  fc_cible: number | null
  fc_max: number | null
  cadence: number | null
  allure_cible: string | null
  consigne: string
}

interface SBSession {
  nom: string
  sport: string
  type_seance: string[]
  duree_estimee: number
  intensite: 'Faible' | 'Modéré' | 'Élevé' | 'Maximum'
  tss_estime: number
  rpe_cible: number
  tags: string[]
  description: string
  blocs: SBBloc[]
}

function SessionBuilderFlow({ onCancel }: { onCancel: () => void }) {
  type Phase = 'sport' | 'type' | 'generating' | 'result' | 'modify' | 'saved'

  const [phase,        setPhase]        = useState<Phase>('sport')
  const [sport,        setSport]        = useState<string | null>(null)
  const [sousType,     setSousType]     = useState<string | null>(null)
  const [typesSeance,  setTypesSeance]  = useState<string[]>([])
  const [freeText,     setFreeText]     = useState('')
  const [session,      setSession]      = useState<SBSession | null>(null)
  const [modifyText,   setModifyText]   = useState('Voici ce que je veux changer : ')
  const [saving,       setSaving]       = useState(false)
  const [savedId,      setSavedId]      = useState<string | null>(null)
  const [error,        setError]        = useState<string | null>(null)

  function toggleType(t: string) {
    setTypesSeance(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    )
  }

  async function fetchProfil(): Promise<{ ftp?: number; sl1?: string; sl2?: string; zones?: Record<string, string> }> {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return {}
      const { data } = await sb
        .from('training_zones')
        .select('sport,ftp_watts,sl1,sl2,z1_value,z2_value,z3_value,z4_value,z5_value')
        .eq('user_id', user.id)
        .eq('is_current', true)
      if (!data?.length) return {}
      const bike = data.find((r: { sport: string }) => r.sport === 'bike')
      const run  = data.find((r: { sport: string }) => r.sport === 'run')
      const result: { ftp?: number; sl1?: string; sl2?: string; zones?: Record<string, string> } = {}
      if (bike?.ftp_watts) result.ftp = bike.ftp_watts as number
      if (run?.sl1)  result.sl1 = run.sl1 as string
      if (run?.sl2)  result.sl2 = run.sl2 as string
      const zones: Record<string, string> = {}
      for (const row of data) {
        const r = row as { sport: string; z1_value?: string; z2_value?: string; z3_value?: string; z4_value?: string; z5_value?: string }
        if (r.z3_value) zones[`${r.sport}_z3`] = r.z3_value
        if (r.z4_value) zones[`${r.sport}_z4`] = r.z4_value
      }
      if (Object.keys(zones).length) result.zones = zones
      return result
    } catch { return {} }
  }

  async function generate(modification?: string) {
    if (!sport || typesSeance.length === 0) return
    setPhase('generating')
    setError(null)
    try {
      const profil = await fetchProfil()
      const body: Record<string, unknown> = {
        sport, typesSeance, profil,
        sousType: sousType ?? undefined,
        descriptionLibre: freeText.trim() || undefined,
      }
      if (modification && session) {
        body.modification   = modification
        body.sessionActuelle = session
      }
      const res = await fetch('/api/session-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json() as { session?: SBSession; error?: string }
      if (data.error) { setError(data.error); setPhase(session ? 'result' : 'type'); return }
      setSession(data.session ?? null)
      setPhase('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau')
      setPhase(session ? 'result' : 'type')
    }
  }

  async function save() {
    if (!session) return
    setSaving(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setSaving(false); return }
      const { data, error: dbErr } = await sb.from('session_library').insert({
        user_id:       user.id,
        nom:           session.nom,
        sport:         session.sport,
        type_seance:   session.type_seance,
        sous_type:     sousType ?? null,
        duree_estimee: session.duree_estimee,
        intensite:     session.intensite,
        tss_estime:    session.tss_estime,
        rpe_cible:     session.rpe_cible,
        tags:          session.tags,
        description:   session.description,
        blocs:         session.blocs,
        source:        'ai',
      }).select('id').single()
      if (!dbErr && data) setSavedId(data.id as string)
      setPhase('saved')
    } catch { /* silently handle */ }
    setSaving(false)
  }

  // ── Phase : sport ──────────────────────────────────────────────
  if (phase === 'sport') {
    return (
      <div style={{ padding: '8px 0 4px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 4px', fontFamily: 'Syne,sans-serif' }}>
          Créer une séance
        </p>
        <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 14px' }}>
          Choisis le sport
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {SB_SPORTS.map(s => (
            <button key={s.id} onClick={() => { setSport(s.id); setSousType(null); setTypesSeance([]); setPhase('type') }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10, textAlign: 'left',
                border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)',
                cursor: 'pointer', transition: 'all 0.12s', width: '100%',
              }}
              onMouseEnter={e => {
                const b = e.currentTarget as HTMLButtonElement
                b.style.borderColor = s.color
                b.style.background = `${s.color}18`
              }}
              onMouseLeave={e => {
                const b = e.currentTarget as HTMLButtonElement
                b.style.borderColor = 'var(--ai-border)'
                b.style.background = 'var(--ai-bg2)'
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ai-text)', fontFamily: 'DM Sans,sans-serif' }}>
                {s.label}
              </span>
            </button>
          ))}
        </div>
        <button onClick={onCancel} style={{
          padding: '8px 16px', borderRadius: 9, border: '1px solid var(--ai-border)',
          background: 'transparent', color: 'var(--ai-mid)', fontSize: 12,
          cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
        }}>Annuler</button>
      </div>
    )
  }

  // ── Phase : type ───────────────────────────────────────────────
  if (phase === 'type' && sport) {
    const sportLabel = SB_SPORTS.find(s => s.id === sport)?.label ?? sport
    const sportColor = SB_SPORTS.find(s => s.id === sport)?.color ?? '#5b6fff'
    const types      = SB_TYPES[sport] ?? []

    return (
      <div style={{ padding: '8px 0 4px' }}>
        {/* Back + sport label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <button onClick={() => setPhase('sport')} style={{
            width: 26, height: 26, borderRadius: 6, border: '1px solid var(--ai-border)',
            background: 'transparent', color: 'var(--ai-mid)', cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>←</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: sportColor }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ai-text)', fontFamily: 'Syne,sans-serif' }}>
              {sportLabel}
            </span>
          </div>
        </div>

        {/* Sous-type vélo */}
        {sport === 'velo' && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--ai-dim)', margin: '0 0 8px' }}>
              Sous-type
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
              {SB_VELO_SOUS_TYPES.map(st => (
                <button key={st} onClick={() => setSousType(sousType === st ? null : st)} style={{
                  padding: '6px 12px', borderRadius: 20,
                  border: `1px solid ${sousType === st ? '#f97316' : 'var(--ai-border)'}`,
                  background: sousType === st ? 'rgba(249,115,22,0.12)' : 'var(--ai-bg2)',
                  color: sousType === st ? '#f97316' : 'var(--ai-mid)',
                  fontSize: 12, fontWeight: sousType === st ? 600 : 400,
                  cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
                }}>{st}</button>
              ))}
            </div>
          </div>
        )}

        {/* Types de séance */}
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--ai-dim)', margin: '0 0 8px' }}>
          Type de séance
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 14 }}>
          {types.map(t => {
            const on = typesSeance.includes(t)
            return (
              <button key={t} onClick={() => toggleType(t)} style={{
                padding: '7px 13px', borderRadius: 20,
                border: `1px solid ${on ? sportColor : 'var(--ai-border)'}`,
                background: on ? `${sportColor}1a` : 'var(--ai-bg2)',
                color: on ? sportColor : 'var(--ai-mid)',
                fontSize: 12, fontWeight: on ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'DM Sans,sans-serif',
              }}>{t}</button>
            )
          })}
        </div>

        {/* Description libre */}
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--ai-dim)', margin: '0 0 6px' }}>
          Précisions (optionnel)
        </p>
        <textarea
          value={freeText}
          onChange={e => setFreeText(e.target.value)}
          placeholder="Ex : séance marathon spécifique montagne avec 3×2km en côte à allure SL2"
          rows={2}
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 9,
            border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)',
            color: 'var(--ai-text)', fontSize: 12, fontFamily: 'DM Sans,sans-serif',
            resize: 'none' as const, outline: 'none', boxSizing: 'border-box' as const,
            marginBottom: 14,
          }}
        />

        {error && <p style={{ fontSize: 11, color: '#ef4444', margin: '0 0 10px' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{
            padding: '9px 14px', borderRadius: 9, border: '1px solid var(--ai-border)',
            background: 'transparent', color: 'var(--ai-mid)', fontSize: 12,
            cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
          }}>Annuler</button>
          <button
            onClick={() => void generate()}
            disabled={typesSeance.length === 0}
            style={{
              flex: 1, padding: '9px', borderRadius: 9, border: 'none',
              background: typesSeance.length > 0 ? 'linear-gradient(135deg,#00c8e0,#5b6fff)' : 'var(--ai-border)',
              color: '#fff', fontSize: 12, fontWeight: 700,
              cursor: typesSeance.length > 0 ? 'pointer' : 'not-allowed',
              fontFamily: 'DM Sans,sans-serif', transition: 'background 0.15s',
            }}
          >
            Générer la séance
          </button>
        </div>
      </div>
    )
  }

  // ── Phase : generating ─────────────────────────────────────────
  if (phase === 'generating') {
    return (
      <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <Dots />
        <p style={{ fontSize: 13, color: 'var(--ai-mid)', fontFamily: 'DM Sans,sans-serif', margin: 0 }}>
          {session ? 'Modification en cours…' : 'Génération en cours…'}
        </p>
      </div>
    )
  }

  // ── Phase : saved ──────────────────────────────────────────────
  if (phase === 'saved') {
    return (
      <div style={{ padding: '16px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>✅</div>
        <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, margin: '0 0 6px', color: 'var(--ai-text)' }}>
          Séance sauvegardée
        </p>
        <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 16px', fontFamily: 'DM Sans,sans-serif' }}>
          {session?.nom} a été ajoutée à ta bibliothèque.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={onCancel} style={{
            padding: '8px 16px', borderRadius: 9, border: '1px solid var(--ai-border)',
            background: 'transparent', color: 'var(--ai-mid)', fontSize: 12,
            cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
          }}>Fermer</button>
          <a href="/session" style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '8px 16px', borderRadius: 9, border: 'none',
            background: 'linear-gradient(135deg,#00c8e0,#5b6fff)',
            color: '#fff', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
            textDecoration: 'none',
          }}>
            Voir dans Session →
          </a>
        </div>
      </div>
    )
  }

  // ── Phase : modify ─────────────────────────────────────────────
  if (phase === 'modify') {
    return (
      <div style={{ padding: '8px 0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <button onClick={() => setPhase('result')} style={{
            width: 26, height: 26, borderRadius: 6, border: '1px solid var(--ai-border)',
            background: 'transparent', color: 'var(--ai-mid)', cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>←</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', fontFamily: 'Syne,sans-serif' }}>
            Modifier la séance
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--ai-dim)', margin: '0 0 10px', fontFamily: 'DM Sans,sans-serif' }}>
          Décris les changements souhaités
        </p>
        <textarea
          value={modifyText}
          onChange={e => setModifyText(e.target.value)}
          rows={4}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 9,
            border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)',
            color: 'var(--ai-text)', fontSize: 12, fontFamily: 'DM Sans,sans-serif',
            resize: 'none' as const, outline: 'none', boxSizing: 'border-box' as const,
            marginBottom: 12,
          }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setPhase('result')} style={{
            padding: '9px 14px', borderRadius: 9, border: '1px solid var(--ai-border)',
            background: 'transparent', color: 'var(--ai-mid)', fontSize: 12,
            cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
          }}>Annuler</button>
          <button
            onClick={() => void generate(modifyText)}
            disabled={modifyText.trim().length < 10}
            style={{
              flex: 1, padding: '9px', borderRadius: 9, border: 'none',
              background: modifyText.trim().length >= 10 ? 'linear-gradient(135deg,#00c8e0,#5b6fff)' : 'var(--ai-border)',
              color: '#fff', fontSize: 12, fontWeight: 700,
              cursor: modifyText.trim().length >= 10 ? 'pointer' : 'not-allowed',
              fontFamily: 'DM Sans,sans-serif',
            }}
          >
            Régénérer
          </button>
        </div>
      </div>
    )
  }

  // ── Phase : result ─────────────────────────────────────────────
  if (phase === 'result' && session) {
    const sportObj = SB_SPORTS.find(s => s.id === sport)
    const color    = sportObj?.color ?? '#5b6fff'

    return (
      <div style={{ padding: '4px 0' }}>
        {/* Header */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 800, color: 'var(--ai-text)', margin: '0 0 5px', lineHeight: 1.2 }}>
                {session.nom}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 9, background: `${color}22`, color, fontWeight: 700, letterSpacing: '0.04em', fontFamily: 'DM Sans,sans-serif' }}>
                  {sportObj?.label ?? session.sport}
                </span>
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 9, background: `${INTENSITE_COLOR[session.intensite] ?? '#5b6fff'}22`, color: INTENSITE_COLOR[session.intensite] ?? '#5b6fff', fontWeight: 700, letterSpacing: '0.04em', fontFamily: 'DM Sans,sans-serif' }}>
                  {session.intensite}
                </span>
                {session.tags.slice(0, 3).map(tag => (
                  <span key={tag} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 9, background: 'var(--ai-bg2)', color: 'var(--ai-dim)', fontFamily: 'DM Sans,sans-serif' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Métriques */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 10 }}>
            {[
              { label: 'Durée', val: `${session.duree_estimee} min` },
              { label: 'TSS',   val: String(session.tss_estime) },
              { label: 'RPE',   val: `${session.rpe_cible}/10` },
            ].map(({ label, val }) => (
              <div key={label} style={{ textAlign: 'center', padding: '8px 6px', borderRadius: 9, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)' }}>
                <div style={{ fontSize: 9, color: 'var(--ai-dim)', fontFamily: 'DM Sans,sans-serif', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ai-text)', fontFamily: 'DM Mono,monospace' }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 10px', fontFamily: 'DM Sans,sans-serif', lineHeight: 1.5, fontStyle: 'italic' }}>
            {session.description}
          </p>
        </div>

        {/* Blocs */}
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--ai-dim)', margin: '0 0 8px', fontFamily: 'DM Sans,sans-serif' }}>
          Structure — {session.blocs.length} blocs
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {session.blocs.map((bloc, i) => (
            <div key={i} style={{
              padding: '10px 12px', borderRadius: 10,
              border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ai-text)', fontFamily: 'DM Sans,sans-serif' }}>
                  {bloc.nom}
                </span>
                <span style={{ fontSize: 10, color: 'var(--ai-mid)', fontFamily: 'DM Mono,monospace' }}>
                  {bloc.repetitions > 1 ? `${bloc.repetitions}×` : ''}{bloc.duree_effort}min
                  {bloc.recup > 0 ? ` / ${bloc.recup}min récup` : ''}
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginBottom: 4 }}>
                {bloc.zone_effort.map(z => (
                  <span key={z} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 6, background: 'rgba(91,111,255,0.15)', color: '#5b6fff', fontWeight: 700, fontFamily: 'DM Mono,monospace' }}>
                    {z}
                  </span>
                ))}
                {bloc.watts != null && (
                  <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 6, background: 'rgba(249,115,22,0.15)', color: '#f97316', fontFamily: 'DM Mono,monospace' }}>
                    {bloc.watts}W
                  </span>
                )}
                {bloc.allure_cible && (
                  <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 6, background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontFamily: 'DM Mono,monospace' }}>
                    {bloc.allure_cible}
                  </span>
                )}
                {bloc.fc_cible != null && (
                  <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 6, background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontFamily: 'DM Mono,monospace' }}>
                    {bloc.fc_cible}bpm
                  </span>
                )}
              </div>
              <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: 0, fontFamily: 'DM Sans,sans-serif', lineHeight: 1.4 }}>
                {bloc.consigne}
              </p>
            </div>
          ))}
        </div>

        {error && <p style={{ fontSize: 11, color: '#ef4444', margin: '0 0 10px' }}>{error}</p>}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { setModifyText('Voici ce que je veux changer : '); setPhase('modify') }}
            style={{
              flex: 1, padding: '9px', borderRadius: 9,
              border: '1px solid var(--ai-border)', background: 'transparent',
              color: 'var(--ai-mid)', fontSize: 12, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
            }}
          >
            Modifier
          </button>
          <button
            onClick={() => void save()}
            disabled={saving}
            style={{
              flex: 2, padding: '9px', borderRadius: 9, border: 'none',
              background: saving ? 'var(--ai-border)' : 'linear-gradient(135deg,#00c8e0,#5b6fff)',
              color: '#fff', fontSize: 12, fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans,sans-serif',
            }}
          >
            {saving ? 'Sauvegarde…' : '+ Ajouter à la bibliothèque'}
          </button>
        </div>
      </div>
    )
  }

  return null
}

// ══════════════════════════════════════════════════════════════
// ATTACHMENT
// ══════════════════════════════════════════════════════════════

interface AttachedFile {
  name:      string
  mediaType: string   // 'image/jpeg' | 'image/png' | 'application/pdf' | …
  data:      string   // base64 sans préfixe data:...;base64,
  preview?:  string   // data URL pour aperçu image
  isImage:   boolean
}

// Convertit un File en AttachedFile (base64 + preview)
function fileToAttachment(file: File): Promise<AttachedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      // dataUrl = "data:<mediaType>;base64,<data>"
      const [meta, b64] = dataUrl.split(',')
      const mediaType = file.type || 'application/octet-stream'
      const isImage = mediaType.startsWith('image/')
      resolve({
        name:      file.name,
        mediaType,
        data:      b64,
        preview:   isImage ? dataUrl : undefined,
        isImage,
      })
    }
    reader.onerror = () => reject(new Error('Lecture fichier échouée'))
    reader.readAsDataURL(file)
  })
}

// ══════════════════════════════════════════════════════════════
// PLUS MENU
// ══════════════════════════════════════════════════════════════

interface PlusItem {
  label: string
  prompt?: string
  flow?: FlowId
}
interface PlusCat {
  label: string
  items: PlusItem[]
}

const PLUS_CATS: PlusCat[] = [
  {
    label: 'Entraînement',
    items: [
      { label: 'Créer une séance', flow: 'sessionbuilder' as FlowId },
      { label: 'Analyser ma semaine', prompt: 'Analyse ma semaine d\'entraînement en cours. Évalue la répartition des charges, les intensités et l\'équilibre global. Donne des recommandations concrètes pour la suite.' },
      { label: 'Ajuster mon plan', prompt: 'Mon plan d\'entraînement actuel nécessite-t-il des ajustements selon mon état de forme et ma fatigue actuels ? Propose des modifications concrètes si nécessaire.' },
    ],
  },
  {
    label: 'Nutrition',
    items: [
      { label: 'Créer un plan nutritionnel', flow: 'nutrition' },
      { label: 'Recharge glucidique', flow: 'recharge' },
      { label: 'Timing nutritionnel', prompt: 'Explique-moi le timing nutritionnel optimal pour mes entraînements : que manger et quand, avant, pendant et après l\'effort, en fonction de mon profil et de mes activités.' },
    ],
  },
  {
    label: 'Récupération',
    items: [
      { label: 'Récupération du jour', prompt: 'Analyse mes données de récupération du jour et dis-moi si je peux m\'entraîner intensément aujourd\'hui ou si j\'ai besoin de récupérer.' },
      { label: 'Conseils sommeil', prompt: 'Donne-moi des conseils pratiques et concrets pour optimiser mon sommeil en tant qu\'athlète.' },
      { label: 'Gestion de la fatigue', prompt: 'Analyse ma fatigue chronique et ma charge d\'entraînement cumulée. Comment équilibrer progression et récupération sur les prochaines semaines ?' },
    ],
  },
  {
    label: 'Performance',
    items: [
      { label: 'Identifier mes lacunes', flow: 'weakpoints' },
      { label: 'Analyser ma progression', prompt: 'Analyse ma progression sportive sur les dernières semaines. Quels sont mes points forts, mes tendances et comment continuer à progresser efficacement ?' },
    ],
  },
  {
    label: 'Tests',
    items: [
      { label: 'Analyser un test', flow: 'analyzetest' },
      { label: 'Calculer mes zones', prompt: 'Explique-moi comment calculer et utiliser mes zones d\'entraînement (fréquence cardiaque, allure, puissance). Propose une méthode adaptée à mes sports pratiqués.' },
    ],
  },
  {
    label: 'Application',
    items: [
      { label: 'Comprendre l\'application', prompt: 'Explique-moi les fonctionnalités clés de l\'application THW Coaching : comment structurer mon planning, configurer mes zones d\'entraînement, saisir mes données de récupération et suivre ma nutrition.' },
      { label: 'Configurer mes zones', prompt: 'Comment configurer mes zones d\'entraînement dans l\'application ? Où les trouver et comment les utiliser pour piloter mes séances ?' },
    ],
  },
]

function PlusMenu({
  onPrepare,
  onFlow,
  onClose,
  onCamera,
  onPhotos,
  onFiles,
}: {
  onPrepare: (label: string, apiPrompt: string) => void
  onFlow:    (f: FlowId) => void
  onClose:   () => void
  onCamera:  () => void
  onPhotos:  () => void
  onFiles:   () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  // Cartes d'attachement — style iOS sombre
  const ATTACH_CARDS: { label: string; icon: React.ReactNode; onClick: () => void }[] = [
    {
      label: 'Caméra',
      onClick: () => { onClose(); setTimeout(onCamera, 80) },
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      ),
    },
    {
      label: 'Photos',
      onClick: () => { onClose(); setTimeout(onPhotos, 80) },
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <path d="M21 15l-5-5L5 21"/>
        </svg>
      ),
    },
    {
      label: 'Fichiers',
      onClick: () => { onClose(); setTimeout(onFiles, 80) },
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <path d="M14 2v6h6M12 12v6M9 15h6"/>
        </svg>
      ),
    },
  ]

  return (
    <div ref={ref} style={{
      position: 'absolute', bottom: '100%', left: 0, right: 0,
      background: 'var(--ai-bg)',
      border: '1px solid var(--ai-border)',
      borderRadius: '14px 14px 0 0',
      boxShadow: '0 -12px 40px rgba(0,0,0,0.22)',
      zIndex: 30,
      maxHeight: '72vh',
      overflowY: 'auto',
      padding: '0 0 8px',
    }}>
      {/* Handle */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 14px' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--ai-border)' }} />
      </div>

      {/* ── Grille Joindre — style iOS ── */}
      <div style={{ padding: '0 14px 16px' }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 4px 10px' }}>
          Joindre
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {ATTACH_CARDS.map(card => (
            <button
              key={card.label}
              onClick={card.onClick}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 10, padding: '18px 8px',
                borderRadius: 16,
                background: 'rgba(28,28,30,0.92)',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                transition: 'transform 0.1s, opacity 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.8' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
              onMouseDown={e  => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.94)' }}
              onMouseUp={e    => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
            >
              {card.icon}
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.92)', letterSpacing: '0.01em' }}>
                {card.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Séparateur */}
      <div style={{ height: 1, background: 'var(--ai-border)', margin: '0 14px 8px' }} />

      {/* ── Liste actions ── */}
      {PLUS_CATS.map((cat, ci) => (
        <div key={ci}>
          <div style={{
            padding: '4px 18px 6px',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
            textTransform: 'uppercase', color: 'var(--ai-dim)',
          }}>
            {cat.label}
          </div>
          {cat.items.map((item, ii) => (
            <button
              key={ii}
              onClick={() => {
                onClose()
                if (item.flow) onFlow(item.flow)
                else if (item.prompt) onPrepare(item.label, item.prompt)
              }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '9px 18px',
                border: 'none', background: 'transparent',
                cursor: 'pointer', textAlign: 'left',
                fontFamily: 'DM Sans,sans-serif', fontSize: 13,
                color: 'var(--ai-text)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ai-bg2)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              <span>{item.label}</span>
              {item.flow && (
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 9, background: 'rgba(91,111,255,0.12)', color: '#5b6fff', fontWeight: 700, letterSpacing: '0.04em' }}>
                  GUIDE
                </span>
              )}
            </button>
          ))}
          {ci < PLUS_CATS.length - 1 && (
            <div style={{ margin: '6px 18px', borderTop: '1px solid var(--ai-border)' }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// HISTORY SIDEBAR / DRAWER
// persistent=true  → colonne inline (desktop)
// persistent=false → overlay avec backdrop (mobile)
// ══════════════════════════════════════════════════════════════

function HistoryDrawer({
  convs,
  activeId,
  onSelect,
  onDelete,
  onNew,
  onClose,
  persistent = false,
}: {
  convs: AIConv[]
  activeId: string | null
  onSelect: (c: AIConv) => void
  onDelete: (id: string) => void
  onNew: () => void
  onClose: () => void
  persistent?: boolean
}) {
  const [menuId, setMenuId] = useState<string | null>(null)
  const [renId,  setRenId]  = useState<string | null>(null)
  const [renVal, setRenVal] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuId) return
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuId(null)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menuId])

  // ── Contenu partagé (header + liste + settings) ─────────────

  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '12px 10px 8px',
        borderBottom: '1px solid var(--ai-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai-dim)', fontFamily: 'Syne,sans-serif', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Conversations
        </span>
        <button
          onClick={onNew}
          title="Nouvelle conversation"
          style={{
            width: 24, height: 24, borderRadius: 6, border: 'none',
            background: 'linear-gradient(135deg,#00c8e0,#5b6fff)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(91,111,255,0.3)',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {/* Conversation list */}
      <div className="aip-hist-list" style={{ flex: 1, overflowY: 'auto', padding: '4px 6px' }}>
        {convs.length === 0 ? (
          <div style={{ padding: '18px 8px', textAlign: 'center', color: 'var(--ai-dim)', fontSize: 11, lineHeight: 1.6 }}>
            Aucune conversation.<br />Pose une question pour commencer.
          </div>
        ) : convs.map(conv => (
          <div key={conv.id} className="aip-hist-item" style={{ position: 'relative', marginBottom: 1 }}>
            {renId === conv.id ? (
              <div style={{ padding: '3px 4px' }}>
                <input
                  autoFocus
                  value={renVal}
                  onChange={e => setRenVal(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (renVal.trim()) onSelect({ ...conv, title: renVal.trim() })
                      setRenId(null)
                    }
                    if (e.key === 'Escape') setRenId(null)
                  }}
                  onBlur={() => setRenId(null)}
                  style={{
                    width: '100%', padding: '5px 7px', borderRadius: 6,
                    border: '1px solid rgba(91,111,255,0.5)',
                    background: 'var(--ai-bg)', color: 'var(--ai-text)',
                    fontFamily: 'DM Sans, sans-serif', fontSize: 11,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            ) : (
              <div
                onClick={() => { onSelect(conv); if (!persistent) onClose() }}
                style={{
                  padding: '6px 4px 6px 8px', borderRadius: 6, cursor: 'pointer',
                  background: conv.id === activeId ? 'rgba(91,111,255,0.11)' : 'transparent',
                  border: `1px solid ${conv.id === activeId ? 'rgba(91,111,255,0.25)' : 'transparent'}`,
                  display: 'flex', alignItems: 'center', gap: 3,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (conv.id !== activeId) (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.04)' }}
                onMouseLeave={e => { if (conv.id !== activeId) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 11, fontWeight: conv.id === activeId ? 600 : 400,
                    color: conv.id === activeId ? 'var(--ai-text)' : 'var(--ai-mid)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    lineHeight: 1.3,
                  }}>
                    {conv.title}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--ai-dim)', marginTop: 1 }}>
                    {fmtDate(conv.updatedAt)}
                  </div>
                </div>

                {/* ⋯ */}
                <div
                  ref={menuId === conv.id ? menuRef : undefined}
                  style={{ position: 'relative', flexShrink: 0 }}
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => setMenuId(menuId === conv.id ? null : conv.id)}
                    className="aip-hist-dots"
                    style={{
                      width: 20, height: 20, borderRadius: 4,
                      border: 'none', background: 'transparent',
                      cursor: 'pointer', color: 'var(--ai-dim)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0, transition: 'opacity 0.1s',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="5" cy="12" r="2.2" /><circle cx="12" cy="12" r="2.2" /><circle cx="19" cy="12" r="2.2" />
                    </svg>
                  </button>
                  {menuId === conv.id && (
                    <div style={{
                      position: 'absolute', right: 0, top: '100%', zIndex: 60,
                      background: 'var(--ai-bg)', border: '1px solid var(--ai-border)',
                      borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.16)',
                      overflow: 'hidden', minWidth: 120,
                    }}>
                      <button onClick={() => { setRenId(conv.id); setRenVal(conv.title); setMenuId(null) }}
                        style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ai-mid)', fontFamily: 'DM Sans,sans-serif', fontSize: 12, textAlign: 'left' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ai-bg2)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                      >Renommer</button>
                      <button onClick={() => { onDelete(conv.id); setMenuId(null) }}
                        style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444', fontFamily: 'DM Sans,sans-serif', fontSize: 12, textAlign: 'left' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                      >Supprimer</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Settings ── */}
      <div style={{ borderTop: '1px solid var(--ai-border)', padding: '7px 6px 8px', flexShrink: 0 }}>
        <a
          href="/profile"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 9px', borderRadius: 7,
            color: 'var(--ai-mid)', textDecoration: 'none',
            fontFamily: 'DM Sans,sans-serif', fontSize: 11,
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(0,0,0,0.04)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          <span>Réglages IA</span>
        </a>
      </div>
    </div>
  )

  // ── Mode persistant (desktop) — colonne inline ──────────────
  if (persistent) {
    return (
      <div style={{
        width: 190, flexShrink: 0,
        borderRight: '1px solid var(--ai-border)',
        background: 'var(--ai-bg2)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {sidebarContent}
      </div>
    )
  }

  // ── Mode overlay (mobile) ────────────────────────────────────
  return (
    <>
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 25 }}
        onClick={onClose}
      />
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0,
        width: 260, background: 'var(--ai-bg)',
        borderRight: '1px solid var(--ai-border)',
        zIndex: 26, display: 'flex', flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(0,0,0,0.16)',
      }}>
        {sidebarContent}
      </div>
    </>
  )
}

// ══════════════════════════════════════════════════════════════
// QUICK ACTIONS — 5 actions principales
// ══════════════════════════════════════════════════════════════

interface QuickAction {
  label: string
  sub: string
  prompt?: string
  flow?: FlowId
  model: THWModel   // modèle recommandé pour cette action
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Analyser la semaine d\'entraînement',
    sub: 'Charge, intensités, équilibre et recommandations',
    model: 'athena',
    prompt: 'Analyse ma semaine d\'entraînement actuelle. Évalue la répartition des charges, les intensités, l\'équilibre entre les disciplines et la progression globale. Donne des recommandations concrètes et actionnables pour la semaine suivante.',
  },
  {
    label: 'Créer un plan d\'entraînement',
    sub: 'Plan structuré adapté à tes objectifs',
    model: 'zeus',
    prompt: 'Crée un plan d\'entraînement structuré adapté à mes objectifs et mon niveau actuel. Tiens compte de mes courses planifiées, ma charge hebdomadaire disponible et mon état de forme. Détaille les grandes phases et la logique de progression.',
  },
  {
    label: 'Identifier mes points faibles',
    sub: 'Analyse multi-sports de tes lacunes',
    model: 'athena',
    flow: 'weakpoints',
  },
  {
    label: 'Analyser ma récupération globale',
    sub: 'Readiness, HRV, sommeil et conseils du jour',
    model: 'hermes',
    prompt: 'Analyse mon état de récupération global. Interprète mes données disponibles (readiness, HRV, sommeil, fatigue subjective) et dis-moi concrètement si je peux m\'entraîner intensément aujourd\'hui, à quelle intensité, et ce que je dois surveiller.',
  },
  {
    label: 'Créer un plan nutritionnel',
    sub: 'Plan personnalisé selon ton profil et tes sports',
    model: 'athena',
    flow: 'nutrition',
  },
]

// ══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════

export default function AIPanel({
  open,
  onClose,
  context,
  prefillMessage,
  initialFlow,
  initialUserLabel,
  initialAssistantMsg,
}: Props) {

  // ── State ──────────────────────────────────────────────────
  const [convs,       setConvs]       = useState<AIConv[]>([])
  const [activeId,    setActiveId]    = useState<string | null>(null)
  const [input,       setInput]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [mounted,     setMounted]     = useState(false)
  const [fullscr,     setFullscr]     = useState(false)
  const [histOpen,    setHistOpen]    = useState(false)
  const [plusOpen,    setPlusOpen]    = useState(false)
  const [activeFlow,  setActiveFlow]  = useState<FlowId>(null)
  const [activeQA,    setActiveQA]    = useState<ActiveQuickAction | null>(null)
  const [isDesktop,   setIsDesktop]   = useState(false)
  const [model,       setModel]       = useState<THWModel>('athena')
  const [selPopup,    setSelPopup]    = useState<{ text: string; x: number; y: number } | null>(null)
  const [attachment,  setAttachment]  = useState<AttachedFile | null>(null)
  const [attachErr,   setAttachErr]   = useState<string | null>(null)

  const areaRef    = useRef<HTMLTextAreaElement>(null)
  const endRef     = useRef<HTMLDivElement>(null)
  const initMsgRef = useRef<string | undefined>(undefined)
  // Swipe tracking (mobile)
  const swipeRef   = useRef<{ x: number; y: number; t: number } | null>(null)
  // Selection popup ref (pour détecter clic extérieur)
  const selPopupRef = useRef<HTMLDivElement>(null)
  // File inputs for attachment
  const cameraRef  = useRef<HTMLInputElement>(null)
  const photosRef  = useRef<HTMLInputElement>(null)
  const filesRef   = useRef<HTMLInputElement>(null)

  const active = convs.find(c => c.id === activeId) ?? null

  // ── Effects ────────────────────────────────────────────────

  useEffect(() => { setMounted(true); setConvs(loadConvs()) }, [])
  useEffect(() => { if (mounted) saveConvs(convs) }, [convs, mounted])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: loading ? 'instant' : 'smooth' }) }, [activeId, loading, convs])
  useEffect(() => { if (open) setTimeout(() => areaRef.current?.focus(), 260) }, [open])
  useEffect(() => { if (open && prefillMessage) setInput(prefillMessage) }, [open, prefillMessage])

  // Déclenche le flow initial si fourni (ex: depuis la page Nutrition)
  const initialFlowSetRef = useRef<boolean>(false)
  useEffect(() => {
    if (open && initialFlow && !initialFlowSetRef.current) {
      setActiveFlow(initialFlow)
      initialFlowSetRef.current = true
    }
    if (!open) initialFlowSetRef.current = false
  }, [open, initialFlow])

  // Détection desktop — sidebar persistante
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const update = (matches: boolean) => {
      setIsDesktop(matches)
      // Auto-ouvrir la sidebar sur desktop au premier montage
      if (matches) setHistOpen(true)
    }
    update(mq.matches)
    const handler = (e: MediaQueryListEvent) => update(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pré-remplir depuis initialAssistantMsg (ex: analyse profil)
  useEffect(() => {
    if (!open) { initMsgRef.current = undefined; return }
    if (!initialAssistantMsg || !mounted) return
    if (initMsgRef.current === initialAssistantMsg) return
    initMsgRef.current = initialAssistantMsg

    const label = (initialUserLabel ?? 'Analyse IA').slice(0, 60)
    const conv: AIConv = {
      id: genId(), title: label,
      createdAt: Date.now(), updatedAt: Date.now(),
      msgs: [
        { id: genId(), role: 'user',      content: label,               ts: Date.now() },
        { id: genId(), role: 'assistant', content: initialAssistantMsg, ts: Date.now() + 1 },
      ],
    }
    setConvs(prev => [conv, ...prev].slice(0, MAX_CONVS))
    setActiveId(conv.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialAssistantMsg, mounted])

  // Escape key
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (plusOpen)   { setPlusOpen(false) }
        else if (histOpen)  { setHistOpen(false) }
        else if (activeFlow) { setActiveFlow(null) }
        else if (activeQA)  { setActiveQA(null) }
        else if (fullscr)   { setFullscr(false) }
        else                { onClose() }
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose, plusOpen, histOpen, activeFlow, activeQA, fullscr])

  // Fermer la sélection popup au clic extérieur
  useEffect(() => {
    if (!selPopup) return
    const h = (e: MouseEvent) => {
      if (selPopupRef.current && selPopupRef.current.contains(e.target as Node)) return
      setSelPopup(null)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [selPopup])

  // ── Handlers ──────────────────────────────────────────────

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 130) + 'px'
  }
  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() }
  }

  const newConv = () => {
    setActiveId(null)
    setActiveFlow(null)
    setHistOpen(false)
    setTimeout(() => areaRef.current?.focus(), 80)
  }

  const selectConv = (c: AIConv) => {
    // Support rename via HistoryDrawer passing modified conv
    setConvs(prev => prev.map(x => x.id === c.id ? { ...x, title: c.title } : x))
    setActiveId(c.id)
    setActiveFlow(null)
  }

  const deleteConv = (id: string) => {
    setConvs(prev => prev.filter(c => c.id !== id))
    if (activeId === id) setActiveId(null)
  }

  // ── Swipe (mobile) ────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isDesktop) return
    const t = e.touches[0]
    swipeRef.current = { x: t.clientX, y: t.clientY, t: Date.now() }
  }, [isDesktop])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (isDesktop || !swipeRef.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - swipeRef.current.x
    const dy = t.clientY - swipeRef.current.y
    const dt = Date.now() - swipeRef.current.t
    swipeRef.current = null
    // Ignorer si vertical ou trop lent (>400ms) ou trop court (<50px)
    if (Math.abs(dy) > Math.abs(dx)) return
    if (dt > 400 || Math.abs(dx) < 50) return
    if (dx > 0 && !histOpen) setHistOpen(true)
    if (dx < 0 && histOpen)  setHistOpen(false)
  }, [isDesktop, histOpen])

  // Sélection de texte → popup "Demander à THW"
  const handleMsgMouseUp = useCallback(() => {
    const sel = window.getSelection()
    const txt = sel?.toString().trim() ?? ''
    if (txt.length < 5) { setSelPopup(null); return }
    try {
      const range = sel!.getRangeAt(0)
      const rect  = range.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) return
      setSelPopup({ text: txt, x: rect.left + rect.width / 2, y: rect.top })
    } catch { setSelPopup(null) }
  }, [])

  // Handler fichier sélectionné (caméra / photos / fichiers)
  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''   // reset pour permettre re-sélection
    setAttachErr(null)
    try {
      const attached = await fileToAttachment(file)
      setAttachment(attached)
      areaRef.current?.focus()
    } catch {
      setAttachErr('Impossible de lire ce fichier.')
      setTimeout(() => setAttachErr(null), 4000)
    }
  }, [])

  // SEND MESSAGE
  const send = useCallback(async (presetDisplay?: string, presetApi?: string) => {
    const txt = (presetDisplay ?? input).trim()
    const hasAttachment = !!attachment
    if (!txt && !hasAttachment && !activeQA || loading) return

    const displayText = txt || (activeQA ? activeQA.label : '') || (attachment ? `[${attachment.name}]` : '')
    if (!displayText && !hasAttachment) return

    setInput('')
    setAttachment(null)
    setActiveFlow(null)
    const qaForSend = activeQA   // capture before clearing
    setActiveQA(null)
    if (areaRef.current) { areaRef.current.style.height = 'auto'; areaRef.current.focus() }
    setLoading(true)

    let conv = active
    let isNew = false

    if (!conv) {
      conv = {
        id: genId(),
        title: displayText.slice(0, 46) + (displayText.length > 46 ? '…' : ''),
        createdAt: Date.now(), updatedAt: Date.now(), msgs: [],
      }
      isNew = true
    }

    const userMsg: AIMsg = { id: genId(), role: 'user', content: displayText, ts: Date.now() }
    const updated: AIConv = {
      ...conv,
      msgs: [...conv.msgs, userMsg],
      title: conv.msgs.length === 0 ? (displayText.slice(0, 46) + (displayText.length > 46 ? '…' : '')) : conv.title,
      updatedAt: Date.now(),
    }

    setConvs(prev => {
      const has  = prev.some(c => c.id === updated.id)
      const next = has ? prev.map(c => c.id === updated.id ? updated : c) : [updated, ...prev]
      return next.slice(0, MAX_CONVS)
    })
    if (isNew) setActiveId(updated.id)

    const cid      = updated.id
    const snapshot = model   // capture le modèle au moment du send

    // Construire le contenu du dernier message utilisateur
    // Les messages précédents restent en texte ; le dernier peut avoir un bloc image/doc
    type MsgForApi = { role: string; content: string | { type: string; [k: string]: unknown }[] }
    const apiMsgs: MsgForApi[] = updated.msgs.slice(0, -1).map(m => ({ role: m.role, content: m.content }))

    // Build the API content (enriched with QA context if active)
    const apiContentText: string = (() => {
      if (presetApi) return presetApi  // flow already built full prompt
      if (qaForSend) {
        // Prepend action context to user's message
        return txt
          ? `${qaForSend.apiPrompt}\n\nContexte ajouté par l'utilisateur : "${txt}"`
          : qaForSend.apiPrompt
      }
      return displayText
    })()

    if (hasAttachment && attachment) {
      const blocks: { type: string; [k: string]: unknown }[] = []
      if (attachment.isImage) {
        blocks.push({ type: 'image', mediaType: attachment.mediaType, data: attachment.data })
      } else {
        blocks.push({ type: 'document', mediaType: attachment.mediaType, data: attachment.data, name: attachment.name })
      }
      if (apiContentText) blocks.push({ type: 'text', text: apiContentText })
      apiMsgs.push({ role: 'user', content: blocks })
    } else {
      apiMsgs.push({ role: 'user', content: apiContentText })
    }

    try {
      const res = await fetch('/api/coach-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'central',
          modelId: snapshot,
          messages: apiMsgs,
          context: context ?? {},
        }),
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const aiMsgId = genId()
      setConvs(prev => prev.map(c =>
        c.id === cid
          ? { ...c, msgs: [...c.msgs, { id: aiMsgId, role: 'assistant' as const, content: '', ts: Date.now(), modelId: snapshot }], updatedAt: Date.now() }
          : c
      ))

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        const text = accumulated
        setConvs(prev => prev.map(c =>
          c.id === cid
            ? { ...c, msgs: c.msgs.map(m => m.id === aiMsgId ? { ...m, content: text } : m), updatedAt: Date.now() }
            : c
        ))
      }
    } catch {
      const err: AIMsg = { id: genId(), role: 'assistant', content: 'Erreur réseau. Réessaie.', ts: Date.now() }
      setConvs(prev => prev.map(c =>
        c.id === cid ? { ...c, msgs: [...c.msgs, err], updatedAt: Date.now() } : c
      ))
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, loading, active, context, model, activeQA])

  // SSR guard
  if (!mounted) return null

  const showEmpty = !active || active.msgs.length === 0

  return createPortal(
    <>
      {/* ── CSS global ─────────────────────────────────────── */}
      <style>{`
        @keyframes ai_dot {
          0%,80%,100% { opacity:.2; transform:translateY(0); }
          40% { opacity:1; transform:translateY(-3px); }
        }
        @keyframes ai_slidein {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0); }
        }

        /* CSS variables */
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

        /* Panneau */
        .aip-root {
          position: fixed;
          top: 0; right: 0; bottom: 0;
          width: 640px; max-width: 100vw;
          z-index: 1200;
          background: var(--ai-bg);
          border-left: 1px solid var(--ai-border);
          display: flex; flex-direction: column; overflow: hidden;
          box-shadow: -16px 0 48px rgba(0,0,0,0.18);
          transition: transform 0.3s cubic-bezier(0.32,1.06,0.64,1);
          color: var(--ai-text);
          padding-top: env(safe-area-inset-top, 0px);
        }
        .aip-root.closed { transform: translateX(100%); box-shadow: none; }
        .aip-root.fullscreen { width: 100vw !important; left: 0; border-left: none; }

        /* Mobile */
        @media (max-width: 767px) {
          .aip-root {
            width: 100% !important; left: 0; border-left: none;
            height: 100dvh; top: 0; bottom: auto; box-shadow: none;
          }
        }

        /* Body : flex-row pour sidebar + chat sur desktop */
        .aip-body {
          display: flex; flex-direction: row;
          flex: 1; min-height: 0; overflow: hidden; position: relative;
        }

        /* Chat column */
        .aip-chat-col {
          flex: 1; display: flex; flex-direction: column;
          min-width: 0; min-height: 0; overflow: hidden;
        }

        /* History list scroll */
        .aip-hist-list::-webkit-scrollbar { width: 3px; }
        .aip-hist-list::-webkit-scrollbar-thumb { background: var(--ai-border); border-radius: 2px; }

        /* Textarea font — 16px min pour éviter zoom Safari */
        .aip-textarea { font-size: 16px !important; }
        @media (min-width: 768px) { .aip-textarea { font-size: 14px !important; } }

        /* Focus : bordure du conteneur input */
        .aip-input-wrap:focus-within {
          border-color: rgba(0,0,0,0.18) !important;
        }
        html.dark .aip-input-wrap:focus-within {
          border-color: rgba(255,255,255,0.18) !important;
        }

        /* Messages scroll */
        .aip-messages {
          flex: 1; overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
        .aip-messages::-webkit-scrollbar { width: 3px; }
        .aip-messages::-webkit-scrollbar-thumb { background: var(--ai-border); border-radius: 2px; }

        /* Hover dots in history */
        .aip-hist-item:hover .aip-hist-dots { opacity: 1 !important; }

        /* Plus menu scroll */
        .aip-plus-scroll::-webkit-scrollbar { width: 3px; }
        .aip-plus-scroll::-webkit-scrollbar-thumb { background: var(--ai-border); border-radius: 2px; }

        /* ── Model Effigy Animations ─────────────────────────── */

        /* Hermès : oscillation rapide et légère */
        @keyframes hermes_effigy_on {
          0%,100% { transform: translateY(0) rotate(-3deg); opacity: 1; }
          50% { transform: translateY(-2px) rotate(3deg); opacity: 0.9; }
        }
        @keyframes hermes_effigy_off {
          0%,100% { opacity: 0.65; }
          50% { opacity: 0.95; }
        }

        /* Athéna : respiration stable et maîtrisée */
        @keyframes athena_effigy_on {
          0%,100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.07); opacity: 1; }
        }
        @keyframes athena_effigy_off {
          0%,100% { opacity: 0.65; transform: scale(1); }
          50% { opacity: 0.95; transform: scale(1.03); }
        }

        /* Zeus : pulsation puissante */
        @keyframes zeus_effigy_on {
          0%,100% { transform: scale(1); opacity: 0.8; }
          40%,60% { transform: scale(1.12); opacity: 1; }
        }
        @keyframes zeus_effigy_off {
          0%,70%,100% { opacity: 0.6; }
          35% { opacity: 1; }
        }

        /* Model picker pill hover */
        .aip-model-pill:hover { background: var(--pill-hover) !important; }
      `}</style>

      {/* ══ PANNEAU ═══════════════════════════════════════════ */}
      <div className={`aip-root${open ? '' : ' closed'}${fullscr ? ' fullscreen' : ''}`}>

        {/* ══ HEADER ════════════════════════════════════════ */}
        <div style={{
          height: 50, padding: '0 12px',
          borderBottom: '1px solid var(--ai-border)',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0, background: 'var(--ai-bg)',
        }}>
          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="THW" style={{ height: 24, width: 'auto', objectFit: 'contain', flexShrink: 0 }} />

          {/* Title */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 13, color: 'var(--ai-text)', lineHeight: 1.2 }}>
              THW Coach
            </div>
            {active && (
              <div style={{ fontSize: 10, color: 'var(--ai-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                {active.title}
              </div>
            )}
          </div>

          {/* History button */}
          <button
            onClick={() => setHistOpen(h => !h)}
            title="Conversations"
            style={{
              width: 30, height: 30, borderRadius: 8,
              border: `1px solid ${histOpen ? 'rgba(91,111,255,0.4)' : 'var(--ai-border)'}`,
              background: histOpen ? 'rgba(91,111,255,0.1)' : 'transparent',
              cursor: 'pointer', color: histOpen ? '#5b6fff' : 'var(--ai-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, position: 'relative',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            {convs.length > 0 && (
              <div style={{
                position: 'absolute', top: 3, right: 3,
                width: 6, height: 6, borderRadius: '50%',
                background: '#5b6fff',
              }} />
            )}
          </button>

          {/* New conv */}
          <button
            onClick={newConv}
            title="Nouvelle conversation"
            style={{
              width: 30, height: 30, borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg,#00c8e0,#5b6fff)',
              cursor: 'pointer', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, boxShadow: '0 2px 8px rgba(91,111,255,0.3)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>

          {/* Fullscreen */}
          <button
            onClick={() => setFullscr(f => !f)}
            title={fullscr ? 'Réduire' : 'Plein écran'}
            style={{
              width: 30, height: 30, borderRadius: 8,
              border: '1px solid var(--ai-border)', background: 'transparent',
              cursor: 'pointer', color: 'var(--ai-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            {fullscr ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            )}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8,
              border: '1px solid var(--ai-border)', background: 'transparent',
              cursor: 'pointer', color: 'var(--ai-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ══ BODY — flex-row : sidebar | chat ══════════════ */}
        <div className="aip-body">

          {/* ── Sidebar desktop (persistante, toujours visible) ── */}
          {isDesktop && (
            <HistoryDrawer
              persistent
              convs={convs}
              activeId={activeId}
              onSelect={selectConv}
              onDelete={deleteConv}
              onNew={newConv}
              onClose={() => setHistOpen(false)}
            />
          )}

          {/* ── Sidebar mobile (overlay) ── */}
          {!isDesktop && histOpen && (
            <HistoryDrawer
              convs={convs}
              activeId={activeId}
              onSelect={selectConv}
              onDelete={deleteConv}
              onNew={newConv}
              onClose={() => setHistOpen(false)}
            />
          )}

          {/* ── Chat column ── */}
          <div
            className="aip-chat-col"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >

          {/* ── MESSAGES ───────────────────────────────────── */}
          <div className="aip-messages" style={{ padding: '16px 16px 0' }} onMouseUp={handleMsgMouseUp}>

            {/* ── Empty state ── */}
            {showEmpty && !activeFlow && (
              <div style={{ animation: 'ai_slidein 0.25s ease' }}>
                <p style={{
                  textAlign: 'center', margin: '16px 0 6px',
                  fontSize: 16, fontWeight: 700, color: 'var(--ai-text)',
                  fontFamily: 'Syne,sans-serif', lineHeight: 1.3,
                }}>
                  Bonjour, bon {getGreeting()} !
                </p>
                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--ai-dim)', margin: '0 0 22px' }}>
                  Comment puis-je t'aider ?
                </p>

                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
                  textTransform: 'uppercase', color: 'var(--ai-dim)',
                  marginBottom: 9,
                }}>
                  Actions rapides
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                  {QUICK_ACTIONS.map((qa, i) => {
                    const mcfg = MODEL_CONFIGS[qa.model]
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          setModel(qa.model)
                          if (qa.flow) {
                            setActiveFlow(qa.flow)
                            setActiveQA(null)
                          } else if (qa.prompt) {
                            // NEW: set intermediate state, never send directly
                            setActiveQA({ label: qa.label, apiPrompt: qa.prompt, model: qa.model })
                            setActiveFlow(null)
                            setTimeout(() => areaRef.current?.focus(), 60)
                          }
                        }}
                        disabled={loading}
                        style={{
                          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                          gap: 10, padding: '11px 14px', borderRadius: 10,
                          border: '1px solid var(--ai-border)',
                          background: 'var(--ai-bg2)',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          textAlign: 'left', width: '100%',
                          opacity: loading ? 0.5 : 1,
                          transition: 'border-color 0.12s, background 0.12s',
                        }}
                        onMouseEnter={e => { if (!loading) {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = mcfg.color + '50'
                          ;(e.currentTarget as HTMLButtonElement).style.background = mcfg.colorBg
                        }}}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--ai-border)'
                          ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--ai-bg2)'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ai-text)', lineHeight: 1.3, marginBottom: 2 }}>
                            {qa.label}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--ai-dim)', lineHeight: 1.3 }}>
                            {qa.sub}
                          </div>
                          {/* Modèle recommandé */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
                            <ModelEffigy model={qa.model} isAnimating={false} size={10} />
                            <span style={{ fontSize: 10, color: mcfg.color, fontFamily: 'DM Sans,sans-serif', opacity: 0.8 }}>
                              {mcfg.name}
                            </span>
                          </div>
                        </div>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--ai-dim)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 3 }}>
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </button>
                    )
                  })}
                </div>

                <p style={{ textAlign: 'center', color: 'var(--ai-dim)', fontSize: 11, paddingBottom: 14, margin: 0 }}>
                  ou utilise + pour explorer toutes les options
                </p>
              </div>
            )}

            {/* ── Flow UI (replace empty state) ── */}
            {showEmpty && activeFlow && (
              <div style={{ animation: 'ai_slidein 0.2s ease', paddingBottom: 16 }}>
                {activeFlow === 'weakpoints' && (
                  <WeakpointsFlow
                    onPrepare={(apiPrompt, label) => { setActiveFlow(null); setActiveQA({ label, apiPrompt, model }); setTimeout(() => areaRef.current?.focus(), 60) }}
                    onCancel={() => setActiveFlow(null)}
                  />
                )}
                {activeFlow === 'nutrition' && (
                  <NutritionFlow
                    onPrepare={(apiPrompt, label) => { setActiveFlow(null); setActiveQA({ label, apiPrompt, model }); setTimeout(() => areaRef.current?.focus(), 60) }}
                    onCancel={() => setActiveFlow(null)}
                  />
                )}
                {activeFlow === 'analyzetest' && (
                  <AnalyzeTestFlow
                    onPrepare={(apiPrompt, label) => { setActiveFlow(null); setActiveQA({ label, apiPrompt, model }); setTimeout(() => areaRef.current?.focus(), 60) }}
                    onCancel={() => setActiveFlow(null)}
                  />
                )}
                {activeFlow === 'recharge' && (
                  <RechargeFlow
                    onPrepare={(apiPrompt, label) => { setActiveFlow(null); setActiveQA({ label, apiPrompt, model }); setTimeout(() => areaRef.current?.focus(), 60) }}
                    onCancel={() => setActiveFlow(null)}
                  />
                )}
                {activeFlow === 'sessionbuilder' && (
                  <SessionBuilderFlow onCancel={() => setActiveFlow(null)} />
                )}
              </div>
            )}

            {/* ── Messages ── */}
            {active && active.msgs.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 16 }}>
                {active.msgs.map((msg, idx) => (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

                    {/* Message row */}
                    <div style={{
                      display: 'flex',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      alignItems: 'flex-start', gap: 10,
                    }}>
                      {/* Avatar IA — neutre */}
                      {msg.role === 'assistant' && (() => {
                        const m = msg.modelId ?? 'athena'
                        const isStreaming = loading && idx === active.msgs.length - 1
                        return (
                          <div style={{
                            width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                            background: 'var(--ai-bg2)',
                            border: '1px solid var(--ai-border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginTop: 2,
                          }}>
                            <ModelEffigy model={m} isAnimating={isStreaming} size={15} color="var(--ai-mid)" />
                          </div>
                        )
                      })()}

                      {/* Bulle user / texte IA libre */}
                      {msg.role === 'user' ? (
                        <div style={{
                          maxWidth: '78%',
                          padding: '9px 14px',
                          borderRadius: '14px 14px 4px 14px',
                          background: 'linear-gradient(135deg,#00c8e0,#5b6fff)',
                          color: '#fff',
                        }}>
                          <span style={{ fontSize: 13.5, lineHeight: 1.55, display: 'block' }}>{msg.content}</span>
                        </div>
                      ) : (
                        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                          <MsgContent text={msg.content} />
                        </div>
                      )}
                    </div>
                    {/* Session card */}
                    {msg.role === 'assistant' && (
                      <SessionCard
                        text={msg.content}
                        isStreaming={loading && idx === active.msgs.length - 1}
                      />
                    )}
                  </div>
                ))}

                {/* Typing indicator */}
                {loading && active?.msgs[active.msgs.length - 1]?.role === 'user' && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                      background: 'var(--ai-bg2)',
                      border: '1px solid var(--ai-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <ModelEffigy model={model} isAnimating={true} size={15} color="var(--ai-mid)" />
                    </div>
                    <div style={{
                      padding: '10px 14px', borderRadius: '14px 14px 14px 4px',
                      background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)',
                    }}>
                      <Dots />
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>
            )}
          </div>

          {/* ══ INPUT ═════════════════════════════════════════ */}
          <div style={{
            padding: '8px 12px 12px',
            borderTop: '1px solid var(--ai-border)',
            flexShrink: 0, background: 'var(--ai-bg)',
            position: 'relative',
          }}>
            {/* Plus menu */}
            {plusOpen && (
              <PlusMenu
                onPrepare={(label, p) => { setPlusOpen(false); setActiveFlow(null); setActiveQA({ label, apiPrompt: p, model }); setTimeout(() => areaRef.current?.focus(), 60) }}
                onFlow={f => { setPlusOpen(false); setActiveQA(null); setActiveFlow(f) }}
                onClose={() => setPlusOpen(false)}
                onCamera={() => cameraRef.current?.click()}
                onPhotos={() => photosRef.current?.click()}
                onFiles={() => filesRef.current?.click()}
              />
            )}

            {/* Hidden file inputs */}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileSelected} />
            <input ref={photosRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelected} />
            <input ref={filesRef}  type="file" accept=".pdf,image/*,.doc,.docx,.txt" style={{ display: 'none' }} onChange={handleFileSelected} />

            {/* ── Conteneur principal de saisie ── */}
            <div className="aip-input-wrap" style={{
              background: 'var(--ai-bg2)',
              border: '1px solid var(--ai-border)',
              borderRadius: 18,
              transition: 'border-color 0.15s',
            }}>

              {/* Attachment preview */}
              {attachment && (
                <div style={{ padding: '8px 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {attachment.isImage && attachment.preview
                    ? <img src={attachment.preview} alt={attachment.name} style={{ height: 56, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--ai-border)' }} />
                    : (
                      <div style={{ padding: '6px 12px', borderRadius: 10, background: 'var(--ai-bg)', border: '1px solid var(--ai-border)', fontSize: 12, color: 'var(--ai-text)', display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span>📄</span><span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachment.name}</span>
                      </div>
                    )
                  }
                  <button
                    onClick={() => setAttachment(null)}
                    style={{ width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'var(--ai-mid)', color: 'var(--ai-bg)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  >×</button>
                </div>
              )}

              {/* Attachment error */}
              {attachErr && (
                <p style={{ fontSize: 11, color: '#ef4444', margin: '4px 12px 0', padding: 0 }}>{attachErr}</p>
              )}

              {/* Active Quick Action chip */}
              {activeQA && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px',
                  background: 'rgba(0,200,224,0.07)',
                  borderBottom: '1px solid rgba(0,200,224,0.15)',
                }}>
                  {/* Lightning icon */}
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="#00c8e0" stroke="none">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                  <span style={{
                    flex: 1, fontSize: 11, fontWeight: 600, color: '#00c8e0',
                    fontFamily: 'DM Sans, sans-serif',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {activeQA.label}
                  </span>
                  <button
                    onClick={() => setActiveQA(null)}
                    title="Annuler"
                    style={{
                      width: 18, height: 18, borderRadius: '50%', border: 'none',
                      background: 'rgba(0,200,224,0.15)', color: '#00c8e0',
                      cursor: 'pointer', fontSize: 13, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >×</button>
                </div>
              )}

              {/* Textarea */}
              <textarea
                ref={areaRef}
                className="aip-textarea"
                value={input}
                onChange={handleInput}
                onKeyDown={handleKey}
                placeholder={activeQA
                  ? 'Ajoute ta question ou du contexte pour préciser ta demande…'
                  : 'Pose ta question…'}
                rows={1}
                style={{
                  display: 'block', width: '100%',
                  background: 'transparent',
                  border: 'none', outline: 'none', resize: 'none',
                  fontFamily: 'DM Sans, sans-serif',
                  lineHeight: 1.55, color: 'var(--ai-text)',
                  padding: '14px 16px 6px',
                  minHeight: 26, maxHeight: 130,
                  overflowY: 'auto',
                  boxSizing: 'border-box',
                }}
              />

              {/* Ligne basse : + · modèle · [spacer] · envoyer */}
              <div style={{
                display: 'flex', alignItems: 'center',
                padding: '4px 8px 8px', gap: 5,
              }}>
                {/* + button */}
                <button
                  onClick={() => setPlusOpen(p => !p)}
                  title="Actions"
                  style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    border: `1px solid ${plusOpen ? 'var(--ai-mid)' : 'var(--ai-border)'}`,
                    background: plusOpen ? 'var(--ai-bg)' : 'transparent',
                    cursor: 'pointer', color: 'var(--ai-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.12s',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>

                {/* Sélecteur modèle */}
                <ModelPicker model={model} onChange={setModel} />

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Envoyer */}
                <button
                  onClick={() => void send()}
                  disabled={(!input.trim() && !attachment && !activeQA) || loading}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    border: 'none',
                    background: (input.trim() || attachment || activeQA) && !loading ? 'var(--ai-text)' : 'var(--ai-border)',
                    cursor: (input.trim() || attachment || activeQA) && !loading ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke={(input.trim() || attachment || activeQA) && !loading ? 'var(--ai-bg)' : 'var(--ai-dim)'}
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>
            </div>

            <div style={{ fontSize: 10, color: 'var(--ai-dim)', marginTop: 5, textAlign: 'center' }}>
              Entrée · Shift+Entrée pour nouvelle ligne
            </div>
          </div>
          {/* /chat-col */}
          </div>
        {/* /body */}
        </div>
      </div>

      {/* ── Popup sélection de texte ──────────────────────── */}
      {selPopup && (
        <div
          ref={selPopupRef}
          style={{
            position: 'fixed',
            left: selPopup.x,
            top: selPopup.y - 52,
            transform: 'translateX(-50%)',
            zIndex: 9998,
            pointerEvents: 'auto',
            animation: 'ai_slidein 0.12s ease',
          }}
        >
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => {
              const excerpt = selPopup.text.length > 250
                ? selPopup.text.slice(0, 250) + '…'
                : selPopup.text
              setInput(`Approfondis ce point : "${excerpt}"`)
              setSelPopup(null)
              window.getSelection()?.removeAllRanges()
              setTimeout(() => areaRef.current?.focus(), 80)
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 14px 7px 12px',
              borderRadius: 20,
              background: 'var(--ai-text)',
              color: 'var(--ai-bg)',
              border: 'none',
              fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'DM Sans,sans-serif',
              boxShadow: '0 4px 22px rgba(0,0,0,0.22)',
              whiteSpace: 'nowrap',
              transition: 'opacity 0.12s',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            Demander à THW
          </button>
        </div>
      )}
    </>,
    document.body
  )
}
