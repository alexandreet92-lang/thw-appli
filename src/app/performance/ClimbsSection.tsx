'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'

// ─── useDarkMode — suit la classe dark/light sur <html> ──────────────────────
function useDarkMode() {
  const [dark, setDark] = useState(true)
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains('dark'))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

// ─── Design token §2.3 ───────────────────────────────────────────────────────
const BIKE_COLOR = '#3b82f6'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ClimbRecord {
  id: string
  name: string
  date: string
  watts_avg: number
  duration_seconds: number
  weight_kg: number
  wpkg: number
  score: number | null
  length_km: number | null
  avg_gradient_pct: number | null
  altitude_summit_m: number | null
  pre_fatigue: string | null
  with_nutrition: boolean
  temp_bottom_celsius: number | null
  temp_summit_celsius: number | null
  intensity_rating: number | null
  race_id: string | null
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toSec(hms: string): number {
  if (!hms) return 0
  const p = hms.trim().split(':').map(Number)
  if (p.some(isNaN)) return 0
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2]
  if (p.length === 2) return p[0] * 60 + p[1]
  return 0
}
function secToInput(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  return `${m}:${String(sec).padStart(2,'0')}`
}
function secToHMS(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  if (h > 0) return `${h}h${String(m).padStart(2,'0')}'${String(sec).padStart(2,'0')}`
  return `${m}'${String(sec).padStart(2,'0')}`
}
function yearOf(date: string) { return date.slice(0, 4) }

const PRE_LABELS: Record<string, string> = {
  fresh: 'Fraîche', light: 'Légère', moderate: 'Modérée', high: 'Élevée',
}
const INTENSITY_LABELS: Record<number, string> = {
  5: 'À fond', 4: 'Très dur', 3: 'Contrôle', 2: 'Facile', 1: 'Très facile',
}
const YEAR_PAL = ['#06B6D4','#5b6fff','#f97316','#a855f7','#f43f5e','#14b8a6','#eab308','#818cf8']
function yearColor(yr: string, all: string[]) {
  return YEAR_PAL[[...all].sort().indexOf(yr) % YEAR_PAL.length] ?? '#9ca3af'
}

// ─── Score V4 — référence Alien dynamique par durée + pré-fatigue ─────────────
// score_brut  = (W/kg / alien_ref(dur, fatigue)) × 100
// score_final = min(100, score_brut × cTemp × cAltitude × cRessenti)

// Paliers de durée en minutes
const BP = [5, 10, 20, 30, 45, 60, 90, 120]

// 3 tables × 6 niveaux × 8 paliers de durée
// Ligne 0 = Alien (formule), lignes 1-5 = niveaux inférieurs (barème)
// heavy : 45' = 6.2 (non-monotone, calibré Pogacar TdF 2ème semaine)
const REF_TABLES_ALL = {
  //           5'    10'   20'   30'   45'   60'   90'   120'
  standard: [
    [9.5, 8.8, 8.0, 7.5, 7.0, 6.8, 6.4, 6.0],  // Alien
    [8.0, 7.4, 6.8, 6.4, 6.0, 5.8, 5.5, 5.2],  // Pro top intl.
    [6.8, 6.3, 5.8, 5.5, 5.2, 5.0, 4.7, 4.4],  // Pro
    [5.8, 5.4, 5.0, 4.7, 4.5, 4.3, 4.0, 3.8],  // AHN
    [5.0, 4.6, 4.2, 4.0, 3.8, 3.6, 3.4, 3.2],  // Bon amateur
    [4.0, 3.7, 3.4, 3.2, 3.0, 2.8, 2.6, 2.4],  // Amateur
  ],
  moderate: [
    [8.7, 8.1, 7.4, 6.9, 6.4, 6.3, 5.9, 5.5],
    [7.4, 6.8, 6.3, 5.9, 5.5, 5.3, 5.1, 4.8],
    [6.3, 5.8, 5.3, 5.1, 4.8, 4.6, 4.3, 4.0],
    [5.3, 5.0, 4.6, 4.3, 4.1, 4.0, 3.7, 3.5],
    [4.6, 4.2, 3.9, 3.7, 3.5, 3.3, 3.1, 2.9],
    [3.7, 3.4, 3.1, 2.9, 2.8, 2.6, 2.4, 2.2],
  ],
  heavy: [
    [8.1, 7.5, 6.8, 6.4, 6.2, 5.8, 5.4, 5.1],
    [6.8, 6.3, 5.8, 5.4, 5.1, 4.9, 4.7, 4.4],
    [5.8, 5.4, 4.9, 4.7, 4.4, 4.3, 4.0, 3.7],
    [4.9, 4.6, 4.3, 4.0, 3.8, 3.7, 3.4, 3.2],
    [4.3, 3.9, 3.6, 3.4, 3.2, 3.1, 2.9, 2.7],
    [3.4, 3.1, 2.9, 2.7, 2.6, 2.4, 2.2, 2.0],
  ],
} as const

type FatigueTable = keyof typeof REF_TABLES_ALL

function fatigueToTable(preFatigue: string | null): FatigueTable {
  if (!preFatigue || preFatigue === 'fresh' || preFatigue === 'light') return 'standard'
  if (preFatigue === 'moderate') return 'moderate'
  return 'heavy'
}

function interpolateAlienRef(durMin: number, table: FatigueTable): number {
  const refs = REF_TABLES_ALL[table][0]  // ligne 0 = Alien
  if (durMin <= BP[0]) return refs[0]
  if (durMin >= BP[BP.length - 1]) return refs[BP.length - 1]
  for (let i = 0; i < BP.length - 1; i++) {
    if (durMin >= BP[i] && durMin < BP[i + 1]) {
      const t = (durMin - BP[i]) / (BP[i + 1] - BP[i])
      return refs[i] + t * (refs[i + 1] - refs[i])
    }
  }
  return refs[BP.length - 1]
}

function getAlienRef(c: { duration_seconds: number; pre_fatigue: string | null }): number {
  return interpolateAlienRef(c.duration_seconds / 60, fatigueToTable(c.pre_fatigue))
}

interface ScoreCoeffs {
  temp: number
  altitude: number
  intensity: number
}

function getCoeffs(c: {
  temp_bottom_celsius: number | null
  temp_summit_celsius: number | null
  altitude_summit_m: number | null
  intensity_rating: number | null
}): ScoreCoeffs {
  // Température (pied prioritaire, sinon sommet)
  const t = c.temp_bottom_celsius ?? c.temp_summit_celsius ?? null
  let cTemp = 1.00
  if (t !== null) {
    if      (t >= 10 && t <= 18) cTemp = 1.00
    else if (t >=  5 && t <  10) cTemp = 1.02
    else if (t <   5)            cTemp = 1.04
    else if (t >  18 && t <= 25) cTemp = 1.01
    else if (t >  25 && t <= 30) cTemp = 1.03
    else if (t >  30)            cTemp = 1.04
  }

  // Altitude sommet
  const alt = c.altitude_summit_m
  const cAltitude = alt == null ? 1.00
    : alt < 500  ? 1.00 : alt < 1000 ? 1.01 : alt < 1500 ? 1.02
    : alt < 2000 ? 1.03 : alt < 2500 ? 1.04 : 1.05

  // Ressenti inversé (plafond à ×1.06)
  const intensityMap: Record<number, number> = { 5: 1.00, 4: 1.02, 3: 1.04, 2: 1.06, 1: 1.06 }
  const cIntensity = c.intensity_rating != null ? (intensityMap[c.intensity_rating] ?? 1.00) : 1.00

  return { temp: cTemp, altitude: cAltitude, intensity: cIntensity }
}

