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
import { CheckCircle2, XCircle, ChevronDown } from 'lucide-react'

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

type FlowId = 'weakpoints' | 'nutrition' | 'recharge' | 'analyzetest' | 'sessionbuilder' | 'training_plan' | null

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
  // Phase 4 — plan-aware chat
  planId?: string                    // training_plans.id — active le mode plan_coach
  planContext?: Record<string, unknown> // { trainingPlan: {...} } injecté en system prompt
  planName?: string                  // affiché dans la conv et le welcome message
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
    // Hidden metadata tag (e.g. sport:running) — skip rendering
    if (/^sport:[a-z_]+$/.test(line.trim())) { i++; continue }

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

// ── Typed text — streaming character-by-character reveal ──────────
// Matches the Claude / ChatGPT "typewriter" feel: reveals chars at
// ~16 ms/char during streaming, snaps to full text when done.

function TypedText({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  const [shown, setShown]     = useState(isStreaming ? 0 : text.length)
  const rafRef                = useRef<number | null>(null)
  const targetLenRef          = useRef(text.length)
  const prevStreamingRef      = useRef(isStreaming)

  useEffect(() => {
    targetLenRef.current = text.length

    // Streaming just ended → snap to full text immediately
    if (prevStreamingRef.current && !isStreaming) {
      prevStreamingRef.current = false
      setShown(text.length)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }
    prevStreamingRef.current = isStreaming

    if (!isStreaming) {
      setShown(text.length)
      return
    }

    // Reveal chars progressively via rAF
    const tick = () => {
      setShown(prev => {
        const remaining = targetLenRef.current - prev
        if (remaining <= 0) { rafRef.current = null; return prev }
        // Burst a few chars per frame — keeps up with fast streaming
        const step = Math.max(1, Math.floor(remaining / 6))
        const next = Math.min(prev + step, targetLenRef.current)
        rafRef.current = requestAnimationFrame(tick)
        return next
      })
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [text, isStreaming])

  const cursor = isStreaming
    ? <span style={{
        display:         'inline-block',
        width:           2,
        height:          13,
        marginLeft:      2,
        verticalAlign:   'middle',
        background:      'var(--ai-accent)',
        borderRadius:    1,
        animation:       'ai_cursor 0.65s ease-in-out infinite',
      }} />
    : null

  return (
    <div style={{ position: 'relative' }}>
      <MsgContent text={text.slice(0, shown)} />
      {cursor}
    </div>
  )
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
  rawValue?: number  // watts (cycling) or speed m/s (running/swim/row) — for continuous height
  cadence?: number   // RPM (cycling) or SPM (running)
}
interface ParsedSession {
  title: string
  sport: string
  total_min: number
  blocks: SessionBlock[]
}

const PHASE_RE = /échauffement|warm.?up|retour au calme|cool.?down|intervalle|récupér|fractionné|effort|tempo|seuil|vma|vo2\s*max|progressif|activation|transition|bloc|phase/i

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
  // Return total bloc duration (reps × effort) for proportional chart widths
  if (rep) return parseInt(rep[1]) * parseInt(rep[2])
  const min = text.match(/(\d+)\s*min/i)
  return min ? parseInt(min[1]) : 0
}

function detectSport(text: string): string {
  // Explicit sport tag embedded in aiMsg takes absolute priority
  const tagM = text.match(/^sport:([a-z_]+)/m)
  if (tagM) return tagM[1]
  // Fallback heuristic (legacy messages without sport tag)
  const t = text.toLowerCase()
  if (/\bcyclisme\b|vélo|watt|ftp/.test(t)) return 'cycling'
  if (/\bnatation\b|piscine|nage|css/.test(t)) return 'swim'
  if (/\baviron\b|rowing|ergomètre/.test(t)) return 'rowing'
  if (/\bhyrox\b|skierg|sled|wall ball/.test(t)) return 'hyrox'
  if (/\bmuscu\b|\bsquat\b|\bbench\b|\bdeadlift\b/.test(t)) return 'gym'
  return 'running'
}

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

function formatRawValue(rv: number, sport: string): string {
  if (/cycling|velo|vélo|aviron|rowing/.test(sport)) return `${Math.round(rv)}W`
  if (/running|natation|swim|run/.test(sport)) {
    const secPerKm = Math.round(1000 / rv)
    const min = Math.floor(secPerKm / 60)
    const sec = secPerKm % 60
    return `${min}:${String(sec).padStart(2, '0')}/km`
  }
  return `${Math.round(rv)}`
}

function extractCadence(text: string): number | undefined {
  const m = text.match(/(\d{2,3})\s*(?:rpm|spm)/i)
          ?? text.match(/cadence[^0-9]*?(\d{2,3})/i)
  if (m) {
    const v = parseInt(m[1])
    if (v >= 30 && v <= 300) return v  // sanity range: 30-300
  }
  return undefined
}

// Extracts a continuous intensity value from text for height calculation.
// Returns watts (cycling) or speed in m/s (running/swim/row). Recovery → 0.
function extractRawValue(text: string, sport: string): number | undefined {
  // Only treat as recovery if the LABEL starts with "récup" or the block is a cooldown.
  // Do NOT match "/ 3 min récup" patterns (recovery info embedded in an effort bloc header).
  const trimmed = text.trim()
  const isRecup = /^r[eé]cup/i.test(trimmed) || /retour au calme|cool.?down/i.test(text)
  if (isRecup) return 0

  const isCycling = /cycling|velo|vélo|aviron|rowing/.test(sport)
  const isRunLike  = /running|natation|swim|run/.test(sport)

  if (isCycling) {
    // Priority: explicit watt value like "320W" or "~320W" or "320 W"
    const wm = text.match(/~?(\d{2,4})\s*W(?:\b|[^h])/i)
    if (wm) return parseInt(wm[1])
    // Fallback: percentage of FTP like "112% FTP" → FTP unknown, keep undefined
  }

  if (isRunLike) {
    // Pace like "4:30/km" or "4'30/km" → convert to speed m/s (higher = more intense)
    const pm = text.match(/(\d+)[:'′](\d{2})\s*\/\s*(?:km|100m)/i)
    if (pm) {
      const totalSec = parseInt(pm[1]) * 60 + parseInt(pm[2])
      if (totalSec > 0) return 1000 / totalSec  // m/s: faster pace → higher value
    }
  }

  return undefined
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

  // Extract real session title: first standalone **bold** line (not a numbered item)
  const titleLine = lines.find(l => /^\*\*[^*]+\*\*$/.test(l.trim()) && !/^\d+[.)]\s/.test(l.trim()))
  const sessionTitle = titleLine
    ? titleLine.replace(/\*\*/g, '').trim()
    : (lines.find(l => /\*\*[^*]+\*\*/.test(l) && !/^\d+[.)]\s/.test(l))?.replace(/\*\*/g, '').trim() ?? 'Séance proposée')

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

  const parsedSport = detectSport(text)

  if (phaseSections.length >= 2) {
    const blocks: SessionBlock[] = []
    for (const s of phaseSections) {
      const combined = s.headingText + ' ' + s.bodyLines.join(' ')
      const zone = zoneFromText(combined)
      const pctM = combined.match(/(\d+[-–]\d+)%/)
      const intensity = pctM ? `Z${zone} · ${pctM[1]}%` : `Z${zone}`
      const notes = s.bodyLines
        .map(l => l.replace(/^[-•*]\s*/, '').trim())
        .filter(l => l && !/^\d+\s*min/.test(l))[0] ?? ''
      const baseLabel = s.headingText.replace(/^\d+[.):\s]+/, '').trim()
      const rawValue  = extractRawValue(combined, parsedSport)
      const cadence   = extractCadence(combined)

      // Expand repeated blocs into individual effort+recovery pairs
      const repM   = combined.match(/(\d+)\s*[x×]\s*(\d+)\s*min/i)
      const recupM = combined.match(/\/\s*(\d+)\s*min\s*r[eé]cup/i)
      if (repM) {
        const reps      = parseInt(repM[1])
        const effortDur = parseInt(repM[2])
        const recupDur  = recupM ? parseInt(recupM[1]) : 0
        if (effortDur > 0) {
          for (let r = 0; r < reps; r++) {
            blocks.push({ label: baseLabel, duration_min: effortDur, zone, intensity, notes, rawValue, cadence })
            if (recupDur > 0) {
              blocks.push({ label: 'Récup', duration_min: recupDur, zone: 1, intensity: 'Z1', notes: '', rawValue: 0 })
            }
          }
          continue
        }
      }

      blocks.push({ label: baseLabel, duration_min: durFromText(combined), zone, intensity, notes, rawValue, cadence })
    }
    const total = blocks.reduce((s, b) => s + b.duration_min, 0)
    return { title: sessionTitle, sport: parsedSport, total_min: total, blocks }
  }

  const boldBlocks: SessionBlock[] = []
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]
    if (!/\*\*[^*]+\*\*/.test(line)) continue
    if (!PHASE_RE.test(line)) continue
    const labelM = line.match(/\*\*([^*]+)\*\*/)
    const label = labelM ? labelM[1] : line.slice(0, 30)
    const zone = zoneFromText(line)
    const pctM = line.match(/(\d+[-–]\d+)%/)
    const intensity = pctM ? `Z${zone} · ${pctM[1]}%` : `Z${zone}`
    const notes = line
      .replace(/\*\*[^*]+\*\*/, '').replace(/\d+\s*min/ig, '')
      .replace(/[-•*:·]/g, '').trim().slice(0, 80)
    // Look ahead: consigne is on the next non-empty line (no bold markers)
    const nextLine = lines.slice(li + 1, li + 3).find(l => l.trim() && !/\*\*/.test(l)) ?? ''
    const combined = line + ' ' + nextLine
    const rawValue = extractRawValue(combined, parsedSport)
    const cadence  = extractCadence(combined)

    // Detect repetitions: "5×3 min / 3 min récup" → expand into N effort+recovery pairs
    const repM   = line.match(/(\d+)\s*[x×]\s*(\d+)\s*min/i)
    const recupM = line.match(/\/\s*(\d+)\s*min\s*r[eé]cup/i)
    if (repM) {
      const reps      = parseInt(repM[1])
      const effortDur = parseInt(repM[2])
      const recupDur  = recupM ? parseInt(recupM[1]) : 0
      if (!effortDur) continue
      for (let r = 0; r < reps; r++) {
        boldBlocks.push({ label, duration_min: effortDur, zone, intensity, notes, rawValue, cadence })
        if (recupDur > 0) {
          boldBlocks.push({ label: 'Récup', duration_min: recupDur, zone: 1, intensity: 'Z1', notes: '', rawValue: 0 })
        }
      }
      continue
    }

    const dur = durFromText(line)
    if (!dur) continue
    boldBlocks.push({ label, duration_min: dur, zone, intensity, notes, rawValue, cadence })
  }

  if (boldBlocks.length >= 2) {
    const total = boldBlocks.reduce((s, b) => s + b.duration_min, 0)
    return { title: sessionTitle, sport: parsedSport, total_min: total, blocks: boldBlocks }
  }

  return null
}

// ── Session Block Chart ────────────────────────────────────────

