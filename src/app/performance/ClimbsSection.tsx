'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'

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
  length_km: number | null
  avg_gradient_pct: number | null
  altitude_summit_m: number | null
  pre_fatigue: string | null
  with_nutrition: boolean
  temp_bottom_celsius: number | null
  temp_summit_celsius: number | null
  intensity_rating: number | null
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
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

function secToHMS(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}'${String(sec).padStart(2, '0')}`
  return `${m}'${String(sec).padStart(2, '0')}`
}

function yearOf(date: string) { return date.slice(0, 4) }

const PRE_LABELS: Record<string, string> = {
  fresh: 'Fraîche', light: 'Légère', moderate: 'Modérée', high: 'Élevée',
}
const PRE_SCORE: Record<string, number> = {
  fresh: 4, light: 3, moderate: 2, high: 1,
}

const INTENSITY_LABELS: Record<number, string> = {
  5: 'À fond', 4: 'Très dur', 3: 'Contrôle', 2: 'Facile', 1: 'Très facile',
}

const YEAR_PAL = [
  '#00c8e0', '#5b6fff', '#f97316', '#a855f7',
  '#f43f5e', '#14b8a6', '#eab308', '#818cf8',
]
function yearColor(yr: string, all: string[]) {
  const idx = [...all].sort().indexOf(yr)
  return YEAR_PAL[idx % YEAR_PAL.length] ?? '#9ca3af'
}

// ─── Score de performance normalisé (sur 100) ─────────────────────────────────
interface ScoreBreakdown {
  total: number
  wpkg: number
  intensity: number
  fatigue: number
  altitude: number
  temp: number
  duration: number
}

function calcScore(c: ClimbRecord, climbs: ClimbRecord[]): ScoreBreakdown {
  const maxWpkg = Math.max(...climbs.map(x => x.wpkg))
  const maxAlt  = Math.max(...climbs.map(x => x.altitude_summit_m ?? 0))
  const maxDur  = Math.max(...climbs.map(x => x.duration_seconds))

  const sWpkg = maxWpkg > 0 ? (c.wpkg / maxWpkg) * 40 : 0

  const sIntensity = c.intensity_rating != null
    ? ((6 - c.intensity_rating) / 4) * 20
    : 10 // neutre

  const fatScore = c.pre_fatigue ? (PRE_SCORE[c.pre_fatigue] ?? 2) : 2
  const sFatigue = (fatScore / 4) * 15

  const sAltitude = maxAlt > 0 && c.altitude_summit_m != null
    ? (c.altitude_summit_m / maxAlt) * 10
    : 0

  const sTemp = c.temp_bottom_celsius != null
    ? Math.max(0, 1 - Math.abs(c.temp_bottom_celsius - 15) / 20) * 10
    : 5 // neutre

  const sDuration = maxDur > 0 ? (c.duration_seconds / maxDur) * 5 : 0

  const total = sWpkg + sIntensity + sFatigue + sAltitude + sTemp + sDuration
  return {
    total:     parseFloat(total.toFixed(1)),
    wpkg:      parseFloat(sWpkg.toFixed(1)),
    intensity: parseFloat(sIntensity.toFixed(1)),
    fatigue:   parseFloat(sFatigue.toFixed(1)),
    altitude:  parseFloat(sAltitude.toFixed(1)),
    temp:      parseFloat(sTemp.toFixed(1)),
    duration:  parseFloat(sDuration.toFixed(1)),
  }
}

function scoreColor(s: number): string {
  if (s >= 80) return '#22c55e'
  if (s >= 60) return BIKE_COLOR
  if (s >= 40) return '#eab308'
  return '#6b7280'
}