interface ScoreDetails {
  alienRef: number
  scoreBrut: number
  total: number
  coeffs: ScoreCoeffs
}

function computeScoreDetails(c: ClimbRecord): ScoreDetails {
  const alienRef  = getAlienRef(c)
  const scoreBrut = (c.wpkg / alienRef) * 100
  const coeffs    = getCoeffs(c)
  const total     = Math.min(100, scoreBrut * coeffs.temp * coeffs.altitude * coeffs.intensity)
  return { alienRef, scoreBrut, total, coeffs }
}

function calcScore(c: ClimbRecord): number {
  return computeScoreDetails(c).total
}

// ─── Niveaux ──────────────────────────────────────────────────────────────────
interface Level { label: string; color: string; min: number; max: number }
const LEVELS: Level[] = [
  { label: 'Alien',              color: '#00FF87', min: 95, max: 100 },
  { label: 'Pro top intl.',      color: '#06B6D4', min: 90, max:  94 },
  { label: 'Pro',                color: '#5B6FFF', min: 80, max:  89 },
  { label: 'Amateur haut niv.',  color: '#FFD700', min: 65, max:  79 },
  { label: 'Bon amateur',        color: '#FF9500', min: 50, max:  64 },
  { label: 'Amateur',            color: '#D1D5DB', min: 30, max:  49 },
  { label: 'Débutant',           color: '#EF4444', min:  0, max:  29 },
]
function levelOf(s: number): Level {
  return LEVELS.find(l => s >= l.min) ?? LEVELS[LEVELS.length - 1]
}
function scoreColor(s: number): string {
  const l = levelOf(s); return l.color
}

// Durées affichées dans le barème (doivent correspondre à des paliers BP exacts)
// Indices dans BP = [5,10,20,30,45,60,90,120] → [1,2,3,4,5,6]
const BAREM_DURS    = [10, 20, 30, 45, 60, 90]
const BAREM_BP_IDX  = [ 1,  2,  3,  4,  5,  6]

// ─── Shared styles ────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1px solid var(--border-mid)', background: 'var(--input-bg)',
  color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 13,
  fontVariantNumeric: 'tabular-nums',
  outline: 'none', boxSizing: 'border-box',
}
const inpGrey: React.CSSProperties = { ...inp, border: '1px solid var(--border)' }
// Sections : surfaces neutres uniformes (DS — séparation par l'espace/le fond,
// pas par des cadres colorés). Les anciens args de couleur sont ignorés.
const secBox = (_bg?: string, _border?: string): React.CSSProperties => ({
  background: 'var(--bg-card2)', border: '1px solid var(--border)',
  borderRadius: 12, padding: '14px 16px', marginBottom: 10,
})
const secHdr: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }
const secLbl = (_color?: string): React.CSSProperties => ({
  fontFamily: 'var(--font-body)', fontSize: 10.5, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)',
})
const lbl10: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 5, marginTop: 0,
}
const tog = (active: boolean, _color?: string): React.CSSProperties => ({
  padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
  border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
  fontSize: 11, fontWeight: active ? 700 : 500,
  background: active ? 'var(--primary-dim)' : 'transparent',
  color: active ? 'var(--primary)' : 'var(--text-dim)',
  transition: 'all 0.15s', whiteSpace: 'nowrap' as const,
})
const calcBadge = (txt: string, _color?: string) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '4px 10px', borderRadius: 6,
    background: 'var(--bg-card2)', border: '1px solid var(--border)',
    fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, color: 'var(--text)',
    fontVariantNumeric: 'tabular-nums',
    marginTop: 6, marginRight: 6,
  }}>⟶ {txt}</div>
)

// ─── Scatter SVG ─────────────────────────────────────────────────────────────
const PL = 48, PR = 16, PT = 16, PB = 40
interface TooltipState { climb: ClimbRecord; x: number; y: number }

