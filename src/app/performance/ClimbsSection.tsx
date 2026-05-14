'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'

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
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function durSec(hms: string): number {
  if (!hms) return 0
  const p = hms.trim().split(':').map(Number)
  if (p.some(isNaN)) return 0
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2]
  if (p.length === 2) return p[0] * 60 + p[1]
  return 0
}

function secToHMS(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}'${String(sec).padStart(2, '0')}`
  return `${m}'${String(sec).padStart(2, '0')}`
}

function yearOf(date: string): string {
  return date.slice(0, 4)
}

const PRE_FATIGUE_LABELS: Record<string, string> = {
  fresh:    'Fraîche (< 1h)',
  light:    'Légère (1–2h)',
  moderate: 'Modérée (2–3h)',
  high:     'Élevée (> 3h)',
}

// Palette accessible — 8 couleurs distinctes (pas rouge/vert adjacents)
const YEAR_PALETTE = [
  '#00c8e0', // cyan
  '#5b6fff', // indigo
  '#f97316', // orange
  '#a855f7', // violet
  '#f43f5e', // rose
  '#14b8a6', // teal
  '#eab308', // yellow
  '#818cf8', // slate-blue
]

function getYearColor(year: string, allYears: string[]): string {
  const sorted = [...allYears].sort()
  const idx = sorted.indexOf(year)
  return YEAR_PALETTE[idx % YEAR_PALETTE.length] ?? '#9ca3af'
}

// ─── Scatter SVG ─────────────────────────────────────────────────────────────
const PAD_L = 52, PAD_R = 20, PAD_T = 20, PAD_B = 44

interface TooltipState {
  climb: ClimbRecord
  x: number
  y: number
}

interface ScatterSVGProps {
  climbs: ClimbRecord[]
  allYears: string[]
}

