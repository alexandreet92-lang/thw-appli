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

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
  sessionData?: SBSession  // données structurées SessionBuilder (persiste en localStorage)
  trainingReport?: TrainingReportData  // données structurées AnalyzeTrainingFlow (persiste en localStorage)
  raceStrategy?: RaceStrategyData      // données structurées StrategieCourseFlow (persiste en localStorage)
}
interface AIConv {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  msgs: AIMsg[]
}

type FlowId = 'weakpoints' | 'nutrition' | 'recharge' | 'analyzetest' | 'sessionbuilder' | 'training_plan' | 'rule_helper' | 'analyser_entrainement' | 'estimer_zones' | 'analyser_progression' | 'strategie_course' | 'app_guide' | 'analyze_training' | null

interface PendingToolCall {
  tool_name: string
  tool_input: Record<string, unknown>
}

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

function MsgContent({ text, fontFamily }: { text: string; fontFamily?: string }) {
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

    // ── Tableau Markdown — groupe les lignes | ... | consécutives ──
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim())
        i++
      }
      // Exclure la ligne de séparation |---|---| et parser les cellules
      const rows = tableLines
        .filter(l => !/^\|[\s\-:|]+\|$/.test(l))
        .map(l => l.split('|').slice(1, -1).map(c => c.trim()))
      if (rows.length >= 1) {
        const headers = rows[0]
        const dataRows = rows.slice(1)
        blocks.push(
          <div key={`table-${i}`} style={{ overflowX: 'auto', margin: '10px 0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'DM Sans,sans-serif' }}>
              <thead>
                <tr>
                  {headers.map((h, hi) => (
                    <th key={hi} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, fontSize: 11, color: 'var(--ai-text)', borderBottom: '2px solid var(--ai-border)', whiteSpace: 'nowrap' as const }}>
                      {parseBold(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{ padding: '6px 10px', fontSize: 12, color: 'var(--ai-mid)', borderBottom: '1px solid var(--ai-border)' }}>
                        {parseBold(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      continue
    }

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

  return <div style={{ fontFamily: fontFamily ?? 'DM Sans, sans-serif' }}>{blocks}</div>
}

// ── Typed text — streaming character-by-character reveal ──────────
// Matches the Claude / ChatGPT "typewriter" feel: reveals chars at
// ~16 ms/char during streaming, snaps to full text when done.

function TypedText({ text, isStreaming, fontFamily }: { text: string; isStreaming: boolean; fontFamily?: string }) {
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
      <MsgContent text={text.slice(0, shown)} fontFamily={fontFamily} />
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

interface WPReport {
  resume: string
  score_global: number
  profil_athletique: {
    forces_majeures:   { label: string; detail: string; evidence?: string }[]
    faiblesses_majeures: { label: string; detail: string; evidence?: string; priority: number }[]
  }
  sports_analysis: {
    sport: string
    score: number
    profil: string
    forces:    { label: string; detail: string; evidence?: string }[]
    faiblesses: { label: string; detail: string; priority: number; evidence?: string }[]
    evolution: string
  }[]
  diagnostic_entrainement: {
    resume: string
    points_positifs: { label: string; detail: string }[]
    points_negatifs: { label: string; detail: string; priority: number }[]
    coherence_objectifs: { status: 'ok' | 'warning' | 'critical'; detail: string }
    recuperation:        { status: 'ok' | 'warning' | 'critical'; detail: string }
  }
  plan_action: { priority: number; action: string; sport: string; cible: string; impact: string; detail: string }[]
  sources_used: string[]
}

function wpScoreColor(score: number): string {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#84cc16'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function wpStatusColor(status: 'ok' | 'warning' | 'critical'): string {
  if (status === 'ok') return '#22c55e'
  if (status === 'warning') return '#f59e0b'
  return '#ef4444'
}

function WeakpointsFlow({ onCancel, onRecordConv }: {
  onCancel: () => void
  onRecordConv?: (userMsg: string, aiMsg: string) => void
}) {
  type WPPhase = 'gate' | 'sports' | 'generating' | 'result'

  const [phase,          setPhase]          = useState<WPPhase>('gate')
  const [selected,       setSelected]       = useState<string[]>([])
  const [report,         setReport]         = useState<WPReport | null>(null)
  const [error,          setError]          = useState<string | null>(null)
  const [expandedSport,  setExpandedSport]  = useState<number | null>(null)
  const [expandedAction, setExpandedAction] = useState<number | null>(null)
  const [gateLoading,    setGateLoading]    = useState(true)

  const [ctxData, setCtxData] = useState<{
    profile: unknown; zones: unknown; activities: unknown[]
    testResults: unknown[]; races: unknown[]; health: unknown[]
    aiRules: { category: string; rule_text: string }[]
  } | null>(null)

  const [gateChecks, setGateChecks] = useState<{
    label: string; ok: boolean; link: string; detail: string | null
  }[]>([])

  // ── Load context data on mount ────────────────────────────
  useEffect(() => {
    void (async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { setGateLoading(false); return }

        const since1y = new Date(Date.now() - 365 * 86400000).toISOString()

        const [profRes, zonesRes, actRes, testsRes, racesRes, healthRes, rulesRes] = await Promise.all([
          sb.from('athlete_performance_profile').select('*').eq('user_id', user.id).maybeSingle(),
          sb.from('training_zones').select('*').eq('user_id', user.id).eq('is_current', true),
          sb.from('activities')
            .select('id,sport_type,title,started_at,moving_time_s,distance_m,tss,avg_hr,max_hr,avg_watts,max_watts,suffer_score')
            .eq('user_id', user.id)
            .gte('started_at', since1y)
            .order('started_at', { ascending: false })
            .limit(150),
          sb.from('test_results')
            .select('id,date,valeurs,notes,test_definitions(nom,sport)')
            .eq('user_id', user.id)
            .order('date', { ascending: false })
            .limit(50),
          sb.from('planned_races')
            .select('name,sport,date,level,goal_time')
            .eq('user_id', user.id)
            .order('date'),
          Promise.resolve(sb.from('metrics_daily')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false })
            .limit(14)
          ).catch(() => ({ data: [] })),
          sb.from('ai_rules')
            .select('category,rule_text')
            .eq('user_id', user.id)
            .eq('active', true),
        ])

        const activitiesCount = (actRes.data ?? []).length
        const testsCount      = (testsRes.data ?? []).length
        const racesCount      = (racesRes.data ?? []).length
        const zonesCount      = (zonesRes.data ?? []).length
        const hasZones        = zonesCount > 0

        setCtxData({
          profile:     profRes.data,
          zones:       zonesRes.data ?? [],
          activities:  actRes.data ?? [],
          testResults: testsRes.data ?? [],
          races:       racesRes.data ?? [],
          health:      healthRes.data ?? [],
          aiRules:     (rulesRes.data ?? []) as { category: string; rule_text: string }[],
        })

        setGateChecks([
          { label: 'Profil de performance',       ok: !!profRes.data,        link: '/performance', detail: null },
          { label: "Zones d'entraînement",         ok: hasZones,              link: '/performance', detail: hasZones ? `${zonesCount} sport${zonesCount > 1 ? 's' : ''} configuré${zonesCount > 1 ? 's' : ''}` : null },
          { label: 'Activités récentes (3 mois)',  ok: activitiesCount > 0,   link: '/activities',  detail: activitiesCount ? `${activitiesCount} activités` : null },
          { label: 'Tests de performance',         ok: testsCount > 0,        link: '/performance', detail: testsCount ? `${testsCount} tests` : null },
          { label: 'Courses planifiées',           ok: racesCount > 0,        link: '/planning',    detail: racesCount ? `${racesCount} courses` : null },
        ])
      } catch (err) {
        console.error('[WeakpointsFlow gate]', err)
      } finally {
        setGateLoading(false)
      }
    })()
  }, [])

  function toggle(s: string) {
    setSelected(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  async function generate() {
    setPhase('generating')
    setError(null)
    try {
      const res = await fetch('/api/weakpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sports:      selected,
          profile:     ctxData?.profile,
          zones:       ctxData?.zones,
          activities:  ctxData?.activities  ?? [],
          testResults: ctxData?.testResults ?? [],
          races:       ctxData?.races       ?? [],
          health:      ctxData?.health      ?? [],
          aiRules:     ctxData?.aiRules     ?? [],
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { report?: WPReport; error?: string }
      if (data.error) throw new Error(data.error)
      const r = data.report!
      setReport(r)
      setExpandedSport(0)
      setPhase('result')

      if (onRecordConv) {
        const userMsg = `Identifier mes points faibles — ${selected.join(', ')}`
        const aiMsg   = `**Analyse de points faibles** — Score global : ${r.score_global}/100\n\n${r.resume}\n\n**${r.plan_action?.length ?? 0} action${(r.plan_action?.length ?? 0) > 1 ? 's' : ''}** recommandée${(r.plan_action?.length ?? 0) > 1 ? 's' : ''}.`
        onRecordConv(userMsg, aiMsg)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
      setPhase('sports')
    }
  }

  // ── Phase : gate ─────────────────────────────────────────
  if (phase === 'gate') {
    if (gateLoading) {
      return (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(0,200,224,0.2)', borderTop: '2px solid var(--ai-accent)', animation: 'ai_spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 12, color: 'var(--ai-dim)', margin: 0 }}>Chargement de tes données…</p>
        </div>
      )
    }

    const okCount = gateChecks.filter(c => c.ok).length

    return (
      <div style={{ padding: '4px 0' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ai-text)', margin: '0 0 6px', fontFamily: 'Syne,sans-serif' }}>
          Analyse de points faibles
        </p>
        <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 16px', lineHeight: 1.6 }}>
          {okCount === 0
            ? 'Aucune donnée détectée. Complète ton profil pour une analyse précise.'
            : okCount < 3
              ? 'Quelques données manquantes — l\'analyse sera moins complète. Tu peux continuer.'
              : 'Tes données sont prêtes. Plus ton profil est complet, plus l\'analyse sera précise.'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {gateChecks.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: c.ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {c.ok ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                ) : (
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                )}
              </div>
              <span style={{ flex: 1, fontSize: 12, color: c.ok ? 'var(--ai-text)' : 'var(--ai-mid)', fontWeight: c.ok ? 500 : 400 }}>
                {c.label}
              </span>
              {c.detail && (
                <span style={{ fontSize: 10, color: 'var(--ai-dim)', fontFamily: 'DM Mono,monospace' }}>{c.detail}</span>
              )}
              {!c.ok && (
                <a href={c.link} style={{ fontSize: 10, color: '#5b6fff', fontWeight: 600, textDecoration: 'none' }}>
                  Compléter
                </a>
              )}
            </div>
          ))}
        </div>

        <p style={{ fontSize: 10, color: 'var(--ai-dim)', margin: '0 0 12px', textAlign: 'center' }}>
          {okCount}/{gateChecks.length} données disponibles
        </p>

        <button onClick={() => setPhase('sports')} style={{
          width: '100%', padding: '11px', borderRadius: 10,
          background: 'var(--ai-gradient)', border: 'none',
          color: '#fff', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'Syne,sans-serif',
        }}>
          Choisir les sports à analyser →
        </button>
        <button onClick={onCancel} style={{ display: 'block', margin: '8px auto 0', fontSize: 11, color: 'var(--ai-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
          Annuler
        </button>
      </div>
    )
  }

  // ── Phase : sports ───────────────────────────────────────
  if (phase === 'sports') {
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
        {error && (
          <p style={{ fontSize: 11, color: '#ef4444', margin: '0 0 10px' }}>{error}</p>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setPhase('gate')} style={{
            padding: '9px 16px', borderRadius: 9,
            border: '1px solid var(--ai-border)', background: 'transparent',
            color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer',
            fontFamily: 'DM Sans,sans-serif',
          }}>
            Retour
          </button>
          <button onClick={() => { void generate() }} disabled={selected.length === 0} style={{
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

  // ── Phase : generating ───────────────────────────────────
  if (phase === 'generating') {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(0,200,224,0.15)', borderTop: '3px solid var(--ai-accent)', animation: 'ai_spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 6px', fontFamily: 'Syne,sans-serif' }}>
          Analyse en cours…
        </p>
        <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: 0, lineHeight: 1.6, maxWidth: 260, marginLeft: 'auto', marginRight: 'auto' }}>
          Croisement de tes données d&apos;entraînement, tests, zones et récupération
        </p>
      </div>
    )
  }

  // ── Phase : result ───────────────────────────────────────
  if (!report) return null

  const scoreColor = wpScoreColor(report.score_global)
  const circumference = 2 * Math.PI * 36
  const dashOffset = circumference * (1 - report.score_global / 100)
  const diag = report.diagnostic_entrainement

  return (
    <div style={{ padding: '4px 0' }}>

      {/* ─── 1. Header — score global ─────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <svg width="88" height="88" viewBox="0 0 88 88" style={{ flexShrink: 0 }}>
          <circle cx="44" cy="44" r="36" fill="none" stroke="var(--ai-border)" strokeWidth="6" />
          <circle cx="44" cy="44" r="36" fill="none" stroke={scoreColor} strokeWidth="6"
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            strokeLinecap="round" transform="rotate(-90 44 44)" />
          <text x="44" y="48" textAnchor="middle" fontSize="18" fontWeight="700" fill={scoreColor} fontFamily="Syne,sans-serif">
            {report.score_global}
          </text>
          <text x="44" y="60" textAnchor="middle" fontSize="9" fill="var(--ai-dim)" fontFamily="DM Sans,sans-serif">
            /100
          </text>
        </svg>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ai-text)', margin: '0 0 6px', fontFamily: 'Syne,sans-serif' }}>
            Score global
          </p>
          <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: 0, lineHeight: 1.6 }}>
            {report.resume}
          </p>
        </div>
      </div>

      {/* ─── 2. Profil athlétique global ──────────────────── */}
      {report.profil_athletique && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 0 8px' }}>
            Profil athlétique
          </p>
          {(report.profil_athletique.forces_majeures ?? []).map((f, i) => (
            <div key={`fg-${i}`} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', marginBottom: 4 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', margin: '0 0 2px' }}>{f.label}</p>
              <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: '0 0 2px', lineHeight: 1.4 }}>{f.detail}</p>
              {f.evidence && <p style={{ fontSize: 10, color: 'var(--ai-dim)', margin: 0, fontStyle: 'italic' }}>{f.evidence}</p>}
            </div>
          ))}
          {(report.profil_athletique.faiblesses_majeures ?? []).map((f, i) => (
            <div key={`fw-${i}`} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', marginBottom: 4, display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.15)', borderRadius: 4, padding: '2px 5px', alignSelf: 'flex-start', flexShrink: 0 }}>P{f.priority}</span>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', margin: '0 0 2px' }}>{f.label}</p>
                <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: '0 0 2px', lineHeight: 1.4 }}>{f.detail}</p>
                {f.evidence && <p style={{ fontSize: 10, color: 'var(--ai-dim)', margin: 0, fontStyle: 'italic' }}>{f.evidence}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── 3. Analyse par sport — accordéon ─────────────── */}
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 0 8px' }}>
        Analyse par sport
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {(report.sports_analysis ?? []).map((sa, i) => {
          const open   = expandedSport === i
          const sColor = wpScoreColor(sa.score)
          return (
            <div key={i} style={{ border: '1px solid var(--ai-border)', borderRadius: 10, overflow: 'hidden' }}>
              <button
                onClick={() => setExpandedSport(open ? null : i)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--ai-bg2)', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--ai-text)', textTransform: 'capitalize' }}>{sa.sport}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: sColor, fontVariantNumeric: 'tabular-nums' }}>{sa.score}/100</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ai-dim)" strokeWidth="2" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              {open && (
                <div style={{ padding: '12px 12px 14px', borderTop: '1px solid var(--ai-border)', background: 'var(--ai-bg)' }}>
                  {/* Profil type */}
                  {sa.profil && (
                    <p style={{ fontSize: 11, color: 'var(--ai-mid)', fontStyle: 'italic', margin: '0 0 10px', lineHeight: 1.4 }}>
                      {sa.profil}
                    </p>
                  )}
                  {/* Forces */}
                  {(sa.forces ?? []).length > 0 && (
                    <>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#22c55e', margin: '0 0 6px' }}>Forces</p>
                      {(sa.forces ?? []).map((f, fi) => (
                        <div key={fi} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', marginBottom: 4 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', margin: '0 0 2px' }}>{f.label}</p>
                          <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: '0 0 2px', lineHeight: 1.4 }}>{f.detail}</p>
                          {f.evidence && <p style={{ fontSize: 10, color: 'var(--ai-dim)', margin: 0, fontStyle: 'italic' }}>{f.evidence}</p>}
                        </div>
                      ))}
                    </>
                  )}
                  {/* Faiblesses */}
                  {(sa.faiblesses ?? []).length > 0 && (
                    <>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ef4444', margin: `${(sa.forces ?? []).length > 0 ? '10px' : '0'} 0 6px` }}>Faiblesses</p>
                      {(sa.faiblesses ?? []).sort((a, b) => a.priority - b.priority).map((f, fi) => (
                        <div key={fi} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', marginBottom: 4, display: 'flex', gap: 8 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.15)', borderRadius: 4, padding: '2px 5px', alignSelf: 'flex-start', flexShrink: 0 }}>P{f.priority}</span>
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', margin: '0 0 2px' }}>{f.label}</p>
                            <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: '0 0 2px', lineHeight: 1.4 }}>{f.detail}</p>
                            {f.evidence && <p style={{ fontSize: 10, color: 'var(--ai-dim)', margin: 0, fontStyle: 'italic' }}>{f.evidence}</p>}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {/* Évolution */}
                  {sa.evolution && (
                    <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ai-dim)', margin: '0 0 4px' }}>Tendance</p>
                      <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: 0, lineHeight: 1.4 }}>{sa.evolution}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ─── 4. Diagnostic de l'entraînement ─────────────── */}
      {diag && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 0 8px' }}>
            Diagnostic de l&apos;entraînement
          </p>
          {diag.resume && (
            <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 8px', lineHeight: 1.6 }}>{diag.resume}</p>
          )}
          {/* Points positifs */}
          {(diag.points_positifs ?? []).map((p, i) => (
            <div key={`dp-${i}`} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', marginBottom: 4 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', margin: '0 0 2px' }}>{p.label}</p>
              <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: 0, lineHeight: 1.4 }}>{p.detail}</p>
            </div>
          ))}
          {/* Points négatifs */}
          {(diag.points_negatifs ?? []).sort((a, b) => a.priority - b.priority).map((p, i) => (
            <div key={`dn-${i}`} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', marginBottom: 4, display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.15)', borderRadius: 4, padding: '2px 5px', alignSelf: 'flex-start', flexShrink: 0 }}>P{p.priority}</span>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', margin: '0 0 2px' }}>{p.label}</p>
                <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: 0, lineHeight: 1.4 }}>{p.detail}</p>
              </div>
            </div>
          ))}
          {/* 2 indicateurs statut */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
            {([
              { key: 'coherence_objectifs', label: 'Cohérence objectifs', val: diag.coherence_objectifs },
              { key: 'recuperation',        label: 'Récupération',        val: diag.recuperation },
            ] as const).map(({ key, label, val }) => val ? (
              <div key={key} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: wpStatusColor(val.status), flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ai-text)' }}>{label}</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: 0, lineHeight: 1.4 }}>{val.detail}</p>
              </div>
            ) : null)}
          </div>
        </div>
      )}

      {/* ─── 5. Plan d'action ────────────────────────────── */}
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 0 8px' }}>
        Plan d&apos;action
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {(report.plan_action ?? []).sort((a, b) => a.priority - b.priority).map((act, i) => {
          const open = expandedAction === i
          return (
            <div key={i} style={{ border: '1px solid var(--ai-border)', borderRadius: 10, overflow: 'hidden' }}>
              <button
                onClick={() => setExpandedAction(open ? null : i)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--ai-bg2)', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--ai-accent)', background: 'var(--ai-accent-dim)', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>
                  P{act.priority}
                </span>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--ai-text)' }}>{act.action}</span>
                <span style={{ fontSize: 10, color: 'var(--ai-dim)', textTransform: 'capitalize', flexShrink: 0 }}>{act.sport}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--ai-dim)" strokeWidth="2" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              {open && (
                <div style={{ padding: '10px 12px 12px', borderTop: '1px solid var(--ai-border)', background: 'var(--ai-bg)' }}>
                  {act.cible && (
                    <p style={{ fontSize: 10, color: 'var(--ai-dim)', margin: '0 0 6px', fontStyle: 'italic' }}>{act.cible}</p>
                  )}
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#22c55e', margin: '0 0 6px' }}>{act.impact}</p>
                  <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: 0, lineHeight: 1.6 }}>{act.detail}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ─── 6. Sources ──────────────────────────────────── */}
      {(report.sources_used ?? []).length > 0 && (
        <p style={{ fontSize: 10, color: 'var(--ai-dim)', margin: '0 0 12px', lineHeight: 1.5 }}>
          Sources : {report.sources_used.join(', ')}
        </p>
      )}

      {/* ─── 7. Fermer ───────────────────────────────────── */}
      <button onClick={onCancel} style={{
        width: '100%', padding: '10px', borderRadius: 10,
        border: '1px solid var(--ai-border)', background: 'transparent',
        color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer', marginTop: 4,
        fontFamily: 'DM Sans,sans-serif',
      }}>
        Fermer
      </button>
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
    question: 'Quand t\'entraînes-tu habituellement ?',
    options: ['Matin (avant 8h)', 'Milieu de journée', 'Fin de journée (17h-20h)', 'Horaires variables'],
  },
  {
    question: 'Comment gères-tu tes repas au quotidien ?',
    options: ['Je cuisine la plupart du temps', 'Mix cuisine maison et extérieur', 'Majoritairement extérieur ou livraison', 'Meal prep (préparation en avance)'],
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

// ── NutritionGate — vérification des données profil avant le questionnaire ──

type NutriMealTemplate = {
  nom: string; type_repas: string
  kcal: number | null; proteines: number | null; glucides: number | null; lipides: number | null
}

interface NutritionGateStatus {
  hasWeight: boolean
  hasHeight: boolean
  weight?: number
  height?: number
  activitiesCount: number
  racesCount: number
  hasZones: boolean
  mealTemplatesCount: number
}

function NutritionGate({ onContinue, onCancel }: {
  onContinue: (profile: { weight?: number; height?: number }, templates: NutriMealTemplate[]) => void
  onCancel: () => void
}) {
  const [status,    setStatus]    = useState<NutritionGateStatus | null>(null)
  const [templates, setTemplates] = useState<NutriMealTemplate[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { setLoading(false); return }

        const d3m = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)

        const [profRes, actRes, racesRes, zonesRes, mealsRes] = await Promise.all([
          sb.from('profiles').select('weight_kg,height_cm').eq('id', user.id).maybeSingle(),
          sb.from('activities').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('started_at', d3m),
          sb.from('planned_races').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          sb.from('training_zones').select('sport').eq('user_id', user.id).eq('is_current', true),
          sb.from('nutrition_meal_templates')
            .select('nom,type_repas,kcal,proteines,glucides,lipides')
            .eq('user_id', user.id).eq('actif', true),
        ])

        const tmpl = (mealsRes.data ?? []) as NutriMealTemplate[]
        setTemplates(tmpl)
        setStatus({
          hasWeight:          !!(profRes.data?.weight_kg),
          hasHeight:          !!(profRes.data?.height_cm),
          weight:             profRes.data?.weight_kg ?? undefined,
          height:             profRes.data?.height_cm ?? undefined,
          activitiesCount:    actRes.count ?? 0,
          racesCount:         racesRes.count ?? 0,
          hasZones:           (zonesRes.data ?? []).length > 0,
          mealTemplatesCount: tmpl.length,
        })
      } catch (err) {
        console.error('[NutritionGate]', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(249,115,22,0.2)', borderTop: '2px solid #f97316', animation: 'ai_spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 12, color: 'var(--ai-dim)', margin: 0 }}>Vérification du profil…</p>
      </div>
    )
  }

  const s = status
  const checks = [
    { label: 'Poids',                         ok: s?.hasWeight ?? false,              link: '/profile',     detail: s?.weight ? `${s.weight} kg` : null },
    { label: 'Taille',                         ok: s?.hasHeight ?? false,              link: '/profile',     detail: s?.height ? `${s.height} cm` : null },
    { label: 'Activités récentes (3 mois)',    ok: (s?.activitiesCount ?? 0) > 0,      link: '/activities',  detail: s?.activitiesCount ? `${s.activitiesCount} activités` : null },
    { label: 'Courses planifiées',             ok: (s?.racesCount ?? 0) > 0,           link: '/planning',    detail: s?.racesCount ? `${s.racesCount} courses` : null },
    { label: "Zones d'entraînement",          ok: s?.hasZones ?? false,              link: '/performance', detail: null },
    { label: 'Habitudes alimentaires',         ok: (s?.mealTemplatesCount ?? 0) > 0,  link: '/nutrition',   detail: s?.mealTemplatesCount ? `${s.mealTemplatesCount} repas types` : null },
  ]

  const okCount = checks.filter(c => c.ok).length
  const criticalMissing = !(s?.hasWeight)

  return (
    <div style={{ padding: '4px 0' }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ai-text)', margin: '0 0 6px', fontFamily: 'Syne,sans-serif' }}>
        Plan nutritionnel
      </p>
      <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 16px', lineHeight: 1.6 }}>
        {criticalMissing
          ? "Ton poids n'est pas renseigné — le plan sera moins précis. Tu peux le compléter dans ton profil."
          : 'Tes données sont vérifiées. Plus ton profil est complet, plus le plan sera précis.'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
        {checks.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: c.ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {c.ok ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
              ) : (
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              )}
            </div>
            <span style={{ flex: 1, fontSize: 12, color: c.ok ? 'var(--ai-text)' : 'var(--ai-mid)', fontWeight: c.ok ? 500 : 400 }}>
              {c.label}
            </span>
            {c.detail && (
              <span style={{ fontSize: 10, color: 'var(--ai-dim)', fontFamily: 'DM Mono,monospace' }}>{c.detail}</span>
            )}
            {!c.ok && (
              <a href={c.link} style={{ fontSize: 10, color: '#5b6fff', fontWeight: 600, textDecoration: 'none' }}>
                Compléter
              </a>
            )}
          </div>
        ))}
      </div>

      <p style={{ fontSize: 10, color: 'var(--ai-dim)', margin: '0 0 12px', textAlign: 'center' }}>
        {okCount}/{checks.length} données disponibles
      </p>

      <button onClick={() => onContinue({ weight: s?.weight, height: s?.height }, templates)} style={{
        width: '100%', padding: '11px', borderRadius: 10,
        background: 'linear-gradient(135deg,#f97316,#ef4444)',
        border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'Syne,sans-serif',
      }}>
        Continuer vers le questionnaire →
      </button>
      <button onClick={onCancel} style={{ display: 'block', margin: '8px auto 0', fontSize: 11, color: 'var(--ai-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
        Annuler
      </button>
    </div>
  )
}

// ── NutritionFlow — types ──────────────────────────────────────

interface NutriPlanDay {
  date: string
  type_jour: 'low' | 'mid' | 'hard'
  kcal: number
  proteines: number
  glucides: number
  lipides: number
  repas: {
    option_A: { petit_dejeuner: string; collation_matin: string; dejeuner: string; collation_apres_midi: string; diner: string; collation_soir: string }
    option_B: { petit_dejeuner: string; collation_matin: string; dejeuner: string; collation_apres_midi: string; diner: string; collation_soir: string }
  }
}

interface NutriPlanBlock {
  description: string
  calories_low: number; calories_mid: number; calories_hard: number
  macros_low: { proteines: number; glucides: number; lipides: number }
  macros_mid: { proteines: number; glucides: number; lipides: number }
  macros_hard: { proteines: number; glucides: number; lipides: number }
  jours: NutriPlanDay[]
}

interface NutriPlanGenerated {
  plan_minimal: NutriPlanBlock
  plan_maximal: NutriPlanBlock
  warnings: string[]
  resume: string
}

// ── NutritionFlow ──────────────────────────────────────────────

function NutritionFlow({ onCancel, onRecordConv }: {
  onCancel: () => void
  onRecordConv?: (userMsg: string, aiMsg: string) => void
}) {
  type NutriPhase = 'gate' | 'questionnaire' | 'generating' | 'result' | 'saved'

  // ── All hooks first (no conditional return before hooks) ──────
  const [phase,          setPhase]          = useState<NutriPhase>('gate')
  const [step,           setStep]           = useState(0)
  const [answers,        setAnswers]        = useState<string[][]>(Array(NUTRITION_STEPS.length).fill([]))
  const [profileData,    setProfileData]    = useState<{ weight?: number; height?: number }>({})
  const [templates,      setTemplates]      = useState<NutriMealTemplate[]>([])
  const [plan,           setPlan]           = useState<NutriPlanGenerated | null>(null)
  const [activePlanType, setActivePlanType] = useState<'minimal' | 'maximal'>('minimal')
  const [error,          setError]          = useState<string | null>(null)
  const [saving,         setSaving]         = useState(false)
  const [expandedDay,    setExpandedDay]    = useState<number | null>(null)

  // ── Gate ──────────────────────────────────────────────────────
  if (phase === 'gate') {
    return (
      <NutritionGate
        onContinue={(profile, tmpl) => { setProfileData(profile); setTemplates(tmpl); setPhase('questionnaire') }}
        onCancel={onCancel}
      />
    )
  }

  // ── Generating ───────────────────────────────────────────────
  if (phase === 'generating') {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(249,115,22,0.2)', borderTop: '3px solid #f97316', animation: 'ai_spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ai-text)', margin: '0 0 8px', fontFamily: 'Syne,sans-serif' }}>Ton plan nutritionnel est en cours de création…</p>
        <p style={{ fontSize: 12, color: 'var(--ai-dim)', margin: 0, lineHeight: 1.6 }}>Analyse de ton profil, tes entraînements et tes objectifs.</p>
      </div>
    )
  }

  // ── Saved ────────────────────────────────────────────────────
  if (phase === 'saved') {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ai-text)', margin: '0 0 6px', fontFamily: 'Syne,sans-serif' }}>Plan nutritionnel enregistré</p>
        <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 20px', lineHeight: 1.5 }}>
          Ton plan est actif dans la section Nutrition. Tu peux le consulter et suivre tes repas au quotidien.
        </p>
        <button onClick={onCancel} style={{
          padding: '10px 24px', borderRadius: 10, border: '1px solid var(--ai-border)',
          background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer',
        }}>
          Fermer
        </button>
      </div>
    )
  }

  // ── Generate ─────────────────────────────────────────────────
  async function generate() {
    setPhase('generating')
    setError(null)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('Non authentifié')

      const today    = new Date().toISOString().split('T')[0]
      const in14days = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]

      const [sessionsRes, racesRes] = await Promise.all([
        sb.from('planned_sessions')
          .select('week_start,day_index,sport,title,duration_min,intensity')
          .eq('user_id', user.id).gte('week_start', today).lte('week_start', in14days),
        sb.from('planned_races')
          .select('name,sport,date,level,goal_time')
          .eq('user_id', user.id).order('date'),
      ])

      const questionnaireData = NUTRITION_STEPS.map((s, i) => ({
        question: s.question,
        response: answers[i].join(', ') || 'Non précisé',
      }))

      const res = await fetch('/api/nutrition-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile:       { weight_kg: profileData.weight ?? null, height_cm: profileData.height ?? null },
          sessions:      sessionsRes.data ?? [],
          races:         racesRes.data ?? [],
          historyLogs:   [],
          questionnaire: questionnaireData,
          mealTemplates: templates,
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { plan?: NutriPlanGenerated; error?: string }
      if (data.error) throw new Error(data.error)
      if (!data.plan) throw new Error('Plan vide')
      setPlan(data.plan)
      setPhase('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de génération')
      setPhase('questionnaire')
      setStep(NUTRITION_STEPS.length - 1)
    }
  }

  // ── Save ─────────────────────────────────────────────────────
  async function savePlan() {
    if (!plan) return
    setSaving(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return

      const planData = activePlanType === 'minimal' ? plan.plan_minimal : plan.plan_maximal

      await sb.from('nutrition_plans').update({ actif: false }).eq('user_id', user.id)
      await sb.from('nutrition_plans').insert({
        user_id:   user.id,
        type:      activePlanType,
        plan_data: planData,
        actif:     true,
      })

      if (onRecordConv) {
        const userMsg = `Créer un plan nutritionnel — ${activePlanType}`
        const aiMsg   = `**Plan nutritionnel ${activePlanType === 'minimal' ? 'essentiel' : 'complet'}** généré et ajouté à ton planning nutrition.\n\n${plan.resume}\n\n**${planData.jours.length} jours** programmés · **${planData.calories_mid} kcal/jour** en moyenne`
        onRecordConv(userMsg, aiMsg)
      }
      setPhase('saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  // ── Result ───────────────────────────────────────────────────
  if (phase === 'result' && plan) {
    const currentPlan = activePlanType === 'minimal' ? plan.plan_minimal : plan.plan_maximal
    const MEAL_LABELS: Record<string, string> = {
      petit_dejeuner: 'Petit-déjeuner', collation_matin: 'Collation matin',
      dejeuner: 'Déjeuner', collation_apres_midi: 'Collation après-midi',
      diner: 'Dîner', collation_soir: 'Collation soir',
    }

    return (
      <div style={{ padding: '4px 0' }}>
        <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--ai-text)', margin: '0 0 4px', fontFamily: 'Syne,sans-serif' }}>Plan nutritionnel</p>
        <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 16px', lineHeight: 1.5 }}>{plan.resume}</p>

        {/* Sélecteur Essentiel / Complet */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['minimal', 'maximal'] as const).map(type => {
            const active = activePlanType === type
            const p = type === 'minimal' ? plan.plan_minimal : plan.plan_maximal
            return (
              <button key={type} onClick={() => setActivePlanType(type)} style={{
                flex: 1, padding: '12px', borderRadius: 12, textAlign: 'center',
                border: `1.5px solid ${active ? '#f97316' : 'var(--ai-border)'}`,
                background: active ? 'rgba(249,115,22,0.08)' : 'var(--ai-bg2)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: active ? '#f97316' : 'var(--ai-dim)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {type === 'minimal' ? 'Essentiel' : 'Complet'}
                </p>
                <p style={{ fontSize: 10, color: 'var(--ai-mid)', margin: 0, lineHeight: 1.4 }}>
                  {p.description.slice(0, 60)}{p.description.length > 60 ? '…' : ''}
                </p>
              </button>
            )
          })}
        </div>

        {/* KPIs 3 colonnes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Jour light',    kcal: currentPlan.calories_low,  macros: currentPlan.macros_low,  color: '#22c55e' },
            { label: 'Jour moyen',    kcal: currentPlan.calories_mid,  macros: currentPlan.macros_mid,  color: '#f97316' },
            { label: 'Jour intensif', kcal: currentPlan.calories_hard, macros: currentPlan.macros_hard, color: '#ef4444' },
          ].map(d => (
            <div key={d.label} style={{ padding: '10px', borderRadius: 10, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', textAlign: 'center' }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: d.color, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d.label}</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--ai-text)', margin: '0 0 4px', fontFamily: 'DM Mono,monospace' }}>{d.kcal}</p>
              <p style={{ fontSize: 9, color: 'var(--ai-dim)', margin: 0 }}>kcal</p>
              <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center', gap: 6, fontSize: 9, color: 'var(--ai-mid)' }}>
                <span>P:{d.macros.proteines}g</span>
                <span>G:{d.macros.glucides}g</span>
                <span>L:{d.macros.lipides}g</span>
              </div>
            </div>
          ))}
        </div>

        {/* Warnings */}
        {plan.warnings.length > 0 && (
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', marginBottom: 14 }}>
            {plan.warnings.map((w, i) => (
              <p key={i} style={{ fontSize: 11, color: '#f97316', margin: i > 0 ? '4px 0 0' : 0, lineHeight: 1.5 }}>⚠ {w}</p>
            ))}
          </div>
        )}

        {/* Jours accordéon */}
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
          Programme jour par jour — {currentPlan.jours.length} jours
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16, maxHeight: 300, overflowY: 'auto' }}>
          {currentPlan.jours.map((jour, i) => {
            const isExpanded = expandedDay === i
            const typeColor  = jour.type_jour === 'low' ? '#22c55e' : jour.type_jour === 'mid' ? '#f97316' : '#ef4444'
            const typeLabel  = jour.type_jour === 'low' ? 'Light' : jour.type_jour === 'mid' ? 'Moyen' : 'Intensif'
            const dayLabel   = new Date(jour.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
            return (
              <div key={i}>
                <button onClick={() => setExpandedDay(isExpanded ? null : i)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: isExpanded ? '8px 8px 0 0' : 8,
                  border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)',
                  cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: typeColor, minWidth: 50 }}>{typeLabel}</span>
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--ai-text)', fontWeight: 500 }}>{dayLabel}</span>
                  <span style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', color: 'var(--ai-dim)' }}>{jour.kcal} kcal</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--ai-dim)" strokeWidth="2" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                {isExpanded && (
                  <div style={{ padding: '10px 12px', borderRadius: '0 0 8px 8px', border: '1px solid var(--ai-border)', borderTop: 'none', background: 'var(--ai-bg)' }}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 10, color: 'var(--ai-mid)' }}>
                      <span>P: <strong>{jour.proteines}g</strong></span>
                      <span>G: <strong>{jour.glucides}g</strong></span>
                      <span>L: <strong>{jour.lipides}g</strong></span>
                    </div>
                    {(['petit_dejeuner', 'collation_matin', 'dejeuner', 'collation_apres_midi', 'diner', 'collation_soir'] as const).map(meal => {
                      const text = jour.repas.option_A[meal]
                      if (!text || text === '-') return null
                      return (
                        <div key={meal} style={{ marginBottom: 6 }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--ai-dim)', margin: '0 0 2px' }}>{MEAL_LABELS[meal]}</p>
                          <p style={{ fontSize: 12, color: 'var(--ai-text)', margin: 0, lineHeight: 1.5 }}>{text}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {error && <p style={{ fontSize: 12, color: '#ef4444', margin: '0 0 8px', textAlign: 'center' }}>{error}</p>}

        <button onClick={() => void savePlan()} disabled={saving} style={{
          width: '100%', padding: '12px', borderRadius: 10,
          background: saving ? 'var(--ai-border)' : 'linear-gradient(135deg,#f97316,#ef4444)',
          border: 'none', color: saving ? 'var(--ai-dim)' : '#fff', fontSize: 13, fontWeight: 700,
          cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Syne,sans-serif', marginBottom: 8,
        }}>
          {saving ? 'Enregistrement…' : 'Ajouter au planning nutrition →'}
        </button>
        <button onClick={onCancel} style={{
          width: '100%', padding: '10px', borderRadius: 10,
          border: '1px solid var(--ai-border)', background: 'transparent',
          color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer',
        }}>
          Annuler
        </button>
      </div>
    )
  }

  // ── Questionnaire ─────────────────────────────────────────────
  const cur     = NUTRITION_STEPS[step]
  const canNext = answers[step].length > 0
  const isLast  = step === NUTRITION_STEPS.length - 1

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
    if (step < NUTRITION_STEPS.length - 1) setStep(s => s + 1)
    else void generate()
  }

  return (
    <div style={{ padding: '8px 0 4px' }}>
      {/* Progression */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 3, background: 'var(--ai-border)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: `${((step + 1) / NUTRITION_STEPS.length) * 100}%`,
            background: 'linear-gradient(90deg,#f97316,#ef4444)',
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
              border: `1px solid ${on ? '#f97316' : 'var(--ai-border)'}`,
              background: on ? 'rgba(249,115,22,0.1)' : 'var(--ai-bg2)',
              color: on ? '#f97316' : 'var(--ai-mid)',
              fontSize: 12, fontWeight: on ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.12s',
              fontFamily: 'DM Sans,sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>{opt}</span>
              {on && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>
          )
        })}
      </div>

      {error && <p style={{ fontSize: 11, color: '#ef4444', margin: '0 0 10px', textAlign: 'center' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={{
            padding: '9px 14px', borderRadius: 9,
            border: '1px solid var(--ai-border)', background: 'transparent',
            color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer',
            fontFamily: 'DM Sans,sans-serif',
          }}>Retour</button>
        )}
        {step === 0 && (
          <button onClick={onCancel} style={{
            padding: '9px 14px', borderRadius: 9,
            border: '1px solid var(--ai-border)', background: 'transparent',
            color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer',
            fontFamily: 'DM Sans,sans-serif',
          }}>Annuler</button>
        )}
        <button onClick={next} disabled={!canNext} style={{
          flex: 1, padding: '9px 16px', borderRadius: 9, border: 'none',
          background: canNext ? 'linear-gradient(135deg,#f97316,#ef4444)' : 'var(--ai-border)',
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

type RechargeEventType = 'race_planned' | 'race_manual' | 'training'
type RechargeStep = 'gate' | 'event' | 'questions' | 'generating'

interface PlannedRaceOption {
  id: string
  name: string
  sport: string
  date: string
  level: string | null
  goal_time: string | null
}

function RechargeFlow({ onPrepare, onCancel }: { onPrepare: (apiPrompt: string, label: string) => void; onCancel: () => void }) {
  const [step, setStep] = useState<RechargeStep>('gate')
  const [loading, setLoading] = useState(false)

  // Gate data
  const [gateData, setGateData] = useState<{
    weight: number | null
    planNutritionActive: boolean
    plannedSessions: number
    plannedRaces: PlannedRaceOption[]
  } | null>(null)

  // Event step
  const [eventType, setEventType] = useState<RechargeEventType | null>(null)
  const [selectedRace, setSelectedRace] = useState<PlannedRaceOption | null>(null)
  const [manualRaceName, setManualRaceName] = useState('')
  const [manualRaceSport, setManualRaceSport] = useState('')
  const [manualRaceDate, setManualRaceDate] = useState('')
  const [trainingIntensity, setTrainingIntensity] = useState('')

  // Questions step
  const [nutritionExp, setNutritionExp] = useState('')
  const [solidsTolerance, setSolidsTolerance] = useState('')

  // Load gate data on mount
  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { setLoading(false); return }

        const now = new Date()
        const in2weeks = new Date(now); in2weeks.setDate(now.getDate() + 14)

        const [profileRes, planRes, sessionsRes, racesRes] = await Promise.all([
          sb.from('user_profiles').select('weight_kg').eq('user_id', user.id).maybeSingle(),
          sb.from('nutrition_plans').select('id').eq('user_id', user.id).eq('actif', true).maybeSingle(),
          sb.from('planned_sessions').select('id').eq('user_id', user.id).gte('week_start', now.toISOString().split('T')[0]).lte('week_start', in2weeks.toISOString().split('T')[0]),
          sb.from('planned_races').select('id,name,sport,date,level,goal_time').eq('user_id', user.id).gte('date', now.toISOString().split('T')[0]).order('date', { ascending: true }).limit(5),
        ])

        setGateData({
          weight: (profileRes.data?.weight_kg as number | null) ?? null,
          planNutritionActive: !!planRes.data,
          plannedSessions: sessionsRes.data?.length ?? 0,
          plannedRaces: (racesRes.data ?? []) as PlannedRaceOption[],
        })
      } catch {
        setGateData({ weight: null, planNutritionActive: false, plannedSessions: 0, plannedRaces: [] })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Detect if it's triathlon/ultra (needs solids question)
  function needsSolidsQuestion(): boolean {
    if (!eventType) return false
    if (eventType === 'race_planned' && selectedRace) {
      return selectedRace.sport === 'triathlon' || selectedRace.sport === 'trail'
    }
    if (eventType === 'race_manual') {
      return manualRaceSport === 'triathlon' || manualRaceSport === 'trail'
    }
    return false
  }

  function buildPrompt(): string {
    const weightStr = gateData?.weight ? `${gateData.weight}kg` : 'non renseigné'
    const planStr = gateData?.planNutritionActive ? 'actif' : 'non configuré'

    const nutritionExpLabel =
      nutritionExp === 'never' ? 'Jamais testé / ne mange pas pendant l\'effort'
      : nutritionExp === 'occasional' ? 'Gels ou boissons énergétiques occasionnellement'
      : nutritionExp === 'protocol' ? 'Protocole rodé : sait ce qu\'il tolère et combien'
      : ''

    const solidsLabel =
      solidsTolerance === 'yes' ? 'Oui, sans problème'
      : solidsTolerance === 'low_intensity' ? 'Seulement à faible intensité (marche, Z1-Z2)'
      : solidsTolerance === 'no' ? 'Non, uniquement liquide/gel'
      : ''

    let contextBlock = ''
    if (eventType === 'race_planned' && selectedRace) {
      contextBlock = `ÉVÉNEMENT CIBLE :
Course planifiée : ${selectedRace.name}
Sport : ${selectedRace.sport}
Date : ${selectedRace.date}
Niveau : ${selectedRace.level ?? 'non renseigné'}
Objectif temps : ${selectedRace.goal_time ?? 'non renseigné'}`
    } else if (eventType === 'race_manual') {
      contextBlock = `ÉVÉNEMENT CIBLE :
Course (saisie manuelle) : ${manualRaceName || 'non précisé'}
Sport : ${manualRaceSport || 'non précisé'}
Date : ${manualRaceDate || 'non précisée'}`
    } else {
      contextBlock = `CONTEXTE : Séance d'entraînement haute intensité
Intensité prévue : ${trainingIntensity || 'haute'}`
    }

    const systemPrompt = `Tu es un expert en nutrition sportive et stratégie glucidique pour athlètes d'endurance.

Crée un plan de recharge glucidique PERSONNALISÉ et PRÉCIS.

STRUCTURE OBLIGATOIRE :
${eventType !== 'training' ? `## Phase 1 — Recharge avant (J-3 à J-1)
Quantités précises en g/kg/jour. Aliments recommandés. Timing des repas. Aliments à éviter.

## Phase 2 — Jour J (avant l'épreuve)
Dernier repas : timing, contenu, quantités. Collation pré-départ si applicable.

## Phase 3 — Pendant l'effort
Stratégie glucidique en g/h selon la durée et l'intensité. Sources recommandées (gel, boisson, solides si toléré). Hydratation. Planning sur la durée de l'épreuve.

## Phase 4 — Récupération post-effort
Fenêtre anabolique 30-60min. Repas récupération. Durée de la phase.` : `## Avant la séance (J-1 et matin J)
Quantités en g/kg. Timing optimal.

## Pendant la séance
Stratégie en g/h si durée > 75min. Sources adaptées.

## Après la séance
Récupération glucidique et protéique.`}

## Points de vigilance personnalisés
Basé sur l'expérience nutrition déclarée : ${nutritionExpLabel || 'non renseignée'}

TERMINE TOUJOURS PAR :
## Sources et niveau de confiance
Sources utilisées : [liste des données disponibles]
Niveau de confiance : [élevé/modéré/faible] — [justification]`

    const userPrompt = `${contextBlock}

PROFIL ATHLÈTE :
Poids : ${weightStr}
Plan nutritionnel : ${planStr}
Séances planifiées (2 semaines) : ${gateData?.plannedSessions ?? 0}

EXPÉRIENCE NUTRITION EFFORT : ${nutritionExpLabel || 'non renseignée'}
${needsSolidsQuestion() && solidsLabel ? `TOLÉRANCE SOLIDES : ${solidsLabel}` : ''}`

    return systemPrompt + '\n\n' + userPrompt
  }

  // ── Step: gate ──────────────────────────────────────────────
  if (step === 'gate') {
    return (
      <div style={{ padding: '8px 0 4px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 5px', fontFamily: 'Syne,sans-serif' }}>
          Recharge glucidique
        </p>
        <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 14px' }}>
          Stratégie nutritionnelle avant un effort important
        </p>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ai-dim)', fontSize: 11, marginBottom: 14 }}>
            <Dots />
            <span>Chargement de ton profil…</span>
          </div>
        ) : gateData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            <div style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--ai-mid)', fontFamily: 'DM Sans,sans-serif' }}>Poids</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: gateData.weight ? 'var(--ai-text)' : '#f97316', fontFamily: 'DM Mono,monospace' }}>
                {gateData.weight ? `${gateData.weight} kg` : 'non renseigné'}
              </span>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--ai-mid)', fontFamily: 'DM Sans,sans-serif' }}>Plan nutritionnel</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: gateData.planNutritionActive ? '#22c55e' : '#f97316', fontFamily: 'DM Sans,sans-serif' }}>
                {gateData.planNutritionActive ? 'actif' : 'non configuré'}
              </span>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--ai-mid)', fontFamily: 'DM Sans,sans-serif' }}>Séances planifiées (2 sem.)</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ai-text)', fontFamily: 'DM Mono,monospace' }}>
                {gateData.plannedSessions}
              </span>
            </div>
            {gateData.plannedRaces.length > 0 && (
              <div style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--ai-mid)', fontFamily: 'DM Sans,sans-serif' }}>Courses planifiées</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', fontFamily: 'DM Mono,monospace' }}>
                  {gateData.plannedRaces.length} course{gateData.plannedRaces.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
            Annuler
          </button>
          <button onClick={() => setStep('event')} disabled={loading} style={{ flex: 1, padding: '9px 16px', borderRadius: 9, border: 'none', background: loading ? 'var(--ai-border)' : 'var(--ai-gradient)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
            Continuer
          </button>
        </div>
      </div>
    )
  }

  // ── Step: event ──────────────────────────────────────────────
  if (step === 'event') {
    const plannedRaces = gateData?.plannedRaces ?? []
    return (
      <div style={{ padding: '8px 0 4px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 5px', fontFamily: 'Syne,sans-serif' }}>
          Pour quel objectif ?
        </p>
        <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 14px' }}>
          La stratégie diffère selon le contexte
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
          {plannedRaces.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--ai-dim)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'DM Sans,sans-serif' }}>
                Courses planifiées
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {plannedRaces.map(race => (
                  <button key={race.id} onClick={() => { setEventType('race_planned'); setSelectedRace(race) }} style={{
                    padding: '10px 12px', borderRadius: 9, textAlign: 'left',
                    border: `1px solid ${eventType === 'race_planned' && selectedRace?.id === race.id ? '#5b6fff' : 'var(--ai-border)'}`,
                    background: eventType === 'race_planned' && selectedRace?.id === race.id ? 'rgba(91,111,255,0.1)' : 'var(--ai-bg2)',
                    cursor: 'pointer', transition: 'all 0.12s',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: eventType === 'race_planned' && selectedRace?.id === race.id ? '#5b6fff' : 'var(--ai-text)', fontFamily: 'Syne,sans-serif' }}>
                      {race.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--ai-dim)', marginTop: 2, fontFamily: 'DM Sans,sans-serif' }}>
                      {race.sport} · {race.date}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => { setEventType('race_manual'); setSelectedRace(null) }} style={{
            padding: '10px 12px', borderRadius: 9, textAlign: 'left',
            border: `1px solid ${eventType === 'race_manual' ? '#5b6fff' : 'var(--ai-border)'}`,
            background: eventType === 'race_manual' ? 'rgba(91,111,255,0.1)' : 'var(--ai-bg2)',
            cursor: 'pointer', transition: 'all 0.12s',
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: eventType === 'race_manual' ? '#5b6fff' : 'var(--ai-text)', fontFamily: 'Syne,sans-serif' }}>
              Autre compétition
            </div>
            <div style={{ fontSize: 10, color: 'var(--ai-dim)', marginTop: 2, fontFamily: 'DM Sans,sans-serif' }}>
              Saisir manuellement nom, sport et date
            </div>
          </button>

          <button onClick={() => { setEventType('training'); setSelectedRace(null) }} style={{
            padding: '10px 12px', borderRadius: 9, textAlign: 'left',
            border: `1px solid ${eventType === 'training' ? '#5b6fff' : 'var(--ai-border)'}`,
            background: eventType === 'training' ? 'rgba(91,111,255,0.1)' : 'var(--ai-bg2)',
            cursor: 'pointer', transition: 'all 0.12s',
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: eventType === 'training' ? '#5b6fff' : 'var(--ai-text)', fontFamily: 'Syne,sans-serif' }}>
              Séance d'entraînement
            </div>
            <div style={{ fontSize: 10, color: 'var(--ai-dim)', marginTop: 2, fontFamily: 'DM Sans,sans-serif' }}>
              Session haute intensité ou longue distance
            </div>
          </button>
        </div>

        {eventType === 'race_manual' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            <input
              placeholder="Nom de la compétition"
              value={manualRaceName}
              onChange={e => setManualRaceName(e.target.value)}
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', color: 'var(--ai-text)', fontSize: 12, outline: 'none', fontFamily: 'DM Sans,sans-serif' }}
            />
            <div style={{ display: 'flex', gap: 7 }}>
              {['running', 'cycling', 'triathlon', 'trail'].map(sp => (
                <button key={sp} onClick={() => setManualRaceSport(sp)} style={{
                  flex: 1, padding: '7px 4px', borderRadius: 7, fontSize: 10,
                  border: `1px solid ${manualRaceSport === sp ? '#5b6fff' : 'var(--ai-border)'}`,
                  background: manualRaceSport === sp ? 'rgba(91,111,255,0.1)' : 'var(--ai-bg2)',
                  color: manualRaceSport === sp ? '#5b6fff' : 'var(--ai-mid)',
                  cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
                }}>
                  {sp === 'running' ? 'Course' : sp === 'cycling' ? 'Vélo' : sp === 'triathlon' ? 'Tri' : 'Trail'}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={manualRaceDate}
              onChange={e => setManualRaceDate(e.target.value)}
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', color: 'var(--ai-text)', fontSize: 12, outline: 'none', fontFamily: 'DM Sans,sans-serif' }}
            />
          </div>
        )}

        {eventType === 'training' && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--ai-dim)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Intensité prévue</p>
            <div style={{ display: 'flex', gap: 6 }}>
              {['Haute', 'Très haute', 'Longue distance'].map(lvl => (
                <button key={lvl} onClick={() => setTrainingIntensity(lvl)} style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 10,
                  border: `1px solid ${trainingIntensity === lvl ? '#5b6fff' : 'var(--ai-border)'}`,
                  background: trainingIntensity === lvl ? 'rgba(91,111,255,0.1)' : 'var(--ai-bg2)',
                  color: trainingIntensity === lvl ? '#5b6fff' : 'var(--ai-mid)',
                  cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
                }}>
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setStep('gate')} style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
            Retour
          </button>
          <button onClick={() => setStep('questions')} disabled={!eventType} style={{ flex: 1, padding: '9px 16px', borderRadius: 9, border: 'none', background: eventType ? 'var(--ai-gradient)' : 'var(--ai-border)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: eventType ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans,sans-serif' }}>
            Continuer
          </button>
        </div>
      </div>
    )
  }

  // ── Step: questions ───────────────────────────────────────────
  if (step === 'questions') {
    const showSolids = needsSolidsQuestion()
    return (
      <div style={{ padding: '8px 0 4px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 5px', fontFamily: 'Syne,sans-serif' }}>
          Ton expérience nutrition
        </p>
        <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 14px' }}>
          {showSolids ? '2 questions pour personnaliser ton plan' : '1 question pour personnaliser ton plan'}
        </p>

        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ai-mid)', margin: '0 0 8px', fontFamily: 'DM Sans,sans-serif' }}>
            Quelle est ton expérience avec la nutrition pendant l'effort ?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {([
              { id: 'never', label: 'Jamais testé / je ne mange pas pendant l\'effort' },
              { id: 'occasional', label: 'Gels ou boissons énergétiques occasionnellement' },
              { id: 'protocol', label: 'Protocole rodé : je sais ce que je tolère et combien' },
            ] as { id: string; label: string }[]).map(opt => (
              <button key={opt.id} onClick={() => setNutritionExp(opt.id)} style={{
                padding: '10px 12px', borderRadius: 8, textAlign: 'left',
                border: `1px solid ${nutritionExp === opt.id ? '#5b6fff' : 'var(--ai-border)'}`,
                background: nutritionExp === opt.id ? 'rgba(91,111,255,0.1)' : 'var(--ai-bg2)',
                color: nutritionExp === opt.id ? '#5b6fff' : 'var(--ai-mid)',
                fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', transition: 'all 0.12s',
              }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {showSolids && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ai-mid)', margin: '0 0 8px', fontFamily: 'DM Sans,sans-serif' }}>
              Tolères-tu les aliments solides pendant l'effort ?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {([
                { id: 'yes', label: 'Oui, sans problème' },
                { id: 'low_intensity', label: 'Seulement à faible intensité (marche, Z1-Z2)' },
                { id: 'no', label: 'Non, uniquement du liquide/gel' },
              ] as { id: string; label: string }[]).map(opt => (
                <button key={opt.id} onClick={() => setSolidsTolerance(opt.id)} style={{
                  padding: '10px 12px', borderRadius: 8, textAlign: 'left',
                  border: `1px solid ${solidsTolerance === opt.id ? '#5b6fff' : 'var(--ai-border)'}`,
                  background: solidsTolerance === opt.id ? 'rgba(91,111,255,0.1)' : 'var(--ai-bg2)',
                  color: solidsTolerance === opt.id ? '#5b6fff' : 'var(--ai-mid)',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', transition: 'all 0.12s',
                }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setStep('event')} style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
            Retour
          </button>
          <button onClick={() => {
            const prompt = buildPrompt()
            const label = 'Recharge glucidique — ' + (eventType === 'training' ? 'Entraînement' : (selectedRace?.name ?? manualRaceName ?? 'Compétition'))
            onPrepare(prompt, label)
          }} disabled={!nutritionExp || (showSolids && !solidsTolerance)} style={{
            flex: 1, padding: '9px 16px', borderRadius: 9, border: 'none',
            background: (!nutritionExp || (showSolids && !solidsTolerance)) ? 'var(--ai-border)' : 'var(--ai-gradient)',
            color: '#fff', fontSize: 12, fontWeight: 700,
            cursor: (!nutritionExp || (showSolids && !solidsTolerance)) ? 'not-allowed' : 'pointer',
            fontFamily: 'DM Sans,sans-serif',
          }}>
            Créer mon plan
          </button>
        </div>
      </div>
    )
  }

  return null
}

// ── AnalyzeTestFlow ───────────────────────────────────────────

interface TestRow {
  id: string
  date: string
  valeurs: Record<string, unknown>
  notes: string | null
  test_definition_id: string
  test_definitions: { nom: string; sport: string; fields?: unknown } | null
}

interface TestReport {
  interpretation: { niveau: string; signification: string; detail: string }
  fiabilite: {
    score: number
    facteurs: { label: string; impact: string; status: 'ok' | 'warning' | 'critical' }[]
    estimation_corrigee: string | null
  }
  evolution: {
    disponible: boolean
    tests: { date: string; valeur: number; delta_pct: number | null }[]
    tendance: string
    projection_3mois: string | null
  }
  impact_zones: {
    mise_a_jour_necessaire: boolean
    ecart_pct: number | null
    zones_estimees: {
      zone: string; label: string
      hr_min?: number; hr_max?: number
      watts_min?: number; watts_max?: number
      allure_min?: string; allure_max?: string
    }[] | null
    detail: string
  }
  recommandations: { label: string; detail: string }[]
  sources_used: string[]
  confiance: 'élevée' | 'modérée' | 'faible'
}

function TestEvolutionMiniChart({ points }: { points: { date: string; valeur: number }[] }) {
  if (points.length < 2) return null
  const W = 280, H = 60, PAD = 16
  const vals = points.map(p => p.valeur)
  const minV = Math.min(...vals) * 0.97
  const maxV = Math.max(...vals) * 1.03
  const sx = (i: number) => PAD + (i / (points.length - 1)) * (W - 2 * PAD)
  const sy = (v: number) => H - PAD - ((v - minV) / (maxV - minV || 1)) * (H - 2 * PAD)
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(i)},${sy(p.valeur)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 60 }}>
      <path d={d} fill="none" stroke="var(--ai-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={sx(i)} cy={sy(p.valeur)} r={3} fill="var(--ai-accent)" />
          <text x={sx(i)} y={sy(p.valeur) - 6} textAnchor="middle" fontSize="8" fill="var(--ai-text)" fontFamily="DM Mono,monospace">{p.valeur}</text>
          <text x={sx(i)} y={H - 2} textAnchor="middle" fontSize="7" fill="var(--ai-dim)">{new Date(p.date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}</text>
        </g>
      ))}
    </svg>
  )
}

function AnalyzeTestFlow({ onCancel, onRecordConv }: {
  onCancel: () => void
  onRecordConv?: (userMsg: string, aiMsg: string) => void
}) {
  type Phase = 'loading' | 'gate' | 'sport' | 'select' | 'generating' | 'result'
  const [phase, setPhase] = useState<Phase>('loading')
  const [sport, setSport] = useState<string | null>(null)
  const [tests, setTests] = useState<TestRow[]>([])
  const [testContexts, setTestContexts] = useState<Map<string, { tssWeek: number; hrv: number | null; hrvBaseline: number | null; validityScore: number }>>(new Map())
  const [selectedTest, setSelectedTest] = useState<TestRow | null>(null)
  const [report, setReport] = useState<TestReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ctxData, setCtxData] = useState<{ zones: unknown; profile: unknown; allTests: TestRow[] } | null>(null)
  const [gateData, setGateData] = useState<{
    testsCount: number
    sportCounts: Record<string, number>
    zonesCount: number
    profileOk: boolean
  } | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { setError('Non connecté'); return }

        const [testsRes, zonesRes, profileRes] = await Promise.all([
          sb.from('test_results').select('id,test_definition_id,test_definitions(sport)').eq('user_id', user.id),
          sb.from('training_zones').select('sport').eq('user_id', user.id).eq('is_current', true),
          sb.from('athlete_performance_profile').select('id').eq('user_id', user.id).maybeSingle(),
        ])

        const rows = (testsRes.data ?? []) as unknown as { id: string; test_definition_id: string; test_definitions: { sport: string } | null }[]
        const sportCounts: Record<string, number> = {}
        for (const r of rows) {
          const sp = r.test_definitions?.sport ?? 'inconnu'
          sportCounts[sp] = (sportCounts[sp] ?? 0) + 1
        }

        setGateData({
          testsCount: rows.length,
          sportCounts,
          zonesCount: (zonesRes.data ?? []).length,
          profileOk: !!profileRes.data,
        })
        setPhase('gate')
      } catch {
        setError('Erreur de chargement')
      }
    })()
  }, [])

  async function loadTestsForSport(sp: string) {
    setSport(sp)
    setPhase('generating')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return

      const { data: defs } = await sb.from('test_definitions').select('id,nom,sport,fields').eq('sport', sp)
      if (!defs?.length) { setTests([]); setPhase('select'); return }

      const defIds = defs.map((d: { id: string }) => d.id)
      const { data: results } = await sb.from('test_results')
        .select('id,date,valeurs,notes,test_definition_id,test_definitions(nom,sport,fields)')
        .in('test_definition_id', defIds).eq('user_id', user.id)
        .order('date', { ascending: false }).limit(20)

      const rows = (results as unknown as TestRow[]) ?? []

      const [zonesRes, profileRes] = await Promise.all([
        sb.from('training_zones').select('*').eq('user_id', user.id).eq('sport', sp).eq('is_current', true).maybeSingle(),
        sb.from('athlete_performance_profile').select('*').eq('user_id', user.id).maybeSingle(),
      ])

      setCtxData({ zones: zonesRes.data, profile: profileRes.data, allTests: rows })

      const ctxMap = new Map<string, { tssWeek: number; hrv: number | null; hrvBaseline: number | null; validityScore: number }>()
      await Promise.all(rows.map(async (test: TestRow) => {
        const testDate = test.date
        const d7before = new Date(new Date(testDate).getTime() - 7 * 86400000).toISOString().slice(0, 10)
        const d28before = new Date(new Date(testDate).getTime() - 28 * 86400000).toISOString().slice(0, 10)

        const [actsRes, hrvRes, hrvHistRes] = await Promise.all([
          sb.from('activities').select('tss')
            .gte('started_at', d7before + 'T00:00:00').lt('started_at', testDate + 'T00:00:00'),
          Promise.resolve(sb.from('metrics_daily').select('*').eq('user_id', user.id).eq('date', testDate).maybeSingle()).catch(() => ({ data: null })),
          Promise.resolve(sb.from('metrics_daily').select('*').eq('user_id', user.id).gte('date', d28before).lte('date', testDate)).catch(() => ({ data: [] })),
        ])

        const tssWeek = (actsRes.data ?? []).reduce((s: number, a: { tss: number | null }) => s + (a.tss ?? 0), 0)
        const hrv = (hrvRes.data?.hrv as number | null) ?? null
        const hrvValues = (hrvHistRes.data ?? []).filter((m: { hrv: number | null }) => m.hrv != null).map((m: { hrv: number | null }) => m.hrv as number)
        const hrvBaseline = hrvValues.length > 5 ? Math.round(hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length) : null

        let validity = 100
        if (hrv != null && hrvBaseline != null && hrv < hrvBaseline * 0.9) validity -= 25
        if (tssWeek > 500) validity -= 20
        else if (tssWeek > 350) validity -= 10

        ctxMap.set(test.id, { tssWeek: Math.round(tssWeek), hrv, hrvBaseline, validityScore: Math.max(0, validity) })
      }))

      setTests(rows)
      setTestContexts(ctxMap)
      setPhase('select')
    } catch {
      setPhase('sport')
    }
  }

  async function handleGenerate() {
    if (!selectedTest || !ctxData) return
    setPhase('generating')
    setError(null)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return

      const { data: rulesData } = await sb.from('ai_rules').select('category,rule_text').eq('user_id', user.id).eq('active', true)
      const rules = (rulesData ?? []) as { category: string; rule_text: string }[]

      const ctx = testContexts.get(selectedTest.id)

      const res = await fetch('/api/analyze-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test: selectedTest,
          testContext: ctx ?? null,
          allTestsSameType: ctxData.allTests.filter(t => t.test_definition_id === selectedTest.test_definition_id),
          zones: ctxData.zones,
          profile: ctxData.profile,
          aiRules: rules,
        }),
      })
      const data = await res.json() as { report?: TestReport; error?: string }
      if (data.error || !data.report) throw new Error(data.error ?? 'Réponse invalide')
      setReport(data.report)

      if (onRecordConv) {
        const testNom = selectedTest.test_definitions?.nom ?? 'Test'
        const userMsg = `Analyser un test — ${testNom} du ${selectedTest.date}`
        const aiMsg = `**Analyse du test ${testNom}** — ${selectedTest.date}\n\nNiveau : ${data.report.interpretation.niveau}\nFiabilité : ${data.report.fiabilite.score}%\n${data.report.evolution.disponible ? `Évolution : ${data.report.evolution.tendance}` : ''}\n${data.report.impact_zones.mise_a_jour_necessaire ? '⚠ Mise à jour des zones recommandée' : 'Zones à jour'}`
        onRecordConv(userMsg, aiMsg)
      }

      setPhase('result')
    } catch (err) {
      setError(String(err))
      setPhase('select')
    }
  }

  if (phase === 'loading') {
    return (
      <div style={{ padding: '16px 0', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ai-dim)', fontSize: 12 }}>
        <Dots /><span>Chargement…</span>
      </div>
    )
  }

  if (phase === 'gate' && gateData) {
    const hasSports = Object.keys(gateData.sportCounts).length > 0
    return (
      <div style={{ padding: '8px 0 4px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ai-text)', margin: '0 0 12px', fontFamily: 'Syne,sans-serif' }}>
          Analyser un test
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ color: hasSports ? '#22c55e' : '#ef4444' }}>{hasSports ? '✓' : '✗'}</span>
            <span style={{ color: 'var(--ai-mid)' }}>
              {hasSports
                ? `${gateData.testsCount} test${gateData.testsCount > 1 ? 's' : ''} réalisé${gateData.testsCount > 1 ? 's' : ''} (${Object.keys(gateData.sportCounts).join(', ')})`
                : 'Aucun test réalisé'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ color: gateData.zonesCount > 0 ? '#22c55e' : '#f97316' }}>{gateData.zonesCount > 0 ? '✓' : '⚠'}</span>
            <span style={{ color: 'var(--ai-mid)' }}>
              {gateData.zonesCount > 0 ? `Zones configurées pour ${gateData.zonesCount} sport${gateData.zonesCount > 1 ? 's' : ''}` : 'Zones non configurées (comparaison limitée)'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ color: gateData.profileOk ? '#22c55e' : '#f97316' }}>{gateData.profileOk ? '✓' : '⚠'}</span>
            <span style={{ color: 'var(--ai-mid)' }}>
              {gateData.profileOk ? 'Profil de performance renseigné' : 'Profil incomplet'}
            </span>
          </div>
        </div>
        {!hasSports ? (
          <div style={{ padding: '12px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 14, fontSize: 12, color: '#ef4444', lineHeight: 1.5 }}>
            Aucun test réalisé. Rends-toi dans <strong>Performance → Tests</strong> pour enregistrer ton premier test.
          </div>
        ) : null}
        {error && <p style={{ fontSize: 11, color: '#ef4444', margin: '0 0 8px' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
            Annuler
          </button>
          {hasSports && (
            <button onClick={() => setPhase('sport')} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: 'var(--ai-gradient)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
              Continuer
            </button>
          )}
        </div>
      </div>
    )
  }

  if (phase === 'sport' && gateData) {
    const availableSports = Object.keys(gateData.sportCounts)
    return (
      <div style={{ padding: '8px 0 4px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ai-text)', margin: '0 0 4px', fontFamily: 'Syne,sans-serif' }}>Quel sport analyser ?</p>
        <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 14px' }}>
          {availableSports.map(sp => `${AE_SPORT_LABELS[sp] ?? sp} (${gateData.sportCounts[sp]})`).join(' · ')}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
          {availableSports.map(sp => (
            <button key={sp} onClick={() => void loadTestsForSport(sp)}
              style={{ padding: '8px 16px', borderRadius: 20, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', color: 'var(--ai-mid)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', transition: 'all 0.12s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#5b6fff'; (e.currentTarget as HTMLButtonElement).style.color = '#5b6fff' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--ai-border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--ai-mid)' }}
            >
              {AE_SPORT_LABELS[sp] ?? sp}
            </button>
          ))}
        </div>
        <button onClick={() => setPhase('gate')} style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer' }}>
          Retour
        </button>
      </div>
    )
  }

  if (phase === 'generating' && !report) {
    return (
      <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--ai-dim)' }}>
        <Dots />
        <p style={{ fontSize: 12, margin: 0 }}>Analyse en cours — croisement de tes données…</p>
      </div>
    )
  }

  if (phase === 'select') {
    if (!tests.length) {
      return (
        <div style={{ padding: '8px 0 4px' }}>
          <div style={{ padding: '16px', borderRadius: 10, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', marginBottom: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 6px', fontFamily: 'Syne,sans-serif' }}>
              Aucun test en {AE_SPORT_LABELS[sport ?? ''] ?? sport}
            </p>
            <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: 0 }}>
              Va dans <strong>Performance → Tests</strong> pour en ajouter.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPhase('sport')} style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer' }}>
              Autre sport
            </button>
            <button onClick={onCancel} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: 'var(--ai-bg2)', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer' }}>
              Fermer
            </button>
          </div>
        </div>
      )
    }

    const byDef: Record<string, TestRow[]> = {}
    for (const t of tests) {
      if (!byDef[t.test_definition_id]) byDef[t.test_definition_id] = []
      byDef[t.test_definition_id].push(t)
    }
    for (const k of Object.keys(byDef)) byDef[k].sort((a, b) => a.date.localeCompare(b.date))

    return (
      <div style={{ padding: '8px 0 4px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ai-text)', margin: '0 0 4px', fontFamily: 'Syne,sans-serif' }}>
          {tests.length} test{tests.length > 1 ? 's' : ''} en {AE_SPORT_LABELS[sport ?? ''] ?? sport}
        </p>
        <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 12px' }}>Sélectionne un test à analyser</p>
        {error && <p style={{ fontSize: 11, color: '#ef4444', margin: '0 0 8px' }}>{error}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {tests.map(t => {
            const ctx = testContexts.get(t.id)
            const isSelected = selectedTest?.id === t.id
            const sameType = byDef[t.test_definition_id] ?? []
            const prevTest = sameType.filter(x => x.date < t.date).slice(-1)[0]
            let deltaPct: number | null = null
            if (prevTest) {
              const prevVal = Object.values(prevTest.valeurs)[0]
              const curVal = Object.values(t.valeurs)[0]
              if (typeof prevVal === 'number' && typeof curVal === 'number' && prevVal > 0) {
                deltaPct = Math.round(((curVal - prevVal) / prevVal) * 1000) / 10
              }
            }
            const validityColor = ctx
              ? ctx.validityScore >= 80 ? '#22c55e' : ctx.validityScore >= 60 ? '#f97316' : '#ef4444'
              : 'var(--ai-dim)'

            return (
              <div key={t.id} onClick={() => setSelectedTest(isSelected ? null : t)}
                style={{
                  padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                  border: `1px solid ${isSelected ? 'var(--ai-accent)' : 'var(--ai-border)'}`,
                  background: isSelected ? 'rgba(91,111,255,0.06)' : 'var(--ai-bg2)',
                  transition: 'all 0.12s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ai-text)', fontFamily: 'Syne,sans-serif' }}>
                    {t.test_definitions?.nom ?? 'Test'}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--ai-dim)', fontFamily: 'DM Mono,monospace' }}>{t.date}</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'DM Mono,monospace', color: 'var(--ai-accent)', marginBottom: 6 }}>
                  {Object.entries(t.valeurs).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                </div>
                {ctx && (
                  <div style={{ fontSize: 11, color: 'var(--ai-mid)', lineHeight: 1.6, marginBottom: 6 }}>
                    <div>TSS semaine précédente : <strong>{ctx.tssWeek}pts</strong>
                      {ctx.tssWeek > 500 ? <span style={{ color: '#ef4444' }}> (charge élevée)</span> : ctx.tssWeek > 350 ? <span style={{ color: '#f97316' }}> (charge modérée)</span> : <span style={{ color: '#22c55e' }}> (charge normale)</span>}
                    </div>
                    {ctx.hrv != null ? (
                      <div>HRV ce jour : <strong>{ctx.hrv}ms</strong>
                        {ctx.hrvBaseline != null && (
                          <span> vs baseline {ctx.hrvBaseline}ms
                            <span style={{ color: ctx.hrv >= ctx.hrvBaseline * 0.9 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                              {' '}{ctx.hrv >= ctx.hrvBaseline ? '+' : ''}{Math.round(((ctx.hrv - ctx.hrvBaseline) / ctx.hrvBaseline) * 100)}%
                            </span>
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--ai-dim)', fontStyle: 'italic' }}>HRV non disponible ce jour</div>
                    )}
                  </div>
                )}
                {ctx && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ai-dim)', marginBottom: 2 }}>
                      <span>Fiabilité estimée</span>
                      <span style={{ color: validityColor, fontWeight: 700 }}>{ctx.validityScore}%</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'var(--ai-bg)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${ctx.validityScore}%`, background: validityColor, borderRadius: 2, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                )}
                {deltaPct !== null && (
                  <div style={{ fontSize: 11, fontWeight: 600, color: deltaPct >= 0 ? '#22c55e' : '#ef4444' }}>
                    {deltaPct >= 0 ? '↑' : '↓'} {deltaPct >= 0 ? '+' : ''}{deltaPct}% vs {prevTest?.date}
                  </div>
                )}
                {isSelected && sameType.length >= 2 && (
                  <div style={{ marginTop: 8, padding: '8px', borderRadius: 8, background: 'var(--ai-bg)' }}>
                    <p style={{ fontSize: 9, color: 'var(--ai-dim)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Évolution</p>
                    <TestEvolutionMiniChart points={sameType.map(x => ({
                      date: x.date,
                      valeur: typeof Object.values(x.valeurs)[0] === 'number' ? Object.values(x.valeurs)[0] as number : 0,
                    }))} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setPhase('sport'); setTests([]); setTestContexts(new Map()) }}
            style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer' }}>
            Retour
          </button>
          <button onClick={() => void handleGenerate()}
            disabled={!selectedTest}
            style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: selectedTest ? 'var(--ai-gradient)' : 'var(--ai-bg2)', color: selectedTest ? '#fff' : 'var(--ai-dim)', fontSize: 12, fontWeight: 700, cursor: selectedTest ? 'pointer' : 'not-allowed' }}>
            Analyser ce test →
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'result' && report && selectedTest) {
    const testNom = selectedTest.test_definitions?.nom ?? 'Test'
    const confidenceColor = report.confiance === 'élevée' ? '#22c55e' : report.confiance === 'modérée' ? '#f97316' : '#ef4444'

    return (
      <div style={{ padding: '8px 0 4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ai-text)', margin: '0 0 2px', fontFamily: 'Syne,sans-serif' }}>
              {testNom} · {selectedTest.date}
            </p>
            <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: 0 }}>
              {Object.entries(selectedTest.valeurs).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' · ')}
            </p>
          </div>
        </div>

        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'linear-gradient(135deg, rgba(91,111,255,0.06) 0%, rgba(0,200,224,0.04) 100%)', border: '1px solid rgba(91,111,255,0.15)', marginBottom: 10 }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--ai-accent)', fontFamily: 'Syne,sans-serif', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {report.interpretation.niveau}
          </p>
          <p style={{ fontSize: 12, color: 'var(--ai-text)', margin: '0 0 4px', fontWeight: 500 }}>{report.interpretation.signification}</p>
          <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: 0, lineHeight: 1.5 }}>{report.interpretation.detail}</p>
        </div>

        <div style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai-text)', margin: 0, fontFamily: 'Syne,sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fiabilité du test</p>
            <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'DM Mono,monospace', color: report.fiabilite.score >= 80 ? '#22c55e' : report.fiabilite.score >= 60 ? '#f97316' : '#ef4444' }}>
              {report.fiabilite.score}%
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'var(--ai-bg)', marginBottom: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${report.fiabilite.score}%`, background: report.fiabilite.score >= 80 ? '#22c55e' : report.fiabilite.score >= 60 ? '#f97316' : '#ef4444', borderRadius: 2 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {report.fiabilite.facteurs.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 11 }}>
                <span style={{ color: f.status === 'ok' ? '#22c55e' : f.status === 'warning' ? '#f97316' : '#ef4444', flexShrink: 0, marginTop: 1 }}>
                  {f.status === 'ok' ? '✓' : f.status === 'warning' ? '⚠' : '✗'}
                </span>
                <span style={{ color: 'var(--ai-mid)' }}><strong>{f.label}</strong> — {f.impact}</span>
              </div>
            ))}
          </div>
          {report.fiabilite.estimation_corrigee && (
            <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', fontSize: 11, color: '#f97316', lineHeight: 1.5 }}>
              {report.fiabilite.estimation_corrigee}
            </div>
          )}
        </div>

        {report.evolution.disponible && report.evolution.tests.length > 0 && (
          <div style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', marginBottom: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai-text)', margin: '0 0 8px', fontFamily: 'Syne,sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Évolution</p>
            {report.evolution.tests.length >= 2 && (
              <div style={{ marginBottom: 8, padding: '6px', borderRadius: 8, background: 'var(--ai-bg)' }}>
                <TestEvolutionMiniChart points={report.evolution.tests.map(t => ({ date: t.date, valeur: t.valeur }))} />
              </div>
            )}
            <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: '0 0 4px', lineHeight: 1.5 }}>{report.evolution.tendance}</p>
            {report.evolution.projection_3mois && (
              <p style={{ fontSize: 11, color: 'var(--ai-accent)', margin: 0, fontStyle: 'italic' }}>→ {report.evolution.projection_3mois}</p>
            )}
          </div>
        )}

        <div style={{
          padding: '12px 14px', borderRadius: 10, marginBottom: 10,
          border: `1px solid ${report.impact_zones.mise_a_jour_necessaire ? 'rgba(249,115,22,0.3)' : 'var(--ai-border)'}`,
          background: report.impact_zones.mise_a_jour_necessaire ? 'rgba(249,115,22,0.05)' : 'var(--ai-bg2)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai-text)', margin: 0, fontFamily: 'Syne,sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Impact sur les zones</p>
            {report.impact_zones.ecart_pct != null && (
              <span style={{ fontSize: 11, fontWeight: 700, color: report.impact_zones.mise_a_jour_necessaire ? '#f97316' : '#22c55e' }}>
                {report.impact_zones.mise_a_jour_necessaire ? `⚠ Écart ${report.impact_zones.ecart_pct}%` : '✓ À jour'}
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: '0 0 8px', lineHeight: 1.5 }}>{report.impact_zones.detail}</p>
          {report.impact_zones.zones_estimees && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr>
                  {['Zone', 'Label', 'Min', 'Max'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '3px 6px', color: 'var(--ai-dim)', fontWeight: 600, borderBottom: '1px solid var(--ai-border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.impact_zones.zones_estimees.map((z, i) => (
                  <tr key={i}>
                    <td style={{ padding: '3px 6px', fontWeight: 700, fontFamily: 'DM Mono,monospace', color: 'var(--ai-accent)' }}>{z.zone}</td>
                    <td style={{ padding: '3px 6px', color: 'var(--ai-mid)' }}>{z.label}</td>
                    <td style={{ padding: '3px 6px', fontFamily: 'DM Mono,monospace', color: 'var(--ai-text)' }}>{z.watts_min ?? z.hr_min ?? z.allure_min ?? '—'}</td>
                    <td style={{ padding: '3px 6px', fontFamily: 'DM Mono,monospace', color: 'var(--ai-text)' }}>{z.watts_max ?? z.hr_max ?? z.allure_max ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {report.recommandations.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {report.recommandations.map((r, i) => (
              <div key={i} style={{ padding: '10px 12px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai-text)', margin: '0 0 2px' }}>{r.label}</p>
                <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: 0, lineHeight: 1.4 }}>{r.detail}</p>
              </div>
            ))}
          </div>
        )}

        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--ai-bg2)', fontSize: 10, color: 'var(--ai-dim)', marginBottom: 10 }}>
          <p style={{ margin: '0 0 2px' }}>Sources : {report.sources_used.join(' · ')}</p>
          <p style={{ margin: 0 }}>Confiance : <strong style={{ color: confidenceColor }}>{report.confiance}</strong></p>
        </div>

        <button onClick={onCancel} style={{ width: '100%', padding: '9px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer' }}>
          Fermer
        </button>
      </div>
    )
  }

  return null
}

// ── AnalyserEntrainementFlow ───────────────────────────────────

type Streams = { heartrate?: number[]; velocity_smooth?: number[]; watts?: number[]; altitude?: number[]; cadence?: number[] }

interface ActivityRow {
  id: string
  sport_type: string
  started_at: string
  distance_m: number | null
  moving_time_s: number | null
  avg_hr: number | null
  max_hr: number | null
  avg_watts: number | null
  avg_pace_s_km: number | null
  tss: number | null
  intensity_factor: number | null
  aerobic_decoupling: number | null
  streams: Streams | null
}

function computeCardiacDrift(streams: Streams): number | null {
  const hr = streams.heartrate
  if (!hr || hr.length < 20) return null
  const half = Math.floor(hr.length / 2)
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
  return Math.round(((avg(hr.slice(half)) - avg(hr.slice(0, half))) / avg(hr.slice(0, half))) * 1000) / 10
}

function computeEfficiencyIndex(streams: Streams, sport: string): number | null {
  const hr = streams.heartrate
  const power = streams.watts
  const velocity = streams.velocity_smooth
  if (!hr || hr.length < 10) return null
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
  const avgHr = avg(hr)
  if (sport === 'cycling' && power && power.length > 0) return Math.round((avg(power) / avgHr) * 100) / 100
  if (sport === 'running' && velocity && velocity.length > 0) return Math.round((avg(velocity) / avgHr) * 1000) / 1000
  return null
}

function fmtDuration(s: number | null): string {
  if (!s) return 'N/A'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`
}

function fmtPace(sPerKm: number | null): string {
  if (!sPerKm) return 'N/A'
  const m = Math.floor(sPerKm / 60)
  const s = Math.round(sPerKm % 60)
  return `${m}'${String(s).padStart(2, '0')}''/km`
}

function fmtDist(m: number | null): string {
  if (!m) return 'N/A'
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`
}

const AE_SPORT_LABELS: Record<string, string> = {
  running: 'Running', cycling: 'Vélo', hyrox: 'Hyrox', gym: 'Gym',
  trail: 'Trail', triathlon: 'Triathlon', natation: 'Natation',
}

function AnalyserEntrainementFlow({ onPrepare, onCancel }: { onPrepare: (apiPrompt: string, label: string) => void; onCancel: () => void }) {
  const [step,           setStep]           = useState<'select' | 'context'>('select')
  const [activities,     setActivities]     = useState<ActivityRow[] | null>(null)
  const [loadingActs,    setLoadingActs]    = useState(false)
  const [selectedAct,    setSelectedAct]    = useState<ActivityRow | null>(null)
  const [compareAct,     setCompareAct]     = useState<ActivityRow | null>(null)
  const [compareMode,    setCompareMode]    = useState(false)
  const [ctxData,        setCtxData]        = useState<{
    zones: Record<string, unknown> | null
    hrvYesterday: number | null
    hrvBaseline: number | null
    planned: { title?: string | null } | null
    similarCount: number
    streamsAvailable: boolean
  } | null>(null)
  const [loadingCtx,     setLoadingCtx]     = useState(false)
  const [generating,     setGenerating]     = useState(false)

  useEffect(() => {
    void (async () => {
      setLoadingActs(true)
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { setActivities([]); return }

        const { data } = await sb
          .from('activities')
          .select('id,sport_type,started_at,distance_m,moving_time_s,avg_hr,max_hr,avg_watts,avg_pace_s_km,tss,intensity_factor,aerobic_decoupling,streams')
          .order('started_at', { ascending: false })
          .limit(30)

        setActivities((data as unknown as ActivityRow[]) ?? [])
      } catch {
        setActivities([])
      } finally {
        setLoadingActs(false)
      }
    })()
  }, [])

  async function loadContext(act: ActivityRow) {
    setLoadingCtx(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return

      const actDate = act.started_at.split('T')[0]
      const yesterday = new Date(actDate)
      yesterday.setDate(yesterday.getDate() - 1)
      const dayBefore = yesterday.toISOString().split('T')[0]
      const dayAfterDate = new Date(actDate)
      dayAfterDate.setDate(dayAfterDate.getDate() + 1)
      const dayAfter = dayAfterDate.toISOString().split('T')[0]
      const since28d = new Date(actDate)
      since28d.setDate(since28d.getDate() - 28)

      // TODO: inject injuries when table exists
      const [zonesRes, metricsYestRes, plannedRes, similarRes, hrvHistRes] = await Promise.all([
        sb.from('training_zones').select('*').eq('user_id', user.id).eq('sport', act.sport_type).eq('is_current', true).maybeSingle(),
        Promise.resolve(sb.from('metrics_daily').select('*').eq('user_id', user.id).eq('date', dayBefore).maybeSingle()).catch(() => ({ data: null })),
        sb.from('planned_sessions').select('title,duration_min,intensite,type_seance').eq('user_id', user.id).gte('date', dayBefore).lte('date', dayAfter).eq('sport', act.sport_type).maybeSingle(),
        sb.from('activities').select('id').eq('sport_type', act.sport_type).gte('moving_time_s', Math.round((act.moving_time_s ?? 0) * 0.7)).lte('moving_time_s', Math.round((act.moving_time_s ?? 0) * 1.3)).neq('id', act.id).limit(10),
        Promise.resolve(sb.from('metrics_daily').select('*').eq('user_id', user.id).gte('date', since28d.toISOString().split('T')[0]).lt('date', actDate)).catch(() => ({ data: [] })),
      ])

      const hrvValues = ((hrvHistRes.data ?? []) as { hrv: number | null }[]).filter(m => m.hrv != null).map(m => m.hrv as number)
      const hrvBaseline = hrvValues.length > 0 ? Math.round(hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length) : null

      setCtxData({
        zones: (zonesRes.data as Record<string, unknown> | null) ?? null,
        hrvYesterday: (metricsYestRes.data?.hrv as number | null) ?? null,
        hrvBaseline,
        planned: (plannedRes.data as { title?: string | null } | null) ?? null,
        similarCount: similarRes.data?.length ?? 0,
        streamsAvailable: act.streams != null && Object.keys(act.streams).length > 0,
      })
    } catch {
      setCtxData(null)
    } finally {
      setLoadingCtx(false)
    }
  }

  function handleSelectActivity(act: ActivityRow) {
    if (compareMode && selectedAct) {
      if (act.id === selectedAct.id) return
      if (act.sport_type !== selectedAct.sport_type) {
        // warn but allow
      }
      setCompareAct(act)
      return
    }
    setSelectedAct(act)
    setCompareAct(null)
    void loadContext(act)
    setStep('context')
  }

  async function handleGenerate() {
    if (!selectedAct) return
    setGenerating(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return

      const actDate = selectedAct.started_at.split('T')[0]
      const threeDaysBefore = new Date(actDate)
      threeDaysBefore.setDate(threeDaysBefore.getDate() - 3)
      const dayBefore = new Date(actDate)
      dayBefore.setDate(dayBefore.getDate() - 1)
      const dayAfter = new Date(actDate)
      dayAfter.setDate(dayAfter.getDate() + 1)

      // TODO: inject injuries when table exists
      const [zonesRes, recoveryRes, plannedRes, similarRes] = await Promise.all([
        sb.from('training_zones').select('*').eq('user_id', user.id).eq('sport', selectedAct.sport_type).eq('is_current', true).maybeSingle(),
        Promise.resolve(sb.from('metrics_daily').select('*').eq('user_id', user.id).gte('date', threeDaysBefore.toISOString().split('T')[0]).lte('date', actDate)).catch(() => ({ data: [] })),
        sb.from('planned_sessions').select('*').eq('user_id', user.id).gte('date', dayBefore.toISOString().split('T')[0]).lte('date', dayAfter.toISOString().split('T')[0]).eq('sport', selectedAct.sport_type).maybeSingle(),
        sb.from('activities').select('started_at,avg_hr,avg_watts,avg_pace_s_km,tss,intensity_factor,aerobic_decoupling').eq('sport_type', selectedAct.sport_type).gte('moving_time_s', Math.round((selectedAct.moving_time_s ?? 0) * 0.7)).lte('moving_time_s', Math.round((selectedAct.moving_time_s ?? 0) * 1.3)).neq('id', selectedAct.id).order('started_at', { ascending: false }).limit(10),
      ])

      // HRV baseline 28d
      const since28d = new Date(actDate)
      since28d.setDate(since28d.getDate() - 28)
      let hrvDataRes: { data: { hrv?: number | null }[] | null } = { data: [] }
      try { hrvDataRes = await sb.from('metrics_daily').select('*').eq('user_id', user.id).gte('date', since28d.toISOString().split('T')[0]).lt('date', actDate) } catch { /* table unavailable */ }
      const hrvValues = ((hrvDataRes.data ?? []) as { hrv: number | null }[]).filter(m => m.hrv != null).map(m => m.hrv as number)
      const hrvBaseline = hrvValues.length > 0 ? Math.round(hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length) : null

      const recoveryData = recoveryRes.data ?? []
      const hrvYesterday = recoveryData.length > 0 ? ((recoveryData[recoveryData.length - 1] as { hrv?: number | null }).hrv ?? null) : null

      // Stream analysis
      const streams = selectedAct.streams
      const cardiacDrift = streams ? computeCardiacDrift(streams) : null
      const ei = streams ? computeEfficiencyIndex(streams, selectedAct.sport_type) : null

      // Similar activities average EI
      const similar = similarRes.data ?? []

      // Compare activity
      let compareBlock = ''
      if (compareAct) {
        const cStreams = compareAct.streams
        const cDrift = cStreams ? computeCardiacDrift(cStreams) : null
        const cEi = cStreams ? computeEfficiencyIndex(cStreams, compareAct.sport_type) : null
        const sportWarning = compareAct.sport_type !== selectedAct.sport_type ? `\nATTENTION : sports différents (${selectedAct.sport_type} vs ${compareAct.sport_type})` : ''
        compareBlock = `

COMPARAISON CÔTE-À-CÔTE (mode activé) :${sportWarning}
Activité A : ${actDate} · ${fmtDuration(selectedAct.moving_time_s)} · TSS ${selectedAct.tss ?? 'N/A'} · IF ${selectedAct.intensity_factor ?? 'N/A'} · FC moy ${selectedAct.avg_hr ?? 'N/A'}bpm · Watts ${selectedAct.avg_watts ?? 'N/A'}W · Drift ${cardiacDrift ?? 'N/A'}% · EI ${ei ?? 'N/A'}
Activité B : ${compareAct.started_at.split('T')[0]} · ${fmtDuration(compareAct.moving_time_s)} · TSS ${compareAct.tss ?? 'N/A'} · IF ${compareAct.intensity_factor ?? 'N/A'} · FC moy ${compareAct.avg_hr ?? 'N/A'}bpm · Watts ${compareAct.avg_watts ?? 'N/A'}W · Drift ${cDrift ?? 'N/A'}% · EI ${cEi ?? 'N/A'}

Présente un tableau markdown de comparaison complet puis donne un verdict sur quelle séance était la plus efficace et pourquoi.`
      }

      const streamsBlock = streams
        ? `\nANALYSE DES DONNÉES BRUTES (streams) :
Drift cardiaque calculé : ${cardiacDrift ?? 'N/A'}% (norme : <5% en Z2, <3% en Z3+, >8% = dérive significative)
Efficiency Index : ${ei ?? 'N/A'} (${similar.length} séances similaires disponibles pour comparaison)`
        : `\nNote : pas de données streams disponibles pour cette activité. Analyse basée sur métriques agrégées uniquement.`

      const recoveryBlock = recoveryData.length > 0
        ? recoveryData.map((d: Record<string, unknown>) => `${d.date} — HRV: ${d.hrv ?? 'N/A'}ms · Repos HR: ${d.resting_hr ?? 'N/A'}bpm · Readiness: ${d.readiness ?? 'N/A'} · Fatigue: ${d.fatigue ?? 'N/A'} · Énergie: ${d.energy ?? 'N/A'}`).join('\n')
        : 'Pas de données de récupération disponibles'

      const apiPrompt = `Tu es un expert en analyse de séances d'entraînement et physiologie sportive.

SÉANCE ANALYSÉE :
${selectedAct.sport_type} · ${actDate} · ${fmtDuration(selectedAct.moving_time_s)} · ${fmtDist(selectedAct.distance_m)} · TSS: ${selectedAct.tss ?? 'N/A'}
FC moy/max : ${selectedAct.avg_hr ?? 'N/A'}/${selectedAct.max_hr ?? 'N/A'}bpm · Watts : ${selectedAct.avg_watts ?? 'N/A'}W · Allure : ${fmtPace(selectedAct.avg_pace_s_km)} · IF: ${selectedAct.intensity_factor ?? 'N/A'}
Aerobic decoupling déclaré : ${selectedAct.aerobic_decoupling ?? 'N/A'}%
${streamsBlock}

CONTEXTE RÉCUPÉRATION (3 jours avant la séance) :
${recoveryBlock}
Baseline HRV personnelle : ${hrvBaseline ?? 'non disponible'}ms | HRV veille : ${hrvYesterday ?? 'non disponible'}ms

SÉANCE PLANIFIÉE CORRESPONDANTE : ${plannedRes.data ? JSON.stringify(plannedRes.data) : 'aucune trouvée'}

${similar.length} SÉANCES SIMILAIRES (même sport, durée ±30%) : ${similar.length > 0 ? JSON.stringify(similar) : 'aucune dans l\'historique'}

ZONES CONFIGURÉES : ${zonesRes.data ? JSON.stringify(zonesRes.data) : 'non configurées'}
${compareBlock}

ANALYSE EN 4 COUCHES OBLIGATOIRES :

COUCHE 1 — EXÉCUTION
Distribution d'intensité réelle (depuis streams si dispo, sinon depuis métriques agrégées + zones).
Qualité d'exécution : respect de l'intensité, gestion de l'effort.
${streams ? 'Drift cardiaque et ce qu\'il révèle.' : ''}

COUCHE 2 — CONTEXTE RÉCUPÉRATION
HRV veille vs baseline + fatigue cumulée + verdict (séance pertinente/risquée/sous-optimale).

COUCHE 3 — PLAN VS RÉALISÉ
${plannedRes.data ? 'Comparer durée, intensité, type prévus vs réalisés.' : 'Analyser sans référence plan (aucune séance planifiée trouvée pour cette date).'}

COUCHE 4 — COMPARAISON HISTORIQUE
FC/watts/pace actuels vs moyenne des séances similaires. Tendance : progression/stagnation/régression.

Conclus avec 1 recommandation pour la prochaine séance de ce sport.

TERMINE PAR :
## Sources et niveau de confiance
Sources utilisées : [liste précise des données utilisées]
Niveau de confiance : [élevé/modéré/faible] — [justification courte]

## Actions suggérées
(parmi : "Analyser ma semaine", "Analyser ma récupération", "Estimer mes zones", "Analyser ma progression")`

      onPrepare(apiPrompt, `Analyser un entraînement — ${AE_SPORT_LABELS[selectedAct.sport_type] ?? selectedAct.sport_type}`)
    } catch {
      setGenerating(false)
    }
  }

  // ── Step 1 : activity selection ──
  if (step === 'select') {
    if (loadingActs) {
      return (
        <div style={{ padding: '8px 0 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ai-dim)', fontSize: 11 }}>
            <Dots />
            <span>Chargement des activités…</span>
          </div>
        </div>
      )
    }

    if (!activities?.length) {
      return (
        <div style={{ padding: '8px 0 4px' }}>
          <div style={{ padding: '16px', borderRadius: 10, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', marginBottom: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 8px', fontFamily: 'Syne,sans-serif' }}>
              Pas encore d'activités synchronisées
            </p>
            <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: 0, lineHeight: 1.5 }}>
              Connecte Strava dans <strong style={{ color: 'var(--ai-text)' }}>Connexions → Strava → Synchroniser</strong>.
            </p>
          </div>
          <button onClick={onCancel} style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
            Fermer
          </button>
        </div>
      )
    }

    return (
      <div style={{ padding: '8px 0 4px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 4px', fontFamily: 'Syne,sans-serif' }}>
          Quelle séance analyser ?
        </p>
        <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 10px' }}>
          30 dernières activités
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: 'var(--ai-mid)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <div
              onClick={() => { setCompareMode(p => !p); setCompareAct(null) }}
              style={{
                width: 28, height: 16, borderRadius: 8,
                background: compareMode ? 'linear-gradient(135deg,#00c8e0,#5b6fff)' : 'var(--ai-border)',
                position: 'relative', cursor: 'pointer', transition: 'background 0.15s',
              }}
            >
              <div style={{
                width: 12, height: 12, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 2,
                left: compareMode ? 14 : 2,
                transition: 'left 0.15s',
              }} />
            </div>
            Comparer 2 activités
          </label>
          {compareMode && selectedAct && (
            <span style={{ fontSize: 10, color: 'var(--ai-dim)', fontStyle: 'italic' }}>
              {compareAct ? 'Comparaison prête' : 'Sélectionne une 2e activité'}
            </span>
          )}
        </div>

        {compareMode && selectedAct && compareAct && compareAct.sport_type !== selectedAct.sport_type && (
          <div style={{ padding: '6px 10px', borderRadius: 7, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', fontSize: 11, color: '#f97316', marginBottom: 8 }}>
            Sports différents ({selectedAct.sport_type} vs {compareAct.sport_type}) — comparaison possible mais interprétation limitée
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12, maxHeight: 320, overflowY: 'auto' }}>
          {activities.map(a => {
            const isMain = selectedAct?.id === a.id
            const isCmp = compareAct?.id === a.id
            const hasStreams = a.streams != null && Object.keys(a.streams).length > 0
            const dateStr = a.started_at.split('T')[0]
            return (
              <div key={a.id}
                onClick={() => handleSelectActivity(a)}
                style={{
                  padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${isMain ? '#5b6fff' : isCmp ? '#00c8e0' : 'var(--ai-border)'}`,
                  background: isMain ? 'rgba(91,111,255,0.08)' : isCmp ? 'rgba(0,200,224,0.08)' : 'var(--ai-bg2)',
                  transition: 'all 0.1s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ai-text)', fontFamily: 'DM Sans,sans-serif' }}>
                    {AE_SPORT_LABELS[a.sport_type] ?? a.sport_type}
                    {isMain && <span style={{ marginLeft: 6, fontSize: 10, color: '#5b6fff', fontWeight: 700 }}>PRINCIPAL</span>}
                    {isCmp && <span style={{ marginLeft: 6, fontSize: 10, color: '#00c8e0', fontWeight: 700 }}>COMPARE</span>}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--ai-dim)', fontFamily: 'DM Mono,monospace' }}>{dateStr}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ai-mid)', marginTop: 2, lineHeight: 1.4 }}>
                  {fmtDuration(a.moving_time_s)} · {fmtDist(a.distance_m)} · TSS {a.tss ?? '—'} · FC {a.avg_hr ?? '—'}bpm
                  <span style={{
                    marginLeft: 8, padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600,
                    background: hasStreams ? 'rgba(34,197,94,0.12)' : 'rgba(249,115,22,0.12)',
                    color: hasStreams ? '#22c55e' : '#f97316',
                  }}>
                    {hasStreams ? 'Streams disponibles' : 'Données limitées'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
            Annuler
          </button>
          {selectedAct && compareMode && compareAct && (
            <button
              onClick={() => void handleGenerate()}
              disabled={generating}
              style={{
                flex: 1, padding: '9px', borderRadius: 9, border: 'none',
                background: generating ? 'var(--ai-bg2)' : 'var(--ai-gradient)',
                color: generating ? 'var(--ai-dim)' : '#fff',
                fontSize: 12, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer',
                fontFamily: 'DM Sans,sans-serif',
              }}>
              {generating ? 'Préparation…' : 'Comparer les 2 séances'}
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Step 2 : context display ──
  if (step === 'context') {
    const act = selectedAct!
    const hasStreams = act.streams != null && Object.keys(act.streams).length > 0

    return (
      <div style={{ padding: '8px 0 4px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 4px', fontFamily: 'Syne,sans-serif' }}>
          Contexte chargé
        </p>
        <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 12px' }}>
          {AE_SPORT_LABELS[act.sport_type] ?? act.sport_type} · {act.started_at.split('T')[0]} · {fmtDuration(act.moving_time_s)}
        </p>

        {loadingCtx ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ai-dim)', fontSize: 11, marginBottom: 14 }}>
            <Dots />
            <span>Chargement du contexte…</span>
          </div>
        ) : ctxData ? (
          <div style={{ padding: '10px 12px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', marginBottom: 14, fontSize: 11, lineHeight: 1.7, color: 'var(--ai-mid)' }}>
            <div>
              <span style={{ fontWeight: 600, color: 'var(--ai-text)' }}>Zones {act.sport_type}</span>
              {ctxData.zones
                ? <span style={{ color: '#22c55e', marginLeft: 6 }}>configurées</span>
                : <span style={{ color: '#f97316', marginLeft: 6 }}>non configurées</span>}
            </div>
            <div>
              Récupération veille : HRV {ctxData.hrvYesterday ?? 'N/A'}ms
              {ctxData.hrvBaseline != null && (
                <span> (baseline {ctxData.hrvBaseline}ms
                  {ctxData.hrvYesterday != null && (
                    <span style={{ color: (ctxData.hrvYesterday ?? 0) >= ctxData.hrvBaseline ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                      {' '}{(ctxData.hrvYesterday ?? 0) >= ctxData.hrvBaseline ? '+' : ''}{Math.round((((ctxData.hrvYesterday ?? 0) - ctxData.hrvBaseline) / ctxData.hrvBaseline) * 100)}%)
                    </span>
                  )}
                </span>
              )}
              {!ctxData.hrvBaseline && <span style={{ color: 'var(--ai-dim)', fontStyle: 'italic' }}> — non disponible</span>}
            </div>
            <div>
              Séance planifiée : {ctxData.planned
                ? <span style={{ color: '#22c55e' }}>{(ctxData.planned as { title?: string | null }).title ?? 'trouvée'}</span>
                : <span style={{ color: 'var(--ai-dim)', fontStyle: 'italic' }}>non trouvée</span>}
            </div>
            <div>{ctxData.similarCount} séance{ctxData.similarCount !== 1 ? 's' : ''} similaire{ctxData.similarCount !== 1 ? 's' : ''} disponible{ctxData.similarCount !== 1 ? 's' : ''} pour comparaison</div>
            <div style={{ marginTop: 4 }}>
              <span style={{
                padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 600,
                background: hasStreams ? 'rgba(34,197,94,0.12)' : 'rgba(249,115,22,0.12)',
                color: hasStreams ? '#22c55e' : '#f97316',
              }}>
                {hasStreams ? 'Analyse approfondie disponible (drift, zones depuis streams)' : 'Analyse partielle — pas de données streams'}
              </span>
            </div>
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setStep('select')}
            style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
            Retour
          </button>
          <button
            onClick={() => void handleGenerate()}
            disabled={generating || loadingCtx}
            style={{
              flex: 1, padding: '9px', borderRadius: 9, border: 'none',
              background: generating || loadingCtx ? 'var(--ai-bg2)' : 'var(--ai-gradient)',
              color: generating || loadingCtx ? 'var(--ai-dim)' : '#fff',
              fontSize: 12, fontWeight: 700,
              cursor: generating || loadingCtx ? 'not-allowed' : 'pointer',
              fontFamily: 'DM Sans,sans-serif',
            }}>
            {generating ? 'Préparation…' : loadingCtx ? 'Chargement…' : 'Générer l\'analyse'}
          </button>
        </div>
      </div>
    )
  }

  return null
}

// ── Stream chart components ────────────────────────────────────────

function StreamProfileChart({ streams, zones, sport }: {
  streams: {
    time?: number[]
    heartrate?: number[]
    watts?: number[]
    velocity_smooth?: number[]
    altitude?: number[]
    distance?: number[]
    cadence?: number[]
  }
  zones: { z1_max?: number; z2_max?: number; z3_max?: number; z4_max?: number } | null
  sport: string
}) {
  // ── ALL HOOKS BEFORE ANY EARLY RETURN ───────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const [cursorPct, setCursorPct] = useState<number | null>(null)
  const [selection, setSelection] = useState<[number, number] | null>(null)
  const [dragStartPct, setDragStartPct] = useState<number | null>(null)
  const [showSelModal, setShowSelModal] = useState(false)

  // ── Pure helpers ─────────────────────────────────────────────
  function smooth(arr: number[], w = 5): number[] {
    return arr.map((_, i) => {
      const s = Math.max(0, i - w), e = Math.min(arr.length, i + w + 1)
      return arr.slice(s, e).reduce((a, b) => a + b, 0) / (e - s)
    })
  }
  function downsample(arr: number[], maxPts = 1500): number[] {
    if (arr.length <= maxPts) return arr
    const step = arr.length / maxPts
    return Array.from({ length: maxPts }, (_, i) => arr[Math.floor(i * step)])
  }
  function prepareForPath(data: number[]): number[] {
    const sm = smooth(data, 5)
    return sm.length > 2000 ? downsample(sm, 1500) : sm
  }
  function fmtPaceFromSKm(sPerKm: number): string {
    if (sPerKm <= 0 || sPerKm > 1200) return '—'
    const min = Math.floor(sPerKm / 60), sec = Math.round(sPerKm % 60)
    return `${min}'${sec.toString().padStart(2, '0')}"/km`
  }

  // ── Raw streams ──────────────────────────────────────────────
  const hr       = streams.heartrate       ?? []
  const watts    = streams.watts           ?? []
  const velocity = streams.velocity_smooth ?? []
  const altitude = streams.altitude        ?? []
  const cadence  = streams.cadence         ?? []
  const time     = streams.time            ?? []
  const distance = streams.distance        ?? []
  const N = Math.max(hr.length, watts.length, velocity.length, altitude.length)

  const sportLower = sport.toLowerCase()
  const isBike = ['bike', 'virtual_bike', 'cycling', 'velo'].some(s => sportLower.includes(s))
  const isRun  = ['run', 'trail', 'running'].some(s => sportLower.includes(s))

  // Smoothed (full-length) — used for cursor bar values, selStats, annotations
  const hrS       = hr.length       >= 10 ? smooth(hr)       : null
  const wattsS    = watts.length    >= 10 ? smooth(watts)    : null
  const velocityS = velocity.length >= 10 ? smooth(velocity) : null
  const altS      = altitude.length >= 10 ? altitude         : null   // no smooth for fill
  const cadenceS  = cadence.length  >= 10 ? smooth(cadence)  : null
  const paceS     = velocityS ? velocityS.map(v => v > 0 ? 1000 / v : 0) : null

  type TrackDef = {
    label: string; data: number[]; color: string; H: number
    isHr?: boolean; invertY?: boolean; formatY?: (v: number) => string
  }
  const tracks: TrackDef[] = ([
    altS     ? { label: 'Altitude', data: altS,    color: 'rgba(140,140,140,0.7)', H: 56,                  formatY: (v: number) => `${Math.round(v)}m`    } : null,
    hrS      ? { label: 'FC',       data: hrS,     color: '#ef4444',               H: 72, isHr: true,      formatY: (v: number) => `${Math.round(v)}bpm`  } : null,
    isBike && wattsS  ? { label: 'Puissance', data: wattsS,   color: '#5b6fff', H: 72,                     formatY: (v: number) => `${Math.round(v)}W`    } : null,
    isRun  && paceS   ? { label: 'Allure',    data: paceS,    color: '#f97316', H: 72, invertY: true,      formatY: (v: number) => fmtPaceFromSKm(v)      } : null,
    cadenceS ? { label: 'Cadence',  data: cadenceS, color: '#8b5cf6',              H: 48,                  formatY: (v: number) => `${Math.round(v)}rpm`  } : null,
  ] as (TrackDef | null)[]).filter((t): t is TrackDef => t !== null)

  // Annotations via useMemo — deps are actual prop arrays, stable references
  const annotations = useMemo(() => {
    const anns: { trackLabel: string; idx: number; label: string; color: string }[] = []
    if (hrS && hrS.length >= 10) {
      const maxV = Math.max(...hrS)
      anns.push({ trackLabel: 'FC', idx: hrS.indexOf(maxV), label: `Max ${Math.round(maxV)}`, color: '#ef4444' })
    }
    if (wattsS && wattsS.length >= 10) {
      const maxV = Math.max(...wattsS)
      anns.push({ trackLabel: 'Puissance', idx: wattsS.indexOf(maxV), label: `Max ${Math.round(maxV)}W`, color: '#5b6fff' })
    }
    return anns
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streams.heartrate, streams.watts])

  // ── EARLY RETURNS (after all hooks) ─────────────────────────
  if (N < 10) return null
  if (tracks.length === 0) return null

  // ── Cursor ───────────────────────────────────────────────────
  const cursor = cursorPct !== null ? Math.min(N - 1, Math.max(0, Math.round(cursorPct * (N - 1)))) : null

  // ── Path builders — use prepareForPath internally ────────────
  function buildFillPath(data: number[], H: number, pad = 4, inv = false): string {
    const d = prepareForPath(data)
    if (!d.length) return ''
    const mn = Math.min(...d), mx = Math.max(...d), rng = mx - mn || 1
    const pts = d.map((v, i) => {
      const x = (i / (d.length - 1)) * 1000
      const norm = inv ? (mx - v) / rng : (v - mn) / rng
      return `${x.toFixed(1)},${(H - pad - norm * (H - pad * 2)).toFixed(1)}`
    })
    return `M0,${H}L${pts.join('L')}L1000,${H}Z`
  }
  function buildLinePath(data: number[], H: number, pad = 4, inv = false): string {
    const d = prepareForPath(data)
    if (!d.length) return ''
    const mn = Math.min(...d), mx = Math.max(...d), rng = mx - mn || 1
    const pts = d.map((v, i) => {
      const x = (i / (d.length - 1)) * 1000
      const norm = inv ? (mx - v) / rng : (v - mn) / rng
      return `${x.toFixed(1)},${(H - pad - norm * (H - pad * 2)).toFixed(1)}`
    })
    return `M${pts.join('L')}`
  }

  // ── Event handlers ────────────────────────────────────────────
  function getPct(clientX: number, el: Element): number {
    const r = el.getBoundingClientRect()
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width))
  }
  function handleMove(clientX: number) {
    if (!containerRef.current) return
    const pct = getPct(clientX, containerRef.current)
    setCursorPct(pct)
    if (dragStartPct !== null) {
      const i1 = Math.round(dragStartPct * (N - 1))
      const i2 = Math.round(pct * (N - 1))
      setSelection([Math.min(i1, i2), Math.max(i1, i2)])
    }
  }
  function handleDown(clientX: number) {
    if (!containerRef.current) return
    setDragStartPct(getPct(clientX, containerRef.current))
    setSelection(null)
    setShowSelModal(false)
  }
  function handleUp() {
    setDragStartPct(null)
    if (selection && selection[1] - selection[0] > 5) setShowSelModal(true)
  }

  // ── Selection stats ───────────────────────────────────────────
  const selStats = selection ? (() => {
    const [i1, i2] = selection
    const arrAvg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
    const dur = time.length > i2 ? time[i2] - time[i1] : null
    const sliceDist = distance.length > i2 ? distance[i2] - distance[i1] : null
    const hrSlice = hrS?.slice(i1, i2 + 1) ?? null
    const wSlice = wattsS?.slice(i1, i2 + 1) ?? null
    const vSlice = velocityS?.slice(i1, i2 + 1).filter(v => v > 0) ?? null
    const altSlice = altS?.slice(i1, i2 + 1) ?? null
    const cadSlice = cadenceS?.slice(i1, i2 + 1) ?? null
    const dPlus = altSlice ? altSlice.reduce((acc, v, idx) => idx > 0 && v > altSlice[idx - 1] ? acc + (v - altSlice[idx - 1]) : acc, 0) : null
    return {
      dur,
      dist: sliceDist,
      hrMoy: hrSlice?.length ? Math.round(arrAvg(hrSlice)) : null,
      hrMax: hrSlice?.length ? Math.round(Math.max(...hrSlice)) : null,
      watts: wSlice?.length ? Math.round(arrAvg(wSlice)) : null,
      pace: vSlice?.length ? arrAvg(vSlice.map(v => 1000 / v)) : null,
      dPlus: dPlus ? Math.round(dPlus) : null,
      cad: cadSlice?.length ? Math.round(arrAvg(cadSlice)) : null,
    }
  })() : null

  // ── Render ───────────────────────────────────────────────────
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--ai-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 5px' }}>
        Profil de la séance
      </p>

      {/* Barre de valeurs au curseur */}
      {cursor !== null && (
        <div style={{
          display: 'flex', gap: 10, marginBottom: 6, flexWrap: 'wrap', minHeight: 18,
          background: 'var(--ai-bg2)', borderRadius: 6, padding: '4px 10px', alignItems: 'center',
          fontSize: 10, fontFamily: 'DM Mono, monospace',
        }}>
          {hrS      && <span style={{ color: '#ef4444', fontWeight: 600 }}>FC {Math.round(hrS[Math.min(cursor, hrS.length - 1)])}bpm</span>}
          {isBike && wattsS && <span style={{ color: '#5b6fff', fontWeight: 600 }}>{Math.round(wattsS[Math.min(cursor, wattsS.length - 1)])}W</span>}
          {isRun && velocityS && velocityS[Math.min(cursor, velocityS.length - 1)] > 0 && (
            <span style={{ color: '#f97316', fontWeight: 600 }}>{fmtPaceFromSKm(1000 / velocityS[Math.min(cursor, velocityS.length - 1)])}</span>
          )}
          {cadenceS && <span style={{ color: '#8b5cf6', fontWeight: 600 }}>{Math.round(cadenceS[Math.min(cursor, cadenceS.length - 1)])}rpm</span>}
          {altS     && <span style={{ color: 'var(--ai-dim)', fontWeight: 500 }}>{Math.round(altS[Math.min(cursor, altS.length - 1)])}m</span>}
          {time.length > cursor && (
            <span style={{ color: 'var(--ai-dim)', marginLeft: 'auto', fontSize: 9 }}>
              {(() => { const t = time[cursor] - (time[0] ?? 0); return `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}` })()}
            </span>
          )}
        </div>
      )}

      {/* Container des tracks */}
      <div
        ref={containerRef}
        style={{ position: 'relative', userSelect: 'none', cursor: 'crosshair' }}
        onMouseMove={e => handleMove(e.clientX)}
        onMouseLeave={() => setCursorPct(null)}
        onMouseDown={e => handleDown(e.clientX)}
        onMouseUp={handleUp}
        onTouchStart={e => { e.preventDefault(); handleDown(e.touches[0].clientX) }}
        onTouchMove={e => { e.preventDefault(); handleMove(e.touches[0].clientX) }}
        onTouchEnd={handleUp}
      >
        {/* Curseur vertical — div absolute traversant tous les tracks */}
        {cursorPct !== null && (
          <div style={{
            position: 'absolute', top: 0, bottom: 0, left: `${cursorPct * 100}%`,
            width: 1, background: 'var(--ai-text, #888)',
            pointerEvents: 'none', zIndex: 10, opacity: 0.5,
          }} />
        )}

        {/* Overlay de sélection */}
        {selection && (() => {
          const x1 = (selection[0] / (N - 1)) * 100
          const x2 = (selection[1] / (N - 1)) * 100
          return (
            <div style={{
              position: 'absolute', top: 0, bottom: 0,
              left: `${x1}%`, width: `${x2 - x1}%`,
              background: 'rgba(0,200,224,0.15)',
              pointerEvents: 'none', zIndex: 9,
            }} />
          )
        })()}

        {/* Tracks — chaque track est un SVG indépendant */}
        {tracks.map((track) => {
          const inv = track.invertY ?? false
          const d = prepareForPath(track.data)
          const mn = Math.min(...d), mx = Math.max(...d), rng = mx - mn || 1
          const fillPath = buildFillPath(track.data, track.H, 4, inv)
          const linePath = buildLinePath(track.data, track.H, 4, inv)
          const rangeLabel = track.formatY
            ? inv ? `${track.formatY(mx)} – ${track.formatY(mn)}` : `${track.formatY(mn)} – ${track.formatY(mx)}`
            : ''

          return (
            <div key={track.label} style={{ marginBottom: 2 }}>
              <div style={{ fontSize: 9, color: 'var(--ai-dim)', marginBottom: 1, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: track.color, fontWeight: 600 }}>{track.label}</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8 }}>{rangeLabel}</span>
              </div>
              <svg
                viewBox={`0 0 1000 ${track.H}`}
                style={{ width: '100%', height: track.H, display: 'block', overflow: 'visible' }}
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id={`ai-fill-${track.label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={track.color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={track.color} stopOpacity="0.03" />
                  </linearGradient>
                </defs>

                {/* Bandes de zones FC */}
                {track.isHr && zones && (() => {
                  const zColors = ['rgba(34,197,94,0.08)', 'rgba(34,197,94,0.12)', 'rgba(249,115,22,0.10)', 'rgba(239,68,68,0.10)', 'rgba(239,68,68,0.15)']
                  const zMaxes = [zones.z1_max, zones.z2_max, zones.z3_max, zones.z4_max].filter((v): v is number => v != null)
                  let prev = mn
                  return zMaxes.map((zm, zi) => {
                    const yTop = track.H - 4 - ((zm - mn) / rng) * (track.H - 8)
                    const yBot = track.H - 4 - ((prev - mn) / rng) * (track.H - 8)
                    prev = zm
                    return <rect key={`z${zi}`} x={0} y={Math.max(0, yTop)} width={1000} height={Math.max(0, yBot - yTop)} fill={zColors[zi]} />
                  })
                })()}

                <path d={fillPath} fill={`url(#ai-fill-${track.label})`} />
                <path d={linePath} fill="none" stroke={track.color} strokeWidth="2" strokeLinejoin="round" />

                {/* Ligne horizontale au curseur */}
                {cursor !== null && (() => {
                  const idx = Math.min(cursor, track.data.length - 1)
                  const v = Math.min(mx, Math.max(mn, track.data[idx]))
                  const norm = inv ? (mx - v) / rng : (v - mn) / rng
                  const y = track.H - 4 - norm * (track.H - 8)
                  return <line x1={0} y1={y} x2={1000} y2={y} stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" strokeDasharray="4,3" opacity="0.6" />
                })()}

                {/* Annotations */}
                {annotations.filter(a => a.trackLabel === track.label).map((a, ai) => {
                  const x = (a.idx / Math.max(1, track.data.length - 1)) * 1000
                  return (
                    <g key={`ann-${ai}`}>
                      <circle cx={x} cy={6} r={2.5} fill={a.color} />
                      <text x={x + 8} y={9} fontSize="9" fontWeight="700" fill={a.color} fontFamily="DM Mono, monospace">{a.label}</text>
                    </g>
                  )
                })}
              </svg>
            </div>
          )
        })}
      </div>

      {/* Modal de sélection */}
      {showSelModal && selStats && selection && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => { setShowSelModal(false); setSelection(null) }}
        >
          <div
            style={{
              background: 'var(--ai-bg, #1a1a2e)', borderRadius: 12,
              padding: '20px 24px', minWidth: 260, maxWidth: 340,
              border: '1px solid var(--ai-border)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ai-text)', fontFamily: 'Syne, sans-serif' }}>
                Sélection{selStats.dur ? ` — ${Math.floor(selStats.dur / 60)}min${String(Math.round(selStats.dur % 60)).padStart(2, '0')}` : ''}
              </div>
              <button
                onClick={() => { setShowSelModal(false); setSelection(null) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ai-dim)', fontSize: 16, padding: 4 }}
              >✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              {selStats.dist != null && selStats.dist > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ai-dim)' }}>Distance</span>
                  <span style={{ fontWeight: 600, color: 'var(--ai-text)', fontFamily: 'DM Mono, monospace' }}>
                    {selStats.dist >= 1000 ? `${(selStats.dist / 1000).toFixed(2)} km` : `${Math.round(selStats.dist)} m`}
                  </span>
                </div>
              )}
              {selStats.hrMoy != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ai-dim)' }}>FC moyenne</span>
                  <span style={{ fontWeight: 600, color: 'var(--ai-text)', fontFamily: 'DM Mono, monospace' }}>{selStats.hrMoy} bpm</span>
                </div>
              )}
              {selStats.hrMax != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ai-dim)' }}>FC max.</span>
                  <span style={{ fontWeight: 600, color: 'var(--ai-text)', fontFamily: 'DM Mono, monospace' }}>{selStats.hrMax} bpm</span>
                </div>
              )}
              {selStats.watts != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ai-dim)' }}>Watts moy.</span>
                  <span style={{ fontWeight: 600, color: 'var(--ai-text)', fontFamily: 'DM Mono, monospace' }}>{selStats.watts} W</span>
                </div>
              )}
              {selStats.pace != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ai-dim)' }}>Allure moy.</span>
                  <span style={{ fontWeight: 600, color: 'var(--ai-text)', fontFamily: 'DM Mono, monospace' }}>{fmtPaceFromSKm(selStats.pace)}</span>
                </div>
              )}
              {selStats.dPlus != null && selStats.dPlus > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ai-dim)' }}>D+</span>
                  <span style={{ fontWeight: 600, color: 'var(--ai-text)', fontFamily: 'DM Mono, monospace' }}>+{selStats.dPlus} m</span>
                </div>
              )}
              {selStats.cad != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ai-dim)' }}>Cadence moy.</span>
                  <span style={{ fontWeight: 600, color: 'var(--ai-text)', fontFamily: 'DM Mono, monospace' }}>{selStats.cad} rpm</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CardiacDriftChart({ heartrate, driftPct }: { heartrate: number[]; driftPct: number }) {
  if (heartrate.length < 20) return null
  const W = 380, H = 52, PAD_L = 28, PAD_R = 6

  function smooth15(arr: number[]): number[] {
    return arr.map((_, i) => {
      const s = Math.max(0, i - 15), e = Math.min(arr.length, i + 16)
      return arr.slice(s, e).reduce((a, b) => a + b, 0) / (e - s)
    })
  }

  const ds = smooth15(heartrate)
  const half = Math.floor(ds.length / 2)
  const avg1 = ds.slice(0, half).reduce((a, b) => a + b, 0) / half
  const avg2 = ds.slice(half).reduce((a, b) => a + b, 0) / (ds.length - half)
  const yMin = Math.min(...ds) * 0.97, yMax = Math.max(...ds) * 1.03

  const scaleX = (i: number) => PAD_L + (i / (ds.length - 1)) * (W - PAD_L - PAD_R)
  const scaleY = (v: number) => H - 8 - ((v - yMin) / ((yMax - yMin) || 1)) * (H - 16)
  const driftColor = Math.abs(driftPct) < 5 ? '#22c55e' : Math.abs(driftPct) < 8 ? '#f97316' : '#ef4444'

  // Downsample the path for perf
  const step = Math.max(1, Math.floor(ds.length / 300))
  const pts = ds.filter((_, i) => i % step === 0)
  const path = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i * step).toFixed(1)},${scaleY(v).toFixed(1)}`).join(' ')

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--ai-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Dérive cardiaque</p>
        <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'DM Mono,monospace', color: driftColor }}>{driftPct > 0 ? '+' : ''}{driftPct.toFixed(1)}%</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
        <path d={path} fill="none" stroke="rgba(239,68,68,0.3)" strokeWidth="1" />
        <line x1={scaleX(0)} y1={scaleY(avg1)} x2={scaleX(half)} y2={scaleY(avg1)} stroke={driftColor} strokeWidth="1.5" strokeDasharray="4,3" />
        <line x1={scaleX(half)} y1={scaleY(avg2)} x2={scaleX(ds.length - 1)} y2={scaleY(avg2)} stroke={driftColor} strokeWidth="1.5" strokeDasharray="4,3" />
        <text x={scaleX(half / 2)} y={scaleY(avg1) - 4} textAnchor="middle" fontSize="8" fill={driftColor} fontFamily="DM Mono,monospace">{Math.round(avg1)}bpm</text>
        <text x={scaleX(half + (ds.length - half) / 2)} y={scaleY(avg2) - 4} textAnchor="middle" fontSize="8" fill={driftColor} fontFamily="DM Mono,monospace">{Math.round(avg2)}bpm</text>
        <line x1={scaleX(half)} y1={4} x2={scaleX(half)} y2={H - 4} stroke="var(--ai-border)" strokeWidth="1" strokeDasharray="2,2" />
        <text x={scaleX(half)} y={H - 1} textAnchor="middle" fontSize="7" fill="var(--ai-dim)">½</text>
      </svg>
      <p style={{ fontSize: 10, color: 'var(--ai-mid)', margin: '3px 0 0', lineHeight: 1.4 }}>
        {Math.abs(driftPct) < 5
          ? 'Drift normal — effort bien maîtrisé tout au long de la séance.'
          : Math.abs(driftPct) < 8
          ? 'Drift modéré — légère fatigue en 2ème moitié. Surveiller hydratation et intensité.'
          : 'Drift élevé — fatigue significative. Possible départ trop rapide ou récupération insuffisante.'}
      </p>
    </div>
  )
}

function ZoneDistributionBar({ distribution, target }: {
  distribution: { zone: string; pct: number; minutes: number; color: string }[]
  target: { zone: string; pct: number }[] | null
}) {
  const ZONE_COLORS: Record<string, string> = { Z1: '#22c55e', Z2: '#84cc16', Z3: '#f97316', Z4: '#ef4444', Z5: '#dc2626' }
  const active = distribution.filter(z => z.pct > 0)
  if (active.length === 0) return null

  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--ai-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 5px' }}>Distribution des zones</p>
      <div style={{ display: 'flex', height: 18, borderRadius: 4, overflow: 'hidden', marginBottom: 2 }}>
        {active.map(z => (
          <div key={z.zone} style={{ width: `${z.pct}%`, background: ZONE_COLORS[z.zone] ?? z.color, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {z.pct > 8 && <span style={{ fontSize: 8, fontWeight: 700, color: '#fff' }}>{z.zone}</span>}
          </div>
        ))}
      </div>
      <p style={{ fontSize: 9, color: 'var(--ai-dim)', margin: '0 0 4px' }}>Réalisé</p>
      {target && target.filter(z => z.pct > 0).length > 0 && (
        <>
          <div style={{ display: 'flex', height: 10, borderRadius: 3, overflow: 'hidden', marginBottom: 2, opacity: 0.5 }}>
            {target.filter(z => z.pct > 0).map(z => (
              <div key={z.zone} style={{ width: `${z.pct}%`, background: ZONE_COLORS[z.zone] ?? '#999' }} />
            ))}
          </div>
          <p style={{ fontSize: 9, color: 'var(--ai-dim)', margin: '0 0 4px' }}>Cible (plan)</p>
        </>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
        {active.map(z => (
          <span key={z.zone} style={{ fontSize: 10, color: 'var(--ai-mid)' }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 2, background: ZONE_COLORS[z.zone] ?? z.color, marginRight: 3 }} />
            {z.zone} {z.pct}% ({z.minutes}min)
          </span>
        ))}
      </div>
    </div>
  )
}

// ── AnalyzeTrainingFlow ───────────────────────────────────────────

function sportColor(sport: string): string {
  const s = sport.toLowerCase()
  if (s.includes('run') || s.includes('trail')) return '#22c55e'
  if (s.includes('bike') || s.includes('cycl') || s.includes('virtual')) return '#5b6fff'
  if (s.includes('swim') || s.includes('nata')) return '#00c8e0'
  if (s.includes('hyrox')) return '#f97316'
  if (s.includes('gym') || s.includes('weight') || s.includes('strength')) return '#8b5cf6'
  return '#6b7280'
}

interface TrainingActivityRow {
  id: string
  sport_type: string
  title: string | null
  started_at: string
  moving_time_s: number | null
  distance_m: number | null
  tss: number | null
  avg_hr: number | null
  max_hr: number | null
  avg_speed_ms: number | null
  avg_watts: number | null
  avg_cadence: number | null
  avg_pace_s_km: number | null
  intensity_factor: number | null
  aerobic_decoupling: number | null
  is_race?: boolean | null
  normalized_watts?: number | null
  laps?: { distance_m: number; moving_time_s: number; avg_hr?: number; avg_watts?: number; avg_speed_ms?: number }[]
  streams: {
    time?: number[]
    heartrate?: number[]
    velocity_smooth?: number[]
    watts?: number[]
    altitude?: number[]
    cadence?: number[]
    distance?: number[]
  } | null
}

interface TrainingReport {
  mode: 'single' | 'comparison'
  verdict: 'excellent' | 'bon' | 'passable' | 'a_revoir'
  kpis: { duree_min: number; distance_km: number; tss: number; efficiency_index: number; ei_vs_average: number | null }
  zone_distribution: { zone: string; pct: number; minutes: number; color: string }[]
  zone_target: { zone: string; pct: number }[] | null
  cardiac_drift_pct: number | null
  interpretation: {
    execution: string
    contexte_recuperation: string
    plan_vs_realise: string | null
    tendance_historique: string
  }
  conseils: { label: string; detail: string; data_justification: string }[]
  comparison: {
    activite_b: { titre: string; date: string }
    deltas: { metrique: string; a: string; b: string; delta: string; interpretation: string }[]
    verdict: string
    progression: 'progression' | 'regression' | 'stable'
  } | null
  sources_used: string[]
  confiance: 'élevée' | 'modérée' | 'faible'
  actions_suggerees: { label: string; flow?: string }[]
}

// Données minimales pour re-rendre une analyse après fermeture du flow
interface TrainingReportData {
  report: TrainingReport
  activities: Array<{
    id: string
    sport_type: string
    title: string | null
    started_at: string
    streams?: {
      time?: number[]
      heartrate?: number[]
      watts?: number[]
      velocity_smooth?: number[]
      altitude?: number[]
      distance?: number[]
      cadence?: number[]
    }
  }>
  zones: { z1_max?: number; z2_max?: number; z3_max?: number; z4_max?: number } | null
  compareMode: boolean
}

function downsampleForStorage(arr: number[], max = 500): number[] {
  if (arr.length <= max) return arr
  const step = arr.length / max
  return Array.from({ length: max }, (_, i) => arr[Math.floor(i * step)])
}

// ── Follow-up actions ──────────────────────────────────────────

interface FollowUpAction {
  label: string
  prompt: string
}

function getFollowUpActions(
  sport: string,
  report: TrainingReport,
  actTitle: string,
  actDate: string,
  streams: { heartrate?: number[]; watts?: number[]; velocity_smooth?: number[]; cadence?: number[] },
): FollowUpAction[] {
  const actions: FollowUpAction[] = []
  const s = sport.toLowerCase()
  const isBike = ['bike', 'virtual_bike', 'cycling', 'velo'].some(k => s.includes(k))
  const isRun = ['run', 'trail', 'running'].some(k => s.includes(k))
  const hasHr = (streams.heartrate?.length ?? 0) > 10
  const hasWatts = (streams.watts?.length ?? 0) > 10
  const hasVelocity = (streams.velocity_smooth?.length ?? 0) > 10
  const hasCadence = (streams.cadence?.length ?? 0) > 10
  const driftAbove3 = report.cardiac_drift_pct !== null && Math.abs(report.cardiac_drift_pct) > 3
  const ctx = `Pour la séance "${actTitle}" du ${actDate}`

  if (isRun) {
    if (hasVelocity) actions.push({
      label: 'Analyse mon pacing',
      prompt: `${ctx}, analyse mon pacing en détail. Positive split, negative split, ou even split ? Quelles phases ont été trop rapides ou trop lentes ? La stratégie de pacing était-elle optimale pour ce type d'effort ? Qu'aurais-je dû faire différemment ?`,
    })
    if (hasHr && driftAbove3) actions.push({
      label: `Explique le drift cardiaque (${report.cardiac_drift_pct! > 0 ? '+' : ''}${report.cardiac_drift_pct!.toFixed(1)}%)`,
      prompt: `${ctx}, le drift cardiaque est de ${report.cardiac_drift_pct!.toFixed(1)}%. Explique en détail ce que ça signifie physiologiquement. Quelles sont les causes possibles (déshydratation, chaleur, fatigue musculaire, mauvais pacing) ? Qu'est-ce que ça révèle sur mon niveau d'endurance aérobie ? Que faire pour l'améliorer ?`,
    })
    if (hasCadence) actions.push({
      label: 'Analyse ma cadence de course',
      prompt: `${ctx}, analyse ma cadence de course. Est-elle dans la plage optimale (170-185 spm) ? Comment évolue-t-elle avec la fatigue au fil de la séance ? Est-ce un levier d'amélioration de mon économie de course ? Donne des recommandations concrètes.`,
    })
    if (hasHr || hasVelocity) actions.push({
      label: "Gestion de l'intensité par zones",
      prompt: `${ctx}, analyse la distribution de l'intensité par zones. La répartition était-elle adaptée au type d'effort ? Ai-je passé trop de temps en zone 3 (no man's land) ? Pas assez en Z1-Z2 si c'était de l'endurance ? Trop conservateur ou trop agressif ? Donne la répartition optimale pour ce type de séance.`,
    })
    actions.push({
      label: 'Compare avec mes séances similaires',
      prompt: `Compare la séance "${actTitle}" du ${actDate} avec mes séances de course similaires récentes. Est-ce que je progresse, stagne, ou régresse ? Quels indicateurs le montrent (allure, FC, EI, drift) ? Sois précis avec les chiffres et donne une tendance claire.`,
    })
    actions.push({
      label: 'Prochaine séance running idéale',
      prompt: `Basé sur l'analyse de la course "${actTitle}" du ${actDate} (verdict: ${report.verdict}, EI: ${report.kpis.efficiency_index}, drift: ${report.cardiac_drift_pct?.toFixed(1) ?? 'N/A'}%), quelle serait la séance running idéale pour mon prochain entraînement ? Donne un plan concret : échauffement, corps de séance, retour au calme, zones cibles, durée totale.`,
    })
  } else if (isBike) {
    if (hasWatts) actions.push({
      label: 'Analyse mon profil de puissance',
      prompt: `${ctx}, analyse en détail mon profil de puissance. Comment la puissance a-t-elle évolué au cours de la séance ? Y a-t-il des signes de fatigue (chute progressive, incapacité à reproduire les efforts) ? La variabilité de puissance (VI) était-elle adaptée au type d'effort ? Analyse les intervalles si c'était du fractionné.`,
    })
    if (hasHr && driftAbove3) actions.push({
      label: `Explique le drift cardiaque (${report.cardiac_drift_pct! > 0 ? '+' : ''}${report.cardiac_drift_pct!.toFixed(1)}%)`,
      prompt: `${ctx}, le drift cardiaque est de ${report.cardiac_drift_pct!.toFixed(1)}%. Explique ce que ça signifie dans le contexte du vélo. Causes possibles : déshydratation, chaleur, fatigue musculaire, intensité trop élevée ? Qu'est-ce que ça révèle sur ma base aérobie ? Recommandations concrètes.`,
    })
    if (hasCadence) actions.push({
      label: 'Analyse ma cadence de pédalage',
      prompt: `${ctx}, analyse ma cadence de pédalage. Est-elle adaptée au terrain et à l'intensité ? Ai-je tendance à mouliner trop (>100rpm) ou forcer trop (<75rpm) ? Comment évolue-t-elle avec la fatigue ? Quel impact sur l'efficacité neuromusculaire et la fatigue musculaire ? Recommandations concrètes.`,
    })
    if (hasWatts && hasHr) actions.push({
      label: 'Analyse le rapport puissance/FC',
      prompt: `${ctx}, analyse le rapport entre ma puissance et ma fréquence cardiaque tout au long de la séance. Y a-t-il un découplement aérobie ? À quel moment l'efficience commence-t-elle à baisser ? Qu'est-ce que ça dit sur mon endurance de base et mon niveau de forme actuel ?`,
    })
    actions.push({
      label: 'Compare avec mes séances similaires',
      prompt: `Compare la séance vélo "${actTitle}" du ${actDate} avec mes sorties vélo similaires récentes. Est-ce que je progresse, stagne, ou régresse ? Quels indicateurs le montrent (puissance, NP, EI, drift, cadence) ? Sois précis avec les chiffres.`,
    })
    actions.push({
      label: 'Prochaine séance vélo idéale',
      prompt: `Basé sur l'analyse de la séance vélo "${actTitle}" du ${actDate} (verdict: ${report.verdict}, EI: ${report.kpis.efficiency_index}, drift: ${report.cardiac_drift_pct?.toFixed(1) ?? 'N/A'}%), quelle serait la séance vélo idéale pour ma prochaine sortie ? Donne un plan concret : type de séance, zones cibles, durée, structure des intervalles si pertinent.`,
    })
  } else {
    if (hasHr || hasVelocity || hasWatts) actions.push({
      label: "Détaille la gestion de l'intensité",
      prompt: `${ctx}, analyse en détail la gestion de l'intensité. Comment l'effort a-t-il été réparti ? Y a-t-il eu des erreurs de pacing ? Des phases trop agressives ou trop conservatrices ?`,
    })
    if (hasHr && driftAbove3) actions.push({
      label: `Explique le drift cardiaque (${report.cardiac_drift_pct! > 0 ? '+' : ''}${report.cardiac_drift_pct!.toFixed(1)}%)`,
      prompt: `${ctx}, le drift cardiaque est de ${report.cardiac_drift_pct!.toFixed(1)}%. Explique ce que ça signifie physiologiquement et quelles en sont les causes possibles.`,
    })
    actions.push({
      label: 'Compare avec mes séances similaires',
      prompt: `Compare la séance "${actTitle}" du ${actDate} avec mes séances similaires récentes. Progression, stagnation ou régression ?`,
    })
    actions.push({
      label: 'Prochaine séance idéale',
      prompt: `Basé sur l'analyse de "${actTitle}" du ${actDate} (verdict: ${report.verdict}), quelle serait la séance idéale pour mon prochain entraînement ?`,
    })
  }

  return actions.slice(0, 4)
}

function AnalyzeTrainingFlow({ onCancel, onRecordConv, onFollowUp }: {
  onCancel: () => void
  onRecordConv?: (userMsg: string, aiMsg: string, reportData?: TrainingReportData) => void
  onFollowUp?: (displayLabel: string, fullPrompt: string) => void
}) {
  type Phase = 'loading' | 'gate' | 'select' | 'generating' | 'result'
  const [phase, setPhase] = useState<Phase>('loading')
  const [compareMode, setCompareMode] = useState(false)
  const [selected, setSelected] = useState<TrainingActivityRow[]>([])
  const [report, setReport] = useState<TrainingReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [ctxZones, setCtxZones] = useState<{ z1_max?: number; z2_max?: number; z3_max?: number; z4_max?: number } | null>(null)
  const [recorded, setRecorded] = useState(false)
  // Select phase states
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [sportFilter, setSportFilter] = useState<string | null>(null)
  const [monthActivities, setMonthActivities] = useState<TrainingActivityRow[]>([])
  const [raceActivities, setRaceActivities] = useState<TrainingActivityRow[]>([])
  const [loadingMonth, setLoadingMonth] = useState(false)
  const [racesExpanded, setRacesExpanded] = useState(false)
  const [plannedDates, setPlannedDates] = useState<Set<string>>(new Set())

  // Mount — gate data
  useEffect(() => {
    void (async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { setError('Non connecté'); return }

        const [countRes, plannedRes] = await Promise.all([
          sb.from('activities').select('id', { count: 'exact', head: true }),
          sb.from('planned_sessions').select('week_start,sport').eq('user_id', user.id).order('week_start', { ascending: false }).limit(50),
        ])

        setTotalCount(countRes.count ?? 0)
        const dates = new Set<string>()
        for (const p of (plannedRes.data ?? [])) {
          if (p.week_start) dates.add(p.week_start as string)
        }
        setPlannedDates(dates)
        setPhase('gate')
      } catch {
        setError('Erreur de chargement')
        setPhase('gate')
      }
    })()
  }, [])

  // Charger activités du mois sélectionné
  useEffect(() => {
    if (phase !== 'select') return
    void (async () => {
      setLoadingMonth(true)
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const startOfMonth = new Date(selectedMonth.year, selectedMonth.month, 1).toISOString()
        const endOfMonth = new Date(selectedMonth.year, selectedMonth.month + 1, 0, 23, 59, 59).toISOString()
        let query = sb.from('activities')
          .select('*')
          .gte('started_at', startOfMonth).lte('started_at', endOfMonth)
          .order('started_at', { ascending: false })
        if (sportFilter) query = query.eq('sport_type', sportFilter)
        const { data } = await query
        setMonthActivities((data as unknown as TrainingActivityRow[]) ?? [])
      } catch { setMonthActivities([]) }
      finally { setLoadingMonth(false) }
    })()
  }, [selectedMonth, sportFilter, phase])

  // Charger les courses (une seule fois au passage en select)
  useEffect(() => {
    if (phase !== 'select') return
    void (async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const { data } = await sb.from('activities')
          .select('*')
          .eq('is_race', true)
          .order('started_at', { ascending: false }).limit(50)
        setRaceActivities((data as unknown as TrainingActivityRow[]) ?? [])
      } catch { setRaceActivities([]) }
    })()
  }, [phase])

  // no-op — replaced by month-based loading
  async function loadActivities(_reset = false) {
    void _reset
  }

  function handleFollowUp(action: FollowUpAction) {
    // Si l'analyse n'a pas encore été enregistrée (cas edge où onRecordConv n'a pas été appelé)
    if (!recorded && onRecordConv && report && selected.length > 0) {
      const mainAct = selected[0]
      const actNom = mainAct.title ?? AE_SPORT_LABELS[mainAct.sport_type] ?? mainAct.sport_type
      const actDate = mainAct.started_at?.slice(0, 10) ?? ''
      const userMsg = compareMode
        ? `Comparer 2 entraînements — ${actNom} (${actDate}) vs ${selected[1]?.started_at?.slice(0, 10)}`
        : `Analyser un entraînement — ${actNom} (${actDate})`
      const aiMsg = `**Analyse — ${actNom}** (${actDate})\n\nVerdict : ${report.verdict}\nTSS : ${report.kpis.tss} · EI : ${report.kpis.efficiency_index}\n${report.interpretation.execution}`
      const reportData: TrainingReportData = {
        report,
        activities: selected.map(a => ({
          id: a.id, sport_type: a.sport_type, title: a.title, started_at: a.started_at,
          streams: a.streams ? {
            time: a.streams.time ? downsampleForStorage(a.streams.time) : undefined,
            heartrate: a.streams.heartrate ? downsampleForStorage(a.streams.heartrate) : undefined,
            watts: a.streams.watts ? downsampleForStorage(a.streams.watts) : undefined,
            velocity_smooth: a.streams.velocity_smooth ? downsampleForStorage(a.streams.velocity_smooth) : undefined,
            altitude: a.streams.altitude ? downsampleForStorage(a.streams.altitude) : undefined,
            cadence: a.streams.cadence ? downsampleForStorage(a.streams.cadence) : undefined,
          } : undefined,
        })),
        zones: ctxZones,
        compareMode,
      }
      onRecordConv(userMsg, aiMsg, reportData)
      setRecorded(true)
    }
    if (onFollowUp) onFollowUp(action.label, action.prompt)
  }

  async function handleAnalyze() {
    if (selected.length === 0) return
    setPhase('generating')
    setError(null)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return

      const mainAct = selected[0]
      const actDate = mainAct.started_at.slice(0, 10)
      const d3before = new Date(new Date(actDate).getTime() - 3 * 86400000).toISOString().slice(0, 10)
      const weekStartDate = (() => { const d = new Date(actDate); const day = d.getDay(); d.setDate(d.getDate() - day + (day === 0 ? -6 : 1)); return d.toISOString().slice(0, 10) })()

      const [rulesRes, zonesRes, recoveryRes, plannedRes, similarRes, weekActsRes] = await Promise.all([
        sb.from('ai_rules').select('category,rule_text').eq('user_id', user.id).eq('active', true),
        sb.from('training_zones').select('*').eq('user_id', user.id).eq('sport', mainAct.sport_type).eq('is_current', true).maybeSingle(),
        Promise.resolve(sb.from('metrics_daily').select('*').eq('user_id', user.id).gte('date', d3before).lte('date', actDate)).catch(() => ({ data: null })),
        sb.from('planned_sessions').select('*').eq('user_id', user.id).eq('sport', mainAct.sport_type).eq('week_start', weekStartDate).maybeSingle(),
        sb.from('activities').select('id,started_at,moving_time_s,avg_hr,avg_watts,tss,intensity_factor,aerobic_decoupling').eq('sport_type', mainAct.sport_type)
          .gte('moving_time_s', Math.round((mainAct.moving_time_s ?? 3600) * 0.7))
          .lte('moving_time_s', Math.round((mainAct.moving_time_s ?? 3600) * 1.3))
          .not('id', 'in', `(${selected.map(s => s.id).join(',')})`)
          .order('started_at', { ascending: false }).limit(10),
        sb.from('activities').select('tss').gte('started_at', weekStartDate + 'T00:00:00').lt('started_at', mainAct.started_at),
      ])

      const tssWeekBefore = (weekActsRes.data ?? []).reduce((s: number, a: { tss: number | null }) => s + (a.tss ?? 0), 0)
      setCtxZones(zonesRes.data as { z1_max?: number; z2_max?: number; z3_max?: number; z4_max?: number } | null)

      const activitiesWithMetrics = selected.map(act => {
        const driftPct = act.streams?.heartrate && act.streams.heartrate.length > 20
          ? computeCardiacDrift({ heartrate: act.streams.heartrate })
          : null
        return { ...act, cardiac_drift_pct: driftPct }
      })

      // Métriques pré-calculées côté client
      const mainDrift = activitiesWithMetrics[0]?.cardiac_drift_pct ?? null
      const mainHr = mainAct.avg_hr
      const mainEI = mainHr
        ? mainAct.sport_type.toLowerCase().includes('bike') || mainAct.sport_type.toLowerCase().includes('cycl') || mainAct.sport_type.toLowerCase().includes('velo')
          ? (mainAct.avg_watts ?? null) != null ? (mainAct.avg_watts! / mainHr) : null
          : (mainAct.avg_speed_ms ?? null) != null ? (mainAct.avg_speed_ms! / mainHr * 100) : null
        : null
      const similarEIList = (similarRes.data ?? []) as { avg_hr?: number; avg_watts?: number; avg_speed_ms?: number }[]
      const eiSimilarAvg = similarEIList.length > 0
        ? similarEIList.reduce((sum, s) => {
            if (!s.avg_hr || s.avg_hr === 0) return sum
            const ei = mainAct.sport_type.toLowerCase().includes('bike') || mainAct.sport_type.toLowerCase().includes('cycl')
              ? (s.avg_watts ?? 0) / s.avg_hr
              : (s.avg_speed_ms ?? 0) / s.avg_hr * 100
            return sum + ei
          }, 0) / similarEIList.filter(s => (s.avg_hr ?? 0) > 0).length
        : null
      const eiDelta = mainEI != null && eiSimilarAvg != null && eiSimilarAvg > 0
        ? ((mainEI - eiSimilarAvg) / eiSimilarAvg) * 100
        : null

      const res = await fetch('/api/analyze-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activities: activitiesWithMetrics,
          zones: zonesRes.data,
          planned: plannedRes.data,
          recovery: recoveryRes.data ?? [],
          similar: similarRes.data ?? [],
          tssWeekBefore,
          isRace: mainAct.is_race ?? false,
          sport: mainAct.sport_type,
          aiRules: rulesRes.data ?? [],
          // Métriques pré-calculées
          cardiac_drift_pct: mainDrift,
          efficiency_index: mainEI,
          ei_vs_similar_avg: eiDelta,
          zone_distribution: null, // calculée par l'IA depuis la FC et les zones
        }),
      })
      const data = await res.json() as { report?: TrainingReport; error?: string }
      if (data.error || !data.report) throw new Error(data.error ?? 'Réponse invalide')
      setReport(data.report)

      if (onRecordConv) {
        const actNom = mainAct.title ?? AE_SPORT_LABELS[mainAct.sport_type] ?? mainAct.sport_type
        const userMsg = compareMode
          ? `Comparer 2 entraînements — ${actNom} (${actDate}) vs ${selected[1]?.started_at?.slice(0, 10)}`
          : `Analyser un entraînement — ${actNom} (${actDate})`
        const aiMsg = `**Analyse — ${actNom}** (${actDate})\n\nVerdict : ${data.report.verdict}\nTSS : ${data.report.kpis.tss} · EI : ${data.report.kpis.efficiency_index}\n${data.report.interpretation.execution}`
        const reportData: TrainingReportData = {
          report: data.report,
          activities: selected.map(a => ({
            id: a.id,
            sport_type: a.sport_type,
            title: a.title,
            started_at: a.started_at,
            streams: a.streams ? {
              time: a.streams.time ? downsampleForStorage(a.streams.time) : undefined,
              heartrate: a.streams.heartrate ? downsampleForStorage(a.streams.heartrate) : undefined,
              watts: a.streams.watts ? downsampleForStorage(a.streams.watts) : undefined,
              velocity_smooth: a.streams.velocity_smooth ? downsampleForStorage(a.streams.velocity_smooth) : undefined,
              altitude: a.streams.altitude ? downsampleForStorage(a.streams.altitude) : undefined,
              cadence: a.streams.cadence ? downsampleForStorage(a.streams.cadence) : undefined,
            } : undefined,
          })),
          zones: ctxZones,
          compareMode,
        }
        onRecordConv(userMsg, aiMsg, reportData)
      }

      setPhase('result')
    } catch (err) {
      setError(String(err))
      setPhase('select')
    }
  }

  if (phase === 'loading') {
    return <div style={{ padding: '16px 0', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ai-dim)', fontSize: 12 }}><Dots /><span>Chargement…</span></div>
  }

  if (phase === 'gate') {
    const hasActivities = totalCount > 0
    return (
      <div style={{ padding: '8px 0 4px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ai-text)', margin: '0 0 12px', fontFamily: 'Syne,sans-serif' }}>Analyser un entraînement</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ color: hasActivities ? '#22c55e' : '#ef4444' }}>{hasActivities ? '✓' : '✗'}</span>
            <span style={{ color: 'var(--ai-mid)' }}>{totalCount > 0 ? `${totalCount} activité${totalCount > 1 ? 's' : ''} synchronisée${totalCount > 1 ? 's' : ''}` : 'Aucune activité synchronisée'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ color: plannedDates.size > 0 ? '#22c55e' : '#f97316' }}>{plannedDates.size > 0 ? '✓' : '⚠'}</span>
            <span style={{ color: 'var(--ai-mid)' }}>{plannedDates.size > 0 ? 'Séances planifiées disponibles' : 'Pas de séances planifiées (comparaison plan/réel impossible)'}</span>
          </div>
        </div>
        {!hasActivities && (
          <div style={{ padding: '12px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 14, fontSize: 12, color: '#ef4444', lineHeight: 1.5 }}>
            Aucune activité. Synchronise Strava ou importe une activité d'abord.
          </div>
        )}
        {error && <p style={{ fontSize: 11, color: '#ef4444', margin: '0 0 8px' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer' }}>Annuler</button>
          {hasActivities && (
            <button onClick={() => { setPhase('select'); void loadActivities(true) }}
              style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: 'var(--ai-gradient)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Continuer →
            </button>
          )}
        </div>
      </div>
    )
  }

  if (phase === 'generating' && !report) {
    return (
      <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'var(--ai-dim)' }}>
        <Dots />
        <p style={{ fontSize: 12, margin: 0, textAlign: 'center' }}>Analyse en cours — croisement de tes données…</p>
      </div>
    )
  }

  if (phase === 'select') {
    const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
    const availableSports = [...new Set([...monthActivities, ...raceActivities].map(a => a.sport_type))].filter(Boolean).sort()

    const filteredMonth = sportFilter ? monthActivities.filter(a => a.sport_type === sportFilter) : monthActivities
    const filteredRaces = sportFilter ? raceActivities.filter(a => a.sport_type === sportFilter) : raceActivities

    const showSimilarOnly = compareMode && selected.length === 1
    const similarFilter = (a: TrainingActivityRow) => {
      if (!showSimilarOnly) return true
      const ref = selected[0]
      if (a.id === ref.id || a.sport_type !== ref.sport_type) return false
      const refDur = ref.moving_time_s ?? 3600
      const aDur = a.moving_time_s ?? 3600
      return aDur >= refDur * 0.5 && aDur <= refDur * 1.5
    }

    const displayedMonth = filteredMonth.filter(similarFilter)
    const displayedRaces = filteredRaces.filter(similarFilter)

    function toggleSelect(activity: TrainingActivityRow) {
      const alreadySelected = selected.some(s => s.id === activity.id)
      if (alreadySelected) {
        setSelected(prev => prev.filter(s => s.id !== activity.id))
      } else if (compareMode) {
        setSelected(prev => prev.length >= 2 ? [prev[0], activity] : [...prev, activity])
      } else {
        setSelected([activity])
      }
    }

    function renderActivityCard(a: TrainingActivityRow) {
      const isSelected = selected.some(s => s.id === a.id)
      const idx = selected.findIndex(s => s.id === a.id)
      const hasStreams = !!(a.streams && (a.streams.heartrate?.length || a.streams.watts?.length))
      const dateStr = new Date(a.started_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      const durMin = Math.round((a.moving_time_s ?? 0) / 60)
      const distKm = a.distance_m ? (a.distance_m / 1000).toFixed(1) : null

      return (
        <button key={a.id} onClick={() => toggleSelect(a)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '10px 12px', borderRadius: 10, textAlign: 'left',
            border: `1.5px solid ${isSelected ? '#5b6fff' : 'var(--ai-border)'}`,
            background: isSelected ? 'rgba(91,111,255,0.06)' : 'var(--ai-bg2)',
            cursor: 'pointer', transition: 'all 0.12s',
          }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: sportColor(a.sport_type), flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: isSelected ? '#5b6fff' : 'var(--ai-text)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {a.title ?? a.sport_type.replace('_', ' ')}
              {a.is_race && <span style={{ fontSize: 9, fontWeight: 700, color: '#f97316', marginLeft: 6 }}>COURSE</span>}
            </p>
            <p style={{ fontSize: 10, color: 'var(--ai-dim)', margin: 0 }}>
              {dateStr} · {durMin}min{distKm ? ` · ${distKm}km` : ''}{a.tss ? ` · TSS ${a.tss}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
            {hasStreams && <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 4, background: 'rgba(91,111,255,0.12)', color: '#5b6fff' }}>Streams</span>}
            {isSelected && (
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#5b6fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {compareMode
                  ? <span style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>{idx === 0 ? 'A' : 'B'}</span>
                  : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>}
              </div>
            )}
          </div>
        </button>
      )
    }

    return (
      <div style={{ padding: '4px 0' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ai-text)', margin: '0 0 4px', fontFamily: 'Syne,sans-serif' }}>
          Analyser un entraînement
        </p>

        {/* Toggle comparaison */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 12px', cursor: 'pointer' }}>
          <input type="checkbox" checked={compareMode} onChange={e => { setCompareMode(e.target.checked); setSelected(prev => prev.slice(0, 1)) }}
            style={{ accentColor: '#5b6fff' }} />
          <span style={{ fontSize: 12, color: 'var(--ai-mid)' }}>Comparer 2 entraînements similaires</span>
        </label>

        {showSimilarOnly && (
          <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(91,111,255,0.06)', border: '1px solid rgba(91,111,255,0.2)', marginBottom: 10, fontSize: 11, color: '#5b6fff' }}>
            Séances similaires à "{selected[0].title ?? selected[0].sport_type}" ({Math.round((selected[0].moving_time_s ?? 0) / 60)}min)
          </div>
        )}

        {/* Filtre sport */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
          {(['', ...availableSports] as string[]).map(sp => (
            <button key={sp || '__all__'} onClick={() => setSportFilter(sp || null)}
              style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${(sp === '' ? !sportFilter : sportFilter === sp) ? '#5b6fff' : 'var(--ai-border)'}`, background: (sp === '' ? !sportFilter : sportFilter === sp) ? 'rgba(91,111,255,0.08)' : 'transparent', color: (sp === '' ? !sportFilter : sportFilter === sp) ? '#5b6fff' : 'var(--ai-mid)', fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
              {sp === '' ? 'Tous' : (AE_SPORT_LABELS[sp] ?? sp.replace('_', ' '))}
            </button>
          ))}
        </div>

        {/* Section Courses */}
        {displayedRaces.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <button onClick={() => setRacesExpanded(p => !p)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--ai-dim)" strokeWidth="2.5"
                style={{ transform: racesExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', flexShrink: 0 }}>
                <path d="M9 18l6-6-6-6"/>
              </svg>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Courses ({displayedRaces.length})
              </span>
            </button>
            {racesExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                {displayedRaces.map(a => renderActivityCard(a))}
              </div>
            )}
          </div>
        )}

        {/* Sélecteur de mois */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10, padding: '6px 0', borderTop: '1px solid var(--ai-border)', borderBottom: '1px solid var(--ai-border)' }}>
          <button onClick={() => setSelectedMonth(prev => prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ai-mid)', fontSize: 16, padding: '2px 8px', lineHeight: 1 }}>◀</button>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ai-text)', fontFamily: 'Syne,sans-serif', minWidth: 130, textAlign: 'center' }}>
            {MONTHS_FR[selectedMonth.month]} {selectedMonth.year}
          </span>
          <button onClick={() => setSelectedMonth(prev => prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ai-mid)', fontSize: 16, padding: '2px 8px', lineHeight: 1 }}>▶</button>
        </div>

        {/* Liste activités du mois */}
        <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
          {loadingMonth ? (
            <div style={{ padding: '20px 0', textAlign: 'center' }}>
              <Dots />
              <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '8px 0 0' }}>Chargement…</p>
            </div>
          ) : displayedMonth.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--ai-dim)', textAlign: 'center', padding: '20px 0' }}>
              Aucune activité en {MONTHS_FR[selectedMonth.month]} {selectedMonth.year}
            </p>
          ) : displayedMonth.map(a => renderActivityCard(a))}
        </div>

        {/* Bouton Analyser */}
        <button
          onClick={() => void handleAnalyze()}
          disabled={selected.length === 0 || (compareMode && selected.length < 2)}
          style={{
            width: '100%', padding: '11px', borderRadius: 10, border: 'none',
            background: (selected.length > 0 && (!compareMode || selected.length === 2))
              ? 'linear-gradient(135deg,#00c8e0,#5b6fff)' : 'var(--ai-border)',
            color: (selected.length > 0 && (!compareMode || selected.length === 2)) ? '#fff' : 'var(--ai-dim)',
            fontSize: 13, fontWeight: 700, cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
            fontFamily: 'Syne,sans-serif', marginBottom: 6,
          }}>
          {compareMode
            ? selected.length === 2
              ? `Comparer — ${selected[0].title ?? selected[0].sport_type} vs ${selected[1].title ?? selected[1].sport_type}`
              : `Comparer (${selected.length}/2)`
            : selected.length > 0
              ? `Analyser — ${selected[0].title ?? selected[0].sport_type}`
              : 'Sélectionne une activité'}
        </button>

        <button onClick={onCancel} style={{ display: 'block', margin: '0 auto', fontSize: 11, color: 'var(--ai-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
          Annuler
        </button>
      </div>
    )
  }

  if (phase === 'result' && report && selected.length > 0) {
    const verdictColors: Record<string, string> = { excellent: '#22c55e', bon: '#3b82f6', passable: '#f97316', a_revoir: '#ef4444' }
    const verdictLabels: Record<string, string> = { excellent: '🏆 Excellent', bon: '✓ Bon', passable: '~ Passable', a_revoir: '⚠ À revoir' }
    const vColor = verdictColors[report.verdict] ?? '#3b82f6'
    const mainAct = selected[0]
    const confidenceColor = report.confiance === 'élevée' ? '#22c55e' : report.confiance === 'modérée' ? '#f97316' : '#ef4444'
    const followUpActions = getFollowUpActions(
      mainAct.sport_type,
      report,
      mainAct.title ?? AE_SPORT_LABELS[mainAct.sport_type] ?? mainAct.sport_type,
      mainAct.started_at?.slice(0, 10) ?? '',
      mainAct.streams ?? {},
    )

    return (
      <div style={{ padding: '8px 0 4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ai-text)', margin: '0 0 2px', fontFamily: 'Syne,sans-serif' }}>
              {mainAct.title ?? AE_SPORT_LABELS[mainAct.sport_type] ?? mainAct.sport_type}
            </p>
            <p style={{ fontSize: 10, color: 'var(--ai-dim)', margin: 0 }}>{mainAct.started_at.slice(0, 10)}</p>
          </div>
          <span style={{ padding: '4px 10px', borderRadius: 20, background: `${vColor}1a`, color: vColor, fontSize: 11, fontWeight: 700, border: `1px solid ${vColor}33` }}>
            {verdictLabels[report.verdict]}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 12 }}>
          {[
            { label: 'Durée', value: fmtDuration(Math.round((report.kpis.duree_min ?? 0) * 60)) },
            { label: 'Distance', value: report.kpis.distance_km != null ? `${report.kpis.distance_km.toFixed(1)}km` : '—' },
            { label: 'TSS', value: report.kpis.tss != null ? String(report.kpis.tss) : '—' },
            { label: 'EI', value: report.kpis.efficiency_index != null ? report.kpis.efficiency_index.toFixed(2) : '—', sub: report.kpis.ei_vs_average != null ? `${report.kpis.ei_vs_average > 0 ? '+' : ''}${report.kpis.ei_vs_average.toFixed(1)}%` : '' },
          ].map(k => (
            <div key={k.label} style={{ padding: '8px 6px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', textAlign: 'center' }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--ai-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>{k.label}</p>
              <p style={{ fontSize: 14, fontWeight: 800, fontFamily: 'DM Mono,monospace', color: 'var(--ai-text)', margin: 0 }}>{k.value}</p>
              {k.sub && <p style={{ fontSize: 9, color: 'var(--ai-dim)', margin: 0 }}>{k.sub}</p>}
            </div>
          ))}
        </div>

        {/* Graphiques streams — rendus côté client depuis les données brutes */}
        {selected[0].streams && (
          <>
            <StreamProfileChart
              streams={selected[0].streams}
              zones={ctxZones}
              sport={selected[0].sport_type}
            />
            {selected[0].streams.heartrate && report.cardiac_drift_pct != null && (
              <CardiacDriftChart
                heartrate={selected[0].streams.heartrate}
                driftPct={report.cardiac_drift_pct}
              />
            )}
          </>
        )}

        {/* Distribution des zones */}
        {(report.zone_distribution ?? []).length > 0 && (
          <ZoneDistributionBar
            distribution={report.zone_distribution ?? []}
            target={report.zone_target ?? null}
          />
        )}

        {/* Mode comparaison — graphiques séance B */}
        {compareMode && selected[1]?.streams && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ai-mid)', margin: '0 0 5px' }}>
              Séance B — {selected[1].title ?? AE_SPORT_LABELS[selected[1].sport_type] ?? selected[1].sport_type}
            </p>
            <StreamProfileChart
              streams={selected[1].streams}
              zones={ctxZones}
              sport={selected[1].sport_type}
            />
          </div>
        )}

        {/* ── Séparateur + titre Analyse du coach ── */}
        <div style={{ margin: '16px 0 10px', borderBottom: '1px solid var(--ai-border)' }} />
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ai-text)', fontFamily: 'Syne, sans-serif', margin: '0 0 10px', letterSpacing: '-0.01em' }}>
          Analyse du coach
        </p>

        {[
          { title: 'Exécution', text: report.interpretation?.execution },
          { title: 'Récupération', text: report.interpretation?.contexte_recuperation },
          ...(report.interpretation?.plan_vs_realise ? [{ title: 'Plan vs réalisé', text: report.interpretation.plan_vs_realise }] : []),
          { title: 'Tendance historique', text: report.interpretation?.tendance_historique },
        ].filter(b => b.text && b.text.trim() !== '').map((b, i, arr) => (
          <div key={i} style={{ marginBottom: i < arr.length - 1 ? 16 : 0 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--ai-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>{b.title}</p>
            <MsgContent text={b.text!} />
          </div>
        ))}

        {report.comparison && (
          <div style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(0,200,224,0.2)', background: 'rgba(0,200,224,0.04)', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#00c8e0', margin: 0, fontFamily: 'Syne,sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Comparaison</p>
              <span style={{ fontSize: 11, fontWeight: 700, color: report.comparison.progression === 'progression' ? '#22c55e' : report.comparison.progression === 'regression' ? '#ef4444' : 'var(--ai-mid)' }}>
                {report.comparison.progression === 'progression' ? '↑ Progression' : report.comparison.progression === 'regression' ? '↓ Régression' : '= Stable'}
              </span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr>
                  {['', 'A', 'B', 'Delta'].map(h => (
                    <th key={h} style={{ textAlign: h === '' ? 'left' : 'center', padding: '3px 5px', color: 'var(--ai-dim)', fontWeight: 600, borderBottom: '1px solid var(--ai-border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(report.comparison?.deltas ?? []).map((d, i) => (
                  <tr key={i}>
                    <td style={{ padding: '3px 5px', color: 'var(--ai-mid)' }}>{d.metrique}</td>
                    <td style={{ padding: '3px 5px', fontFamily: 'DM Mono,monospace', color: 'var(--ai-text)', textAlign: 'center' }}>{d.a ?? '—'}</td>
                    <td style={{ padding: '3px 5px', fontFamily: 'DM Mono,monospace', color: 'var(--ai-text)', textAlign: 'center' }}>{d.b ?? '—'}</td>
                    <td style={{ padding: '3px 5px', fontFamily: 'DM Mono,monospace', fontWeight: 700, textAlign: 'center', color: (d.delta ?? '').startsWith('+') ? '#22c55e' : (d.delta ?? '').startsWith('-') ? '#ef4444' : 'var(--ai-mid)' }}>{d.delta ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {report.comparison?.verdict && <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: '8px 0 0', lineHeight: 1.4 }}>{report.comparison.verdict}</p>}
          </div>
        )}

        {(report.conseils ?? []).length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--ai-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Conseils d'optimisation</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(report.conseils ?? []).map((c, i) => (
                <div key={i} style={{ padding: '10px 12px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai-text)', margin: '0 0 2px' }}>{c.label}</p>
                  <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: '0 0 2px', lineHeight: 1.4 }}>{c.detail}</p>
                  <p style={{ fontSize: 10, color: 'var(--ai-dim)', margin: 0, fontStyle: 'italic' }}>{c.data_justification}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {followUpActions.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--ai-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
              Approfondir l&apos;analyse
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {followUpActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => handleFollowUp(action)}
                  style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', color: 'var(--ai-text)', fontSize: 11, cursor: 'pointer', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', transition: 'border-color 0.15s, background 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,200,224,0.5)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,200,224,0.06)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--ai-border)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--ai-bg2)' }}
                >
                  {action.label} →
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--ai-bg2)', fontSize: 10, color: 'var(--ai-dim)', marginBottom: 10 }}>
          <p style={{ margin: '0 0 2px' }}>Sources : {report.sources_used.join(' · ')}</p>
          <p style={{ margin: 0 }}>Confiance : <strong style={{ color: confidenceColor }}>{report.confiance}</strong></p>
        </div>

        <button onClick={onCancel} style={{ width: '100%', padding: '9px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer' }}>
          Fermer
        </button>
      </div>
    )
  }

  return null
}

// ── TrainingReportView ─────────────────────────────────────────
// Composant de re-rendu d'une analyse d'entraînement depuis l'historique.
// Reçoit un TrainingReportData (stocké dans AIMsg.trainingReport) et
// rend exactement le même contenu que la phase 'result' de AnalyzeTrainingFlow,
// sans le bouton "Fermer".

function TrainingReportView({ data }: { data: TrainingReportData }) {
  const { report, activities, zones, compareMode } = data
  const mainAct = activities[0]
  if (!mainAct) return null

  const verdictColors: Record<string, string> = { excellent: '#22c55e', bon: '#3b82f6', passable: '#f97316', a_revoir: '#ef4444' }
  const verdictLabels: Record<string, string> = { excellent: '🏆 Excellent', bon: '✓ Bon', passable: '~ Passable', a_revoir: '⚠ À revoir' }
  const vColor = verdictColors[report.verdict] ?? '#3b82f6'
  const confidenceColor = report.confiance === 'élevée' ? '#22c55e' : report.confiance === 'modérée' ? '#f97316' : '#ef4444'

  return (
    <div style={{ padding: '8px 0 4px' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ai-text)', margin: '0 0 2px', fontFamily: 'Syne,sans-serif' }}>
            {mainAct.title ?? AE_SPORT_LABELS[mainAct.sport_type] ?? mainAct.sport_type}
          </p>
          <p style={{ fontSize: 10, color: 'var(--ai-dim)', margin: 0 }}>{mainAct.started_at.slice(0, 10)}</p>
        </div>
        <span style={{ padding: '4px 10px', borderRadius: 20, background: `${vColor}1a`, color: vColor, fontSize: 11, fontWeight: 700, border: `1px solid ${vColor}33` }}>
          {verdictLabels[report.verdict]}
        </span>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 12 }}>
        {[
          { label: 'Durée', value: fmtDuration(Math.round((report.kpis.duree_min ?? 0) * 60)) },
          { label: 'Distance', value: report.kpis.distance_km != null ? `${report.kpis.distance_km.toFixed(1)}km` : '—' },
          { label: 'TSS', value: report.kpis.tss != null ? String(report.kpis.tss) : '—' },
          { label: 'EI', value: report.kpis.efficiency_index != null ? report.kpis.efficiency_index.toFixed(2) : '—', sub: report.kpis.ei_vs_average != null ? `${report.kpis.ei_vs_average > 0 ? '+' : ''}${report.kpis.ei_vs_average.toFixed(1)}%` : '' },
        ].map(k => (
          <div key={k.label} style={{ padding: '8px 6px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', textAlign: 'center' }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--ai-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>{k.label}</p>
            <p style={{ fontSize: 14, fontWeight: 800, fontFamily: 'DM Mono,monospace', color: 'var(--ai-text)', margin: 0 }}>{k.value}</p>
            {k.sub && <p style={{ fontSize: 9, color: 'var(--ai-dim)', margin: 0 }}>{k.sub}</p>}
          </div>
        ))}
      </div>

      {/* Graphiques streams */}
      {mainAct.streams && (
        <>
          <StreamProfileChart streams={mainAct.streams} zones={zones} sport={mainAct.sport_type} />
          {mainAct.streams.heartrate && report.cardiac_drift_pct != null && (
            <CardiacDriftChart heartrate={mainAct.streams.heartrate} driftPct={report.cardiac_drift_pct} />
          )}
        </>
      )}

      {/* Distribution des zones */}
      {(report.zone_distribution ?? []).length > 0 && (
        <ZoneDistributionBar distribution={report.zone_distribution ?? []} target={report.zone_target ?? null} />
      )}

      {/* Séance B */}
      {compareMode && activities[1]?.streams && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ai-mid)', margin: '0 0 5px' }}>
            Séance B — {activities[1].title ?? AE_SPORT_LABELS[activities[1].sport_type] ?? activities[1].sport_type}
          </p>
          <StreamProfileChart streams={activities[1].streams} zones={zones} sport={activities[1].sport_type} />
        </div>
      )}

      {/* ── Séparateur + titre Analyse du coach ── */}
      <div style={{ margin: '16px 0 10px', borderBottom: '1px solid var(--ai-border)' }} />
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ai-text)', fontFamily: 'Syne, sans-serif', margin: '0 0 10px', letterSpacing: '-0.01em' }}>
        Analyse du coach
      </p>

      {[
        { title: 'Exécution', text: report.interpretation?.execution },
        { title: 'Récupération', text: report.interpretation?.contexte_recuperation },
        ...(report.interpretation?.plan_vs_realise ? [{ title: 'Plan vs réalisé', text: report.interpretation.plan_vs_realise }] : []),
        { title: 'Tendance historique', text: report.interpretation?.tendance_historique },
      ].filter(b => b.text && b.text.trim() !== '').map((b, i, arr) => (
        <div key={i} style={{ marginBottom: i < arr.length - 1 ? 16 : 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--ai-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>{b.title}</p>
          <MsgContent text={b.text!} />
        </div>
      ))}

      {/* Tableau de comparaison */}
      {report.comparison && (
        <div style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(0,200,224,0.2)', background: 'rgba(0,200,224,0.04)', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#00c8e0', margin: 0, fontFamily: 'Syne,sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Comparaison</p>
            <span style={{ fontSize: 11, fontWeight: 700, color: report.comparison.progression === 'progression' ? '#22c55e' : report.comparison.progression === 'regression' ? '#ef4444' : 'var(--ai-mid)' }}>
              {report.comparison.progression === 'progression' ? '↑ Progression' : report.comparison.progression === 'regression' ? '↓ Régression' : '= Stable'}
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
            <thead>
              <tr>
                {['', 'A', 'B', 'Delta'].map(h => (
                  <th key={h} style={{ textAlign: h === '' ? 'left' : 'center', padding: '3px 5px', color: 'var(--ai-dim)', fontWeight: 600, borderBottom: '1px solid var(--ai-border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(report.comparison?.deltas ?? []).map((d, i) => (
                <tr key={i}>
                  <td style={{ padding: '3px 5px', color: 'var(--ai-mid)' }}>{d.metrique}</td>
                  <td style={{ padding: '3px 5px', fontFamily: 'DM Mono,monospace', color: 'var(--ai-text)', textAlign: 'center' }}>{d.a ?? '—'}</td>
                  <td style={{ padding: '3px 5px', fontFamily: 'DM Mono,monospace', color: 'var(--ai-text)', textAlign: 'center' }}>{d.b ?? '—'}</td>
                  <td style={{ padding: '3px 5px', fontFamily: 'DM Mono,monospace', fontWeight: 700, textAlign: 'center', color: (d.delta ?? '').startsWith('+') ? '#22c55e' : (d.delta ?? '').startsWith('-') ? '#ef4444' : 'var(--ai-mid)' }}>{d.delta ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {report.comparison?.verdict && <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: '8px 0 0', lineHeight: 1.4 }}>{report.comparison.verdict}</p>}
        </div>
      )}

      {/* Conseils */}
      {(report.conseils ?? []).length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--ai-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Conseils d&apos;optimisation</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(report.conseils ?? []).map((c, i) => (
              <div key={i} style={{ padding: '10px 12px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai-text)', margin: '0 0 2px' }}>{c.label}</p>
                <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: '0 0 2px', lineHeight: 1.4 }}>{c.detail}</p>
                <p style={{ fontSize: 10, color: 'var(--ai-dim)', margin: 0, fontStyle: 'italic' }}>{c.data_justification}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--ai-bg2)', fontSize: 10, color: 'var(--ai-dim)' }}>
        <p style={{ margin: '0 0 2px' }}>Sources : {(report.sources_used ?? []).join(' · ')}</p>
        <p style={{ margin: 0 }}>Confiance : <strong style={{ color: confidenceColor }}>{report.confiance}</strong></p>
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
  blessures_zones: string[]
  blessures_date: string
  blessures_detail: string
  gene_recente: boolean
  gene_zones: string[]
  gene_detail: string
  contraintes_permanentes: boolean
  contraintes_zones: string[]
  contraintes_detail: string
  antecedents: boolean
  antecedents_detail: string
  precision_sante: string
  // Bloc 5
  blocs_custom: boolean
  blocs_custom_detail: { nom: string; type: string; duree_semaines: number; discipline?: string }[]
  entree_programme: 'prudent' | 'intense' | ''
  reaction_volume: 'tres_bien' | 'bien' | 'mal' | ''
  reaction_intensite: 'rapide' | '48h' | 'saturation' | ''
  type_seances: 'courtes' | 'longues' | 'mixte' | ''
  connaissance_de_soi: string
  points_forts: string[]
  points_forts_detail: string
  points_faibles: string[]
  points_faibles_detail: string
  difficultes: string[]
  difficultes_detail: string
  efforts_aimes: string[]
  efforts_detestes: string[]
  efforts_detail: string
  niveau_connaissance: 'debutant' | 'bonnes' | 'important' | 'expert' | ''
  precision_methode: string
  journees_type_actif: boolean
  journees_type: Record<string, string>
  // Entraînements spéciaux
  heat_training: boolean
  heat_training_freq: '1' | '2' | ''
  altitude_training: boolean
  altitude_training_weeks: number
  jeune_entraine: boolean
  jeune_entraine_freq: '1' | '2' | ''
  double_entrainement: boolean
  double_entrainement_jours: string[]
  entrainement_nocturne: boolean
  brick_training: boolean
  brick_training_freq: string
  natation_eau_libre: boolean
  // Bloc 6
  sommeil_heures: number
  fatigue_travail: 'physique' | 'mental' | 'les_deux' | 'faible' | ''
  stress_annee: 'aucun' | 'quelques_semaines' | 'recurrent' | ''
  stress_detail: string
  outils_recuperation: string[]
  precision_recup: string
  // Habitudes d'entraînement
  easy_lundi: boolean
  habitude_double_jours: string[]
  repos_fixe_jours: string[]
  seance_longue_jour: 'Samedi' | 'Dimanche' | 'Flexible' | ''
  seance_cle_jour: string
  entrainement_a_jeun: boolean
  entrainement_a_jeun_freq: '1' | '2' | ''
  // Suivi et récupération
  hrv_mesure: boolean
  hrv_outil: string
  suivi_sommeil: boolean
  suivi_sommeil_outil: string
  alcool_regulier: boolean
  cafeine_regulier: boolean
  cafeine_timing: 'matin' | 'journee' | ''
  // Bloc 7
  plan_nutritionnel: 'structure' | 'intuitif' | 'non' | ''
  contraintes_alimentaires: string[]
  complements: string[]
  timing_nutrition: 'toujours' | 'selon_heure' | 'jeun' | ''
  ravitaillement: 'oui' | 'parfois' | 'non' | ''
  objectif_poids: 'perdre' | 'maintenir' | 'prendre' | 'non_concerne' | ''
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
  blessures_zones: [],
  blessures_date: '',
  blessures_detail: '',
  gene_recente: false,
  gene_zones: [],
  gene_detail: '',
  contraintes_permanentes: false,
  contraintes_zones: [],
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
  points_forts: [],
  points_forts_detail: '',
  points_faibles: [],
  points_faibles_detail: '',
  difficultes: [],
  difficultes_detail: '',
  efforts_aimes: [],
  efforts_detestes: [],
  efforts_detail: '',
  niveau_connaissance: '',
  precision_methode: '',
  journees_type_actif: false,
  journees_type: {},
  heat_training: false,
  heat_training_freq: '',
  altitude_training: false,
  altitude_training_weeks: 2,
  jeune_entraine: false,
  jeune_entraine_freq: '',
  double_entrainement: false,
  double_entrainement_jours: [],
  entrainement_nocturne: false,
  brick_training: false,
  brick_training_freq: '',
  natation_eau_libre: false,
  sommeil_heures: 7,
  fatigue_travail: '',
  stress_annee: '',
  stress_detail: '',
  outils_recuperation: [],
  precision_recup: '',
  easy_lundi: false,
  habitude_double_jours: [],
  repos_fixe_jours: [],
  seance_longue_jour: '',
  seance_cle_jour: '',
  entrainement_a_jeun: false,
  entrainement_a_jeun_freq: '',
  hrv_mesure: false,
  hrv_outil: '',
  suivi_sommeil: false,
  suivi_sommeil_outil: '',
  alcool_regulier: false,
  cafeine_regulier: false,
  cafeine_timing: '',
  plan_nutritionnel: '',
  contraintes_alimentaires: [],
  complements: [],
  timing_nutrition: '',
  ravitaillement: '',
  objectif_poids: '',
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
        sb.from('year_data_manual').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
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
        // year_datas : manuel (year_data_manual) OU auto (activities Strava)
        year_datas:  (yearRes.count ?? 0) + (a12.count ?? 0),
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

  // ── Données live depuis planned_sessions ───────────────────────
  interface LiveWeekSummary {
    weekIndex: number
    weekStart: string
    type: string
    theme: string
    volume_h: number
    tss_semaine: number
    seanceCount: number
    sportStats: { sport: string; count: number; durationH: number }[]
  }
  const [liveData,    setLiveData]    = useState<LiveWeekSummary[] | null>(null)
  const [liveLoading, setLiveLoading] = useState(false)
  const [selectedBar, setSelectedBar] = useState<number | null>(null)

  // Charge TOUTES les séances du planning depuis Supabase — indépendant du plan IA généré.
  // Appelé au mount ET après chaque sauvegarde.
  async function refreshLiveData() {
    setLiveLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return

      // 1. Récupère toutes les séances planifiées (fenêtre large : -4 sem à +104 sem)
      const today = new Date()
      const from = new Date(today); from.setDate(from.getDate() - 28)
      const to   = new Date(today); to.setDate(to.getDate() + 104 * 7)
      const fromStr = from.toISOString().slice(0, 10)
      const toStr   = to.toISOString().slice(0, 10)

      const { data: sessions } = await sb
        .from('planned_sessions')
        .select('week_start, sport, duration_min, tss, plan_id')
        .eq('user_id', user.id)
        .gte('week_start', fromStr)
        .lte('week_start', toStr)
        .order('week_start')

      if (!sessions || sessions.length === 0) return

      // 2. Tente de récupérer les métadonnées de semaines (type, thème) depuis le plan IA
      //    en priorité depuis le plan en cours (program), sinon depuis training_plans en DB
      type WeekMeta = { weekStart: string; type: string; theme: string }
      const weekMetaMap = new Map<string, WeekMeta>()

      // Source 1 : plan IA chargé en mémoire (le plus à jour)
      if (program && startDate) {
        program.semaines.forEach((s, idx) => {
          const ws = addWeeks(startDate, idx)
          weekMetaMap.set(ws, { weekStart: ws, type: s.type ?? 'Base', theme: s.theme ?? `Semaine ${s.numero}` })
        })
      } else {
        // Source 2 : training_plans actif en DB
        const planIds = [...new Set((sessions as { plan_id: string | null }[]).map(s => s.plan_id).filter(Boolean))]
        if (planIds.length > 0) {
          const { data: planRows } = await sb
            .from('training_plans')
            .select('start_date, ai_context')
            .in('id', planIds)
            .limit(5)
          for (const plan of planRows ?? []) {
            const planStart = (plan as { start_date: string }).start_date
            const semaines  = ((plan as { ai_context: { program?: { semaines?: { type?: string; theme?: string; numero?: number }[] } } }).ai_context?.program?.semaines) ?? []
            semaines.forEach((s, idx) => {
              const ws = addWeeks(planStart, idx)
              if (!weekMetaMap.has(ws)) {
                weekMetaMap.set(ws, { weekStart: ws, type: s.type ?? 'Base', theme: s.theme ?? `Semaine ${(s.numero ?? idx + 1)}` })
              }
            })
          }
        }
      }

      // 3. Groupe par semaine et calcule les stats
      const weekMap = new Map<string, { sport: string; duration_min: number; tss: number }[]>()
      for (const row of sessions as { week_start: string; sport: string; duration_min: number; tss: number | null; plan_id: string | null }[]) {
        if (!weekMap.has(row.week_start)) weekMap.set(row.week_start, [])
        weekMap.get(row.week_start)!.push({ sport: row.sport || 'autre', duration_min: row.duration_min ?? 0, tss: row.tss ?? 0 })
      }

      const weekStarts = Array.from(weekMap.keys()).sort()
      const summaries: LiveWeekSummary[] = weekStarts.map((ws, idx) => {
        const rows    = weekMap.get(ws)!
        const meta    = weekMetaMap.get(ws)

        const volume_h    = Math.round(rows.reduce((s, x) => s + x.duration_min / 60, 0) * 10) / 10
        const tss_semaine = Math.round(rows.reduce((s, x) => s + x.tss, 0))

        const sMap = new Map<string, { count: number; min: number }>()
        for (const r of rows) {
          if (!sMap.has(r.sport)) sMap.set(r.sport, { count: 0, min: 0 })
          sMap.get(r.sport)!.count++
          sMap.get(r.sport)!.min += r.duration_min
        }
        const sportStats = Array.from(sMap.entries())
          .map(([sport, v]) => ({ sport, count: v.count, durationH: Math.round(v.min / 60 * 10) / 10 }))
          .sort((a, b) => b.durationH - a.durationH)

        return {
          weekIndex:  idx + 1,
          weekStart:  ws,
          type:       meta?.type  ?? 'Base',
          theme:      meta?.theme ?? `Semaine ${idx + 1}`,
          volume_h,
          tss_semaine,
          seanceCount: rows.length,
          sportStats,
        }
      })

      setLiveData(summaries)
    } catch (e) {
      console.error('[refreshLiveData]', e)
    } finally {
      setLiveLoading(false)
    }
  }

  // Charge les données live au mount (affiche immédiatement les vraies données du planning)
  useEffect(() => { void refreshLiveData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

      const rawText = await res.text()
      let data: { program?: GeneratedTrainingPlan; error?: string; debug_stack?: string }
      try {
        data = JSON.parse(rawText)
      } catch {
        console.error('[training-plan] response non-JSON (status', res.status, '):', rawText.slice(0, 300))
        throw new Error(`Erreur serveur ${res.status}: ${rawText.slice(0, 120)}`)
      }
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
        console.error('[training-plan] error:', data.error ?? 'none', '| structureInvalid:', structureInvalid, '| stack:', (data as Record<string,unknown>).debug_stack ?? 'n/a', '| response:', data)
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
      console.error('[training-plan] catch error:', e)
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
          // Skip séances repos — aucune valeur à persister, fausseraient les graphiques
          const titreLC = (seance.titre ?? '').toLowerCase().trim()
          if (/^(repos|rest|rest day|jour (de )?repos|off|jour off)$/i.test(titreLC)) continue
          if ((seance.duree_min ?? 0) === 0 && !titreLC) continue

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
      void refreshLiveData()
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
    // KPIs : live si dispo, sinon plan IA
    const totalSeances = liveData
      ? liveData.reduce((s, w) => s + w.seanceCount, 0)
      : program.semaines.reduce((s, w) => s + (w.seances ?? []).length, 0)
    const totalWeeks = liveData ? liveData.length : program.duree_semaines
    const weeksToShow = showAllWeeks ? program.semaines : program.semaines.slice(0, 2)

    // Sports : live en priorité
    const sportsLabel = liveData && liveData.length > 0
      ? Array.from(new Set(liveData.flatMap(w => w.sportStats.map(s => s.sport)))).join(' · ')
      : (() => {
          const s1 = Array.from(new Set((program.semaines[0]?.seances ?? []).map(s => s.sport)))
          return s1.length > 0 ? s1.join(' · ') : form.sport_principal
        })()

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
              {totalWeeks} semaines{liveData ? ' · live' : ''}
            </span>
            <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 99, background: 'rgba(107,114,128,0.12)', color: 'var(--ai-mid)' }}>
              {totalSeances} séances{liveData ? '' : ' détaillées'}
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
                const total = (liveData ? liveData.length : program.duree_semaines) || 1
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
        {(() => {
          // Source : données live (planned_sessions) si disponibles, sinon plan IA
          const weeks: { label: string; type: string; theme: string; volume_h: number; tss_semaine: number; seanceCount: number; sportStats: { sport: string; count: number; durationH: number }[] }[] =
            liveData
              ? liveData.map(w => ({ label: `S${w.weekIndex}`, type: w.type, theme: w.theme, volume_h: w.volume_h, tss_semaine: w.tss_semaine, seanceCount: w.seanceCount, sportStats: w.sportStats }))
              : program.semaines.map(s => ({ label: `S${s.numero}`, type: s.type, theme: s.theme, volume_h: s.volume_h ?? 0, tss_semaine: s.tss_semaine ?? 0, seanceCount: (s.seances ?? []).length, sportStats: [] }))

          if (weeks.length === 0) return null

          const maxH    = Math.max(...weeks.map(w => w.volume_h), 1)
          const chartH  = 80
          const chartW  = 400
          const barW    = Math.max(2, chartW / weeks.length - 2)
          const stepX   = chartW / weeks.length

          function getBarColor(type: string | null | undefined): string {
            const t = (type ?? '').toLowerCase()
            if (t.includes('deload')) return '#86efac'
            if (t.includes('base')) return '#2563eb'
            if (t.includes('intensit')) return '#f97316'
            if (t.includes('spécif') || t.includes('specif')) return '#ef4444'
            return '#8b5cf6'
          }

          function fmtH(h: number): string {
            const hh = Math.floor(h)
            const mm = Math.round((h - hh) * 60)
            return mm > 0 ? `${hh}h${String(mm).padStart(2, '0')}` : `${hh}h`
          }

          const sel = selectedBar !== null ? weeks[selectedBar] : null

          return (
            <div style={{ marginBottom: 20 }}>
              {/* En-tête */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Volume hebdomadaire
                  <span style={{ fontWeight: 400, color: 'var(--ai-dim)', marginLeft: 6 }}>
                    {weeks.length} sem{liveData ? ' · live' : ''}
                  </span>
                </p>
                <button
                  onClick={() => void refreshLiveData()}
                  disabled={liveLoading}
                  title="Synchroniser avec le planning"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 11, padding: '5px 12px', borderRadius: 8,
                    border: '1.5px solid #8b5cf6',
                    background: liveLoading ? 'transparent' : 'rgba(139,92,246,0.12)',
                    color: liveLoading ? 'var(--ai-dim)' : '#8b5cf6',
                    cursor: liveLoading ? 'default' : 'pointer',
                    fontWeight: 700, transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 14, lineHeight: 1 }}>{liveLoading ? '…' : '↺'}</span>
                  {liveLoading ? 'Chargement…' : 'Actualiser'}
                </button>
              </div>

              {/* SVG barres — cliquables */}
              <svg
                width="100%"
                viewBox={`0 0 ${chartW} ${chartH + 20}`}
                preserveAspectRatio="none"
                style={{ display: 'block', cursor: 'pointer' }}
              >
                {[0, 0.5, 1].map((frac, i) => (
                  <line key={i} x1={0} y1={chartH - frac * chartH} x2={chartW} y2={chartH - frac * chartH}
                    stroke="rgba(107,114,128,0.2)" strokeWidth={1} strokeDasharray="4 3" />
                ))}
                {weeks.map((w, i) => {
                  const h     = Math.max(2, (w.volume_h / maxH) * chartH)
                  const x     = i * stepX + (stepX - barW) / 2
                  const y     = chartH - h
                  const color = getBarColor(w.type)
                  const isSel = selectedBar === i
                  const label = weeks.length <= 16 ? w.label : (i % 2 === 0 ? w.label : '')
                  return (
                    <g key={i} onClick={() => setSelectedBar(isSel ? null : i)} style={{ cursor: 'pointer' }}>
                      <rect x={i * stepX} y={0} width={stepX} height={chartH + 20} fill="transparent" />
                      <rect
                        x={x} y={y} width={barW} height={h}
                        fill={color}
                        opacity={selectedBar === null || isSel ? 0.85 : 0.35}
                        rx={2}
                        stroke={isSel ? '#fff' : 'none'}
                        strokeWidth={isSel ? 1.5 : 0}
                      >
                        <title>{`${w.label} — ${w.theme}\n${w.volume_h}h · TSS ${w.tss_semaine} · ${w.seanceCount} séance${w.seanceCount > 1 ? 's' : ''}`}</title>
                      </rect>
                      {label && (
                        <text x={i * stepX + stepX / 2} y={chartH + 14} textAnchor="middle" fontSize={9}
                          fill={isSel ? '#8b5cf6' : 'var(--ai-dim)'} fontWeight={isSel ? '700' : '400'}>
                          {label}
                        </text>
                      )}
                    </g>
                  )
                })}
              </svg>

              {/* Panel détail semaine sélectionnée */}
              {sel && (
                <div style={{
                  marginTop: 10, padding: '10px 12px', borderRadius: 9,
                  border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)',
                  position: 'relative',
                }}>
                  <button onClick={() => setSelectedBar(null)} style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', color: 'var(--ai-dim)', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ai-text)', fontFamily: 'Syne,sans-serif' }}>
                      {sel.label} — {sel.type}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--ai-dim)' }}>{sel.theme}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                    {[
                      { l: 'Volume', v: fmtH(sel.volume_h) },
                      { l: 'TSS',    v: `${sel.tss_semaine}` },
                      { l: 'Séances',v: `${sel.seanceCount}` },
                    ].map(kpi => (
                      <div key={kpi.l}>
                        <p style={{ fontSize: 9, color: 'var(--ai-dim)', margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{kpi.l}</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ai-text)', margin: 0, fontFamily: 'DM Mono,monospace' }}>{kpi.v}</p>
                      </div>
                    ))}
                  </div>
                  {sel.sportStats.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {sel.sportStats.map((st, si) => (
                        <div key={si} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--ai-mid)', textTransform: 'capitalize' }}>{st.sport}</span>
                          <span style={{ fontSize: 11, color: 'var(--ai-dim)', fontFamily: 'DM Mono,monospace' }}>
                            {st.count}× {fmtH(st.durationH)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {!liveData && (
                    <p style={{ fontSize: 10, color: 'var(--ai-dim)', margin: '8px 0 0', fontStyle: 'italic' }}>
                      Appuie sur ↺ Sync pour voir les données réelles du planning
                    </p>
                  )}
                </div>
              )}
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
              {['Piscine', 'Home trainer', 'Tapis de course', 'Salle de musculation', 'Capteur de puissance vélo', 'Capteur de fréquence cardiaque', 'Montre GPS', 'Ergomètre aviron', 'Piste d\'athlétisme', 'Matériel Hyrox'].map(eq => (
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
      case 4: return (() => {
        const ZONES = ['Genou', 'Cheville', 'Dos', 'Épaule', 'Hanche', 'Tendon', 'Autre'] as const
        type Zone = typeof ZONES[number]
        const toggleZone = (arr: string[], z: Zone) =>
          arr.includes(z) ? arr.filter(x => x !== z) : [...arr, z]

        return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#8b5cf6', margin: '0 0 4px', fontFamily: 'Syne,sans-serif' }}>
            Blessures et contraintes
          </p>

          {/* Blessures passées */}
          <div>
            <span style={tpLabelStyle()}>Blessures passées importantes</span>
            <div style={{ display: 'flex', gap: 6, marginBottom: form.blessures_passees ? 10 : 0 }}>
              <button onClick={() => setField('blessures_passees', true)}  style={tpPillStyle(form.blessures_passees)}>Oui</button>
              <button onClick={() => setField('blessures_passees', false)} style={tpPillStyle(!form.blessures_passees)}>Non</button>
            </div>
            {form.blessures_passees && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {ZONES.map(z => (
                    <button key={z} onClick={() => setField('blessures_zones', toggleZone(form.blessures_zones, z))}
                      style={tpPillStyle(form.blessures_zones.includes(z))}>{z}</button>
                  ))}
                </div>
                <input type="text" placeholder="Mois/année (ex: 03/2023)" value={form.blessures_date}
                  onChange={e => setField('blessures_date', e.target.value)}
                  style={{ ...tpInputStyle(), padding: '6px 10px' }} />
                <textarea placeholder="Description de la blessure..." value={form.blessures_detail}
                  onChange={e => setField('blessures_detail', e.target.value)}
                  rows={2} style={{ ...tpInputStyle(), resize: 'vertical' }} />
              </div>
            )}
          </div>

          {/* Gêne ou douleur récente */}
          <div>
            <span style={tpLabelStyle()}>Gêne ou douleur récente</span>
            <div style={{ display: 'flex', gap: 6, marginBottom: form.gene_recente ? 10 : 0 }}>
              <button onClick={() => setField('gene_recente', true)}  style={tpPillStyle(form.gene_recente)}>Oui</button>
              <button onClick={() => setField('gene_recente', false)} style={tpPillStyle(!form.gene_recente)}>Non</button>
            </div>
            {form.gene_recente && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {ZONES.map(z => (
                    <button key={z} onClick={() => setField('gene_zones', toggleZone(form.gene_zones, z))}
                      style={tpPillStyle(form.gene_zones.includes(z))}>{z}</button>
                  ))}
                </div>
                <textarea placeholder="Décrivez la gêne actuelle..." value={form.gene_detail}
                  onChange={e => setField('gene_detail', e.target.value)}
                  rows={2} style={{ ...tpInputStyle(), resize: 'vertical' }} />
              </div>
            )}
          </div>

          {/* Contraintes permanentes */}
          <div>
            <span style={tpLabelStyle()}>Contraintes permanentes</span>
            <div style={{ display: 'flex', gap: 6, marginBottom: form.contraintes_permanentes ? 10 : 0 }}>
              <button onClick={() => setField('contraintes_permanentes', true)}  style={tpPillStyle(form.contraintes_permanentes)}>Oui</button>
              <button onClick={() => setField('contraintes_permanentes', false)} style={tpPillStyle(!form.contraintes_permanentes)}>Non</button>
            </div>
            {form.contraintes_permanentes && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {ZONES.map(z => (
                    <button key={z} onClick={() => setField('contraintes_zones', toggleZone(form.contraintes_zones, z))}
                      style={tpPillStyle(form.contraintes_zones.includes(z))}>{z}</button>
                  ))}
                </div>
                <textarea placeholder="Contraintes anatomiques ou physiologiques..." value={form.contraintes_detail}
                  onChange={e => setField('contraintes_detail', e.target.value)}
                  rows={2} style={{ ...tpInputStyle(), resize: 'vertical' }} />
              </div>
            )}
          </div>

          {/* Antécédents médicaux — inchangé */}
          <div>
            <span style={tpLabelStyle()}>Antécédents médicaux</span>
            <div style={{ display: 'flex', gap: 6, marginBottom: form.antecedents ? 8 : 0 }}>
              <button onClick={() => setField('antecedents', true)}  style={tpPillStyle(form.antecedents)}>Oui</button>
              <button onClick={() => setField('antecedents', false)} style={tpPillStyle(!form.antecedents)}>Non</button>
            </div>
            {form.antecedents && (
              <textarea value={form.antecedents_detail} onChange={e => setField('antecedents_detail', e.target.value)}
                placeholder="Antécédents cardiaques, pathologies..." rows={2} style={{ ...tpInputStyle(), resize: 'vertical' }} />
            )}
          </div>

          <div>
            <span style={tpLabelStyle()}>Précisions <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ai-dim)' }}>(optionnel)</span></span>
            <textarea value={form.precision_sante} onChange={e => setField('precision_sante', e.target.value)}
              rows={2} style={{ ...tpInputStyle(), resize: 'vertical' }} />
          </div>
        </div>
        )
      })()

      // ── BLOC 5 : Méthodes ────────────────────────────────────
      case 5: return (() => {
        const gtyRace   = form.goal_races.find(r => r.level === 'gty')
        const mainRace  = form.goal_races.find(r => r.level === 'main')
        const raceSport = (gtyRace ?? mainRace)?.sport ?? ''
        const objSport  = (raceSport || form.sport_principal).toLowerCase()
        const isTri        = objSport === 'triathlon'
        const isHyrox      = objSport === 'hyrox'
        const isRunOrTrail = objSport === 'running' || objSport === 'trail'
        const isNatation   = objSport === 'natation'

        const BLOC_TYPES = ['Aérobie', 'VMA/PMA', 'Seuil', 'Spécifique', 'Deload', ...(isRunOrTrail ? ['Hills'] : [])]
        const TRI_DISCS   = ['Natation', 'Vélo', 'Run', 'Muscu']
        const HYROX_DISCS = ['Run', 'Muscu', 'Spé Hyrox', 'Vélo']

        // Helper compact inline pour les toggles spéciaux
        const SpToggle = ({ label, on, onToggle }: { label: string; on: boolean; onToggle: (v: boolean) => void }) => (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--text)' }}>{label}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => onToggle(true)}  style={tpPillStyle(on)}>Oui</button>
              <button onClick={() => onToggle(false)} style={tpPillStyle(!on)}>Non</button>
            </div>
          </div>
        )

        return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#8b5cf6', margin: '0 0 4px', fontFamily: 'Syne,sans-serif' }}>
            Méthodes et périodisation
          </p>

          {/* ── Blocs custom ───────────────────────────────────── */}
          <div>
            <span style={tpLabelStyle()}>Blocs custom</span>
            <div style={{ display: 'flex', gap: 6, marginBottom: form.blocs_custom ? 10 : 0 }}>
              <button onClick={() => setField('blocs_custom', false)} style={tpPillStyle(!form.blocs_custom)}>Laisser l&apos;IA décider</button>
              <button onClick={() => setField('blocs_custom', true)}  style={tpPillStyle(form.blocs_custom)}>Définir mes blocs</button>
            </div>
            {form.blocs_custom && (
              <div>
                {form.blocs_custom_detail.map((b, i) => (
                  <div key={i} style={{ border: '1px solid var(--ai-border)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                    {/* Nom + supprimer */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                      <input type="text" placeholder="Nom du bloc" value={b.nom} onChange={e => {
                        const next = [...form.blocs_custom_detail]; next[i] = { ...next[i], nom: e.target.value }; setField('blocs_custom_detail', next)
                      }} style={{ ...tpInputStyle(), flex: 1 }} />
                      <button onClick={() => setField('blocs_custom_detail', form.blocs_custom_detail.filter((_, j) => j !== i))}
                        style={{ fontSize: 14, color: 'var(--ai-dim)', background: 'transparent', border: 'none', cursor: 'pointer' }}>×</button>
                    </div>
                    {/* Discipline — Tri ou Hyrox seulement */}
                    {(isTri || isHyrox) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                        {(isTri ? TRI_DISCS : HYROX_DISCS).map(d => (
                          <button key={d} onClick={() => {
                            const next = [...form.blocs_custom_detail]; next[i] = { ...next[i], discipline: d }; setField('blocs_custom_detail', next)
                          }} style={tpPillStyle(b.discipline === d)}>{d}</button>
                        ))}
                      </div>
                    )}
                    {/* Type */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                      {BLOC_TYPES.map(t => (
                        <button key={t} onClick={() => {
                          const next = [...form.blocs_custom_detail]; next[i] = { ...next[i], type: t }; setField('blocs_custom_detail', next)
                        }} style={tpPillStyle(b.type === t)}>{t}</button>
                      ))}
                    </div>
                    {/* Durée */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--ai-dim)', whiteSpace: 'nowrap' }}>Durée : {b.duree_semaines} sem.</span>
                      <input type="range" min={1} max={12} value={b.duree_semaines} onChange={e => {
                        const next = [...form.blocs_custom_detail]; next[i] = { ...next[i], duree_semaines: Number(e.target.value) }; setField('blocs_custom_detail', next)
                      }} style={{ flex: 1, accentColor: '#8b5cf6' }} />
                    </div>
                  </div>
                ))}
                <button onClick={() => setField('blocs_custom_detail', [...form.blocs_custom_detail, { nom: '', type: 'Aérobie', duree_semaines: 4 }])}
                  style={{ fontSize: 12, color: '#8b5cf6', background: 'transparent', border: '1px dashed rgba(139,92,246,0.4)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', width: '100%' }}>
                  + Ajouter un bloc
                </button>
              </div>
            )}
          </div>

          {/* ── Entraînements spéciaux ─────────────────────────── */}
          <div>
            <span style={tpLabelStyle()}>Entraînements spéciaux</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--bg-card2)', borderRadius: 8, padding: '10px 12px' }}>

              {/* Heat training */}
              <div>
                <SpToggle label="Heat training" on={form.heat_training} onToggle={v => setField('heat_training', v)} />
                {form.heat_training && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                    <button onClick={() => setField('heat_training_freq', '1')} style={tpPillStyle(form.heat_training_freq === '1')}>1 fois/semaine</button>
                    <button onClick={() => setField('heat_training_freq', '2')} style={tpPillStyle(form.heat_training_freq === '2')}>2 fois/semaine</button>
                  </div>
                )}
              </div>

              {/* Altitude training */}
              <div>
                <SpToggle label="Altitude training" on={form.altitude_training} onToggle={v => setField('altitude_training', v)} />
                {form.altitude_training && (
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--ai-dim)', display: 'block', marginBottom: 2 }}>
                      Durée : {form.altitude_training_weeks} semaine{form.altitude_training_weeks > 1 ? 's' : ''}
                    </span>
                    <input type="range" min={1} max={8} value={form.altitude_training_weeks}
                      onChange={e => setField('altitude_training_weeks', Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#8b5cf6' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ai-dim)' }}>
                      <span>1 sem.</span><span>8 sem.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Jeûne entraîné */}
              <div>
                <SpToggle label="Jeûne entraîné" on={form.jeune_entraine} onToggle={v => setField('jeune_entraine', v)} />
                {form.jeune_entraine && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                    <button onClick={() => setField('jeune_entraine_freq', '1')} style={tpPillStyle(form.jeune_entraine_freq === '1')}>1 fois/semaine</button>
                    <button onClick={() => setField('jeune_entraine_freq', '2')} style={tpPillStyle(form.jeune_entraine_freq === '2')}>2 fois/semaine</button>
                  </div>
                )}
              </div>

              {/* Double entraînement */}
              <div>
                <SpToggle label="Double entraînement" on={form.double_entrainement} onToggle={v => setField('double_entrainement', v)} />
                {form.double_entrainement && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(j => (
                      <button key={j} onClick={() => setField('double_entrainement_jours', toggleArr(form.double_entrainement_jours, j))}
                        style={tpPillStyle(form.double_entrainement_jours.includes(j))}>{j}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Entraînement nocturne */}
              <SpToggle label="Entraînement nocturne" on={form.entrainement_nocturne} onToggle={v => setField('entrainement_nocturne', v)} />

              {/* Brick training — Triathlon uniquement */}
              {isTri && (
                <div>
                  <SpToggle label="Brick training" on={form.brick_training} onToggle={v => setField('brick_training', v)} />
                  {form.brick_training && (
                    <input type="text" placeholder="Fréquence (ex : 1 fois/semaine)" value={form.brick_training_freq}
                      onChange={e => setField('brick_training_freq', e.target.value)}
                      style={{ ...tpInputStyle(), padding: '5px 8px', fontSize: 11, marginTop: 6 }} />
                  )}
                </div>
              )}

              {/* Natation en eau libre — Triathlon ou Natation */}
              {(isTri || isNatation) && (
                <SpToggle label="Natation en eau libre" on={form.natation_eau_libre} onToggle={v => setField('natation_eau_libre', v)} />
              )}
            </div>
          </div>

          {/* ── Reste du bloc 5 ────────────────────────────────── */}
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
              <button onClick={() => setField('reaction_volume', 'bien')}      style={tpPillStyle(form.reaction_volume === 'bien')}>Bien — récupération normale</button>
              <button onClick={() => setField('reaction_volume', 'mal')}       style={tpPillStyle(form.reaction_volume === 'mal')}>Mal — je sature vite</button>
            </div>
          </div>

          <div>
            <span style={tpLabelStyle()}>Réaction à l&apos;intensité</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button onClick={() => setField('reaction_intensite', 'rapide')}     style={tpPillStyle(form.reaction_intensite === 'rapide')}>Progressions rapides</button>
              <button onClick={() => setField('reaction_intensite', '48h')}        style={tpPillStyle(form.reaction_intensite === '48h')}>48h pour récupérer</button>
              <button onClick={() => setField('reaction_intensite', 'saturation')} style={tpPillStyle(form.reaction_intensite === 'saturation')}>Saturation rapide</button>
            </div>
          </div>

          {/* ── Connaissance de soi ────────────────────────────── */}
          {(() => {
            const ATOUTS   = ['Endurance', 'Puissance', 'Vitesse', 'Récupération rapide', 'Mental', 'Régularité', 'Technique']
            const DIFFICUL = ['Je sature vite en volume', 'Je récupère mal de l\'intensité', 'Je me blesse souvent', 'Je manque de régularité', 'Je m\'ennuie vite', 'Je gère mal la fatigue mentale', 'Je sous-performe en compétition']
            const EFFORTS  = ['Longues sorties', 'Intervalles courts', 'Tempo', 'Côtes', 'Natation technique', 'Musculation', 'Séances en groupe']
            const subLabel = (t: string) => (
              <span style={{ fontSize: 11, fontWeight: 600, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>{t}</span>
            )
            return (
              <>
                {/* 1 — Points forts / Points faibles */}
                <div>
                  <span style={tpLabelStyle()}>Points forts / Points faibles</span>
                  <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      {subLabel('Points forts')}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                        {ATOUTS.map(a => (
                          <button key={a} onClick={() => setField('points_forts', toggleArr(form.points_forts, a))}
                            style={tpPillStyle(form.points_forts.includes(a))}>{a}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      {subLabel('Points faibles')}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                        {ATOUTS.map(a => (
                          <button key={a} onClick={() => setField('points_faibles', toggleArr(form.points_faibles, a))}
                            style={tpPillStyle(form.points_faibles.includes(a))}>{a}</button>
                        ))}
                      </div>
                    </div>
                    <input type="text" placeholder="Précisions (optionnel)…" value={form.points_forts_detail}
                      onChange={e => setField('points_forts_detail', e.target.value)}
                      style={{ ...tpInputStyle(), padding: '5px 8px', fontSize: 11 }} />
                  </div>
                </div>

                {/* 2 — Difficultés habituelles */}
                <div>
                  <span style={tpLabelStyle()}>Difficultés habituelles</span>
                  <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {DIFFICUL.map(d => (
                        <button key={d} onClick={() => setField('difficultes', toggleArr(form.difficultes, d))}
                          style={tpPillStyle(form.difficultes.includes(d))}>{d}</button>
                      ))}
                    </div>
                    <input type="text" placeholder="Précisions (optionnel)…" value={form.difficultes_detail}
                      onChange={e => setField('difficultes_detail', e.target.value)}
                      style={{ ...tpInputStyle(), padding: '5px 8px', fontSize: 11 }} />
                  </div>
                </div>

                {/* 3 — Types d'efforts */}
                <div>
                  <span style={tpLabelStyle()}>Types d&apos;efforts</span>
                  <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      {subLabel('J\'aime')}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                        {EFFORTS.map(e => (
                          <button key={e} onClick={() => setField('efforts_aimes', toggleArr(form.efforts_aimes, e))}
                            style={tpPillStyle(form.efforts_aimes.includes(e))}>{e}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      {subLabel('Je déteste')}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                        {EFFORTS.map(e => (
                          <button key={e} onClick={() => setField('efforts_detestes', toggleArr(form.efforts_detestes, e))}
                            style={tpPillStyle(form.efforts_detestes.includes(e))}>{e}</button>
                        ))}
                      </div>
                    </div>
                    <input type="text" placeholder="Précisions (optionnel)…" value={form.efforts_detail}
                      onChange={e => setField('efforts_detail', e.target.value)}
                      style={{ ...tpInputStyle(), padding: '5px 8px', fontSize: 11 }} />
                  </div>
                </div>

                {/* 4 — Niveau de connaissance */}
                <div>
                  <span style={tpLabelStyle()}>Niveau de connaissance en entraînement</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {([
                      ['debutant',  'Aucune ou peu (débutant)'],
                      ['bonnes',    'Bonnes connaissances'],
                      ['important', 'Connaissances importantes (sportif aguerri)'],
                      ['expert',    'Expert'],
                    ] as const).map(([val, label]) => (
                      <button key={val} onClick={() => setField('niveau_connaissance', val)}
                        style={tpPillStyle(form.niveau_connaissance === val)}>{label}</button>
                    ))}
                  </div>
                </div>
              </>
            )
          })()}

          {/* ── Type de journée ────────────────────────────────── */}
          <div>
            <span style={tpLabelStyle()}>Définir le type de journée</span>
            <div style={{ display: 'flex', gap: 6, marginBottom: form.journees_type_actif ? 10 : 0 }}>
              <button onClick={() => setField('journees_type_actif', true)}  style={tpPillStyle(form.journees_type_actif)}>Oui</button>
              <button onClick={() => setField('journees_type_actif', false)} style={tpPillStyle(!form.journees_type_actif)}>Non</button>
            </div>
            {form.journees_type_actif && (() => {
              const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
              const TYPES = [
                { val: 'recup',        label: 'Récup',        color: '#22c55e' },
                { val: 'recup_active', label: 'Récup active', color: '#84cc16' },
                { val: 'low',          label: 'Low',          color: '#38bdf8' },
                { val: 'mid',          label: 'Mid',          color: '#f59e0b' },
                { val: 'hard',         label: 'Hard',         color: '#ef4444' },
              ]
              const hardCount = JOURS.filter(j => form.journees_type[j] === 'hard').length
              return (
                <div>
                  <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 10px' }}>
                    Recommandation : 2 à 3 séances Hard maximum par semaine.
                    {hardCount > 3 && <span style={{ color: '#ef4444', fontWeight: 600 }}> Actuellement {hardCount} Hard — dépasse le seuil.</span>}
                  </p>
                  {JOURS.map(jour => (
                    <div key={jour} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--ai-dim)', width: 80, flexShrink: 0 }}>{jour}</span>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {TYPES.map(t => {
                          const sel = form.journees_type[jour] === t.val
                          return (
                            <button key={t.val}
                              onClick={() => setField('journees_type', { ...form.journees_type, [jour]: sel ? '' : t.val })}
                              style={{
                                padding: '3px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                                border: `1px solid ${t.color}`,
                                background: sel ? t.color : 'transparent',
                                color: sel ? '#fff' : t.color,
                              }}>
                              {t.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>

          <div>
            <span style={tpLabelStyle()}>Précisions <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ai-dim)' }}>(optionnel)</span></span>
            <textarea value={form.precision_methode} onChange={e => setField('precision_methode', e.target.value)}
              rows={2} style={{ ...tpInputStyle(), resize: 'vertical' }} />
          </div>
        </div>
        )
      })()

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

          {/* ── Habitudes d'entraînement ─────────────────────── */}
          <div>
            <span style={tpLabelStyle()}>Habitudes d&apos;entraînement</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--bg-card2)', borderRadius: 8, padding: '10px 12px' }}>

              {/* Easy lundi */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--text)' }}>Easy lundi</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => setField('easy_lundi', true)}  style={tpPillStyle(form.easy_lundi)}>Oui</button>
                  <button onClick={() => setField('easy_lundi', false)} style={tpPillStyle(!form.easy_lundi)}>Non</button>
                </div>
              </div>

              {/* Double entraînement */}
              <div>
                <span style={{ fontSize: 12, color: 'var(--text)', display: 'block', marginBottom: 6 }}>Double entraînement — jours</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(j => (
                    <button key={j} onClick={() => setField('habitude_double_jours', toggleArr(form.habitude_double_jours, j))}
                      style={tpPillStyle(form.habitude_double_jours.includes(j))}>{j}</button>
                  ))}
                </div>
              </div>

              {/* Repos fixe */}
              <div>
                <span style={{ fontSize: 12, color: 'var(--text)', display: 'block', marginBottom: 6 }}>Repos fixe — jours</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(j => (
                    <button key={j} onClick={() => setField('repos_fixe_jours', toggleArr(form.repos_fixe_jours, j))}
                      style={tpPillStyle(form.repos_fixe_jours.includes(j))}>{j}</button>
                  ))}
                </div>
              </div>

              {/* Séance longue */}
              <div>
                <span style={{ fontSize: 12, color: 'var(--text)', display: 'block', marginBottom: 6 }}>Séance longue — jour préféré</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['Samedi', 'Dimanche', 'Flexible'] as const).map(j => (
                    <button key={j} onClick={() => setField('seance_longue_jour', j)} style={tpPillStyle(form.seance_longue_jour === j)}>{j}</button>
                  ))}
                </div>
              </div>

              {/* Séance clé */}
              <div>
                <span style={{ fontSize: 12, color: 'var(--text)', display: 'block', marginBottom: 6 }}>Séance clé (intensité) — jour préféré</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(j => (
                    <button key={j} onClick={() => setField('seance_cle_jour', form.seance_cle_jour === j ? '' : j)}
                      style={tpPillStyle(form.seance_cle_jour === j)}>{j}</button>
                  ))}
                </div>
              </div>

              {/* Entraînement à jeun */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: form.entrainement_a_jeun ? 6 : 0 }}>
                  <span style={{ fontSize: 12, color: 'var(--text)' }}>Entraînement à jeun</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => setField('entrainement_a_jeun', true)}  style={tpPillStyle(form.entrainement_a_jeun)}>Oui</button>
                    <button onClick={() => setField('entrainement_a_jeun', false)} style={tpPillStyle(!form.entrainement_a_jeun)}>Non</button>
                  </div>
                </div>
                {form.entrainement_a_jeun && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => setField('entrainement_a_jeun_freq', '1')} style={tpPillStyle(form.entrainement_a_jeun_freq === '1')}>1 fois/semaine</button>
                    <button onClick={() => setField('entrainement_a_jeun_freq', '2')} style={tpPillStyle(form.entrainement_a_jeun_freq === '2')}>2 fois/semaine</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Suivi et récupération ─────────────────────────── */}
          <div>
            <span style={tpLabelStyle()}>Suivi et récupération</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--bg-card2)', borderRadius: 8, padding: '10px 12px' }}>

              {/* HRV */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: form.hrv_mesure ? 6 : 0 }}>
                  <span style={{ fontSize: 12, color: 'var(--text)' }}>HRV mesuré</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => setField('hrv_mesure', true)}  style={tpPillStyle(form.hrv_mesure)}>Oui</button>
                    <button onClick={() => setField('hrv_mesure', false)} style={tpPillStyle(!form.hrv_mesure)}>Non</button>
                  </div>
                </div>
                {form.hrv_mesure && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {['Whoop', 'Garmin', 'Oura', 'Autre'].map(o => (
                      <button key={o} onClick={() => setField('hrv_outil', form.hrv_outil === o ? '' : o)} style={tpPillStyle(form.hrv_outil === o)}>{o}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Suivi du sommeil */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: form.suivi_sommeil ? 6 : 0 }}>
                  <span style={{ fontSize: 12, color: 'var(--text)' }}>Suivi du sommeil</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => setField('suivi_sommeil', true)}  style={tpPillStyle(form.suivi_sommeil)}>Oui</button>
                    <button onClick={() => setField('suivi_sommeil', false)} style={tpPillStyle(!form.suivi_sommeil)}>Non</button>
                  </div>
                </div>
                {form.suivi_sommeil && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {['Whoop', 'Garmin', 'Oura', 'Autre'].map(o => (
                      <button key={o} onClick={() => setField('suivi_sommeil_outil', form.suivi_sommeil_outil === o ? '' : o)} style={tpPillStyle(form.suivi_sommeil_outil === o)}>{o}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Alcool */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--text)' }}>Consommation d&apos;alcool régulière</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => setField('alcool_regulier', true)}  style={tpPillStyle(form.alcool_regulier)}>Oui</button>
                  <button onClick={() => setField('alcool_regulier', false)} style={tpPillStyle(!form.alcool_regulier)}>Non</button>
                </div>
              </div>

              {/* Caféine */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: form.cafeine_regulier ? 6 : 0 }}>
                  <span style={{ fontSize: 12, color: 'var(--text)' }}>Consommateur régulier de caféine</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => setField('cafeine_regulier', true)}  style={tpPillStyle(form.cafeine_regulier)}>Oui</button>
                    <button onClick={() => setField('cafeine_regulier', false)} style={tpPillStyle(!form.cafeine_regulier)}>Non</button>
                  </div>
                </div>
                {form.cafeine_regulier && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => setField('cafeine_timing', 'matin')}   style={tpPillStyle(form.cafeine_timing === 'matin')}>Matin uniquement</button>
                    <button onClick={() => setField('cafeine_timing', 'journee')} style={tpPillStyle(form.cafeine_timing === 'journee')}>Toute la journée</button>
                  </div>
                )}
              </div>
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
            <span style={tpLabelStyle()}>Mange-tu avant l&apos;entraînement ?</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {([['toujours', 'Oui toujours'], ['selon_heure', 'Selon l\'heure'], ['jeun', 'Non — à jeun']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setField('timing_nutrition', val)} style={tpPillStyle(form.timing_nutrition === val)}>{label}</button>
              ))}
            </div>
          </div>

          <div>
            <span style={tpLabelStyle()}>Tu t&apos;entraînes à te ravitailler pendant les sorties longues ?</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {([['oui', 'Oui régulièrement'], ['parfois', 'Parfois'], ['non', 'Non']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setField('ravitaillement', val)} style={tpPillStyle(form.ravitaillement === val)}>{label}</button>
              ))}
            </div>
          </div>

          <div>
            <span style={tpLabelStyle()}>Objectif corporel</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {([['perdre', 'Perdre du poids'], ['maintenir', 'Maintenir'], ['prendre', 'Prendre du poids'], ['non_concerne', 'Non concerné']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setField('objectif_poids', val)} style={tpPillStyle(form.objectif_poids === val)}>{label}</button>
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

// ── SBSessionCard — rendu historique d'une séance SessionBuilder ──
// Version lecture seule du result view du SessionBuilderFlow.
// Utilisée pour réafficher une séance dans l'historique de chat.
function SBSessionCard({ session }: { session: SBSession }) {
  const sportObj = SB_SPORTS.find(s => s.id === session.sport)
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
              {(session.tags ?? []).slice(0, 3).map(tag => (
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
            <div key={label} style={{ textAlign: 'center' as const, padding: '8px 6px', borderRadius: 9, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)' }}>
              <div style={{ fontSize: 9, color: 'var(--ai-dim)', fontFamily: 'DM Sans,sans-serif', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ai-text)', fontFamily: 'DM Mono,monospace' }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Profil d'intensité */}
        <SBIntensityChart blocs={session.blocs} sport={session.sport} />

        {/* Description */}
        <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 10px', fontFamily: 'DM Sans,sans-serif', lineHeight: 1.5, fontStyle: 'italic' as const }}>
          {session.description}
        </p>
      </div>

      {/* Blocs */}
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--ai-dim)', margin: '0 0 8px', fontFamily: 'DM Sans,sans-serif' }}>
        Structure — {session.blocs.length} blocs
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {session.blocs.map((bloc, i) => (
          <div key={i} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ai-text)', fontFamily: 'DM Sans,sans-serif' }}>{bloc.nom}</span>
              <span style={{ fontSize: 10, color: 'var(--ai-mid)', fontFamily: 'DM Mono,monospace' }}>
                {bloc.repetitions > 1 ? `${bloc.repetitions}×` : ''}{bloc.duree_effort}min
                {bloc.recup > 0 ? ` / ${bloc.recup}min récup` : ''}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginBottom: 4 }}>
              {(bloc.zone_effort ?? []).map(z => (
                <span key={z} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 6, background: 'rgba(91,111,255,0.15)', color: '#5b6fff', fontWeight: 700, fontFamily: 'DM Mono,monospace' }}>{z}</span>
              ))}
              {bloc.watts != null && (
                <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 6, background: 'rgba(249,115,22,0.15)', color: '#f97316', fontFamily: 'DM Mono,monospace' }}>{bloc.watts}W</span>
              )}
              {bloc.allure_cible && (
                <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 6, background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontFamily: 'DM Mono,monospace' }}>{bloc.allure_cible}</span>
              )}
              {bloc.fc_cible != null && (
                <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 6, background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontFamily: 'DM Mono,monospace' }}>{bloc.fc_cible}bpm</span>
              )}
            </div>
            <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: 0, fontFamily: 'DM Sans,sans-serif', lineHeight: 1.4 }}>{bloc.consigne}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function SessionBuilderFlow({ onCancel, onRecordConv }: {
  onCancel: () => void
  onRecordConv?: (userMsg: string, aiMsg: string, sessionData?: SBSession) => void
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
        onRecordConv(userMsg, aiMsg, generated)
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
  enrichedId?: string
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
      { label: 'Analyser un entraînement', flow: 'analyze_training' as FlowId },
      { label: 'Analyser ma semaine', enrichedId: 'analyser_semaine' },
    ],
  },
  {
    label: 'Compétition / Courses',
    items: [
      { label: 'Stratégie de course', flow: 'strategie_course' as FlowId },
    ],
  },
  {
    label: 'Nutrition',
    items: [
      { label: 'Créer un plan nutritionnel', flow: 'nutrition' },
      { label: 'Recharge glucidique', flow: 'recharge' },
    ],
  },
  {
    label: 'Récupération',
    items: [
      { label: 'Analyser ma récupération', enrichedId: 'analyser_recuperation' },
      { label: 'Conseils sommeil', enrichedId: 'conseils_sommeil' },
    ],
  },
  {
    label: 'Performance',
    items: [
      { label: 'Analyser ma progression', flow: 'analyser_progression' as FlowId },
      { label: 'Analyser un test', flow: 'analyzetest' },
      { label: 'Estimer mes zones', flow: 'estimer_zones' as FlowId },
    ],
  },
  {
    label: 'Application',
    items: [
      { label: 'Comprendre l\'application', flow: 'app_guide' as FlowId },
    ],
  },
]

// ── FontPicker — sélecteur de police inline dans la barre de saisie ──────────

const FONT_PICKER_OPTIONS = [
  { id: 'dm_sans', label: 'DM Sans',  family: 'DM Sans, sans-serif' },
  { id: 'inter',   label: 'Inter',    family: 'Inter, sans-serif' },
  { id: 'system',  label: 'Système',  family: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' },
  { id: 'serif',   label: 'Serif',    family: 'Georgia, Times New Roman, serif' },
  { id: 'mono',    label: 'Mono',     family: 'DM Mono, monospace' },
]

function FontPicker({ current, onChange }: { current: string; onChange: (family: string) => void }) {
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

  const currentFont = FONT_PICKER_OPTIONS.find(f => f.family === current) ?? FONT_PICKER_OPTIONS[0]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(p => !p)}
        title="Police du chat"
        style={{
          height: 24, padding: '0 8px', borderRadius: 6, flexShrink: 0,
          border: `1px solid ${open ? 'var(--ai-mid)' : 'var(--ai-border)'}`,
          background: open ? 'var(--ai-bg)' : 'transparent',
          cursor: 'pointer', color: 'var(--ai-dim)',
          display: 'flex', alignItems: 'center', gap: 4,
          transition: 'all 0.12s',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>
        </svg>
        <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.02em', fontFamily: 'DM Sans, sans-serif' }}>
          {currentFont.label}
        </span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0,
          marginBottom: 6, padding: 4,
          background: 'var(--ai-bg)', border: '1px solid var(--ai-border)',
          borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
          zIndex: 40, minWidth: 130,
        }}>
          {FONT_PICKER_OPTIONS.map(f => {
            const active = f.family === current
            return (
              <button
                key={f.id}
                onClick={() => {
                  onChange(f.family)
                  localStorage.setItem('thw_ai_chat_font', f.id)
                  window.dispatchEvent(new Event('thw:chat-font-changed'))
                  setOpen(false)
                }}
                style={{
                  display: 'block', width: '100%', padding: '6px 10px',
                  border: 'none', borderRadius: 7,
                  background: active ? 'var(--ai-accent-dim)' : 'transparent',
                  color: active ? 'var(--ai-accent)' : 'var(--ai-text)',
                  fontSize: 12, fontWeight: active ? 600 : 400,
                  fontFamily: f.family,
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.1s',
                }}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PlusMenu({
  onPrepare,
  onEnriched,
  onFlow,
  onClose,
  onCamera,
  onPhotos,
  onFiles,
}: {
  onPrepare:  (label: string, apiPrompt: string) => void
  onEnriched: (id: string, label: string) => void
  onFlow:     (f: FlowId) => void
  onClose:    () => void
  onCamera:   () => void
  onPhotos:   () => void
  onFiles:    () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
  }, [])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  // Cartes d'attachement — adaptées au thème
  const ATTACH_CARDS: { label: string; icon: React.ReactNode; onClick: () => void }[] = [
    {
      label: 'Caméra',
      onClick: () => { onClose(); setTimeout(onCamera, 80) },
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      ),
    },
    {
      label: 'Photos',
      onClick: () => { onClose(); setTimeout(onPhotos, 80) },
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
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
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <path d="M14 2v6h6M12 12v6M9 15h6"/>
        </svg>
      ),
    },
  ]

  const visibleCards = ATTACH_CARDS.filter(card => isMobile || card.label !== 'Caméra')

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

      {/* ── Grille Joindre ── */}
      <div style={{ padding: '0 14px 16px' }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 4px 10px' }}>
          Joindre
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: visibleCards.length === 2 ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: 10 }}>
          {visibleCards.map(card => (
            <button
              key={card.label}
              onClick={card.onClick}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 10, padding: '18px 8px',
                borderRadius: 16,
                background: 'var(--ai-bg2)',
                border: '1px solid var(--ai-border)',
                cursor: 'pointer',
                color: 'var(--ai-text)',
                backdropFilter: 'blur(8px)',
                transition: 'transform 0.1s, opacity 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.8' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
              onMouseDown={e  => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.94)' }}
              onMouseUp={e    => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
            >
              {card.icon}
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ai-text)', letterSpacing: '0.01em' }}>
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
                else if (item.enrichedId) onEnriched(item.enrichedId, item.label)
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
  enrichedId?: string
  flow?: FlowId
  model: THWModel   // modèle recommandé pour cette action
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Créer un plan d\'entraînement',
    sub: 'Plan structuré adapté à tes objectifs',
    model: 'zeus',
    flow: 'training_plan' as FlowId,
  },
  {
    label: 'Identifier mes points faibles',
    sub: 'Analyse croisée de tes données et lacunes',
    model: 'athena',
    flow: 'weakpoints',
  },
  {
    label: 'Créer un plan nutritionnel',
    sub: 'Plan personnalisé selon ton profil et tes sports',
    model: 'athena',
    flow: 'nutrition',
  },
  {
    label: 'Comprendre l\'application',
    sub: 'Fonctionnalités, navigation et configuration',
    model: 'hermes',
    flow: 'app_guide' as FlowId,
  },
  {
    label: 'Analyser un entraînement',
    sub: 'Analyse détaillée ou comparaison de 2 activités',
    model: 'athena',
    flow: 'analyze_training' as FlowId,
  },
  {
    label: 'Stratégie de course',
    sub: 'Plan de course personnalisé allures, nutrition, Plan B',
    flow: 'strategie_course' as FlowId,
    model: 'athena',
  },
]

// ══════════════════════════════════════════════════════════════
// ENRICHED ACTIONS — fonctions async hors composant
// Chaque fonction charge les données Supabase et appelle send()
// ══════════════════════════════════════════════════════════════

type SupabaseClient = Awaited<ReturnType<typeof import('@/lib/supabase/client')['createClient']>>
type SendFn = (displayText: string, apiPrompt: string) => void

async function enrichedAnalyserSemaine(
  sb: SupabaseClient,
  userId: string,
  rulesBlock: string,
  label: string,
  sendFn: SendFn
): Promise<void> {
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  const since4weeks = new Date(weekStart)
  since4weeks.setDate(since4weeks.getDate() - 28)

  const [activitiesRes, plannedRes, metricsRes, past4wActivitiesRes, past4wPlannedRes, upcomingRacesRes] = await Promise.all([
    sb.from('activities').select('id,sport_type,started_at,distance_m,moving_time_s,avg_hr,avg_watts,avg_pace_s_km,tss,intensity_factor').eq('user_id', userId).gte('started_at', weekStart.toISOString()).lte('started_at', weekEnd.toISOString()).order('started_at', { ascending: true }),
    sb.from('planned_sessions').select('id,sport,title,duration_min,tss,intensite,heure,type_seance,status,day_index').eq('user_id', userId).gte('week_start', weekStart.toISOString().split('T')[0]).lte('week_start', weekEnd.toISOString().split('T')[0]),
    Promise.resolve(sb.from('metrics_daily').select('*').eq('user_id', userId).gte('date', weekStart.toISOString().split('T')[0]).lte('date', weekEnd.toISOString().split('T')[0]).order('date', { ascending: true })).catch(() => ({ data: [] })),
    sb.from('activities').select('sport_type,started_at,moving_time_s,tss,intensity_factor,avg_hr,avg_watts,avg_pace_s_km').eq('user_id', userId).gte('started_at', since4weeks.toISOString()).lt('started_at', weekStart.toISOString()).order('started_at', { ascending: true }),
    sb.from('planned_sessions').select('sport,duration_min,intensite,type_seance,status,day_index,week_start').eq('user_id', userId).gte('week_start', since4weeks.toISOString().split('T')[0]).lt('week_start', weekStart.toISOString().split('T')[0]).order('week_start', { ascending: true }),
    sb.from('planned_races').select('name,sport,date,level,goal_time').eq('user_id', userId).gte('date', weekStart.toISOString().split('T')[0]).order('date', { ascending: true }).limit(3),
  ])

  const activities = activitiesRes.data ?? []
  const planned = plannedRes.data ?? []
  const metrics = metricsRes.data ?? []
  const past4wActivities = past4wActivitiesRes.data ?? []
  const past4wPlanned = past4wPlannedRes.data ?? []
  const upcomingRaces = upcomingRacesRes.data ?? []

  // Compliance matrix
  type ComplianceRow = { dayIndex: number; sport: string; plannedDuration: number; plannedIntensity: string; realizedDuration: number | null; realizedTss: number | null; status: 'ok' | 'partial' | 'missed' }
  const complianceMatrix: ComplianceRow[] = planned.map(session => {
    const sessionDate = new Date(weekStart)
    const dayIdx = session.day_index ?? 0
    sessionDate.setDate(weekStart.getDate() + dayIdx)
    const match = activities.find(a => {
      const aDate = new Date(a.started_at)
      return a.sport_type === session.sport && Math.abs(aDate.getTime() - sessionDate.getTime()) < 86400000 * 1.5
    })
    return {
      dayIndex: dayIdx,
      sport: session.sport ?? '',
      plannedDuration: session.duration_min ?? 0,
      plannedIntensity: session.intensite ?? '',
      realizedDuration: match ? Math.round((match.moving_time_s ?? 0) / 60) : null,
      realizedTss: match ? (match.tss ?? null) : null,
      status: match ? ((match.tss ?? 0) >= (session.tss ?? 0) * 0.8 ? 'ok' : 'partial') : 'missed',
    }
  })
  const complianceScore = planned.length > 0 ? Math.round((complianceMatrix.filter(r => r.status === 'ok').length / planned.length) * 100) : null

  // Type drift detection (4 past weeks)
  type TypeDriftEntry = { plannedIntensity: string; realizedTss: number; realizedDuration: number }
  const typeDriftData: TypeDriftEntry[] = []
  past4wPlanned.forEach(ps => {
    const psDate = new Date(ps.week_start)
    psDate.setDate(psDate.getDate() + (ps.day_index ?? 0))
    const match = past4wActivities.find(a => {
      const aDate = new Date(a.started_at)
      return a.sport_type === ps.sport && Math.abs(aDate.getTime() - psDate.getTime()) < 86400000 * 1.5
    })
    if (match && ps.intensite) {
      typeDriftData.push({ plannedIntensity: ps.intensite, realizedTss: match.tss ?? 0, realizedDuration: Math.round((match.moving_time_s ?? 0) / 60) })
    }
  })

  const tssCumul = activities.reduce((s, a) => s + (a.tss ?? 0), 0)
  const sportBreakdown: Record<string, number> = {}
  activities.forEach(a => { sportBreakdown[a.sport_type] = (sportBreakdown[a.sport_type] ?? 0) + Math.round((a.moving_time_s ?? 0) / 60) })
  const remainingPlanned = planned.filter(p => {
    const sessionDate = new Date(weekStart)
    sessionDate.setDate(weekStart.getDate() + (p.day_index ?? 0))
    return sessionDate > now
  })

  // Sources & confidence
  const sources: string[] = []
  if (activities.length > 0) sources.push(`${activities.length} activité(s) cette semaine`)
  if (planned.length > 0) sources.push(`${planned.length} séance(s) planifiée(s)`)
  if (metrics.length > 0) sources.push(`${metrics.length} jour(s) de métriques récupération`)
  if (past4wActivities.length > 0) sources.push(`${past4wActivities.length} activités sur 4 semaines (patterns)`)
  if (upcomingRaces.length > 0) sources.push(`${upcomingRaces.length} course(s) planifiée(s)`)
  const confidence = sources.length >= 4 ? 'élevé' : sources.length >= 2 ? 'modéré' : 'faible'

  const systemPrompt = `Tu es un coach expert en analyse hebdomadaire d'entraînement. Analyse la semaine EN CROISANT ces 3 dimensions obligatoirement.

DIMENSION 1 — COMPLIANCE PLAN/RÉALISÉ
Analyse la matrice de compliance fournie. Calcule le score de compliance, identifie les séances ok/partielles/manquées, commente le respect des intensités. Présente sous forme de tableau markdown.

DIMENSION 2 — PATTERNS SUR 4 SEMAINES
Analyse les données des 4 semaines passées. Détecte les comportements répétés : jours sautés chroniquement, type drift (séances planifiées à haute intensité mais réalisées en Z2), séances raccourcies systématiquement. NOMME le pattern explicitement. Si peu de données : le signaler.

DIMENSION 3 — ÉTAT DE RÉCUPÉRATION ET PROJECTION
Synthèse des métriques de la semaine (HRV, sommeil, fatigue) + TSS cumulé + cohérence avec les courses à venir.

TON : Coach direct, factuel, constructif. Pas de précautions oratoires.
STRUCTURE : ## pour chaque dimension + ## Synthèse + ## 3 recommandations actionnables

TERMINE TOUJOURS PAR :
## Sources et niveau de confiance
Sources utilisées : [liste]
Niveau de confiance : [élevé/modéré/faible] — [justification]

## Actions suggérées
Propose 1-2 actions rapides pertinentes parmi : "Analyser ma récupération", "Analyser un entraînement", "Estimer mes zones", "Conseils sommeil"${rulesBlock}`

  const userPrompt = `Analyse ma semaine du ${weekStart.toLocaleDateString('fr-FR')} au ${weekEnd.toLocaleDateString('fr-FR')}.

ACTIVITÉS RÉALISÉES :
${activities.length > 0 ? JSON.stringify(activities, null, 2) : 'Aucune activité cette semaine.'}

SÉANCES PLANIFIÉES :
${planned.length > 0 ? JSON.stringify(planned, null, 2) : 'Aucune séance planifiée.'}

MATRICE COMPLIANCE (planned vs réalisé) :
${complianceMatrix.length > 0 ? JSON.stringify(complianceMatrix, null, 2) : 'Pas de données de compliance disponibles.'}
Score de compliance estimé : ${complianceScore !== null ? `${complianceScore}%` : 'N/A'}

MÉTRIQUES DE RÉCUPÉRATION SEMAINE :
${metrics.length > 0 ? JSON.stringify(metrics, null, 2) : 'Pas de données de récupération.'}

TSS CUMULÉ SEMAINE : ${tssCumul}
RÉPARTITION PAR SPORT (minutes) : ${JSON.stringify(sportBreakdown)}
SÉANCES RESTANTES DE LA SEMAINE : ${remainingPlanned.length} séances

DONNÉES PATTERNS (4 semaines passées — ${past4wActivities.length} activités, ${past4wPlanned.length} séances planifiées) :
${typeDriftData.length > 0 ? `Type drift data : ${JSON.stringify(typeDriftData)}` : 'Données insuffisantes pour détecter un pattern.'}

COURSES À VENIR :
${upcomingRaces.length > 0 ? JSON.stringify(upcomingRaces, null, 2) : 'Aucune course planifiée.'}

Sources utilisées : ${sources.join(' · ')}
Niveau de confiance : ${confidence}`

  // TODO: inject injuries when table exists
  sendFn(label, systemPrompt + '\n\n' + userPrompt)
}

async function enrichedAnalyserRecuperation(
  sb: SupabaseClient,
  userId: string,
  rulesBlock: string,
  label: string,
  sendFn: SendFn
): Promise<void> {
  const now = new Date()
  const since28d = new Date(now); since28d.setDate(now.getDate() - 28)
  const in2days = new Date(now); in2days.setDate(now.getDate() + 2)

  const [metrics28dRes, activities28dRes, next48hRes] = await Promise.all([
    Promise.resolve(sb.from('metrics_daily').select('*').eq('user_id', userId).gte('date', since28d.toISOString().split('T')[0]).order('date', { ascending: true })).catch(() => ({ data: [] })),
    sb.from('activities').select('sport_type,started_at,moving_time_s,tss,avg_hr,intensity_factor').eq('user_id', userId).gte('started_at', since28d.toISOString()).order('started_at', { ascending: true }),
    sb.from('planned_sessions').select('date,sport,title,duration_min,intensite,tss').eq('user_id', userId).gte('date', now.toISOString().split('T')[0]).lte('date', in2days.toISOString().split('T')[0]).order('date', { ascending: true }),
  ])

  const metrics28d = metrics28dRes.data ?? []
  const activities28d = activities28dRes.data ?? []
  const next48h = next48hRes.data ?? []

  if (metrics28d.length < 3) {
    sendFn(label, `${rulesBlock ? rulesBlock + '\n\n' : ''}Analyse ma récupération. Je n'ai pas encore assez de données de suivi (${metrics28d.length} jour(s) disponible(s), minimum 3 requis). Donne-moi des conseils généraux de récupération pour un athlète d'endurance et explique comment configurer le suivi quotidien (HRV, sommeil, readiness) pour obtenir une analyse personnalisée. Indique clairement que l'analyse est générique faute de données suffisantes.`)
    return
  }

  // HRV baseline & current
  const hrvValues = metrics28d.filter(m => m.hrv != null).map(m => m.hrv as number)
  const hrvBaseline = hrvValues.length > 0 ? Math.round(hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length) : null
  const latestMetrics = metrics28d[metrics28d.length - 1]
  const latestHrv = latestMetrics?.hrv ?? null

  // TSS weekly buckets for overload threshold detection
  type WeekTss = { weekStart: string; totalTss: number; avgHrvNextWeek: number | null }
  const weeklyTss: WeekTss[] = []
  for (let w = 0; w < 4; w++) {
    const wStart = new Date(since28d); wStart.setDate(since28d.getDate() + w * 7)
    const wEnd = new Date(wStart); wEnd.setDate(wStart.getDate() + 6)
    const wTss = activities28d
      .filter(a => new Date(a.started_at) >= wStart && new Date(a.started_at) <= wEnd)
      .reduce((s, a) => s + (a.tss ?? 0), 0)
    const nextWStart = new Date(wEnd); nextWStart.setDate(wEnd.getDate() + 1)
    const nextWMetrics = metrics28d.filter(m => m.date > wEnd.toISOString().split('T')[0] && m.date <= nextWStart.toISOString().split('T')[0] && m.hrv != null)
    const avgHrvNext = nextWMetrics.length > 0 ? Math.round(nextWMetrics.reduce((s, m) => s + (m.hrv as number), 0) / nextWMetrics.length) : null
    weeklyTss.push({ weekStart: wStart.toISOString().split('T')[0], totalTss: Math.round(wTss), avgHrvNextWeek: avgHrvNext })
  }

  const tss7d = Math.round(activities28d.filter(a => new Date(a.started_at) >= new Date(now.getTime() - 7 * 86400000)).reduce((s, a) => s + (a.tss ?? 0), 0))
  const tss14d = Math.round(activities28d.filter(a => new Date(a.started_at) >= new Date(now.getTime() - 14 * 86400000)).reduce((s, a) => s + (a.tss ?? 0), 0))

  // Sources & confidence
  const sources: string[] = []
  if (metrics28d.length > 0) sources.push(`${metrics28d.length} jours de métriques (28j)`)
  if (hrvBaseline !== null) sources.push(`baseline HRV calculée : ${hrvBaseline}ms`)
  if (activities28d.length > 0) sources.push(`${activities28d.length} activités (28j)`)
  if (next48h.length > 0) sources.push(`${next48h.length} séance(s) prévue(s) 48h`)
  const confidence = metrics28d.length >= 14 && hrvValues.length >= 10 ? 'élevé' : metrics28d.length >= 7 ? 'modéré' : 'faible'

  const systemPrompt = `Tu es un expert en récupération et performance sportive. Produis une analyse en 3 niveaux.

NIVEAU 1 — VERDICT DU JOUR
Statut clair : Vert (bien récupéré) / Orange (récupération partielle) / Rouge (fatigue significative)
Chiffre clé : HRV actuel vs baseline + écart en %.

NIVEAU 2 — SIGNATURE DE RÉCUPÉRATION PERSONNELLE (28 jours)
Analyse les patterns sur 28 jours. Détecte :
- Le délai de récupération habituel après séance haute intensité (en heures)
- Le seuil TSS hebdomadaire qui déclenche une dépression HRV chez CET athlète
- Les signaux précoces de surcharge (FC repos élevée, sommeil court, readiness bas)
- Quel type de récupération fonctionne le mieux (repos complet ou sortie Z1 légère)
Nomme les patterns avec les chiffres. Sois précis.

NIVEAU 3 — RECOMMANDATION IMMÉDIATE
Pour la prochaine séance planifiée : verdict précis (faire / adapter comment exactement / repousser de combien).

TERMINE TOUJOURS PAR :
## Sources et niveau de confiance
Sources utilisées : [liste]
Niveau de confiance : [élevé/modéré/faible] — [justification]

## Actions suggérées
Propose 1-2 actions parmi : "Analyser ma semaine", "Conseils sommeil", "Analyser un entraînement"${rulesBlock}`

  const userPrompt = `Analyse ma récupération.

MÉTRIQUES 28 DERNIERS JOURS :
${JSON.stringify(metrics28d, null, 2)}

BASELINE HRV PERSONNELLE : ${hrvBaseline ?? 'non calculable'}ms (sur ${hrvValues.length} mesures)
HRV ACTUEL (dernier jour) : ${latestHrv ?? 'non disponible'}ms
${latestHrv && hrvBaseline ? `Écart : ${Math.round(((latestHrv - hrvBaseline) / hrvBaseline) * 100)}%` : ''}

TSS 7 DERNIERS JOURS : ${tss7d}
TSS 14 DERNIERS JOURS : ${tss14d}

CHARGE HEBDOMADAIRE × HRV SEMAINE SUIVANTE (pour détecter le seuil de surcharge) :
${JSON.stringify(weeklyTss, null, 2)}

ACTIVITÉS 28 JOURS :
${activities28d.length > 0 ? JSON.stringify(activities28d, null, 2) : 'Aucune activité.'}

PROCHAINES SÉANCES (48h) :
${next48h.length > 0 ? JSON.stringify(next48h, null, 2) : 'Aucune séance planifiée.'}

Sources utilisées : ${sources.join(' · ')}
Niveau de confiance : ${confidence}`

  // TODO: inject injuries when table exists
  sendFn(label, systemPrompt + '\n\n' + userPrompt)
}

async function enrichedConseilsSommeil(
  sb: SupabaseClient,
  userId: string,
  rulesBlock: string,
  label: string,
  sendFn: SendFn
): Promise<void> {
  const now = new Date()
  const since60d = new Date(now); since60d.setDate(now.getDate() - 60)

  const [metrics60dRes, activities60dRes, profileRes] = await Promise.all([
    Promise.resolve(sb.from('metrics_daily').select('*').eq('user_id', userId).gte('date', since60d.toISOString().split('T')[0]).order('date', { ascending: true })).catch(() => ({ data: [] })),
    sb.from('activities').select('sport_type,started_at,moving_time_s,tss,raw_data,intensity_factor').eq('user_id', userId).gte('started_at', since60d.toISOString()).order('started_at', { ascending: true }),
    sb.from('user_profiles').select('sports,main_goal,age,weight_kg').eq('user_id', userId).maybeSingle(),
  ])

  const metrics60d = metrics60dRes.data ?? []
  const activities60d = activities60dRes.data ?? []
  const profile = profileRes.data

  const nightsWithSleep = metrics60d.filter(m => m.sleep_duration != null && m.sleep_duration > 0)

  if (nightsWithSleep.length < 5) {
    sendFn(label, `${rulesBlock ? rulesBlock + '\n\n' : ''}Donne-moi des conseils pour optimiser mon sommeil en tant qu'athlète d'endurance. Je n'ai pas encore assez de données de suivi du sommeil (${nightsWithSleep.length} nuit(s) enregistrée(s), minimum 5 requises). Inclus des recommandations générales sur l'hygiène du sommeil pour les athlètes, et explique comment connecter un wearable (Garmin, Whoop, Oura, Apple Health) dans l'app pour obtenir une analyse personnalisée. Signale clairement que les conseils sont génériques.`)
    return
  }

  // Heure de fin de séance + qualité sommeil nuit suivante
  type SessionSleepEntry = { endHour: number; sport: string; tss: number; sleepQualityNextNight: number | null }
  const sessionSleepCorrelations: SessionSleepEntry[] = []
  activities60d.forEach(a => {
    const rawStartDate = (a.raw_data as { start_date?: string } | null)?.start_date
    if (!rawStartDate || !a.moving_time_s) return
    const endTime = new Date(new Date(rawStartDate).getTime() + (a.moving_time_s as number) * 1000)
    const endHour = endTime.getHours() + endTime.getMinutes() / 60
    const nextDay = new Date(endTime); nextDay.setDate(nextDay.getDate() + 1)
    const nextDayStr = nextDay.toISOString().split('T')[0]
    const nextMetrics = metrics60d.find(m => m.date === nextDayStr)
    sessionSleepCorrelations.push({ endHour: Math.round(endHour * 10) / 10, sport: a.sport_type, tss: a.tss ?? 0, sleepQualityNextNight: nextMetrics?.sleep_quality ?? null })
  })

  // Calculate personal cutoff time
  const eveningSessions = sessionSleepCorrelations.filter(s => s.endHour >= 17 && s.sleepQualityNextNight != null)
  const avgSleep = nightsWithSleep.length > 0 ? Math.round((nightsWithSleep.reduce((s, m) => s + (m.sleep_duration as number), 0) / nightsWithSleep.length) * 10) / 10 : null
  const avgQuality = nightsWithSleep.filter(m => m.sleep_quality != null).length > 0
    ? Math.round(nightsWithSleep.filter(m => m.sleep_quality != null).reduce((s, m) => s + (m.sleep_quality as number), 0) / nightsWithSleep.filter(m => m.sleep_quality != null).length)
    : null
  const nightsUnder7h = nightsWithSleep.filter(m => (m.sleep_duration as number) < 7).length

  // Cutoff time analysis: group by hour bucket
  type HourBucket = { bucket: string; avgQuality: number; count: number }
  const hourBuckets: Record<string, { totalQuality: number; count: number }> = {}
  eveningSessions.forEach(s => {
    const bucket = s.endHour < 18 ? 'avant-18h' : s.endHour < 19 ? '18h-19h' : s.endHour < 20 ? '19h-20h' : 'après-20h'
    if (!hourBuckets[bucket]) hourBuckets[bucket] = { totalQuality: 0, count: 0 }
    hourBuckets[bucket].totalQuality += s.sleepQualityNextNight ?? 0
    hourBuckets[bucket].count++
  })
  const cutoffAnalysis: HourBucket[] = Object.entries(hourBuckets).map(([bucket, data]) => ({
    bucket,
    avgQuality: data.count > 0 ? Math.round(data.totalQuality / data.count) : 0,
    count: data.count,
  }))

  // Sources & confidence
  const sources: string[] = [`${nightsWithSleep.length} nuits enregistrées (60j)`]
  if (activities60d.length > 0) sources.push(`${activities60d.length} activités (60j)`)
  if (eveningSessions.length > 0) sources.push(`${eveningSessions.length} séances soirée avec données sommeil`)
  if (profile) sources.push('profil athlète')
  const confidence = nightsWithSleep.length >= 20 && eveningSessions.length >= 5 ? 'élevé' : nightsWithSleep.length >= 10 ? 'modéré' : 'faible'

  const systemPrompt = `Tu es un expert en optimisation du sommeil pour athlètes d'endurance.

Tes conseils DOIVENT être basés sur les données réelles de cet athlète. Si une corrélation est forte, nomme-la avec les chiffres exacts. Ne donne JAMAIS de conseils génériques si les données permettent d'être précis.

STRUCTURE OBLIGATOIRE :
1. ## Diagnostic sommeil (statut : bon / perfectible / problématique + justification chiffrée)
2. ## Ses 3 saboteurs identifiés (avec preuves dans les données — si pas de données suffisantes, le dire)
3. ## Son heure limite d'entraînement personnelle (calcul transparent depuis les données, sinon recommandation générale)
4. ## 5 recommandations PERSONNALISÉES et actionnables (pas de généralités)
5. ## Sa priorité #1 : le changement avec le plus fort impact estimé

TERMINE TOUJOURS PAR :
## Sources et niveau de confiance
Sources utilisées : [liste]
Niveau de confiance : [élevé/modéré/faible] — [justification]

## Actions suggérées
Propose 1-2 actions parmi : "Analyser ma récupération", "Analyser ma semaine"${rulesBlock}`

  const userPrompt = `Analyse mon sommeil et donne-moi des conseils personnalisés.

PROFIL : ${profile ? `sports: ${profile.sports}, objectif: ${profile.main_goal}, âge: ${profile.age}` : 'non disponible'}

MÉTRIQUES SOMMEIL (60 jours — ${nightsWithSleep.length} nuits) :
Durée moyenne : ${avgSleep ?? 'N/A'}h
Qualité moyenne : ${avgQuality ?? 'N/A'}/100
Nuits < 7h : ${nightsUnder7h}/${nightsWithSleep.length}

DONNÉES BRUTES MÉTRIQUES :
${JSON.stringify(metrics60d.slice(-30), null, 2)}

IMPACT DES SÉANCES EN SOIRÉE SUR LE SOMMEIL :
${eveningSessions.length > 0 ? JSON.stringify(sessionSleepCorrelations.filter(s => s.endHour >= 17), null, 2) : 'Pas assez de séances en soirée pour calculer une corrélation.'}

ANALYSE PAR TRANCHE HORAIRE (qualité sommeil selon heure de fin de séance) :
${cutoffAnalysis.length > 0 ? JSON.stringify(cutoffAnalysis, null, 2) : 'Données insuffisantes.'}

Sources utilisées : ${sources.join(' · ')}
Niveau de confiance : ${confidence}`

  // TODO: inject injuries when table exists
  sendFn(label, systemPrompt + '\n\n' + userPrompt)
}

// ── AppGuideFlow ──────────────────────────────────────────────────────────────
// Flow structuré pour "Comprendre l'application" : App Health Score + sélection
// de pages + génération d'un guide personnalisé.

type AppHealthCheck = { id: string; label: string; ok: boolean; detail: string | null }
type AppHealthState = { score: number; checks: AppHealthCheck[] }

const APP_GUIDE_PAGES = [
  { id: 'planning',     label: 'Planning',      sub: 'Semaines, séances, courses' },
  { id: 'activities',   label: 'Activités',     sub: 'Sync Strava, graphiques, analyse' },
  { id: 'performance',  label: 'Performance',   sub: 'Tests, zones, profil athlète' },
  { id: 'nutrition',    label: 'Nutrition',      sub: 'Plan, suivi macros, poids' },
  { id: 'recovery',     label: 'Récupération',   sub: 'HRV, sommeil, readiness' },
  { id: 'zones',        label: 'Zones',          sub: 'FC, allure, puissance' },
  { id: 'connections',  label: 'Connexions',     sub: 'Strava, Garmin, Whoop' },
  { id: 'coach',        label: 'Coach IA',       sub: 'Chat, actions, règles' },
  { id: 'profile',      label: 'Profil',         sub: 'Réglages, modèle, police' },
  { id: 'calendar',     label: 'Calendrier',     sub: 'Courses, événements' },
  { id: 'briefing',     label: 'Briefing',       sub: 'Résumé quotidien' },
]

// Mapping check-id → page-id
const CHECK_TO_PAGE: Record<string, string> = {
  zones: 'zones', tests: 'performance', nutrition: 'nutrition',
  races: 'calendar', strava: 'connections', recovery: 'recovery', rules: 'coach',
}

function AppGuideFlow({ onPrepare, onCancel }: {
  onPrepare: (apiPrompt: string, label: string) => void
  onCancel: () => void
}) {
  const [phase, setPhase] = useState<'loading' | 'select'>('loading')
  const [selected, setSelected] = useState<string[]>([])
  const [health, setHealth] = useState<AppHealthState | null>(null)
  const [profile, setProfile] = useState<{ firstName: string; sports: string; goal: string } | null>(null)
  const [healthScore, setHealthScore] = useState(0)
  const [configuredFeatures, setConfiguredFeatures] = useState<string[]>([])
  const [missingFeatures, setMissingFeatures] = useState<string[]>([])

  useEffect(() => {
    void (async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { setPhase('select'); return }

        const now = new Date()
        const today = now.toISOString().slice(0, 10)
        const since30d = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)
        const since14d = new Date(now.getTime() - 14 * 86400000).toISOString().slice(0, 10)

        const [profileRes, zonesRes, testsRes, planRes, racesRes, actsRes, metricsRes, rulesRes] = await Promise.all([
          sb.from('user_profiles').select('first_name,sports,main_goal').eq('user_id', user.id).maybeSingle(),
          sb.from('training_zones').select('id,sport').eq('user_id', user.id).eq('is_current', true),
          sb.from('test_results').select('id').eq('user_id', user.id),
          sb.from('nutrition_plans').select('id').eq('user_id', user.id).eq('actif', true).maybeSingle(),
          sb.from('planned_races').select('id').eq('user_id', user.id).gte('date', today),
          sb.from('activities').select('id').eq('user_id', user.id).gte('started_at', since30d + 'T00:00:00'),
          Promise.resolve(sb.from('metrics_daily').select('id').eq('user_id', user.id).gte('date', since14d)).catch(() => ({ data: [] })),
          sb.from('ai_rules').select('id').eq('user_id', user.id).eq('active', true),
        ])

        const zonesCount = zonesRes.data?.length ?? 0
        const testsCount = testsRes.data?.length ?? 0
        const hasPlan = !!planRes.data
        const racesCount = racesRes.data?.length ?? 0
        const actsCount = actsRes.data?.length ?? 0
        const metricsCount = metricsRes.data?.length ?? 0
        const rulesCount = rulesRes.data?.length ?? 0

        const checks: AppHealthCheck[] = [
          { id: 'zones',    label: 'Zones',              ok: zonesCount > 0,   detail: zonesCount > 0 ? `${zonesCount} sport(s)` : null },
          { id: 'tests',    label: 'Tests',              ok: testsCount > 0,   detail: testsCount > 0 ? `${testsCount} résultat(s)` : null },
          { id: 'nutrition',label: 'Plan nutritionnel',  ok: hasPlan,          detail: hasPlan ? 'Actif' : null },
          { id: 'races',    label: 'Courses planifiées', ok: racesCount > 0,   detail: racesCount > 0 ? `${racesCount} course(s)` : null },
          { id: 'strava',   label: 'Strava actif',       ok: actsCount > 5,    detail: actsCount > 0 ? `${actsCount} activités` : null },
          { id: 'recovery', label: 'Suivi récupération', ok: metricsCount > 5, detail: metricsCount > 0 ? `${metricsCount} jours` : null },
          { id: 'rules',    label: 'Règles IA',          ok: rulesCount > 0,   detail: rulesCount > 0 ? `${rulesCount} règle(s)` : null },
        ]
        const weights = [15, 15, 15, 15, 20, 10, 10]
        const score = checks.reduce((s, c, i) => s + (c.ok ? weights[i] : 0), 0)

        const cfg: string[] = []
        const missing: string[] = []
        if (zonesCount > 0) cfg.push(`Zones (${zonesCount} sport(s))`)
        else missing.push('Zones (−15pts) → conseils IA génériques sans zones')
        if (testsCount > 0) cfg.push(`Tests (${testsCount} résultat(s))`)
        else missing.push('Tests (−15pts) → VMA/FTP inconnus')
        if (hasPlan) cfg.push('Plan nutritionnel actif')
        else missing.push('Plan nutritionnel (−15pts)')
        if (racesCount > 0) cfg.push(`${racesCount} course(s) planifiée(s)`)
        else missing.push('Courses planifiées (−15pts)')
        if (actsCount > 5) cfg.push(`${actsCount} activités Strava`)
        else missing.push('Strava (−20pts) → connecter dans Connexions')
        if (metricsCount > 5) cfg.push(`Récupération (${metricsCount} jours)`)
        else missing.push('Récupération (−10pts) → HRV/sommeil requis')
        if (rulesCount > 0) cfg.push(`${rulesCount} règle(s) IA`)
        else missing.push('Règles IA (−10pts) → Paramètres → Règles IA')

        const p = profileRes.data
        setProfile({
          firstName: p?.first_name ?? '',
          sports: (p?.sports as string[] | null)?.join(', ') ?? 'non renseignés',
          goal: p?.main_goal ?? 'non renseigné',
        })
        setHealth({ score, checks })
        setHealthScore(score)
        setConfiguredFeatures(cfg)
        setMissingFeatures(missing)
      } catch { /* non-bloquant */ }
      setPhase('select')
    })()
  }, [])

  const toggle = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])

  const selectAll = () => setSelected(APP_GUIDE_PAGES.map(p => p.id))
  const selectMissing = () => {
    if (!health) return
    const ids = health.checks
      .filter(c => !c.ok)
      .map(c => CHECK_TO_PAGE[c.id])
      .filter((id): id is string => Boolean(id))
    setSelected(ids)
  }

  const handleGenerate = () => {
    if (selected.length === 0) return
    const pagesLabels = selected
      .map(id => APP_GUIDE_PAGES.find(p => p.id === id)?.label)
      .filter(Boolean)
      .join(', ')

    const APP_KNOWLEDGE = `CONNAISSANCE COMPLÈTE DE L'APPLICATION THW COACHING :

**Planning** : Calendrier semaine/mois. Sessions planifiées avec blocs (durée, intensité, type). Création manuelle bouton + ou via Coach IA → Construire une séance. Courses planifiées visibles dans le calendrier. Tâches semaine.

**Activités** : Feed Strava synchronisé automatiquement. Filtres sport/période. Détail avec streams graphiques (FC, vitesse, watts, altitude, cadence). Analyse par zones. Laps détaillés.

**Performance** : Onglet Profil (FTP, VMA, LTHR, VO2max, poids). Onglet Tests (protocoles VMA, CP20, Ruffier + saisie + historique). Onglet Zones (calcul zones course LTHR→Z1-Z5, vélo FTP→Z1-Z5, natation CSS→allures).

**Nutrition** : Plan IA généré via Coach IA → Créer un plan nutritionnel. 3 niveaux caloriques. 2 variantes A/B. Suivi journalier macros/calories. Suivi poids.

**Récupération** : Métriques subjectives quotidiennes (fatigue, énergie, stress, motivation, douleur). Données objectives HRV/FC repos/sommeil via wearable. Connexion Garmin, Whoop, Oura, Apple Health.

**Zones** : Calcul zones par sport depuis les marqueurs physiologiques (LTHR, FTP, CSS). Utilisées par tous les modules IA — à configurer en priorité absolue.

**Connexions** : Strava (sync auto), Garmin/Wahoo/Polar, wearables récupération (Whoop, Oura), Apple Health.

**Coach IA** : Chat 3 modèles (Hermès/rapide, Athéna/équilibré, Zeus/profond). 10 actions rapides via bouton + . Règles personnelles : Paramètres → Règles IA. Historique conversations.

**Profil** : Infos personnelles, avatar, liste sports, connexions OAuth, réglages modèle IA et police.

**Calendrier** : Courses planifiées avec dates, objectifs et niveaux. Ajout via + dans la page.

**Briefing** : Résumé quotidien (séance du jour + tâches + actualités). Accessible depuis l'accueil.`

    const fn = profile?.firstName ?? ''
    const sports = profile?.sports ?? 'non renseignés'
    const goal = profile?.goal ?? 'non renseigné'

    const systemPrompt = `Tu es l'assistant expert de l'application THW Coaching. Tu connais parfaitement chaque fonctionnalité, chaque bouton, chaque flux.

${APP_KNOWLEDGE}

PROFIL DE L'ATHLÈTE :
- ${fn ? `Prénom : ${fn} | ` : ''}Sports : ${sports} | Objectif : ${goal}
- App Health Score : ${healthScore}/100
- Fonctionnalités configurées : ${configuredFeatures.join(', ') || 'aucune'}
- Fonctionnalités manquantes : ${missingFeatures.join(', ') || 'aucune'}

SECTIONS DEMANDÉES : ${pagesLabels}

TON RÔLE :
1. Présenter l'App Health Score avec détails (configuré / manquant)
2. Expliquer comment utiliser les sections sélectionnées pour ${fn || 'cet athlète'} (profil ${sports}/${goal})
3. Pour chaque fonctionnalité NON configurée parmi les sections : expliquer POURQUOI utile pour ce profil + chemin de configuration précis
4. Donner un chemin pas-à-pas personnalisé
5. Terminer avec les 3 prochaines étapes CONCRÈTES

RÈGLES :
- Toujours contextualiser pour ${sports} et ${goal}
- Être précis sur les chemins de navigation (ex: "dans Performance → onglet Zones → ...")
- Ne pas être générique`

    const userPrompt = `Explique-moi les sections suivantes de l'app : ${pagesLabels}

App Health Score : ${healthScore}/100
Configuré : ${configuredFeatures.join(' · ') || 'rien'}
Manquant : ${missingFeatures.join(' · ') || 'rien'}
Sports : ${sports} | Objectif : ${goal}`

    onPrepare(systemPrompt + '\n\n' + userPrompt, 'Comprendre l\'application')
  }

  // ── Phase loading ──────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center' }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(91,111,255,0.2)', borderTop: '2px solid #5b6fff', animation: 'ai_spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 12, color: 'var(--ai-dim)', margin: 0 }}>Analyse de ta configuration...</p>
      </div>
    )
  }

  // ── Phase select ───────────────────────────────────────────────
  return (
    <div style={{ padding: '4px 0' }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ai-text)', margin: '0 0 4px', fontFamily: 'Syne,sans-serif' }}>Comprendre l'application</p>
      <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 14px', lineHeight: 1.5 }}>
        Sélectionne les sections à explorer. Le guide s'adapte à ton profil.
      </p>

      {/* App Health Score */}
      {health && (
        <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Configuration</span>
            <span style={{
              fontSize: 16, fontWeight: 800, fontFamily: 'DM Mono,monospace',
              color: health.score >= 70 ? '#22c55e' : health.score >= 40 ? '#f97316' : '#ef4444',
            }}>{health.score}%</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {health.checks.map(c => (
              <span key={c.id} style={{
                fontSize: 10, padding: '3px 8px', borderRadius: 6, fontWeight: 600,
                background: c.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)',
                color: c.ok ? '#22c55e' : '#ef4444',
              }}>
                {c.ok ? '✓' : '✗'} {c.label}{c.detail ? ` — ${c.detail}` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Raccourcis */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button onClick={selectAll} style={{ flex: 1, padding: '7px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
          Tout sélectionner
        </button>
        <button onClick={selectMissing} disabled={!health || health.checks.every(c => c.ok)} style={{
          flex: 1, padding: '7px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
          background: 'rgba(239,68,68,0.05)', color: '#ef4444', fontSize: 11, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
          opacity: !health || health.checks.every(c => c.ok) ? 0.4 : 1,
        }}>
          Ce que je n'utilise pas
        </button>
      </div>

      {/* Grille pages */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6, marginBottom: 16 }}>
        {APP_GUIDE_PAGES.map(page => {
          const active = selected.includes(page.id)
          return (
            <button key={page.id} onClick={() => toggle(page.id)} style={{
              padding: '10px 12px', borderRadius: 10, textAlign: 'left',
              border: `1.5px solid ${active ? 'rgba(91,111,255,0.5)' : 'var(--ai-border)'}`,
              background: active ? 'rgba(91,111,255,0.06)' : 'transparent',
              cursor: 'pointer', transition: 'all 0.12s',
            }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: active ? '#5b6fff' : 'var(--ai-text)', margin: '0 0 2px' }}>{page.label}</p>
              <p style={{ fontSize: 10, color: 'var(--ai-dim)', margin: 0 }}>{page.sub}</p>
            </button>
          )
        })}
      </div>

      <button
        onClick={handleGenerate}
        disabled={selected.length === 0}
        style={{
          width: '100%', padding: '11px', borderRadius: 10,
          background: selected.length > 0 ? 'linear-gradient(135deg,#00c8e0,#5b6fff)' : 'var(--ai-border)',
          border: 'none', color: selected.length > 0 ? '#fff' : 'var(--ai-dim)',
          fontSize: 13, fontWeight: 700, cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
          fontFamily: 'Syne,sans-serif',
        }}>
        Explorer {selected.length > 0 ? `(${selected.length} section${selected.length > 1 ? 's' : ''})` : ''}
      </button>
      <button onClick={onCancel} style={{ display: 'block', margin: '8px auto 0', fontSize: 11, color: 'var(--ai-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
        Annuler
      </button>
    </div>
  )
}

async function enrichedComprendreApp(
  sb: SupabaseClient,
  userId: string,
  label: string,
  sendFn: SendFn
): Promise<void> {
  const now = new Date()
  const since30d = new Date(now); since30d.setDate(now.getDate() - 30)
  const since14d = new Date(now); since14d.setDate(now.getDate() - 14)

  const [profileRes, zonesRes, testsRes, planNutritionRes, racesRes, activitiesCountRes, metricsCountRes, rulesCountRes] = await Promise.all([
    sb.from('user_profiles').select('first_name,sports,main_goal,age').eq('user_id', userId).maybeSingle(),
    sb.from('training_zones').select('id,sport').eq('user_id', userId).eq('is_current', true),
    sb.from('test_results').select('id').eq('user_id', userId),
    sb.from('nutrition_plans').select('id').eq('user_id', userId).eq('actif', true).maybeSingle(),
    sb.from('planned_races').select('id,name,sport,date').eq('user_id', userId).gte('date', now.toISOString().split('T')[0]),
    sb.from('activities').select('id').eq('user_id', userId).gte('started_at', since30d.toISOString()),
    Promise.resolve(sb.from('metrics_daily').select('id').eq('user_id', userId).gte('date', since14d.toISOString().split('T')[0])).catch(() => ({ data: [], count: 0 })),
    sb.from('ai_rules').select('id').eq('user_id', userId).eq('active', true),
  ])

  const profile = profileRes.data
  const zones = zonesRes.data ?? []
  const tests = testsRes.data ?? []
  const planNutrition = planNutritionRes.data
  const races = racesRes.data ?? []
  const activitiesCount = activitiesCountRes.data?.length ?? 0
  const metricsCount = metricsCountRes.data?.length ?? 0
  const rulesCount = rulesCountRes.data?.length ?? 0

  // App Health Score
  let healthScore = 0
  if (zones.length > 0) healthScore += 15
  if (tests.length > 0) healthScore += 15
  if (planNutrition) healthScore += 15
  if (races.length > 0) healthScore += 15
  if (activitiesCount > 5) healthScore += 20
  if (metricsCount > 5) healthScore += 10
  if (rulesCount > 0) healthScore += 10

  const configuredFeatures: string[] = []
  const missingFeatures: string[] = []
  if (zones.length > 0) configuredFeatures.push(`Zones (${zones.length} sport(s))`)
  else missingFeatures.push('Zones d\'entraînement (−15pts) → tous les conseils IA sont génériques sans zones')
  if (tests.length > 0) configuredFeatures.push(`Tests (${tests.length} résultat(s))`)
  else missingFeatures.push('Tests de performance (−15pts) → VMA/FTP inconnus, estimations imprécises')
  if (planNutrition) configuredFeatures.push('Plan nutritionnel actif')
  else missingFeatures.push('Plan nutritionnel (−15pts) → pas de conseils nutrition personnalisés')
  if (races.length > 0) configuredFeatures.push(`${races.length} course(s) planifiée(s)`)
  else missingFeatures.push('Courses planifiées (−15pts) → pas de planification orientée objectif')
  if (activitiesCount > 5) configuredFeatures.push(`${activitiesCount} activités récentes (Strava actif)`)
  else missingFeatures.push('Activités Strava (−20pts) → connecter Strava pour l\'analyse des entraînements')
  if (metricsCount > 5) configuredFeatures.push(`Suivi récupération actif (${metricsCount} jours)`)
  else missingFeatures.push('Suivi récupération (−10pts) → HRV/sommeil requis pour l\'analyse de forme')
  if (rulesCount > 0) configuredFeatures.push(`${rulesCount} règle(s) IA personnelle(s)`)
  else missingFeatures.push('Règles IA (−10pts) → aller dans Paramètres → Règles IA')

  const firstName = profile?.first_name ?? 'l\'athlète'
  const sports = (profile?.sports as string[] | null)?.join(', ') ?? 'non renseignés'
  const goal = profile?.main_goal ?? 'non renseigné'

  const APP_KNOWLEDGE = `CONNAISSANCE COMPLÈTE DE L'APPLICATION THW COACHING :

**Planning** : Calendrier semaine/mois. Sessions planifiées avec leurs blocs (durée, intensité, type). Gestion manuelle via bouton + → créer session. Génération IA via Coach IA → Construire une séance. Courses planifiées (planned_races) visibles dans le calendrier. Tâches semaine (week_tasks). Visualisation day_intensity.

**Activités** : Feed Strava synchronisé automatiquement. Filtres sport/période. Détail activité avec streams graphiques (FC, vitesse, watts, altitude, cadence) — disponibles pour activités Strava récentes. Analyse par zones. Laps détaillés.

**Performance** : Onglet Profil (FTP, VMA, LTHR, VO2max, poids). Onglet Datas (historique métriques). Onglet Tests (protocoles complets : VMA, CP20, Ruffier, etc. + saisie résultats + historique). Onglet Zones (calcul zones course depuis LTHR, vélo depuis FTP, natation depuis CSS).

**Nutrition** : Plan nutritionnel IA généré via Coach IA → Créer un plan nutritionnel. 3 niveaux caloriques (jour léger/moyen/intense). 2 variantes (A/B). Suivi journalier macros/calories. Suivi poids. Templates repas types. Ajustements automatiques selon la charge.

**Récupération** : Métriques subjectives quotidiennes (fatigue, énergie, stress, motivation, douleur — 1-10). Données objectives (HRV, FC repos, durée sommeil, qualité sommeil) via wearable. Connexion Garmin, Whoop, Oura, Apple Health dans Connexions.

**Zones** : Calcul zones course (LTHR → Z1-Z5 FC + allures), vélo (FTP → Z1-Z5 watts), natation (CSS → allures). Utilisées par TOUS les modules IA — à configurer en priorité absolue.

**Connexions** : Strava (sync automatique activités). Garmin/Wahoo/Polar (données entraînement). Wearables récupération : Whoop, Oura, Garmin (HRV/sommeil). Apple Health.

**Coach IA** : Chat IA avec 3 modèles (Hermès/rapide, Athéna/équilibré, Zeus/profond). 10 actions rapides accessibles via bouton + ou actions principales. Règles personnelles : Paramètres → Règles IA. Historique conversations.

**Profil** : Infos personnelles (prénom, age, poids, taille). Avatar. Liste sports. Connexions OAuth.

**Briefing** : Résumé quotidien (séance du jour + tâches + actualités sportives). Accessible depuis l'écran d'accueil.`

  const systemPrompt = `Tu es l'assistant expert de l'application THW Coaching. Tu connais parfaitement chaque fonctionnalité, chaque bouton, chaque flux.

${APP_KNOWLEDGE}

PROFIL DE L'ATHLÈTE :
- Prénom : ${firstName} | Sports : ${sports} | Objectif : ${goal}
- App Health Score : ${healthScore}/100
- Fonctionnalités configurées : ${configuredFeatures.join(', ') || 'aucune'}
- Fonctionnalités manquantes : ${missingFeatures.join(', ') || 'aucune'}

TON RÔLE :
1. Commencer par présenter l'App Health Score avec les détails (ce qui est configuré / ce qui manque)
2. Expliquer les fonctionnalités les plus utiles pour ${firstName} avec son profil (${sports}/${goal})
3. Pour chaque fonctionnalité NON configurée : expliquer POURQUOI c'est utile pour CE profil et comment accéder à la configuration
4. Donner un chemin pas-à-pas personnalisé ("Commence par X, puis Y")
5. Terminer avec les 3 prochaines étapes CONCRÈTES pour maximiser l'app

RÈGLES :
- Toujours contextualiser pour ${sports} et ${goal}
- Être précis sur les chemins de navigation ("dans Performance → onglet Zones → ...")
- Proposer proactivement des fonctionnalités connexes non demandées mais pertinentes
- Le score est affiché de façon structurée avec chaque item`

  const userPrompt = `Présente-moi l'application et explique comment en tirer le maximum pour mon profil.

APP HEALTH SCORE : ${healthScore}/100
Configuré : ${configuredFeatures.join(' · ') || 'rien encore'}
Manquant : ${missingFeatures.join(' · ') || 'rien'}

Sports pratiqués : ${sports}
Objectif principal : ${goal}`

  sendFn(label, systemPrompt + '\n\n' + userPrompt)
}

// ══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════

// ── Tool call day names ───────────────────────────────────────

const DAY_NAMES_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const SPORT_LABELS_TOOL: Record<string, string> = {
  run: 'Course', bike: 'Vélo', swim: 'Natation',
  hyrox: 'Hyrox', rowing: 'Aviron', gym: 'Muscu',
}

// ── ToolCallPreview ───────────────────────────────────────────
// Render helper : info visuelle pour UN tool call

function toolCallMeta(tc: PendingToolCall): { borderColor: string; emoji: string; label: string; description: string } {
  const { tool_name, tool_input: inp } = tc
  const day     = typeof inp.day_index === 'number' ? (DAY_NAMES_FR[inp.day_index] ?? `J${inp.day_index}`) : ''
  const sport   = typeof inp.sport    === 'string'  ? (SPORT_LABELS_TOOL[inp.sport]  ?? inp.sport)         : ''
  const wStart  = typeof inp.week_start === 'string' ? inp.week_start : ''

  if (tool_name === 'add_session') return {
    borderColor: '#22c55e', emoji: '+', label: 'Ajouter une séance',
    description: `${String(inp.title ?? '—')} · ${sport} · ${String(inp.duration_min ?? '?')}min · ${day} semaine du ${wStart}`,
  }
  if (tool_name === 'update_session') {
    const changes = Object.keys(inp).filter(k => k !== 'session_id').join(', ')
    return { borderColor: '#f97316', emoji: '✎', label: 'Modifier une séance',
      description: `Séance …${String(inp.session_id ?? '').slice(-8)} · Champs : ${changes || 'aucun'}` }
  }
  if (tool_name === 'delete_session') return {
    borderColor: '#ef4444', emoji: '✕', label: 'Supprimer une séance',
    description: `⚠ Séance …${String(inp.session_id ?? '').slice(-8)} — action irréversible`,
  }
  if (tool_name === 'move_session') {
    const newDay = typeof inp.new_day_index === 'number' ? (DAY_NAMES_FR[inp.new_day_index] ?? `J${inp.new_day_index}`) : ''
    return { borderColor: '#3b82f6', emoji: '→', label: 'Déplacer une séance',
      description: `Séance …${String(inp.session_id ?? '').slice(-8)} → ${newDay} semaine du ${String(inp.new_week_start ?? '')}` }
  }
  if (tool_name === 'add_week') {
    const n = ((inp.sessions as unknown[]) ?? []).length
    return { borderColor: '#22c55e', emoji: '+', label: 'Ajouter une semaine complète',
      description: `${String(inp.week_type ?? '')} · semaine du ${String(inp.week_start ?? '')} · ${n} séances` }
  }
  if (tool_name === 'update_plan_periodisation') {
    const n = ((inp.blocs_periodisation as unknown[]) ?? []).length
    return { borderColor: '#f97316', emoji: '⟳', label: 'Modifier la périodisation',
      description: `${n} blocs de périodisation remplacés` }
  }
  return { borderColor: '#9ca3af', emoji: '?', label: tool_name, description: '' }
}

// Composant : N tool calls empilés + boutons Appliquer / Annuler partagés

function ToolCallPreview({
  toolCalls, onApply, onCancel, applyStatus, applyError,
}: {
  toolCalls: PendingToolCall[]
  onApply: () => void
  onCancel: () => void
  applyStatus: 'idle' | 'applying' | 'success' | 'error'
  applyError: string | null
}) {
  const isApplying = applyStatus === 'applying'
  const n = toolCalls.length
  const applyLabel = n > 1 ? `✓ Appliquer les ${n} modifications` : '✓ Appliquer'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 34, animation: 'ai_msg_in 0.18s ease both' }}>

      {/* ── Une card par tool call ──────────────────────────── */}
      {toolCalls.map((tc, i) => {
        const { borderColor, emoji, label, description } = toolCallMeta(tc)
        return (
          <div key={i} style={{
            borderRadius: 10,
            border: `1px solid ${borderColor}44`,
            borderLeft: `3px solid ${borderColor}`,
            background: `${borderColor}0e`,
            padding: '10px 13px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
              {n > 1 && (
                <span style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', color: 'var(--ai-dim)', minWidth: 18 }}>
                  {i + 1}/{n}
                </span>
              )}
              <span style={{ fontSize: 13, color: borderColor, fontWeight: 800, lineHeight: 1, fontFamily: 'DM Mono,monospace' }}>{emoji}</span>
              <span style={{
                fontSize: 10.5, fontWeight: 700, color: borderColor,
                fontFamily: 'Syne,sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>{label}</span>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--ai-text)', margin: 0, lineHeight: 1.5, fontFamily: 'DM Sans,sans-serif' }}>
              {description}
            </p>
          </div>
        )
      })}

      {/* ── Erreur ─────────────────────────────────────────── */}
      {applyStatus === 'error' && applyError && (
        <p style={{ fontSize: 11, color: '#ef4444', margin: 0, padding: '7px 11px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', fontFamily: 'DM Sans,sans-serif' }}>
          {applyError}
        </p>
      )}

      {/* ── Boutons partagés ───────────────────────────────── */}
      <div style={{ display: 'flex', gap: 7 }}>
        <button
          onClick={onCancel}
          disabled={isApplying}
          style={{
            flex: 1, padding: '8px 10px', borderRadius: 8,
            border: '1px solid var(--ai-border)',
            background: 'var(--ai-bg)', color: 'var(--ai-mid)',
            fontSize: 12, fontWeight: 600,
            cursor: isApplying ? 'not-allowed' : 'pointer',
            fontFamily: 'DM Sans,sans-serif',
            opacity: isApplying ? 0.5 : 1,
          }}
        >
          ✗ Annuler
        </button>
        <button
          onClick={onApply}
          disabled={isApplying}
          style={{
            flex: 2, padding: '8px 10px', borderRadius: 8,
            border: 'none',
            background: isApplying ? 'var(--ai-border)' : 'var(--ai-gradient)',
            color: isApplying ? 'var(--ai-mid)' : '#fff',
            fontSize: 12, fontWeight: 700,
            cursor: isApplying ? 'not-allowed' : 'pointer',
            fontFamily: 'DM Sans,sans-serif',
          }}
        >
          {isApplying ? 'Application…' : applyLabel}
        </button>
      </div>
    </div>
  )
}

function RuleHelperFlow({ category, onPrepare, onCancel }: {
  category: string | null
  onPrepare: (prompt: string, label: string) => void
  onCancel: () => void
}) {
  const [description, setDescription] = useState('')

  const CAT_LABELS: Record<string, string> = {
    response_style: 'Style de réponse',
    training:       'Entraînement',
    health:         'Santé',
    nutrition:      'Nutrition',
    schedule:       'Organisation',
    other:          'Autre',
  }

  const catLabel = CAT_LABELS[category ?? ''] ?? 'Autre'

  function generate() {
    const prompt = `L'utilisateur veut créer une règle IA pour la catégorie "${catLabel}". Voici ce qu'il veut exprimer : "${description}". Reformule cette idée en une règle claire, concise et actionnable (1 à 2 phrases max) que le Coach IA devra toujours respecter. Réponds UNIQUEMENT avec la règle formulée, sans explication ni introduction.`
    onPrepare(prompt, `Formuler une règle — ${catLabel}`)
  }

  return (
    <div style={{ padding: '8px 0 4px' }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 4px', fontFamily: 'Syne,sans-serif' }}>
        Formuler une règle — {catLabel}
      </p>
      <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 14px' }}>
        Décris ce que tu veux, l'IA formulera la règle pour toi.
      </p>
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Ex : je ne veux pas faire de squats parce que j'ai mal au genou..."
        rows={3}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: 10,
          border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)',
          color: 'var(--ai-text)', fontSize: 12, outline: 'none',
          resize: 'none', fontFamily: 'DM Sans,sans-serif', lineHeight: 1.5,
          boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button
          onClick={onCancel}
          style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}
        >Annuler</button>
        <button
          onClick={generate}
          disabled={description.trim().length < 5}
          style={{
            flex: 2, padding: '9px', borderRadius: 9, border: 'none',
            background: description.trim().length >= 5 ? 'linear-gradient(135deg, #00c8e0, #5b6fff)' : 'var(--ai-bg2)',
            color: description.trim().length >= 5 ? '#fff' : 'var(--ai-dim)',
            fontSize: 12, fontWeight: 600,
            cursor: description.trim().length >= 5 ? 'pointer' : 'not-allowed',
            fontFamily: 'DM Sans,sans-serif',
          }}
        >Formuler la règle</button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// FLOW — EstimerZonesFlow
// ══════════════════════════════════════════════════════════════

type ActivityRowZones = {
  started_at: string
  moving_time_s: number | null
  avg_hr: number | null
  max_hr: number | null
  avg_watts: number | null
  max_watts: number | null
  avg_pace_s_km: number | null
  tss: number | null
  intensity_factor: number | null
  rpe: number | null
}

type ConfidenceLevel = 'élevé' | 'modéré' | 'insuffisant'

function estimateFTP(acts: ActivityRowZones[]): number | null {
  const relevant = acts.filter(a => a.moving_time_s != null && a.moving_time_s >= 1200 && a.moving_time_s <= 3600 && a.avg_watts != null)
  if (relevant.length === 0) return null
  const sorted = [...relevant].sort((a, b) => (b.avg_watts ?? 0) - (a.avg_watts ?? 0))
  const top = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.05)))
  const avgTop = top.reduce((s, a) => s + (a.avg_watts ?? 0), 0) / top.length
  return Math.round(avgTop * 0.95)
}

function estimateLTHR(acts: ActivityRowZones[]): number | null {
  const relevant = acts.filter(a => a.avg_hr != null && ((a.intensity_factor != null && a.intensity_factor >= 0.9) || (a.rpe != null && a.rpe >= 7)))
  if (relevant.length < 3) return null
  const avgHr = relevant.reduce((s, a) => s + (a.avg_hr ?? 0), 0) / relevant.length
  return Math.round(avgHr * 1.02)
}

function detectZoneDrift(acts: ActivityRowZones[]): { detected: boolean; deltaBpm: number | null; detail: string } {
  const sorted = [...acts].sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
  const third = Math.floor(sorted.length / 3)
  if (third < 3) return { detected: false, deltaBpm: null, detail: 'Pas assez d\'activités pour détecter une dérive.' }
  const firstThird = sorted.slice(0, third).filter(a => a.avg_hr != null && a.avg_watts != null)
  const lastThird = sorted.slice(-third).filter(a => a.avg_hr != null && a.avg_watts != null)
  if (firstThird.length < 2 || lastThird.length < 2) return { detected: false, deltaBpm: null, detail: 'Données insuffisantes pour la comparaison.' }
  const avgHrFirst = firstThird.reduce((s, a) => s + (a.avg_hr ?? 0), 0) / firstThird.length
  const avgHrLast = lastThird.reduce((s, a) => s + (a.avg_hr ?? 0), 0) / lastThird.length
  const delta = Math.round(avgHrFirst - avgHrLast)
  if (Math.abs(delta) < 3) return { detected: false, deltaBpm: delta, detail: 'Pas de dérive significative détectée (< 3bpm).' }
  return {
    detected: true,
    deltaBpm: delta,
    detail: delta > 0
      ? `Ta FC a baissé de ${delta}bpm pour une charge similaire → tu as progressé mais tes zones HR ne le reflètent peut-être pas.`
      : `Ta FC a augmenté de ${Math.abs(delta)}bpm pour une charge similaire → possible suraccumulation de fatigue ou régression.`,
  }
}

function computeConfidence(testsCount: number, activitiesCount: number, hasRecentTest: boolean): { level: ConfidenceLevel; reason: string } {
  if (hasRecentTest) return { level: 'élevé', reason: 'Test récent disponible comme source primaire' }
  if (activitiesCount >= 15) return { level: 'modéré', reason: 'Estimation depuis activités uniquement — un test VMA/FTP donnerait un résultat plus fiable' }
  void testsCount
  return { level: 'insuffisant', reason: 'Données insuffisantes pour une estimation fiable' }
}

type ZoneEstimationResult = {
  confiance: ConfidenceLevel
  raison_confiance: string
  estimation: {
    ftp: number | null
    lthr: number | null
    vma_kmh: number | null
    zones: Array<{ id: string; label: string; hr_max: number | null; watts_max: number | null; pace_max_s_km: number | null }>
  }
  comparaison: {
    status: string
    ecart_ftp_pct: number | null
    detail: string
    impact: string
    recommandation: string
  }
  zone_drift: { detected: boolean; delta_bpm: number | null; detail: string }
  methode_estimation: string
  sources: string[]
  actions_suggerees: string[]
}

function EstimerZonesFlow({ onCancel, onRecordConv }: {
  onCancel: () => void
  onRecordConv?: (userMsg: string, aiMsg: string) => void
}) {
  const [phase, setPhase] = useState<'sport' | 'gate' | 'generating' | 'result'>('sport')
  const [selectedSport, setSelectedSport] = useState<string | null>(null)
  const [userSports, setUserSports] = useState<string[]>([])
  const [loadingSports, setLoadingSports] = useState(true)
  const [gateData, setGateData] = useState<{
    activitiesCount: number
    testsCount: number
    currentZonesDate: string | null
    activities: ActivityRowZones[]
    tests: unknown[]
    currentZones: unknown
    zonesHistory: unknown[]
    profile: unknown
  } | null>(null)
  const [loadingGate, setLoadingGate] = useState(false)
  const [result, setResult] = useState<ZoneEstimationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoadingSports(true)
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { setLoadingSports(false); return }
        const { data } = await sb.from('user_profiles').select('sports').eq('user_id', user.id).maybeSingle()
        const sports = (data?.sports as string[] | null) ?? []
        setUserSports(sports.length > 0 ? sports : ['running', 'cycling', 'hyrox', 'gym'])
      } catch {
        setUserSports(['running', 'cycling', 'hyrox', 'gym'])
      } finally {
        setLoadingSports(false)
      }
    })()
  }, [])

  async function handleSportSelect(sport: string) {
    setSelectedSport(sport)
    setLoadingGate(true)
    setPhase('gate')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setLoadingGate(false); return }

      const now = new Date()
      const since3months = new Date(now); since3months.setMonth(now.getMonth() - 3)
      const since6months = new Date(now); since6months.setMonth(now.getMonth() - 6)

      // TODO: inject injuries when table exists
      const sportVariantsGate = sport.toLowerCase().includes('cycl') || sport.toLowerCase().includes('bike') || sport.toLowerCase().includes('vélo')
        ? ['cycling', 'bike', 'Ride', 'virtual_ride', 'VirtualRide', sport]
        : sport.toLowerCase().includes('run') || sport.toLowerCase().includes('trail')
          ? ['running', 'run', 'Run', 'trail', 'trail_run', sport]
          : [sport]

      // safeGate : vérifie r.error Supabase + catch JS
      const safeGate = async <T,>(p: PromiseLike<{ data: T | null; error: unknown }>, fb: T): Promise<{ data: T }> => {
        try { const r = await p; return { data: r.error ? fb : (r.data ?? fb) } } catch { return { data: fb } }
      }

      const [currentZonesRes, zonesHistoryRes, testsRes, activitiesRes, profileRes] = await Promise.all([
        safeGate(sb.from('training_zones').select('*').eq('user_id', user.id).in('sport', sportVariantsGate).eq('is_current', true).limit(1).then(r => ({ data: r.data?.[0] ?? null, error: r.error })), null),
        safeGate(sb.from('training_zones').select('id,created_at,ftp_watts,lthr,vma_ms,threshold_pace_s_km').eq('user_id', user.id).in('sport', sportVariantsGate).order('created_at', { ascending: false }), []),
        // test_results peut ne pas exister (404) — retourner [] directement
        Promise.resolve({ data: [] as never[] }),
        safeGate(sb.from('activities').select('started_at,moving_time_s,distance_m,avg_hr,avg_watts,avg_pace_s_km,tss,intensity_factor,aerobic_decoupling,avg_cadence,is_race').eq('user_id', user.id).in('sport_type', sportVariantsGate).gte('started_at', since3months.toISOString()).order('started_at', { ascending: false }).limit(50), []),
        safeGate(sb.from('athlete_performance_profile').select('ftp,lthr,vma,css,vo2max,weight_kg').eq('user_id', user.id).maybeSingle(), null),
      ])

      const currentZonesDate = (currentZonesRes.data as Record<string, unknown> | null)?.created_at as string | null ?? null
      setGateData({
        activitiesCount: activitiesRes.data?.length ?? 0,
        testsCount: testsRes.data?.length ?? 0,
        currentZonesDate,
        activities: (activitiesRes.data ?? []) as ActivityRowZones[],
        tests: testsRes.data ?? [],
        currentZones: currentZonesRes.data,
        zonesHistory: zonesHistoryRes.data ?? [],
        profile: profileRes.data,
      })
    } catch {
      setGateData(null)
    } finally {
      setLoadingGate(false)
    }
  }

  async function generate() {
    if (!selectedSport || !gateData) return
    setPhase('generating')
    setError(null)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('Non authentifié')

      const ftpEstimated = estimateFTP(gateData.activities)
      const lthrEstimated = estimateLTHR(gateData.activities)
      const zoneDrift = detectZoneDrift(gateData.activities)
      const hasRecentTest = gateData.testsCount > 0
      const confidence = computeConfidence(gateData.testsCount, gateData.activitiesCount, hasRecentTest)

      const zonesDateStr = gateData.currentZonesDate
        ? new Date(gateData.currentZonesDate).toLocaleDateString('fr-FR')
        : 'non configurées'

      const systemPrompt = `Tu es un expert en physiologie du sport et calcul de zones d'entraînement.

SPORT : ${selectedSport}
DONNÉES SOURCE : ${gateData.activitiesCount} activités (3 mois) | ${gateData.testsCount} tests récents (6 mois)

ESTIMATION CALCULÉE CÔTÉ CLIENT :
FTP estimé (vélo) : ${ftpEstimated !== null ? ftpEstimated + 'W' : 'null'}
LTHR estimé : ${lthrEstimated !== null ? lthrEstimated + 'bpm' : 'null'}
Méthode : algorithme client (top 5% watts × 0.95 pour FTP ; FC moyenne sessions IF≥0.9 × 1.02 pour LTHR)

ZONES ACTUELLEMENT CONFIGURÉES : ${gateData.currentZones ? JSON.stringify(gateData.currentZones) : 'aucune'} (configurées le ${zonesDateStr})
HISTORIQUE ZONES : ${JSON.stringify(gateData.zonesHistory)}
PROFIL PHYSIOLOGIQUE : ${JSON.stringify(gateData.profile)}
TESTS RÉCENTS : ${JSON.stringify(gateData.tests)}

ZONE DRIFT ANALYSIS : ${JSON.stringify(zoneDrift)}

RÈGLE ABSOLUE : Ne survends JAMAIS la précision.
- Si tests disponibles : les utiliser comme source primaire, dire "basé sur ton test du {date}"
- Si estimation depuis activités : dire EXPLICITEMENT "estimation sans test — niveau de confiance modéré — un test ${selectedSport} donnerait un résultat plus précis"
- Si données insuffisantes : NE PAS donner de valeurs, rediriger vers un test

FORMAT DE RÉPONSE OBLIGATOIRE (JSON uniquement, 0 texte avant ou après) :
{
  "confiance": "élevé|modéré|insuffisant",
  "raison_confiance": "...",
  "estimation": {
    "ftp": null_ou_nombre,
    "lthr": null_ou_nombre,
    "vma_kmh": null_ou_nombre,
    "zones": [
      { "id": "Z1", "label": "Récupération active", "hr_max": null_ou_nombre, "watts_max": null_ou_nombre, "pace_max_s_km": null_ou_nombre }
    ]
  },
  "comparaison": {
    "status": "obsolètes|a_jour|inconnues",
    "ecart_ftp_pct": null_ou_nombre,
    "detail": "...",
    "impact": "...",
    "recommandation": "..."
  },
  "zone_drift": {
    "detected": false,
    "delta_bpm": null_ou_nombre,
    "detail": "..."
  },
  "methode_estimation": "...",
  "sources": ["..."],
  "actions_suggerees": ["Mettre à jour mes zones manuellement dans Performance → Zones", "..."]
}`

      const res = await fetch('/api/coach-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'central',
          modelId: 'athena',
          messages: [{ role: 'user', content: systemPrompt }],
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      // Collect SSE text chunks
      const reader = res.body?.getReader()
      if (!reader) throw new Error('No body')
      const decoder = new TextDecoder()
      let raw = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const d = line.slice(6).trim()
            if (d === '[DONE]') break
            try { raw += JSON.parse(d) as string } catch { /* skip */ }
          }
        }
      }

      // Parse JSON from raw text — robuste contre guillemets simples et troncature
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Réponse non parseable')
      let fixedJson = jsonMatch[0]
      let parsed: ZoneEstimationResult
      try {
        parsed = JSON.parse(fixedJson) as ZoneEstimationResult
      } catch {
        // Guillemets simples → doubles
        fixedJson = fixedJson.replace(/(?<=[\{,:\[]\s*)'([^']*?)'(?=\s*[:,\}\]])/g, '"$1"')
        try {
          parsed = JSON.parse(fixedJson) as ZoneEstimationResult
        } catch {
          // Fermer les structures tronquées
          let b = 0, br = 0, inS = false, esc = false
          for (const c of fixedJson) {
            if (esc) { esc = false; continue } if (c === '\\') { esc = true; continue }
            if (c === '"') { inS = !inS; continue } if (inS) continue
            if (c === '{') b++; if (c === '}') b--
            if (c === '[') br++; if (c === ']') br--
          }
          fixedJson += ']'.repeat(Math.max(0, br)) + '}'.repeat(Math.max(0, b))
          try {
            parsed = JSON.parse(fixedJson) as ZoneEstimationResult
          } catch {
            throw new Error('JSON invalide : ' + fixedJson.slice(0, 200) + '...')
          }
        }
      }
      setResult(parsed)
      if (onRecordConv) {
        const userMsg = `Estimer mes zones — ${selectedSport}`
        const aiMsg = `Confiance : ${parsed.confiance} — ${parsed.raison_confiance}\n${parsed.methode_estimation}`
        onRecordConv(userMsg, aiMsg)
      }
      setPhase('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de génération')
      setPhase('gate')
    }
  }

  const SPORT_LABELS: Record<string, string> = { running: 'Running', cycling: 'Vélo', hyrox: 'Hyrox', gym: 'Gym' }
  const confidenceColor = (c: ConfidenceLevel) => c === 'élevé' ? '#22c55e' : c === 'modéré' ? '#f97316' : '#ef4444'
  const confidenceBg = (c: ConfidenceLevel) => c === 'élevé' ? 'rgba(34,197,94,0.1)' : c === 'modéré' ? 'rgba(249,115,22,0.1)' : 'rgba(239,68,68,0.1)'

  function fmtPace(s: number | null): string {
    if (s == null) return '—'
    const m = Math.floor(s / 60); const sec = Math.round(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}/km`
  }

  // ── Phase sport ──
  if (phase === 'sport') {
    return (
      <div style={{ padding: '8px 0 4px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 5px', fontFamily: 'Syne,sans-serif' }}>
          Estimer mes zones
        </p>
        <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 14px' }}>
          Choisir le sport pour lequel estimer tes zones
        </p>
        {loadingSports ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(0,200,224,0.2)', borderTop: '2px solid var(--ai-accent)', animation: 'ai_spin 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
            {userSports.map(s => (
              <button key={s} onClick={() => { void handleSportSelect(s) }} style={{
                padding: '7px 13px', borderRadius: 20,
                border: '1px solid var(--ai-border)',
                background: 'var(--ai-bg2)',
                color: 'var(--ai-mid)',
                fontSize: 12, cursor: 'pointer',
                fontFamily: 'DM Sans,sans-serif',
              }}>
                {SPORT_LABELS[s] ?? s}
              </button>
            ))}
          </div>
        )}
        <button onClick={onCancel} style={{ display: 'block', margin: '4px auto 0', fontSize: 11, color: 'var(--ai-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
          Annuler
        </button>
      </div>
    )
  }

  // ── Phase gate ──
  if (phase === 'gate') {
    if (loadingGate) {
      return (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(0,200,224,0.2)', borderTop: '2px solid var(--ai-accent)', animation: 'ai_spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 12, color: 'var(--ai-dim)', margin: 0 }}>Chargement de tes données…</p>
        </div>
      )
    }
    if (!gateData) {
      return (
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: 12, color: '#ef4444', margin: '0 0 12px' }}>Erreur de chargement des données.</p>
          <button onClick={() => setPhase('sport')} style={{ fontSize: 12, color: 'var(--ai-accent)', background: 'none', border: 'none', cursor: 'pointer' }}>Retour</button>
        </div>
      )
    }
    const isBlocked = gateData.activitiesCount < 5 && gateData.testsCount === 0
    return (
      <div style={{ padding: '8px 0 4px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 14px', fontFamily: 'Syne,sans-serif' }}>
          Estimer mes zones — {SPORT_LABELS[selectedSport ?? ''] ?? selectedSport}
        </p>
        {isBlocked ? (
          <div style={{ padding: '12px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 14 }}>
            <p style={{ fontSize: 12, color: '#ef4444', margin: 0, lineHeight: 1.6 }}>
              Pas assez de données pour estimer tes zones ({gateData.activitiesCount} activité(s) disponible(s), minimum 5 requises). Pour obtenir des zones précises : réalise un test dans Performance → Tests, ou saisis tes valeurs manuellement dans Performance → Zones.
            </p>
          </div>
        ) : (
          <>
            <div style={{ padding: '12px', borderRadius: 10, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)', marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>
                Données disponibles pour l&apos;estimation
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--ai-mid)' }}>Activités (3 mois)</span>
                  <span style={{ color: 'var(--ai-text)', fontWeight: 600 }}>{gateData.activitiesCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--ai-mid)' }}>Tests récents (6 mois)</span>
                  <span style={{ color: 'var(--ai-text)', fontWeight: 600 }}>{gateData.testsCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--ai-mid)' }}>Zones actuelles</span>
                  <span style={{ color: 'var(--ai-text)', fontWeight: 600 }}>
                    {gateData.currentZonesDate
                      ? `configurées le ${new Date(gateData.currentZonesDate).toLocaleDateString('fr-FR')}`
                      : 'non configurées'}
                  </span>
                </div>
              </div>
            </div>
            {error && <p style={{ fontSize: 11, color: '#ef4444', margin: '0 0 10px' }}>{error}</p>}
            <button onClick={() => { void generate() }} style={{
              width: '100%', padding: '11px', borderRadius: 10,
              background: 'var(--ai-gradient)', border: 'none',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Syne,sans-serif',
            }}>
              Estimer mes zones
            </button>
          </>
        )}
        <button onClick={() => setPhase('sport')} style={{ display: 'block', margin: '8px auto 0', fontSize: 11, color: 'var(--ai-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
          Retour
        </button>
      </div>
    )
  }

  // ── Phase generating ──
  if (phase === 'generating') {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(0,200,224,0.15)', borderTop: '3px solid var(--ai-accent)', animation: 'ai_spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 6px', fontFamily: 'Syne,sans-serif' }}>
          Estimation en cours…
        </p>
        <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: 0, lineHeight: 1.6 }}>
          Analyse de tes activités, tests et historique de zones
        </p>
      </div>
    )
  }

  // ── Phase result ──
  if (!result) return null
  return (
    <div style={{ padding: '4px 0' }}>
      {/* Confidence badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
          background: confidenceBg(result.confiance),
          color: confidenceColor(result.confiance),
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          Confiance {result.confiance}
        </span>
        <span style={{ fontSize: 11, color: 'var(--ai-mid)' }}>{result.raison_confiance}</span>
      </div>

      {/* Zone table */}
      {result.estimation.zones.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 0 8px' }}>
            Zones estimées
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {result.estimation.zones.map((z, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ai-accent)', fontFamily: 'DM Mono,monospace', minWidth: 24 }}>{z.id}</span>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--ai-text)', fontWeight: 500 }}>{z.label}</span>
                {z.hr_max != null && <span style={{ fontSize: 11, color: 'var(--ai-mid)', fontFamily: 'DM Mono,monospace' }}>{z.hr_max} bpm</span>}
                {z.watts_max != null && <span style={{ fontSize: 11, color: 'var(--ai-mid)', fontFamily: 'DM Mono,monospace' }}>{z.watts_max}W</span>}
                {z.pace_max_s_km != null && <span style={{ fontSize: 11, color: 'var(--ai-mid)', fontFamily: 'DM Mono,monospace' }}>{fmtPace(z.pace_max_s_km)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison vs current zones */}
      {result.comparaison && (
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)', marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 0 6px' }}>
            Comparaison zones actuelles
          </p>
          <p style={{ fontSize: 12, color: 'var(--ai-text)', margin: '0 0 4px' }}>{result.comparaison.detail}</p>
          <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: '0 0 4px' }}>{result.comparaison.impact}</p>
          <p style={{ fontSize: 11, color: 'var(--ai-accent)', margin: 0, fontWeight: 600 }}>{result.comparaison.recommandation}</p>
        </div>
      )}

      {/* Zone drift */}
      {result.zone_drift && (
        <div style={{ padding: '10px 12px', borderRadius: 10, background: result.zone_drift.detected ? 'rgba(249,115,22,0.08)' : 'var(--ai-bg2)', border: `1px solid ${result.zone_drift.detected ? 'rgba(249,115,22,0.25)' : 'var(--ai-border)'}`, marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: result.zone_drift.detected ? '#f97316' : 'var(--ai-dim)', margin: '0 0 4px' }}>
            Dérive de zones{result.zone_drift.detected ? ' détectée' : ''}
          </p>
          <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: 0, lineHeight: 1.5 }}>{result.zone_drift.detail}</p>
        </div>
      )}

      {/* Method + sources */}
      <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)', marginBottom: 14 }}>
        <p style={{ fontSize: 10, color: 'var(--ai-dim)', margin: '0 0 2px', fontStyle: 'italic' }}>Méthode : {result.methode_estimation}</p>
        <p style={{ fontSize: 10, color: 'var(--ai-dim)', margin: 0 }}>Sources : {result.sources.join(' · ')}</p>
      </div>

      {/* Actions suggerees */}
      {result.actions_suggerees.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 0 6px' }}>
            Actions suggérées
          </p>
          {result.actions_suggerees.map((a, i) => (
            <p key={i} style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 4px', paddingLeft: 10 }}>• {a}</p>
          ))}
        </div>
      )}

      <button onClick={onCancel} style={{ display: 'block', margin: '4px auto 0', fontSize: 11, color: 'var(--ai-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
        Fermer
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// FLOW — AnalyserProgressionFlow
// ══════════════════════════════════════════════════════════════

type ProgressionActivity = {
  id: string
  sport_type: string
  started_at: string
  distance_m: number | null
  moving_time_s: number | null
  avg_hr: number | null
  max_hr: number | null
  avg_watts: number | null
  avg_pace_s_km: number | null
  tss: number | null
  intensity_factor: number | null
  aerobic_decoupling: number | null
  avg_cadence: number | null
  is_race: boolean | null
}

type ProgressionResult = {
  periode: string
  score_progression_global: number
  sports_analyses: Array<{
    sport: string
    score_progression: number
    tendance: string
    progressions_visibles: Array<{ metrique: string; debut: string; fin: string; delta_pct: number }>
    progressions_invisibles: Array<{ metrique: string; detail: string; significance: string }>
    stagnations: Array<{ domaine: string; depuis: string; hypothese: string }>
  }>
  insight_principal: string
  recommandations: Array<{ priorite: number; action: string; impact_estime: string }>
  sources: string[]
  confiance: string
  raison_confiance: string
}

function monthlyTssDensity(acts: ProgressionActivity[]): Record<string, number> {
  const result: Record<string, number> = {}
  acts.forEach(a => {
    const month = a.started_at.substring(0, 7)
    result[month] = (result[month] ?? 0) + (a.tss ?? 0)
  })
  return result
}

function AnalyserProgressionFlow({ onCancel, onRecordConv }: {
  onCancel: () => void
  onRecordConv?: (userMsg: string, aiMsg: string) => void
}) {
  const [phase, setPhase] = useState<'config' | 'generating' | 'result'>('config')
  const [period, setPeriod] = useState<3 | 6 | 12>(3)
  const [userSports, setUserSports] = useState<string[]>([])
  const [selectedSports, setSelectedSports] = useState<string[]>([])
  const [loadingSports, setLoadingSports] = useState(true)
  const [gateCount, setGateCount] = useState<number | null>(null)
  const [checkingGate, setCheckingGate] = useState(false)
  const [result, setResult] = useState<ProgressionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoadingSports(true)
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { setLoadingSports(false); return }
        const { data } = await sb.from('user_profiles').select('sports').eq('user_id', user.id).maybeSingle()
        const sports = (data?.sports as string[] | null) ?? []
        const list = sports.length > 0 ? sports : ['running', 'cycling', 'hyrox', 'gym']
        setUserSports(list)
        setSelectedSports(list)
      } catch {
        setUserSports(['running', 'cycling', 'hyrox', 'gym'])
        setSelectedSports(['running', 'cycling', 'hyrox', 'gym'])
      } finally {
        setLoadingSports(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (selectedSports.length === 0) { setGateCount(null); return }
    setCheckingGate(true)
    void (async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { setCheckingGate(false); return }
        const startDate = new Date(); startDate.setMonth(startDate.getMonth() - period)
        const { count } = await sb.from('activities').select('id', { count: 'exact', head: true }).eq('user_id', user.id).in('sport_type', selectedSports).gte('started_at', startDate.toISOString())
        setGateCount(count ?? 0)
      } catch {
        setGateCount(null)
      } finally {
        setCheckingGate(false)
      }
    })()
  }, [selectedSports, period])

  function toggleSport(s: string) {
    setSelectedSports(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  async function generate() {
    if (selectedSports.length === 0) return
    setPhase('generating')
    setError(null)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('Non authentifié')

      const startDate = new Date(); startDate.setMonth(startDate.getMonth() - period)
      const today = new Date().toISOString().split('T')[0]

      // TODO: inject injuries when table exists
      const safeProgQ = async <T,>(p: PromiseLike<{ data: T | null; error: unknown }>, fb: T): Promise<{ data: T }> => {
        try { const r = await p; return { data: r.error ? fb : (r.data ?? fb) } } catch { return { data: fb } }
      }
      const [activitiesRes, testsRes, zonesHistoryRes, profileRes] = await Promise.all([
        safeProgQ(sb.from('activities').select('id,sport_type,started_at,distance_m,moving_time_s,avg_hr,max_hr,avg_watts,avg_pace_s_km,tss,intensity_factor,aerobic_decoupling,avg_cadence,is_race').eq('user_id', user.id).in('sport_type', selectedSports).gte('started_at', startDate.toISOString()).order('started_at', { ascending: true }), [] as never[]),
        // test_results peut ne pas exister (404) → [] directement
        Promise.resolve({ data: [] as never[] }),
        safeProgQ(sb.from('training_zones').select('ftp_watts,lthr,vma_ms,threshold_pace_s_km,created_at,sport').eq('user_id', user.id).in('sport', selectedSports).order('created_at', { ascending: true }), [] as never[]),
        safeProgQ(sb.from('athlete_performance_profile').select('*').eq('user_id', user.id).maybeSingle(), null),
      ])

      const activities = (activitiesRes.data ?? []) as ProgressionActivity[]
      const tssDensity = monthlyTssDensity(activities)

      const systemPrompt = `Tu es un expert en analyse de progression sportive. Détecte les progressions VISIBLES et INVISIBLES.

PÉRIODE : ${startDate.toISOString().split('T')[0]} → ${today} (${period} mois)
SPORTS : ${selectedSports.join(', ')}
DONNÉES : ${activities.length} activités | ${testsRes.data?.length ?? 0} tests

ACTIVITÉS (chronologique) : ${JSON.stringify(activities)}
TESTS : ${JSON.stringify(testsRes.data ?? [])}
HISTORIQUE ZONES : ${JSON.stringify(zonesHistoryRes.data ?? [])}
PROFIL : ${JSON.stringify(profileRes.data)}
TSS MENSUEL : ${JSON.stringify(tssDensity)}

ANALYSE OBLIGATOIRE EN 2 DIMENSIONS :

PROGRESSIONS VISIBLES : records personnels, meilleure allure, meilleur FTP, etc.

PROGRESSIONS INVISIBLES (le plus important) :
- FC à même allure/watts sur différentes périodes → efficacité aérobie
- Aerobic decoupling qui baisse → meilleure endurance
- Même pace à FC plus basse = amélioration que l'athlète n'a pas remarquée

STAGNATIONS ET RÉGRESSIONS : détecter et formuler une hypothèse explicative.

FORMAT OBLIGATOIRE (JSON uniquement) :
{
  "periode": "...",
  "score_progression_global": 0,
  "sports_analyses": [{
    "sport": "...",
    "score_progression": 0,
    "tendance": "en_progression|stable|en_regression",
    "progressions_visibles": [{ "metrique": "...", "debut": "...", "fin": "...", "delta_pct": 0 }],
    "progressions_invisibles": [{ "metrique": "...", "detail": "...", "significance": "élevée|modérée|faible" }],
    "stagnations": [{ "domaine": "...", "depuis": "...", "hypothese": "..." }]
  }],
  "insight_principal": "...",
  "recommandations": [{ "priorite": 1, "action": "...", "impact_estime": "..." }],
  "sources": ["..."],
  "confiance": "élevé|modéré|faible",
  "raison_confiance": "..."
}`

      const res = await fetch('/api/coach-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'central',
          modelId: 'athena',
          messages: [{ role: 'user', content: systemPrompt }],
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No body')
      const decoder = new TextDecoder()
      let raw = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const d = line.slice(6).trim()
            if (d === '[DONE]') break
            try { raw += JSON.parse(d) as string } catch { /* skip */ }
          }
        }
      }

      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Réponse non parseable')
      const parsed = JSON.parse(jsonMatch[0]) as ProgressionResult
      setResult(parsed)
      if (onRecordConv) {
        const userMsg = `Analyser ma progression — ${selectedSports.join(', ')} — ${period} mois`
        const aiMsg = `Score global : ${parsed.score_progression_global}/100\n\n${parsed.insight_principal}`
        onRecordConv(userMsg, aiMsg)
      }
      setPhase('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de génération')
      setPhase('config')
    }
  }

  const SPORT_LABELS: Record<string, string> = { running: 'Running', cycling: 'Vélo', hyrox: 'Hyrox', gym: 'Gym' }
  const PERIODS: Array<{ v: 3 | 6 | 12; label: string }> = [
    { v: 3, label: '3 mois' },
    { v: 6, label: '6 mois' },
    { v: 12, label: '12 mois' },
  ]
  const tendanceColor = (t: string) => t === 'en_progression' ? '#22c55e' : t === 'en_regression' ? '#ef4444' : '#f97316'
  const tendanceLabel = (t: string) => t === 'en_progression' ? 'Progression' : t === 'en_regression' ? 'Régression' : 'Stable'
  const scoreColor = (s: number) => s >= 70 ? '#22c55e' : s >= 40 ? '#f97316' : '#ef4444'

  // ── Phase config ──
  if (phase === 'config') {
    const isGateBlocked = gateCount !== null && gateCount < 20
    return (
      <div style={{ padding: '8px 0 4px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 14px', fontFamily: 'Syne,sans-serif' }}>
          Analyser ma progression
        </p>

        {/* Period */}
        <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 8px', fontWeight: 600 }}>Période</p>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {PERIODS.map(p => (
            <button key={p.v} onClick={() => setPeriod(p.v)} style={{
              flex: 1, padding: '7px', borderRadius: 8,
              border: `1px solid ${period === p.v ? 'var(--ai-accent)' : 'var(--ai-border)'}`,
              background: period === p.v ? 'var(--ai-accent-dim)' : 'var(--ai-bg2)',
              color: period === p.v ? 'var(--ai-accent)' : 'var(--ai-mid)',
              fontSize: 12, fontWeight: period === p.v ? 700 : 400,
              cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
            }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Sports */}
        <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 8px', fontWeight: 600 }}>Sports</p>
        {loadingSports ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(0,200,224,0.2)', borderTop: '2px solid var(--ai-accent)', animation: 'ai_spin 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {userSports.map(s => {
              const on = selectedSports.includes(s)
              return (
                <button key={s} onClick={() => toggleSport(s)} style={{
                  padding: '6px 12px', borderRadius: 18,
                  border: `1px solid ${on ? 'var(--ai-accent)' : 'var(--ai-border)'}`,
                  background: on ? 'var(--ai-accent-dim)' : 'var(--ai-bg2)',
                  color: on ? 'var(--ai-accent)' : 'var(--ai-mid)',
                  fontSize: 12, fontWeight: on ? 600 : 400,
                  cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
                }}>
                  {SPORT_LABELS[s] ?? s}
                </button>
              )
            })}
          </div>
        )}

        {/* Gate check */}
        {checkingGate && (
          <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 10px' }}>Vérification des données…</p>
        )}
        {isGateBlocked && !checkingGate && (
          <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: '#ef4444', margin: 0, lineHeight: 1.5 }}>
              Pas assez de données ({gateCount} activités) pour une tendance significative. Il faut au moins 20 activités.
            </p>
          </div>
        )}
        {!isGateBlocked && !checkingGate && gateCount !== null && (
          <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 10px' }}>{gateCount} activités disponibles sur la période</p>
        )}

        {error && <p style={{ fontSize: 11, color: '#ef4444', margin: '0 0 10px' }}>{error}</p>}

        <button
          onClick={() => { void generate() }}
          disabled={selectedSports.length === 0 || isGateBlocked || checkingGate}
          style={{
            width: '100%', padding: '11px', borderRadius: 10, border: 'none',
            background: (selectedSports.length > 0 && !isGateBlocked && !checkingGate) ? 'var(--ai-gradient)' : 'var(--ai-border)',
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: (selectedSports.length > 0 && !isGateBlocked && !checkingGate) ? 'pointer' : 'not-allowed',
            fontFamily: 'Syne,sans-serif',
          }}
        >
          Analyser
        </button>
        <button onClick={onCancel} style={{ display: 'block', margin: '8px auto 0', fontSize: 11, color: 'var(--ai-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
          Annuler
        </button>
      </div>
    )
  }

  // ── Phase generating ──
  if (phase === 'generating') {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(0,200,224,0.15)', borderTop: '3px solid var(--ai-accent)', animation: 'ai_spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 6px', fontFamily: 'Syne,sans-serif' }}>
          Analyse de progression…
        </p>
        <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: 0, lineHeight: 1.6 }}>
          Détection des progressions visibles et invisibles
        </p>
      </div>
    )
  }

  // ── Phase result ──
  if (!result) return null

  const circumference = 2 * Math.PI * 34
  const dashOffset = circumference * (1 - result.score_progression_global / 100)
  const sc = scoreColor(result.score_progression_global)

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Score gauge + insight */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
        <svg width="80" height="80" viewBox="0 0 80 80" style={{ flexShrink: 0 }}>
          <circle cx="40" cy="40" r="34" fill="none" stroke="var(--ai-border)" strokeWidth="5" />
          <circle cx="40" cy="40" r="34" fill="none" stroke={sc} strokeWidth="5"
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            strokeLinecap="round" transform="rotate(-90 40 40)" />
          <text x="40" y="44" textAnchor="middle" fontSize="16" fontWeight="700" fill={sc} fontFamily="Syne,sans-serif">
            {result.score_progression_global}
          </text>
          <text x="40" y="55" textAnchor="middle" fontSize="8" fill="var(--ai-dim)" fontFamily="DM Sans,sans-serif">
            /100
          </text>
        </svg>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 0 5px' }}>
            Insight principal
          </p>
          <p style={{ fontSize: 12, color: 'var(--ai-text)', margin: 0, lineHeight: 1.6, fontWeight: 500 }}>
            {result.insight_principal}
          </p>
        </div>
      </div>

      {/* Per-sport analysis */}
      {result.sports_analyses.map((sa, i) => (
        <div key={i} style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 10, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ai-text)', textTransform: 'capitalize' }}>{sa.sport}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: `${tendanceColor(sa.tendance)}18`, color: tendanceColor(sa.tendance) }}>
              {tendanceLabel(sa.tendance)}
            </span>
          </div>
          {sa.progressions_visibles.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <p style={{ fontSize: 10, color: 'var(--ai-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>Progrès visibles</p>
              {sa.progressions_visibles.map((pv, j) => (
                <p key={j} style={{ fontSize: 11, color: '#22c55e', margin: '0 0 2px' }}>
                  {pv.metrique} : {pv.debut} → {pv.fin} ({pv.delta_pct > 0 ? '+' : ''}{pv.delta_pct}%)
                </p>
              ))}
            </div>
          )}
          {sa.progressions_invisibles.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <p style={{ fontSize: 10, color: 'var(--ai-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>Progrès invisibles</p>
              {sa.progressions_invisibles.map((pi, j) => (
                <p key={j} style={{ fontSize: 11, color: 'var(--ai-mid)', margin: '0 0 2px', lineHeight: 1.4 }}>
                  {pi.metrique} — {pi.detail} <span style={{ color: pi.significance === 'élevée' ? '#22c55e' : pi.significance === 'modérée' ? '#f97316' : 'var(--ai-dim)', fontWeight: 600 }}>({pi.significance})</span>
                </p>
              ))}
            </div>
          )}
          {sa.stagnations.length > 0 && (
            <div>
              <p style={{ fontSize: 10, color: 'var(--ai-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>Stagnations</p>
              {sa.stagnations.map((st, j) => (
                <p key={j} style={{ fontSize: 11, color: '#f97316', margin: '0 0 2px', lineHeight: 1.4 }}>
                  {st.domaine} (depuis {st.depuis}) — {st.hypothese}
                </p>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Recommandations */}
      {result.recommandations.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 0 6px' }}>
            Recommandations
          </p>
          {result.recommandations.sort((a, b) => a.priorite - b.priorite).map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, padding: '8px 10px', borderRadius: 8, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--ai-accent)', background: 'var(--ai-accent-dim)', borderRadius: 4, padding: '2px 5px', alignSelf: 'flex-start', flexShrink: 0 }}>P{r.priorite}</span>
              <div>
                <p style={{ fontSize: 12, color: 'var(--ai-text)', margin: '0 0 2px', fontWeight: 500 }}>{r.action}</p>
                <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: 0 }}>{r.impact_estime}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sources + confiance */}
      <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)', marginBottom: 14 }}>
        <p style={{ fontSize: 10, color: 'var(--ai-dim)', margin: '0 0 2px', fontStyle: 'italic' }}>Confiance : {result.confiance} — {result.raison_confiance}</p>
        <p style={{ fontSize: 10, color: 'var(--ai-dim)', margin: 0 }}>Sources : {result.sources.join(' · ')}</p>
      </div>

      <button onClick={onCancel} style={{ display: 'block', margin: '4px auto 0', fontSize: 11, color: 'var(--ai-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
        Fermer
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// FLOW — StrategieCourseFlow
// ══════════════════════════════════════════════════════════════

type PlannedRaceOption2 = {
  id: string
  name: string
  sport: string         // DB values: 'run'|'bike'|'swim'|'hyrox'|'triathlon'|'rowing'
  date: string
  level?: string
  goal?: string
  goal_time?: string | null
  run_distance?: string | null   // ex: 'Marathon', '10km', 'Semi'
  tri_distance?: string | null   // ex: '70.3', 'Ironman', 'M', 'S'
  goal_swim_time?: string | null
  goal_bike_time?: string | null
  goal_run_time?: string | null
}

interface CourseProfile {
  total_distance_km: number
  total_denivele_pos: number
  total_denivele_neg: number
  altitude_min: number
  altitude_max: number
  segments: Array<{
    start_km: number
    end_km: number
    distance_km: number
    ele_start: number
    ele_end: number
    denivele: number
    pente_moyenne_pct: number
    type: 'montee' | 'descente' | 'plat'
    description: string
    categorie?: 'HC' | '1' | '2' | '3' | '4' | null
  }>
  major_climbs: Array<{
    start_km: number
    end_km: number
    distance_km: number
    denivele: number
    pente_moyenne_pct: number
    pente_max_pct: number
    altitude_max: number
    categorie: 'HC' | '1' | '2' | '3' | '4'
  }>
  elevation_profile: Array<{ dist_km: number; ele: number }>
}

type RaceScenario = {
  nom: 'conservateur' | 'optimal' | 'agressif'
  objectif_temps: string
  probabilite: number
  strategie_sections: Array<{ section: string; allure_cible: string | null; watts_cibles: number | null; zone: string; pourcentage_ftp: number | null; rpe_cible: string; conseil: string }>
  nutrition_course: Array<{ timing: string; glucides_g: number; hydratation_ml: number; conseil: string }>
  gestion_effort: { depart: string; milieu: string; final_20pct: string }
  plan_b: { declencheur: string; action: string; objectif_fallback: string }
  points_cles: string[]
}

type MeteoImpact = {
  condition: string
  impact: string
  ajustement_allure: string | null
  conseil: string
}

type StrategieResult = {
  verdict_objectif: { status: string; confiance: number; detail: string }
  forme_au_jour_j: { tsb_actuel: number | null; tsb_projete: number | null; methode: string; verdict: string; risque: string }
  scenarios: RaceScenario[]
  meteo_impacts: MeteoImpact[]
  triathlon_repartition: {
    natation: { objectif: string; conseil: string } | null
    velo: { objectif: string; conseil: string } | null
    cap: { objectif: string; conseil: string } | null
  } | null
  sources: string[]
  confiance: string
  raison_confiance: string
}

interface RaceStrategyData {
  result: StrategieResult
  raceName: string
  raceSport: string
  raceDate: string
  goalTime: string
}

async function generateRacePDF(
  raceName: string,
  raceDate: string,
  raceSport: string,
  raceDistKm: string,
  raceDenivele: number | null,
  scenario: RaceScenario,
  meteoImpacts: MeteoImpact[],
  courseProfile: CourseProfile | null,
  triRepartition: StrategieResult['triathlon_repartition'],
  verdictObjectif: StrategieResult['verdict_objectif'],
) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as any
  const pageW = doc.internal.pageSize.getWidth() as number
  const margin = 14
  const contentW = pageW - margin * 2
  let y = margin

  const brand: [number, number, number] = [0, 200, 224]
  const dark: [number, number, number] = [26, 26, 46]
  const gray: [number, number, number] = [120, 120, 140]
  const red: [number, number, number] = [239, 68, 68]
  const green: [number, number, number] = [34, 197, 94]
  const orange: [number, number, number] = [249, 115, 22]

  function addSubtitle(text: string) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...brand)
    doc.text(text.toUpperCase(), margin, y)
    y += 5
  }

  function addText(text: string, size = 9, color: [number, number, number] = gray) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...color)
    const lines: string[] = doc.splitTextToSize(text, contentW)
    doc.text(lines, margin, y)
    y += lines.length * (size * 0.4 + 1)
  }

  function addSpacer(h = 4) { y += h }

  function checkNewPage(needed = 30) {
    if (y + needed > (doc.internal.pageSize.getHeight() as number) - margin) {
      doc.addPage()
      y = margin
    }
  }

  // ── En-tête ──
  doc.setFillColor(...brand)
  doc.rect(0, 0, pageW, 3, 'F')
  y = 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...brand)
  doc.text('THW COACHING', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...gray)
  doc.text('Tableau de marche', margin + 38, y)
  y += 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...dark)
  doc.text(raceName, margin, y)
  y += 8

  const infoLine = [raceSport, `${raceDistKm}km`, raceDenivele ? `D+ ${raceDenivele}m` : null, raceDate].filter(Boolean).join(' · ')
  addText(infoLine, 10, dark)
  addSpacer(3)

  // ── Verdict ──
  const vc = verdictObjectif.status === 'realiste' ? green : verdictObjectif.status === 'ambitieux' ? orange : red
  const vLabel = verdictObjectif.status === 'realiste' ? 'OBJECTIF RÉALISTE' : verdictObjectif.status === 'ambitieux' ? 'OBJECTIF AMBITIEUX' : 'OBJECTIF HORS DE PORTÉE'
  const scenLabel = scenario.nom === 'conservateur' ? 'Prudent' : scenario.nom === 'optimal' ? 'Optimal' : 'Agressif'
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...vc)
  doc.text(`${vLabel} · Scénario ${scenLabel} : ${scenario.objectif_temps} (${scenario.probabilite}%)`, margin, y)
  y += 5
  addText(verdictObjectif.detail, 8)
  addSpacer(3)

  doc.setDrawColor(...brand)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageW - margin, y)
  y += 5

  // ── Profil parcours (si disponible) ──
  if (courseProfile) {
    addSubtitle(`Parcours · ${courseProfile.total_distance_km}km · D+ ${courseProfile.total_denivele_pos}m · D- ${courseProfile.total_denivele_neg}m · Alt. ${courseProfile.altitude_min}–${courseProfile.altitude_max}m`)
    addSpacer(2)
  }

  // ── Tableau de marche par sections ──
  checkNewPage(40)
  addSubtitle('Tableau de marche par section')

  const sectionHeaders = ['Section', 'Allure / Watts', 'Zone', 'RPE', 'Conseil']
  const sectionRows = scenario.strategie_sections.map(s => [
    s.section,
    s.allure_cible ?? (s.watts_cibles != null ? `${s.watts_cibles}W${s.pourcentage_ftp != null ? ` (${s.pourcentage_ftp}% FTP)` : ''}` : '—'),
    s.zone,
    s.rpe_cible,
    s.conseil.length > 65 ? s.conseil.slice(0, 62) + '…' : s.conseil,
  ])

  autoTable(doc, {
    startY: y,
    head: [sectionHeaders],
    body: sectionRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 7, cellPadding: 2, font: 'helvetica', overflow: 'linebreak' },
    headStyles: { fillColor: brand, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [245, 245, 250] },
    columnStyles: {
      0: { cellWidth: 36 },
      1: { cellWidth: 28 },
      2: { cellWidth: 14 },
      3: { cellWidth: 12 },
      4: { cellWidth: 'auto' },
    },
  })
  y = (doc.lastAutoTable?.finalY ?? y) + 6

  // ── Nutrition ──
  checkNewPage(40)
  addSubtitle('Plan nutrition')

  const nutriRows = scenario.nutrition_course.map(n => [
    n.timing,
    `${n.glucides_g}g`,
    `${n.hydratation_ml}ml`,
    n.conseil.length > 70 ? n.conseil.slice(0, 67) + '…' : n.conseil,
  ])

  autoTable(doc, {
    startY: y,
    head: [['Timing', 'Glucides', 'Hydratation', 'Conseil']],
    body: nutriRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 7, cellPadding: 2, font: 'helvetica', overflow: 'linebreak' },
    headStyles: { fillColor: green, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [245, 250, 245] },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 18 },
      2: { cellWidth: 22 },
      3: { cellWidth: 'auto' },
    },
  })
  y = (doc.lastAutoTable?.finalY ?? y) + 6

  // ── Triathlon répartition ──
  if (triRepartition) {
    checkNewPage(40)
    addSubtitle('Répartition triathlon')
    const triRows = [
      triRepartition.natation ? ['🏊 Natation', triRepartition.natation.objectif, triRepartition.natation.conseil] : null,
      triRepartition.velo ? ['🚴 Vélo', triRepartition.velo.objectif, triRepartition.velo.conseil] : null,
      triRepartition.cap ? ['🏃 CAP', triRepartition.cap.objectif, triRepartition.cap.conseil] : null,
    ].filter(Boolean) as string[][]

    autoTable(doc, {
      startY: y,
      head: [['Discipline', 'Objectif', 'Conseil']],
      body: triRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 7, cellPadding: 2, font: 'helvetica', overflow: 'linebreak' },
      headStyles: { fillColor: brand, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
      columnStyles: { 0: { cellWidth: 26 }, 1: { cellWidth: 26 }, 2: { cellWidth: 'auto' } },
    })
    y = (doc.lastAutoTable?.finalY ?? y) + 6
  }

  // ── Gestion de l'effort ──
  checkNewPage(28)
  addSubtitle("Gestion de l'effort")
  addText(`Départ : ${scenario.gestion_effort.depart}`, 8, dark)
  addSpacer(1)
  addText(`Milieu : ${scenario.gestion_effort.milieu}`, 8, dark)
  addSpacer(1)
  addText(`Dernier 20% : ${scenario.gestion_effort.final_20pct}`, 8, dark)
  addSpacer(4)

  // ── Impacts météo ──
  if (meteoImpacts.length > 0) {
    checkNewPage(30)
    addSubtitle('Ajustements météo')
    const meteoRows = meteoImpacts.map(m => [
      m.condition,
      m.impact,
      m.ajustement_allure ?? '—',
      m.conseil.length > 60 ? m.conseil.slice(0, 57) + '…' : m.conseil,
    ])
    autoTable(doc, {
      startY: y,
      head: [['Condition', 'Impact', 'Allure', 'Conseil']],
      body: meteoRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 7, cellPadding: 2, font: 'helvetica', overflow: 'linebreak' },
      headStyles: { fillColor: orange, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
      columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 28 }, 2: { cellWidth: 20 }, 3: { cellWidth: 'auto' } },
    })
    y = (doc.lastAutoTable?.finalY ?? y) + 6
  }

  // ── Plan B ──
  checkNewPage(22)
  addSubtitle('Plan B')
  doc.setFillColor(255, 242, 242)
  const planBH = 18
  doc.roundedRect(margin, y - 2, contentW, planBH, 2, 2, 'F')
  addText(`Déclencheur : ${scenario.plan_b.declencheur}`, 8, red)
  addSpacer(1)
  addText(`Action : ${scenario.plan_b.action}`, 8, dark)
  addSpacer(1)
  addText(`Objectif fallback : ${scenario.plan_b.objectif_fallback}`, 8, dark)
  addSpacer(5)

  // ── Points clés ──
  if (scenario.points_cles.length > 0) {
    checkNewPage(20)
    addSubtitle('Points clés')
    scenario.points_cles.forEach(p => {
      addText(`• ${p}`, 8, dark)
      addSpacer(1)
    })
  }

  // ── Footer sur toutes les pages ──
  const totalPages = doc.getNumberOfPages() as number
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...gray)
    const pH = doc.internal.pageSize.getHeight() as number
    doc.text(`THW Coaching · ${raceName} · ${raceDate}`, margin, pH - 6)
    doc.text(`${i}/${totalPages}`, pageW - margin - 8, pH - 6)
  }

  const fileName = `THW_${raceName.replace(/[^a-zA-Z0-9]/g, '_')}_${raceDate}.pdf`
  doc.save(fileName)
}

function getRaceFollowUpActions(sport: string, result: StrategieResult): FollowUpAction[] {
  const actions: FollowUpAction[] = []
  const optimal = result.scenarios.find(s => s.nom === 'optimal') ?? result.scenarios[0]
  if (optimal) {
    actions.push({
      label: 'Plan nutrition détaillé',
      prompt: `Sur la base de la stratégie ${sport} (objectif ${optimal.objectif_temps}), donne-moi un plan nutrition ultra-précis : produits spécifiques, quantités exactes, timing, et alternatives en cas de problème gastrique.`,
    })
  }
  if (sport === 'triathlon') {
    actions.push({
      label: 'Optimiser T1/T2',
      prompt: `Donne-moi des conseils précis pour optimiser les transitions T1 (natation→vélo) et T2 (vélo→cap) en triathlon : ordre d'habillage, timing cible, erreurs fréquentes à éviter.`,
    })
  } else if (sport === 'trail') {
    actions.push({
      label: 'Stratégie bâtons',
      prompt: `Pour cette course de trail, quel est l'usage optimal des bâtons ? Quand les sortir, technique montée/descente, gestion de la fatigue des bras.`,
    })
  } else {
    actions.push({
      label: 'Semaine type J-7',
      prompt: `Sur la base de ma forme actuelle (TSB estimé ${result.forme_au_jour_j.tsb_actuel ?? 'inconnu'}), donne-moi le plan d'entraînement idéal pour les 7 jours avant la course : volumes, intensités, récupération.`,
    })
  }
  if (sport !== 'triathlon' && sport !== 'trail') {
    // already added above
  } else {
    actions.push({
      label: 'Semaine type J-7',
      prompt: `Sur la base de ma forme actuelle (TSB estimé ${result.forme_au_jour_j.tsb_actuel ?? 'inconnu'}), donne-moi le plan d'entraînement idéal pour les 7 jours avant la course.`,
    })
  }
  if (result.meteo_impacts.length > 0) {
    actions.push({
      label: 'Adapter à la météo',
      prompt: `En fonction des impacts météo identifiés (${result.meteo_impacts.map(m => m.condition).join(', ')}), comment ajuster concrètement ma tenue, mes objectifs de temps et ma stratégie d'hydratation ?`,
    })
  }
  return actions.slice(0, 4)
}

// ── Constantes catégorisation montées ─────────────────────────────────
const CLIMB_CAT_COLORS: Record<string, string> = {
  HC: '#dc2626', '1': '#ef4444', '2': '#f97316', '3': '#eab308', '4': '#84cc16',
}
const CLIMB_CAT_LABELS: Record<string, string> = {
  HC: 'HC', '1': 'Cat 1', '2': 'Cat 2', '3': 'Cat 3', '4': 'Cat 4',
}

// ── robustJsonParse — tolère les JSON tronqués ─────────────────────────
function robustJsonParse(raw: string): unknown {
  let cleaned = raw.trim()
  // 1. Nettoyer les markdown fences
  const mdMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/)
  if (mdMatch) cleaned = mdMatch[1].trim()
  // 2. Trouver le début du JSON
  const start = cleaned.search(/[{[]/)
  if (start > 0) cleaned = cleaned.slice(start)
  // 3. Essayer directement
  try { return JSON.parse(cleaned) } catch { /* continue */ }
  // 4. Réparer la troncature : compter les structures ouvertes
  let braces = 0, brackets = 0, inString = false, escaped = false
  for (const c of cleaned) {
    if (escaped) { escaped = false; continue }
    if (c === '\\') { escaped = true; continue }
    if (c === '"') { inString = !inString; continue }
    if (inString) continue
    if (c === '{') braces++; if (c === '}') braces--
    if (c === '[') brackets++; if (c === ']') brackets--
  }
  // Couper après la dernière virgule/accolade complète pour éviter les valeurs partielles
  if (braces > 0 || brackets > 0) {
    const cutPoint = Math.max(
      cleaned.lastIndexOf(','),
      cleaned.lastIndexOf('}'),
      cleaned.lastIndexOf(']'),
    )
    if (cutPoint > cleaned.length * 0.5) {
      let cut = cleaned.slice(0, cutPoint + 1)
      // Recalculer
      let b2 = 0, br2 = 0, s2 = false, e2 = false
      for (const c of cut) {
        if (e2) { e2 = false; continue }
        if (c === '\\') { e2 = true; continue }
        if (c === '"') { s2 = !s2; continue }
        if (s2) continue
        if (c === '{') b2++; if (c === '}') b2--
        if (c === '[') br2++; if (c === ']') br2--
      }
      cut += ']'.repeat(Math.max(0, br2)) + '}'.repeat(Math.max(0, b2))
      try { return JSON.parse(cut) } catch { /* continue */ }
    }
    cleaned += ']'.repeat(Math.max(0, brackets)) + '}'.repeat(Math.max(0, braces))
    try { return JSON.parse(cleaned) } catch { /* continue */ }
  }
  throw new Error(`JSON invalide : ${raw.slice(0, 100)}…`)
}

// ── parseStrategyResponse — parsing robuste incluant fallback Markdown ─
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseStrategyResponse(raw: string): any {
  let text = raw.trim()

  // Si l'IA a écrit du Markdown au lieu du JSON, extraire le JSON s'il existe
  if (/^[#*A-ZÀ-Ü]/.test(text) && !text.startsWith('{')) {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      text = jsonMatch[0]
    } else {
      // Aucun JSON — retourner un résultat minimal exploitable
      return {
        verdict_objectif: { status: 'realiste', confiance: 20, detail: text.slice(0, 500) },
        forme_au_jour_j: { tsb_actuel: null, tsb_projete: null, methode: 'estimation', verdict: 'Non disponible', risque: 'Données insuffisantes' },
        scenarios: [{
          nom: 'optimal', objectif_temps: 'N/A', probabilite: 50,
          strategie_sections: [], nutrition_course: [],
          gestion_effort: { depart: text.slice(0, 300), milieu: '', final_20pct: '' },
          plan_b: { declencheur: 'N/A', action: 'N/A', objectif_fallback: 'N/A' },
          points_cles: ['Réponse IA non structurée — relancez la génération'],
        }],
        meteo_impacts: [], triathlon_repartition: null,
        sources: [], confiance: 'faible', raison_confiance: 'Format de réponse invalide',
      }
    }
  }

  // Utiliser robustJsonParse pour le reste (markdown fences, troncature, etc.)
  return robustJsonParse(text)
}

// ── ElevationProfileChart — graphique altimétrique style Strava ────────
type ClimbWithFlag = CourseProfile['major_climbs'][0] & { isManual?: boolean }

function ElevationProfileChart({ profile, height = 140, climbs: climbsOverride }: {
  profile: CourseProfile
  height?: number
  climbs?: ClimbWithFlag[]
}) {
  const [cursorPct, setCursorPct] = useState<number | null>(null)

  const ep = profile.elevation_profile
  if (ep.length < 2) return null

  const maxDist = ep[ep.length - 1].dist_km
  const minEle = profile.altitude_min
  const maxEle = profile.altitude_max
  const range = maxEle - minEle || 1

  // Cursor data
  const cursorIdx = cursorPct !== null
    ? Math.min(ep.length - 1, Math.max(0, Math.round(cursorPct * (ep.length - 1))))
    : null
  const cursorData = cursorIdx !== null ? ep[cursorIdx] : null
  const cursorPente = cursorIdx !== null && cursorIdx > 0
    ? ((ep[cursorIdx].ele - ep[cursorIdx - 1].ele) / ((ep[cursorIdx].dist_km - ep[cursorIdx - 1].dist_km) * 1000 || 1)) * 100
    : null

  // SVG params
  const W = 1000
  const H = height
  const padL = 42
  const padR = 8
  const padT = 22
  const padB = 18
  const chartW = W - padL - padR
  const chartH = H - padT - padB

  function xFromDist(km: number) { return padL + (km / maxDist) * chartW }
  function yFromEle(ele: number) { return padT + chartH - ((ele - minEle) / range) * chartH }

  const pts = ep.map(p => `${xFromDist(p.dist_km).toFixed(1)},${yFromEle(p.ele).toFixed(1)}`)
  const fillPath = `M${padL},${padT + chartH}L${pts.join('L')}L${xFromDist(maxDist).toFixed(1)},${padT + chartH}Z`
  const linePath = `M${pts.join('L')}`

  // Distance labels
  const distStep = maxDist > 100 ? 20 : maxDist > 40 ? 10 : 5
  const distLabels: number[] = []
  for (let d = 0; d <= maxDist; d += distStep) distLabels.push(d)

  // Altitude labels
  const eleStep = range > 1000 ? 500 : range > 400 ? 200 : 100
  const eleLabels: number[] = []
  for (let e = Math.ceil(minEle / eleStep) * eleStep; e <= maxEle; e += eleStep) eleLabels.push(e)

  const majorClimbs = climbsOverride ?? (profile.major_climbs ?? [])

  return (
    <div style={{ position: 'relative', userSelect: 'none' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height, display: 'block' }}
        onMouseMove={e => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
          // Convertir clientX en fraction de la zone graphique
          const frac = (e.clientX - rect.left - (padL / W) * rect.width) / ((chartW / W) * rect.width)
          setCursorPct(Math.min(1, Math.max(0, frac)))
        }}
        onMouseLeave={() => setCursorPct(null)}
      >
        <defs>
          <linearGradient id="ele-grad-strava" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6b7280" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#6b7280" stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {/* Grid lignes horizontales altitude */}
        {eleLabels.map(e => (
          <g key={`eg-${e}`}>
            <line x1={padL} y1={yFromEle(e)} x2={W - padR} y2={yFromEle(e)}
              stroke="var(--ai-border, #333)" strokeWidth="0.5" strokeDasharray="4,4" />
            <text x={padL - 4} y={yFromEle(e) + 3} textAnchor="end" fontSize="8"
              fill="var(--ai-dim, #888)" fontFamily="DM Mono,monospace">{e}m</text>
          </g>
        ))}

        {/* Labels distance en bas */}
        {distLabels.map(d => (
          <text key={`dg-${d}`} x={xFromDist(d)} y={H - 3} textAnchor="middle" fontSize="8"
            fill="var(--ai-dim, #888)" fontFamily="DM Mono,monospace">{d}km</text>
        ))}

        {/* Encadrés montées majeures */}
        {majorClimbs.map((climb, i) => {
          const x1 = padL + (climb.start_km / maxDist) * chartW
          const x2 = padL + (climb.end_km / maxDist) * chartW
          const climbWidth = x2 - x1
          const color = CLIMB_CAT_COLORS[climb.categorie] ?? '#f97316'
          const labelText = `${CLIMB_CAT_LABELS[climb.categorie]} · ${climb.distance_km}km · ${climb.pente_moyenne_pct}%`
          const labelWidth = labelText.length * 4.5 + 12
          const labelFits = climbWidth > labelWidth
          return (
            <g key={`mc-${i}`}>
              <rect x={x1} y={padT} width={climbWidth} height={chartH} fill={color} opacity="0.07" />
              <line x1={x1} y1={padT} x2={x1} y2={padT + chartH} stroke={color} strokeWidth="1" strokeDasharray="3,2" opacity="0.5" />
              <line x1={x2} y1={padT} x2={x2} y2={padT + chartH} stroke={color} strokeWidth="1" strokeDasharray="3,2" opacity="0.5" />
              <rect
                x={labelFits ? x1 + 2 : x1}
                y={2}
                width={Math.min(labelWidth, 160)}
                height={14}
                rx={3}
                fill={color}
                opacity="0.85"
              />
              <text
                x={(labelFits ? x1 + 2 : x1) + 5}
                y={12}
                fontSize="7"
                fill="#fff"
                fontWeight="700"
                fontFamily="DM Mono, monospace"
              >
                {labelText}
              </text>
            </g>
          )
        })}

        {/* Fill + stroke du profil */}
        <path d={fillPath} fill="url(#ele-grad-strava)" />
        <path d={linePath} fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinejoin="round" />

        {/* Curseur vertical */}
        {cursorPct !== null && cursorData && (
          <g>
            <line
              x1={xFromDist(cursorData.dist_km)} y1={padT}
              x2={xFromDist(cursorData.dist_km)} y2={padT + chartH}
              stroke="var(--ai-text, #ccc)" strokeWidth="1" opacity="0.6"
            />
            <circle cx={xFromDist(cursorData.dist_km)} cy={yFromEle(cursorData.ele)} r={3.5}
              fill="var(--ai-text, #ccc)" stroke="var(--ai-bg, #111)" strokeWidth="1.5" />
          </g>
        )}
      </svg>

      {/* Tooltip flottant */}
      {cursorPct !== null && cursorData && (
        <div style={{
          position: 'absolute',
          left: `${Math.min(Math.max(cursorPct * 100, 5), 80)}%`,
          top: 0,
          transform: cursorPct > 0.7 ? 'translateX(-110%)' : 'translateX(10px)',
          background: 'var(--ai-bg, rgba(10,10,10,0.95))',
          border: '1px solid var(--ai-border)',
          borderRadius: 6,
          padding: '5px 9px',
          fontSize: 10,
          fontFamily: 'DM Mono,monospace',
          color: 'var(--ai-text, #e5e5e5)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 20,
          lineHeight: 1.8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          <div>Distance <strong>{cursorData.dist_km.toFixed(1)}km</strong></div>
          <div>Altitude <strong>{cursorData.ele}m</strong></div>
          {cursorPente !== null && (
            <div>Pente <strong style={{ color: cursorPente > 5 ? '#ef4444' : cursorPente > 2 ? '#f97316' : 'var(--ai-text)' }}>
              {cursorPente.toFixed(1)}%
            </strong></div>
          )}
        </div>
      )}
    </div>
  )
}

function StrategieCourseFlow({ onCancel, onRecordConv, onFollowUp }: {
  onCancel: () => void
  onRecordConv?: (userMsg: string, aiMsg: string, strategyData?: RaceStrategyData) => void
  onFollowUp?: (displayLabel: string, fullPrompt: string) => void
}) {
  const [phase, setPhase] = useState<'race' | 'questions' | 'context' | 'generating' | 'result'>('race')
  const [races, setRaces] = useState<PlannedRaceOption2[]>([])
  const [loadingRaces, setLoadingRaces] = useState(true)
  const [selectedRace, setSelectedRace] = useState<PlannedRaceOption2 | null>(null)
  const [manualMode, setManualMode] = useState(false)
  const [manualSport, setManualSport] = useState('running')
  const [manualDistance, setManualDistance] = useState('')
  const [manualDenivele, setManualDenivele] = useState('')
  const [manualDate, setManualDate] = useState('')
  const [manualGoalTime, setManualGoalTime] = useState('')

  // Questions
  const [profilParcours, setProfilParcours] = useState<'Plat' | 'Vallonné' | 'Montagneux' | null>(null)
  const [ressenti, setRessenti] = useState<number>(3)
  const [objectifTemps, setObjectifTemps] = useState('')
  const [altitudeMax, setAltitudeMax] = useState('')
  const [meteoScenario, setMeteoScenario] = useState<'idéal' | 'chaud' | 'froid' | 'vent' | 'pluie' | null>(null)
  const [notesLibres, setNotesLibres] = useState('')
  // Triathlon
  const [triDistance, setTriDistance] = useState<'S' | 'M' | 'L' | 'XL' | null>(null)
  const [triSwimGoal, setTriSwimGoal] = useState('')
  const [triBikeGoal, setTriBikeGoal] = useState('')
  const [triRunGoal, setTriRunGoal] = useState('')

  // Result
  const [activeScenario, setActiveScenario] = useState<'conservateur' | 'optimal' | 'agressif'>('optimal')
  const [recorded, setRecorded] = useState(false)

  // Final race info (set when generation completes, used for PDF export)
  const [finalRaceName, setFinalRaceName] = useState('')
  const [finalRaceDate, setFinalRaceDate] = useState('')
  const [finalRaceSport, setFinalRaceSport] = useState('')
  const [finalRaceDistKm, setFinalRaceDistKm] = useState('')
  const [finalRaceDenivele, setFinalRaceDenivele] = useState<number | null>(null)

  // Course file upload
  const [courseProfile, setCourseProfile] = useState<CourseProfile | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const courseFileRef = useRef<HTMLInputElement>(null)

  // Manual climbs
  const [manualClimbs, setManualClimbs] = useState<Array<{ start_km: number; end_km: number }>>([])
  const [showAddClimb, setShowAddClimb] = useState(false)
  const [newClimbStart, setNewClimbStart] = useState('')
  const [newClimbEnd, setNewClimbEnd] = useState('')

  // allClimbs = auto-détectées + manuelles, triées par km de début
  const allClimbs = useMemo((): ClimbWithFlag[] => {
    if (!courseProfile) return []
    const auto: ClimbWithFlag[] = (courseProfile.major_climbs ?? []).map(c => ({ ...c, isManual: false }))
    const manual = manualClimbs
      .map(mc => {
        const ep = courseProfile.elevation_profile
        if (ep.length < 2) return null
        const startPt = ep.reduce((best, p) => Math.abs(p.dist_km - mc.start_km) < Math.abs(best.dist_km - mc.start_km) ? p : best)
        const endPt   = ep.reduce((best, p) => Math.abs(p.dist_km - mc.end_km)   < Math.abs(best.dist_km - mc.end_km)   ? p : best)
        const distKm  = endPt.dist_km - startPt.dist_km
        const denivele = endPt.ele - startPt.ele
        if (distKm <= 0 || denivele <= 0) return null
        const penteMoy = (denivele / (distKm * 1000)) * 100
        let penteMax = 0
        const seg = ep.filter(p => p.dist_km >= mc.start_km && p.dist_km <= mc.end_km)
        for (let i = 0; i < seg.length - 1; i++) {
          const d = (seg[i + 1].dist_km - seg[i].dist_km) * 1000
          if (d > 50) { const p = ((seg[i + 1].ele - seg[i].ele) / d) * 100; if (p > penteMax) penteMax = p }
        }
        const score = distKm * penteMoy * penteMoy
        let categorie: 'HC' | '1' | '2' | '3' | '4' = '4'
        if (score > 800 || denivele > 1000) categorie = 'HC'
        else if (score > 400 || denivele > 600) categorie = '1'
        else if (score > 150 || denivele > 400) categorie = '2'
        else if (score > 50  || denivele > 200) categorie = '3'
        return {
          start_km: Math.round(startPt.dist_km * 10) / 10,
          end_km: Math.round(endPt.dist_km * 10) / 10,
          distance_km: Math.round(distKm * 10) / 10,
          denivele: Math.round(denivele),
          pente_moyenne_pct: Math.round(penteMoy * 10) / 10,
          pente_max_pct: Math.round(penteMax * 10) / 10,
          altitude_max: Math.round(endPt.ele),
          categorie,
          isManual: true,
        } satisfies ClimbWithFlag
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
    return [...auto, ...manual].sort((a, b) => a.start_km - b.start_km)
  }, [courseProfile, manualClimbs])

  // Context
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [contextData, setContextData] = useState<{
    zones: any | null
    tests: any[]
    recentActivities: any[]
    metrics14d: any[]
    pastRaces: any[]
    profile: any | null
    bestPowerActivities: any[]
    hasAtlCtl: boolean
    tsbActuel: number | null
    tsbProjecte: number | null
    tsbMethode: string
    hasZonesOrTests: boolean
  } | null>(null)
  const [loadingContext, setLoadingContext] = useState(false)

  const [result, setResult] = useState<StrategieResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoadingRaces(true)
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { setLoadingRaces(false); return }
        const today = new Date().toISOString().split('T')[0]
        const { data } = await sb.from('planned_races').select('id,name,sport,date,level,goal,goal_time,run_distance,tri_distance,goal_swim_time,goal_bike_time,goal_run_time').eq('user_id', user.id).gte('date', today).order('date', { ascending: true }).limit(10)
        setRaces((data ?? []) as PlannedRaceOption2[])
      } catch {
        setRaces([])
      } finally {
        setLoadingRaces(false)
      }
    })()
  }, [])

  const SPORT_NORMALIZE: Record<string, string> = {
    run: 'running', bike: 'cycling', swim: 'swimming',
    hyrox: 'hyrox', triathlon: 'triathlon', rowing: 'rowing', trail: 'trail',
  }

  function getRaceSport(): string {
    const raw = manualMode ? manualSport : (selectedRace?.sport ?? 'running')
    return SPORT_NORMALIZE[raw] ?? raw
  }

  function parseDistanceToMeters(race: PlannedRaceOption2): number | null {
    if (race.run_distance) {
      const map: Record<string, number> = {
        '5km': 5000, '10km': 10000, 'Semi': 21097, 'semi': 21097,
        'Marathon': 42195, 'marathon': 42195, '100km': 100000,
      }
      return map[race.run_distance] ?? (parseFloat(race.run_distance) * 1000 || null)
    }
    if (race.tri_distance) {
      const map: Record<string, number> = {
        'XS': 12500, 'S': 25750, 'M': 51500, '70.3': 113000,
        'Ironman': 226000, 'L': 113000, 'XL': 226000,
      }
      return map[race.tri_distance] ?? null
    }
    return null
  }

  function getRaceDistance(): number | null {
    if (courseProfile) return courseProfile.total_distance_km * 1000
    if (manualMode) return manualDistance ? parseFloat(manualDistance) * 1000 : null
    if (selectedRace) return parseDistanceToMeters(selectedRace)
    return null
  }

  function getRaceDenivele(): number | null {
    if (courseProfile) return courseProfile.total_denivele_pos
    if (manualMode) return manualDenivele ? parseFloat(manualDenivele) : null
    return null
  }

  function getGoalTime(): string | null {
    if (objectifTemps.trim()) return objectifTemps.trim()
    if (!manualMode && selectedRace?.goal_time) return selectedRace.goal_time
    if (manualMode && manualGoalTime.trim()) return manualGoalTime.trim()
    return null
  }

  function needsProfilQuestion(): boolean {
    if (courseProfile) return false // profil connu via le fichier uploadé
    const d = getRaceDenivele()
    return d == null || d === 0
  }

  function needsObjectifQuestion(): boolean {
    // Pour le triathlon, les objectifs par discipline suffisent
    const sport = getRaceSport()
    if (sport === 'triathlon') {
      if (triSwimGoal || triBikeGoal || triRunGoal) return false
      if (!manualMode && selectedRace) {
        if (selectedRace.goal_swim_time || selectedRace.goal_bike_time || selectedRace.goal_run_time) return false
      }
    }
    return getGoalTime() == null
  }

  async function handleCourseFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/parse-course-file', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json() as { profile?: CourseProfile; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Erreur de parsing')

      setCourseProfile(data.profile ?? null)

      // Auto-remplir distance et dénivelé si en mode manuel
      if (manualMode && data.profile) {
        setManualDistance(data.profile.total_distance_km.toFixed(1))
        setManualDenivele(data.profile.total_denivele_pos.toString())
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setUploadingFile(false)
      if (courseFileRef.current) courseFileRef.current.value = ''
    }
  }

  // ── Pré-chargement des données athlète dès la phase questions ──────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [athletePreview, setAthletePreview] = useState<{
    zones: any | null
    profile: any | null
    tests: any[]
    bestActivities: any[]
    races: any[]
  } | null>(null)

  async function preloadAthleteData() {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return

      const raceSport = getRaceSport()
      const s = raceSport.toLowerCase()
      const sportVariants: string[] = (['cycling', 'bike', 'ride', 'virtual_ride', 'virtual_bike', 'velo'].includes(s))
        ? ['cycling', 'bike', 'Ride', 'virtual_ride', 'virtual_bike', 'velo', 'VirtualRide']
        : (['running', 'run', 'trail', 'trail_run', 'course'].includes(s))
          ? ['running', 'run', 'Run', 'trail', 'trail_run', 'TrailRun']
          : (['swimming', 'swim', 'pool_swim', 'open_water'].includes(s))
            ? ['swimming', 'swim', 'pool_swim', 'open_water', 'Swim']
            : [raceSport]

      const since12m = new Date(Date.now() - 365 * 86400000).toISOString()
      // Colonnes confirmées existantes dans activities (noms réels utilisés partout dans le code)
      const safeActSel = 'id,title,sport_type,started_at,distance_m,moving_time_s,avg_hr,avg_watts,avg_pace_s_km,tss,intensity_factor,aerobic_decoupling,avg_cadence,is_race'
      const sportFilter = sportVariants.length > 0 ? sportVariants : [raceSport]

      // Chaque requête vérifiée individuellement — erreur HTTP retournée dans .error, pas throwée
      const safeQuery = async <T,>(promise: PromiseLike<{ data: T | null; error: unknown }>): Promise<T[]> => {
        try {
          const r = await promise
          if (r.error) return []
          return (r.data as T[] | null) ?? []
        } catch { return [] }
      }
      const safeQuerySingle = async <T,>(promise: PromiseLike<{ data: T | null; error: unknown }>): Promise<T | null> => {
        try {
          const r = await promise
          if (r.error) return null
          return r.data
        } catch { return null }
      }

      const [zones, profile, tests, activities, races] = await Promise.all([
        safeQuery(sb.from('training_zones').select('*').eq('user_id', user.id).in('sport', sportFilter).eq('is_current', true).limit(1)),
        safeQuerySingle(sb.from('athlete_performance_profile').select('*').eq('user_id', user.id).maybeSingle()),
        // test_results sans join (le join test_definitions peut être absent du schema cache)
        safeQuery(sb.from('test_results').select('id,date,valeurs,notes').eq('user_id', user.id).order('date', { ascending: false }).limit(10)),
        safeQuery(sb.from('activities').select(safeActSel).eq('user_id', user.id).in('sport_type', sportFilter).gte('started_at', since12m).order('started_at', { ascending: false }).limit(50)),
        safeQuery(sb.from('activities').select(safeActSel).eq('user_id', user.id).in('sport_type', sportFilter).eq('is_race', true).order('started_at', { ascending: false }).limit(50)),
      ])

      setAthletePreview({
        zones: zones[0] ?? null,
        profile,
        tests,
        bestActivities: activities,
        races,
      })
    } catch { /* silencieux */ }
  }

  // Déclenche le préchargement côté client uniquement (évite SSR 418)
  useEffect(() => {
    if (phase === 'questions' && !athletePreview) {
      void preloadAthleteData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  function getSportVariants(sport: string): string[] {
    const s = sport.toLowerCase()
    if (['cycling', 'bike', 'ride', 'virtual_ride', 'virtual_bike', 'velo'].includes(s))
      return ['cycling', 'bike', 'Ride', 'virtual_ride', 'virtual_bike', 'velo', 'VirtualRide']
    if (['running', 'run', 'trail', 'trail_run', 'course'].includes(s))
      return ['running', 'run', 'Run', 'trail', 'trail_run', 'TrailRun']
    if (['swimming', 'swim', 'pool_swim', 'open_water', 'natation'].includes(s))
      return ['swimming', 'swim', 'pool_swim', 'open_water', 'Swim']
    if (['triathlon'].includes(s)) return ['triathlon']
    return [sport, sport.toLowerCase(), sport.charAt(0).toUpperCase() + sport.slice(1)]
  }

  async function loadContext() {
    setLoadingContext(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setLoadingContext(false); return }

      const raceSport = getRaceSport()
      const isTriathlon = raceSport === 'triathlon'
      const sportVariants = isTriathlon
        ? ['running', 'run', 'Run', 'cycling', 'bike', 'Ride', 'swimming', 'swim', 'Swim']
        : getSportVariants(raceSport)
      const zonesSport = isTriathlon ? 'running' : raceSport
      const zonesSportVariants = getSportVariants(zonesSport)

      const now = new Date()
      const since12months = new Date(now); since12months.setMonth(now.getMonth() - 12)
      const since6months = new Date(now); since6months.setMonth(now.getMonth() - 6)
      const since14d = new Date(now); since14d.setDate(now.getDate() - 14)
      const since180d = new Date(now); since180d.setDate(now.getDate() - 180)

      // Colonnes confirmées existantes dans activities (noms réels du DB)
      const safeActSelect = 'id,title,sport_type,started_at,distance_m,moving_time_s,avg_hr,avg_watts,avg_pace_s_km,tss,intensity_factor,aerobic_decoupling,avg_cadence,is_race'
      const zoneFilter = zonesSportVariants.length > 0 ? zonesSportVariants : [zonesSport]
      const actFilter = sportVariants.length > 0 ? sportVariants : [raceSport]

      // Helper : vérifie .error Supabase ET catch JS — fallback propre dans les deux cas
      const safeQ = async <T,>(p: PromiseLike<{ data: T | null; error: unknown }>, fallback: T): Promise<{ data: T }> => {
        try { const r = await p; return { data: r.error ? fallback : (r.data ?? fallback) } }
        catch { return { data: fallback } }
      }

      const [zonesRes, testsRes, recentActsRes, metrics14dRes, pastRacesRes, profileRes, bestPowerRes] = await Promise.all([
        safeQ(sb.from('training_zones').select('*').eq('user_id', user.id).in('sport', zoneFilter).eq('is_current', true).limit(1)
          .then(r => ({ data: r.data?.[0] ?? null, error: r.error })), null),
        safeQ(sb.from('test_results').select('id,date,valeurs,notes').eq('user_id', user.id)
          .gte('date', since6months.toISOString().split('T')[0]).order('date', { ascending: false }).limit(20), [] as never[]),
        safeQ(sb.from('activities').select(safeActSelect).in('sport_type', actFilter)
          .gte('started_at', since12months.toISOString()).order('started_at', { ascending: false }).limit(50), [] as never[]),
        safeQ(sb.from('metrics_daily').select('*').eq('user_id', user.id)
          .gte('date', since14d.toISOString().split('T')[0]).order('date', { ascending: false }), [] as never[]),
        safeQ(sb.from('activities').select(safeActSelect).in('sport_type', actFilter)
          .eq('is_race', true).order('started_at', { ascending: false }).limit(50), [] as never[]),
        safeQ(sb.from('athlete_performance_profile').select('*').eq('user_id', user.id).maybeSingle(), null),
        safeQ(sb.from('activities').select('id,title,sport_type,started_at,moving_time_s,distance_m,avg_watts,tss')
          .in('sport_type', actFilter).not('avg_watts', 'is', null)
          .gte('started_at', since180d.toISOString()).order('avg_watts', { ascending: false }).limit(10), [] as never[]),
      ])

      type MetricRow = { date: string; hrv: number | null; readiness: number | null; atl: number | null; ctl: number | null; tsb: number | null; fatigue: number | null }
      const metrics = (metrics14dRes.data ?? []) as MetricRow[]
      const hasAtlCtl = metrics.some(m => m.atl != null && m.ctl != null)

      let tsbActuel: number | null = null
      let tsbProjecte: number | null = null
      let tsbMethode = ''

      if (hasAtlCtl) {
        const latest = metrics.find(m => m.tsb != null)
        tsbActuel = latest?.tsb ?? null
        const raceDate = new Date(manualMode ? manualDate : (selectedRace?.date ?? new Date().toISOString().split('T')[0]))
        const daysToRace = Math.max(0, Math.round((raceDate.getTime() - now.getTime()) / 86400000))
        tsbProjecte = tsbActuel !== null ? Math.round(tsbActuel + daysToRace * 1.5) : null
        tsbMethode = 'TSB projeté (estimation depuis données ATL/CTL)'
      } else {
        type ActRow = { tss: number | null; started_at: string }
        const acts = (recentActsRes.data ?? []) as ActRow[]
        if (acts.length > 0) {
          const since42d = new Date(now); since42d.setDate(now.getDate() - 42)
          const since7d = new Date(now); since7d.setDate(now.getDate() - 7)
          const acts42 = acts.filter(a => new Date(a.started_at) >= since42d)
          const acts7 = acts.filter(a => new Date(a.started_at) >= since7d)
          const ctlApprox = acts42.reduce((s, a) => s + (a.tss ?? 0), 0) / 42
          const atlApprox = acts7.reduce((s, a) => s + (a.tss ?? 0), 0) / 7
          tsbActuel = Math.round(ctlApprox - atlApprox)
          tsbProjecte = tsbActuel
          tsbMethode = 'TSB projeté (estimation approximative depuis TSS activités)'
        }
      }

      const hasZonesOrTests = !!(zonesRes.data || (testsRes.data && testsRes.data.length > 0))

      setContextData({
        zones: zonesRes.data,
        tests: testsRes.data ?? [],
        recentActivities: recentActsRes.data ?? [],
        metrics14d: metrics,
        pastRaces: pastRacesRes.data ?? [],
        profile: profileRes.data,
        bestPowerActivities: bestPowerRes.data ?? [],
        hasAtlCtl,
        tsbActuel,
        tsbProjecte,
        tsbMethode,
        hasZonesOrTests,
      })
    } catch {
      setContextData(null)
    } finally {
      setLoadingContext(false)
    }
  }

  async function generate() {
    if (!contextData) return
    setPhase('generating')
    setError(null)
    try {
      const raceSport = getRaceSport()
      const isTriathlon = raceSport === 'triathlon'
      const isTrail = raceSport === 'trail'
      const raceDistKm = getRaceDistance() != null ? (getRaceDistance()! / 1000).toFixed(1) : 'non précisé'
      const raceDenivele = getRaceDenivele()
      const raceDate = manualMode ? manualDate : (selectedRace?.date ?? '')
      const raceName = manualMode ? `${raceSport} ${raceDistKm}km` : (selectedRace?.name ?? 'Course')
      const goalTime = getGoalTime() ?? 'non précisé'
      const parcoursProfil = profilParcours ?? (raceDenivele != null && raceDenivele > 500 ? 'Montagneux' : raceDenivele != null && raceDenivele > 100 ? 'Vallonné' : 'Plat')
      const ressentiBrut = ressenti
      const ressentLabel = ['Très fatigué', 'Fatigué', 'Neutre', 'En forme', 'Excellent'][ressentiBrut - 1] ?? 'Neutre'

      const triathlonBlock = isTriathlon ? `
TRIATHLON — Sous-objectifs :
  Natation : ${triSwimGoal || 'non précisé'} | Vélo : ${triBikeGoal || 'non précisé'} | Cap : ${triRunGoal || 'non précisé'}
  Distance : ${triDistance ?? 'non précisée'} (S=sprint, M=olympique, L=70.3, XL=Ironman)
  Inclure coefficients d'effort par discipline et transition T1/T2.` : ''

      const altitudeBlock = (isTrail && (altitudeMax || courseProfile?.altitude_max))
        ? `ALTITUDE MAX : ${altitudeMax || courseProfile?.altitude_max}m — Appliquer coefficient effort altitude (+~1% par 100m au-dessus de 1500m)`
        : ''

      const courseProfileBlock = courseProfile ? `
PARCOURS IMPORTÉ (${courseProfile.total_distance_km}km · D+ ${courseProfile.total_denivele_pos}m · D- ${courseProfile.total_denivele_neg}m · Alt. ${courseProfile.altitude_min}m → ${courseProfile.altitude_max}m) :
SEGMENTS DU PARCOURS :
${courseProfile.segments.map((s, i) => `  ${i + 1}. ${s.description} (${s.start_km}km → ${s.end_km}km, pente ${s.pente_moyenne_pct}%)`).join('\n')}
${allClimbs.length > 0 ? `\nDIFFICULTÉS MAJEURES${allClimbs.some(c => c.isManual) ? ' (inclut montées ajoutées manuellement)' : ''} :\n${allClimbs.map(c => `  ${c.categorie} · ${c.start_km}-${c.end_km}km · ${c.distance_km}km · ${c.pente_moyenne_pct}% moy · sommet ${c.altitude_max}m`).join('\n')}` : ''}
IMPORTANT : Ta stratégie par sections DOIT correspondre à ces segments réels. Chaque montée significative doit avoir sa cible de watts/allure spécifique. Les descentes doivent avoir des consignes de récupération.` : ''

      const userPrompt = `IMPORTANT: Tu DOIS répondre UNIQUEMENT en JSON valide. Ta réponse commence par { et finit par }. AUCUN texte avant, AUCUN markdown, AUCUN commentaire. Si tu écris autre chose que du JSON pur, la requête échouera.

Tu es un expert en stratégie de course et performance sportive.

SPORT : ${raceSport.toUpperCase()}
COURSE : ${raceName} · ${raceDistKm}km · D+ ${raceDenivele ?? 0}m · Date : ${raceDate}
OBJECTIF CIBLE : ${goalTime} | PROFIL PARCOURS : ${parcoursProfil}
RESSENTI FORME : ${ressentiBrut}/5 (${ressentLabel})
MÉTÉO PRÉVUE : ${meteoScenario ?? 'inconnue'}
${altitudeBlock}${triathlonBlock}
NOTES ATHLÈTE : ${notesLibres || 'aucune'}
${courseProfileBlock}

ZONES ${raceSport} : ${contextData.zones ? JSON.stringify(contextData.zones) : 'non configurées'}
TESTS RÉCENTS : ${JSON.stringify(contextData.tests)}
ACTIVITÉS (12 mois) : ${JSON.stringify(contextData.recentActivities)}
FORME ACTUELLE (14 jours) : ${JSON.stringify(contextData.metrics14d)}
TSB ACTUEL : ${contextData.tsbActuel ?? 'non disponible'}
TSB PROJETÉ JOUR J : ${contextData.tsbProjecte ?? 'non disponible'} (${contextData.tsbMethode})
COMPÉTITIONS PASSÉES (historique complet) :
${(contextData.pastRaces ?? []).length > 0
  ? contextData.pastRaces.map((r: Record<string, unknown>) =>
      `- ${String(r.title ?? r.sport_type ?? '')} (${String(r.started_at ?? '').slice(0, 10)}) : ${r.distance_m != null ? (Number(r.distance_m) / 1000).toFixed(1) + 'km' : 'N/A'} · ${r.moving_time_s != null ? Math.floor(Number(r.moving_time_s) / 3600) + 'h' + String(Math.floor((Number(r.moving_time_s) % 3600) / 60)).padStart(2, '0') : 'N/A'} · FC moy ${r.avg_hr ?? 'N/A'}bpm${r.avg_watts != null ? ' · ' + String(r.avg_watts) + 'W' : ''}`
    ).join('\n')
  : 'Aucune compétition enregistrée'}
PROFIL PHYSIOLOGIQUE : ${JSON.stringify(contextData.profile)}
${contextData.bestPowerActivities.length > 0 ? `MEILLEURES PUISSANCES (6 MOIS) : ${JSON.stringify(contextData.bestPowerActivities.slice(0, 5))}` : ''}

CONTRAINTE DE LONGUEUR STRICTE : limite strategie_sections à 6-8 entrées max par scénario (regroupe les sections similaires). Limite nutrition_course à 5 entrées max. Sois concis dans tous les champs texte — 80 mots max par champ. Le JSON complet ne doit pas dépasser 6000 tokens.

RÈGLES ABSOLUES :
1. Générer OBLIGATOIREMENT 3 scénarios : conservateur (probabilité élevée, sécurisé), optimal (cible, réaliste), agressif (risqué, PR potentiel)
2. Toutes les allures/watts DOIVENT venir des données réelles — jamais de valeurs génériques
3. Si TSB projeté négatif : alerter dans verdict + scénario conservateur prioritaire
4. Si objectif hors portée : le dire clairement, proposer objectif réaliste
5. Si pas de zones ET pas de tests : stratégie RPE uniquement (pas d'allures inventées)
6. Si météo précisée : inclure meteo_impacts avec ajustements concrets
7. Si triathlon : inclure triathlon_repartition avec objectifs par discipline

FORMAT JSON STRICT :
{
  "verdict_objectif": { "status": "realiste|ambitieux|hors_portee", "confiance": 0, "detail": "..." },
  "forme_au_jour_j": { "tsb_actuel": null, "tsb_projete": null, "methode": "...", "verdict": "...", "risque": "..." },
  "scenarios": [
    {
      "nom": "conservateur",
      "objectif_temps": "...",
      "probabilite": 85,
      "strategie_sections": [{ "section": "0-10km", "allure_cible": null, "watts_cibles": null, "zone": "Z2", "pourcentage_ftp": null, "rpe_cible": "5/10", "conseil": "..." }],
      "nutrition_course": [{ "timing": "0-45min", "glucides_g": 40, "hydratation_ml": 150, "conseil": "..." }],
      "gestion_effort": { "depart": "...", "milieu": "...", "final_20pct": "..." },
      "plan_b": { "declencheur": "...", "action": "...", "objectif_fallback": "..." },
      "points_cles": ["..."]
    },
    { "nom": "optimal", "objectif_temps": "...", "probabilite": 60, ... },
    { "nom": "agressif", "objectif_temps": "...", "probabilite": 30, ... }
  ],
  "meteo_impacts": [
    { "condition": "chaud", "impact": "...", "ajustement_allure": "+15sec/km", "conseil": "..." }
  ],
  "triathlon_repartition": null,
  "sources": ["..."],
  "confiance": "élevé|modéré|faible",
  "raison_confiance": "..."
}`

      const res = await fetch('/api/coach-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'central',
          modelId: 'athena',
          // Le prefill '{ ' force Claude à commencer directement en JSON
          messages: [
            { role: 'user', content: userPrompt },
            { role: 'assistant', content: '{' },
          ],
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No body')
      const decoder = new TextDecoder()
      let raw = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const d = line.slice(6).trim()
            if (d === '[DONE]') break
            try { raw += JSON.parse(d) as string } catch { /* skip */ }
          }
        }
      }

      // Le prefill '{' est ajouté avant la réponse car Claude continue après lui
      const parsed = parseStrategyResponse('{' + raw) as StrategieResult
      setFinalRaceName(raceName)
      setFinalRaceDate(raceDate)
      setFinalRaceSport(raceSport)
      setFinalRaceDistKm(raceDistKm)
      setFinalRaceDenivele(raceDenivele)
      setResult(parsed)
      setActiveScenario('optimal')

      if (onRecordConv) {
        const userMsg = `Stratégie de course — ${raceName} — ${raceDate}`
        const aiMsg = `Verdict : ${parsed.verdict_objectif.status} (${parsed.verdict_objectif.confiance}% confiance)\n\n${parsed.verdict_objectif.detail}`
        const strategyData: RaceStrategyData = {
          result: parsed,
          raceName,
          raceSport,
          raceDate,
          goalTime,
        }
        onRecordConv(userMsg, aiMsg, strategyData)
        setRecorded(true)
      }
      setPhase('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de génération')
      setPhase('context')
    }
  }

  const SUPPORTED_SPORTS = ['running', 'trail', 'cycling', 'triathlon']
  const SPORT_LABELS: Record<string, string> = {
    running: 'Running', trail: 'Trail', cycling: 'Vélo', triathlon: 'Triathlon',
    // DB values
    run: 'Running', bike: 'Vélo', swim: 'Natation', hyrox: 'Hyrox', rowing: 'Aviron',
  }
  const verdictColor = (s: string) => s === 'realiste' ? '#22c55e' : s === 'ambitieux' ? '#f97316' : '#ef4444'
  const verdictLabel = (s: string) => s === 'realiste' ? 'Objectif réaliste' : s === 'ambitieux' ? 'Objectif ambitieux' : 'Hors de portée'

  // ── Phase race ──
  if (phase === 'race') {
    const today = new Date()
    return (
      <div style={{ padding: '8px 0 4px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 5px', fontFamily: 'Syne,sans-serif' }}>
          Stratégie de course
        </p>
        <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 14px' }}>
          Choisir une course planifiée ou saisir manuellement
        </p>

        {loadingRaces ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(0,200,224,0.2)', borderTop: '2px solid var(--ai-accent)', animation: 'ai_spin 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        ) : (
          <>
            {races.length > 0 && !manualMode && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {races.map(r => {
                  const daysToRace = Math.round((new Date(r.date).getTime() - today.getTime()) / 86400000)
                  const isImminent = daysToRace <= 7
                  const isSelected = selectedRace?.id === r.id
                  return (
                    <button key={r.id} onClick={() => setSelectedRace(r)} style={{
                      padding: '10px 12px', borderRadius: 10, textAlign: 'left',
                      border: `1px solid ${isSelected ? 'var(--ai-accent)' : 'var(--ai-border)'}`,
                      background: isSelected ? 'var(--ai-accent-dim)' : 'var(--ai-bg2)',
                      cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: isSelected ? 'var(--ai-accent)' : 'var(--ai-text)' }}>{r.name}</span>
                        {isImminent && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.15)', color: '#ef4444', letterSpacing: '0.06em' }}>
                            IMMINENT
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: 0 }}>
                        {SPORT_LABELS[r.sport] ?? r.sport}
                        {(r.run_distance ?? r.tri_distance) ? ` · ${r.run_distance ?? r.tri_distance}` : ''}
                        {' · '}J-{daysToRace}
                        {r.goal_time ? ` · Objectif : ${r.goal_time}` : ''}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}

            {manualMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {SUPPORTED_SPORTS.map(s => (
                    <button key={s} onClick={() => setManualSport(s)} style={{
                      flex: 1, padding: '6px', borderRadius: 7, fontSize: 11,
                      border: `1px solid ${manualSport === s ? 'var(--ai-accent)' : 'var(--ai-border)'}`,
                      background: manualSport === s ? 'var(--ai-accent-dim)' : 'var(--ai-bg2)',
                      color: manualSport === s ? 'var(--ai-accent)' : 'var(--ai-mid)',
                      cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
                    }}>
                      {SPORT_LABELS[s] ?? s}
                    </button>
                  ))}
                </div>
                <input type="number" placeholder="Distance (km)" value={manualDistance} onChange={e => setManualDistance(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', color: 'var(--ai-text)', fontSize: 12, outline: 'none', fontFamily: 'DM Sans,sans-serif' }} />
                <input type="number" placeholder="Dénivelé positif (m) — optionnel" value={manualDenivele} onChange={e => setManualDenivele(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', color: 'var(--ai-text)', fontSize: 12, outline: 'none', fontFamily: 'DM Sans,sans-serif' }} />
                <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', color: 'var(--ai-text)', fontSize: 12, outline: 'none', fontFamily: 'DM Sans,sans-serif' }} />
                <input type="text" placeholder="Objectif de temps — optionnel (ex: 3h30)" value={manualGoalTime} onChange={e => setManualGoalTime(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', color: 'var(--ai-text)', fontSize: 12, outline: 'none', fontFamily: 'DM Sans,sans-serif' }} />
                <button onClick={() => setManualMode(false)} style={{ fontSize: 11, color: 'var(--ai-accent)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                  ← Utiliser une course planifiée
                </button>
              </div>
            ) : (
              <button onClick={() => { setSelectedRace(null); setManualMode(true) }} style={{
                width: '100%', padding: '9px', borderRadius: 9, marginBottom: 12,
                border: '1px solid var(--ai-border)', background: 'transparent',
                color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer',
                fontFamily: 'DM Sans,sans-serif',
              }}>
                Saisir manuellement
              </button>
            )}

            {/* Upload parcours — disponible dans les deux modes */}
            {(manualMode || selectedRace) && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: '0 0 6px' }}>
                  Importer le parcours (optionnel)
                </p>
                <input
                  ref={courseFileRef}
                  type="file"
                  accept=".gpx,.tcx,.kml,.fit"
                  onChange={e => { void handleCourseFileUpload(e) }}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => courseFileRef.current?.click()}
                  disabled={uploadingFile}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 8,
                    border: `1px dashed ${courseProfile ? 'rgba(0,200,224,0.5)' : 'var(--ai-border)'}`,
                    background: courseProfile ? 'rgba(0,200,224,0.04)' : 'var(--ai-bg2)',
                    color: courseProfile ? 'var(--ai-accent)' : 'var(--ai-mid)',
                    fontSize: 11, cursor: uploadingFile ? 'default' : 'pointer',
                    fontFamily: 'DM Sans,sans-serif',
                  }}
                >
                  {uploadingFile
                    ? 'Analyse du parcours…'
                    : courseProfile
                      ? `✓ ${courseProfile.total_distance_km}km · D+ ${courseProfile.total_denivele_pos}m · ${courseProfile.segments.length} segments`
                      : '📁 Importer un fichier GPX, TCX ou KML'}
                </button>
                {courseProfile && (
                  <button onClick={() => setCourseProfile(null)} style={{ fontSize: 10, color: 'var(--ai-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0 0', display: 'block' }}>
                    ✕ Supprimer le parcours
                  </button>
                )}
                {uploadError && (
                  <p style={{ fontSize: 10, color: '#ef4444', margin: '4px 0 0' }}>{uploadError}</p>
                )}
                <p style={{ fontSize: 9, color: 'var(--ai-dim)', margin: '4px 0 0' }}>
                  Exporte depuis Strava, Garmin Connect, Komoot ou autre
                </p>
              </div>
            )}
          </>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
            Annuler
          </button>
          <button
            onClick={() => { setPhase('questions'); void preloadAthleteData() }}
            disabled={!manualMode && !selectedRace}
            style={{
              flex: 1, padding: '9px', borderRadius: 9, border: 'none',
              background: (manualMode || selectedRace) ? 'var(--ai-gradient)' : 'var(--ai-border)',
              color: '#fff', fontSize: 12, fontWeight: 700,
              cursor: (manualMode || selectedRace) ? 'pointer' : 'not-allowed',
              fontFamily: 'DM Sans,sans-serif',
            }}
          >
            Continuer →
          </button>
        </div>
      </div>
    )
  }

  // ── Phase questions ──
  if (phase === 'questions') {
    const showProfil = needsProfilQuestion()
    const showObjectif = needsObjectifQuestion()
    const raceSportQ = getRaceSport()
    const isTriQ = raceSportQ === 'triathlon'
    const isTrailQ = raceSportQ === 'trail'
    const canContinue = (!showProfil || profilParcours != null) && (!isTriQ || triDistance != null)

    return (
      <div style={{ padding: '8px 0 4px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 14px', fontFamily: 'Syne,sans-serif' }}>
          Quelques questions
        </p>

        {/* Profil altimétrique si fichier uploadé */}
        {courseProfile && (
          <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 10, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--ai-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
              Profil du parcours
            </p>
            <ElevationProfileChart profile={courseProfile} height={140} climbs={allClimbs} />
            <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--ai-mid)', marginTop: 4, marginBottom: 8, fontFamily: 'DM Mono,monospace', flexWrap: 'wrap' }}>
              <span><strong style={{ color: 'var(--ai-text)' }}>{courseProfile.total_distance_km}</strong>km</span>
              <span>D+ <strong style={{ color: 'var(--ai-text)' }}>{courseProfile.total_denivele_pos}</strong>m</span>
              <span>D- <strong style={{ color: 'var(--ai-text)' }}>{courseProfile.total_denivele_neg}</strong>m</span>
              <span>Alt. <strong style={{ color: 'var(--ai-text)' }}>{courseProfile.altitude_min}</strong>–<strong style={{ color: 'var(--ai-text)' }}>{courseProfile.altitude_max}</strong>m</span>
            </div>
            {allClimbs.length > 0 && (
              <div style={{ marginTop: 2, marginBottom: 4 }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--ai-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>
                  Difficultés majeures
                </p>
                {allClimbs.map((c, i) => (
                  <div key={i} style={{ fontSize: 10, color: 'var(--ai-mid)', padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                      background: (CLIMB_CAT_COLORS[c.categorie] ?? '#f97316') + '25',
                      color: CLIMB_CAT_COLORS[c.categorie] ?? '#f97316',
                      fontFamily: 'DM Mono,monospace',
                    }}>
                      {CLIMB_CAT_LABELS[c.categorie]}
                    </span>
                    <span style={{ fontFamily: 'DM Mono,monospace', color: 'var(--ai-dim)' }}>{c.start_km}–{c.end_km}km</span>
                    <span>{c.distance_km}km · {c.pente_moyenne_pct}% moy · max {c.pente_max_pct}% · {c.altitude_max}m</span>
                    {c.isManual && (
                      <button onClick={() => setManualClimbs(prev => prev.filter(mc =>
                        !(Math.abs(mc.start_km - c.start_km) < 0.5 && Math.abs(mc.end_km - c.end_km) < 0.5)
                      ))} style={{ fontSize: 10, color: 'var(--ai-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {/* Ajout manuel de montée */}
            <div style={{ marginTop: 4 }}>
              {!showAddClimb ? (
                <button onClick={() => setShowAddClimb(true)} style={{ fontSize: 10, color: 'var(--ai-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'DM Sans,sans-serif', textDecoration: 'underline' }}>
                  + Ajouter une montée manuellement
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', padding: '6px 8px', borderRadius: 8, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)' }}>
                  <span style={{ fontSize: 10, color: 'var(--ai-dim)' }}>Début km</span>
                  <input type="number" step="0.1" placeholder="ex: 115" value={newClimbStart} onChange={e => setNewClimbStart(e.target.value)}
                    style={{ width: 60, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--ai-border)', background: 'var(--ai-bg)', color: 'var(--ai-text)', fontSize: 11, fontFamily: 'DM Mono,monospace', outline: 'none' }} />
                  <span style={{ fontSize: 10, color: 'var(--ai-dim)' }}>Fin km</span>
                  <input type="number" step="0.1" placeholder="ex: 135" value={newClimbEnd} onChange={e => setNewClimbEnd(e.target.value)}
                    style={{ width: 60, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--ai-border)', background: 'var(--ai-bg)', color: 'var(--ai-text)', fontSize: 11, fontFamily: 'DM Mono,monospace', outline: 'none' }} />
                  <button onClick={() => {
                    const s = parseFloat(newClimbStart), e = parseFloat(newClimbEnd)
                    if (!isNaN(s) && !isNaN(e) && e > s) {
                      setManualClimbs(prev => [...prev, { start_km: s, end_km: e }])
                      setNewClimbStart(''); setNewClimbEnd(''); setShowAddClimb(false)
                    }
                  }} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, border: 'none', background: 'var(--ai-accent)', color: '#000', cursor: 'pointer', fontWeight: 600 }}>
                    Ajouter
                  </button>
                  <button onClick={() => { setShowAddClimb(false); setNewClimbStart(''); setNewClimbEnd('') }}
                    style={{ padding: '4px 8px', borderRadius: 6, fontSize: 10, border: '1px solid var(--ai-border)', background: 'none', color: 'var(--ai-dim)', cursor: 'pointer' }}>
                    Annuler
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profil parcours (boutons) */}
        {showProfil && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 8px' }}>Profil du parcours</p>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['Plat', 'Vallonné', 'Montagneux'] as const).map(p => (
                <button key={p} onClick={() => setProfilParcours(p)} style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 11,
                  border: `1px solid ${profilParcours === p ? 'var(--ai-accent)' : 'var(--ai-border)'}`,
                  background: profilParcours === p ? 'var(--ai-accent-dim)' : 'var(--ai-bg2)',
                  color: profilParcours === p ? 'var(--ai-accent)' : 'var(--ai-mid)',
                  cursor: 'pointer', fontWeight: profilParcours === p ? 700 : 400,
                  fontFamily: 'DM Sans,sans-serif',
                }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Altitude max — trail uniquement */}
        {isTrailQ && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 8px' }}>Altitude maximale du parcours (m) — optionnel</p>
            <input type="number" placeholder="Ex: 2500" value={altitudeMax} onChange={e => setAltitudeMax(e.target.value)}
              style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', color: 'var(--ai-text)', fontSize: 12, outline: 'none', fontFamily: 'DM Sans,sans-serif', boxSizing: 'border-box' }} />
          </div>
        )}

        {/* Triathlon — distance + objectifs par discipline */}
        {isTriQ && (
          <>
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 8px' }}>Format de la course *</p>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['S', 'M', 'L', 'XL'] as const).map(d => (
                  <button key={d} onClick={() => setTriDistance(d)} style={{
                    flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 11,
                    border: `1px solid ${triDistance === d ? 'var(--ai-accent)' : 'var(--ai-border)'}`,
                    background: triDistance === d ? 'var(--ai-accent-dim)' : 'var(--ai-bg2)',
                    color: triDistance === d ? 'var(--ai-accent)' : 'var(--ai-mid)',
                    cursor: 'pointer', fontWeight: triDistance === d ? 700 : 400,
                    fontFamily: 'DM Sans,sans-serif',
                  }}>
                    {d === 'S' ? 'Sprint' : d === 'M' ? 'Olympique' : d === 'L' ? '70.3' : 'Ironman'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 8px' }}>Objectifs par discipline (optionnel)</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input type="text" placeholder="Natation (ex: 30min)" value={triSwimGoal} onChange={e => setTriSwimGoal(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', color: 'var(--ai-text)', fontSize: 12, outline: 'none', fontFamily: 'DM Sans,sans-serif' }} />
                <input type="text" placeholder="Vélo (ex: 2h15)" value={triBikeGoal} onChange={e => setTriBikeGoal(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', color: 'var(--ai-text)', fontSize: 12, outline: 'none', fontFamily: 'DM Sans,sans-serif' }} />
                <input type="text" placeholder="CAP (ex: 45min)" value={triRunGoal} onChange={e => setTriRunGoal(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', color: 'var(--ai-text)', fontSize: 12, outline: 'none', fontFamily: 'DM Sans,sans-serif' }} />
              </div>
            </div>
          </>
        )}

        {/* ── Données de l'athlète ── */}
        {athletePreview ? (
          <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 10, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--ai-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
              Tes données
            </p>

            {/* Profil */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 6, fontSize: 11 }}>
              {athletePreview.profile?.ftp_watts && (
                <span style={{ color: 'var(--ai-mid)' }}>FTP <strong style={{ color: 'var(--ai-text)', fontFamily: 'DM Mono,monospace' }}>{athletePreview.profile.ftp_watts}W</strong></span>
              )}
              {athletePreview.profile?.weight_kg && (
                <span style={{ color: 'var(--ai-mid)' }}>Poids <strong style={{ color: 'var(--ai-text)', fontFamily: 'DM Mono,monospace' }}>{athletePreview.profile.weight_kg}kg</strong></span>
              )}
              {athletePreview.profile?.ftp_watts && athletePreview.profile?.weight_kg && (
                <span style={{ color: 'var(--ai-mid)' }}>W/kg <strong style={{ color: 'var(--ai-text)', fontFamily: 'DM Mono,monospace' }}>{(athletePreview.profile.ftp_watts / athletePreview.profile.weight_kg).toFixed(2)}</strong></span>
              )}
              {athletePreview.profile?.vma && (
                <span style={{ color: 'var(--ai-mid)' }}>VMA <strong style={{ color: 'var(--ai-text)', fontFamily: 'DM Mono,monospace' }}>{athletePreview.profile.vma}km/h</strong></span>
              )}
              {athletePreview.profile?.lthr && (
                <span style={{ color: 'var(--ai-mid)' }}>LTHR <strong style={{ color: 'var(--ai-text)', fontFamily: 'DM Mono,monospace' }}>{athletePreview.profile.lthr}bpm</strong></span>
              )}
            </div>

            {/* Zones */}
            {athletePreview.zones ? (
              <div style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>✓ Zones configurées</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 10, fontFamily: 'DM Mono,monospace', color: 'var(--ai-dim)' }}>
                  {athletePreview.zones.z1_value && <span>Z1: {athletePreview.zones.z1_value}</span>}
                  {athletePreview.zones.z2_value && <span>Z2: {athletePreview.zones.z2_value}</span>}
                  {athletePreview.zones.z3_value && <span>Z3: {athletePreview.zones.z3_value}</span>}
                  {athletePreview.zones.z4_value && <span>Z4: {athletePreview.zones.z4_value}</span>}
                  {athletePreview.zones.z5_value && <span>Z5: {athletePreview.zones.z5_value}</span>}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 10, color: '#f97316', marginBottom: 6 }}>⚠ Zones non configurées — stratégie basée sur le RPE</p>
            )}

            {/* Tests */}
            {athletePreview.tests.length > 0 && (
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>✓ {athletePreview.tests.length} test(s)</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {athletePreview.tests.slice(0, 3).map((t: any, i: number) => (
                    <span key={i} style={{ fontSize: 9, color: 'var(--ai-dim)', fontFamily: 'DM Mono,monospace' }}>
                      {t.test_definitions?.nom ?? 'Test'}{t.date ? ` (${t.date})` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Activités récentes */}
            {athletePreview.bestActivities.length > 0 && (
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--ai-mid)' }}>{athletePreview.bestActivities.length} activités récentes (12 mois)</span>
              </div>
            )}

            {/* Compétitions */}
            {athletePreview.races.length > 0 && (
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: '#f97316', fontWeight: 600 }}>🏆 {athletePreview.races.length} compétition(s)</span>
                <div style={{ marginTop: 3 }}>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {athletePreview.races.slice(0, 5).map((r: any, i: number) => (
                    <p key={i} style={{ fontSize: 9, color: 'var(--ai-dim)', margin: '1px 0', fontFamily: 'DM Mono,monospace' }}>
                      {r.title ?? r.sport_type ?? '—'}
                      {r.distance_m != null ? ` · ${(r.distance_m / 1000).toFixed(1)}km` : ''}
                      {r.moving_time_s != null ? ` · ${Math.floor(r.moving_time_s / 3600)}h${String(Math.floor((r.moving_time_s % 3600) / 60)).padStart(2, '0')}` : ''}
                      {r.started_at ? ` · ${String(r.started_at).slice(0, 10)}` : ''}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Lien si données manquantes */}
            {(!athletePreview.profile?.ftp_watts && !athletePreview.profile?.vma) && (
              <p style={{ fontSize: 10, color: 'var(--ai-accent)', marginTop: 6, fontStyle: 'italic' }}>
                → Configure tes données dans Performance pour une stratégie plus précise
              </p>
            )}
          </div>
        ) : (
          <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 10, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)' }}>
            <p style={{ fontSize: 10, color: 'var(--ai-dim)' }}>Chargement des données...</p>
          </div>
        )}

        {/* Ressenti de forme */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 8px' }}>Ressenti de forme actuel</p>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3, 4, 5].map(v => (
              <button key={v} onClick={() => setRessenti(v)} style={{
                flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 11,
                border: `1px solid ${ressenti === v ? 'var(--ai-accent)' : 'var(--ai-border)'}`,
                background: ressenti === v ? 'var(--ai-accent-dim)' : 'var(--ai-bg2)',
                color: ressenti === v ? 'var(--ai-accent)' : 'var(--ai-mid)',
                cursor: 'pointer', fontWeight: ressenti === v ? 700 : 400,
                fontFamily: 'DM Sans,sans-serif',
              }}>
                {v}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--ai-dim)' }}>Très fatigué</span>
            <span style={{ fontSize: 10, color: 'var(--ai-dim)' }}>Excellent</span>
          </div>
        </div>

        {/* Objectif de temps */}
        {showObjectif && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 8px' }}>Objectif de temps {isTriQ ? 'total' : ''} (optionnel)</p>
            <input type="text" placeholder="Ex: 3h30, 45min…" value={objectifTemps} onChange={e => setObjectifTemps(e.target.value)}
              style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', color: 'var(--ai-text)', fontSize: 12, outline: 'none', fontFamily: 'DM Sans,sans-serif', boxSizing: 'border-box' }} />
          </div>
        )}

        {/* Météo prévue */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 8px' }}>Météo prévue (optionnel)</p>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {(['idéal', 'chaud', 'froid', 'vent', 'pluie'] as const).map(m => (
              <button key={m} onClick={() => setMeteoScenario(meteoScenario === m ? null : m)} style={{
                padding: '6px 10px', borderRadius: 7, fontSize: 11,
                border: `1px solid ${meteoScenario === m ? 'var(--ai-accent)' : 'var(--ai-border)'}`,
                background: meteoScenario === m ? 'var(--ai-accent-dim)' : 'var(--ai-bg2)',
                color: meteoScenario === m ? 'var(--ai-accent)' : 'var(--ai-mid)',
                cursor: 'pointer', fontWeight: meteoScenario === m ? 700 : 400,
                fontFamily: 'DM Sans,sans-serif',
              }}>
                {m === 'idéal' ? '☀️ Idéal' : m === 'chaud' ? '🌡️ Chaud' : m === 'froid' ? '🥶 Froid' : m === 'vent' ? '💨 Vent' : '🌧️ Pluie'}
              </button>
            ))}
          </div>
        </div>

        {/* Notes libres */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 8px' }}>Informations complémentaires (optionnel)</p>
          <textarea placeholder="Ex: premiere fois sur cette distance, douleur au genou, adversaires ciblés…" value={notesLibres} onChange={e => setNotesLibres(e.target.value)}
            style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', color: 'var(--ai-text)', fontSize: 12, outline: 'none', fontFamily: 'DM Sans,sans-serif', boxSizing: 'border-box', resize: 'none', minHeight: 60, lineHeight: 1.5 }} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setPhase('race')} style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
            Retour
          </button>
          <button
            onClick={() => { void loadContext(); setPhase('context') }}
            disabled={!canContinue}
            style={{
              flex: 1, padding: '9px', borderRadius: 9, border: 'none',
              background: canContinue ? 'var(--ai-gradient)' : 'var(--ai-border)',
              color: '#fff', fontSize: 12, fontWeight: 700,
              cursor: canContinue ? 'pointer' : 'not-allowed',
              fontFamily: 'DM Sans,sans-serif',
            }}
          >
            Continuer →
          </button>
        </div>
      </div>
    )
  }

  // ── Phase context ──
  if (phase === 'context') {
    if (loadingContext || contextData == null) {
      return (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(0,200,224,0.2)', borderTop: '2px solid var(--ai-accent)', animation: 'ai_spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 12, color: 'var(--ai-dim)', margin: 0 }}>Chargement du contexte…</p>
        </div>
      )
    }

    if (!contextData.hasZonesOrTests) {
      return (
        <div style={{ padding: '8px 0' }}>
          <div style={{ padding: '12px', borderRadius: 10, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', marginBottom: 14 }}>
            <p style={{ fontSize: 12, color: '#f97316', margin: 0, lineHeight: 1.6 }}>
              Pour des allures personnalisées, configure tes zones dans Performance → Zones ou réalise un test dans Performance → Tests.
            </p>
          </div>
          <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 12px', lineHeight: 1.5 }}>
            Tu peux quand même générer une stratégie basée sur la perception (RPE).
          </p>
          {error && <p style={{ fontSize: 11, color: '#ef4444', margin: '0 0 10px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPhase('questions')} style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
              Retour
            </button>
            <button onClick={() => { void generate() }} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: 'var(--ai-gradient)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
              Générer ma stratégie
            </button>
          </div>
        </div>
      )
    }

    return (
      <div style={{ padding: '8px 0' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 12px', fontFamily: 'Syne,sans-serif' }}>
          Contexte chargé
        </p>
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)', marginBottom: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--ai-mid)' }}>Zones configurées</span>
              <span style={{ color: contextData.zones ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{contextData.zones ? 'Oui' : 'Non'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--ai-mid)' }}>Tests récents</span>
              <span style={{ color: 'var(--ai-text)', fontWeight: 600 }}>{contextData.tests.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--ai-mid)' }}>Activités (3 mois)</span>
              <span style={{ color: 'var(--ai-text)', fontWeight: 600 }}>{contextData.recentActivities.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--ai-mid)' }}>TSB actuel (estimé)</span>
              <span style={{ color: 'var(--ai-text)', fontWeight: 600 }}>{contextData.tsbActuel ?? 'N/A'}</span>
            </div>
          </div>
        </div>
        {error && <p style={{ fontSize: 11, color: '#ef4444', margin: '0 0 10px' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setPhase('questions')} style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid var(--ai-border)', background: 'transparent', color: 'var(--ai-mid)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
            Retour
          </button>
          <button onClick={() => { void generate() }} style={{
            flex: 1, padding: '9px', borderRadius: 9, border: 'none',
            background: 'var(--ai-gradient)',
            color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'DM Sans,sans-serif',
          }}>
            Générer ma stratégie
          </button>
        </div>
      </div>
    )
  }

  // ── Phase generating ──
  if (phase === 'generating') {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(0,200,224,0.15)', borderTop: '3px solid var(--ai-accent)', animation: 'ai_spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text)', margin: '0 0 6px', fontFamily: 'Syne,sans-serif' }}>
          Génération de la stratégie…
        </p>
        <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: 0, lineHeight: 1.6 }}>
          Analyse de ta forme, tes zones et ton historique de courses
        </p>
      </div>
    )
  }

  // ── Phase result ──
  if (!result) return null

  const raceName = manualMode ? `${getRaceSport()} ${getRaceDistance() != null ? (getRaceDistance()! / 1000).toFixed(1) + 'km' : ''}` : (selectedRace?.name ?? 'Course')
  const vc = verdictColor(result.verdict_objectif.status)
  const currentScenario = result.scenarios?.find(s => s.nom === activeScenario) ?? result.scenarios?.[0] ?? null
  const scenarioColor = (nom: string) => nom === 'conservateur' ? '#22c55e' : nom === 'optimal' ? 'var(--ai-accent)' : '#f97316'
  const followUpActions = getRaceFollowUpActions(getRaceSport(), result)

  function handleRaceFollowUp(action: FollowUpAction) {
    if (!recorded && onRecordConv && result) {
      const userMsg = `Stratégie de course — ${raceName} — ${manualMode ? manualDate : (selectedRace?.date ?? '')}`
      const aiMsg = `Verdict : ${result.verdict_objectif.status} (${result.verdict_objectif.confiance}% confiance)\n\n${result.verdict_objectif.detail}`
      const strategyData: RaceStrategyData = { result, raceName, raceSport: getRaceSport(), raceDate: manualMode ? manualDate : (selectedRace?.date ?? ''), goalTime: getGoalTime() ?? '' }
      onRecordConv(userMsg, aiMsg, strategyData)
      setRecorded(true)
    }
    if (onFollowUp) onFollowUp(action.label, action.prompt)
  }

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Verdict card */}
      <div style={{ padding: '12px', borderRadius: 10, background: `${vc}12`, border: `1px solid ${vc}30`, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: vc }}>{verdictLabel(result.verdict_objectif.status)}</span>
          <span style={{ fontSize: 11, color: 'var(--ai-dim)' }}>{result.verdict_objectif.confiance}% confiance</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: 0, lineHeight: 1.5 }}>{result.verdict_objectif.detail}</p>
      </div>

      {/* Forme au jour J */}
      <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)', marginBottom: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 0 6px' }}>
          Forme au jour J
        </p>
        <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
          {result.forme_au_jour_j.tsb_actuel != null && (
            <div>
              <p style={{ fontSize: 9, color: 'var(--ai-dim)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>TSB actuel</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: result.forme_au_jour_j.tsb_actuel >= 0 ? '#22c55e' : '#ef4444', margin: 0 }}>{result.forme_au_jour_j.tsb_actuel}</p>
            </div>
          )}
          {result.forme_au_jour_j.tsb_projete != null && (
            <div>
              <p style={{ fontSize: 9, color: 'var(--ai-dim)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>TSB jour J</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: result.forme_au_jour_j.tsb_projete >= 0 ? '#22c55e' : '#f97316', margin: 0 }}>{result.forme_au_jour_j.tsb_projete}</p>
            </div>
          )}
        </div>
        <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: '0 0 4px' }}>{result.forme_au_jour_j.verdict}</p>
        {result.forme_au_jour_j.risque && (
          <p style={{ fontSize: 11, color: '#f97316', margin: 0, fontStyle: 'italic' }}>{result.forme_au_jour_j.risque}</p>
        )}
        <p style={{ fontSize: 10, color: 'var(--ai-dim)', margin: '4px 0 0', fontStyle: 'italic' }}>{result.forme_au_jour_j.methode}</p>
      </div>

      {/* Profil altimétrique du parcours importé */}
      {courseProfile && (
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)', marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--ai-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
            Profil du parcours
          </p>
          <ElevationProfileChart profile={courseProfile} height={140} climbs={allClimbs} />
          <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--ai-mid)', marginTop: 4, marginBottom: 6, fontFamily: 'DM Mono,monospace', flexWrap: 'wrap' }}>
            <span><strong style={{ color: 'var(--ai-text)' }}>{courseProfile.total_distance_km}</strong>km</span>
            <span>D+ <strong style={{ color: 'var(--ai-text)' }}>{courseProfile.total_denivele_pos}</strong>m</span>
            <span>D- <strong style={{ color: 'var(--ai-text)' }}>{courseProfile.total_denivele_neg}</strong>m</span>
            <span>Alt. <strong style={{ color: 'var(--ai-text)' }}>{courseProfile.altitude_min}</strong>–<strong style={{ color: 'var(--ai-text)' }}>{courseProfile.altitude_max}</strong>m</span>
          </div>
          {allClimbs.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--ai-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>
                Difficultés majeures
              </p>
              {allClimbs.map((c, i) => (
                <div key={i} style={{ fontSize: 10, color: 'var(--ai-mid)', padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                    background: (CLIMB_CAT_COLORS[c.categorie] ?? '#f97316') + '25',
                    color: CLIMB_CAT_COLORS[c.categorie] ?? '#f97316',
                    fontFamily: 'DM Mono,monospace',
                  }}>
                    {CLIMB_CAT_LABELS[c.categorie]}
                  </span>
                  <span style={{ fontFamily: 'DM Mono,monospace', color: 'var(--ai-dim)' }}>{c.start_km}–{c.end_km}km</span>
                  <span>{c.distance_km}km · {c.pente_moyenne_pct}% moy · max {c.pente_max_pct}% · {c.altitude_max}m</span>
                  {c.isManual && <span style={{ fontSize: 8, color: 'var(--ai-dim)', fontStyle: 'italic' }}>manuel</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scenario tabs */}
      {result.scenarios && result.scenarios.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
            {result.scenarios.map(s => (
              <button key={s.nom} onClick={() => setActiveScenario(s.nom)} style={{
                flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 10, fontWeight: activeScenario === s.nom ? 700 : 400,
                border: `1px solid ${activeScenario === s.nom ? scenarioColor(s.nom) : 'var(--ai-border)'}`,
                background: activeScenario === s.nom ? `${scenarioColor(s.nom)}18` : 'var(--ai-bg2)',
                color: activeScenario === s.nom ? scenarioColor(s.nom) : 'var(--ai-mid)',
                cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', textTransform: 'capitalize',
              }}>
                {s.nom}<br />
                <span style={{ fontSize: 9, fontWeight: 400, opacity: 0.8 }}>{s.objectif_temps} · {s.probabilite}%</span>
              </button>
            ))}
          </div>

          {currentScenario && (
            <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--ai-bg2)', border: `1px solid ${scenarioColor(currentScenario.nom)}30`, marginBottom: 14 }}>
              {/* Stratégie sections */}
              {currentScenario.strategie_sections.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 0 6px' }}>
                    Stratégie par section
                  </p>
                  {currentScenario.strategie_sections.map((s, i) => (
                    <div key={i} style={{ padding: '7px 9px', borderRadius: 7, background: 'var(--ai-bg)', border: '1px solid var(--ai-border)', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai-text)' }}>{s.section}</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <span style={{ fontSize: 10, color: 'var(--ai-accent)', fontFamily: 'DM Mono,monospace' }}>{s.zone}</span>
                          <span style={{ fontSize: 10, color: 'var(--ai-dim)' }}>RPE {s.rpe_cible}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
                        {s.allure_cible && <span style={{ fontSize: 11, color: 'var(--ai-mid)', fontFamily: 'DM Mono,monospace' }}>{s.allure_cible}</span>}
                        {s.watts_cibles && <span style={{ fontSize: 11, color: 'var(--ai-mid)', fontFamily: 'DM Mono,monospace' }}>{s.watts_cibles}W</span>}
                        {s.pourcentage_ftp != null && <span style={{ fontSize: 11, color: 'var(--ai-dim)' }}>{s.pourcentage_ftp}% FTP</span>}
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: 0, lineHeight: 1.4, fontStyle: 'italic' }}>{s.conseil}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Nutrition */}
              {currentScenario.nutrition_course.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 0 6px' }}>
                    Nutrition course
                  </p>
                  {currentScenario.nutrition_course.map((n, i) => (
                    <div key={i} style={{ padding: '6px 9px', borderRadius: 7, background: 'var(--ai-bg)', border: '1px solid var(--ai-border)', marginBottom: 4, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ai-accent)', fontFamily: 'DM Mono,monospace', minWidth: 56, flexShrink: 0 }}>{n.timing}</span>
                      <div>
                        <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: '0 0 2px' }}>{n.glucides_g}g glucides · {n.hydratation_ml}ml</p>
                        <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: 0, fontStyle: 'italic' }}>{n.conseil}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Gestion effort */}
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 0 6px' }}>
                  Gestion de l&apos;effort
                </p>
                <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: '0 0 3px' }}><strong style={{ color: 'var(--ai-text)' }}>Départ :</strong> {currentScenario.gestion_effort.depart}</p>
                <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: '0 0 3px' }}><strong style={{ color: 'var(--ai-text)' }}>Milieu :</strong> {currentScenario.gestion_effort.milieu}</p>
                <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: 0 }}><strong style={{ color: 'var(--ai-text)' }}>Dernier 20% :</strong> {currentScenario.gestion_effort.final_20pct}</p>
              </div>

              {/* Plan B */}
              <div style={{ padding: '8px 10px', borderRadius: 7, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#ef4444', margin: '0 0 5px' }}>Plan B</p>
                <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: '0 0 2px' }}><strong style={{ color: 'var(--ai-text)' }}>Déclencheur :</strong> {currentScenario.plan_b.declencheur}</p>
                <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: '0 0 2px' }}><strong style={{ color: 'var(--ai-text)' }}>Action :</strong> {currentScenario.plan_b.action}</p>
                <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: 0 }}><strong style={{ color: 'var(--ai-text)' }}>Objectif fallback :</strong> {currentScenario.plan_b.objectif_fallback}</p>
              </div>

              {/* Points clés */}
              {currentScenario.points_cles.length > 0 && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 0 5px' }}>Points clés</p>
                  {currentScenario.points_cles.map((p, i) => (
                    <p key={i} style={{ fontSize: 11, color: 'var(--ai-mid)', margin: '0 0 3px', paddingLeft: 10 }}>• {p}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Météo impacts */}
      {result.meteo_impacts && result.meteo_impacts.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 0 6px' }}>
            Impacts météo
          </p>
          {result.meteo_impacts.map((m, i) => (
            <div key={i} style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.18)', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#f97316', textTransform: 'capitalize' }}>{m.condition}</span>
                {m.ajustement_allure && <span style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', color: '#f97316' }}>{m.ajustement_allure}</span>}
              </div>
              <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: '0 0 2px' }}>{m.impact}</p>
              <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: 0, fontStyle: 'italic' }}>{m.conseil}</p>
            </div>
          ))}
        </div>
      )}

      {/* Triathlon repartition */}
      {result.triathlon_repartition && (
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)', marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 0 8px' }}>
            Répartition triathlon
          </p>
          {(['natation', 'velo', 'cap'] as const).map(disc => {
            const d = result.triathlon_repartition![disc]
            if (!d) return null
            const label = disc === 'natation' ? '🏊 Natation' : disc === 'velo' ? '🚴 Vélo' : '🏃 CAP'
            return (
              <div key={disc} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai-text)' }}>{label}</span>
                  <span style={{ fontSize: 11, fontFamily: 'DM Mono,monospace', color: 'var(--ai-accent)' }}>{d.objectif}</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: 0, fontStyle: 'italic' }}>{d.conseil}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Sources + confiance */}
      <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)', marginBottom: 14 }}>
        <p style={{ fontSize: 10, color: 'var(--ai-dim)', margin: '0 0 2px', fontStyle: 'italic' }}>
          Confiance : {result.confiance} — {result.raison_confiance}
        </p>
        <p style={{ fontSize: 10, color: 'var(--ai-dim)', margin: 0 }}>
          Course : {raceName} · Sources : {result.sources.join(' · ')}
        </p>
      </div>

      {/* Follow-up actions */}
      {followUpActions.length > 0 && onFollowUp && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 0 6px' }}>
            Approfondir
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {followUpActions.map((action, i) => (
              <button key={i} onClick={() => handleRaceFollowUp(action)} style={{
                padding: '8px 12px', borderRadius: 8, textAlign: 'left',
                border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)',
                color: 'var(--ai-text)', fontSize: 12, cursor: 'pointer',
                fontFamily: 'DM Sans,sans-serif', lineHeight: 1.4,
              }}>
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Export PDF + Fermer */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          onClick={() => {
            const activeScen = result.scenarios?.find(s => s.nom === activeScenario) ?? result.scenarios?.[0]
            if (!activeScen) return
            void generateRacePDF(
              finalRaceName || raceName,
              finalRaceDate || (manualMode ? manualDate : (selectedRace?.date ?? '')),
              finalRaceSport || getRaceSport(),
              finalRaceDistKm || (getRaceDistance() != null ? (getRaceDistance()! / 1000).toFixed(1) : '?'),
              finalRaceDenivele ?? getRaceDenivele(),
              activeScen,
              result.meteo_impacts ?? [],
              courseProfile,
              result.triathlon_repartition,
              result.verdict_objectif,
            )
          }}
          style={{
            flex: 1, padding: '9px 12px', borderRadius: 9,
            border: '1px solid rgba(0,200,224,0.4)',
            background: 'rgba(0,200,224,0.06)',
            color: 'var(--ai-accent)', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          📄 Exporter « {(result.scenarios?.find(s => s.nom === activeScenario) ?? result.scenarios?.[0])?.nom === 'conservateur' ? 'Prudent' : (result.scenarios?.find(s => s.nom === activeScenario) ?? result.scenarios?.[0])?.nom === 'agressif' ? 'Agressif' : 'Optimal'} » en PDF
        </button>
        <button onClick={onCancel} style={{
          padding: '9px 16px', borderRadius: 9,
          border: '1px solid var(--ai-border)', background: 'transparent',
          color: 'var(--ai-dim)', fontSize: 12, cursor: 'pointer',
          fontFamily: 'DM Sans,sans-serif',
        }}>
          Fermer
        </button>
      </div>
    </div>
  )
}

// ── RaceStrategyView ─────────────────────────────────────────
// Persisted view rendered from msg.raceStrategy in conversation history
function RaceStrategyView({ data }: { data: RaceStrategyData }) {
  const [activeScenario, setActiveScenario] = useState<'conservateur' | 'optimal' | 'agressif'>('optimal')
  const { result, raceName } = data
  const vc = result.verdict_objectif.status === 'realiste' ? '#22c55e' : result.verdict_objectif.status === 'ambitieux' ? '#f97316' : '#ef4444'
  const verdictLbl = result.verdict_objectif.status === 'realiste' ? 'Objectif réaliste' : result.verdict_objectif.status === 'ambitieux' ? 'Objectif ambitieux' : 'Hors de portée'
  const scenarioColor = (nom: string) => nom === 'conservateur' ? '#22c55e' : nom === 'optimal' ? 'var(--ai-accent)' : '#f97316'
  const currentScenario = result.scenarios?.find(s => s.nom === activeScenario) ?? result.scenarios?.[0] ?? null

  return (
    <div style={{ padding: '4px 0' }}>
      <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: '0 0 10px' }}>
        Stratégie · {raceName} · {data.raceDate}
      </p>

      {/* Verdict */}
      <div style={{ padding: '10px 12px', borderRadius: 10, background: `${vc}12`, border: `1px solid ${vc}30`, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: vc }}>{verdictLbl}</span>
          <span style={{ fontSize: 11, color: 'var(--ai-dim)' }}>{result.verdict_objectif.confiance}% confiance</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--ai-mid)', margin: 0, lineHeight: 1.5 }}>{result.verdict_objectif.detail}</p>
      </div>

      {/* Forme au jour J */}
      {(result.forme_au_jour_j.tsb_actuel != null || result.forme_au_jour_j.verdict) && (
        <div style={{ padding: '8px 12px', borderRadius: 10, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)', marginBottom: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 0 5px' }}>Forme au jour J</p>
          <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
            {result.forme_au_jour_j.tsb_actuel != null && (
              <div>
                <p style={{ fontSize: 9, color: 'var(--ai-dim)', margin: '0 0 1px', textTransform: 'uppercase' }}>TSB actuel</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: result.forme_au_jour_j.tsb_actuel >= 0 ? '#22c55e' : '#ef4444', margin: 0 }}>{result.forme_au_jour_j.tsb_actuel}</p>
              </div>
            )}
            {result.forme_au_jour_j.tsb_projete != null && (
              <div>
                <p style={{ fontSize: 9, color: 'var(--ai-dim)', margin: '0 0 1px', textTransform: 'uppercase' }}>TSB jour J</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: result.forme_au_jour_j.tsb_projete >= 0 ? '#22c55e' : '#f97316', margin: 0 }}>{result.forme_au_jour_j.tsb_projete}</p>
              </div>
            )}
          </div>
          <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: 0 }}>{result.forme_au_jour_j.verdict}</p>
        </div>
      )}

      {/* Scenario tabs */}
      {result.scenarios && result.scenarios.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
            {result.scenarios.map(s => (
              <button key={s.nom} onClick={() => setActiveScenario(s.nom)} style={{
                flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 10, fontWeight: activeScenario === s.nom ? 700 : 400,
                border: `1px solid ${activeScenario === s.nom ? scenarioColor(s.nom) : 'var(--ai-border)'}`,
                background: activeScenario === s.nom ? `${scenarioColor(s.nom)}18` : 'var(--ai-bg2)',
                color: activeScenario === s.nom ? scenarioColor(s.nom) : 'var(--ai-mid)',
                cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', textTransform: 'capitalize',
              }}>
                {s.nom}<br />
                <span style={{ fontSize: 9, fontWeight: 400 }}>{s.objectif_temps} · {s.probabilite}%</span>
              </button>
            ))}
          </div>

          {currentScenario && (
            <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--ai-bg2)', border: `1px solid ${scenarioColor(currentScenario.nom)}30`, marginBottom: 12 }}>
              {currentScenario.strategie_sections.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 0 5px' }}>Stratégie par section</p>
                  {currentScenario.strategie_sections.map((s, i) => (
                    <div key={i} style={{ padding: '6px 8px', borderRadius: 7, background: 'var(--ai-bg)', border: '1px solid var(--ai-border)', marginBottom: 3 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai-text)' }}>{s.section}</span>
                        <span style={{ fontSize: 10, color: 'var(--ai-accent)', fontFamily: 'DM Mono,monospace' }}>{s.zone} · RPE {s.rpe_cible}</span>
                      </div>
                      {(s.allure_cible || s.watts_cibles) && (
                        <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: '0 0 2px', fontFamily: 'DM Mono,monospace' }}>
                          {s.allure_cible}{s.allure_cible && s.watts_cibles ? ' · ' : ''}{s.watts_cibles ? `${s.watts_cibles}W` : ''}
                        </p>
                      )}
                      <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: 0, fontStyle: 'italic' }}>{s.conseil}</p>
                    </div>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: '0 0 2px' }}><strong style={{ color: 'var(--ai-text)' }}>Départ :</strong> {currentScenario.gestion_effort.depart}</p>
              <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: '0 0 2px' }}><strong style={{ color: 'var(--ai-text)' }}>Milieu :</strong> {currentScenario.gestion_effort.milieu}</p>
              <p style={{ fontSize: 11, color: 'var(--ai-mid)', margin: 0 }}><strong style={{ color: 'var(--ai-text)' }}>Dernier 20% :</strong> {currentScenario.gestion_effort.final_20pct}</p>
            </div>
          )}
        </>
      )}

      {/* Météo impacts */}
      {result.meteo_impacts && result.meteo_impacts.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 0 5px' }}>Impacts météo</p>
          {result.meteo_impacts.map((m, i) => (
            <div key={i} style={{ padding: '7px 10px', borderRadius: 7, background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.18)', marginBottom: 4 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#f97316', margin: '0 0 2px', textTransform: 'capitalize' }}>{m.condition}{m.ajustement_allure ? ` · ${m.ajustement_allure}` : ''}</p>
              <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: 0 }}>{m.conseil}</p>
            </div>
          ))}
        </div>
      )}

      {/* Triathlon repartition */}
      {result.triathlon_repartition && (
        <div style={{ padding: '8px 12px', borderRadius: 10, background: 'var(--ai-bg2)', border: '1px solid var(--ai-border)', marginBottom: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ai-dim)', margin: '0 0 6px' }}>Répartition triathlon</p>
          {(['natation', 'velo', 'cap'] as const).map(disc => {
            const d = result.triathlon_repartition![disc]
            if (!d) return null
            return (
              <div key={disc} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--ai-text)' }}>{disc === 'natation' ? '🏊 Natation' : disc === 'velo' ? '🚴 Vélo' : '🏃 CAP'}</span>
                <span style={{ fontSize: 11, fontFamily: 'DM Mono,monospace', color: 'var(--ai-accent)' }}>{d.objectif}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Sources */}
      <p style={{ fontSize: 10, color: 'var(--ai-dim)', margin: '0 0 10px', fontStyle: 'italic' }}>
        Confiance : {result.confiance} · Sources : {result.sources.join(' · ')}
      </p>

      {/* Export PDF */}
      {currentScenario && (
        <button
          onClick={() => {
            void generateRacePDF(
              data.raceName,
              data.raceDate,
              data.raceSport,
              String(data.result.scenarios?.find(s => s.nom === activeScenario)?.objectif_temps ?? '?'),
              null,
              currentScenario,
              data.result.meteo_impacts ?? [],
              null,
              data.result.triathlon_repartition,
              data.result.verdict_objectif,
            )
          }}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 9,
            border: '1px solid rgba(0,200,224,0.4)', background: 'rgba(0,200,224,0.06)',
            color: 'var(--ai-accent)', fontSize: 11, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
        >
          📄 Exporter le tableau de marche (PDF)
        </button>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
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
  const [attachment,    setAttachment]    = useState<AttachedFile | null>(null)
  const [attachErr,     setAttachErr]     = useState<string | null>(null)
  const [pendingToolCalls, setPendingToolCalls] = useState<PendingToolCall[]>([])
  const [toolApplyStatus,  setToolApplyStatus]  = useState<'idle' | 'applying' | 'success' | 'error'>('idle')
  const [toolApplyError,   setToolApplyError]   = useState<string | null>(null)
  const [aiRules,          setAiRules]          = useState<{ category: string; rule_text: string }[]>([])
  const [ruleHelperCategory, setRuleHelperCategory] = useState<string | null>(null)
  const [chatFontFamily,   setChatFontFamily]   = useState('DM Sans, sans-serif')
  const [quotedText,       setQuotedText]       = useState<string | null>(null)
  const [showQuickActions, setShowQuickActions] = useState(true)

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
  // AbortController pour annuler la requête en cours
  const abortRef   = useRef<AbortController | null>(null)

  const active = convs.find(c => c.id === activeId) ?? null

  // ── Effects ────────────────────────────────────────────────

  useEffect(() => {
    setMounted(true)
    setConvs(loadConvs())
    const sqaVal = localStorage.getItem('thw_ai_show_quick_actions')
    if (sqaVal === 'false') setShowQuickActions(false)
  }, [])

  // Charge les règles IA actives de l'utilisateur au mount
  useEffect(() => {
    void (async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data } = await sb
        .from('ai_rules')
        .select('category,rule_text')
        .eq('user_id', user.id)
        .eq('active', true)
      setAiRules((data ?? []) as { category: string; rule_text: string }[])
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Charge et écoute la police de chat depuis localStorage
  useEffect(() => {
    const FONT_MAP: Record<string, string> = {
      dm_sans: 'DM Sans, sans-serif',
      inter:   'Inter, sans-serif',
      system:  '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
      serif:   'Georgia, Times New Roman, serif',
      mono:    'DM Mono, monospace',
    }
    const apply = () => {
      const val = localStorage.getItem('thw_ai_chat_font')
      if (val && FONT_MAP[val]) setChatFontFamily(FONT_MAP[val])
    }
    apply()
    window.addEventListener('thw:chat-font-changed', apply)
    window.addEventListener('storage', apply)
    return () => {
      window.removeEventListener('thw:chat-font-changed', apply)
      window.removeEventListener('storage', apply)
    }
  }, [])

  // Écoute l'event depuis la page profil (bouton "Formuler avec l'IA")
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setRuleHelperCategory(detail?.category ?? null)
      setActiveFlow('rule_helper')
    }
    window.addEventListener('thw:open-ai-rule-helper', handler)
    return () => window.removeEventListener('thw:open-ai-rule-helper', handler)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Plan context fetch — structure COMPLÈTE du plan (pour tool calls) ──
  // Renvoie un objet avec métadonnées + toutes les semaines (vides ou non)
  // pour que Claude choisisse correctement add_week vs update_session.
  async function fetchPlanSessionsContext(pid: string): Promise<Record<string, unknown>> {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()

      const [planRes, sessionsRes] = await Promise.all([
        sb.from('training_plans')
          .select('id, name, objectif_principal, start_date, end_date, duree_semaines, sports, blocs_periodisation')
          .eq('id', pid)
          .single(),
        sb.from('planned_sessions')
          .select('id, week_start, day_index, sport, title, duration_min, tss, status, intensity')
          .eq('plan_id', pid)
          .order('week_start', { ascending: true })
          .order('day_index',  { ascending: true })
          .limit(300),
      ])

      const plan = planRes.data
      const sessions = (sessionsRes.data ?? []) as Record<string, unknown>[]

      if (!plan) return { training_plan_id: pid, sessions, weekly_structure: [] }

      // Calcule le lundi de la semaine de start_date
      function toMonday(dateStr: string): Date {
        const d = new Date(dateStr)
        const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
        d.setDate(d.getDate() - dow)
        return d
      }
      function toISO(d: Date) { return d.toISOString().slice(0, 10) }

      // Génère toutes les semaines du plan
      const firstMonday = toMonday(plan.start_date as string)
      const endDate     = new Date(plan.end_date as string)
      const weekMap: Record<string, Record<string, unknown>[]> = {}
      const cur = new Date(firstMonday)
      while (cur <= endDate) {
        weekMap[toISO(cur)] = []
        cur.setDate(cur.getDate() + 7)
      }

      // Groupe les séances par semaine
      for (const s of sessions) {
        const ws = s.week_start as string
        if (!weekMap[ws]) weekMap[ws] = []
        weekMap[ws].push(s)
      }

      const weekly_structure = Object.entries(weekMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week_start, weekSessions]) => ({
          week_start,
          sessions: weekSessions,
          empty: weekSessions.length === 0,
        }))

      return {
        training_plan_id:    pid,
        name:                plan.name,
        objectif_principal:  plan.objectif_principal,
        start_date:          plan.start_date,
        end_date:            plan.end_date,
        duree_semaines:      plan.duree_semaines,
        sports:              plan.sports,
        blocs_periodisation: plan.blocs_periodisation,
        weekly_structure,
        sessions, // liste plate avec IDs pour référence rapide
      }
    } catch {
      return { training_plan_id: pid, sessions: [], weekly_structure: [] }
    }
  }

  // ── Apply tool call ────────────────────────────────────────────
  // Exécute un seul tool call et renvoie l'éventuelle erreur
  async function execOneTool(
    sb: Awaited<ReturnType<typeof import('@/lib/supabase/client').createClient>>,
    userId: string,
    tc: PendingToolCall,
  ): Promise<string | null> {
    const { tool_name, tool_input: inp } = tc
    let pgErr: { message: string } | null = null

    if (tool_name === 'add_session') {
      const { error } = await sb.from('planned_sessions').insert({
        user_id:      userId,
        plan_id:      inp.training_plan_id,
        week_start:   inp.week_start,
        day_index:    inp.day_index,
        sport:        inp.sport,
        title:        inp.title,
        time:         inp.time ?? null,
        duration_min: inp.duration_min,
        blocks:       inp.blocks ?? null,
        tss:          inp.tss ?? null,
        intensity:    inp.intensity ?? null,
        notes:        inp.notes ?? null,
        rpe:          inp.rpe ?? null,
        status:       'planned',
        source:       'ai',
      })
      pgErr = error

    } else if (tool_name === 'update_session') {
      // Mapping explicite des colonnes DB — évite de passer des clés inconnues à Supabase
      const patch: Record<string, unknown> = {}
      if (inp.sport        !== undefined) patch.sport        = inp.sport
      if (inp.title        !== undefined) patch.title        = inp.title
      if (inp.time         !== undefined) patch.time         = inp.time
      if (inp.duration_min !== undefined) patch.duration_min = inp.duration_min
      if (inp.tss          !== undefined) patch.tss          = inp.tss
      if (inp.intensity    !== undefined) patch.intensity    = inp.intensity
      if (inp.notes        !== undefined) patch.notes        = inp.notes
      if (inp.rpe          !== undefined) patch.rpe          = inp.rpe
      if (inp.blocks       !== undefined) patch.blocks       = inp.blocks
      if (inp.status       !== undefined) patch.status       = inp.status
      patch.updated_at = new Date().toISOString()
      const { error } = await sb.from('planned_sessions').update(patch).eq('id', inp.session_id)
      pgErr = error

    } else if (tool_name === 'delete_session') {
      const { error } = await sb.from('planned_sessions').delete().eq('id', inp.session_id)
      pgErr = error

    } else if (tool_name === 'move_session') {
      const { error } = await sb.from('planned_sessions').update({
        week_start: inp.new_week_start,
        day_index:  inp.new_day_index,
      }).eq('id', inp.session_id)
      pgErr = error

    } else if (tool_name === 'add_week') {
      // Chaque élément de sessions[] reçoit user_id, plan_id, week_start et status
      const rows = (inp.sessions as Record<string, unknown>[]).map(s => ({
        user_id:      userId,
        plan_id:      inp.training_plan_id,
        week_start:   inp.week_start,
        day_index:    s.day_index,
        sport:        s.sport,
        title:        s.title,
        time:         s.time ?? null,
        duration_min: s.duration_min,
        blocks:       s.blocks ?? null,
        tss:          s.tss ?? null,
        intensity:    s.intensity ?? null,
        notes:        s.notes ?? null,
        rpe:          s.rpe ?? null,
        status:       'planned',
        source:       'ai',
      }))
      const { error } = await sb.from('planned_sessions').insert(rows)
      pgErr = error

    } else if (tool_name === 'update_plan_periodisation') {
      const { error } = await sb.from('training_plans').update({
        blocs_periodisation: inp.blocs_periodisation,
      }).eq('id', inp.training_plan_id)
      pgErr = error

    } else {
      return `Tool inconnu : ${tool_name}`
    }

    return pgErr ? pgErr.message : null
  }

  const applyToolCall = useCallback(async () => {
    if (pendingToolCalls.length === 0) return
    setToolApplyStatus('applying')
    setToolApplyError(null)

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('Non connecté')

      const total = pendingToolCalls.length
      for (let i = 0; i < total; i++) {
        const err = await execOneTool(sb, user.id, pendingToolCalls[i])
        if (err) {
          const prefix = total > 1 ? `Erreur sur l'opération ${i + 1}/${total} (${pendingToolCalls[i].tool_name}) : ` : 'Erreur : '
          throw new Error(`${prefix}${err}`)
        }
      }

      // Succès — message de confirmation dans le chat
      const cid = active?.id
      if (cid) {
        const summary = total > 1 ? `✓ ${total} modifications appliquées avec succès.` : '✓ Modification appliquée avec succès.'
        const successMsg: AIMsg = { id: genId(), role: 'assistant', content: summary, ts: Date.now(), modelId: model }
        setConvs(prev => prev.map(c =>
          c.id === cid ? { ...c, msgs: [...c.msgs, successMsg], updatedAt: Date.now() } : c
        ))
      }
      setPendingToolCalls([])
      setToolApplyStatus('idle')

      // ── Log tool_use (fire-and-forget via Supabase client) ──────
      void sb.from('usage_logs').insert({
        user_id: user.id,
        type: 'tool_use',
        metadata: {
          tool_count: total,
          tool_names: pendingToolCalls.map(t => t.tool_name),
        },
      })

      // Déclenche le refresh de la page planning (load()) via event window
      window.dispatchEvent(new CustomEvent('thw:sessions-changed'))
      console.log('[AIPanel] refresh triggered after apply — thw:sessions-changed')

    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setToolApplyStatus('error')
      setToolApplyError(msg)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingToolCalls, active, model])

  // ── Cancel tool call ───────────────────────────────────────────
  const cancelToolCall = useCallback(() => {
    setPendingToolCalls([])
    setToolApplyStatus('idle')
    setToolApplyError(null)
    const cid = active?.id
    if (cid) {
      const cancelMsg: AIMsg = {
        id: genId(), role: 'assistant',
        content: 'Modification annulée.',
        ts: Date.now(), modelId: model,
      }
      setConvs(prev => prev.map(c =>
        c.id === cid ? { ...c, msgs: [...c.msgs, cancelMsg], updatedAt: Date.now() } : c
      ))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, model])

  const stopGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
  }, [])

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
    setPendingToolCalls([])
    setToolApplyStatus('idle')
    setToolApplyError(null)
    const qaForSend   = activeQA    // capture before clearing
    const quoteForSend = quotedText // capture before clearing
    setActiveQA(null)
    setQuotedText(null)
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

    // Si une citation est active, la préfixer dans le message affiché
    const finalDisplayText = quoteForSend
      ? `> ${quoteForSend.slice(0, 120)}${quoteForSend.length > 120 ? '…' : ''}\n\n${displayText}`
      : displayText

    const userMsg: AIMsg = { id: genId(), role: 'user', content: finalDisplayText, ts: Date.now() }
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
    const rawApiText: string = (() => {
      if (presetApi) return presetApi  // flow already built full prompt
      if (qaForSend) {
        // Prepend action context to user's message
        return txt
          ? `${qaForSend.apiPrompt}\n\nContexte ajouté par l'utilisateur : "${txt}"`
          : qaForSend.apiPrompt
      }
      return displayText
    })()
    // Si une citation est active, la préfixer dans le prompt API
    const apiContentText = quoteForSend
      ? `À propos de ce passage : "${quoteForSend}"\n\n${rawApiText}`
      : rawApiText

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

    // Flag : true si le stream s'est terminé normalement (vs abort/erreur)
    let streamDone = false

    try {
      // ── Fetch plan context complet si plan-chat ──────────────────
      let planSessionsContext: Record<string, unknown> = {}
      if (isPlanChat && planId) {
        planSessionsContext = await fetchPlanSessionsContext(planId)
      }

      // AbortController pour permettre l'annulation via le bouton Stop
      const controller = new AbortController()
      abortRef.current = controller

      const res = await fetch('/api/coach-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          agentId:  isPlanChat ? 'plan_coach' : 'central',
          modelId:  snapshot,
          messages: apiMsgs,
          aiRules:  aiRules.length > 0 ? aiRules : undefined,
          // Merge plan_context (session IDs) into the existing context so that
          // formatTrainingPlanContext can inject them into the system prompt.
          context: isPlanChat
            ? {
                ...(planContext ?? {}),
                plan_context: {
                  training_plan_id: planId,
                  sessions: planSessionsContext,
                },
              }
            : (context ?? {}),
        }),
      })

      // ── 429 Quota dépassé — message convivial dans le chat ──────
      if (res.status === 429) {
        let quotaMsg = '⚠️ **Quota mensuel atteint.** Tu as utilisé toutes tes interactions IA ce mois-ci.\n\n👉 [Passer à un plan supérieur →](/settings/subscription)'
        try {
          const qd = await res.json() as { used?: number; limit?: number; tier?: string; reset_at?: string }
          const tierLabel = qd.tier === 'pro' ? 'Pro' : qd.tier === 'expert' ? 'Expert' : 'Premium'
          if (qd.reset_at) {
            const resetDate = new Date(qd.reset_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
            quotaMsg = `⚠️ **Quota mensuel atteint** — ${qd.used ?? '?'}/${qd.limit ?? '?'} messages utilisés (plan ${tierLabel}).\n\nRemise à zéro le **${resetDate}**.\n\n👉 [Améliorer mon abonnement →](/settings/subscription)`
          }
        } catch { /* fallback */ }
        const quotaErrMsg: AIMsg = { id: genId(), role: 'assistant', content: quotaMsg, ts: Date.now() }
        setConvs(prev => prev.map(c =>
          c.id === cid ? { ...c, msgs: [...c.msgs, quotaErrMsg], updatedAt: Date.now() } : c
        ))
        setLoading(false)
        return
      }

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const aiMsgId = genId()
      setConvs(prev => prev.map(c =>
        c.id === cid
          ? { ...c, msgs: [...c.msgs, { id: aiMsgId, role: 'assistant' as const, content: '', ts: Date.now(), modelId: snapshot }], updatedAt: Date.now() }
          : c
      ))

      // ── Parse SSE stream ─────────────────────────────────────────
      // Format : event: text\ndata: <JSON-encoded chunk>\n\n  |  event: tool_use\ndata: {...}\n\n
      // Les chunks texte sont JSON.stringify-és côté backend pour éviter les \n bruts dans data.
      const reader      = res.body.getReader()
      const decoder     = new TextDecoder()
      let textAccumulated = ''
      let sseBuffer       = ''

      const processSSEBuffer = () => {
        const parts = sseBuffer.split('\n\n')
        sseBuffer = parts.pop() ?? ''  // keep incomplete trailing event in buffer

        for (const rawEvent of parts) {
          if (!rawEvent.trim()) continue
          let eventType = 'text'
          let data = ''
          for (const line of rawEvent.split('\n')) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim()
            else if (line.startsWith('data: ')) data = line.slice(6)
          }

          if (eventType === 'text') {
            try {
              // data est JSON.stringify-é côté backend → on parse pour récupérer le texte brut
              textAccumulated += JSON.parse(data) as string
            } catch {
              // fallback : si non JSON-encodé (ancienne version), utilise data brut
              textAccumulated += data
            }
            setConvs(prev => prev.map(c =>
              c.id === cid
                ? { ...c, msgs: c.msgs.map(m => m.id === aiMsgId ? { ...m, content: textAccumulated } : m), updatedAt: Date.now() }
                : c
            ))
          } else if (eventType === 'tool_use') {
            try {
              const tool = JSON.parse(data) as PendingToolCall
              // Accumule dans le tableau — NE remplace PAS (plusieurs tool_use possibles)
              setPendingToolCalls(prev => [...prev, tool])
              setToolApplyStatus('idle')
              setToolApplyError(null)
            } catch { /* malformed JSON — ignore */ }
          }
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          // Flush tout buffer résiduel — le dernier chunk peut arriver sans \n\n final
          if (sseBuffer.trim()) {
            sseBuffer += '\n\n'  // force la terminaison pour que split fonctionne
            processSSEBuffer()
          }
          break
        }
        sseBuffer += decoder.decode(value, { stream: true })
        processSSEBuffer()
      }

      abortRef.current = null
      streamDone = true  // stream complété normalement

      // ── Persistance DB pour le plan-chat (training_plan_messages) ──
      if (isPlanChat && planId && textAccumulated) {
        try {
          const { createClient } = await import('@/lib/supabase/client')
          const sb = createClient()
          const { data: { user } } = await sb.auth.getUser()
          if (user) {
            await sb.from('training_plan_messages').insert([
              { training_plan_id: planId, user_id: user.id, role: 'user',      content: displayText },
              { training_plan_id: planId, user_id: user.id, role: 'assistant', content: textAccumulated },
            ])
          }
        } catch { /* non-bloquant */ }
      }

    } catch (e) {
      // Abort volontaire — on garde le texte déjà affiché, pas d'erreur
      if (e instanceof DOMException && e.name === 'AbortError') {
        abortRef.current = null
        setLoading(false)
        return
      }
      const err: AIMsg = { id: genId(), role: 'assistant', content: 'Erreur réseau. Réessaie.', ts: Date.now() }
      setConvs(prev => prev.map(c =>
        c.id === cid ? { ...c, msgs: [...c.msgs, err], updatedAt: Date.now() } : c
      ))
    } finally {
      abortRef.current = null
      if (streamDone) {
        // Stream terminé normalement : on retarde setLoading(false) d'un tick pour
        // éviter que React batchise ce call avec le dernier setConvs. Sans ce délai,
        // TypedText reçoit isStreaming=false + texte complet dans le même render et
        // snape immédiatement au lieu d'animer progressivement.
        setTimeout(() => setLoading(false), 0)
      } else {
        // Abort ou erreur : nettoyage immédiat
        setLoading(false)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, loading, active, context, model, activeQA, quotedText, planId, planContext])

  // ── Enriched actions — charge les données puis appelle send ──
  const handleEnrichedAction = useCallback(async (id: string, label: string) => {
    const sbModule = await import('@/lib/supabase/client')
    const sb = sbModule.createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data: rulesData } = await sb.from('ai_rules').select('category,rule_text').eq('user_id', user.id).eq('active', true)
    const rulesBlock = rulesData && rulesData.length > 0
      ? '\n\nRÈGLES PERSONNELLES DE L\'ATHLÈTE :\n' + rulesData.map((r: { category: string; rule_text: string }) => `- [${r.category}] ${r.rule_text}`).join('\n')
      : ''
    const sendFn: SendFn = (displayText: string, apiPrompt: string) => { void send(displayText, apiPrompt) }
    switch (id) {
      case 'analyser_semaine':      await enrichedAnalyserSemaine(sb, user.id, rulesBlock, label, sendFn); break
      case 'analyser_recuperation': await enrichedAnalyserRecuperation(sb, user.id, rulesBlock, label, sendFn); break
      case 'conseils_sommeil':      await enrichedConseilsSommeil(sb, user.id, rulesBlock, label, sendFn); break
      case 'comprendre_app':        await enrichedComprendreApp(sb, user.id, label, sendFn); break
    }
  }, [send])

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

                <button
                  onClick={() => {
                    const next = !showQuickActions
                    setShowQuickActions(next)
                    localStorage.setItem('thw_ai_show_quick_actions', String(next))
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '0 0 9px',
                  }}
                >
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
                    textTransform: 'uppercase', color: 'var(--ai-dim)',
                  }}>
                    Actions rapides
                  </span>
                  <svg
                    width="10" height="10" viewBox="0 0 24 24" fill="none"
                    stroke="var(--ai-dim)" strokeWidth="2" strokeLinecap="round"
                    style={{ transform: showQuickActions ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                  >
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>

                {showQuickActions && (
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
                            } else if (qa.enrichedId) {
                              setActiveFlow(null)
                              setActiveQA(null)
                              void handleEnrichedAction(qa.enrichedId, qa.label)
                            } else if (qa.prompt) {
                              setActiveFlow(null)
                              setActiveQA(null)
                              void send(qa.label, qa.prompt)
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
                )}

                {!showQuickActions && (
                  <p
                    style={{ fontSize: 11, color: 'var(--ai-dim)', textAlign: 'center', margin: '0 0 16px', cursor: 'pointer' }}
                    onClick={() => { setShowQuickActions(true); localStorage.setItem('thw_ai_show_quick_actions', 'true') }}
                  >
                    Afficher les actions rapides
                  </p>
                )}

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
                    onCancel={() => setActiveFlow(null)}
                    onRecordConv={(userMsg, aiMsg) => {
                      const conv: AIConv = {
                        id: genId(),
                        title: userMsg.slice(0, 46) + (userMsg.length > 46 ? '…' : ''),
                        createdAt: Date.now(), updatedAt: Date.now(),
                        msgs: [
                          { id: genId(), role: 'user',      content: userMsg, ts: Date.now() },
                          { id: genId(), role: 'assistant', content: aiMsg,   ts: Date.now() + 1, modelId: 'athena' as THWModel },
                        ],
                      }
                      setConvs(prev => [conv, ...prev].slice(0, MAX_CONVS))
                      setActiveId(conv.id)
                    }}
                  />
                )}
                {activeFlow === 'nutrition' && (
                  <NutritionFlow
                    onCancel={() => setActiveFlow(null)}
                    onRecordConv={(userMsg, aiMsg) => {
                      const conv: AIConv = {
                        id: genId(),
                        title: userMsg.slice(0, 46) + (userMsg.length > 46 ? '…' : ''),
                        createdAt: Date.now(), updatedAt: Date.now(),
                        msgs: [
                          { id: genId(), role: 'user',      content: userMsg, ts: Date.now() },
                          { id: genId(), role: 'assistant', content: aiMsg,   ts: Date.now() + 1, modelId: 'athena' as THWModel },
                        ],
                      }
                      setConvs(prev => [conv, ...prev].slice(0, MAX_CONVS))
                      setActiveId(conv.id)
                    }}
                  />
                )}
                {activeFlow === 'analyzetest' && (
                  <AnalyzeTestFlow
                    onCancel={() => setActiveFlow(null)}
                    onRecordConv={(userMsg, aiMsg) => {
                      const conv: AIConv = {
                        id: genId(),
                        title: userMsg.slice(0, 46) + (userMsg.length > 46 ? '…' : ''),
                        createdAt: Date.now(), updatedAt: Date.now(),
                        msgs: [
                          { id: genId(), role: 'user',      content: userMsg, ts: Date.now() },
                          { id: genId(), role: 'assistant', content: aiMsg,   ts: Date.now() + 1, modelId: 'athena' as THWModel },
                        ],
                      }
                      setConvs(prev => [conv, ...prev].slice(0, MAX_CONVS))
                      setActiveId(conv.id)
                    }}
                  />
                )}
                {activeFlow === 'analyze_training' && (
                  <AnalyzeTrainingFlow
                    onCancel={() => setActiveFlow(null)}
                    onRecordConv={(userMsg, aiMsg, reportData) => {
                      const conv: AIConv = {
                        id: genId(),
                        title: userMsg.slice(0, 46) + (userMsg.length > 46 ? '…' : ''),
                        createdAt: Date.now(), updatedAt: Date.now(),
                        msgs: [
                          { id: genId(), role: 'user',      content: userMsg, ts: Date.now() },
                          { id: genId(), role: 'assistant', content: aiMsg,   ts: Date.now() + 1, modelId: 'athena' as THWModel, trainingReport: reportData },
                        ],
                      }
                      setConvs(prev => [conv, ...prev].slice(0, MAX_CONVS))
                      setActiveId(conv.id)
                    }}
                    onFollowUp={(displayLabel, fullPrompt) => {
                      void send(displayLabel, fullPrompt)
                    }}
                  />
                )}
                {activeFlow === 'analyser_entrainement' && (
                  <AnalyserEntrainementFlow
                    onPrepare={(apiPrompt, label) => { setActiveFlow(null); void send(label, apiPrompt) }}
                    onCancel={() => setActiveFlow(null)}
                  />
                )}
                {activeFlow === 'recharge' && (
                  <RechargeFlow
                    onPrepare={(apiPrompt, label) => { setActiveFlow(null); void send(label, apiPrompt) }}
                    onCancel={() => setActiveFlow(null)}
                  />
                )}
                {activeFlow === 'sessionbuilder' && (
                  <SessionBuilderFlow
                    onCancel={() => setActiveFlow(null)}
                    onRecordConv={(userMsg, aiMsg, sessionData) => {
                      const conv: AIConv = {
                        id: genId(),
                        title: userMsg.slice(0, 46) + (userMsg.length > 46 ? '…' : ''),
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        msgs: [
                          { id: genId(), role: 'user',      content: userMsg, ts: Date.now() },
                          { id: genId(), role: 'assistant', content: aiMsg,  ts: Date.now() + 1, modelId: 'zeus' as THWModel, sessionData },
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
                {activeFlow === 'rule_helper' && (
                  <RuleHelperFlow
                    category={ruleHelperCategory}
                    onPrepare={(prompt, label) => {
                      setActiveQA({ label, apiPrompt: prompt, model: 'hermes' })
                      setActiveFlow(null)
                      setTimeout(() => areaRef.current?.focus(), 60)
                    }}
                    onCancel={() => setActiveFlow(null)}
                  />
                )}
                {activeFlow === 'estimer_zones' && (
                  <EstimerZonesFlow
                    onCancel={() => setActiveFlow(null)}
                    onRecordConv={(userMsg, aiMsg) => {
                      const conv: AIConv = {
                        id: genId(),
                        title: userMsg.slice(0, 46) + (userMsg.length > 46 ? '…' : ''),
                        createdAt: Date.now(), updatedAt: Date.now(),
                        msgs: [
                          { id: genId(), role: 'user',      content: userMsg, ts: Date.now() },
                          { id: genId(), role: 'assistant', content: aiMsg,   ts: Date.now() + 1, modelId: 'athena' as THWModel },
                        ],
                      }
                      setConvs(prev => [conv, ...prev].slice(0, MAX_CONVS))
                    }}
                  />
                )}
                {activeFlow === 'analyser_progression' && (
                  <AnalyserProgressionFlow
                    onCancel={() => setActiveFlow(null)}
                    onRecordConv={(userMsg, aiMsg) => {
                      const conv: AIConv = {
                        id: genId(),
                        title: userMsg.slice(0, 46) + (userMsg.length > 46 ? '…' : ''),
                        createdAt: Date.now(), updatedAt: Date.now(),
                        msgs: [
                          { id: genId(), role: 'user',      content: userMsg, ts: Date.now() },
                          { id: genId(), role: 'assistant', content: aiMsg,   ts: Date.now() + 1, modelId: 'athena' as THWModel },
                        ],
                      }
                      setConvs(prev => [conv, ...prev].slice(0, MAX_CONVS))
                    }}
                  />
                )}
                {activeFlow === 'strategie_course' && (
                  <StrategieCourseFlow
                    onCancel={() => setActiveFlow(null)}
                    onRecordConv={(userMsg, aiMsg, strategyData) => {
                      const conv: AIConv = {
                        id: genId(),
                        title: userMsg.slice(0, 46) + (userMsg.length > 46 ? '…' : ''),
                        createdAt: Date.now(), updatedAt: Date.now(),
                        msgs: [
                          { id: genId(), role: 'user',      content: userMsg, ts: Date.now() },
                          { id: genId(), role: 'assistant', content: aiMsg,   ts: Date.now() + 1, modelId: 'athena' as THWModel, raceStrategy: strategyData },
                        ],
                      }
                      setConvs(prev => [conv, ...prev].slice(0, MAX_CONVS))
                      setActiveId(conv.id)
                    }}
                    onFollowUp={(displayLabel, fullPrompt) => { void send(displayLabel, fullPrompt) }}
                  />
                )}
                {activeFlow === 'app_guide' && (
                  <AppGuideFlow
                    onPrepare={(apiPrompt, label) => { setActiveFlow(null); void send(label, apiPrompt) }}
                    onCancel={() => setActiveFlow(null)}
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
                            padding: '4px 0',
                            animation: 'ai_msg_in 0.15s ease both',
                          }}>
                            <TypedText text={msg.content} isStreaming={isStreamingMsg} fontFamily={chatFontFamily} />
                          </div>
                        )
                      })()}
                    </div>
                    {/* Session card — rendu riche si données structurées présentes, sinon parsing texte */}
                    {msg.role === 'assistant' && msg.sessionData && (
                      <div style={{ marginLeft: 34 }}>
                        <SBSessionCard session={msg.sessionData} />
                      </div>
                    )}
                    {msg.role === 'assistant' && msg.trainingReport && (
                      <div style={{ marginLeft: 34 }}>
                        <TrainingReportView data={msg.trainingReport} />
                      </div>
                    )}
                    {msg.role === 'assistant' && msg.raceStrategy && (
                      <div style={{ marginLeft: 34 }}>
                        <RaceStrategyView data={msg.raceStrategy} />
                      </div>
                    )}
                    {msg.role === 'assistant' && !msg.sessionData && !msg.trainingReport && !msg.raceStrategy && (
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
                {/* ── Tool call preview ─────────────────────── */}
                {pendingToolCalls.length > 0 && (
                  <ToolCallPreview
                    toolCalls={pendingToolCalls}
                    onApply={() => void applyToolCall()}
                    onCancel={cancelToolCall}
                    applyStatus={toolApplyStatus}
                    applyError={toolApplyError}
                  />
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
                onPrepare={(label, p) => { setPlusOpen(false); setActiveFlow(null); setActiveQA(null); void send(label, p) }}
                onEnriched={(id, label) => { setPlusOpen(false); setActiveFlow(null); setActiveQA(null); void handleEnrichedAction(id, label) }}
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

              {/* Citation de texte sélectionné */}
              {quotedText && (
                <div style={{
                  margin: '8px 10px 0',
                  padding: '8px 12px',
                  borderRadius: 8,
                  borderLeft: '3px solid var(--ai-accent)',
                  background: 'var(--ai-accent-dim)',
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  maxHeight: 80, overflow: 'hidden',
                }}>
                  <p style={{
                    flex: 1, margin: 0, fontSize: 12, color: 'var(--ai-mid)',
                    lineHeight: 1.5, fontStyle: 'italic',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical' as const,
                    overflow: 'hidden',
                  }}>
                    {quotedText}
                  </p>
                  <button
                    onClick={() => setQuotedText(null)}
                    style={{
                      width: 18, height: 18, borderRadius: '50%', border: 'none',
                      background: 'transparent', color: 'var(--ai-dim)',
                      cursor: 'pointer', fontSize: 14, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >×</button>
                </div>
              )}

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

                {/* Police */}
                <FontPicker current={chatFontFamily} onChange={setChatFontFamily} />

                {/* Sélecteur modèle */}
                <ModelPicker model={model} onChange={setModel} />

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Envoyer / Stop */}
                {loading ? (
                  <button
                    onClick={stopGeneration}
                    title="Arrêter la génération"
                    style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      border: 'none',
                      background: '#ef4444',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.15s',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="none">
                      <rect x="4" y="4" width="16" height="16" rx="2" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={() => void send()}
                    disabled={!input.trim() && !attachment && !activeQA && !quotedText}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      border: 'none',
                      background: (input.trim() || attachment || activeQA || quotedText) ? 'var(--ai-text)' : 'var(--ai-border)',
                      cursor: (input.trim() || attachment || activeQA || quotedText) ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.15s',
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke={(input.trim() || attachment || activeQA || quotedText) ? 'var(--ai-bg)' : 'var(--ai-dim)'}
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                    </svg>
                  </button>
                )}
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
              const excerpt = selPopup.text.length > 500
                ? selPopup.text.slice(0, 500) + '…'
                : selPopup.text
              setQuotedText(excerpt)
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