// ─── Shared styles helpers ────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: `1px solid ${BIKE_COLOR}44`, background: 'var(--input-bg)',
  color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 13,
  outline: 'none', boxSizing: 'border-box',
}
const inpGrey: React.CSSProperties = {
  ...inp, border: '1px solid var(--border)',
}
const secBox = (bg: string, border: string): React.CSSProperties => ({
  background: bg, border: `1px solid ${border}`,
  borderRadius: 12, padding: '14px 16px', marginBottom: 10,
})
const secHdr: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
}
const secLbl = (color: string): React.CSSProperties => ({
  fontFamily: 'Syne,sans-serif', fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.07em', color,
})
const lbl10: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 5, marginTop: 0,
}
const tog = (active: boolean, color = BIKE_COLOR): React.CSSProperties => ({
  padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
  fontSize: 11, fontWeight: active ? 700 : 400,
  background: active ? color : 'var(--bg-card2)',
  color: active ? '#fff' : 'var(--text-dim)',
  transition: 'all 0.15s', whiteSpace: 'nowrap' as const,
})
const calcBadge = (txt: string, color = BIKE_COLOR) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '4px 10px', borderRadius: 6,
    background: `${color}18`, border: `1px solid ${color}30`,
    fontFamily: 'DM Mono,monospace', fontSize: 12, fontWeight: 700, color,
    marginTop: 6, marginRight: 6,
  }}>⟶ {txt}</div>
)

// ─── Scatter SVG ─────────────────────────────────────────────────────────────
const PL = 48, PR = 16, PT = 16, PB = 40

interface TooltipState { climb: ClimbRecord; x: number; y: number }