function SessionBlockChart({ blocks, total, sport }: { blocks: SessionBlock[]; total: number; sport: string }) {
  const [hovIdx, setHovIdx] = useState<number | null>(null)

  // Compute height percentages — continuous scale from rawValue when available
  const CHART_H = 52  // px, total chart area height
  const effortVals = blocks
    .filter(b => b.rawValue !== undefined && b.rawValue > 0)
    .map(b => b.rawValue as number)
  const hasRaw = effortVals.length > 0
  const rawMax = hasRaw ? Math.max(...effortVals) : 1
  // Floor at 80% of min value so even close values show visible difference
  const rawFloor = hasRaw ? Math.min(...effortVals) * 0.80 : 0

  function barHeightPct(b: SessionBlock): number {
    if (b.rawValue === 0) return 22  // recovery: always short
    if (b.rawValue !== undefined && hasRaw) {
      const norm = (b.rawValue - rawFloor) / (rawMax - rawFloor)  // 0..1
      return 22 + norm * 78  // 22%..100%
    }
    // Zone fallback: [1,2,3,4,5] → [22,38,55,75,100]
    const zoneMap = [22, 38, 55, 75, 100]
    return zoneMap[Math.min(b.zone - 1, 4)]
  }

  return (
    <div style={{ position: 'relative', userSelect: 'none' }}>
      {hovIdx !== null && (() => {
        const hb = blocks[hovIdx]
        const col = SESSION_ZONE_COLORS[(hb.zone - 1) % 5]
        return (
          <div style={{
            position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--ai-bg)', border: '1px solid var(--ai-border)',
            borderRadius: 7, padding: '5px 11px', zIndex: 20,
            fontSize: 11, whiteSpace: 'nowrap', marginBottom: 6,
            boxShadow: '0 4px 14px rgba(0,0,0,0.20)', pointerEvents: 'none',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{ fontWeight: 600, color: 'var(--ai-text)' }}>{hb.label}</span>
            <span style={{ color: 'var(--ai-dim)' }}>·</span>
            <span style={{ color: 'var(--ai-text)', fontFamily: 'DM Mono,monospace' }}>{hb.duration_min}′</span>
            <span style={{ color: 'var(--ai-dim)' }}>·</span>
            <span style={{ color: col, fontWeight: 700 }}>{hb.intensity.split(' ')[0]}</span>
            {hb.rawValue !== undefined && hb.rawValue > 0 && (
              <>
                <span style={{ color: 'var(--ai-dim)' }}>·</span>
                <span style={{ color: 'var(--ai-text)', fontFamily: 'DM Mono,monospace', fontWeight: 600 }}>
                  {formatRawValue(hb.rawValue, sport)}
                </span>
              </>
            )}
            {hb.cadence !== undefined && (
              <>
                <span style={{ color: 'var(--ai-dim)' }}>·</span>
                <span style={{ color: 'var(--ai-mid)', fontFamily: 'DM Mono,monospace' }}>{hb.cadence} rpm</span>
              </>
            )}
          </div>
        )
      })()}
      {/* Variable-height bars aligned to the bottom */}
      <div style={{ display: 'flex', height: CHART_H, alignItems: 'flex-end', gap: 2, marginBottom: 5 }}>
        {blocks.map((b, i) => {
          const widthPct = total > 0 ? (b.duration_min / total) * 100 : 100 / blocks.length
          const heightPct = barHeightPct(b)
          const col = SESSION_ZONE_COLORS[(b.zone - 1) % 5]
          const isHov = hovIdx === i
          return (
            <div key={i}
              style={{
                width: `${widthPct}%`,
                height: `${heightPct}%`,
                background: isHov ? col : `${col}cc`,
                borderRadius: '3px 3px 0 0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'default',
                transition: 'background 0.1s, height 0.2s',
                flexShrink: 0,
              }}
              onMouseEnter={() => setHovIdx(i)}
              onMouseLeave={() => setHovIdx(null)}
            >
              {widthPct > 12 && heightPct > 40 && (
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

function AddToLibraryModal({ session, onClose }: { session: ParsedSession; onClose: () => void }) {
  const [nom,    setNom]    = useState(session.title !== 'Séance proposée' ? session.title : '')
  const [saving, setSaving] = useState(false)
  const [done,   setDone]   = useState(false)
  const [errMsg, setErrMsg] = useState('')

  const isCycling = /cycling|velo|vélo|aviron|rowing/.test(session.sport)
  const isRunLike  = /running|natation|swim|run/.test(session.sport)

  // Derive intensite from max zone across effort blocks
  function deriveIntensite(): string {
    const maxZone = session.blocks
      .filter(b => b.rawValue !== 0)
      .reduce((m, b) => Math.max(m, b.zone), 1)
    if (maxZone >= 5) return 'Maximum'
    if (maxZone >= 4) return 'Élevé'
    if (maxZone >= 3) return 'Modéré'
    return 'Faible'
  }

  async function save() {
    if (!nom.trim()) { setErrMsg('Nom requis'); return }
    setSaving(true); setErrMsg('')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setErrMsg('Non connecté'); setSaving(false); return }

      // Map ParsedSession blocks → session_library blocs format
      const blocs = session.blocks.map(b => {
        const isRecup = b.rawValue === 0
        const watts = (isCycling && b.rawValue && b.rawValue > 0) ? Math.round(b.rawValue) : null
        const allure = (isRunLike && b.rawValue && b.rawValue > 0) ? formatRawValue(b.rawValue, session.sport) : null
        return {
          nom:          b.label,
          repetitions:  1,
          duree_effort: b.duration_min,
          recup:        0,
          zone_effort:  isRecup ? ['Z1'] : [b.intensity.split(' ')[0]],
          zone_recup:   [],
          watts,
          allure_cible: allure,
          fc_cible:     null,
          fc_max:       null,
          cadence:      b.cadence ?? null,
          consigne:     b.notes || '',
        }
      })

      const { error } = await sb.from('session_library').insert({
        user_id:       user.id,
        nom:           nom.trim(),
        sport:         session.sport,
        type_seance:   [],
        sous_type:     null,
        duree_estimee: session.total_min,
        intensite:     deriveIntensite(),
        tss_estime:    null,
        rpe_cible:     null,
        tags:          [],
        description:   null,
        blocs,
        source:        'ai',
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
            <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 15, fontWeight: 700, margin: '0 0 5px', color: 'var(--ai-text)' }}>Ajouté à la bibliothèque !</p>
            <p style={{ fontSize: 12, color: 'var(--ai-dim)', margin: '0 0 16px' }}>
              Retrouve-la dans Session → Bibliothèque
            </p>
            <button onClick={onClose} style={{ padding: '8px 22px', borderRadius: 9, border: 'none', background: 'var(--ai-gradient)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Fermer
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--ai-text)' }}>
                Ajouter à la bibliothèque
              </h3>
              <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-dim)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ai-dim)', marginBottom: 6 }}>Nom de la séance</p>
                <input
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  placeholder="Ex: Sortie marathon tempo"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', color: 'var(--ai-text)', fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'DM Sans,sans-serif' }}
                />
              </div>
              <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(91,111,255,0.06)', border: '1px solid rgba(91,111,255,0.15)' }}>
                <div style={{ fontSize: 11, color: 'var(--ai-dim)', marginBottom: 4 }}>
                  {SPORT_LABELS_FR[session.sport] ?? session.sport} · {formatDuration(session.total_min)} · {session.blocks.filter(b => b.rawValue !== 0).length} blocs d'effort
                </div>
                <div style={{ fontSize: 10, color: 'var(--ai-mid)' }}>
                  Intensité {deriveIntensite().toLowerCase()}
                </div>
              </div>
              {errMsg && <p style={{ fontSize: 11, color: '#ef4444', margin: 0 }}>{errMsg}</p>}
              <button onClick={() => void save()} disabled={saving} style={{
                padding: '10px', borderRadius: 9, border: 'none', marginTop: 2,
                background: saving ? 'var(--ai-border)' : 'var(--ai-gradient)',
                color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}>
                {saving ? 'Enregistrement…' : 'Ajouter à la bibliothèque'}
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

  // ── Average metrics (effort blocks only, rawValue > 0) ──────
  const effortBs = displayBlocks.filter(b => b.rawValue !== undefined && b.rawValue > 0)
  const totalEffortMin = effortBs.reduce((s, b) => s + b.duration_min, 0)
  const avgRaw = totalEffortMin > 0
    ? effortBs.reduce((s, b) => s + (b.rawValue ?? 0) * b.duration_min, 0) / totalEffortMin
    : null
  const cadenceBs = effortBs.filter(b => b.cadence !== undefined)
  const totalCadMin = cadenceBs.reduce((s, b) => s + b.duration_min, 0)
  const avgCadence = totalCadMin > 0
    ? Math.round(cadenceBs.reduce((s, b) => s + (b.cadence ?? 0) * b.duration_min, 0) / totalCadMin)
    : null

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
          background: 'linear-gradient(90deg,var(--ai-accent-dim) 0%,transparent 100%)',
          borderBottom: '1px solid var(--ai-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontFamily: 'Syne,sans-serif', fontSize: 12, fontWeight: 700, color: 'var(--ai-text)' }}>
              {sportLabel} · {formatDuration(total)}
            </span>
            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: 'var(--ai-accent-dim)', color: 'var(--ai-accent)', fontWeight: 700, letterSpacing: '0.05em' }}>
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
          <SessionBlockChart blocks={displayBlocks} total={total} sport={session.sport} />
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
              {displayBlocks.map((b, i) => {
                const zCol = SESSION_ZONE_COLORS[(b.zone - 1) % 5]
                const isRecupRow = b.rawValue === 0
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: zCol, flexShrink: 0, opacity: isRecupRow ? 0.4 : 1 }} />
                    <span style={{ flex: 1, fontSize: 11.5, color: isRecupRow ? 'var(--ai-dim)' : 'var(--ai-text)', lineHeight: 1.3 }}>{b.label}</span>
                    <span style={{ fontSize: 10.5, fontFamily: 'DM Mono,monospace', color: 'var(--ai-mid)', flexShrink: 0 }}>{b.duration_min}′</span>
                    <span style={{ fontSize: 10, color: zCol, fontWeight: 700, minWidth: 22, textAlign: 'right', flexShrink: 0 }}>
                      {b.intensity.split(' ')[0]}
                    </span>
                    {b.rawValue !== undefined && b.rawValue > 0 && (
                      <span style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', color: 'var(--ai-text)', minWidth: 44, textAlign: 'right', flexShrink: 0, fontWeight: 600 }}>
                        {formatRawValue(b.rawValue, session.sport)}
                      </span>
                    )}
                    {b.cadence !== undefined && (
                      <span style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', color: 'var(--ai-dim)', minWidth: 42, textAlign: 'right', flexShrink: 0 }}>
                        {b.cadence} rpm
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Average metrics row */}
        {(avgRaw !== null || avgCadence !== null) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '6px 18px 8px',
            borderTop: '1px solid var(--ai-border)',
          }}>
            <span style={{ fontSize: 10, color: 'var(--ai-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Moy. cible</span>
            {avgRaw !== null && (
              <span style={{ fontSize: 12, fontFamily: 'DM Mono,monospace', fontWeight: 700, color: 'var(--ai-text)' }}>
                {formatRawValue(avgRaw, session.sport)}
              </span>
            )}
            {avgCadence !== null && (
              <span style={{ fontSize: 12, fontFamily: 'DM Mono,monospace', color: 'var(--ai-mid)' }}>
                {avgCadence} rpm
              </span>
            )}
          </div>
        )}

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
              <button onClick={() => setShowModal(true)} style={{ flex: 2, padding: '7px 10px', borderRadius: 8, border: 'none', background: 'var(--ai-gradient)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                + Ajouter à la bibliothèque
              </button>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <AddToLibraryModal
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
    <div style={{ display: 'flex', gap: 5, padding: '3px 2px', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
          background: 'var(--ai-accent)',
          animation: `ai_dot 1.4s cubic-bezier(0.25,0.46,0.45,0.94) ${i * 0.22}s infinite`,
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
              border: `1px solid ${on ? 'var(--ai-accent)' : 'var(--ai-border)'}`,
              background: on ? 'var(--ai-accent-dim)' : 'var(--ai-bg2)',
              color: on ? 'var(--ai-accent)' : 'var(--ai-mid)',
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
          background: selected.length > 0 ? 'var(--ai-gradient)' : 'var(--ai-border)',
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
          background: canNext ? 'var(--ai-gradient)' : 'var(--ai-border)',
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
          background: type ? 'var(--ai-gradient)' : 'var(--ai-border)',
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
          style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: 'var(--ai-gradient)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
          Analyser mes tests
        </button>
      </div>
    </div>
  )
}

// ── TrainingPlanFlow ───────────────────────────────────────────

interface PlannedRaceRow {
  id: string; user_id: string; name: string; sport: string; date: string
  level?: string; goal?: string; strategy?: string
  run_distance?: string; tri_distance?: string
  hyrox_category?: string; hyrox_level?: string; hyrox_gender?: string
  goal_time?: string; goal_swim_time?: string; goal_bike_time?: string; goal_run_time?: string
  validation_data?: Record<string, unknown>
}

interface GoalRace {
  id?: string             // planned_races.id — présent si depuis DB
  nom: string
  date: string
  sport: string
  level: 'gty' | 'main' | 'important' | 'secondary'
  goal_libre: string
  // Running / Trail
  run_distance?: string   // '5km'|'10km'|'Semi'|'Marathon'|'100km' ou '20km'|'50km'|'Ultra'
  trail_elevation?: string
  // Triathlon
  tri_distance?: string   // 'XS'|'S'|'M'|'70.3'|'Ironman'
  tri_goal_swim?: string; tri_goal_t1?: string; tri_goal_bike?: string; tri_goal_t2?: string; tri_goal_run?: string
  // Hyrox
  hyrox_format?: string   // 'Solo Open'|'Solo Pro'|'Doubles Mixte'|'Doubles Men'|'Doubles Women'|'Relay 4x'
  hyrox_gender?: string   // 'Homme'|'Femme'
  // Cyclisme
  velo_type?: string; velo_distance?: string; velo_elevation?: string
  velo_altitude_max?: string; velo_cols?: string
  // Aviron
  aviron_format?: string
  // Natation
  natation_type?: string; natation_distance?: string
  // Universal
  goal_time?: string
}

const LEVEL_LABEL: Record<GoalRace['level'], string> = {
  gty: 'GTY', main: 'Principal', important: 'Important', secondary: 'Secondaire',
}
const LEVEL_COLOR: Record<GoalRace['level'], string> = {
  gty: '#DC2626', main: '#EA580C', important: '#00c8e0', secondary: '#6b7280',
}

// ── Triathlon time helpers ─────────────────────────────────────
function triParseHHMM(s: string | undefined): number {
  const parts = (s ?? '').split(':')
  if (parts.length < 2) return 0
  return (parseInt(parts[0]) || 0) * 3600 + (parseInt(parts[1]) || 0) * 60
}
function triParseMMSS(s: string | undefined): number {
  const parts = (s ?? '').split(':')
  if (parts.length < 2) return 0
  return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0)
}
function triTotalSec(swim?: string, t1?: string, bike?: string, t2?: string, run?: string): number {
  return triParseHHMM(swim) + triParseMMSS(t1) + triParseHHMM(bike) + triParseMMSS(t2) + triParseHHMM(run)
}
function secToHHMMSS(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

interface TrainingPlanForm {
  // Bloc 0
  sport_principal: string
  sports_hybride: { sport: string; importance: 'principal' | 'secondaire' | 'complementaire' }[]
  goal_races: GoalRace[]
  course_cible_nom: string
  course_cible_date: string
  courses_secondaires: { nom: string; date: string; importance: 'B' | 'C' }[]
  niveau_vise: 'finisher' | 'chrono' | 'perf' | ''
  chrono_cible: string
  precision_objectif: string
  // Bloc 1
  experience: '< 1 an' | '1-3 ans' | '3-5 ans' | '> 5 ans' | ''
  volume_actuel: number
  meilleure_performance: string
  programme_precedent: boolean
  programme_precedent_detail: string
  forme_actuelle: 'tres_bonne' | 'bonne' | 'moyenne' | 'mauvaise' | ''
  precision_profil: string
  // Bloc 2
  seances_debut_prepa: number
  seances_pic_prepa: number
  repartition_tri: { natation: number; velo: number; run: number; muscu: number }
  repartition_hyrox: { run: number; muscu: number; spe: number; velo: number }
  include_muscu: boolean
  seances_muscu: number
  heures_par_semaine: number
  jours_repos: string[]
  contraintes_horaires: 'matin' | 'soir' | 'midi' | 'flexible' | ''
  precision_dispo: string
  // Bloc 3
  equipements: string[]
  precision_equipement: string
  // Bloc 4
  blessures_passees: boolean
  blessures_detail: string
  gene_recente: boolean
  gene_detail: string
  contraintes_permanentes: boolean
  contraintes_detail: string
  antecedents: boolean
  antecedents_detail: string
  precision_sante: string
  // Bloc 5
  blocs_custom: boolean
  blocs_custom_detail: { nom: string; type: string; duree_semaines: number }[]
  entree_programme: 'prudent' | 'intense' | ''
  reaction_volume: 'tres_bien' | 'bien' | 'mal' | ''
  reaction_intensite: 'rapide' | '48h' | 'saturation' | ''
  type_seances: 'courtes' | 'longues' | 'mixte' | ''
  connaissance_de_soi: string
  precision_methode: string
  // Bloc 6
  sommeil_heures: number
  fatigue_travail: 'physique' | 'mental' | 'les_deux' | 'faible' | ''
  stress_annee: 'aucun' | 'quelques_semaines' | 'recurrent' | ''
  stress_detail: string
  outils_recuperation: string[]
  precision_recup: string
  // Bloc 7
  plan_nutritionnel: 'structure' | 'intuitif' | 'non' | ''
  contraintes_alimentaires: string[]
  complements: string[]
  precision_nutrition: string
}

interface TpPlanBloc {
  nom: string
  duree_min: number
  zone: number
  repetitions: number
  recup_min: number
  watts: number | null
  allure: string | null
  consigne: string
}

interface TpPlanSeance {
  jour: number
  sport: string
  titre: string
  duree_min: number
  tss: number
  intensite: 'low' | 'moderate' | 'high' | 'max'
  heure: string
  notes: string
  rpe: number
  blocs: TpPlanBloc[]
}

interface TpPlanSemaine {
  numero: number
  type: string
  volume_h: number
  tss_semaine: number
  theme: string
  seances?: TpPlanSeance[]   // undefined pour les semaines résumées (S3+)
  note_coach?: string        // résumé pour les semaines S3+
}

interface TpPlanPeriodisation {
  nom: string
  type: 'Base' | 'Intensité' | 'Spécifique' | 'Deload' | 'Compétition'
  semaine_debut: number
  semaine_fin: number
  description: string
  volume_hebdo_h: number
}

interface GeneratedTrainingPlan {
  nom: string
  duree_semaines: number
  objectif_principal: string
  blocs_periodisation: TpPlanPeriodisation[]
  semaines: TpPlanSemaine[]
  conseils_adaptation: string[]
  points_cles: string[]
}

const TP_JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const TP_JOURS_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

const TP_BLOC_COLORS: Record<string, string> = {
  'Base': '#3b82f6',
  'Intensité': '#f97316',
  'Spécifique': '#ef4444',
  'Deload': '#22c55e',
  'Compétition': '#a855f7',
}

const TP_INTENSITE_COLORS: Record<string, string> = {
  low: '#22c55e',
  moderate: '#eab308',
  high: '#f97316',
  max: '#ef4444',
}

function tpPillStyle(active: boolean): React.CSSProperties {
  return {
    padding: '6px 14px',
    borderRadius: 99,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    border: `1px solid ${active ? '#8b5cf6' : 'var(--ai-border)'}`,
    background: active ? 'rgba(139,92,246,0.12)' : 'transparent',
    color: active ? '#8b5cf6' : 'var(--ai-dim)',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
  }
}

function tpInputStyle(): React.CSSProperties {
  return {
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid var(--ai-border)',
    background: 'var(--ai-bg2)',
    color: 'var(--ai-text)',
    fontSize: 12,
    width: '100%',
    boxSizing: 'border-box' as const,
    outline: 'none',
  }
}

function tpLabelStyle(): React.CSSProperties {
  return {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--ai-text)',
    marginBottom: 8,
    display: 'block',
  }
}

const DEFAULT_FORM: TrainingPlanForm = {
  sport_principal: '',
  sports_hybride: [],
  goal_races: [],
  course_cible_nom: '',
  course_cible_date: '',
  courses_secondaires: [],
  niveau_vise: '',
  chrono_cible: '',
  precision_objectif: '',
  experience: '',
  volume_actuel: 8,
  meilleure_performance: '',
  programme_precedent: false,
  programme_precedent_detail: '',
  forme_actuelle: '',
  precision_profil: '',
  seances_debut_prepa: 5,
  seances_pic_prepa: 7,
  repartition_tri: { natation: 2, velo: 2, run: 2, muscu: 1 },
  repartition_hyrox: { run: 2, muscu: 2, spe: 2, velo: 0 },
  include_muscu: false,
  seances_muscu: 1,
  heures_par_semaine: 8,
  jours_repos: [],
  contraintes_horaires: '',
  precision_dispo: '',
  equipements: [],
  precision_equipement: '',
  blessures_passees: false,
  blessures_detail: '',
  gene_recente: false,
  gene_detail: '',
  contraintes_permanentes: false,
  contraintes_detail: '',
  antecedents: false,
  antecedents_detail: '',
  precision_sante: '',
  blocs_custom: false,
  blocs_custom_detail: [],
  entree_programme: '',
  reaction_volume: '',
  reaction_intensite: '',
  type_seances: '',
  connaissance_de_soi: '',
  precision_methode: '',
  sommeil_heures: 7,
  fatigue_travail: '',
  stress_annee: '',
  stress_detail: '',
  outils_recuperation: [],
  precision_recup: '',
  plan_nutritionnel: '',
  contraintes_alimentaires: [],
  complements: [],
  precision_nutrition: '',
}

function getNextMonday(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 1 : 8 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function addWeeks(dateStr: string, weeks: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ══════════════════════════════════════════════════════════════
// TP INTRO — Écran interstitiel de préparation avant le questionnaire
// ══════════════════════════════════════════════════════════════

interface TpIntroStatus {
  zones_bike: boolean;  records_bike: number
  zones_run:  boolean;  records_run:  number
  zones_swim: boolean;  records_swim: number
  zones_hr:   boolean;  year_datas:   number;  tests:    number
  vo2max:     boolean;  hr_rest:      boolean
  activities_3m:  number
  activities_6m:  number
  activities_12m: number
  races: number; gty: number; pro_events: number; perso_events: number
}

function TpSubRow({ label, ok, count, link }: {
  label: string; ok: boolean; count?: number; link: string
}) {
  const hasCount = !ok && (count ?? 0) > 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--ai-border)' }}>
      <div style={{ width: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {ok
          ? <CheckCircle2 size={13} color="#22c55e" />
          : hasCount
          ? <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ai-dim)', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
          : <XCircle size={13} color="#ef4444" />}
      </div>
      <span style={{ flex: 1, fontSize: 12, color: ok ? 'var(--ai-text)' : 'var(--ai-mid)', lineHeight: 1.4 }}>{label}</span>
      {!ok && (
        <a href={link} style={{ fontSize: 10, color: '#8b5cf6', textDecoration: 'none', flexShrink: 0, fontWeight: 600 }}>
          Compléter →
        </a>
      )}
    </div>
  )
}

function TpSectionWrap({ id, label, ok, total, isOpen, onToggle, children }: {
  id: string; label: string; ok: number; total: number
  isOpen: boolean; onToggle: () => void; children: React.ReactNode
}) {
  const allOk  = ok === total
  const noneOk = ok === 0
  return (
    <div style={{ marginBottom: 6 }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px', borderRadius: isOpen ? '8px 8px 0 0' : 8,
          border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)',
          cursor: 'pointer', outline: 'none', textAlign: 'left' as const,
          transition: 'border-radius 0.1s',
        }}
      >
        <div style={{ width: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {allOk
            ? <CheckCircle2 size={13} color="#22c55e" />
            : noneOk
            ? <XCircle size={13} color="#ef4444" />
            : <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ai-dim)', fontVariantNumeric: 'tabular-nums' }}>{ok}/{total}</span>}
        </div>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', fontFamily: 'Syne,sans-serif' }}>
          {label}
        </span>
        <ChevronDown
          size={13}
          color="var(--ai-dim)"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}
        />
      </button>
      {isOpen && (
        <div style={{
          padding: '2px 10px 4px',
          border: '1px solid var(--ai-border)', borderTop: 'none',
          borderRadius: '0 0 8px 8px', background: 'var(--ai-bg)',
        }}>
          {children}
        </div>
      )}
    </div>
  )
}

function TpIntroScreen({ onContinue, onCancel }: { onContinue: () => void; onCancel: () => void }) {
  const [status,  setStatus]  = useState<TpIntroStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<Record<string, boolean>>({
    performance: true, training: true, calendrier: true, nutrition: false, recuperation: false,
  })

  useEffect(() => { void fetchStatus() }, [])

  async function fetchStatus() {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setLoading(false); return }

      const now  = new Date()
      const d3m  = new Date(now.getTime() -  90 * 86400000).toISOString().slice(0, 10)
      const d6m  = new Date(now.getTime() - 180 * 86400000).toISOString().slice(0, 10)
      const d12m = new Date(now.getTime() - 365 * 86400000).toISOString().slice(0, 10)

      const [
        zonesRes, recBike, recRun, recSwim,
        profRes, yearRes, testRes,
        a3, a6, a12, racesRes, calRes,
      ] = await Promise.all([
        sb.from('training_zones').select('sport,z1_value').eq('user_id', user.id).eq('is_current', true),
        sb.from('personal_records').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('sport', 'bike'),
        sb.from('personal_records').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('sport', 'run'),
        sb.from('personal_records').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('sport', 'swim'),
        sb.from('athlete_performance_profile').select('*').eq('user_id', user.id).maybeSingle(),
        sb.from('year_data_manual').select('id', { count: 'exact', head: true }),
        sb.from('test_results').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        sb.from('activities').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('started_at', d3m),
        sb.from('activities').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('started_at', d6m),
        sb.from('activities').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('started_at', d12m),
        sb.from('planned_races').select('level').eq('user_id', user.id),
        sb.from('calendar_events').select('category').eq('user_id', user.id),
      ])

      // Zones: z1_value non-vide = configuré
      const zMap: Record<string, boolean> = {}
      for (const z of zonesRes.data ?? []) {
        zMap[z.sport as string] = !!(z.z1_value)
      }

      // Profile: colonnes pouvant être snake_case ou camelCase selon la migration
      const p = profRes.data as Record<string, unknown> | null
      const numOf = (...keys: string[]): number =>
        keys.reduce((acc, k) => acc || (Number(p?.[k]) || 0), 0)
      const vo2max  = numOf('vo2max', 'vo_2max') > 0
      const hr_rest = numOf('hr_rest', 'hrRest', 'resting_hr') > 0
      const hr_max  = numOf('hr_max',  'hrMax',  'max_hr')     > 0

      // Races (planned_races table) — level column: 'main' | 'important' | 'secondary' | 'gty'
      type RaceRow = { level: string }
      const raceRows: RaceRow[] = (racesRes.data ?? []) as RaceRow[]
      const races = raceRows.filter(r => r.level !== 'gty').length
      const gty   = raceRows.filter(r => r.level === 'gty').length

      // Calendar events (category only — no level column in calendar_events)
      type CalRow = { category: string }
      const evts: CalRow[] = (calRes.data ?? []) as CalRow[]
      const pro_events   = evts.filter(e => e.category === 'pro').length
      const perso_events = evts.filter(e => e.category === 'perso').length

      setStatus({
        zones_bike:  zMap['bike']  ?? false, records_bike: recBike.count ?? 0,
        zones_run:   zMap['run']   ?? false, records_run:  recRun.count  ?? 0,
        zones_swim:  zMap['swim']  ?? false, records_swim: recSwim.count ?? 0,
        zones_hr:    hr_rest || hr_max,
        year_datas:  yearRes.count ?? 0,
        tests:       testRes.count ?? 0,
        vo2max, hr_rest,
        activities_3m:  a3.count  ?? 0,
        activities_6m:  a6.count  ?? 0,
        activities_12m: a12.count ?? 0,
        races, gty, pro_events, perso_events,
      })
    } catch (err) {
      console.error('[TpIntro] fetch error', err)
    } finally {
      setLoading(false)
    }
  }

  const toggle = (id: string) => setOpen(prev => ({ ...prev, [id]: !prev[id] }))

  if (loading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          border: '2px solid rgba(139,92,246,0.2)', borderTop: '2px solid #8b5cf6',
          animation: 'ai_spin 0.8s linear infinite', margin: '0 auto 12px',
        }} />
        <p style={{ fontSize: 12, color: 'var(--ai-dim)', margin: 0 }}>Vérification du profil…</p>
      </div>
    )
  }

  const s = status
  const perfOk  = [
    s?.zones_bike, !!(s?.records_bike), s?.zones_run,  !!(s?.records_run),
    s?.zones_swim, !!(s?.records_swim), s?.zones_hr,   !!(s?.year_datas),
    !!(s?.tests),  s?.vo2max,           s?.hr_rest,
  ].filter(Boolean).length
  const trainOk = [!!(s?.activities_3m), !!(s?.activities_6m), !!(s?.activities_12m)].filter(Boolean).length
  const calOk   = [!!(s?.races), !!(s?.gty), !!(s?.pro_events), !!(s?.perso_events)].filter(Boolean).length

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ai-text)', margin: '0 0 6px', fontFamily: 'Syne,sans-serif' }}>
          Prépare ton plan d&apos;entraînement
        </p>
        <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: 0, lineHeight: 1.65 }}>
          Plus ton profil est complet, plus le plan généré sera précis. Tu peux continuer même si des données manquent.
        </p>
      </div>

      {/* Performance */}
      <TpSectionWrap id="performance" label="Performance" ok={perfOk} total={11} isOpen={open.performance} onToggle={() => toggle('performance')}>
        <TpSubRow label="Zones puissance vélo"       ok={s?.zones_bike   ?? false} link="/performance" />
        <TpSubRow label="Records puissance vélo"      ok={!!(s?.records_bike)} count={s?.records_bike} link="/performance" />
        <TpSubRow label="Zones allure course à pied"  ok={s?.zones_run    ?? false} link="/performance" />
        <TpSubRow label="Records course à pied"       ok={!!(s?.records_run)}  count={s?.records_run}  link="/performance" />
        <TpSubRow label="Zones allure natation"       ok={s?.zones_swim   ?? false} link="/performance" />
        <TpSubRow label="Records natation"            ok={!!(s?.records_swim)} count={s?.records_swim} link="/performance" />
        <TpSubRow label="Zones FC"                    ok={s?.zones_hr     ?? false} link="/performance" />
        <TpSubRow label="Year datas"                  ok={!!(s?.year_datas)}   count={s?.year_datas}   link="/performance" />
        <TpSubRow label="Tests"                       ok={!!(s?.tests)}        count={s?.tests}        link="/performance" />
        <TpSubRow label="VO2max"                      ok={s?.vo2max       ?? false} link="/performance" />
        <TpSubRow label="FC repos"                    ok={s?.hr_rest      ?? false} link="/performance" />
      </TpSectionWrap>

      {/* Training */}
      <TpSectionWrap id="training" label="Training" ok={trainOk} total={3} isOpen={open.training} onToggle={() => toggle('training')}>
        <TpSubRow label="3 mois d'historique"  ok={!!(s?.activities_3m)}  count={s?.activities_3m}  link="/activities" />
        <TpSubRow label="6 mois d'historique"  ok={!!(s?.activities_6m)}  count={s?.activities_6m}  link="/activities" />
        <TpSubRow label="1 an d'historique"    ok={!!(s?.activities_12m)} count={s?.activities_12m} link="/activities" />
      </TpSectionWrap>

      {/* Calendrier */}
      <TpSectionWrap id="calendrier" label="Calendrier" ok={calOk} total={4} isOpen={open.calendrier} onToggle={() => toggle('calendrier')}>
        <TpSubRow label="Race calendar"    ok={!!(s?.races)}        count={s?.races}        link="/calendar" />
        <TpSubRow label="GTY"              ok={!!(s?.gty)}          count={s?.gty}          link="/calendar" />
        <TpSubRow label="Pro calendar"     ok={!!(s?.pro_events)}   count={s?.pro_events}   link="/calendar" />
        <TpSubRow label="Perso calendar"   ok={!!(s?.perso_events)} count={s?.perso_events} link="/calendar" />
      </TpSectionWrap>

      {/* Nutrition */}
      <TpSectionWrap id="nutrition" label="Nutrition" ok={0} total={1} isOpen={open.nutrition} onToggle={() => toggle('nutrition')}>
        <p style={{ fontSize: 12, color: 'var(--ai-dim)', margin: '10px 0', textAlign: 'center' }}>À compléter</p>
      </TpSectionWrap>

      {/* Récupération */}
      <TpSectionWrap id="recuperation" label="Récupération" ok={0} total={1} isOpen={open.recuperation} onToggle={() => toggle('recuperation')}>
        <p style={{ fontSize: 12, color: 'var(--ai-dim)', margin: '10px 0', textAlign: 'center' }}>À compléter</p>
      </TpSectionWrap>

      {/* CTA sticky */}
      <div style={{
        position: 'sticky', bottom: 0,
        paddingTop: 12, marginTop: 12,
        background: 'var(--ai-bg)', borderTop: '1px solid var(--ai-border)',
      }}>
        <button
          onClick={onContinue}
          style={{
            width: '100%', padding: '11px 16px', borderRadius: 10,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'Syne,sans-serif', letterSpacing: '0.01em',
          }}
        >
          Continuer vers le questionnaire →
        </button>
        <button
          onClick={onCancel}
          style={{ display: 'block', margin: '8px auto 0', fontSize: 11, color: 'var(--ai-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
        >
          Annuler
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════

function TrainingPlanFlow({
  model,
  onCancel,
  onRecordConv,
}: {
  model: THWModel
  onCancel: () => void
  onRecordConv: (userMsg: string, aiMsg: string) => void
}) {
  type TpPhase = 'intro' | 'gate' | 'questionnaire' | 'generating' | 'result' | 'modifying'

  const [phase, setPhase] = useState<TpPhase>('intro')
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<TrainingPlanForm>(DEFAULT_FORM)
  const [program, setProgram] = useState<GeneratedTrainingPlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryable, setRetryable] = useState(false)
  const [showAllWeeks, setShowAllWeeks] = useState(false)
  const [modifyText, setModifyText] = useState('')
  const [modifyChecks, setModifyChecks] = useState<string[]>([])
  // Lazy initializer : getNextMonday() appelle new Date() et sa valeur
  // change entre la passe de rendu. Avec useState(getNextMonday()) eager,
  // le calcul tournait à chaque rerender (waste) et pouvait diverger entre
  // le premier render client et un éventuel double-invoke strict mode.
  // La forme () => ... garantit une exécution unique au mount.
  const [startDate, setStartDate] = useState(() => getNextMonday())
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [conflictInfo, setConflictInfo] = useState<{ count: number; ids: string[] } | null>(null)
  const [planStep, setPlanStep] = useState<'idle'|'conflict'|'confirm'|'inserting'|'success'|'error'>('idle')
  const [planStats, setPlanStats] = useState<{created: number; errors: number}>({created:0, errors:0})
  const [showMergeChoice, setShowMergeChoice] = useState(false)
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)
  const [copyFeedback, setCopyFeedback] = useState<'idle' | 'copied'>('idle')
  const [goalRacesLoading, setGoalRacesLoading] = useState(true)
  const [personalRecords, setPersonalRecords] = useState<{ sport: string; distance_label: string; performance: string }[]>([])

  function setField<K extends keyof TrainingPlanForm>(key: K, value: TrainingPlanForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function toggleArr<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
  }

  // ── Goal races helpers ─────────────────────────────────────────
  function updateGoalRace(idx: number, patch: Partial<GoalRace>) {
    setForm(prev => ({ ...prev, goal_races: prev.goal_races.map((r, i) => i === idx ? { ...r, ...patch } : r) }))
  }

  function setGoalRaceLevel(idx: number, level: GoalRace['level']) {
    setForm(prev => {
      const prevGty = prev.goal_races.findIndex((r, i) => i !== idx && r.level === 'gty')
      const next = prev.goal_races.map((r, i) => {
        if (i === idx) return { ...r, level }
        if (level === 'gty' && r.level === 'gty') return { ...r, level: 'important' as const }
        return r
      })
      // Sync DB for DB-backed races
      const race = next[idx]
      if (race.id) void syncRaceLevel(race.id, level)
      if (level === 'gty' && prevGty >= 0 && prev.goal_races[prevGty].id) {
        void syncRaceLevel(prev.goal_races[prevGty].id!, 'important')
      }
      return { ...prev, goal_races: next }
    })
  }

  async function syncRaceLevel(raceId: string, level: string) {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      await sb.from('planned_races').update({ level }).eq('id', raceId)
    } catch { /* silent */ }
  }

  // ── Fetch planned_races + personal_records on mount ───────────
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return

        const [racesRes, recsRes] = await Promise.all([
          sb.from('planned_races').select('*').eq('user_id', user.id).order('date', { ascending: true }),
          sb.from('personal_records')
            .select('sport, distance_label, performance')
            .eq('user_id', user.id)
            .order('achieved_at', { ascending: false }),
        ])

        if (racesRes.data && racesRes.data.length > 0) {
          const races: GoalRace[] = (racesRes.data as PlannedRaceRow[]).map(r => ({
            id: r.id,
            nom: r.name,
            date: r.date,
            sport: r.sport,
            level: (r.level ?? 'important') as GoalRace['level'],
            goal_libre: r.goal ?? '',
            run_distance: r.run_distance ?? undefined,
            tri_distance: r.tri_distance ?? undefined,
            hyrox_format: r.hyrox_category ?? undefined,
            hyrox_gender: r.hyrox_gender ?? undefined,
            goal_time: r.goal_time ?? undefined,
            tri_goal_swim: r.goal_swim_time ?? undefined,
            tri_goal_bike: r.goal_bike_time ?? undefined,
            tri_goal_run: r.goal_run_time ?? undefined,
          }))
          setForm(prev => ({ ...prev, goal_races: races }))
        }

        if (recsRes.data) {
          const recs = (recsRes.data as { sport: string; distance_label: string; performance: string }[])
            .filter(r => r.sport && r.distance_label && r.performance)
          setPersonalRecords(recs)
        }
      } finally {
        setGoalRacesLoading(false)
      }
    }
    void fetchInitialData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Supabase context fetch ─────────────────────────────────────
  async function fetchAthleteContext() {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return { profil: null, zones: null, activities: [], calendrier: [], sante: [], userId: null }

      const cutoff = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
      const today = new Date().toISOString().slice(0, 10)

      const [profil, zones, activities, events, health] = await Promise.all([
        sb.from('athlete_performance_profile').select('*').eq('user_id', user.id).single().then(r => r.data ?? null),
        sb.from('athlete_zones').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single().then(r => r.data ?? null),
        sb.from('activities').select('id,sport,date,duration,distance,load').eq('user_id', user.id).gte('date', cutoff).order('date', { ascending: false }).limit(50).then(r => r.data ?? []),
        sb.from('calendar_events').select('*').eq('user_id', user.id).gte('date', today).limit(20).then(r => r.data ?? []),
        sb.from('metrics_daily').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(14).then(r => r.data ?? []),
      ])

      return { profil, zones, activities, calendrier: events, sante: health, userId: user.id }
    } catch {
      return { profil: null, zones: null, activities: [], calendrier: [], sante: [], userId: null }
    }
  }

  // ── Generate program ───────────────────────────────────────────
  async function generate(modification?: string) {
    setPhase('generating')
    setError(null)
    setRetryable(false)
    try {
      const ctx = await fetchAthleteContext()
      const body: Record<string, unknown> = {
        questionnaire: form,
        profil: ctx.profil ?? null,
        zones: ctx.zones ?? null,
        historique_90j: ctx.activities ?? [],
        calendrier_objectifs: ctx.calendrier ?? [],
        sante: ctx.sante ?? [],
      }
      if (modification && program) {
        body.modification = modification
        body.programme_actuel = program as unknown as Record<string, unknown>
      }
      const res = await fetch('/api/training-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json() as { program?: GeneratedTrainingPlan; error?: string }
      // Diagnostic : on inspecte aussi les clés alternatives que l'agent
      // pourrait renvoyer (programme/semaines/blocs au top-level), via cast ciblé.
      const rawData = data as unknown as {
        programme?: { blocs?: unknown }
        semaines?: unknown[]
      }
      console.log('FULL DATA:', JSON.stringify(data, null, 2))
      console.log('PROGRAMME:', rawData.programme)
      console.log('BLOCS:', rawData.programme?.blocs)
      console.log('SEMAINES:', rawData.semaines?.length)
      console.log('--- clés correctes (data.program.*) ---')
      console.log('PROGRAM:', data?.program)
      console.log('BLOCS PERIODISATION:', data?.program?.blocs_periodisation)
      console.log('SEMAINES COUNT:', data?.program?.semaines?.length)
      console.log('SEMAINE 0:', JSON.stringify(data?.program?.semaines?.[0], null, 2))

      // === Logs diagnostic explicitement demandés pour le shape check ===
      // Placés AVANT le gate structureInvalid (= premier rendu conditionnel
      // qui peut court-circuiter la suite) pour qu'ils apparaissent toujours.
      const trainingPlanData = data as unknown as Record<string, unknown>
      console.log('=== TRAINING PLAN DATA ===')
      console.log(JSON.stringify(trainingPlanData, null, 2))
      console.log('type:', typeof trainingPlanData)
      console.log('keys:', trainingPlanData ? Object.keys(trainingPlanData) : 'null')
      console.log('programme:', trainingPlanData?.programme)
      console.log('semaines:', trainingPlanData?.semaines)
      console.log('program:', trainingPlanData?.program)
      console.log('weeks:', trainingPlanData?.weeks)

      // Validation du JSON reçu
      console.log('[training-plan] program received:', JSON.stringify(data.program, null, 2))

      // Normalisation défensive : certains agents peuvent renvoyer des clés
      // alternatives (weeks/blocks en anglais, ou double-wrap {programme: {...}}).
      // On accepte les deux formats avant validation.
      const rawProg = data.program as unknown as Record<string, unknown> | null | undefined
      const maybeWrapped = rawProg && typeof rawProg === 'object' && 'programme' in rawProg
        ? (rawProg.programme as Record<string, unknown>)
        : rawProg
      const prog = maybeWrapped ? ({
        ...maybeWrapped,
        semaines: maybeWrapped.semaines ?? maybeWrapped.weeks,
        blocs_periodisation: maybeWrapped.blocs_periodisation ?? maybeWrapped.blocs ?? maybeWrapped.blocks,
      } as unknown as GeneratedTrainingPlan) : null

      const semainesArr = prog && Array.isArray(prog.semaines) ? prog.semaines : null
      const structureInvalid = !prog || !semainesArr || semainesArr.length === 0

      if (data.error || structureInvalid) {
        const errMsg = data.error ?? 'Erreur de génération'
        const isParseErr = errMsg.toLowerCase().includes('json') || errMsg.toLowerCase().includes('parse') || errMsg.toLowerCase().includes('unterminated') || structureInvalid
        setError(isParseErr ? 'La génération a rencontré un problème.' : errMsg)
        setRetryable(isParseErr)
        setPhase(program ? 'result' : 'questionnaire')
        return
      }
      setProgram(prog)
      setShowAllWeeks(false)
      setGeneratedAt(new Date())
      // Record conversation
      const totalSeances = prog.semaines.reduce((s, w) => s + (w.seances ?? []).length, 0)
      const userMsg = `Créer un plan d'entraînement — ${form.sport_principal} — ${prog.duree_semaines} semaines — ${form.course_cible_nom || form.niveau_vise}`
      const aiMsg = `**${prog.nom}**\n\n${prog.objectif_principal}\n\n**${prog.duree_semaines} semaines · ${totalSeances} séances au total**\n\n${(prog.conseils_adaptation ?? []).slice(0, 3).map(c => `• ${c}`).join('\n')}`
      onRecordConv(userMsg, aiMsg)
      setPhase('result')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur réseau'
      const isParseErr = msg.toLowerCase().includes('json') || msg.toLowerCase().includes('parse') || msg.toLowerCase().includes('unterminated')
      setError(isParseErr ? 'La génération a rencontré un problème.' : msg)
      setRetryable(isParseErr)
      setPhase(program ? 'result' : 'questionnaire')
    }
  }

  // ── Save to planned_sessions ───────────────────────────────────
  async function saveToPlanning(mode: 'check'|'replace'|'merge') {
    if (!program) return

    // MODE CHECK : vérifier les conflits
    if (mode === 'check') {
      setSaving(true)
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { setSaving(false); return }
        const firstWeekStart = startDate
        const lastWeekStart = addWeeks(startDate, program.duree_semaines - 1)
        const { data: existing } = await sb.from('planned_sessions').select('id').eq('user_id', user.id).gte('week_start', firstWeekStart).lte('week_start', lastWeekStart)
        if (existing && existing.length > 0) {
          setConflictInfo({ count: existing.length, ids: existing.map(r => r.id as string) })
          setPlanStep('conflict')
        } else {
          setPlanStep('confirm')
        }
      } catch { setPlanStep('confirm') }
      setSaving(false)
      return
    }

    // MODE REPLACE ou MERGE : insérer
    setPlanStep('inserting')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setPlanStep('error'); return }

      // Si replace : supprimer les existants
      if (mode === 'replace' && conflictInfo) {
        await sb.from('planned_sessions').delete().in('id', conflictInfo.ids)
      }

      // 1. Archiver les plans actifs existants (un seul plan actif à la fois)
      await sb.from('training_plans')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('status', 'active')

      // 2. Créer le training_plan parent
      const lastWeekStart = addWeeks(startDate, program.duree_semaines - 1)
      const endDateSunday = addDays(lastWeekStart, 6)
      const sportsAcrossWeeks = Array.from(new Set(
        (program.semaines ?? [])
          .flatMap(w => (w.seances ?? []).map(s => s.sport))
          .filter((s): s is string => typeof s === 'string' && s.length > 0)
      ))

      // Defensive: AI may return `name` instead of `nom` — never send undefined to a NOT NULL column
      const planName = program.nom
        ?? (program as unknown as { name?: string }).name
        ?? 'Plan d\'entraînement'

      const { error: planInsertErr } = await sb.from('training_plans').insert({
        user_id:             user.id,
        name:                planName,
        objectif_principal:  program.objectif_principal ?? null,
        duree_semaines:      program.duree_semaines,
        start_date:          startDate,
        end_date:            endDateSunday,
        sports:              sportsAcrossWeeks,
        blocs_periodisation: program.blocs_periodisation ?? [],
        conseils_adaptation: program.conseils_adaptation ?? [],
        points_cles:         program.points_cles ?? [],
        ai_context: {
          questionnaire: form,
          program,
          generated_at: (generatedAt ?? new Date()).toISOString(),
        },
        status: 'active',
      })

      if (planInsertErr) {
        console.error('[saveToPlanning] training_plans insert failed:', planInsertErr.message, planInsertErr)
      }

      // Fetch the just-inserted plan id with a separate SELECT
      // (avoids PostgREST return=representation quirks with RLS)
      let planId: string | undefined
      if (!planInsertErr) {
        const { data: planRow } = await sb.from('training_plans')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .eq('start_date', startDate)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        planId = planRow?.id as string | undefined
      }

      // 3. Construire la liste des séances à insérer
      // Si merge : récupérer les jours déjà occupés
      let occupiedKeys = new Set<string>()
      if (mode === 'merge') {
        const firstWeekStart = startDate
        const { data: existing2 } = await sb.from('planned_sessions').select('week_start,day_index').eq('user_id', user.id).gte('week_start', firstWeekStart).lte('week_start', lastWeekStart)
        if (existing2) {
          occupiedKeys = new Set(existing2.map(r => `${r.week_start as string}_${r.day_index as number}`))
        }
      }

      let created = 0
      let errors = 0

      for (const semaine of program.semaines) {
        const weekStart = addWeeks(startDate, semaine.numero - 1)
        for (const seance of (semaine.seances ?? [])) {
          // Si merge, skip si le jour est déjà occupé
          if (mode === 'merge' && occupiedKeys.has(`${weekStart}_${seance.jour}`)) continue

          // Snapshot immuable de la version IA pour calcul de diff ultérieur
          const originalContent = {
            sport:        seance.sport,
            titre:        seance.titre,
            time:         seance.heure ?? null,
            duration_min: seance.duree_min,
            tss:          seance.tss ?? null,
            intensity:    seance.intensite ?? null,
            notes:        seance.notes ?? null,
            rpe:          seance.rpe ?? null,
            blocs:        seance.blocs ?? [],
          }

          // Normalise les noms de sport (sortie IA en français) vers les codes SportType valides
          const sportMap: Record<string,string> = {
            'Running':'run','Course':'run','Course à pied':'run','Trail':'run','Trail running':'run',
            'Cyclisme':'bike','Vélo':'bike','Velo':'bike','Cycling':'bike','Virtual ride':'bike',
            'Natation':'swim','Swimming':'swim',
            'Musculation':'gym','Gym':'gym','Fitness':'gym',
            'Hyrox':'hyrox',
            'Rowing':'rowing','Aviron':'rowing',
          }
          const normSport = (raw:string):string =>
            sportMap[raw] ?? sportMap[raw?.trim()] ?? raw?.toLowerCase()

          const row = {
            user_id:          user.id,
            plan_id:          planId ?? null,
            week_start:       weekStart,
            day_index:        seance.jour,
            sport:            normSport(seance.sport),
            title:            seance.titre,
            time:             seance.heure ?? null,
            duration_min:     seance.duree_min,
            tss:              seance.tss ?? null,
            status:           'planned',
            intensity:        seance.intensite ?? null,
            notes:            seance.notes ?? null,
            rpe:              seance.rpe ?? null,
            blocks:           seance.blocs ?? [],
            plan_variant:     'A',
            validation_data:  {},
            source:           'training_plan',
            original_content: originalContent,
          }
          const { error: insertErr } = await sb.from('planned_sessions').insert(row)
          if (insertErr) { errors++ } else { created++ }
        }
      }

      setPlanStats({ created, errors })
      setConflictInfo(null)
      setPlanStep(errors > 0 && created === 0 ? 'error' : 'success')
    } catch (e) {
      console.error('[saveToPlanning]', e)
      setPlanStep('error')
    }
  }

  // ─────────────────────────────────────────────────────────────
  // PHASE : gate (TEMPORAIREMENT DÉSACTIVÉE — à réactiver plus tard)
  // ─────────────────────────────────────────────────────────────
  /*
  if (phase === 'gate') {
    return (
      <div style={{ padding: '16px 0 4px' }}>
        <div style={{
          borderRadius: 12,
          border: '1px solid rgba(139,92,246,0.3)',
          background: 'rgba(139,92,246,0.06)',
          padding: 20,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>⚡</div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ai-text)', margin: '0 0 8px', fontFamily: 'Syne,sans-serif' }}>
            Zeus requis
          </p>
          <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 16px', lineHeight: 1.6 }}>
            La création de programme d&apos;entraînement complet nécessite <strong>Zeus</strong>, le modèle le plus puissant de THW Coach. Il analyse en profondeur ton profil, tes données historiques et tes objectifs pour générer un programme périodisé sur-mesure.
          </p>
          <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 16px', lineHeight: 1.5 }}>
            Active Zeus depuis le sélecteur de modèle (icône ⚡ dans l&apos;en-tête), puis relance cette action.
          </p>
          <button
            onClick={onCancel}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}
          >
            Fermer
          </button>
        </div>
      </div>
    )
  }
  */

  // ─────────────────────────────────────────────────────────────
  // PHASE : intro — checklist de préparation du profil
  // ─────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <TpIntroScreen
        onContinue={() => setPhase('questionnaire')}
        onCancel={onCancel}
      />
    )
  }

  // ─────────────────────────────────────────────────────────────
  // PHASE : generating
  // ─────────────────────────────────────────────────────────────
  if (phase === 'generating') {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid rgba(139,92,246,0.2)',
          borderTop: '3px solid #8b5cf6',
          animation: 'ai_spin 0.8s linear infinite',
          margin: '0 auto 16px',
        }} />
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ai-text)', margin: '0 0 8px' }}>
          Ton programme est en cours de création…
        </p>
        <p style={{ fontSize: 12, color: 'var(--ai-dim)', margin: 0, lineHeight: 1.6 }}>
          Analyse de ton profil et construction du plan personnalisé. Cela peut prendre quelques secondes.
        </p>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // PHASE : result
  // ─────────────────────────────────────────────────────────────

  function formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch { return dateStr }
  }

  if (phase === 'result' && program) {
    const totalSeances = program.semaines.reduce((s, w) => s + (w.seances ?? []).length, 0)
    const weeksToShow = showAllWeeks ? program.semaines : program.semaines.slice(0, 2)

    // Déduire les sports depuis la semaine 1
    const sportsS1 = Array.from(new Set(
      (program.semaines[0]?.seances ?? []).map(s => s.sport)
    ))
    const sportsLabel = sportsS1.length > 0 ? sportsS1.join(' · ') : form.sport_principal

    // Couleur badge selon type de semaine — null-safe : si l'agent omet
    // le champ `type` sur une semaine, le .toLowerCase() throw et casse
    // tout le map des semaines.
    function weekBadgeStyle(type: string | null | undefined): React.CSSProperties {
      const t = (type ?? '').toLowerCase()
      if (t.includes('deload')) return { background: 'rgba(107,114,128,0.12)', color: '#6b7280' }
      if (t.includes('base')) return { background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }
      if (t.includes('intensit')) return { background: 'rgba(249,115,22,0.12)', color: '#f97316' }
      if (t.includes('spécif') || t.includes('specif')) return { background: 'rgba(239,68,68,0.12)', color: '#ef4444' }
      return { background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }
    }

    // Copie en markdown du programme complet dans le clipboard.
    // On balaye toutes les semaines ; celles avec seances détaillées
    // produisent des bullets, celles résumées produisent juste le
    // note_coach.
    async function copyPlan(): Promise<void> {
      if (!program) return
      const lines: string[] = []
      lines.push(`# ${program.nom}`)
      if (program.objectif_principal) lines.push(`*${program.objectif_principal}*`)
      lines.push('')
      lines.push(`**${program.duree_semaines} semaines · ${totalSeances} séances détaillées · ${sportsLabel}**`)
      lines.push(`Du ${formatDate(startDate)} au ${formatDate(addWeeks(startDate, program.duree_semaines - 1))}`)
      lines.push('')
      if ((program.blocs_periodisation ?? []).length > 0) {
        lines.push('## Périodisation')
        for (const b of program.blocs_periodisation ?? []) {
          lines.push(`- **${b.nom}** (${b.type}) · S${b.semaine_debut}-S${b.semaine_fin} · ${b.volume_hebdo_h}h/sem`)
        }
        lines.push('')
      }
      lines.push('## Programme')
      for (const sem of program.semaines ?? []) {
        lines.push(`### Semaine ${sem.numero} — ${sem.theme} [${sem.type}] — ${sem.volume_h}h · TSS ${sem.tss_semaine}`)
        if ((sem.seances ?? []).length > 0) {
          for (const s of sem.seances ?? []) {
            const day = TP_JOURS_FULL[s.jour] ?? `J${s.jour}`
            const extras = [s.duree_min ? `${s.duree_min}min` : null, s.tss ? `TSS ${s.tss}` : null, s.intensite ?? null].filter(Boolean).join(' · ')
            lines.push(`- **${day}** · ${s.sport} — ${s.titre}${extras ? ` (${extras})` : ''}`)
            if (s.notes) lines.push(`  _${s.notes}_`)
          }
        } else if (sem.note_coach) {
          lines.push(`_${sem.note_coach}_`)
        }
        lines.push('')
      }
      if ((program.conseils_adaptation ?? []).length > 0) {
        lines.push('## Conseils d\'adaptation')
        for (const c of program.conseils_adaptation ?? []) lines.push(`- ${c}`)
        lines.push('')
      }
      if ((program.points_cles ?? []).length > 0) {
        lines.push('## Points clés')
        for (const pt of program.points_cles ?? []) lines.push(`- ${pt}`)
      }
      const md = lines.join('\n')
      try {
        await navigator.clipboard.writeText(md)
        setCopyFeedback('copied')
        setTimeout(() => setCopyFeedback('idle'), 2000)
      } catch (e) {
        console.log('[training-plan] clipboard failed:', e instanceof Error ? e.message : String(e))
      }
    }

    const modalCard: React.CSSProperties = {
      background: 'var(--ai-bg)',
      borderRadius: 14,
      padding: 24,
      maxWidth: 340,
      width: '90%',
    }
    const modalOverlay: React.CSSProperties = {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }

    return (
      <div style={{ padding: '8px 0 16px', animation: 'tp_fadein 0.35s ease-out' }}>
        <style>{`@keyframes tp_fadein { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>

        {/* ── HEADER ─────────────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--ai-text)', margin: '0 0 4px', fontFamily: 'Syne,sans-serif' }}>
            {program.nom}
          </p>
          <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 10px' }}>
            {program.objectif_principal}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 99, background: 'rgba(107,114,128,0.12)', color: 'var(--ai-mid)' }}>
              {program.duree_semaines} semaines
            </span>
            <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 99, background: 'rgba(107,114,128,0.12)', color: 'var(--ai-mid)' }} title="Séances détaillées sur S1 et S2 uniquement. Les semaines suivantes sont résumées.">
              {totalSeances} séances détaillées
            </span>
            <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 99, background: 'rgba(107,114,128,0.12)', color: 'var(--ai-mid)' }}>
              {sportsLabel}
            </span>
          </div>
          {/* Date range + generated at */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--ai-dim)' }}>
              Du {formatDate(startDate)} au {formatDate(addWeeks(startDate, program.duree_semaines - 1))}
            </span>
            {generatedAt && (
              <span style={{ fontSize: 10, color: 'var(--ai-dim)', opacity: 0.8 }}>
                · Généré le {generatedAt.toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* ── BLOCS PÉRIODISATION ──────────────────────── */}
        {(program.blocs_periodisation ?? []).length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Périodisation
            </p>
            <svg
              width="100%" viewBox="0 0 400 56"
              preserveAspectRatio="none"
              style={{ display: 'block', borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}
            >
              {(() => {
                const blocs = program.blocs_periodisation ?? []
                const total = program.duree_semaines || 1
                let offsetX = 0
                return blocs.map((b, i) => {
                  const dur = b.semaine_fin - b.semaine_debut + 1
                  const widthPct = dur / total
                  const x = offsetX * 400
                  const w = widthPct * 400
                  offsetX += widthPct
                  const color = TP_BLOC_COLORS[b.type] ?? '#6b7280'
                  // Label court : uniquement le type ("Base", "Intensité", etc.)
                  // + nombre de semaines. La légende en dessous a le nom complet.
                  // On cache entièrement si la barre est trop étroite.
                  const label = `${b.type} · ${dur}s`
                  const fontSize = w > 60 ? 11 : w > 36 ? 9 : 0
                  // Deuxième ligne optionnelle : numéro séquentiel
                  return (
                    <g key={i}>
                      <rect x={x} y={0} width={w} height={56} fill={color} opacity={0.85}>
                        <title>{`${b.nom} — ${b.type}\nS${b.semaine_debut} à S${b.semaine_fin} (${dur} sem)\n${b.description}`}</title>
                      </rect>
                      {fontSize > 0 && (
                        <text
                          x={x + w / 2} y={32}
                          textAnchor="middle"
                          fontSize={fontSize}
                          fill="#fff"
                          fontWeight="700"
                          style={{ pointerEvents: 'none' }}
                        >
                          {label}
                        </text>
                      )}
                    </g>
                  )
                })
              })()}
            </svg>
            {/* Légendes */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(program.blocs_periodisation ?? []).map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: TP_BLOC_COLORS[b.type] ?? '#6b7280', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--ai-dim)' }}>
                    {b.nom} · S{b.semaine_debut}-S{b.semaine_fin} · {b.semaine_fin - b.semaine_debut + 1}sem · {b.volume_hebdo_h}h/sem
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── DATE DE DÉBUT ─────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--ai-mid)' }}>Début du programme :</span>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            style={{ ...tpInputStyle(), width: 'auto' }}
          />
        </div>

        {/* ── SEMAINES DÉTAILLÉES ──────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Programme détaillé
          </p>
          {weeksToShow.map(semaine => {
            const hasSeances = (semaine.seances ?? []).length > 0
            return (
            <div key={semaine.numero} style={{
              border: '1px solid var(--ai-border)',
              borderRadius: 10,
              background: 'var(--ai-bg2)',
              padding: hasSeances ? 12 : '8px 12px',
              marginBottom: hasSeances ? 10 : 4,
            }}>
              {/* Header card */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: hasSeances ? 8 : 0, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ai-text)' }}>
                    S{semaine.numero}
                  </span>
                  {' '}
                  <span style={{ fontSize: 12, color: 'var(--ai-mid)' }}>{semaine.theme}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                    ...weekBadgeStyle(semaine.type),
                  }}>
                    {semaine.type}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ai-dim)', fontVariantNumeric: 'tabular-nums' }}>
                    {semaine.volume_h}h · TSS {semaine.tss_semaine}
                  </span>
                </div>
              </div>

              {/* Séances */}
              {(semaine.seances ?? []).length > 0 && (semaine.seances ?? []).map((seance, si) => (
                <div key={si} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 0',
                  borderTop: si > 0 ? '1px solid var(--ai-border)' : 'none',
                }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ai-dim)', minWidth: 28 }}>
                    {TP_JOURS[seance.jour] ?? '?'}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                    background: 'rgba(139,92,246,0.12)', color: '#8b5cf6',
                  }}>
                    {seance.sport}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ai-text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {seance.titre}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ai-dim)', flexShrink: 0 }}>
                    {seance.duree_min}min
                  </span>
                  {seance.tss > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 99,
                      background: 'rgba(0,0,0,0.12)', color: 'var(--ai-mid)', flexShrink: 0,
                    }}>
                      TSS {seance.tss}
                    </span>
                  )}
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: TP_INTENSITE_COLORS[seance.intensite] ?? '#6b7280',
                  }} title={seance.intensite} />
                  {(seance.blocs ?? []).length > 0 && (
                    <svg width={48} height={18} style={{ flexShrink: 0 }}>
                      {(seance.blocs ?? []).map((b, bi) => {
                        const barsCount = Math.max((seance.blocs ?? []).length, 1)
                        const x = bi * (48 / barsCount)
                        const w = Math.max(1, 48 / barsCount - 1)
                        const h = Math.max(2, (b.zone / 5) * 18)
                        const colors = ['#9ca3af','#3b82f6','#22c55e','#f97316','#ef4444','#a855f7']
                        const titleStr = b.watts != null ? `${b.nom} - ${b.watts}W` : b.allure ? `${b.nom} - ${b.allure}` : b.nom
                        return (
                          <rect key={bi} x={x} y={18 - h} width={w} height={h} fill={colors[b.zone] ?? '#9ca3af'} rx={1}>
                            <title>{titleStr}</title>
                          </rect>
                        )
                      })}
                    </svg>
                  )}
                </div>
              ))}

              {/* Note coach (semaines résumées) — version compacte, inline */}
              {!hasSeances && semaine.note_coach && (
                <p style={{ fontStyle: 'italic', fontSize: 11, color: 'var(--ai-mid)', margin: '4px 0 0', lineHeight: 1.4 }}>
                  {semaine.note_coach}
                </p>
              )}
            </div>
            )
          })}

          {program.semaines.length > 2 && (
            <button
              onClick={() => setShowAllWeeks(v => !v)}
              style={{ fontSize: 12, color: '#8b5cf6', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0', fontWeight: 600 }}
            >
              {showAllWeeks ? '▲ Masquer' : `▼ Voir les ${program.semaines.length - 2} semaines suivantes`}
            </button>
          )}
        </div>

        {/* ── CONSEILS ADAPTATION ──────────────────────── */}
        {(program.conseils_adaptation ?? []).length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Conseils d&apos;adaptation
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(program.conseils_adaptation ?? []).map((c, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--ai-mid)', lineHeight: 1.6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 3 }}>
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── POINTS CLÉS ──────────────────────────────── */}
        {(program.points_cles ?? []).length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Points clés
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(program.points_cles ?? []).map((pt, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--ai-mid)', lineHeight: 1.6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00c8e0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 3 }}>
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" fill="#00c8e0" />
                  </svg>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── GRAPHIQUE VOLUME ──────────────────────── */}
        {program.semaines.length > 0 && (() => {
          const semaines = program.semaines
          const maxH = Math.max(...semaines.map(s => s.volume_h ?? 0), 1)
          const chartH = 80
          const chartW = 400
          const barW = Math.max(2, chartW / semaines.length - 2)
          const stepX = chartW / semaines.length

          function getBarColor(type: string | null | undefined): string {
            const t = (type ?? '').toLowerCase()
            if (t.includes('deload')) return '#86efac'
            if (t.includes('base')) return '#2563eb'
            if (t.includes('intensit')) return '#f97316'
            if (t.includes('spécif') || t.includes('specif')) return '#ef4444'
            return '#8b5cf6'
          }

          const yPad = 24 // espace à gauche pour les labels d'heures
          return (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Volume hebdomadaire
                </p>
                <span style={{ fontSize: 10, color: 'var(--ai-dim)' }}>
                  max {Math.round(maxH)}h · moy {Math.round(semaines.reduce((s, w) => s + (w.volume_h ?? 0), 0) / Math.max(semaines.length, 1))}h
                </span>
              </div>
              <svg width="100%" viewBox={`0 0 ${chartW + yPad} ${chartH + 20}`} preserveAspectRatio="none" style={{ display: 'block' }}>
                {/* Axe Y guides + labels */}
                {[0, 0.5, 1].map((frac, i) => {
                  const y = chartH - frac * chartH
                  const value = Math.round(maxH * frac)
                  return (
                    <g key={i}>
                      <line x1={yPad} y1={y} x2={chartW + yPad} y2={y}
                        stroke="rgba(107,114,128,0.2)" strokeWidth={1} strokeDasharray="4 3" />
                      <text x={yPad - 3} y={y + 3} textAnchor="end" fontSize={9} fill="var(--ai-dim)" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {value}h
                      </text>
                    </g>
                  )
                })}
                {/* Barres */}
                {semaines.map((sem, i) => {
                  const h = Math.max(2, ((sem.volume_h ?? 0) / maxH) * chartH)
                  const x = yPad + i * stepX + (stepX - barW) / 2
                  const y = chartH - h
                  const color = getBarColor(sem.type)
                  const label = semaines.length <= 16 ? `S${sem.numero}` : (i % 2 === 0 ? `S${sem.numero}` : '')
                  return (
                    <g key={i}>
                      <rect x={x} y={y} width={barW} height={h} fill={color} opacity={0.8} rx={2}>
                        <title>{`S${sem.numero} — ${sem.theme}\n${sem.volume_h}h · TSS ${sem.tss_semaine}`}</title>
                      </rect>
                      {label && (
                        <text x={yPad + i * stepX + stepX / 2} y={chartH + 14} textAnchor="middle" fontSize={9} fill="var(--ai-dim)">
                          {label}
                        </text>
                      )}
                    </g>
                  )
                })}
              </svg>
            </div>
          )
        })()}

        {/* ── PROGRAMME ADAPTATIF ──────────────────── */}
        <div style={{
          borderRadius: 10,
          border: '1px solid var(--ai-border)',
          background: 'var(--ai-bg2)',
          padding: 16,
          marginBottom: 20,
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ai-text)', margin: '0 0 10px', fontFamily: 'Syne,sans-serif' }}>
            Un programme qui évolue avec toi
          </p>
          <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 8px', lineHeight: 1.7 }}>
            Ce programme n&apos;est pas figé. Il s&apos;adapte en permanence à ta progression, ta fatigue, ton sommeil et aux aléas de ta vie.
          </p>
          <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 8px', lineHeight: 1.7 }}>
            Si tu rates une séance, si tu te blesses, si tu surperformes — le programme se recalibrera. Plus tu fournis de retours, plus il devient précis.
          </p>
          <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: 0, lineHeight: 1.7 }}>
            Chaque semaine, l&apos;IA analysera tes données (TSB, HRV, RPE réel vs prévu, qualité du sommeil) pour ajuster la semaine suivante automatiquement.
          </p>
        </div>

        {/* ── BOUTONS ACTIONS ── */}
        <div style={{ borderTop: '1px solid var(--ai-border)', marginTop: 16, marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { setModifyText(''); setModifyChecks([]); setPhase('modifying') }}
            style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer' }}
          >
            Modifier
          </button>
          <button
            onClick={() => { void copyPlan() }}
            style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'transparent', color: copyFeedback === 'copied' ? '#22c55e' : 'var(--ai-mid)', fontSize: 12, cursor: 'pointer', transition: 'color 0.14s' }}
          >
            {copyFeedback === 'copied' ? 'Copié ✓' : 'Copier'}
          </button>
          <button
            onClick={() => void saveToPlanning('check')}
            disabled={saving}
            style={{
              flex: 2, padding: '9px', borderRadius: 9, border: 'none',
              background: saving ? 'rgba(139,92,246,0.3)' : 'linear-gradient(135deg,#8b5cf6,#5b6fff)',
              color: '#fff', fontSize: 12, fontWeight: 700, cursor: saving ? 'default' : 'pointer',
            }}
          >
            {saving ? 'Vérification…' : 'Ajouter au Planning'}
          </button>
        </div>

        {/* ── MODALS PLANNING ──────────────────────────── */}

        {/* conflict */}
        {planStep === 'conflict' && conflictInfo && (
          <div style={modalOverlay}>
            <div style={modalCard}>
              <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--ai-text)', margin: '0 0 10px', fontFamily: 'Syne,sans-serif' }}>
                Séances existantes détectées
              </p>
              <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 16px', lineHeight: 1.6 }}>
                Des séances existent déjà sur cette période ({conflictInfo.count} séance{conflictInfo.count > 1 ? 's' : ''}). Que souhaitez-vous faire ?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={() => void saveToPlanning('replace')}
                  style={{ background: '#ef4444', color: '#fff', padding: '10px', borderRadius: 9, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  Remplacer tout
                </button>
                <button
                  onClick={() => void saveToPlanning('merge')}
                  style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', padding: '10px', borderRadius: 9, border: '1px solid #8b5cf6', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  Fusionner
                </button>
                <button
                  onClick={() => { setPlanStep('idle'); setConflictInfo(null) }}
                  style={{ background: 'transparent', color: 'var(--ai-mid)', padding: '10px', borderRadius: 9, border: '1px solid var(--ai-border)', fontSize: 12, cursor: 'pointer' }}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* confirm */}
        {planStep === 'confirm' && (
          <div style={modalOverlay}>
            <div style={modalCard}>
              <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--ai-text)', margin: '0 0 10px', fontFamily: 'Syne,sans-serif' }}>
                Ajouter au Planning
              </p>
              <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 4px' }}>
                Programme : <strong style={{ color: 'var(--ai-text)' }}>{program.nom}</strong>
              </p>
              <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 4px' }}>
                {program.duree_semaines} semaines · {totalSeances} séances
              </p>
              <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 16px' }}>
                Du {formatDate(startDate)} au {formatDate(addWeeks(startDate, program.duree_semaines - 1))}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setPlanStep('idle')}
                  style={{ flex: 1, background: 'transparent', color: 'var(--ai-mid)', padding: '9px', borderRadius: 9, border: '1px solid var(--ai-border)', fontSize: 12, cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  onClick={() => void saveToPlanning('replace')}
                  style={{ flex: 1, background: 'linear-gradient(135deg,#8b5cf6,#5b6fff)', color: '#fff', padding: '9px', borderRadius: 9, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* inserting */}
        {planStep === 'inserting' && (
          <div style={modalOverlay}>
            <div style={{ ...modalCard, textAlign: 'center' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                border: '3px solid rgba(139,92,246,0.2)',
                borderTop: '3px solid #8b5cf6',
                animation: 'ai_spin 0.8s linear infinite',
                margin: '0 auto 14px',
              }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ai-text)', margin: 0 }}>
                Ajout des séances en cours…
              </p>
            </div>
          </div>
        )}

        {/* success */}
        {planStep === 'success' && (
          <div style={modalOverlay}>
            <div style={{ ...modalCard, textAlign: 'center' }}>
              <p style={{ fontSize: 32, margin: '0 0 10px', color: '#22c55e' }}>✓</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--ai-text)', margin: '0 0 6px', fontFamily: 'Syne,sans-serif' }}>
                Programme ajouté avec succès
              </p>
              <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 4px' }}>
                {planStats.created} séances créées dans le Planning
              </p>
              {planStats.errors > 0 && (
                <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 4px' }}>
                  ({planStats.errors} erreurs ignorées)
                </p>
              )}
              <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 16px' }}>
                Du {formatDate(startDate)} au {formatDate(addWeeks(startDate, program.duree_semaines - 1))}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setPlanStep('idle')}
                  style={{ flex: 1, background: 'transparent', color: 'var(--ai-mid)', padding: '9px', borderRadius: 9, border: '1px solid var(--ai-border)', fontSize: 12, cursor: 'pointer' }}
                >
                  Fermer
                </button>
                <button
                  onClick={() => { window.location.href = `/planning?week=${encodeURIComponent(startDate)}` }}
                  style={{ flex: 1, background: 'linear-gradient(135deg,#8b5cf6,#5b6fff)', color: '#fff', padding: '9px', borderRadius: 9, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  Voir le Planning →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* error */}
        {planStep === 'error' && (
          <div style={modalOverlay}>
            <div style={modalCard}>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#ef4444', margin: '0 0 16px', fontFamily: 'Syne,sans-serif' }}>
                Erreur lors de l&apos;insertion
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setPlanStep('idle')}
                  style={{ flex: 1, background: 'transparent', color: 'var(--ai-mid)', padding: '9px', borderRadius: 9, border: '1px solid var(--ai-border)', fontSize: 12, cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  onClick={() => void saveToPlanning('replace')}
                  style={{ flex: 1, background: 'linear-gradient(135deg,#8b5cf6,#5b6fff)', color: '#fff', padding: '9px', borderRadius: 9, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  Réessayer
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // PHASE : modifying
  // ─────────────────────────────────────────────────────────────
  if (phase === 'modifying') {
    return (
      <div style={{ padding: '8px 0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => setPhase('result')}
            style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ←
          </button>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ai-text)', margin: 0, fontFamily: 'Syne,sans-serif' }}>
            Que veux-tu changer ?
          </p>
        </div>

        <textarea
          value={modifyText}
          onChange={e => setModifyText(e.target.value)}
          placeholder={`Décris librement ce que tu veux modifier...\nEx: Je veux moins de séances par semaine,\nou je veux plus de volume vélo,\nou décale le début de 2 semaines,\nou supprime les séances du dimanche`}
          rows={6}
          style={{
            ...tpInputStyle(),
            resize: 'vertical',
            marginBottom: 16,
            lineHeight: 1.6,
          }}
        />

        {error && <p style={{ fontSize: 12, color: '#ef4444', margin: '0 0 10px' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setPhase('result')}
            style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer' }}
          >
            Retour
          </button>
          <button
            onClick={() => { if (modifyText.trim()) void generate(modifyText.trim()) }}
            disabled={!modifyText.trim()}
            style={{
              flex: 1, padding: '9px', borderRadius: 9, border: 'none',
              background: modifyText.trim() ? 'linear-gradient(135deg,#8b5cf6,#5b6fff)' : 'rgba(139,92,246,0.2)',
              color: '#fff', fontSize: 12, fontWeight: 700, cursor: modifyText.trim() ? 'pointer' : 'default',
            }}
          >
            Appliquer les modifications
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // PHASE : questionnaire
  // ─────────────────────────────────────────────────────────────

  function renderStep() {
    switch (step) {
      // ── BLOC 0 : Objectif ────────────────────────────────────
      case 0: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#8b5cf6', margin: '0 0 4px', fontFamily: 'Syne,sans-serif' }}>
            Objectif et course cible
          </p>

          {/* Sport principal */}
          <div>
            <span style={tpLabelStyle()}>Sport principal</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Running', 'Trail', 'Cyclisme', 'Natation', 'Aviron', 'Hyrox', 'Triathlon', 'Hybride'].map(s => (
                <button key={s} onClick={() => setField('sport_principal', s)} style={tpPillStyle(form.sport_principal === s)}>{s}</button>
              ))}
            </div>
            {form.sport_principal === 'Hybride' && (
              <div style={{ marginTop: 10 }}>
                <span style={{ ...tpLabelStyle(), marginBottom: 6 }}>Sports et importance :</span>
                {(['Running', 'Trail', 'Cyclisme', 'Natation', 'Aviron', 'Hyrox'] as const).map(sp => {
                  const entry = form.sports_hybride.find(e => e.sport === sp)
                  return (
                    <div key={sp} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--ai-mid)', minWidth: 64 }}>{sp}</span>
                      {(['principal', 'secondaire', 'complementaire'] as const).map(imp => (
                        <button key={imp} onClick={() => {
                          const filtered = form.sports_hybride.filter(e => e.sport !== sp)
                          if (entry?.importance === imp) {
                            setField('sports_hybride', filtered)
                          } else {
                            setField('sports_hybride', [...filtered, { sport: sp, importance: imp }])
                          }
                        }} style={tpPillStyle(entry?.importance === imp)}>
                          {imp === 'principal' ? 'Principal' : imp === 'secondaire' ? 'Secondaire' : 'Compl.'}
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Goal of the Year ─────────────────────────────── */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={tpLabelStyle()}>Goal of the Year</span>
              <button
                onClick={() => setField('goal_races', [...form.goal_races, { nom: '', date: '', sport: 'Running', level: 'important', goal_libre: '' }])}
                style={{ fontSize: 11, color: '#8b5cf6', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}
              >+ Course</button>
            </div>

            {/* Chargement */}
            {goalRacesLoading && (
              <p style={{ fontSize: 11, color: 'var(--ai-dim)', textAlign: 'center', padding: '12px 0' }}>Chargement du Race Calendar…</p>
            )}

            {/* Aucune course */}
            {!goalRacesLoading && form.goal_races.length === 0 && (
              <p style={{ fontSize: 11, color: 'var(--ai-dim)', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>
                Aucune course dans ton Race Calendar. Clique &quot;+ Course&quot; pour en ajouter une.
              </p>
            )}

            {/* Cards */}
            {form.goal_races.map((race, idx) => (
              <div key={idx} style={{ border: `1px solid ${LEVEL_COLOR[race.level]}44`, borderRadius: 10, padding: '10px 12px', marginBottom: 8, background: `${LEVEL_COLOR[race.level]}06` }}>

                {/* ─ En-tête : nom · date · × ─ */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    {race.id ? (
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ai-text)', margin: 0 }}>{race.nom}</p>
                    ) : (
                      <input type="text" placeholder="Nom de la course" value={race.nom}
                        onChange={e => updateGoalRace(idx, { nom: e.target.value })}
                        style={{ ...tpInputStyle(), padding: '5px 8px', fontSize: 12, width: '100%' }} />
                    )}
                    <p style={{ fontSize: 10, color: 'var(--ai-dim)', margin: '2px 0 0' }}>
                      {race.date ? new Date(race.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : (
                        <input type="date" value={race.date}
                          onChange={e => updateGoalRace(idx, { date: e.target.value })}
                          style={{ ...tpInputStyle(), padding: '3px 6px', fontSize: 11, marginTop: 4 }} />
                      )}
                    </p>
                  </div>
                  <button onClick={() => setField('goal_races', form.goal_races.filter((_, i) => i !== idx))}
                    style={{ fontSize: 16, lineHeight: 1, color: 'var(--ai-dim)', background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0 }}>×</button>
                </div>

                {/* ─ Niveau (GTY / Principal / Important / Secondaire) ─ */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                  {(['gty', 'main', 'important', 'secondary'] as const).map(lv => (
                    <button key={lv} onClick={() => setGoalRaceLevel(idx, lv)} style={{
                      padding: '4px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                      border: `1px solid ${LEVEL_COLOR[lv]}`,
                      background: race.level === lv ? LEVEL_COLOR[lv] : 'transparent',
                      color: race.level === lv ? '#fff' : LEVEL_COLOR[lv],
                      transition: 'all 0.12s',
                    }}>{LEVEL_LABEL[lv]}</button>
                  ))}
                </div>

                {/* ─ Sport ─ */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                  {(['Running', 'Trail', 'Cyclisme', 'Triathlon', 'Hyrox', 'Natation', 'Aviron'] as const).map(sp => (
                    <button key={sp} onClick={() => updateGoalRace(idx, { sport: sp, run_distance: undefined, tri_distance: undefined, hyrox_format: undefined, velo_type: undefined, aviron_format: undefined, natation_type: undefined })}
                      style={tpPillStyle(race.sport === sp)}>{sp}</button>
                  ))}
                </div>

                {/* ─ Sous-catégories Running ─ */}
                {race.sport === 'Running' && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                    {['5km', '10km', 'Semi', 'Marathon', '100km'].map(d => (
                      <button key={d} onClick={() => updateGoalRace(idx, { run_distance: d })} style={tpPillStyle(race.run_distance === d)}>{d}</button>
                    ))}
                  </div>
                )}

                {/* ─ Sous-catégories Trail ─ */}
                {race.sport === 'Trail' && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                      {['10km', '20km', 'Marathon (~42km)', '50km', '100km', 'Ultra (>100km)'].map(d => (
                        <button key={d} onClick={() => updateGoalRace(idx, { run_distance: d })} style={tpPillStyle(race.run_distance === d)}>{d}</button>
                      ))}
                    </div>
                    <input type="text" placeholder="Dénivelé positif (ex: 3 500 m)" value={race.trail_elevation ?? ''}
                      onChange={e => updateGoalRace(idx, { trail_elevation: e.target.value })}
                      style={{ ...tpInputStyle(), padding: '5px 8px', fontSize: 11, width: '100%' }} />
                  </div>
                )}

                {/* ─ Sous-catégories Triathlon ─ */}
                {race.sport === 'Triathlon' && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                      {['XS (Super Sprint)', 'S (Sprint)', 'M (Olympique)', 'Ironman 70.3', 'Ironman'].map(d => (
                        <button key={d} onClick={() => updateGoalRace(idx, { tri_distance: d })} style={tpPillStyle(race.tri_distance === d)}>{d}</button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {[
                        { label: 'Natation',      value: race.tri_goal_swim ?? '', onCh: (v: string) => updateGoalRace(idx, { tri_goal_swim: v }), fmt: 'hh:mm' },
                        { label: 'T1',             value: race.tri_goal_t1  ?? '', onCh: (v: string) => updateGoalRace(idx, { tri_goal_t1:   v }), fmt: 'mm:ss' },
                        { label: 'Vélo',           value: race.tri_goal_bike ?? '', onCh: (v: string) => updateGoalRace(idx, { tri_goal_bike: v }), fmt: 'hh:mm' },
                        { label: 'T2',             value: race.tri_goal_t2  ?? '', onCh: (v: string) => updateGoalRace(idx, { tri_goal_t2:   v }), fmt: 'mm:ss' },
                        { label: 'Course à pied',  value: race.tri_goal_run ?? '', onCh: (v: string) => updateGoalRace(idx, { tri_goal_run:  v }), fmt: 'hh:mm' },
                      ].map(({ label, value, onCh, fmt }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, color: '#9ca3af', width: 90, flexShrink: 0 }}>{label}</span>
                          <input type="text" placeholder={fmt} value={value}
                            onChange={e => onCh(e.target.value)}
                            style={{ ...tpInputStyle(), padding: '4px 8px', fontSize: 11, flex: 1 }} />
                        </div>
                      ))}
                      {(() => {
                        const total = triTotalSec(race.tri_goal_swim, race.tri_goal_t1, race.tri_goal_bike, race.tri_goal_t2, race.tri_goal_run)
                        if (total === 0) return null
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <span style={{ fontSize: 11, color: '#6b7280', width: 90, flexShrink: 0 }}>Total</span>
                            <span style={{ fontSize: 12, color: '#00c8e0', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{secToHHMMSS(total)}</span>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )}

                {/* ─ Sous-catégories Hyrox ─ */}
                {race.sport === 'Hyrox' && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 5 }}>
                      {(['Solo Open', 'Solo Pro', 'Doubles Mixte', 'Doubles Men', 'Doubles Women', 'Relay 4x'] as const).map(f => (
                        <button key={f} onClick={() => updateGoalRace(idx, { hyrox_format: f })} style={tpPillStyle(race.hyrox_format === f)}>{f}</button>
                      ))}
                    </div>
                    {(race.hyrox_format === 'Solo Open' || race.hyrox_format === 'Solo Pro') && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        {(['Homme', 'Femme'] as const).map(g => (
                          <button key={g} onClick={() => updateGoalRace(idx, { hyrox_gender: g })} style={tpPillStyle(race.hyrox_gender === g)}>{g}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ─ Sous-catégories Cyclisme ─ */}
                {race.sport === 'Cyclisme' && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                      {(['Course un jour', 'Cyclosportive', 'Course par étapes'] as const).map(t => (
                        <button key={t} onClick={() => updateGoalRace(idx, { velo_type: t })} style={tpPillStyle(race.velo_type === t)}>{t}</button>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                      <input type="text" placeholder="Distance (ex: 170 km)" value={race.velo_distance ?? ''}
                        onChange={e => updateGoalRace(idx, { velo_distance: e.target.value })}
                        style={{ ...tpInputStyle(), padding: '5px 8px', fontSize: 11 }} />
                      <input type="text" placeholder="Dénivelé (ex: 4 200 m)" value={race.velo_elevation ?? ''}
                        onChange={e => updateGoalRace(idx, { velo_elevation: e.target.value })}
                        style={{ ...tpInputStyle(), padding: '5px 8px', fontSize: 11 }} />
                      <input type="text" placeholder="Altitude max (ex: 2 642 m)" value={race.velo_altitude_max ?? ''}
                        onChange={e => updateGoalRace(idx, { velo_altitude_max: e.target.value })}
                        style={{ ...tpInputStyle(), padding: '5px 8px', fontSize: 11 }} />
                      <input type="text" placeholder="Cols (ex: 3 cols, Galibier…)" value={race.velo_cols ?? ''}
                        onChange={e => updateGoalRace(idx, { velo_cols: e.target.value })}
                        style={{ ...tpInputStyle(), padding: '5px 8px', fontSize: 11 }} />
                    </div>
                  </div>
                )}

                {/* ─ Sous-catégories Aviron ─ */}
                {race.sport === 'Aviron' && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                    {(['Ergomètre 2000m', 'Ergomètre 500m', 'Ergomètre 6000m', 'Ergomètre 30min', 'En eau 2000m (1x)', 'En eau 2000m (2x)', 'En eau 2000m (4-)', 'En eau 2000m (8+)', 'Head race', 'Aviron de mer'] as const).map(f => (
                      <button key={f} onClick={() => updateGoalRace(idx, { aviron_format: f })} style={tpPillStyle(race.aviron_format === f)}>{f}</button>
                    ))}
                  </div>
                )}

                {/* ─ Sous-catégories Natation ─ */}
                {race.sport === 'Natation' && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                      {(['Open water', 'Piscine'] as const).map(t => (
                        <button key={t} onClick={() => updateGoalRace(idx, { natation_type: t, natation_distance: undefined })} style={tpPillStyle(race.natation_type === t)}>{t}</button>
                      ))}
                    </div>
                    {race.natation_type === 'Open water' && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {['1 km', '2.5 km', '5 km', '10 km', '25 km'].map(d => (
                          <button key={d} onClick={() => updateGoalRace(idx, { natation_distance: d })} style={tpPillStyle(race.natation_distance === d)}>{d}</button>
                        ))}
                      </div>
                    )}
                    {race.natation_type === 'Piscine' && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {['50 m', '100 m', '200 m', '400 m', '800 m', '1 500 m'].map(d => (
                          <button key={d} onClick={() => updateGoalRace(idx, { natation_distance: d })} style={tpPillStyle(race.natation_distance === d)}>{d}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ─ Temps cible (Running, Trail, Aviron, Natation) ─ */}
                {(race.sport === 'Running' || race.sport === 'Trail' || race.sport === 'Aviron' || race.sport === 'Natation' || race.sport === 'Cyclisme') && (
                  <input type="text" placeholder="Temps cible (ex: 3:30:00)" value={race.goal_time ?? ''}
                    onChange={e => updateGoalRace(idx, { goal_time: e.target.value })}
                    style={{ ...tpInputStyle(), padding: '5px 8px', fontSize: 11, marginBottom: 6, width: '100%' }} />
                )}

                {/* ─ Objectif libre ─ */}
                <input type="text" placeholder="Objectif personnel (finir, podium, chrono, sensations…)" value={race.goal_libre}
                  onChange={e => updateGoalRace(idx, { goal_libre: e.target.value })}
                  style={{ ...tpInputStyle(), padding: '5px 8px', fontSize: 11, width: '100%' }} />
              </div>
            ))}
          </div>

          {/* Niveau visé */}
          <div>
            <span style={tpLabelStyle()}>Niveau visé</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {([['finisher', 'Finisher'], ['chrono', 'Chrono cible'], ['perf', 'Performance maximale']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setField('niveau_vise', val)} style={tpPillStyle(form.niveau_vise === val)}>{label}</button>
              ))}
            </div>
            {form.niveau_vise === 'chrono' && (
              <input
                type="text"
                placeholder="Ex: 3h30 au marathon"
                value={form.chrono_cible}
                onChange={e => setField('chrono_cible', e.target.value)}
                style={tpInputStyle()}
              />
            )}
          </div>

          {/* Précision */}
          <div>
            <span style={tpLabelStyle()}>Précisions supplémentaires <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ai-dim)' }}>(optionnel)</span></span>
            <textarea value={form.precision_objectif} onChange={e => setField('precision_objectif', e.target.value)}
              placeholder="Contexte supplémentaire sur vos objectifs..." rows={2}
              style={{ ...tpInputStyle(), resize: 'vertical' }} />
          </div>
        </div>
      )

      // ── BLOC 1 : Profil ──────────────────────────────────────
      case 1: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#8b5cf6', margin: '0 0 4px', fontFamily: 'Syne,sans-serif' }}>
            Profil et historique
          </p>

          <div>
            <span style={tpLabelStyle()}>Expérience sportive</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(['< 1 an', '1-3 ans', '3-5 ans', '> 5 ans'] as const).map(e => (
                <button key={e} onClick={() => setField('experience', e)} style={tpPillStyle(form.experience === e)}>{e}</button>
              ))}
            </div>
          </div>

          <div>
            <span style={tpLabelStyle()}>Volume actuel : {form.volume_actuel}h/semaine</span>
            <input type="range" min={2} max={25} value={form.volume_actuel} onChange={e => setField('volume_actuel', Number(e.target.value))}
              style={{ width: '100%', accentColor: '#8b5cf6' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ai-dim)' }}>
              <span>2h</span><span>25h</span>
            </div>
          </div>

          <div>
            <span style={tpLabelStyle()}>Meilleure performance</span>
            {personalRecords.length > 0 ? (
              <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '10px 12px', marginTop: 6 }}>
                {(() => {
                  const ORDER = ['run', 'trail', 'bike', 'triathlon', 'swim', 'rowing', 'hyrox']
                  const LABELS: Record<string, string> = {
                    run: 'Running', trail: 'Trail', bike: 'Cyclisme',
                    triathlon: 'Triathlon', swim: 'Natation', rowing: 'Aviron', hyrox: 'Hyrox',
                  }
                  // Deduplicate: most recent record per (sport, distance_label)
                  const seen = new Set<string>()
                  const deduped = personalRecords.filter(r => {
                    const key = `${r.sport}||${r.distance_label}`
                    if (seen.has(key)) return false
                    seen.add(key)
                    return true
                  })
                  const groups: Record<string, typeof deduped> = {}
                  for (const r of deduped) {
                    if (!groups[r.sport]) groups[r.sport] = []
                    groups[r.sport].push(r)
                  }
                  const sports = ORDER.filter(s => groups[s])
                  if (sports.length === 0) return null
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {sports.map(sp => (
                        <div key={sp}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#8b5cf6', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {LABELS[sp] ?? sp}
                          </div>
                          {groups[sp].map(r => (
                            <div key={r.distance_label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, paddingBottom: 3 }}>
                              <span style={{ color: 'var(--ai-dim)' }}>{r.distance_label}</span>
                              <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text)', fontWeight: 600 }}>{r.performance}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )
                })()}
                <a
                  href="/performance"
                  style={{ display: 'block', marginTop: 10, fontSize: 11, color: '#8b5cf6', textDecoration: 'none', textAlign: 'right' }}
                >
                  Mettre à jour mes records →
                </a>
              </div>
            ) : (
              <input type="text" placeholder="Ex: 3h45 marathon, 5h ironman..." value={form.meilleure_performance}
                onChange={e => setField('meilleure_performance', e.target.value)} style={tpInputStyle()} />
            )}
          </div>

          <div>
            <span style={tpLabelStyle()}>Programme précédent suivi</span>
            <div style={{ display: 'flex', gap: 6, marginBottom: form.programme_precedent ? 8 : 0 }}>
              <button onClick={() => setField('programme_precedent', true)} style={tpPillStyle(form.programme_precedent)}>Oui</button>
              <button onClick={() => setField('programme_precedent', false)} style={tpPillStyle(!form.programme_precedent)}>Non</button>
            </div>
            {form.programme_precedent && (
              <input type="text" placeholder="Quel programme ? Durée ? Résultats ?" value={form.programme_precedent_detail}
                onChange={e => setField('programme_precedent_detail', e.target.value)} style={tpInputStyle()} />
            )}
          </div>

          <div>
            <span style={tpLabelStyle()}>Forme actuelle</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {([['tres_bonne', 'Très bonne'], ['bonne', 'Bonne'], ['moyenne', 'Moyenne'], ['mauvaise', 'Mauvaise']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setField('forme_actuelle', val)} style={tpPillStyle(form.forme_actuelle === val)}>{label}</button>
              ))}
            </div>
          </div>

          <div>
            <span style={tpLabelStyle()}>Précisions <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ai-dim)' }}>(optionnel)</span></span>
            <textarea value={form.precision_profil} onChange={e => setField('precision_profil', e.target.value)}
              rows={2} style={{ ...tpInputStyle(), resize: 'vertical' }} />
          </div>
        </div>
      )

      // ── BLOC 2 : Disponibilité ───────────────────────────────
      case 2: return (() => {
        // Détection du sport objectif — GTY > Principal > sport_principal
        // Comparaison insensible à la casse pour absorber les valeurs DB
        const gtyRace  = form.goal_races.find(r => r.level === 'gty')
        const mainRace = form.goal_races.find(r => r.level === 'main')
        const raceSport = (gtyRace ?? mainRace)?.sport ?? ''
        const objSport  = (raceSport || form.sport_principal).toLowerCase()
        const isTri   = objSport === 'triathlon'
        const isHyrox = objSport === 'hyrox'

        return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#8b5cf6', margin: '0 0 4px', fontFamily: 'Syne,sans-serif' }}>
            Disponibilité
          </p>

          {/* Séances début / pic — masqués pour Triathlon et Hyrox (remplacés par répartition) */}
          {!isTri && !isHyrox && (
            <>
              <div>
                <span style={tpLabelStyle()}>Séances en début de prépa : {form.seances_debut_prepa}</span>
                <input type="range" min={3} max={12} value={form.seances_debut_prepa} onChange={e => setField('seances_debut_prepa', Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#8b5cf6' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ai-dim)' }}>
                  <span>3</span><span>12</span>
                </div>
              </div>
              <div>
                <span style={tpLabelStyle()}>Séances au pic de la prépa : {form.seances_pic_prepa}</span>
                <input type="range" min={3} max={12} value={form.seances_pic_prepa} onChange={e => setField('seances_pic_prepa', Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#8b5cf6' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ai-dim)' }}>
                  <span>3</span><span>12</span>
                </div>
              </div>
            </>
          )}

          {/* Répartition Triathlon */}
          {isTri && (() => {
            const t = form.repartition_tri
            const total = t.natation + t.velo + t.run + t.muscu
            return (
              <div>
                <span style={tpLabelStyle()}>
                  Séances par discipline — Triathlon
                  <span style={{ marginLeft: 8, fontWeight: 400, color: '#00c8e0', fontSize: 12 }}>
                    Total : {total} séance{total > 1 ? 's' : ''}
                  </span>
                </span>
                {([
                  { key: 'natation' as const, label: 'Natation' },
                  { key: 'velo'     as const, label: 'Vélo' },
                  { key: 'run'      as const, label: 'Run' },
                  { key: 'muscu'    as const, label: 'Muscu' },
                ]).map(({ key, label }) => (
                  <div key={key} style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ai-dim)', marginBottom: 2 }}>
                      <span>{label}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{t[key]}</span>
                    </div>
                    <input type="range" min={0} max={12} value={t[key]}
                      onChange={e => setField('repartition_tri', { ...t, [key]: Number(e.target.value) })}
                      style={{ width: '100%', accentColor: '#8b5cf6' }} />
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Répartition Hyrox */}
          {isHyrox && (() => {
            const h = form.repartition_hyrox
            const total = h.run + h.muscu + h.spe + h.velo
            return (
              <div>
                <span style={tpLabelStyle()}>
                  Séances par discipline — Hyrox
                  <span style={{ marginLeft: 8, fontWeight: 400, color: '#00c8e0', fontSize: 12 }}>
                    Total : {total} séance{total > 1 ? 's' : ''}
                  </span>
                </span>
                {([
                  { key: 'run'   as const, label: 'Run' },
                  { key: 'muscu' as const, label: 'Muscu' },
                  { key: 'spe'   as const, label: 'Spé Hyrox' },
                  { key: 'velo'  as const, label: 'Vélo' },
                ]).map(({ key, label }) => (
                  <div key={key} style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ai-dim)', marginBottom: 2 }}>
                      <span>{label}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{h[key]}</span>
                    </div>
                    <input type="range" min={0} max={12} value={h[key]}
                      onChange={e => setField('repartition_hyrox', { ...h, [key]: Number(e.target.value) })}
                      style={{ width: '100%', accentColor: '#8b5cf6' }} />
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Inclure la musculation — tous sports sauf Triathlon et Hyrox */}
          {!isTri && !isHyrox && (
            <div>
              <span style={tpLabelStyle()}>Inclure la musculation</span>
              <div style={{ display: 'flex', gap: 6, marginBottom: form.include_muscu ? 8 : 0 }}>
                <button onClick={() => setField('include_muscu', true)}  style={tpPillStyle(form.include_muscu)}>Oui</button>
                <button onClick={() => setField('include_muscu', false)} style={tpPillStyle(!form.include_muscu)}>Non</button>
              </div>
              {form.include_muscu && (
                <div>
                  <span style={{ fontSize: 12, color: 'var(--ai-dim)', display: 'block', marginBottom: 4 }}>
                    Séances muscu/semaine : {form.seances_muscu}
                  </span>
                  <input type="range" min={1} max={4} value={form.seances_muscu}
                    onChange={e => setField('seances_muscu', Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#8b5cf6' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ai-dim)' }}>
                    <span>1</span><span>4</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <span style={tpLabelStyle()}>Heures disponibles par semaine : {form.heures_par_semaine}h</span>
            <input type="range" min={3} max={25} value={form.heures_par_semaine} onChange={e => setField('heures_par_semaine', Number(e.target.value))}
              style={{ width: '100%', accentColor: '#8b5cf6' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ai-dim)' }}>
              <span>3h</span><span>25h</span>
            </div>
          </div>

          <div>
            <span style={tpLabelStyle()}>Jours impossibles</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TP_JOURS_FULL.map(j => (
                <button key={j} onClick={() => setField('jours_repos', toggleArr(form.jours_repos, j))} style={tpPillStyle(form.jours_repos.includes(j))}>{j}</button>
              ))}
            </div>
          </div>

          <div>
            <span style={tpLabelStyle()}>Contraintes horaires</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {([['matin', 'Matin uniquement'], ['soir', 'Soir uniquement'], ['midi', 'Midi possible'], ['flexible', 'Flexible']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setField('contraintes_horaires', val)} style={tpPillStyle(form.contraintes_horaires === val)}>{label}</button>
              ))}
            </div>
          </div>

          <div>
            <span style={tpLabelStyle()}>Précisions <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ai-dim)' }}>(optionnel)</span></span>
            <textarea value={form.precision_dispo} onChange={e => setField('precision_dispo', e.target.value)}
              rows={2} style={{ ...tpInputStyle(), resize: 'vertical' }} />
          </div>
        </div>
        )
      })()

      // ── BLOC 3 : Équipement ──────────────────────────────────
      case 3: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#8b5cf6', margin: '0 0 4px', fontFamily: 'Syne,sans-serif' }}>
            Équipement et accès
          </p>

          <div>
            <span style={tpLabelStyle()}>Équipements disponibles</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Piscine', 'Home trainer', 'Salle de musculation', 'Capteur de puissance vélo', 'Montre GPS', 'Ergomètre aviron', 'Matériel Hyrox'].map(eq => (
                <button key={eq} onClick={() => setField('equipements', toggleArr(form.equipements, eq))} style={tpPillStyle(form.equipements.includes(eq))}>{eq}</button>
              ))}
            </div>
          </div>

          <div>
            <span style={tpLabelStyle()}>Précisions <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ai-dim)' }}>(optionnel)</span></span>
            <textarea value={form.precision_equipement} onChange={e => setField('precision_equipement', e.target.value)}
              rows={2} style={{ ...tpInputStyle(), resize: 'vertical' }} />
          </div>
        </div>
      )

      // ── BLOC 4 : Blessures ───────────────────────────────────
      case 4: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#8b5cf6', margin: '0 0 4px', fontFamily: 'Syne,sans-serif' }}>
            Blessures et contraintes
          </p>

          {([
            ['blessures_passees', 'blessures_detail', 'Blessures passées importantes', 'Décrivez les blessures passées...'],
            ['gene_recente', 'gene_detail', 'Gêne ou douleur récente', 'Décrivez la gêne actuelle...'],
            ['contraintes_permanentes', 'contraintes_detail', 'Contraintes permanentes', 'Contraintes anatomiques ou physiologiques...'],
            ['antecedents', 'antecedents_detail', 'Antécédents médicaux', 'Antécédents cardiaques, pathologies...'],
          ] as [keyof TrainingPlanForm, keyof TrainingPlanForm, string, string][]).map(([boolKey, textKey, label, ph]) => (
            <div key={boolKey}>
              <span style={tpLabelStyle()}>{label}</span>
              <div style={{ display: 'flex', gap: 6, marginBottom: (form[boolKey] as boolean) ? 8 : 0 }}>
                <button onClick={() => setField(boolKey, true as TrainingPlanForm[typeof boolKey])} style={tpPillStyle(form[boolKey] as boolean)}>Oui</button>
                <button onClick={() => setField(boolKey, false as TrainingPlanForm[typeof boolKey])} style={tpPillStyle(!(form[boolKey] as boolean))}>Non</button>
              </div>
              {(form[boolKey] as boolean) && (
                <textarea value={form[textKey] as string} onChange={e => setField(textKey, e.target.value as TrainingPlanForm[typeof textKey])}
                  placeholder={ph} rows={2} style={{ ...tpInputStyle(), resize: 'vertical' }} />
              )}
            </div>
          ))}

          <div>
            <span style={tpLabelStyle()}>Précisions <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ai-dim)' }}>(optionnel)</span></span>
            <textarea value={form.precision_sante} onChange={e => setField('precision_sante', e.target.value)}
              rows={2} style={{ ...tpInputStyle(), resize: 'vertical' }} />
          </div>
        </div>
      )

      // ── BLOC 5 : Méthodes ────────────────────────────────────
      case 5: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#8b5cf6', margin: '0 0 4px', fontFamily: 'Syne,sans-serif' }}>
            Méthodes et périodisation
          </p>

          <div>
            <span style={tpLabelStyle()}>Blocs custom</span>
            <div style={{ display: 'flex', gap: 6, marginBottom: form.blocs_custom ? 10 : 0 }}>
              <button onClick={() => setField('blocs_custom', false)} style={tpPillStyle(!form.blocs_custom)}>Laisser l&apos;IA décider</button>
              <button onClick={() => setField('blocs_custom', true)} style={tpPillStyle(form.blocs_custom)}>Définir mes blocs</button>
            </div>
            {form.blocs_custom && (
              <div>
                {form.blocs_custom_detail.map((b, i) => (
                  <div key={i} style={{ border: '1px solid var(--ai-border)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                      <input type="text" placeholder="Nom du bloc" value={b.nom} onChange={e => {
                        const next = [...form.blocs_custom_detail]; next[i] = { ...next[i], nom: e.target.value }; setField('blocs_custom_detail', next)
                      }} style={{ ...tpInputStyle(), flex: 1 }} />
                      <button onClick={() => setField('blocs_custom_detail', form.blocs_custom_detail.filter((_, j) => j !== i))}
                        style={{ fontSize: 14, color: 'var(--ai-dim)', background: 'transparent', border: 'none', cursor: 'pointer' }}>×</button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                      {(['Base', 'VMA', 'Seuil', 'Spécifique', 'Deload'] as const).map(t => (
                        <button key={t} onClick={() => {
                          const next = [...form.blocs_custom_detail]; next[i] = { ...next[i], type: t }; setField('blocs_custom_detail', next)
                        }} style={tpPillStyle(b.type === t)}>{t}</button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--ai-dim)' }}>Durée : {b.duree_semaines} sem.</span>
                      <input type="range" min={1} max={12} value={b.duree_semaines} onChange={e => {
                        const next = [...form.blocs_custom_detail]; next[i] = { ...next[i], duree_semaines: Number(e.target.value) }; setField('blocs_custom_detail', next)
                      }} style={{ flex: 1, accentColor: '#8b5cf6' }} />
                    </div>
                  </div>
                ))}
                <button onClick={() => setField('blocs_custom_detail', [...form.blocs_custom_detail, { nom: '', type: 'Base', duree_semaines: 4 }])}
                  style={{ fontSize: 12, color: '#8b5cf6', background: 'transparent', border: '1px dashed rgba(139,92,246,0.4)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', width: '100%' }}>
                  + Ajouter un bloc
                </button>
              </div>
            )}
          </div>

          <div>
            <span style={tpLabelStyle()}>Entrée dans le programme</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button onClick={() => setField('entree_programme', 'prudent')} style={tpPillStyle(form.entree_programme === 'prudent')}>Progressif — montée en charge douce</button>
              <button onClick={() => setField('entree_programme', 'intense')} style={tpPillStyle(form.entree_programme === 'intense')}>Direct — je suis prêt à charger</button>
            </div>
          </div>

          <div>
            <span style={tpLabelStyle()}>Réaction au volume</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button onClick={() => setField('reaction_volume', 'tres_bien')} style={tpPillStyle(form.reaction_volume === 'tres_bien')}>Très bien — je récupère vite</button>
              <button onClick={() => setField('reaction_volume', 'bien')} style={tpPillStyle(form.reaction_volume === 'bien')}>Bien — récupération normale</button>
              <button onClick={() => setField('reaction_volume', 'mal')} style={tpPillStyle(form.reaction_volume === 'mal')}>Mal — je sature vite</button>
            </div>
          </div>

          <div>
            <span style={tpLabelStyle()}>Réaction à l&apos;intensité</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button onClick={() => setField('reaction_intensite', 'rapide')} style={tpPillStyle(form.reaction_intensite === 'rapide')}>Progressions rapides</button>
              <button onClick={() => setField('reaction_intensite', '48h')} style={tpPillStyle(form.reaction_intensite === '48h')}>48h pour récupérer</button>
              <button onClick={() => setField('reaction_intensite', 'saturation')} style={tpPillStyle(form.reaction_intensite === 'saturation')}>Saturation rapide</button>
            </div>
          </div>

          <div>
            <span style={tpLabelStyle()}>Type de séances préféré</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button onClick={() => setField('type_seances', 'courtes')} style={tpPillStyle(form.type_seances === 'courtes')}>Courtes et intenses</button>
              <button onClick={() => setField('type_seances', 'longues')} style={tpPillStyle(form.type_seances === 'longues')}>Longues et progressives</button>
              <button onClick={() => setField('type_seances', 'mixte')} style={tpPillStyle(form.type_seances === 'mixte')}>Mixte</button>
            </div>
          </div>

          <div>
            <span style={tpLabelStyle()}>Connaissance de soi * <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ai-dim)' }}>(obligatoire)</span></span>
            <textarea
              value={form.connaissance_de_soi}
              onChange={e => setField('connaissance_de_soi', e.target.value)}
              placeholder="Décrivez comment vous réagissez à l'entraînement, vos points forts, vos faiblesses, ce qui vous motive, vos difficultés habituelles, les types d'effort que vous aimez ou détestez..."
              rows={4}
              style={{ ...tpInputStyle(), resize: 'vertical' }}
            />
          </div>

          <div>
            <span style={tpLabelStyle()}>Précisions <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ai-dim)' }}>(optionnel)</span></span>
            <textarea value={form.precision_methode} onChange={e => setField('precision_methode', e.target.value)}
              rows={2} style={{ ...tpInputStyle(), resize: 'vertical' }} />
          </div>
        </div>
      )

      // ── BLOC 6 : Récupération ────────────────────────────────
      case 6: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#8b5cf6', margin: '0 0 4px', fontFamily: 'Syne,sans-serif' }}>
            Récupération et mode de vie
          </p>

          <div>
            <span style={tpLabelStyle()}>Sommeil habituel : {form.sommeil_heures}h/nuit</span>
            <input type="range" min={5} max={10} value={form.sommeil_heures} onChange={e => setField('sommeil_heures', Number(e.target.value))}
              style={{ width: '100%', accentColor: '#8b5cf6' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ai-dim)' }}>
              <span>5h</span><span>10h</span>
            </div>
          </div>

          <div>
            <span style={tpLabelStyle()}>Fatigue au travail</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {([['physique', 'Physiquement fatigant'], ['mental', 'Mentalement fatigant'], ['les_deux', 'Les deux'], ['faible', 'Faible impact']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setField('fatigue_travail', val)} style={tpPillStyle(form.fatigue_travail === val)}>{label}</button>
              ))}
            </div>
          </div>

          <div>
            <span style={tpLabelStyle()}>Périodes de stress dans l&apos;année</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: form.stress_annee !== 'aucun' && form.stress_annee !== '' ? 8 : 0 }}>
              {([['aucun', 'Aucune'], ['quelques_semaines', 'Quelques semaines'], ['recurrent', 'Récurrent']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setField('stress_annee', val)} style={tpPillStyle(form.stress_annee === val)}>{label}</button>
              ))}
            </div>
            {form.stress_annee !== 'aucun' && form.stress_annee !== '' && (
              <textarea value={form.stress_detail} onChange={e => setField('stress_detail', e.target.value)}
                placeholder="Quand ? Durée estimée ?" rows={2} style={{ ...tpInputStyle(), resize: 'vertical' }} />
            )}
          </div>

          <div>
            <span style={tpLabelStyle()}>Outils de récupération utilisés</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Massage', 'Bain froid', 'Compression', 'Sommeil optimisé', 'Aucun', 'Autres'].map(t => (
                <button key={t} onClick={() => setField('outils_recuperation', toggleArr(form.outils_recuperation, t))} style={tpPillStyle(form.outils_recuperation.includes(t))}>{t}</button>
              ))}
            </div>
          </div>

          <div>
            <span style={tpLabelStyle()}>Précisions <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ai-dim)' }}>(optionnel)</span></span>
            <textarea value={form.precision_recup} onChange={e => setField('precision_recup', e.target.value)}
              rows={2} style={{ ...tpInputStyle(), resize: 'vertical' }} />
          </div>
        </div>
      )

      // ── BLOC 7 : Nutrition ───────────────────────────────────
      case 7: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#8b5cf6', margin: '0 0 4px', fontFamily: 'Syne,sans-serif' }}>
            Nutrition
          </p>

          <div>
            <span style={tpLabelStyle()}>Plan nutritionnel</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {([['structure', 'Oui, structuré'], ['intuitif', 'Intuitif'], ['non', 'Non']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setField('plan_nutritionnel', val)} style={tpPillStyle(form.plan_nutritionnel === val)}>{label}</button>
              ))}
            </div>
          </div>

          <div>
            <span style={tpLabelStyle()}>Contraintes alimentaires</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Aucune', 'Végétarien', 'Végétalien', 'Sans gluten', 'Sans lactose', 'Autres'].map(c => (
                <button key={c} onClick={() => setField('contraintes_alimentaires', toggleArr(form.contraintes_alimentaires, c))} style={tpPillStyle(form.contraintes_alimentaires.includes(c))}>{c}</button>
              ))}
            </div>
          </div>

          <div>
            <span style={tpLabelStyle()}>Compléments utilisés</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Caféine', 'Protéines', 'Électrolytes', 'Créatine', 'Aucun', 'Autres'].map(c => (
                <button key={c} onClick={() => setField('complements', toggleArr(form.complements, c))} style={tpPillStyle(form.complements.includes(c))}>{c}</button>
              ))}
            </div>
          </div>

          <div>
            <span style={tpLabelStyle()}>Précisions <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ai-dim)' }}>(optionnel)</span></span>
            <textarea value={form.precision_nutrition} onChange={e => setField('precision_nutrition', e.target.value)}
              rows={2} style={{ ...tpInputStyle(), resize: 'vertical' }} />
          </div>
        </div>
      )

      default: return null
    }
  }

  const BLOC_TITLES = [
    'Objectif et course cible',
    'Profil et historique',
    'Disponibilité',
    'Équipement',
    'Blessures et santé',
    'Méthodes',
    'Récupération',
    'Nutrition',
  ]

  return (
    <div style={{ padding: '8px 0 4px', overflow: 'auto' }}>
      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--ai-dim)' }}>Étape {step + 1}/8 — {BLOC_TITLES[step]}</span>
          <span style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 700 }}>{Math.round((step + 1) / 8 * 100)}%</span>
        </div>
        <div style={{ height: 3, borderRadius: 99, background: 'var(--ai-border)' }}>
          <div style={{ height: '100%', borderRadius: 99, background: '#8b5cf6', width: `${(step + 1) / 8 * 100}%`, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Step content */}
      {renderStep()}

      {/* Error */}
      {error && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12, color: '#ef4444', margin: '0 0 8px' }}>{error}</p>
          {retryable && (
            <button
              onClick={() => void generate()}
              style={{
                padding: '8px 16px', borderRadius: 9, border: 'none',
                background: 'linear-gradient(135deg,#8b5cf6,#5b6fff)',
                color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Réessayer
            </button>
          )}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button
          onClick={step === 0 ? onCancel : () => setStep(s => s - 1)}
          style={{
            padding: '9px 14px', borderRadius: 9, border: '1px solid var(--ai-border)',
            background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer',
          }}
        >
          {step === 0 ? 'Annuler' : '← Précédent'}
        </button>
        {step < 7 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            style={{
              flex: 1, padding: '9px', borderRadius: 9, border: 'none',
              background: 'linear-gradient(135deg,#8b5cf6,#5b6fff)',
              color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Suivant →
          </button>
        ) : (
          <button
            onClick={() => void generate()}
            style={{
              flex: 1, padding: '9px', borderRadius: 9, border: 'none',
              background: 'linear-gradient(135deg,#8b5cf6,#5b6fff)',
              color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Générer le programme ✦
          </button>
        )}
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

// ── SBIntensityChart — profil d'intensité SVG pour blocs SBSession ──
const SB_ZONE_COLORS_CHART = ['#9ca3af', '#3b82f6', '#22c55e', '#f97316', '#ef4444', '#a855f7'] // Z1→Z5, SL2/MAX
const SB_ZONE_HEIGHTS_CHART = [20, 35, 50, 70, 85, 100] // % du H — Z1=20%…Z5=85%, SL2/MAX=100%

function parseSBZoneIdx(zones: string[] | null | undefined): number {
  // Claude sometimes returns null for array fields — guard against it
  if (!zones || !zones.length) return 1
  // SL2 / MAX → index 5 (100% height, purple)
  // SL1       → index 4 (85% height, red — same as Z5)
  // Z1–Z5     → index 0–4
  let max = 0
  for (const z of zones) {
    if (!z) continue
    const up = z.toUpperCase()
    if (/SL2|MAX/.test(up)) { max = Math.max(max, 5); continue }
    if (/SL1/.test(up))     { max = Math.max(max, 4); continue }
    const m = z.match(/\d/)
    if (m) max = Math.max(max, Math.min(4, Math.max(0, parseInt(m[0]) - 1)))
  }
  return max
}

type SBBarRaw = {
  durationMin: number
  zoneIdx: number
  isRecup: boolean
  bloc: SBBloc
}
type SBBarData = SBBarRaw & { xPct: number; wPct: number }

function SBIntensityChart({ blocs, sport, onClickEffortBloc }: {
  blocs: SBBloc[]
  sport: string
  onClickEffortBloc?: (bloc: SBBloc) => void
}) {
  const [hovIdx, setHovIdx] = useState<number | null>(null)
  const H = 64
  const GAP = 0.5

  // Build raw bars: decompose each bloc by its repetitions.
  //
  // Recovery rules:
  //   - reps=1  → show recovery after the effort (it's the rest before the next bloc)
  //   - reps>1  → show recovery BETWEEN reps only, NOT after the last rep
  //     e.g. 3×20'/4' → effort/recup/effort/recup/effort  (no trailing recovery)
  //
  // Fallback: if duree_effort is 0 or null, use 2 min minimum so the bloc is
  // still visible in the chart (e.g. gym sets with no explicit duration).
  const MIN_DUR = 2
  const barsRaw: SBBarRaw[] = []
  for (const b of blocs) {
    // Claude may return null for array fields — coerce to [] before use
    const zoneEffort = Array.isArray(b.zone_effort) ? b.zone_effort : []
    const zoneRecup  = Array.isArray(b.zone_recup)  ? b.zone_recup  : []
    const effortZIdx = parseSBZoneIdx(zoneEffort)
    const recupZIdx  = parseSBZoneIdx(zoneRecup.length ? zoneRecup : ['Z1'])
    const reps = Math.max(1, b.repetitions ?? 1)
    const effortDur = (b.duree_effort > 0) ? b.duree_effort : MIN_DUR
    const isLastRep = (i: number) => i === reps - 1
    for (let i = 0; i < reps; i++) {
      barsRaw.push({ durationMin: effortDur, zoneIdx: effortZIdx, isRecup: false, bloc: b })
      // Recovery:
      //   reps=1 → always (rest after bloc before next effort)
      //   reps>1 → only between reps (not after last)
      if (b.recup > 0 && (reps === 1 || !isLastRep(i)))
        barsRaw.push({ durationMin: b.recup, zoneIdx: recupZIdx, isRecup: true, bloc: b })
    }
  }

  const totalMin = barsRaw.reduce((sum, b) => sum + b.durationMin, 0)
  if (totalMin === 0 || barsRaw.length === 0) return null

  // Compute absolute x positions (% of total width)
  let xCursor = 0
  const bars: SBBarData[] = barsRaw.map(bar => {
    const wPct = (bar.durationMin / totalMin) * 100
    const data: SBBarData = { ...bar, xPct: xCursor, wPct }
    xCursor += wPct
    return data
  })

  // Sport detection for tooltip data
  const sportLow = sport.toLowerCase()
  const isRun   = /running|triathlon/.test(sportLow)
  const isCycle = /cycling|velo|v\u00e9lo|aviron|rowing/.test(sportLow) // 'velo' = UI id, 'vélo' = alt

  const hovBar = hovIdx !== null ? bars[hovIdx] : null

  return (
    <div style={{ marginBottom: 14, position: 'relative' }}>
      <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--ai-dim)', margin: '0 0 6px', fontFamily: 'DM Sans,sans-serif' }}>
        Profil d'intensité
      </p>

      {/* Tooltip */}
      {hovBar && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% - 4px)',
          left: `clamp(5%, ${hovBar.xPct + hovBar.wPct / 2}%, 95%)`,
          transform: 'translateX(-50%)',
          background: 'var(--ai-bg)',
          border: '1px solid var(--ai-border)',
          borderRadius: 8,
          padding: '7px 11px',
          zIndex: 30,
          fontSize: 11,
          whiteSpace: 'nowrap',
          marginBottom: 6,
          boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
          pointerEvents: 'none',
          fontFamily: 'DM Sans, sans-serif',
        }}>
          <div style={{ fontWeight: 700, color: 'var(--ai-text)', marginBottom: 4, fontSize: 12 }}>
            {hovBar.isRecup ? 'Récupération' : hovBar.bloc.nom}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
            <span style={{ color: 'var(--ai-mid)' }}>
              {hovBar.durationMin} min
              <span style={{ margin: '0 5px', color: 'var(--ai-border)' }}>·</span>
              <span style={{ color: SB_ZONE_COLORS_CHART[hovBar.zoneIdx], fontWeight: 700 }}>
                Z{hovBar.zoneIdx + 1}
              </span>
            </span>
            {!hovBar.isRecup && hovBar.bloc.fc_cible != null && (
              <span style={{ color: 'var(--ai-mid)' }}>FC cible : <strong style={{ color: 'var(--ai-text)' }}>{hovBar.bloc.fc_cible} bpm</strong></span>
            )}
            {!hovBar.isRecup && hovBar.bloc.fc_max != null && (
              <span style={{ color: 'var(--ai-mid)' }}>FC max : <strong style={{ color: 'var(--ai-text)' }}>{hovBar.bloc.fc_max} bpm</strong></span>
            )}
            {!hovBar.isRecup && isRun && hovBar.bloc.allure_cible != null && (
              <span style={{ color: 'var(--ai-mid)' }}>Allure : <strong style={{ color: 'var(--ai-text)' }}>{hovBar.bloc.allure_cible}</strong></span>
            )}
            {!hovBar.isRecup && isCycle && hovBar.bloc.watts != null && (
              <span style={{ color: 'var(--ai-mid)' }}>Puissance : <strong style={{ color: 'var(--ai-text)' }}>{hovBar.bloc.watts} W</strong></span>
            )}
            {!hovBar.isRecup && hovBar.bloc.cadence != null && (
              <span style={{ color: 'var(--ai-mid)' }}>Cadence : <strong style={{ color: 'var(--ai-text)' }}>{hovBar.bloc.cadence}</strong></span>
            )}
          </div>
        </div>
      )}

      {/* SVG Bars */}
      <svg
        width="100%" height={H}
        viewBox={`0 0 100 ${H}`}
        preserveAspectRatio="none"
        style={{ overflow: 'visible', display: 'block', cursor: 'default' }}
      >
        {bars.map((bar, i) => {
          const hPct = SB_ZONE_HEIGHTS_CHART[Math.min(bar.zoneIdx, SB_ZONE_HEIGHTS_CHART.length - 1)]
          const h = (hPct / 100) * H
          const y = H - h
          const fill = SB_ZONE_COLORS_CHART[Math.min(bar.zoneIdx, SB_ZONE_COLORS_CHART.length - 1)]
          const w = Math.max(bar.wPct - GAP, 0.3)
          const isHov = hovIdx === i
          const clickable = !bar.isRecup && !!onClickEffortBloc
          return (
            <rect key={i}
              x={bar.xPct} y={y} width={w} height={h} rx={0.8}
              fill={fill}
              opacity={bar.isRecup ? 0.30 : (isHov ? 1 : 0.82)}
              style={{ cursor: clickable ? 'pointer' : 'default' }}
              onMouseEnter={() => setHovIdx(i)}
              onMouseLeave={() => setHovIdx(null)}
              onClick={() => { if (clickable) onClickEffortBloc!(bar.bloc) }}
            />
          )
        })}
        <line x1={0} y1={H} x2={100} y2={H} stroke="var(--ai-border)" strokeWidth={0.5} />
      </svg>

      {/* Labels below each segment */}
      <div style={{ position: 'relative', height: 16, marginTop: 2, overflow: 'hidden' }}>
        {bars.map((bar, i) => {
          if (bar.wPct < 4) return null
          const isHov = hovIdx === i
          const zoneColor = SB_ZONE_COLORS_CHART[Math.min(bar.zoneIdx, SB_ZONE_COLORS_CHART.length - 1)]
          const col = bar.isRecup
            ? (isHov ? '#9ca3af' : 'var(--ai-dim)')
            : (isHov ? zoneColor : 'var(--ai-mid)')

          // Label content: effort bars → allure / watts / fc; recovery → duration
          let label: string
          if (bar.isRecup) {
            label = `${bar.durationMin}′`
          } else {
            const b = bar.bloc
            if (isRun && b.allure_cible)         label = b.allure_cible
            else if (isCycle && b.watts != null)  label = `${b.watts}W`
            else if (b.fc_cible != null)          label = `${b.fc_cible}bpm`
            else if (b.allure_cible)              label = b.allure_cible
            else                                  label = `${bar.durationMin}′`
          }

          return (
            <div key={i} style={{
              position: 'absolute',
              left: `${bar.xPct}%`,
              width: `${bar.wPct}%`,
              textAlign: 'center' as const,
              fontSize: 8,
              lineHeight: '16px',
              color: col,
              fontFamily: 'DM Mono, monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap' as const,
              transition: 'color 0.12s',
              cursor: !bar.isRecup && onClickEffortBloc ? 'pointer' : 'default',
            }}
              onMouseEnter={() => setHovIdx(i)}
              onMouseLeave={() => setHovIdx(null)}
              onClick={() => { if (!bar.isRecup && onClickEffortBloc) onClickEffortBloc(bar.bloc) }}
            >
              {label}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SessionBuilderFlow({ onCancel, onRecordConv }: {
  onCancel: () => void
  onRecordConv?: (userMsg: string, aiMsg: string) => void
}) {
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

  // ── Edit-bloc modal ────────────────────────────────────────────
  const [editBloc,    setEditBloc]    = useState<SBBloc | null>(null)
  const [editDuree,   setEditDuree]   = useState('')
  const [editZone,    setEditZone]    = useState('')
  const [editFc,      setEditFc]      = useState('')
  const [editAllure,  setEditAllure]  = useState('')
  const [editWatts,   setEditWatts]   = useState('')

  const sportLow = (sport ?? '').toLowerCase()
  const isRunSport   = /running|triathlon/.test(sportLow)
  const isCycleSport = /cycling|velo|vélo|aviron|rowing/.test(sportLow)

  function openEditBloc(bloc: SBBloc) {
    setEditBloc(bloc)
    setEditDuree(String(bloc.duree_effort ?? ''))
    setEditZone(bloc.zone_effort.join('/'))
    setEditFc(bloc.fc_cible != null ? String(bloc.fc_cible) : '')
    setEditAllure(bloc.allure_cible ?? '')
    setEditWatts(bloc.watts != null ? String(bloc.watts) : '')
  }

  function applyBlocEdit() {
    if (!editBloc) return
    const parts: string[] = []
    const newDuree = Number(editDuree)
    if (!isNaN(newDuree) && newDuree > 0 && newDuree !== editBloc.duree_effort)
      parts.push(`durée d'effort → ${newDuree} min`)
    if (editZone.trim() && editZone.trim() !== editBloc.zone_effort.join('/'))
      parts.push(`zone → ${editZone.trim()}`)
    const newFc = Number(editFc)
    if (editFc.trim() && !isNaN(newFc) && newFc !== (editBloc.fc_cible ?? null))
      parts.push(`FC cible → ${newFc} bpm`)
    if (isRunSport && editAllure.trim() && editAllure.trim() !== (editBloc.allure_cible ?? ''))
      parts.push(`allure → ${editAllure.trim()}`)
    const newWatts = Number(editWatts)
    if (isCycleSport && editWatts.trim() && !isNaN(newWatts) && newWatts !== (editBloc.watts ?? null))
      parts.push(`puissance → ${newWatts}W`)
    setEditBloc(null)
    if (!parts.length) return
    void generate(`Pour le bloc "${editBloc.nom}" : ${parts.join(', ')}`)
  }

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

      // Collect FTP from bike
      if (bike?.ftp_watts) result.ftp = bike.ftp_watts as number

      // Collect SL1/SL2 from running
      if (run?.sl1)  result.sl1 = run.sl1 as string
      if (run?.sl2)  result.sl2 = run.sl2 as string

      // Collect ALL zone values (Z1-Z5) from ALL sports for full context
      const zones: Record<string, string> = {}
      for (const row of data) {
        const r = row as {
          sport: string
          z1_value?: string; z2_value?: string; z3_value?: string; z4_value?: string; z5_value?: string
          sl1?: string; sl2?: string; ftp_watts?: number
        }
        // Collect all zone values for all sports
        if (r.z1_value) zones[`${r.sport}_z1`] = r.z1_value
        if (r.z2_value) zones[`${r.sport}_z2`] = r.z2_value
        if (r.z3_value) zones[`${r.sport}_z3`] = r.z3_value
        if (r.z4_value) zones[`${r.sport}_z4`] = r.z4_value
        if (r.z5_value) zones[`${r.sport}_z5`] = r.z5_value

        // Also collect SL1/SL2 for other sports if available
        if (r.sport !== 'run') {
          if (r.sl1) zones[`${r.sport}_sl1`] = r.sl1
          if (r.sl2) zones[`${r.sport}_sl2`] = r.sl2
        }
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
      const generated = data.session ?? null
      setSession(generated)
      if (generated && onRecordConv) {
        const sportLabel = SB_SPORTS.find(s => s.id === sport)?.label ?? sport ?? ''
        const userMsg = `Créer une séance ${sportLabel} — ${typesSeance.join(', ')}`
        const aiMsg = [
          `sport:${sport}`,
          `**${generated.nom}**`,
          '',
          generated.description,
          '',
          `**Structure — ${generated.blocs.length} blocs :**`,
          ...generated.blocs.map((b, i) =>
            `${i + 1}. **${b.nom}** — ${b.repetitions > 1 ? `${b.repetitions}×` : ''}${b.duree_effort} min` +
            (b.recup > 0 ? ` / ${b.recup} min récup` : '') +
            (Array.isArray(b.zone_effort) && b.zone_effort.length ? ` · ${b.zone_effort.join('/')}` : '') +
            `\n${b.consigne}`
          ),
        ].join('\n')
        onRecordConv(userMsg, aiMsg)
      }
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
              background: typesSeance.length > 0 ? 'var(--ai-gradient)' : 'var(--ai-border)',
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
          Séance ajoutée ✓
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
            background: 'var(--ai-gradient)',
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
              background: modifyText.trim().length >= 10 ? 'var(--ai-gradient)' : 'var(--ai-border)',
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
    // Prefer the state variable (user's selection), fallback to session.sport (API response)
    // so the label is always correct even if Claude returned a wrong sport field.
    const sportObj = SB_SPORTS.find(s => s.id === sport) ?? SB_SPORTS.find(s => s.id === session.sport)
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

          {/* Profil d'intensité SVG */}
          <SBIntensityChart blocs={session.blocs} sport={session.sport} onClickEffortBloc={openEditBloc} />

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
              background: saving ? 'var(--ai-border)' : 'var(--ai-gradient)',
              color: '#fff', fontSize: 12, fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans,sans-serif',
            }}
          >
            {saving ? 'Sauvegarde…' : '+ Ajouter à la bibliothèque'}
          </button>
        </div>

        {/* ── Edit-bloc modal ────────────────────────────────── */}
        {editBloc && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
            onClick={() => setEditBloc(null)}
          >
            <div
              style={{ background: 'var(--ai-bg)', border: '1px solid var(--ai-border)', borderRadius: 16, padding: '20px 20px 16px', width: 300, maxWidth: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
              onClick={e => e.stopPropagation()}
            >
              <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px', fontFamily: 'Syne,sans-serif', color: 'var(--ai-text)' }}>
                Modifier le bloc
              </p>
              <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 16px', fontFamily: 'DM Sans,sans-serif' }}>
                {editBloc.nom}
              </p>

              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--ai-dim)', marginBottom: 4, fontFamily: 'DM Sans,sans-serif' }}>
                Durée d&apos;effort (min)
              </label>
              <input
                type="number" min={1} value={editDuree}
                onChange={e => setEditDuree(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', color: 'var(--ai-text)', fontSize: 13, fontFamily: 'DM Mono,monospace', boxSizing: 'border-box' as const, outline: 'none', marginBottom: 12 }}
              />

              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--ai-dim)', marginBottom: 4, fontFamily: 'DM Sans,sans-serif' }}>
                Zone effort
              </label>
              <input
                type="text" value={editZone}
                onChange={e => setEditZone(e.target.value)}
                placeholder="ex: Z4 ou Z4/Z5"
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', color: 'var(--ai-text)', fontSize: 13, fontFamily: 'DM Mono,monospace', boxSizing: 'border-box' as const, outline: 'none', marginBottom: 12 }}
              />

              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--ai-dim)', marginBottom: 4, fontFamily: 'DM Sans,sans-serif' }}>
                FC cible (bpm)
              </label>
              <input
                type="number" min={0} value={editFc}
                onChange={e => setEditFc(e.target.value)}
                placeholder="ex: 158"
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', color: 'var(--ai-text)', fontSize: 13, fontFamily: 'DM Mono,monospace', boxSizing: 'border-box' as const, outline: 'none', marginBottom: 12 }}
              />

              {isRunSport && (
                <>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--ai-dim)', marginBottom: 4, fontFamily: 'DM Sans,sans-serif' }}>
                    Allure cible
                  </label>
                  <input
                    type="text" value={editAllure}
                    onChange={e => setEditAllure(e.target.value)}
                    placeholder="ex: 4:08/km"
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', color: 'var(--ai-text)', fontSize: 13, fontFamily: 'DM Mono,monospace', boxSizing: 'border-box' as const, outline: 'none', marginBottom: 12 }}
                  />
                </>
              )}

              {isCycleSport && (
                <>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--ai-dim)', marginBottom: 4, fontFamily: 'DM Sans,sans-serif' }}>
                    Puissance (watts)
                  </label>
                  <input
                    type="number" min={0} value={editWatts}
                    onChange={e => setEditWatts(e.target.value)}
                    placeholder="ex: 280"
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', color: 'var(--ai-text)', fontSize: 13, fontFamily: 'DM Mono,monospace', boxSizing: 'border-box' as const, outline: 'none', marginBottom: 12 }}
                  />
                </>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  onClick={() => setEditBloc(null)}
                  style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}
                >
                  Annuler
                </button>
                <button
                  onClick={applyBlocEdit}
                  style={{ flex: 2, padding: '9px', borderRadius: 9, border: 'none', background: 'var(--ai-gradient)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}
                >
                  Appliquer
                </button>
              </div>
            </div>
          </div>
        )}
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
  const [menuId,   setMenuId]   = useState<string | null>(null)
  const [renId,    setRenId]    = useState<string | null>(null)
  const [renVal,   setRenVal]   = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  // Gate SSR-safety pour fmtDate() qui utilise Date.now() au render.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuId) { setConfirmId(null); return }
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) { setMenuId(null); setConfirmId(null) }
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
            background: 'var(--ai-gradient)',
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
                    {mounted ? fmtDate(conv.updatedAt) : ''}
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
                      overflow: 'hidden', minWidth: 148,
                    }}>
                      <button onClick={() => { setRenId(conv.id); setRenVal(conv.title); setMenuId(null) }}
                        style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ai-mid)', fontFamily: 'DM Sans,sans-serif', fontSize: 12, textAlign: 'left' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ai-bg2)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                      >Renommer</button>
                      {confirmId === conv.id ? (
                        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--ai-border)' }}>
                          <p style={{ margin: '0 0 7px', fontSize: 11, color: 'var(--ai-mid)' }}>Supprimer cette conversation ?</p>
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button
                              onClick={() => { setConfirmId(null); setMenuId(null) }}
                              style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-dim)', fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                              Annuler
                            </button>
                            <button
                              onClick={() => { onDelete(conv.id); setConfirmId(null); setMenuId(null) }}
                              style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                              Oui
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmId(conv.id)}
                          style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', borderTop: '1px solid var(--ai-border)', background: 'transparent', cursor: 'pointer', color: '#ef4444', fontFamily: 'DM Sans,sans-serif', fontSize: 12, textAlign: 'left' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                        >Supprimer…</button>
                      )}
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
    flow: 'training_plan' as FlowId,
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
  planId,
  planContext,
  planName,
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

  // ── Phase 4 : initialise la conversation liée au plan ──────────
  // Quand le panel s'ouvre avec un planId, trouve ou crée une conv
  // taggée [PLAN:id] et l'active automatiquement.
  // Le ref sert à éviter de créer la conv deux fois si les deps
  // se re-déclenchent sans que le panel ait été fermé entre-temps.
  const planConvCreatedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!open || !planId || !mounted) return

    // Cherche une conv existante pour ce plan (localStorage ou state)
    const existing = convs.find(c => c.title.startsWith(`[PLAN:${planId}]`))
    if (existing) {
      // Toujours re-sélectionner la conv du plan à l'ouverture
      setActiveId(existing.id)
      return
    }

    // Évite de créer la conv deux fois en cas de double-déclenchement
    if (planConvCreatedRef.current === planId) return
    planConvCreatedRef.current = planId

    // Nouvelle conv — welcome message du coach
    const welcomeText = `Je suis ton Coach IA. J'ai l'intégralité de ton plan **${planName ?? 'en cours'}** en mémoire — objectif, périodisation, chaque semaine et chaque séance. Pose-moi toutes tes questions ou demande des ajustements : je réponds directement en me basant sur ton programme.`
    const welcomeMsg: AIMsg = { id: genId(), role: 'assistant', content: welcomeText, ts: Date.now(), modelId: 'athena' }
    const newId = genId()
    const planConv: AIConv = {
      id: newId,
      title: `[PLAN:${planId}] ${planName ?? 'Mon plan'}`,
      createdAt: Date.now(), updatedAt: Date.now(), msgs: [welcomeMsg],
    }
    setConvs(prev => [planConv, ...prev].slice(0, MAX_CONVS))
    setActiveId(newId)
  // convs est intentionnellement omis des deps — on veut déclencher sur open/planId/mounted,
  // pas à chaque message envoyé. La valeur courante de convs est lue dans la closure.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, planId, mounted, planName])

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

    // Plan-aware chat : utilise l'agent plan_coach + contexte plan injecté
    const isPlanChat = Boolean(planId && active?.title.startsWith(`[PLAN:${planId}]`))

    try {
      const res = await fetch('/api/coach-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId:  isPlanChat ? 'plan_coach' : 'central',
          modelId:  snapshot,
          messages: apiMsgs,
          context:  isPlanChat ? (planContext ?? {}) : (context ?? {}),
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

      // ── Persistance DB pour le plan-chat (training_plan_messages) ──
      if (isPlanChat && planId && accumulated) {
        try {
          const { createClient } = await import('@/lib/supabase/client')
          const sb = createClient()
          const { data: { user } } = await sb.auth.getUser()
          if (user) {
            await sb.from('training_plan_messages').insert([
              { training_plan_id: planId, user_id: user.id, role: 'user',      content: displayText },
              { training_plan_id: planId, user_id: user.id, role: 'assistant', content: accumulated  },
            ])
          }
        } catch { /* non-bloquant */ }
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
  }, [input, loading, active, context, model, activeQA, planId, planContext])

  // SSR guard
  if (!mounted) return null

  const showEmpty = !active || active.msgs.length === 0

  return createPortal(
    <>
      {/* ── CSS global ─────────────────────────────────────── */}
      <style>{`
        /* ── Thinking dots — organic spring bounce ───────────── */
        @keyframes ai_dot {
          0%, 70%, 100% { opacity: 0.22; transform: scale(0.75) translateY(0); }
          35%            { opacity: 1;    transform: scale(1.18) translateY(-4px); }
        }
        @keyframes ai_slidein {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        /* ── Typing cursor blink ──────────────────────────────── */
        @keyframes ai_cursor {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        /* ── Message appear ──────────────────────────────────── */
        @keyframes ai_msg_in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* CSS variables */
        .aip-root {
          --ai-bg:          #ffffff;
          --ai-bg2:         #f6f8fc;
          --ai-border:      rgba(0,0,0,0.08);
          --ai-text:        #0d1117;
          --ai-mid:         rgba(13,17,23,0.58);
          --ai-dim:         rgba(13,17,23,0.36);
          --ai-accent:      #8b5cf6;
          --ai-accent-dim:  rgba(139,92,246,0.12);
          --ai-accent-soft: rgba(139,92,246,0.06);
          --ai-accent-line: rgba(139,92,246,0.48);
          --ai-gradient:    linear-gradient(135deg,#8b5cf6,#5b6fff);
        }
        html.dark .aip-root {
          --ai-bg:          #13161e;
          --ai-bg2:         #0f121a;
          --ai-border:      rgba(255,255,255,0.09);
          --ai-text:        #eef2f7;
          --ai-mid:         rgba(238,242,247,0.60);
          --ai-dim:         rgba(238,242,247,0.35);
          --ai-accent:      #8b5cf6;
          --ai-accent-dim:  rgba(139,92,246,0.15);
          --ai-accent-soft: rgba(139,92,246,0.08);
          --ai-accent-line: rgba(139,92,246,0.55);
          --ai-gradient:    linear-gradient(135deg,#8b5cf6,#5b6fff);
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
              background: 'var(--ai-gradient)',
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
                  Bonjour, bon {mounted ? getGreeting() : 'matin'} !
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

            {/* ── Flow UI ──
                Rendu dès qu'un flow est actif, INDÉPENDAMMENT de l'état
                des conversations. Avant on gatait sur `showEmpty` aussi,
                mais si un setActiveId se glissait (ex. cache, initialAssistantMsg,
                select conv restauré), showEmpty passait à false et le flow
                était démonté EN PLEIN GENERATE — faisant disparaître les
                semaines détaillées et les graphiques du résultat. */}
            {activeFlow && (
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
                  <SessionBuilderFlow
                    onCancel={() => setActiveFlow(null)}
                    onRecordConv={(userMsg, aiMsg) => {
                      const conv: AIConv = {
                        id: genId(),
                        title: userMsg.slice(0, 46) + (userMsg.length > 46 ? '…' : ''),
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        msgs: [
                          { id: genId(), role: 'user',      content: userMsg, ts: Date.now() },
                          { id: genId(), role: 'assistant', content: aiMsg,  ts: Date.now() + 1, modelId: 'zeus' as THWModel },
                        ],
                      }
                      setConvs(prev => [conv, ...prev].slice(0, MAX_CONVS))
                      setActiveId(conv.id)
                    }}
                  />
                )}
                {activeFlow === 'training_plan' && (
                  <TrainingPlanFlow
                    model={model}
                    onCancel={() => setActiveFlow(null)}
                    onRecordConv={(userMsg, aiMsg) => {
                      // On enregistre la conv dans l'historique (drawer) MAIS
                      // on NE fait PAS setActiveId : activer la conv
                      // rendrait showEmpty = false → TrainingPlanFlow serait
                      // démonté AVANT de pouvoir afficher son result view
                      // (semaines détaillées, volume chart, boutons Modifier
                      // / Générer). Ici l'utilisateur reste sur la vue riche.
                      const conv: AIConv = {
                        id: genId(),
                        title: userMsg.slice(0, 46) + (userMsg.length > 46 ? '…' : ''),
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        msgs: [
                          { id: genId(), role: 'user',      content: userMsg, ts: Date.now() },
                          { id: genId(), role: 'assistant', content: aiMsg,   ts: Date.now() + 1, modelId: 'zeus' as THWModel },
                        ],
                      }
                      setConvs(prev => [conv, ...prev].slice(0, MAX_CONVS))
                      // setActiveId(conv.id) ← volontairement omis (cf. note ci-dessus)
                    }}
                  />
                )}
              </div>
            )}

            {/* ── Messages ──
                On masque la section messages tant qu'un flow est actif
                pour éviter un double rendu (flow + chat bubble) quand le
                flow a créé une conv via onRecordConv. Le flow reprend la
                main tout seul. */}
            {active && active.msgs.length > 0 && !activeFlow && (
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
                          borderRadius: '18px 18px 4px 18px',
                          background: '#1B6EF3',
                          color: '#fff',
                        }}>
                          <span style={{ fontSize: 13.5, lineHeight: 1.55, display: 'block' }}>{msg.content}</span>
                        </div>
                      ) : (() => {
                        const isStreamingMsg = loading && idx === active.msgs.length - 1
                        return (
                          <div style={{
                            flex: 1, minWidth: 0,
                            background: 'var(--ai-bg2)',
                            border: '1px solid var(--ai-border)',
                            borderRadius: '4px 18px 18px 18px',
                            padding: '10px 14px 10px 14px',
                            animation: 'ai_msg_in 0.15s ease both',
                          }}>
                            <TypedText text={msg.content} isStreaming={isStreamingMsg} />
                          </div>
                        )
                      })()}
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

                {/* Thinking indicator */}
                {loading && active?.msgs[active.msgs.length - 1]?.role === 'user' && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, animation: 'ai_msg_in 0.18s ease both' }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                      background: 'var(--ai-accent-dim)',
                      border: '1px solid var(--ai-accent-line)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <ModelEffigy model={model} isAnimating={true} size={15} color="var(--ai-accent)" />
                    </div>
                    <div style={{
                      padding: '8px 14px',
                      background: 'var(--ai-bg2)',
                      border: '1px solid var(--ai-border)',
                      borderRadius: '4px 18px 18px 18px',
                      display: 'flex', alignItems: 'center',
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