function ScatterSVG({ climbs, allYears, onPointClick, highlightIds }: {
  climbs: ClimbRecord[]
  allYears: string[]
  onPointClick: (c: ClimbRecord) => void
  highlightIds: Set<string> | null
}) {
  const { t } = useI18n()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(520)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const isDark = useDarkMode()

  useEffect(() => {
    if (!wrapRef.current) return
    const ro = new ResizeObserver(e => setW(e[0]?.contentRect.width ?? 520))
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  // Couleurs adaptatives dark / light
  const gridColor  = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'
  const axisColor  = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'
  const labelColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)'
  const axisLblColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
  const dimPointColor = isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.15)'

  const H  = Math.max(220, Math.min(w * 0.48, 300))
  const CW = w - PL - PR, CH = H - PT - PB
  const maxDurMin = Math.max(...climbs.map(c => c.duration_seconds / 60))
  const maxWkg    = Math.max(...climbs.map(c => c.wpkg))
  // Axe X : pas fixe de 15 min, minimum 30 min affiché
  const xStep = 15
  const xMax  = Math.max(30, Math.ceil(maxDurMin * 1.15 / 15) * 15)
  // Axe Y : pas fixe de 0.5 W/kg
  const yStep = 0.5
  const yMax  = Math.ceil(maxWkg * 1.20 / 0.5) * 0.5
  const xPos = (d: number) => PL + (d / xMax) * CW
  const yPos = (v: number) => PT + CH - (v / yMax) * CH
  const xTicks: number[] = []; for (let v = 0; v <= xMax; v += xStep) xTicks.push(v)
  const yTicks: number[] = []; for (let v = 0; v <= yMax + 0.01; v += yStep) yTicks.push(parseFloat(v.toFixed(1)))

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <svg width="100%" height={H} viewBox={`0 0 ${w} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
        {/* Grille verticale — toutes les 15 min */}
        {xTicks.map(v => <line key={`xg${v}`} x1={xPos(v)} y1={PT} x2={xPos(v)} y2={PT+CH} stroke={gridColor} strokeWidth={1}/>)}
        {/* Grille horizontale — tous les 0.5 W/kg */}
        {yTicks.map(v => <line key={`yg${v}`} x1={PL} y1={yPos(v)} x2={PL+CW} y2={yPos(v)} stroke={gridColor} strokeWidth={1}/>)}
        {/* Axes */}
        <line x1={PL} y1={PT} x2={PL} y2={PT+CH} stroke={axisColor} strokeWidth={1}/>
        <line x1={PL} y1={PT+CH} x2={PL+CW} y2={PT+CH} stroke={axisColor} strokeWidth={1}/>
        {/* Labels axe X */}
        {xTicks.map(v => <text key={`xl${v}`} x={xPos(v)} y={PT+CH+14} textAnchor="middle" fontSize={9} fontFamily="DM Mono,monospace" fill={labelColor}>{v}</text>)}
        <text x={PL+CW/2} y={H-2} textAnchor="middle" fontSize={9} fontFamily="DM Sans,sans-serif" fill={axisLblColor}>{t('lo2.durationMinAxis')}</text>
        {/* Labels axe Y */}
        {yTicks.map(v => <text key={`yl${v}`} x={PL-7} y={yPos(v)+3} textAnchor="end" fontSize={9} fontFamily="DM Mono,monospace" fill={labelColor}>{v.toFixed(1)}</text>)}
        <text x={11} y={PT+CH/2} textAnchor="middle" fontSize={9} fontFamily="DM Sans,sans-serif" fill={axisLblColor} transform={`rotate(-90,11,${PT+CH/2})`}>W/kg</text>
        {/* Points — grisés si hors filtre actif */}
        {climbs.map(c => {
          const cx  = xPos(c.duration_seconds / 60)
          const cy  = yPos(c.wpkg)
          const col = yearColor(yearOf(c.date), allYears)
          const lit = highlightIds === null || highlightIds.has(c.id)
          return (
            <g key={c.id} style={{ cursor: 'pointer' }} onClick={() => onPointClick(c)}>
              <circle cx={cx} cy={cy} r={12} fill="transparent"/>
              <circle cx={cx} cy={cy} r={lit ? 6 : 4} fill={lit ? col : dimPointColor}
                fillOpacity={lit ? 0.90 : 1}
                stroke={lit ? col : dimPointColor} strokeWidth={lit ? 1.5 : 1}
                strokeOpacity={lit ? 0.6 : 1}
                style={{ transition: 'all 0.2s' }}
                onMouseEnter={e => setTooltip({ climb: c, x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setTooltip(null)}/>
            </g>
          )
        })}
      </svg>
      {tooltip && createPortal(
        <div style={{
          position: 'fixed', left: tooltip.x+14, top: tooltip.y-8,
          zIndex: 9999, background: 'var(--bg-card2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 14px', minWidth: 200, pointerEvents: 'none',
          boxShadow: '0 4px 24px rgba(0,0,0,0.55)',
        }}>
          <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:13, color:'var(--text)', marginBottom:6 }}>{tooltip.climb.name}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
            <span style={{ fontSize:11, color:'var(--text-dim)' }}>{new Date(tooltip.climb.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})}</span>
            <span style={{ fontFamily:'DM Mono,monospace', fontSize:14, fontWeight:700, color:BIKE_COLOR }}>{tooltip.climb.wpkg.toFixed(2)} W/kg</span>
            <span style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:'var(--text-mid)' }}>{tooltip.climb.watts_avg} W · {secToHMS(tooltip.climb.duration_seconds)}</span>
            {tooltip.climb.score != null && (
              <span style={{ fontFamily:'DM Mono,monospace', fontSize:11, color: scoreColor(tooltip.climb.score) }}>
                {t('perf2.score')} {tooltip.climb.score.toFixed(0)}/100 — {levelOf(tooltip.climb.score).label}
              </span>
            )}
            <span style={{ fontSize:10, color:'var(--text-dim)', opacity:0.7, marginTop:2 }}>{t('perf2.clickToEdit')}</span>
          </div>
        </div>, document.body
      )}
    </div>
  )
}

// ─── ClimbDrawer ──────────────────────────────────────────────────────────────
interface ClimbDrawerProps {
  profileWeight: number
  existing?: ClimbRecord
  onSaved: (rec: ClimbRecord) => void
  onDeleted?: (id: string) => void
  onClose: () => void
}

function ClimbDrawer({ profileWeight, existing, onSaved, onDeleted, onClose }: ClimbDrawerProps) {
  const { t } = useI18n()
  const isEdit = Boolean(existing)
  const [mounted, setMounted]   = useState(false)
  const [visible, setVisible]   = useState(false)
  const [closing, setClosing]   = useState(false)
  const [name,    setName]          = useState(existing?.name ?? '')
  const [date,    setDate]          = useState(existing?.date ?? new Date().toISOString().slice(0,10))
  const [watts,   setWatts]         = useState(existing ? String(existing.watts_avg) : '')
  const [duration, setDuration]     = useState(existing ? secToInput(existing.duration_seconds) : '')
  const [weight,  setWeight]        = useState(existing ? String(existing.weight_kg) : profileWeight > 0 ? String(profileWeight) : '')
  const [lengthKm, setLengthKm]     = useState(existing?.length_km != null ? String(existing.length_km) : '')
  const [gradient, setGradient]     = useState(existing?.avg_gradient_pct != null ? String(existing.avg_gradient_pct) : '')
  const [altitude, setAltitude]     = useState(existing?.altitude_summit_m != null ? String(existing.altitude_summit_m) : '')
  const [preFatigue, setPreFatigue] = useState(existing?.pre_fatigue ?? 'fresh')
  const [withNutrition, setWithNutrition] = useState(existing?.with_nutrition ?? false)
  const [tempBottom, setTempBottom] = useState(existing?.temp_bottom_celsius != null ? String(existing.temp_bottom_celsius) : '')
  const [tempSummit, setTempSummit] = useState(existing?.temp_summit_celsius != null ? String(existing.temp_summit_celsius) : '')
  const [intensity, setIntensity]   = useState<number | null>(existing?.intensity_rating ?? null)
  const [saving,    setSaving]   = useState(false)
  const [deleting,  setDeleting] = useState(false)
  const [error,     setError]    = useState<string | null>(null)
  const [raceName,  setRaceName] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    const t = setTimeout(() => setVisible(true), 10)
    // Fetch linked race name if race_id is set
    if (existing?.race_id) {
      void (async () => {
        try {
          const sb = createClient()
          const { data } = await sb.from('race_records').select('name').eq('id', existing.race_id!).maybeSingle()
          if (data?.name) setRaceName(data.name)
        } catch { /* ignore */ }
      })()
    }
    return () => clearTimeout(t)
  }, [])
  if (!mounted) return null

  function handleClose() { setClosing(true); setTimeout(() => onClose(), 300) }
  const shown = visible && !closing

  const wattsN  = parseInt(watts) || 0
  const weightN = parseFloat(weight) || 0
  const durSecs = toSec(duration)
  const durMin  = durSecs > 0 ? (durSecs / 60).toFixed(1) : null
  const wkg     = wattsN > 0 && weightN > 0 ? wattsN / weightN : 0
  const lenN    = parseFloat(lengthKm) || 0
  const gradN   = parseFloat(gradient) || 0
  const dPlus   = lenN > 0 && gradN > 0 ? Math.round(lenN * 1000 * gradN / 100) : 0
  const canSave = name.trim() !== '' && wattsN > 0 && durSecs > 0 && weightN > 0

  // Prévisualisation du score en temps réel
  const previewScore = wkg > 0 && durSecs > 0
    ? calcScore({
        wpkg: wkg, pre_fatigue: preFatigue, duration_seconds: durSecs,
        temp_bottom_celsius: tempBottom !== '' ? parseFloat(tempBottom) : null,
        temp_summit_celsius: tempSummit !== '' ? parseFloat(tempSummit) : null,
        altitude_summit_m: parseFloat(altitude) > 0 ? Math.round(parseFloat(altitude)) : null,
        intensity_rating: intensity,
      } as ClimbRecord)
    : null

  async function handleSave() {
    if (!canSave) return
    setSaving(true); setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error(t('perf2.notConnected'))
      const partialRecord = {
        wpkg: parseFloat(wkg.toFixed(3)),
        pre_fatigue: preFatigue,
        duration_seconds: durSecs,
        temp_bottom_celsius: tempBottom !== '' ? parseFloat(tempBottom) : null,
        temp_summit_celsius: tempSummit !== '' ? parseFloat(tempSummit) : null,
        altitude_summit_m: parseFloat(altitude) > 0 ? Math.round(parseFloat(altitude)) : null,
        intensity_rating: intensity,
      } as ClimbRecord
      const computedScore = parseFloat(calcScore(partialRecord).toFixed(2))
      const payload = {
        user_id: user.id, name: name.trim(), date,
        watts_avg: wattsN, duration_seconds: durSecs,
        weight_kg: weightN, wpkg: partialRecord.wpkg,
        score: computedScore,
        length_km: lenN > 0 ? lenN : null,
        avg_gradient_pct: gradN > 0 ? gradN : null,
        altitude_summit_m: partialRecord.altitude_summit_m,
        pre_fatigue: preFatigue, with_nutrition: withNutrition,
        temp_bottom_celsius: partialRecord.temp_bottom_celsius,
        temp_summit_celsius: partialRecord.temp_summit_celsius,
        intensity_rating: intensity,
        race_id: existing?.race_id ?? null,
      }
      let data: ClimbRecord
      if (isEdit && existing) {
        const { data: d, error: dbErr } = await supabase.from('climb_records').update(payload).eq('id', existing.id).select().single()
        if (dbErr) throw new Error(dbErr.message ?? JSON.stringify(dbErr))
        data = d as ClimbRecord
      } else {
        const { data: d, error: dbErr } = await supabase.from('climb_records').insert(payload).select().single()
        if (dbErr) throw new Error(dbErr.message ?? JSON.stringify(dbErr))
        data = d as ClimbRecord
      }
      onSaved(data); handleClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e) || t('perf2.unknownError'))
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!existing || !onDeleted) return
    setDeleting(true); setError(null)
    try {
      const supabase = createClient()
      const { error: dbErr } = await supabase.from('climb_records').delete().eq('id', existing.id)
      if (dbErr) throw new Error(dbErr.message ?? JSON.stringify(dbErr))
      onDeleted(existing.id); handleClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e) || t('perf2.unknownError'))
      setDeleting(false)
    }
  }

  return createPortal(
    <div style={{
      position:'fixed', inset:0, zIndex:3100,
      background: shown ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0)',
      display:'flex', alignItems:'flex-end',
      transition:'background 300ms ease-out',
    }} onClick={e => { if (e.target === e.currentTarget) handleClose() }}>
      <div style={{
        width:'100%', maxWidth:540, margin:'0 auto',
        maxHeight:'calc(100dvh - 72px)', background:'var(--bg-card)',
        borderRadius:'20px 20px 0 0', border:'1px solid var(--border)',
        display:'flex', flexDirection:'column', overflow:'hidden',
        transform:`translateY(${shown ? '0%' : '100%'})`,
        transition:'transform 300ms ease-out',
      }}>
        {/* Poignée de glissement — laisse voir la page derrière en haut */}
        <div style={{ display:'flex', justifyContent:'center', padding:'8px 0 2px', flexShrink:0 }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--border-mid)' }}/>
        </div>
        {/* Header */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'10px 20px 16px', flexShrink:0, flexWrap:'wrap', gap:8,
          background:'var(--bg-card)', borderBottom:'1px solid var(--border)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:8, background:'var(--bg-card2)', fontSize:11, fontWeight:600, color:'var(--text-mid)' }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:BIKE_COLOR }}/>{t('perf2.cycling')}
            </span>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, margin:0, color:'var(--text)' }}>
              {isEdit ? t('perf2.editThisClimb') : t('perf2.newClimb')}
            </h2>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ padding:'5px 9px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:11, outline:'none' }}/>
            <button onClick={handleClose} style={{
              width:28, height:28, borderRadius:'50%', border:'1px solid var(--border)',
              background:'var(--bg-card2)', color:'var(--text-dim)', cursor:'pointer',
              fontSize:16, display:'flex', alignItems:'center', justifyContent:'center',
            }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px 120px' }}>

          {/* IDENTIFICATION */}
          <div style={secBox(`${BIKE_COLOR}0e`, `${BIKE_COLOR}25`)}>
            <div style={secHdr}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth={2.5}><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 1 8 8c0 5-8 12-8 12S4 15 4 10a8 8 0 0 1 8-8z"/></svg>
              <span style={secLbl(BIKE_COLOR)}>{t('perf2.identification')}</span>
            </div>
            <p style={lbl10}>{t('perf2.climbName')}</p>
            <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder={t('perf2.climbNamePlaceholder')} autoFocus={!isEdit}/>
            {existing?.race_id && (
              <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:6,
                            background:'var(--bg-card2)', border:'1px solid var(--border)',
                            borderRadius:8, padding:'6px 10px' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth={2}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                <span style={{ fontSize:11, color:'var(--text-dim)' }}>{t('perf2.linkedRace')} :</span>
                <span style={{ fontSize:11, fontWeight:600, color:'var(--text)' }}>{raceName ?? '…'}</span>
              </div>
            )}
          </div>

          {/* PERFORMANCE */}
          <div style={secBox(`${BIKE_COLOR}12`, `${BIKE_COLOR}30`)}>
            <div style={secHdr}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth={2.5}><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <span style={secLbl(BIKE_COLOR)}>{t('perf2.performance')}</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <p style={lbl10}>{t('perf2.avgWattsRequired')}</p>
                <input style={inp} type="number" value={watts} onChange={e => setWatts(e.target.value)} placeholder="ex : 280"/>
              </div>
              <div>
                <p style={lbl10}>{t('perf2.climbTimeRequired')}</p>
                <input style={inp} value={duration} onChange={e => setDuration(e.target.value)} placeholder="mm:ss ou hh:mm:ss"/>
              </div>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', marginTop:4 }}>
              {wkg > 0 && calcBadge(`${wkg.toFixed(2)} W/kg`)}
              {durMin && calcBadge(`${durMin} min`)}
            </div>
          </div>

          {/* PROFIL */}
          <div style={secBox('rgba(255,255,255,0.04)', 'var(--border)')}>
            <div style={secHdr}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-mid)" strokeWidth={2}><polyline points="3 17 9 11 13 15 22 6"/><polyline points="14 6 22 6 22 14"/></svg>
              <span style={secLbl('var(--text-mid)')}>{t('perf2.climbProfile')}</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
              <div><p style={lbl10}>{t('perf2.lengthKm')}</p><input style={inpGrey} type="number" value={lengthKm} onChange={e=>setLengthKm(e.target.value)} placeholder="13.8"/></div>
              <div><p style={lbl10}>{t('perf2.avgGradient')}</p><input style={inpGrey} type="number" value={gradient} onChange={e=>setGradient(e.target.value)} placeholder="8.1"/></div>
              <div><p style={lbl10}>{t('perf2.summitAltitude')}</p><input style={inpGrey} type="number" value={altitude} onChange={e=>setAltitude(e.target.value)} placeholder="1850"/></div>
            </div>
            {dPlus > 0 && <div style={{ marginTop:4 }}>{calcBadge(`D+ ${dPlus} m`, '#6b7280')}</div>}
          </div>

          {/* CONDITIONS */}
          <div style={secBox('rgba(255,255,255,0.04)', 'var(--border)')}>
            <div style={secHdr}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-mid)" strokeWidth={2}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span style={secLbl('var(--text-mid)')}>{t('perf2.conditions')}</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <p style={lbl10}>{t('perf2.weightThatDay')}</p>
                <input style={inpGrey} type="number" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="ex : 70.5"/>
              </div>
              <div>
                <p style={lbl10}>{t('perf2.preFatigue')}</p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:2 }}>
                  {(['fresh','light','moderate','high'] as const).map(f => (
                    <button key={f} style={tog(preFatigue===f)} onClick={()=>setPreFatigue(f)}>{t(`perf2.preFatigue_${f}`)}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div><p style={lbl10}>{t('perf2.tempBottom')}</p><input style={inpGrey} type="number" value={tempBottom} onChange={e=>setTempBottom(e.target.value)} placeholder="ex : 18"/></div>
              <div><p style={lbl10}>{t('perf2.tempSummit')}</p><input style={inpGrey} type="number" value={tempSummit} onChange={e=>setTempSummit(e.target.value)} placeholder="ex : 8"/></div>
            </div>
            <div style={{ marginBottom:12 }}>
              <p style={lbl10}>{t('perf2.subjectiveIntensity')}</p>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                {([5,4,3,2,1] as const).map(v => (
                  <button key={v} onClick={()=>setIntensity(intensity===v ? null : v)} style={{
                    ...tog(intensity===v), display:'flex', flexDirection:'column', alignItems:'center',
                    padding:'6px 10px', gap:2, flex:1, minWidth:54,
                  }}>
                    <span style={{ fontSize:13, fontWeight:700 }}>{v}</span>
                    <span style={{ fontSize:9, opacity:0.8 }}>{t(`perf2.intensity_${v}`)}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <button type="button" onClick={()=>setWithNutrition(v=>!v)} style={{
                width:36, height:20, borderRadius:10, flexShrink:0,
                background: withNutrition ? 'var(--primary)' : 'var(--bg-card2)',
                border:`1px solid ${withNutrition ? 'var(--primary)' : 'var(--border)'}`,
                cursor:'pointer', position:'relative', transition:'background 0.2s',
              }}>
                <span style={{ position:'absolute', top:2, borderRadius:'50%', width:14, height:14, background:'var(--on-primary)', left: withNutrition ? 19 : 2, transition:'left 0.2s' }}/>
              </button>
              <span style={{ fontSize:12, color:'var(--text-dim)' }}>{withNutrition ? t('perf2.withNutrition') : t('perf2.withoutNutrition')}</span>
            </div>
          </div>

          {/* RÉSUMÉ avec score */}
          {canSave && previewScore != null && (
            <div style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px' }}>
              <div style={secHdr}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth={2.5}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span style={secLbl()}>{t('perf2.summary')}</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                <div>
                  <p style={{ ...lbl10, marginBottom:2 }}>W/kg</p>
                  <p style={{ fontFamily:'var(--font-body)', fontVariantNumeric:'tabular-nums', fontSize:20, fontWeight:700, margin:0, color:'var(--text)' }}>{wkg.toFixed(2)}</p>
                </div>
                <div>
                  <p style={{ ...lbl10, marginBottom:2 }}>{t('perf2.duration')}</p>
                  <p style={{ fontFamily:'var(--font-body)', fontVariantNumeric:'tabular-nums', fontSize:20, fontWeight:700, margin:0, color:'var(--text)' }}>
                    {durMin} <span style={{ fontSize:11, fontWeight:500, color:'var(--text-dim)' }}>min</span>
                  </p>
                </div>
                <div>
                  <p style={{ ...lbl10, marginBottom:2 }}>{t('perf2.score')}</p>
                  <p style={{ fontFamily:'var(--font-body)', fontVariantNumeric:'tabular-nums', fontSize:20, fontWeight:700, margin:0, color:'var(--text)' }}>
                    {previewScore.toFixed(0)}<span style={{ fontSize:11, fontWeight:500, color:'var(--text-dim)' }}>/100</span>
                  </p>
                  <p style={{ fontSize:10, color: scoreColor(previewScore), margin:'2px 0 0', fontWeight:600 }}>{levelOf(previewScore).label}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fixed save */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'12px 20px 20px', background:'var(--bg-card)', borderTop:'1px solid var(--border)' }}>
          {error && <div style={{ fontSize:11, color:'#f87171', background:'rgba(239,68,68,0.1)', borderRadius:8, padding:'6px 10px', marginBottom:8 }}>{error}</div>}
          <button onClick={()=>void handleSave()} disabled={!canSave||saving} style={{
            width:'100%', padding:'14px', borderRadius:12, border:'none',
            cursor: canSave&&!saving ? 'pointer' : 'not-allowed',
            background: canSave&&!saving ? 'var(--primary)' : 'var(--bg-card2)',
            color: canSave&&!saving ? 'var(--on-primary)' : 'var(--text-dim)',
            fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, transition:'all 0.15s',
            marginBottom: isEdit ? 8 : 0,
          }}>
            {saving ? t('perf2.saving') : isEdit ? t('perf2.saveChanges') : t('perf2.saveThisClimb')}
          </button>
          {isEdit && (
            <button onClick={()=>void handleDelete()} disabled={deleting} style={{
              width:'100%', padding:'10px', borderRadius:12,
              border:'1px solid rgba(239,68,68,0.4)', cursor:'pointer',
              background:'rgba(239,68,68,0.08)', color:'#f87171',
              fontFamily:'var(--font-body)', fontSize:13, fontWeight:600, transition:'all 0.15s',
            }}>
              {deleting ? t('perf2.deleting') : t('perf2.deleteThisClimb')}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Accordion ────────────────────────────────────────────────────────────────
function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', marginTop:12 }}>
      <button onClick={()=>setOpen(o=>!o)} style={{
        width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'12px 16px', background:'var(--bg-card2)', border:'none',
        cursor:'pointer', color:'var(--text)', fontFamily:'Syne,sans-serif',
        fontSize:12, fontWeight:700, textAlign:'left',
      }}>
        {title}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="var(--text-dim)" strokeWidth={2}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition:'transform 0.2s', flexShrink:0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && <div style={{ padding:'14px 16px', background:'var(--bg-card)' }}>{children}</div>}
    </div>
  )
}

// ─── Filtres durée ────────────────────────────────────────────────────────────
type DurFilterId = 'lt5' | '5-10' | '10-20' | '20-30' | '30-60' | '1h+'
const DUR_FILTERS: { label: string; id: DurFilterId | null }[] = [
  { label: 'Toutes',  id: null    },
  { label: "<5'",     id: 'lt5'   },
  { label: "5-10'",   id: '5-10'  },
  { label: "10-20'",  id: '10-20' },
  { label: "20-30'",  id: '20-30' },
  { label: "30-60'",  id: '30-60' },
  { label: "1H+",     id: '1h+'   },
]
function matchDurFilter(durSec: number, id: DurFilterId | null): boolean {
  const min = durSec / 60
  if (!id)             return true
  if (id === 'lt5')    return min < 5
  if (id === '5-10')   return min >= 5  && min < 10
  if (id === '10-20')  return min >= 10 && min < 20
  if (id === '20-30')  return min >= 20 && min < 30
  if (id === '30-60')  return min >= 30 && min < 60
  if (id === '1h+')    return min >= 60
  return true
}

// ─── BaremeAccordion — 3 onglets dynamiques ───────────────────────────────────
const BAREM_TABLE_LABELS: Record<FatigueTable, string> = {
  standard: 'Standard (frais / légère)',
  moderate: 'Pré-fatigue modérée',
  heavy:    'Grosse pré-fatigue',
}

const BAREM_TABLE_KEY: Record<FatigueTable, string> = {
  standard: 'perf2.baremStandard', moderate: 'perf2.baremModerate', heavy: 'perf2.baremHeavy',
}

function BaremeAccordion() {
  const { t } = useI18n()
  const [tab, setTab] = useState<FatigueTable>('standard')

  // 6 niveaux affichés (Alien → Amateur), correspondant aux 6 lignes de REF_TABLES_ALL
  const shownLevels = LEVELS.slice(0, 6)

  return (
    <Accordion title={t('perf2.levelsScale')}>
      {/* Onglets */}
      <div style={{ display:'flex', gap:5, marginBottom:12, flexWrap:'wrap' }}>
        {(['standard','moderate','heavy'] as FatigueTable[]).map(tbl => (
          <button key={tbl} onClick={()=>setTab(tbl)} style={{
            ...tog(tab===tbl), fontSize:10, padding:'5px 10px',
          }}>
            {t(BAREM_TABLE_KEY[tbl])}
          </button>
        ))}
      </div>

      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
          <thead>
            <tr>
              <th style={{ textAlign:'left', padding:'4px 6px', color:'var(--text-dim)', fontWeight:600, borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>
                {t('perf2.duration')}
              </th>
              {shownLevels.map(l => (
                <th key={l.label} style={{ textAlign:'right', padding:'4px 6px', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>
                  <span style={{ color:l.color, fontWeight:700 }}>{l.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BAREM_DURS.map((dur, ri) => {
              const bpIdx = BAREM_BP_IDX[ri]
              return (
                <tr key={dur} style={{ background: ri%2===0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <td style={{ padding:'5px 6px', fontFamily:'DM Mono,monospace', color:'var(--text-dim)', fontWeight:600 }}>{dur} min</td>
                  {shownLevels.map((l, li) => {
                    const val = REF_TABLES_ALL[tab][li][bpIdx]
                    return (
                      <td key={l.label} style={{ padding:'5px 6px', fontFamily:'DM Mono,monospace', color:'var(--text-mid)', textAlign:'right' }}>
                        ≥ {val.toFixed(1)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize:10, color:'var(--text-dim)', margin:'8px 0 0', lineHeight:1.5 }}>
        {t('perf2.baremFootnote')}
      </p>
    </Accordion>
  )
}

// ─── RankingDrawer ────────────────────────────────────────────────────────────
function RankingDrawer({ climbs, onClose, onFilterChange }: {
  climbs: ClimbRecord[]
  onClose: () => void
  onFilterChange: (ids: Set<string> | null) => void
}) {
  const { t } = useI18n()
  const [mounted, setMounted]         = useState(false)
  const [visible, setVisible]         = useState(false)
  const [closing, setClosing]         = useState(false)
  const [expanded, setExpanded]       = useState<string | null>(null)
  const [yearFilter, setYearFilter]   = useState<string | null>(null)
  const [durFilter,  setDurFilter]    = useState<DurFilterId | null>(null)

  // Années présentes dans les données
  const allYearsRanking = [...new Set(climbs.map(c => yearOf(c.date)))].sort()

  useEffect(() => {
    setMounted(true)
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  // Synchroniser la surbrillance du graphique à chaque changement de filtre
  useEffect(() => {
    if (yearFilter === null && durFilter === null) {
      onFilterChange(null)
      return
    }
    const ids = new Set(
      climbs
        .filter(c =>
          (yearFilter === null || yearOf(c.date) === yearFilter) &&
          matchDurFilter(c.duration_seconds, durFilter)
        )
        .map(c => c.id)
    )
    onFilterChange(ids)
  }, [yearFilter, durFilter, climbs, onFilterChange])

  if (!mounted) return null

  function handleClose() {
    onFilterChange(null)
    setClosing(true)
    setTimeout(() => onClose(), 300)
  }
  const shown = visible && !closing

  // Liste filtrée + re-classée sur le sous-ensemble
  const ranked = [...climbs]
    .filter(c =>
      (yearFilter === null || yearOf(c.date) === yearFilter) &&
      matchDurFilter(c.duration_seconds, durFilter)
    )
    .map(c => ({ c, sd: computeScoreDetails(c) }))
    .sort((a, b) => b.sd.total - a.sd.total)

  return createPortal(
    <div style={{
      position:'fixed', inset:0, zIndex:3100,
      background: shown ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0)',
      display:'flex', alignItems:'flex-end',
      transition:'background 300ms ease-out',
    }} onClick={e => { if (e.target === e.currentTarget) handleClose() }}>
      <div style={{
        width:'100%', maxWidth:540, margin:'0 auto',
        maxHeight:'calc(100dvh - 72px)', background:'var(--bg-card)',
        borderRadius:'20px 20px 0 0', border:'1px solid var(--border)',
        display:'flex', flexDirection:'column', overflow:'hidden',
        transform:`translateY(${shown ? '0%' : '100%'})`,
        transition:'transform 300ms ease-out',
      }}>
        {/* Poignée de glissement */}
        <div style={{ display:'flex', justifyContent:'center', padding:'8px 0 2px', flexShrink:0 }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--border-mid)' }}/>
        </div>
        {/* Header */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'10px 20px 16px', flexShrink:0,
          background:'var(--bg-card)', borderBottom:'1px solid var(--border)',
        }}>
          <div>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:600, margin:0, color:'var(--text)' }}>{t('perf2.climbsRanking')}</h2>
            <p style={{ fontSize:11, color:'var(--text-dim)', margin:'3px 0 0' }}>{t('perf2.normalizedScore')}</p>
          </div>
          <button onClick={handleClose} style={{
            width:28, height:28, borderRadius:'50%', border:'1px solid var(--border)',
            background:'var(--bg-card2)', color:'var(--text-dim)', cursor:'pointer',
            fontSize:16, display:'flex', alignItems:'center', justifyContent:'center',
          }}>×</button>
        </div>

        {/* Filtres */}
        <div style={{ padding:'10px 16px 0', flexShrink:0, borderBottom:'1px solid var(--border)' }}>
          {/* Filtre année */}
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:8 }}>
            <button style={tog(yearFilter===null, BIKE_COLOR)} onClick={()=>setYearFilter(null)}>{t('perf2.all')}</button>
            {allYearsRanking.map(yr => (
              <button key={yr} style={tog(yearFilter===yr, BIKE_COLOR)} onClick={()=>setYearFilter(yr===yearFilter ? null : yr)}>{yr}</button>
            ))}
          </div>
          {/* Filtre durée */}
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:10 }}>
            {DUR_FILTERS.map(({ label, id }) => (
              <button key={label} style={tog(durFilter===id, '#6b7280')} onClick={()=>setDurFilter(id===durFilter ? null : id)}>{id === null ? t('perf2.all') : label}</button>
            ))}
          </div>
          {/* Résumé filtre actif */}
          {(yearFilter || durFilter) && (
            <div style={{ fontSize:10, color:'var(--text-dim)', marginBottom:8 }}>
              {ranked.length} {ranked.length!==1?t('perf2.climbsFilteredPlural'):t('perf2.climbFilteredSingular')}
              {ranked.length === 0 && ` — ${t('perf2.noResult')}`}
            </div>
          )}
        </div>

        {/* List */}
        <div style={{ flex:1, overflowY:'auto', padding:'12px 16px 24px' }}>
          {ranked.length === 0 && (
            <div style={{ textAlign:'center', padding:'32px 20px', color:'var(--text-dim)', fontSize:12 }}>
              {t('perf2.noClimbForFilter')}
            </div>
          )}
          {ranked.map(({ c, sd }, idx) => {
            const rank = idx + 1
            const col  = scoreColor(sd.total)
            const isOpen = expanded === c.id
            return (
              <div key={c.id} style={{
                background:'var(--bg-card2)', border:'1px solid var(--border)',
                borderRadius:12, marginBottom:8, overflow:'hidden',
              }}>
                <div style={{ padding:'12px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}
                  onClick={()=>setExpanded(isOpen ? null : c.id)}>
                  {/* Rang */}
                  <div style={{
                    width:32, height:32, borderRadius:8, flexShrink:0,
                    background: rank===1 ? 'rgba(251,191,36,0.15)' : 'var(--bg-card)',
                    border:`1px solid ${rank===1 ? 'rgba(251,191,36,0.4)' : 'var(--border)'}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:700,
                    color: rank===1 ? '#fbbf24' : 'var(--text-dim)',
                  }}>{rank}</div>
                  {/* Nom */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                      <span style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</span>
                      {rank===1 && <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:4, background:'rgba(251,191,36,0.15)', color:'#fbbf24', border:'1px solid rgba(251,191,36,0.3)' }}>⭐ {t('perf2.bestPerf')}</span>}
                    </div>
                    <div style={{ display:'flex', gap:8, marginTop:2 }}>
                      <span style={{ fontSize:11, color:'var(--text-dim)' }}>{new Date(c.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})}</span>
                      <span style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:BIKE_COLOR }}>{c.wpkg.toFixed(2)} W/kg</span>
                    </div>
                  </div>
                  {/* Score */}
                  <div style={{ textAlign:'right', flexShrink:0, minWidth:70 }}>
                    <div style={{ fontFamily:'DM Mono,monospace', fontSize:18, fontWeight:800, color:col }}>{sd.total.toFixed(0)}</div>
                    <div style={{ height:4, borderRadius:2, background:'var(--bg-card)', marginTop:4, width:70 }}>
                      <div style={{ height:'100%', width:`${Math.min(100,sd.total)}%`, background:col, borderRadius:2 }}/>
                    </div>
                    <div style={{ fontSize:9, color:'var(--text-dim)', marginTop:2 }}>/ 100 · {levelOf(sd.total).label}</div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth={2}
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition:'transform 0.2s', flexShrink:0 }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
                {/* Expand — détail du calcul V4 */}
                {isOpen && (
                  <div style={{ padding:'0 14px 12px', borderTop:'1px solid var(--border)' }}>
                    <div style={{ paddingTop:10, display:'flex', flexDirection:'column', gap:7 }}>
                      {([
                        { label:'W/kg',           val: c.wpkg.toFixed(2),                         color: BIKE_COLOR },
                        { label:t('perf2.divAlienRef'),   val: `${sd.alienRef.toFixed(2)} W/kg`,           color: 'var(--text-mid)' },
                        { label:t('perf2.rawScore'),     val: `${sd.scoreBrut.toFixed(1)} / 100`,         color: 'var(--text-mid)' },
                        { label:t('perf2.mulTemperature'),  val: `×${sd.coeffs.temp.toFixed(2)}`,            color: 'var(--text-mid)' },
                        { label:t('perf2.mulAltitude'),     val: `×${sd.coeffs.altitude.toFixed(2)}`,        color: 'var(--text-mid)' },
                        { label:t('perf2.mulPerceived'),     val: `×${sd.coeffs.intensity.toFixed(2)}`,       color: 'var(--text-mid)' },
                      ] as { label: string; val: string; color: string }[]).map(({ label, val, color }) => (
                        <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ fontSize:11, color:'var(--text-dim)' }}>{label}</span>
                          <span style={{ fontFamily:'DM Mono,monospace', fontSize:11, color, fontWeight:600 }}>{val}</span>
                        </div>
                      ))}
                      <div style={{ height:1, background:'var(--border)', margin:'4px 0' }}/>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontSize:11, fontWeight:700, color:'var(--text)' }}>{t('perf2.finalScore')}</span>
                        <span style={{ fontFamily:'DM Mono,monospace', fontSize:13, fontWeight:800, color:col }}>{sd.total.toFixed(1)} / 100</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* ── Accordion : Barème dynamique 3 onglets ── */}
          <BaremeAccordion />

          {/* ── Accordion : Méthode ── */}
          <Accordion title={t('perf2.calcMethod')}>
            <p style={{ fontSize:12, fontWeight:700, color:'var(--text)', margin:'0 0 6px', fontFamily:'Syne,sans-serif' }}>{t('lo2.scoreHowTitle')}</p>
            <p style={{ fontSize:12, color:'var(--text-dim)', lineHeight:1.65, margin:'0 0 10px' }}>
              {t('lo2.scoreP1a')}<strong style={{ color:'var(--text)' }}>Alien</strong>{t('lo2.scoreP1b')}<em>{t('lo2.scoreP1et')}</em>{t('lo2.scoreP1c')}
            </p>
            <p style={{ fontSize:12, color:'var(--text-dim)', lineHeight:1.65, margin:'0 0 12px' }}>
              {t('lo2.scoreP2a')}<strong style={{ color:'var(--text)' }}>6.4 W/kg</strong>{t('lo2.scoreP2b')}<strong style={{ color:'var(--text)' }}>7.8 W/kg</strong>{t('lo2.scoreP2c')}<strong style={{ color:'var(--text)' }}>5.6 W/kg</strong>{t('lo2.scoreP2d')}
            </p>

            {/* Formule */}
            <div style={{ background:'var(--bg-card2)', border:`1px solid ${BIKE_COLOR}30`, borderRadius:8, padding:'10px 14px', margin:'0 0 6px', fontFamily:'DM Mono,monospace', fontSize:12, color:BIKE_COLOR }}>
              {t('lo2.scoreFormula1')}
            </div>
            <div style={{ background:'var(--bg-card2)', border:`1px solid ${BIKE_COLOR}30`, borderRadius:8, padding:'10px 14px', margin:'0 0 14px', fontFamily:'DM Mono,monospace', fontSize:12, color:BIKE_COLOR }}>
              {t('lo2.scoreFormula2')}
            </div>
            <p style={{ fontSize:12, color:'var(--text-dim)', lineHeight:1.65, margin:'0 0 14px' }}>
              {t('lo2.scoreP3a')}<strong style={{ color:'var(--text)' }}>{t('lo2.scoreP3strong')}</strong>{t('lo2.scoreP3b')}
            </p>

            {/* Exemples */}
            {[
              {
                title: 'lo2.scoreEx1Title',
                lines: ['lo2.scoreEx1L0','lo2.scoreEx1L1','lo2.scoreEx1L2','lo2.scoreEx1L3'],
                result: 'lo2.scoreEx1Result',
              },
              {
                title: 'lo2.scoreEx2Title',
                lines: ['lo2.scoreEx2L0','lo2.scoreEx2L1','lo2.scoreEx2L2','lo2.scoreEx2L3'],
                result: 'lo2.scoreEx2Result',
                note: 'lo2.scoreEx2Note',
              },
              {
                title: 'lo2.scoreEx3Title',
                lines: ['lo2.scoreEx3L0','lo2.scoreEx3L1','lo2.scoreEx3L2','lo2.scoreEx3L3'],
                result: 'lo2.scoreEx3Result',
                note: 'lo2.scoreEx3Note',
              },
              {
                title: 'lo2.scoreEx4Title',
                lines: ['lo2.scoreEx4L0','lo2.scoreEx4L1','lo2.scoreEx4L2'],
                note: 'lo2.scoreEx4Note',
              },
            ].map(ex => (
              <div key={ex.title} style={{ marginBottom:14, padding:'10px 12px', background:'var(--bg-card2)', borderRadius:8, border:'1px solid var(--border)' }}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--text)', margin:'0 0 6px', fontFamily:'Syne,sans-serif' }}>{t(ex.title)}</p>
                {ex.lines.map(l => (
                  <p key={l} style={{ fontSize:11, color:'var(--text-dim)', margin:'0 0 3px', fontFamily:'DM Mono,monospace' }}>{t(l)}</p>
                ))}
                {ex.result && (
                  <p style={{ fontSize:11, fontWeight:700, color:BIKE_COLOR, margin:'6px 0 0', fontFamily:'DM Mono,monospace' }}>{t(ex.result)}</p>
                )}
                {ex.note && (
                  <p style={{ fontSize:11, color:'var(--text-mid)', margin:'6px 0 0', lineHeight:1.5, fontStyle:'italic' }}>→ {t(ex.note)}</p>
                )}
              </div>
            ))}

            {/* Tableau des 3 facteurs */}
            <p style={{ fontSize:11, fontWeight:700, color:'var(--text)', margin:'4px 0 8px', fontFamily:'Syne,sans-serif', textTransform:'uppercase', letterSpacing:'0.05em' }}>{t('lo2.score3Factors')}</p>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                <thead>
                  <tr>
                    {['lo2.scoreFactorHead','lo2.scoreImpactHead','lo2.scoreMeasuresHead'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'4px 8px', color:'var(--text-dim)', fontWeight:600, borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>{t(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['lo2.scoreFactorPerceived', '+6%', 'lo2.scoreFactorPerceivedDesc'],
                    ['lo2.scoreFactorAltitude',  '+5%', 'lo2.scoreFactorAltitudeDesc'],
                    ['lo2.scoreFactorTemp',      '+4%', 'lo2.scoreFactorTempDesc'],
                  ].map(([f, imp, desc], i) => (
                    <tr key={f} style={{ background: i%2===0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ padding:'5px 8px', color:'var(--text)', fontWeight:600 }}>{t(f)}</td>
                      <td style={{ padding:'5px 8px', fontFamily:'DM Mono,monospace', color:BIKE_COLOR, fontWeight:700 }}>{imp}</td>
                      <td style={{ padding:'5px 8px', color:'var(--text-dim)' }}>{t(desc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Valeurs détaillées */}
            <p style={{ fontSize:11, fontWeight:700, color:'var(--text)', margin:'14px 0 8px', fontFamily:'Syne,sans-serif', textTransform:'uppercase', letterSpacing:'0.05em' }}>{t('lo2.scoreCoeffValues')}</p>
            {[
              { label:'lo2.scoreCoeffTemp', rows:[['lo2.scoreTemp0','×1.00'],['lo2.scoreTemp1','×1.01'],['lo2.scoreTemp2','×1.02'],['lo2.scoreTemp3','×1.03'],['lo2.scoreTemp4','×1.04'],['lo2.scoreTemp5','×1.04']] },
              { label:'lo2.scoreCoeffAltitude', rows:[['lo2.scoreAlt0','×1.00'],['lo2.scoreAlt1','×1.01'],['lo2.scoreAlt2','×1.02'],['lo2.scoreAlt3','×1.03'],['lo2.scoreAlt4','×1.04'],['lo2.scoreAlt5','×1.05']] },
              { label:'lo2.scoreCoeffPerceived', rows:[['lo2.scorePerc0','×1.00'],['lo2.scorePerc1','×1.02'],['lo2.scorePerc2','×1.04'],['lo2.scorePerc3','×1.06']] },
            ].map(({ label, rows }) => (
              <div key={label} style={{ marginBottom:10 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-mid)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>{t(label)}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  {rows.map(([cat, coeff]) => (
                    <div key={cat} style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
                      <span style={{ color:'var(--text-dim)' }}>{t(cat)}</span>
                      <span style={{ fontFamily:'DM Mono,monospace', color:BIKE_COLOR, fontWeight:700 }}>{coeff}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Accordion>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── ClimbsSection ────────────────────────────────────────────────────────────
interface ClimbsSectionProps { profile: { weight: number } }

export function ClimbsSection({ profile }: ClimbsSectionProps) {
  const { t } = useI18n()
  const [climbs,       setClimbs]       = useState<ClimbRecord[]>([])
  const [loaded,       setLoaded]       = useState(false)
  const [showDrawer,   setShowDrawer]   = useState(false)
  const [editClimb,    setEditClimb]    = useState<ClimbRecord | null>(null)
  const [showRanking,  setShowRanking]  = useState(false)
  const [highlightIds, setHighlightIds] = useState<Set<string> | null>(null)

  const handleFilterChange = useCallback((ids: Set<string> | null) => {
    setHighlightIds(ids)
  }, [])

  const allYears = [...new Set(climbs.map(c => yearOf(c.date)))].sort()

  const loadClimbs = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('climb_records').select('*').eq('user_id', user.id).order('date', { ascending: true })
    if (data) setClimbs(data as ClimbRecord[])
    setLoaded(true)
  }, [])

  useEffect(() => { void loadClimbs() }, [loadClimbs])

  function handleSaved(rec: ClimbRecord) {
    setClimbs(prev => [...prev.filter(c => c.id !== rec.id), rec].sort((a,b) => a.date.localeCompare(b.date)))
  }
  function handleDeleted(id: string) {
    setClimbs(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div style={{ background:'var(--bg-card)', borderRadius:16, padding:'16px 16px 12px', border:'1px solid var(--border)' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
        <div>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0, color:'var(--text)' }}>
            {t('perf2.climbsWkgByDuration')}
          </h2>
          {loaded && climbs.length > 0 && (
            <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:2 }}>
              {climbs.length} {climbs.length>1?t('perf2.climbsPlural'):t('perf2.climbSingular')} · {t('perf2.clickPointToEdit')}
            </div>
          )}
        </div>
        {/* 2 boutons uniquement */}
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>setShowRanking(true)} disabled={climbs.length === 0} style={{
            display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8,
            background: climbs.length > 0 ? 'var(--bg-card2)' : 'transparent',
            border:'1px solid var(--border)', color:'var(--text-mid)',
            fontSize:12, fontWeight:600, cursor: climbs.length > 0 ? 'pointer' : 'not-allowed',
            whiteSpace:'nowrap', minHeight:36, opacity: climbs.length > 0 ? 1 : 0.4,
            transition:'opacity 0.15s',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            {t('perf2.ranking')}
          </button>
          <button onClick={()=>setShowDrawer(true)} style={{
            display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8,
            background:`${BIKE_COLOR}15`, border:`1px solid ${BIKE_COLOR}40`,
            color:BIKE_COLOR, fontSize:12, fontWeight:600,
            cursor:'pointer', whiteSpace:'nowrap', minHeight:36,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>
            {t('perf2.addClimb')}
          </button>
        </div>
      </div>

      {/* Skeleton */}
      {!loaded && <div className="skeleton-shimmer" style={{ height:220, borderRadius:8 }}/>}

      {/* Empty */}
      {loaded && climbs.length === 0 && (
        <div style={{ textAlign:'center', padding:'36px 20px', border:'1px dashed var(--border)', borderRadius:10, lineHeight:1.6 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth={1.5} style={{ marginBottom:8 }}>
            <polyline points="3 17 9 11 13 15 22 6"/><polyline points="14 6 22 6 22 14"/>
          </svg>
          <div style={{ fontSize:12, color:'var(--text-dim)' }}>{t('perf2.noClimbRecorded')}</div>
          <div style={{ fontSize:11, color:'var(--text-dim)', opacity:0.6, marginTop:4 }}>{t('perf2.addFirstClimbHint')}</div>
        </div>
      )}

      {/* Chart + légende années */}
      {loaded && climbs.length > 0 && (
        <>
          <ScatterSVG climbs={climbs} allYears={allYears} onPointClick={c => setEditClimb(c)} highlightIds={highlightIds}/>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:10 }}>
            {allYears.map(yr => {
              const col = yearColor(yr, allYears)
              return (
                <div key={yr} style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, background:`${col}15`, border:`1px solid ${col}35` }}>
                  <span style={{ width:7, height:7, borderRadius:'50%', background:col, display:'inline-block' }}/>
                  <span style={{ fontSize:11, fontWeight:600, color:col, fontFamily:'DM Mono,monospace' }}>{yr}</span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {showDrawer && <ClimbDrawer profileWeight={profile.weight} onSaved={handleSaved} onClose={()=>setShowDrawer(false)}/>}
      {editClimb  && <ClimbDrawer profileWeight={profile.weight} existing={editClimb} onSaved={handleSaved} onDeleted={handleDeleted} onClose={()=>setEditClimb(null)}/>}
      {showRanking && <RankingDrawer climbs={climbs} onFilterChange={handleFilterChange} onClose={()=>{ setShowRanking(false); setHighlightIds(null) }}/>}
    </div>
  )
}