function ScatterSVG({ climbs, allYears }: ScatterSVGProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dims, setDims] = useState({ w: 520, h: 280 })
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  useEffect(() => {
    if (!svgRef.current) return
    const ro = new ResizeObserver(entries => {
      const e = entries[0]
      if (e) setDims({ w: e.contentRect.width, h: Math.max(240, Math.min(e.contentRect.width * 0.52, 320)) })
    })
    ro.observe(svgRef.current.parentElement ?? svgRef.current)
    return () => ro.disconnect()
  }, [])

  const CW = dims.w - PAD_L - PAD_R
  const CH = dims.h - PAD_T - PAD_B

  if (climbs.length === 0) return null

  const maxDurMin = Math.max(...climbs.map(c => c.duration_seconds / 60))
  const maxWkg    = Math.max(...climbs.map(c => c.wpkg))
  const xMax = Math.ceil(maxDurMin * 1.12 / 5) * 5  // round up to nearest 5
  const yMax = Math.ceil(maxWkg    * 1.15 * 10) / 10 // round up to 1 decimal

  function xPos(durMin: number) { return PAD_L + (durMin / xMax) * CW }
  function yPos(wkg: number)    { return PAD_T + CH - (wkg / yMax) * CH }

  // Grid lines
  const xTicks: number[] = []
  const xStep = xMax <= 30 ? 5 : xMax <= 60 ? 10 : xMax <= 120 ? 20 : 30
  for (let v = 0; v <= xMax; v += xStep) xTicks.push(v)

  const yTicks: number[] = []
  const yStep = yMax <= 4 ? 0.5 : yMax <= 6 ? 1 : 1.5
  for (let v = 0; v <= yMax + 0.01; v += yStep) yTicks.push(parseFloat(v.toFixed(1)))

  return (
    <>
      <svg
        ref={svgRef}
        width="100%"
        height={dims.h}
        viewBox={`0 0 ${dims.w} ${dims.h}`}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Grid */}
        {xTicks.map(v => (
          <line key={`xg-${v}`}
            x1={xPos(v)} y1={PAD_T}
            x2={xPos(v)} y2={PAD_T + CH}
            stroke="rgba(255,255,255,0.05)" strokeWidth={1}
          />
        ))}
        {yTicks.map(v => (
          <line key={`yg-${v}`}
            x1={PAD_L} y1={yPos(v)}
            x2={PAD_L + CW} y2={yPos(v)}
            stroke="rgba(255,255,255,0.05)" strokeWidth={1}
          />
        ))}

        {/* Axes */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + CH}
          stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
        <line x1={PAD_L} y1={PAD_T + CH} x2={PAD_L + CW} y2={PAD_T + CH}
          stroke="rgba(255,255,255,0.18)" strokeWidth={1} />

        {/* X labels */}
        {xTicks.map(v => (
          <text key={`xl-${v}`}
            x={xPos(v)} y={PAD_T + CH + 16}
            textAnchor="middle" fontSize={9}
            fontFamily="DM Mono, monospace"
            fill="rgba(255,255,255,0.38)"
          >{v}</text>
        ))}
        <text x={PAD_L + CW / 2} y={dims.h - 4}
          textAnchor="middle" fontSize={9}
          fontFamily="DM Sans, sans-serif"
          fill="rgba(255,255,255,0.45)"
        >Durée (min)</text>

        {/* Y labels */}
        {yTicks.map(v => (
          <text key={`yl-${v}`}
            x={PAD_L - 8} y={yPos(v) + 3}
            textAnchor="end" fontSize={9}
            fontFamily="DM Mono, monospace"
            fill="rgba(255,255,255,0.38)"
          >{v}</text>
        ))}
        <text
          x={12} y={PAD_T + CH / 2}
          textAnchor="middle" fontSize={9}
          fontFamily="DM Sans, sans-serif"
          fill="rgba(255,255,255,0.45)"
          transform={`rotate(-90, 12, ${PAD_T + CH / 2})`}
        >W/kg</text>

        {/* Points */}
        {climbs.map(c => {
          const cx = xPos(c.duration_seconds / 60)
          const cy = yPos(c.wpkg)
          const color = getYearColor(yearOf(c.date), allYears)
          return (
            <circle
              key={c.id}
              cx={cx} cy={cy} r={5}
              fill={color}
              fillOpacity={0.88}
              stroke={color}
              strokeWidth={1.5}
              strokeOpacity={0.6}
              style={{ cursor: 'pointer', transition: 'r 0.1s' }}
              onMouseEnter={e => setTooltip({ climb: c, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setTooltip(null)}
            />
          )
        })}
      </svg>

      {tooltip && createPortal(
        <div style={{
          position: 'fixed',
          left: tooltip.x + 14,
          top: tooltip.y - 8,
          zIndex: 9999,
          background: '#1A1F2E',
          border: '1px solid rgba(59,130,246,0.35)',
          borderRadius: 10,
          padding: '10px 14px',
          minWidth: 200,
          pointerEvents: 'none',
          boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
        }}>
          <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 13, color: '#fff', marginBottom: 6 }}>
            {tooltip.climb.name}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11 }}>
            <span style={{ color: 'rgba(255,255,255,0.55)' }}>
              {new Date(tooltip.climb.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: 13 }}>
              {tooltip.climb.wpkg.toFixed(2)} W/kg
            </span>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>
              {tooltip.climb.watts_avg} W · {secToHMS(tooltip.climb.duration_seconds)}
            </span>
            {tooltip.climb.length_km != null && (
              <span style={{ color: 'rgba(255,255,255,0.55)' }}>
                {tooltip.climb.length_km} km
                {tooltip.climb.avg_gradient_pct != null && ` · ${tooltip.climb.avg_gradient_pct}%`}
              </span>
            )}
            {tooltip.climb.altitude_summit_m != null && (
              <span style={{ color: 'rgba(255,255,255,0.55)' }}>
                Sommet {tooltip.climb.altitude_summit_m} m
              </span>
            )}
            {tooltip.climb.pre_fatigue && (
              <span style={{ color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>
                {PRE_FATIGUE_LABELS[tooltip.climb.pre_fatigue] ?? tooltip.climb.pre_fatigue}
              </span>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

// ─── Climb Drawer ─────────────────────────────────────────────────────────────
interface ClimbDrawerProps {
  profileWeight: number
  onSaved: (rec: ClimbRecord) => void
  onClose: () => void
}

function ClimbDrawer({ profileWeight, onSaved, onClose }: ClimbDrawerProps) {
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)

  // Form fields
  const [name, setName]               = useState('')
  const [date, setDate]               = useState(new Date().toISOString().slice(0, 10))
  const [watts, setWatts]             = useState('')
  const [duration, setDuration]       = useState('')
  const [weight, setWeight]           = useState(profileWeight > 0 ? String(profileWeight) : '')
  const [lengthKm, setLengthKm]       = useState('')
  const [gradient, setGradient]       = useState('')
  const [altitude, setAltitude]       = useState('')
  const [preFatigue, setPreFatigue]   = useState<string>('fresh')
  const [withNutrition, setWithNutrition] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  function handleClose() {
    setClosing(true)
    setTimeout(() => onClose(), 300)
  }

  const shown = visible && !closing

  // Auto-calcs
  const wattsN  = parseFloat(watts) || 0
  const weightN = parseFloat(weight) || 0
  const durSecs = durSec(duration)
  const durMin  = durSecs > 0 ? (durSecs / 60).toFixed(1) : '—'
  const wkg     = wattsN > 0 && weightN > 0 ? (wattsN / weightN) : 0
  const lenN    = parseFloat(lengthKm) || 0
  const gradN   = parseFloat(gradient) || 0
  const dPlus   = lenN > 0 && gradN > 0 ? Math.round(lenN * 1000 * gradN / 100) : 0

  const canSave = name.trim() !== '' && wattsN > 0 && durSecs > 0 && weightN > 0

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non connecté')

      const payload = {
        user_id:          user.id,
        name:             name.trim(),
        date,
        watts_avg:        Math.round(wattsN),
        duration_seconds: durSecs,
        weight_kg:        weightN,
        wpkg:             parseFloat(wkg.toFixed(3)),
        length_km:        lenN > 0 ? lenN : null,
        avg_gradient_pct: gradN > 0 ? gradN : null,
        altitude_summit_m: parseFloat(altitude) > 0 ? Math.round(parseFloat(altitude)) : null,
        pre_fatigue:      preFatigue,
        with_nutrition:   withNutrition,
      }

      const { data, error: dbErr } = await supabase
        .from('climb_records')
        .insert(payload)
        .select()
        .single()
      if (dbErr) throw dbErr

      onSaved(data as ClimbRecord)
      handleClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--bg-card2, #12151e)',
    border: '1px solid var(--border)',
    borderRadius: 8, padding: '9px 12px',
    color: 'var(--text)', fontSize: 14,
    outline: 'none', fontFamily: 'DM Mono, monospace',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 5, fontWeight: 600,
  }

  const sectionStyle = (color: string): React.CSSProperties => ({
    background: `${color}12`,
    border: `1px solid ${color}30`,
    borderRadius: 12,
    padding: '14px 16px',
    display: 'flex', flexDirection: 'column', gap: 12,
  })

  const calcRowStyle: React.CSSProperties = {
    display: 'flex', gap: 16, flexWrap: 'wrap',
    fontSize: 12, color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  }

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9200,
      background: shown ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0)',
      display: 'flex', alignItems: 'flex-end',
      transition: 'background 300ms ease-out',
    }}
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 560, margin: '0 auto',
        background: 'var(--bg-card)',
        borderRadius: '20px 20px 0 0',
        maxHeight: '92vh', overflowY: 'auto',
        padding: '24px 20px 32px',
        transform: `translateY(${shown ? '0%' : '100%'})`,
        transition: 'transform 300ms ease-out',
      }}>
        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 16, color: '#fff' }}>
              Nouvelle ascension
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              Enregistrez vos performances en montée
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ ...inputStyle, width: 'auto', fontSize: 12 }} />
            <button onClick={handleClose}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 22, cursor: 'pointer', padding: 4 }}>
              ×
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* IDENTIFICATION */}
          <div style={sectionStyle('#0EA5E9')}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0EA5E9', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Identification
            </div>
            <div>
              <label style={labelStyle}>Nom de l'ascension</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="ex : Alpe d'Huez, Col du Tourmalet…"
                style={inputStyle} />
            </div>
          </div>

          {/* PERFORMANCE */}
          <div style={sectionStyle('#EAB308')}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#EAB308', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Performance
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Watts moyens (W) *</label>
                <input type="number" value={watts} onChange={e => setWatts(e.target.value)}
                  placeholder="ex : 280"
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Temps de montée *</label>
                <input value={duration} onChange={e => setDuration(e.target.value)}
                  placeholder="mm:ss ou hh:mm:ss"
                  style={inputStyle} />
              </div>
            </div>
            <div style={calcRowStyle}>
              <span>W/kg : <strong style={{ color: wkg > 0 ? '#EAB308' : 'inherit' }}>{wkg > 0 ? wkg.toFixed(2) : '—'}</strong></span>
              <span>Durée : <strong>{durMin !== '—' ? `${durMin} min` : '—'}</strong></span>
            </div>
          </div>

          {/* PROFIL DE L'ASCENSION */}
          <div style={sectionStyle('#22C55E')}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#22C55E', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Profil de l'ascension
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Longueur (km)</label>
                <input type="number" value={lengthKm} onChange={e => setLengthKm(e.target.value)}
                  placeholder="ex : 13.8"
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Pente moy. (%)</label>
                <input type="number" value={gradient} onChange={e => setGradient(e.target.value)}
                  placeholder="ex : 8.1"
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Alt. sommet (m)</label>
                <input type="number" value={altitude} onChange={e => setAltitude(e.target.value)}
                  placeholder="ex : 1850"
                  style={inputStyle} />
              </div>
            </div>
            {dPlus > 0 && (
              <div style={calcRowStyle}>
                <span>D+ estimé : <strong style={{ color: '#22C55E' }}>{dPlus} m</strong></span>
              </div>
            )}
          </div>

          {/* CONDITIONS */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
            borderRadius: 12, padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Conditions
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Poids ce jour (kg) *</label>
                <input type="number" value={weight} onChange={e => setWeight(e.target.value)}
                  placeholder="ex : 70.5"
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Pré-fatigue</label>
                <select value={preFatigue} onChange={e => setPreFatigue(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="fresh">Fraîche (&lt; 1h)</option>
                  <option value="light">Légère (1–2h)</option>
                  <option value="moderate">Modérée (2–3h)</option>
                  <option value="high">Élevée (&gt; 3h)</option>
                </select>
              </div>
            </div>
            {/* Ravitaillement toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={() => setWithNutrition(v => !v)}
                style={{
                  width: 38, height: 22, borderRadius: 11,
                  background: withNutrition ? '#22C55E' : 'rgba(255,255,255,0.12)',
                  border: 'none', cursor: 'pointer', position: 'relative',
                  transition: 'background 0.2s', flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, borderRadius: '50%',
                  width: 16, height: 16, background: '#fff',
                  left: withNutrition ? 19 : 3,
                  transition: 'left 0.2s',
                }} />
              </button>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                {withNutrition ? 'Avec ravitaillement' : 'Sans ravitaillement'}
              </span>
            </div>
          </div>

          {/* RÉSUMÉ */}
          {canSave && (
            <div style={sectionStyle('#22C55E')}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#22C55E', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Résumé
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 28, fontWeight: 800, color: '#22C55E' }}>
                    {wkg.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>W/kg</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 18, fontWeight: 700, color: '#fff' }}>
                    {durMin} min
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Durée</div>
                </div>
              </div>
            </div>
          )}

        </div>

        {error && (
          <div style={{ marginTop: 14, fontSize: 12, color: '#f87171', background: '#2a1515', borderRadius: 8, padding: '8px 12px' }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={handleClose}
            style={{
              flex: 1, padding: '12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.07)', border: 'none',
              color: 'rgba(255,255,255,0.7)', fontSize: 14, cursor: 'pointer',
            }}>
            Annuler
          </button>
          <button onClick={() => void handleSave()}
            disabled={!canSave || saving}
            style={{
              flex: 2, padding: '12px', borderRadius: 10,
              background: canSave && !saving ? '#22C55E' : 'rgba(34,197,94,0.3)',
              border: 'none', color: '#fff',
              fontSize: 14, fontWeight: 700,
              cursor: canSave && !saving ? 'pointer' : 'not-allowed',
            }}>
            {saving ? 'Enregistrement…' : 'Enregistrer cette ascension'}
          </button>
        </div>

      </div>
    </div>,
    document.body
  )
}

// ─── ClimbsSection (exported) ─────────────────────────────────────────────────
interface ClimbsSectionProps {
  profile: { weight: number }
}

export function ClimbsSection({ profile }: ClimbsSectionProps) {
  const [climbs, setClimbs]       = useState<ClimbRecord[]>([])
  const [loaded, setLoaded]       = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)

  const allYears = [...new Set(climbs.map(c => yearOf(c.date)))].sort()

  const loadClimbs = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('climb_records')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true })
    if (data) setClimbs(data as ClimbRecord[])
    setLoaded(true)
  }, [])

  useEffect(() => { void loadClimbs() }, [loadClimbs])

  function handleSaved(rec: ClimbRecord) {
    setClimbs(prev => {
      const next = [...prev.filter(c => c.id !== rec.id), rec]
      return next.sort((a, b) => a.date.localeCompare(b.date))
    })
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 16,
      padding: '16px 16px 12px',
      border: '1px solid var(--border)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, margin: 0, color: '#fff' }}>
            Ascensions — W/kg par durée
          </h2>
          {loaded && climbs.length > 0 && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              {climbs.length} ascension{climbs.length > 1 ? 's' : ''} enregistrée{climbs.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowDrawer(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 8,
            background: 'rgba(59,130,246,0.15)',
            border: '1px solid rgba(59,130,246,0.4)',
            color: '#3b82f6', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          Ajouter une ascension
        </button>
      </div>

      {/* Content */}
      {!loaded && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
          Chargement…
        </div>
      )}

      {loaded && climbs.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '36px 20px',
          color: 'rgba(255,255,255,0.35)', fontSize: 12,
          border: '1px dashed rgba(255,255,255,0.12)',
          borderRadius: 10, lineHeight: 1.6,
        }}>
          Aucune ascension enregistrée<br />
          Ajoutez votre première montée pour voir votre graphique.
        </div>
      )}

      {loaded && climbs.length > 0 && (
        <>
          <ScatterSVG climbs={climbs} allYears={allYears} />

          {/* Year legend */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {allYears.map(yr => {
              const color = getYearColor(yr, allYears)
              return (
                <div key={yr} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px', borderRadius: 20,
                  background: `${color}18`,
                  border: `1px solid ${color}44`,
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color }}>{yr}</span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Drawer */}
      {showDrawer && (
        <ClimbDrawer
          profileWeight={profile.weight}
          onSaved={handleSaved}
          onClose={() => setShowDrawer(false)}
        />
      )}
    </div>
  )
}