function ScatterSVG({
  climbs, allYears, onPointClick,
}: {
  climbs: ClimbRecord[]
  allYears: string[]
  onPointClick: (c: ClimbRecord) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(520)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  useEffect(() => {
    if (!wrapRef.current) return
    const ro = new ResizeObserver(e => {
      const cw = e[0]?.contentRect.width ?? 520
      setW(cw)
    })
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  const H   = Math.max(220, Math.min(w * 0.48, 300))
  const CW  = w - PL - PR
  const CH  = H - PT - PB

  const maxDurMin = Math.max(...climbs.map(c => c.duration_seconds / 60))
  const maxWkg    = Math.max(...climbs.map(c => c.wpkg))
  const xMax = Math.ceil(maxDurMin * 1.15 / 5) * 5
  const yMax = Math.ceil(maxWkg * 1.18 * 10) / 10

  const xPos = (d: number) => PL + (d / xMax) * CW
  const yPos = (v: number) => PT + CH - (v / yMax) * CH

  const xStep = xMax <= 30 ? 5 : xMax <= 60 ? 10 : xMax <= 120 ? 20 : 30
  const xTicks: number[] = []
  for (let v = 0; v <= xMax; v += xStep) xTicks.push(v)

  const yStep = yMax <= 3 ? 0.5 : yMax <= 6 ? 1 : 1.5
  const yTicks: number[] = []
  for (let v = 0; v <= yMax + 0.01; v += yStep) yTicks.push(parseFloat(v.toFixed(1)))

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <svg width="100%" height={H} viewBox={`0 0 ${w} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
        {xTicks.map(v => (
          <line key={`xg${v}`} x1={xPos(v)} y1={PT} x2={xPos(v)} y2={PT + CH}
            stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        ))}
        {yTicks.map(v => (
          <line key={`yg${v}`} x1={PL} y1={yPos(v)} x2={PL + CW} y2={yPos(v)}
            stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        ))}
        <line x1={PL} y1={PT} x2={PL} y2={PT + CH} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
        <line x1={PL} y1={PT + CH} x2={PL + CW} y2={PT + CH} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />

        {xTicks.map(v => (
          <text key={`xl${v}`} x={xPos(v)} y={PT + CH + 14}
            textAnchor="middle" fontSize={9} fontFamily="DM Mono, monospace"
            fill="rgba(255,255,255,0.35)">{v}</text>
        ))}
        <text x={PL + CW / 2} y={H - 2}
          textAnchor="middle" fontSize={9} fontFamily="DM Sans, sans-serif"
          fill="rgba(255,255,255,0.4)">Durée (min)</text>

        {yTicks.map(v => (
          <text key={`yl${v}`} x={PL - 7} y={yPos(v) + 3}
            textAnchor="end" fontSize={9} fontFamily="DM Mono, monospace"
            fill="rgba(255,255,255,0.35)">{v}</text>
        ))}
        <text x={11} y={PT + CH / 2}
          textAnchor="middle" fontSize={9} fontFamily="DM Sans, sans-serif"
          fill="rgba(255,255,255,0.4)"
          transform={`rotate(-90, 11, ${PT + CH / 2})`}>W/kg</text>

        {climbs.map(c => {
          const cx  = xPos(c.duration_seconds / 60)
          const cy  = yPos(c.wpkg)
          const col = yearColor(yearOf(c.date), allYears)
          return (
            <g key={c.id} style={{ cursor: 'pointer' }}
              onClick={() => onPointClick(c)}>
              {/* Hit zone invisible */}
              <circle cx={cx} cy={cy} r={12} fill="transparent" />
              {/* Visible dot */}
              <circle cx={cx} cy={cy} r={5} fill={col} fillOpacity={0.85}
                stroke={col} strokeWidth={1.5} strokeOpacity={0.5}
                onMouseEnter={e => setTooltip({ climb: c, x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setTooltip(null)} />
            </g>
          )
        })}
      </svg>

      {tooltip && createPortal(
        <div style={{
          position: 'fixed', left: tooltip.x + 14, top: tooltip.y - 8,
          zIndex: 9999, background: 'var(--bg-card2)',
          border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 14px', minWidth: 196,
          pointerEvents: 'none',
          boxShadow: '0 4px 24px rgba(0,0,0,0.55)',
        }}>
          <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 6 }}>
            {tooltip.climb.name}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              {new Date(tooltip.climb.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 14, fontWeight: 700, color: BIKE_COLOR }}>
              {tooltip.climb.wpkg.toFixed(2)} W/kg
            </span>
            <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 11, color: 'var(--text-mid)' }}>
              {tooltip.climb.watts_avg} W · {secToHMS(tooltip.climb.duration_seconds)}
            </span>
            {tooltip.climb.length_km != null && (
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                {tooltip.climb.length_km} km{tooltip.climb.avg_gradient_pct != null ? ` · ${tooltip.climb.avg_gradient_pct}%` : ''}
              </span>
            )}
            <span style={{ fontSize: 10, color: 'var(--text-dim)', opacity: 0.7, marginTop: 2 }}>
              Cliquer pour modifier
            </span>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// ─── ClimbDrawer ──────────────────────────────────────────────────────────────
interface ClimbDrawerProps {
  profileWeight: number
  existing?: ClimbRecord       // si défini → mode édition
  onSaved: (rec: ClimbRecord) => void
  onDeleted?: (id: string) => void
  onClose: () => void
}

function ClimbDrawer({ profileWeight, existing, onSaved, onDeleted, onClose }: ClimbDrawerProps) {
  const isEdit = Boolean(existing)

  const [mounted,  setMounted]  = useState(false)
  const [visible,  setVisible]  = useState(false)
  const [closing,  setClosing]  = useState(false)

  const [name,          setName]          = useState(existing?.name ?? '')
  const [date,          setDate]          = useState(existing?.date ?? new Date().toISOString().slice(0, 10))
  const [watts,         setWatts]         = useState(existing ? String(existing.watts_avg) : '')
  const [duration,      setDuration]      = useState(existing ? secToInput(existing.duration_seconds) : '')
  const [weight,        setWeight]        = useState(
    existing ? String(existing.weight_kg) : profileWeight > 0 ? String(profileWeight) : ''
  )
  const [lengthKm,      setLengthKm]      = useState(existing?.length_km != null ? String(existing.length_km) : '')
  const [gradient,      setGradient]      = useState(existing?.avg_gradient_pct != null ? String(existing.avg_gradient_pct) : '')
  const [altitude,      setAltitude]      = useState(existing?.altitude_summit_m != null ? String(existing.altitude_summit_m) : '')
  const [preFatigue,    setPreFatigue]    = useState(existing?.pre_fatigue ?? 'fresh')
  const [withNutrition, setWithNutrition] = useState(existing?.with_nutrition ?? false)
  const [tempBottom,    setTempBottom]    = useState(existing?.temp_bottom_celsius != null ? String(existing.temp_bottom_celsius) : '')
  const [tempSummit,    setTempSummit]    = useState(existing?.temp_summit_celsius != null ? String(existing.temp_summit_celsius) : '')
  const [intensity,     setIntensity]     = useState<number | null>(existing?.intensity_rating ?? null)

  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    const t = setTimeout(() => setVisible(true), 10)
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

  async function handleSave() {
    if (!canSave) return
    setSaving(true); setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non connecté')

      const payload = {
        user_id:             user.id,
        name:                name.trim(),
        date,
        watts_avg:           wattsN,
        duration_seconds:    durSecs,
        weight_kg:           weightN,
        wpkg:                parseFloat(wkg.toFixed(3)),
        length_km:           lenN > 0 ? lenN : null,
        avg_gradient_pct:    gradN > 0 ? gradN : null,
        altitude_summit_m:   parseFloat(altitude) > 0 ? Math.round(parseFloat(altitude)) : null,
        pre_fatigue:         preFatigue,
        with_nutrition:      withNutrition,
        temp_bottom_celsius: tempBottom !== '' ? parseFloat(tempBottom) : null,
        temp_summit_celsius: tempSummit !== '' ? parseFloat(tempSummit) : null,
        intensity_rating:    intensity,
      }

      let data: ClimbRecord
      if (isEdit && existing) {
        const { data: d, error: dbErr } = await supabase
          .from('climb_records').update(payload).eq('id', existing.id).select().single()
        if (dbErr) throw new Error(dbErr.message ?? JSON.stringify(dbErr))
        data = d as ClimbRecord
      } else {
        const { data: d, error: dbErr } = await supabase
          .from('climb_records').insert(payload).select().single()
        if (dbErr) throw new Error(dbErr.message ?? JSON.stringify(dbErr))
        data = d as ClimbRecord
      }

      onSaved(data)
      handleClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e) || 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!existing || !onDeleted) return
    setDeleting(true); setError(null)
    try {
      const supabase = createClient()
      const { error: dbErr } = await supabase
        .from('climb_records').delete().eq('id', existing.id)
      if (dbErr) throw new Error(dbErr.message ?? JSON.stringify(dbErr))
      onDeleted(existing.id)
      handleClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e) || 'Erreur inconnue')
      setDeleting(false)
    }
  }

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3100,
      background: shown ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0)',
      display: 'flex', alignItems: 'flex-end',
      transition: 'background 300ms ease-out',
    }}
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}>

      <div style={{
        width: '100%', maxWidth: 540, margin: '0 auto',
        maxHeight: '92vh', background: 'var(--bg-card)',
        borderRadius: '20px 20px 0 0',
        border: `1px solid ${BIKE_COLOR}30`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transform: `translateY(${shown ? '0%' : '100%'})`,
        transition: 'transform 300ms ease-out',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', flexShrink: 0, flexWrap: 'wrap', gap: 8,
          background: `${BIKE_COLOR}10`, borderBottom: `1px solid ${BIKE_COLOR}25`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              padding: '4px 10px', borderRadius: 8,
              background: `${BIKE_COLOR}20`, border: `1px solid ${BIKE_COLOR}40`,
              fontSize: 11, fontWeight: 700, color: BIKE_COLOR,
            }}>Cyclisme</span>
            <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
              {isEdit ? 'Modifier cette ascension' : 'Nouvelle ascension'}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ padding: '5px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 11, outline: 'none' }} />
            <button onClick={handleClose} style={{
              width: 28, height: 28, borderRadius: '50%',
              border: '1px solid var(--border)', background: 'var(--bg-card2)',
              color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>×</button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 120px' }}>

          {/* IDENTIFICATION */}
          <div style={secBox(`${BIKE_COLOR}0e`, `${BIKE_COLOR}25`)}>
            <div style={secHdr}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BIKE_COLOR} strokeWidth={2.5}>
                <circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 1 8 8c0 5-8 12-8 12S4 15 4 10a8 8 0 0 1 8-8z"/>
              </svg>
              <span style={secLbl(BIKE_COLOR)}>Identification</span>
            </div>
            <p style={lbl10}>Nom de l'ascension</p>
            <input style={inp} value={name} onChange={e => setName(e.target.value)}
              placeholder="ex : Alpe d'Huez, Col du Tourmalet…" autoFocus={!isEdit} />
          </div>

          {/* PERFORMANCE */}
          <div style={secBox(`${BIKE_COLOR}12`, `${BIKE_COLOR}30`)}>
            <div style={secHdr}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BIKE_COLOR} strokeWidth={2.5}>
                <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              <span style={secLbl(BIKE_COLOR)}>Performance</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <p style={lbl10}>Watts moyens *</p>
                <input style={inp} type="number" value={watts} onChange={e => setWatts(e.target.value)} placeholder="ex : 280" />
              </div>
              <div>
                <p style={lbl10}>Temps de montée *</p>
                <input style={inp} value={duration} onChange={e => setDuration(e.target.value)} placeholder="mm:ss ou hh:mm:ss" />
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 4 }}>
              {wkg > 0 && calcBadge(`${wkg.toFixed(2)} W/kg`)}
              {durMin && calcBadge(`${durMin} min`)}
            </div>
          </div>

          {/* PROFIL */}
          <div style={secBox('rgba(255,255,255,0.04)', 'var(--border)')}>
            <div style={secHdr}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-mid)" strokeWidth={2}>
                <polyline points="3 17 9 11 13 15 22 6"/><polyline points="14 6 22 6 22 14"/>
              </svg>
              <span style={secLbl('var(--text-mid)')}>Profil de l'ascension</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <p style={lbl10}>Longueur (km)</p>
                <input style={inpGrey} type="number" value={lengthKm} onChange={e => setLengthKm(e.target.value)} placeholder="13.8" />
              </div>
              <div>
                <p style={lbl10}>Pente moy. (%)</p>
                <input style={inpGrey} type="number" value={gradient} onChange={e => setGradient(e.target.value)} placeholder="8.1" />
              </div>
              <div>
                <p style={lbl10}>Alt. sommet (m)</p>
                <input style={inpGrey} type="number" value={altitude} onChange={e => setAltitude(e.target.value)} placeholder="1850" />
              </div>
            </div>
            {dPlus > 0 && (
              <div style={{ marginTop: 4 }}>{calcBadge(`D+ ${dPlus} m`, '#6b7280')}</div>
            )}
          </div>

          {/* CONDITIONS */}
          <div style={secBox('rgba(255,255,255,0.04)', 'var(--border)')}>
            <div style={secHdr}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-mid)" strokeWidth={2}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span style={secLbl('var(--text-mid)')}>Conditions</span>
            </div>

            {/* Poids + fatigue */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <p style={lbl10}>Poids ce jour (kg) *</p>
                <input style={inpGrey} type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="ex : 70.5" />
              </div>
              <div>
                <p style={lbl10}>Pré-fatigue</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 2 }}>
                  {(['fresh', 'light', 'moderate', 'high'] as const).map(f => (
                    <button key={f} style={tog(preFatigue === f)} onClick={() => setPreFatigue(f)}>
                      {PRE_LABELS[f]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Température */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <p style={lbl10}>Température au pied (°C)</p>
                <input style={inpGrey} type="number" value={tempBottom} onChange={e => setTempBottom(e.target.value)} placeholder="ex : 18" />
              </div>
              <div>
                <p style={lbl10}>Température au sommet (°C)</p>
                <input style={inpGrey} type="number" value={tempSummit} onChange={e => setTempSummit(e.target.value)} placeholder="ex : 8" />
              </div>
            </div>

            {/* Intensité subjective */}
            <div style={{ marginBottom: 12 }}>
              <p style={lbl10}>Intensité subjective</p>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {([5, 4, 3, 2, 1] as const).map(v => (
                  <button key={v} onClick={() => setIntensity(intensity === v ? null : v)}
                    style={{
                      ...tog(intensity === v),
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      padding: '6px 10px', gap: 2, flex: 1, minWidth: 54,
                    }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{v}</span>
                    <span style={{ fontSize: 9, opacity: 0.8 }}>{INTENSITY_LABELS[v]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ravitaillement */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="button" onClick={() => setWithNutrition(v => !v)} style={{
                width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                background: withNutrition ? BIKE_COLOR : 'var(--bg-card2)',
                border: `1px solid ${withNutrition ? BIKE_COLOR : 'var(--border)'}`,
                cursor: 'pointer', position: 'relative', transition: 'background 0.2s, border 0.2s',
              }}>
                <span style={{
                  position: 'absolute', top: 2, borderRadius: '50%',
                  width: 14, height: 14, background: '#fff',
                  left: withNutrition ? 19 : 2, transition: 'left 0.2s',
                }} />
              </button>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                {withNutrition ? 'Avec ravitaillement' : 'Sans ravitaillement'}
              </span>
            </div>
          </div>

          {/* RÉSUMÉ */}
          {canSave && (
            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={secHdr}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={2.5}>
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span style={secLbl('#22c55e')}>Résumé</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                <div>
                  <p style={{ ...lbl10, marginBottom: 2 }}>W/kg</p>
                  <p style={{ fontFamily: 'DM Mono,monospace', fontSize: 22, fontWeight: 800, margin: 0, color: '#22c55e' }}>
                    {wkg.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p style={{ ...lbl10, marginBottom: 2 }}>Durée</p>
                  <p style={{ fontFamily: 'DM Mono,monospace', fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                    {durMin} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-dim)' }}>min</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fixed save button */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '12px 20px 20px',
          background: 'var(--bg-card)',
          borderTop: `1px solid ${BIKE_COLOR}20`,
        }}>
          {error && (
            <div style={{ fontSize: 11, color: '#f87171', background: 'rgba(239,68,68,0.1)', borderRadius: 8, padding: '6px 10px', marginBottom: 8 }}>
              {error}
            </div>
          )}
          <button onClick={() => void handleSave()} disabled={!canSave || saving} style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            cursor: canSave && !saving ? 'pointer' : 'not-allowed',
            background: canSave && !saving
              ? `linear-gradient(135deg, ${BIKE_COLOR}, ${BIKE_COLOR}cc)`
              : 'var(--bg-card2)',
            color: canSave && !saving ? '#fff' : 'var(--text-dim)',
            fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700,
            transition: 'all 0.15s', marginBottom: isEdit ? 8 : 0,
          }}>
            {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : 'Enregistrer cette ascension'}
          </button>

          {isEdit && (
            <button onClick={() => void handleDelete()} disabled={deleting} style={{
              width: '100%', padding: '10px', borderRadius: 12,
              border: '1px solid rgba(239,68,68,0.4)', cursor: 'pointer',
              background: 'rgba(239,68,68,0.08)',
              color: '#f87171',
              fontFamily: 'DM Sans,sans-serif', fontSize: 13, fontWeight: 600,
              transition: 'all 0.15s',
            }}>
              {deleting ? 'Suppression…' : 'Supprimer cette ascension'}
            </button>
          )}
        </div>

      </div>
    </div>,
    document.body
  )
}

// ─── RankingDrawer ────────────────────────────────────────────────────────────
function RankingDrawer({ climbs, onClose }: { climbs: ClimbRecord[]; onClose: () => void }) {
  const [mounted,  setMounted]  = useState(false)
  const [visible,  setVisible]  = useState(false)
  const [closing,  setClosing]  = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])
  if (!mounted) return null

  function handleClose() { setClosing(true); setTimeout(() => onClose(), 300) }
  const shown = visible && !closing

  const ranked = [...climbs]
    .map(c => ({ c, s: calcScore(c, climbs) }))
    .sort((a, b) => b.s.total - a.s.total)

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3100,
      background: shown ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0)',
      display: 'flex', alignItems: 'flex-end',
      transition: 'background 300ms ease-out',
    }}
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}>

      <div style={{
        width: '100%', maxWidth: 540, margin: '0 auto',
        maxHeight: '88vh', background: 'var(--bg-card)',
        borderRadius: '20px 20px 0 0',
        border: `1px solid ${BIKE_COLOR}30`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transform: `translateY(${shown ? '0%' : '100%'})`,
        transition: 'transform 300ms ease-out',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', flexShrink: 0,
          background: `${BIKE_COLOR}10`, borderBottom: `1px solid ${BIKE_COLOR}25`,
        }}>
          <div>
            <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
              Classement des ascensions
            </h2>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '3px 0 0' }}>
              Score normalisé sur 100 — 6 facteurs
            </p>
          </div>
          <button onClick={handleClose} style={{
            width: 28, height: 28, borderRadius: '50%',
            border: '1px solid var(--border)', background: 'var(--bg-card2)',
            color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 24px' }}>
          {ranked.map(({ c, s }, idx) => {
            const rank = idx + 1
            const col  = scoreColor(s.total)
            const isOpen = expanded === c.id

            return (
              <div key={c.id} style={{
                background: 'var(--bg-card2)',
                border: `1px solid var(--border)`,
                borderRadius: 12, marginBottom: 8, overflow: 'hidden',
              }}>
                {/* Main row */}
                <div
                  style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                  onClick={() => setExpanded(isOpen ? null : c.id)}
                >
                  {/* Rang */}
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: rank === 1 ? 'rgba(251,191,36,0.15)' : 'var(--bg-card)',
                    border: `1px solid ${rank === 1 ? 'rgba(251,191,36,0.4)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'DM Mono,monospace', fontSize: 12, fontWeight: 700,
                    color: rank === 1 ? '#fbbf24' : 'var(--text-dim)',
                  }}>
                    {rank}
                  </div>

                  {/* Nom + date */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.name}
                      </span>
                      {rank === 1 && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                          background: 'rgba(251,191,36,0.15)', color: '#fbbf24',
                          border: '1px solid rgba(251,191,36,0.3)',
                        }}>⭐ Meilleure perf</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        {new Date(c.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 11, color: BIKE_COLOR }}>
                        {c.wpkg.toFixed(2)} W/kg
                      </span>
                    </div>
                  </div>

                  {/* Score + barre */}
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 70 }}>
                    <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 18, fontWeight: 800, color: col }}>
                      {s.total.toFixed(0)}
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-card)', marginTop: 4, width: 70 }}>
                      <div style={{ height: '100%', width: `${Math.min(100, s.total)}%`, background: col, borderRadius: 2, transition: 'width 0.4s' }} />
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }}>/ 100</div>
                  </div>

                  {/* Chevron */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="var(--text-dim)" strokeWidth={2}
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>

                {/* Expanded breakdown */}
                {isOpen && (
                  <div style={{
                    padding: '0 14px 12px',
                    borderTop: '1px solid var(--border)',
                  }}>
                    <div style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {[
                        { label: 'W/kg', val: s.wpkg, max: 40 },
                        { label: 'Intensité', val: s.intensity, max: 20 },
                        { label: 'Fatigue', val: s.fatigue, max: 15 },
                        { label: 'Altitude', val: s.altitude, max: 10 },
                        { label: 'Température', val: s.temp, max: 10 },
                        { label: 'Durée', val: s.duration, max: 5 },
                      ].map(({ label, val, max }) => {
                        const pct = max > 0 ? (val / max) * 100 : 0
                        return (
                          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-dim)', width: 70, flexShrink: 0 }}>{label}</span>
                            <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--bg-card)' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 2 }} />
                            </div>
                            <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 11, color: col, width: 48, textAlign: 'right' }}>
                              {val.toFixed(1)} / {max}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── ClimbsSection ────────────────────────────────────────────────────────────
interface ClimbsSectionProps {
  profile: { weight: number }
}

export function ClimbsSection({ profile }: ClimbsSectionProps) {
  const [climbs,      setClimbs]      = useState<ClimbRecord[]>([])
  const [loaded,      setLoaded]      = useState(false)
  const [showDrawer,  setShowDrawer]  = useState(false)
  const [editClimb,   setEditClimb]   = useState<ClimbRecord | null>(null)
  const [showRanking, setShowRanking] = useState(false)

  const allYears = [...new Set(climbs.map(c => yearOf(c.date)))].sort()

  const loadClimbs = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('climb_records').select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true })
    if (data) setClimbs(data as ClimbRecord[])
    setLoaded(true)
  }, [])

  useEffect(() => { void loadClimbs() }, [loadClimbs])

  function handleSaved(rec: ClimbRecord) {
    setClimbs(prev => [...prev.filter(c => c.id !== rec.id), rec].sort((a, b) => a.date.localeCompare(b.date)))
  }

  function handleDeleted(id: string) {
    setClimbs(prev => prev.filter(c => c.id !== id))
  }

  function handlePointClick(climb: ClimbRecord) {
    setEditClimb(climb)
  }

  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 16,
      padding: '16px 16px 12px', border: '1px solid var(--border)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
            Ascensions — W/kg par durée
          </h2>
          {loaded && climbs.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
              {climbs.length} ascension{climbs.length > 1 ? 's' : ''} · cliquer sur un point pour modifier
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {loaded && climbs.length > 1 && (
            <button onClick={() => setShowRanking(true)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              background: 'var(--bg-card2)', border: '1px solid var(--border)',
              color: 'var(--text-mid)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 36,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              Classement
            </button>
          )}
          <button onClick={() => setShowDrawer(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8,
            background: `${BIKE_COLOR}15`, border: `1px solid ${BIKE_COLOR}40`,
            color: BIKE_COLOR, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 36,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Ajouter une ascension
          </button>
        </div>
      </div>

      {/* Skeleton */}
      {!loaded && (
        <div style={{ borderRadius: 8, overflow: 'hidden' }}>
          <div className="skeleton-shimmer" style={{ height: 220, borderRadius: 8 }} />
        </div>
      )}

      {/* Empty state */}
      {loaded && climbs.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '36px 20px',
          border: '1px dashed var(--border)', borderRadius: 10, lineHeight: 1.6,
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth={1.5} style={{ marginBottom: 8 }}>
            <polyline points="3 17 9 11 13 15 22 6"/><polyline points="14 6 22 6 22 14"/>
          </svg>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Aucune ascension enregistrée</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', opacity: 0.6, marginTop: 4 }}>
            Ajoutez votre première montée pour voir votre graphique
          </div>
        </div>
      )}

      {/* Chart */}
      {loaded && climbs.length > 0 && (
        <>
          <ScatterSVG climbs={climbs} allYears={allYears} onPointClick={handlePointClick} />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            {allYears.map(yr => {
              const col = yearColor(yr, allYears)
              return (
                <div key={yr} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px', borderRadius: 20,
                  background: `${col}15`, border: `1px solid ${col}35`,
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: col, display: 'inline-block' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: col, fontFamily: 'DM Mono,monospace' }}>{yr}</span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Drawer — nouveau */}
      {showDrawer && (
        <ClimbDrawer
          profileWeight={profile.weight}
          onSaved={handleSaved}
          onClose={() => setShowDrawer(false)}
        />
      )}

      {/* Drawer — édition */}
      {editClimb && (
        <ClimbDrawer
          profileWeight={profile.weight}
          existing={editClimb}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onClose={() => setEditClimb(null)}
        />
      )}

      {/* Drawer — classement */}
      {showRanking && (
        <RankingDrawer climbs={climbs} onClose={() => setShowRanking(false)} />
      )}
    </div>
  )
}
