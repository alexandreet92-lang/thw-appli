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

interface AIMsg {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: number
}
interface AIConv {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  msgs: AIMsg[]
}

type FlowId = 'weakpoints' | 'nutrition' | 'recharge' | null

interface Props {
  open: boolean
  onClose: () => void
  initialAgent?: string              // gardé pour compat — non affiché
  context?: Record<string, unknown>
  prefillMessage?: string
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

function MsgContent({ text }: { text: string }) {
  const blocks: React.ReactNode[] = []
  const lines = text.split('\n')
  let i = 0

  while (i < lines.length) {
    const raw = lines[i]
    const line = raw.trimEnd()

    if (!line.trim()) { blocks.push(<div key={i} style={{ height: 7 }} />); i++; continue }
    if (/^[-=]{3,}$/.test(line.trim())) { i++; continue }

    const hMatch = line.match(/^(#{1,4})\s+(.+)/)
    if (hMatch) {
      const lvl = hMatch[1].length
      blocks.push(
        <div key={i} style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 700,
          fontSize: lvl <= 2 ? 14 : 12,
          color: 'inherit',
          marginTop: lvl <= 2 ? 14 : 10, marginBottom: 5,
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
// FLOW COMPONENTS — Actions interactives pré-envoi
// ══════════════════════════════════════════════════════════════

// ── WeakpointsFlow ─────────────────────────────────────────────

const WP_SPORTS = ['Cyclisme', 'Running', 'Natation', 'Hyrox', 'Musculation', 'Aviron', 'Trail']

function WeakpointsFlow({ onSend, onCancel }: { onSend: (prompt: string) => void; onCancel: () => void }) {
  const [selected, setSelected] = useState<string[]>([])

  function toggle(s: string) {
    setSelected(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  function submit() {
    if (selected.length === 0) return
    const sports = selected.join(', ')
    onSend(
      `Analyse mes points faibles dans les sports suivants : ${sports}. ` +
      `Pour chaque discipline, identifie les lacunes spécifiques (technique, endurance, puissance, récupération, etc.) ` +
      `en te basant sur mes données réelles disponibles dans l'application. ` +
      `Propose ensuite des axes de travail concrets et priorisés pour progresser.`
    )
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

function NutritionFlow({ onSend, onCancel }: { onSend: (prompt: string) => void; onCancel: () => void }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<string[][]>(Array(NUTRITION_STEPS.length).fill([]))

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
      // Build comprehensive prompt
      const parts = NUTRITION_STEPS.map((s, i) => `${s.question} → ${answers[i].join(', ') || 'Non précisé'}`)
      onSend(
        `Crée un plan nutritionnel personnalisé basé sur mes réponses :\n${parts.join('\n')}\n\n` +
        `Appuie-toi sur mes données réelles disponibles dans l'application (activités, poids, objectifs). ` +
        `Sois précis et pratique.`
      )
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

function RechargeFlow({ onSend, onCancel }: { onSend: (prompt: string) => void; onCancel: () => void }) {
  const [type,     setType]     = useState<'competition' | 'training' | null>(null)
  const [intensity, setIntensity] = useState('')
  const [date,     setDate]     = useState('')

  function submit() {
    if (!type) return
    if (type === 'competition') {
      onSend(
        `Crée-moi un plan de recharge glucidique pour une compétition${date ? ` le ${date}` : ''}.` +
        ` Indique les quantités précises de glucides jour par jour avant l'épreuve, les aliments recommandés, ` +
        `le timing des repas et les points de vigilance. Base-toi sur mes données d'entraînement et mon profil.`
      )
    } else {
      onSend(
        `Crée-moi un plan de recharge glucidique pour une session d'entraînement de haute intensité.` +
        `${intensity ? ` Intensité prévue : ${intensity}.` : ''}` +
        ` Explique comment charger avant, comment gérer l'apport pendant et la récupération après. ` +
        `Adapte les quantités à mon profil et mes données disponibles dans l'application.`
      )
    }
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
      { label: 'Créer une séance', prompt: 'Crée-moi une séance d\'entraînement adaptée à mon état de forme actuel et mes objectifs. Structure-la avec un échauffement, un corps de séance et un retour au calme, avec les durées et intensités précises.' },
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
      { label: 'Calculer mes zones', prompt: 'Explique-moi comment calculer et utiliser mes zones d\'entraînement (fréquence cardiaque, allure, puissance). Propose une méthode adaptée à mes sports pratiqués.' },
      { label: 'Préparer un test FTP', prompt: 'Comment préparer et réaliser un test FTP (cyclisme) ou un test de seuil (course à pied) ? Donne-moi le protocole complet et comment interpréter les résultats.' },
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
  onPrompt,
  onFlow,
  onClose,
}: {
  onPrompt: (p: string) => void
  onFlow: (f: FlowId) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  return (
    <div ref={ref} style={{
      position: 'absolute', bottom: '100%', left: 0, right: 0,
      background: 'var(--ai-bg)',
      border: '1px solid var(--ai-border)',
      borderRadius: '14px 14px 0 0',
      boxShadow: '0 -12px 40px rgba(0,0,0,0.18)',
      zIndex: 30,
      maxHeight: '70vh',
      overflowY: 'auto',
      padding: '6px 0 8px',
    }}>
      {/* Handle */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 10px' }}>
        <div style={{ width: 32, height: 3, borderRadius: 2, background: 'var(--ai-border)' }} />
      </div>

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
                else if (item.prompt) onPrompt(item.prompt)
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
// HISTORY DRAWER
// ══════════════════════════════════════════════════════════════

function HistoryDrawer({
  convs,
  activeId,
  onSelect,
  onDelete,
  onNew,
  onClose,
}: {
  convs: AIConv[]
  activeId: string | null
  onSelect: (c: AIConv) => void
  onDelete: (id: string) => void
  onNew: () => void
  onClose: () => void
}) {
  const [menuId, setMenuId] = useState<string | null>(null)
  const [renId,  setRenId]  = useState<string | null>(null)
  const [renVal, setRenVal] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    if (!menuId) return
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuId(null)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menuId])

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 25 }}
        onClick={onClose}
      />
      {/* Drawer */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0,
        width: 240, background: 'var(--ai-bg)',
        borderRight: '1px solid var(--ai-border)',
        zIndex: 26, display: 'flex', flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(0,0,0,0.16)',
      }}>
        <div style={{
          padding: '14px 12px 10px',
          borderBottom: '1px solid var(--ai-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ai-text)', fontFamily: 'Syne,sans-serif' }}>
            Conversations
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={onNew}
              title="Nouvelle conversation"
              style={{
                width: 26, height: 26, borderRadius: 7, border: 'none',
                background: 'linear-gradient(135deg,#00c8e0,#5b6fff)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(91,111,255,0.3)',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <button
              onClick={onClose}
              style={{
                width: 26, height: 26, borderRadius: 7,
                border: '1px solid var(--ai-border)', background: 'transparent',
                cursor: 'pointer', color: 'var(--ai-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
          {convs.length === 0 ? (
            <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--ai-dim)', fontSize: 11, lineHeight: 1.6 }}>
              Aucune conversation.<br />Pose une question pour commencer.
            </div>
          ) : convs.map(conv => (
            <div key={conv.id} style={{ position: 'relative', marginBottom: 1 }}>
              {renId === conv.id ? (
                <div style={{ padding: '3px 4px' }}>
                  <input
                    autoFocus
                    value={renVal}
                    onChange={e => setRenVal(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        if (renVal.trim()) {
                          // rename handled by parent via update
                          onSelect({ ...conv, title: renVal.trim() })
                        }
                        setRenId(null)
                      }
                      if (e.key === 'Escape') setRenId(null)
                    }}
                    onBlur={() => setRenId(null)}
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
                  onClick={() => { onSelect(conv); onClose() }}
                  style={{
                    padding: '7px 6px 7px 10px', borderRadius: 7, cursor: 'pointer',
                    background: conv.id === activeId ? 'rgba(91,111,255,0.11)' : 'transparent',
                    border: `1px solid ${conv.id === activeId ? 'rgba(91,111,255,0.25)' : 'transparent'}`,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                  onMouseEnter={e => { if (conv.id !== activeId) (e.currentTarget as HTMLDivElement).style.background = 'var(--ai-bg2)' }}
                  onMouseLeave={e => { if (conv.id !== activeId) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: conv.id === activeId ? 600 : 400,
                      color: conv.id === activeId ? 'var(--ai-text)' : 'var(--ai-mid)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {conv.title}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--ai-dim)', marginTop: 1 }}>
                      {fmtDate(conv.updatedAt)}
                    </div>
                  </div>

                  {/* ⋯ button */}
                  <div
                    ref={menuId === conv.id ? menuRef : undefined}
                    style={{ position: 'relative', flexShrink: 0 }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setMenuId(menuId === conv.id ? null : conv.id)}
                      style={{
                        width: 22, height: 22, borderRadius: 5,
                        border: 'none', background: 'transparent',
                        cursor: 'pointer', color: 'var(--ai-dim)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: 0, transition: 'opacity 0.1s',
                      }}
                      className="aip-hist-dots"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="5" cy="12" r="2.2" /><circle cx="12" cy="12" r="2.2" /><circle cx="19" cy="12" r="2.2" />
                      </svg>
                    </button>

                    {menuId === conv.id && (
                      <div style={{
                        position: 'absolute', right: 0, top: '100%', zIndex: 50,
                        background: 'var(--ai-bg)', border: '1px solid var(--ai-border)',
                        borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.16)',
                        overflow: 'hidden', minWidth: 130,
                      }}>
                        <button
                          onClick={() => { setRenId(conv.id); setRenVal(conv.title); setMenuId(null) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ai-mid)', fontFamily: 'DM Sans,sans-serif', fontSize: 12, textAlign: 'left' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ai-bg2)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                        >
                          Renommer
                        </button>
                        <button
                          onClick={() => { onDelete(conv.id); setMenuId(null) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444', fontFamily: 'DM Sans,sans-serif', fontSize: 12, textAlign: 'left' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
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
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Analyser la semaine d\'entraînement',
    sub: 'Charge, intensités, équilibre et recommandations',
    prompt: 'Analyse ma semaine d\'entraînement actuelle. Évalue la répartition des charges, les intensités, l\'équilibre entre les disciplines et la progression globale. Donne des recommandations concrètes et actionnables pour la semaine suivante.',
  },
  {
    label: 'Créer un plan d\'entraînement',
    sub: 'Plan structuré adapté à tes objectifs',
    prompt: 'Crée un plan d\'entraînement structuré adapté à mes objectifs et mon niveau actuel. Tiens compte de mes courses planifiées, ma charge hebdomadaire disponible et mon état de forme. Détaille les grandes phases et la logique de progression.',
  },
  {
    label: 'Identifier mes points faibles',
    sub: 'Analyse multi-sports de tes lacunes',
    flow: 'weakpoints',
  },
  {
    label: 'Analyser ma récupération globale',
    sub: 'Readiness, HRV, sommeil et conseils du jour',
    prompt: 'Analyse mon état de récupération global. Interprète mes données disponibles (readiness, HRV, sommeil, fatigue subjective) et dis-moi concrètement si je peux m\'entraîner intensément aujourd\'hui, à quelle intensité, et ce que je dois surveiller.',
  },
  {
    label: 'Créer un plan nutritionnel',
    sub: 'Plan personnalisé selon ton profil et tes sports',
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

  const areaRef    = useRef<HTMLTextAreaElement>(null)
  const endRef     = useRef<HTMLDivElement>(null)
  const initMsgRef = useRef<string | undefined>(undefined)

  const active = convs.find(c => c.id === activeId) ?? null

  // ── Effects ────────────────────────────────────────────────

  useEffect(() => { setMounted(true); setConvs(loadConvs()) }, [])
  useEffect(() => { if (mounted) saveConvs(convs) }, [convs, mounted])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: loading ? 'instant' : 'smooth' }) }, [activeId, loading, convs])
  useEffect(() => { if (open) setTimeout(() => areaRef.current?.focus(), 260) }, [open])
  useEffect(() => { if (open && prefillMessage) setInput(prefillMessage) }, [open, prefillMessage])

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
        else if (fullscr)   { setFullscr(false) }
        else                { onClose() }
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose, plusOpen, histOpen, activeFlow, fullscr])

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

  // SEND MESSAGE
  const send = useCallback(async (preset?: string) => {
    const txt = (preset ?? input).trim()
    if (!txt || loading) return

    setInput('')
    setActiveFlow(null)
    if (areaRef.current) { areaRef.current.style.height = 'auto'; areaRef.current.focus() }
    setLoading(true)

    let conv = active
    let isNew = false

    if (!conv) {
      conv = {
        id: genId(),
        title: txt.slice(0, 46) + (txt.length > 46 ? '…' : ''),
        createdAt: Date.now(), updatedAt: Date.now(), msgs: [],
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

    setConvs(prev => {
      const has  = prev.some(c => c.id === updated.id)
      const next = has ? prev.map(c => c.id === updated.id ? updated : c) : [updated, ...prev]
      return next.slice(0, MAX_CONVS)
    })
    if (isNew) setActiveId(updated.id)

    const cid = updated.id

    try {
      const res = await fetch('/api/coach-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'central',
          messages: updated.msgs.map(m => ({ role: m.role, content: m.content })),
          context: context ?? {},
        }),
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const aiMsgId = genId()
      setConvs(prev => prev.map(c =>
        c.id === cid
          ? { ...c, msgs: [...c.msgs, { id: aiMsgId, role: 'assistant' as const, content: '', ts: Date.now() }], updatedAt: Date.now() }
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
  }, [input, loading, active, context])

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
          width: 480px; max-width: 100vw;
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

        /* Textarea font — 16px min pour éviter zoom Safari */
        .aip-textarea { font-size: 16px !important; }
        @media (min-width: 768px) { .aip-textarea { font-size: 13px !important; } }

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

        {/* ══ BODY ══════════════════════════════════════════ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', position: 'relative' }}>

          {/* History drawer overlay */}
          {histOpen && (
            <HistoryDrawer
              convs={convs}
              activeId={activeId}
              onSelect={selectConv}
              onDelete={deleteConv}
              onNew={newConv}
              onClose={() => setHistOpen(false)}
            />
          )}

          {/* ── MESSAGES ───────────────────────────────────── */}
          <div className="aip-messages" style={{ padding: '16px 16px 0' }}>

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
                  {QUICK_ACTIONS.map((qa, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (qa.flow) setActiveFlow(qa.flow)
                        else if (qa.prompt) void send(qa.prompt)
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
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(91,111,255,0.35)'
                        ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(91,111,255,0.05)'
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
                      </div>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--ai-dim)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 3 }}>
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
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
                    onSend={p => void send(p)}
                    onCancel={() => setActiveFlow(null)}
                  />
                )}
                {activeFlow === 'nutrition' && (
                  <NutritionFlow
                    onSend={p => void send(p)}
                    onCancel={() => setActiveFlow(null)}
                  />
                )}
                {activeFlow === 'recharge' && (
                  <RechargeFlow
                    onSend={p => void send(p)}
                    onCancel={() => setActiveFlow(null)}
                  />
                )}
              </div>
            )}

            {/* ── Messages ── */}
            {active && active.msgs.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 16 }}>
                {active.msgs.map((msg, idx) => (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {/* Bulle */}
                    <div style={{
                      display: 'flex',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      alignItems: 'flex-start', gap: 8,
                    }}>
                      {msg.role === 'assistant' && (
                        <div style={{
                          width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                          background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)',
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
                        borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        background: msg.role === 'user'
                          ? 'linear-gradient(135deg,#00c8e0,#5b6fff)'
                          : 'var(--ai-bg2)',
                        border: msg.role === 'user' ? 'none' : '1px solid var(--ai-border)',
                        color: msg.role === 'user' ? '#fff' : 'var(--ai-text)',
                      }}>
                        {msg.role === 'user'
                          ? <span style={{ fontSize: 13, lineHeight: 1.55, display: 'block' }}>{msg.content}</span>
                          : <MsgContent text={msg.content} />
                        }
                      </div>
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
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                      background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/logo.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
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
                onPrompt={p => { setPlusOpen(false); void send(p) }}
                onFlow={f => { setPlusOpen(false); setActiveFlow(f) }}
                onClose={() => setPlusOpen(false)}
              />
            )}

            <div style={{
              display: 'flex', gap: 7, alignItems: 'flex-end',
              background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)',
              borderRadius: 13, padding: '7px 7px 7px 8px',
            }}>
              {/* + button */}
              <button
                onClick={() => setPlusOpen(p => !p)}
                title="Plus d'options"
                style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  border: `1px solid ${plusOpen ? 'rgba(91,111,255,0.4)' : 'var(--ai-border)'}`,
                  background: plusOpen ? 'rgba(91,111,255,0.1)' : 'transparent',
                  cursor: 'pointer', color: plusOpen ? '#5b6fff' : 'var(--ai-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.12s',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>

              {/* Textarea */}
              <textarea
                ref={areaRef}
                className="aip-textarea"
                value={input}
                onChange={handleInput}
                onKeyDown={handleKey}
                placeholder="Posez votre question…"
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

              {/* Send */}
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

            <div style={{ fontSize: 10, color: 'var(--ai-dim)', marginTop: 5, textAlign: 'center' }}>
              Entrée · Shift+Entrée pour nouvelle ligne
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
