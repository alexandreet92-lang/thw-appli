'use client'
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'

export interface SleepRingData {
  totalMin: number; deepMin: number; remMin: number
  lightMin: number; wakeMin: number
  score: number; fromDevice: boolean
}

const FACTORS = [
  { labelKey: 'recovery.sleepRing.duration',      color: '#3B82F6' },
  { labelKey: 'recovery.sleepRing.depth', color: '#4338CA' },
  { labelKey: 'recovery.sleepRing.continuity', color: '#7C3AED' },
  { labelKey: 'recovery.sleepRing.regularity', color: '#06B6D4' },
  { labelKey: 'recovery.sleepRing.efficiency', color: '#10B981' },
]

function computeVals(d: SleepRingData): number[] {
  if (!d.fromDevice || d.totalMin === 0) {
    const v = Math.min(d.score / 100, 1)
    return [v * 0.90, v * 0.85, v * 0.95, v * 0.70, v * 0.80]
  }
  const t = d.totalMin
  return [
    Math.min(t / 480, 1),
    Math.min(d.deepMin / (t * 0.20), 1),
    Math.max(0, 1 - d.wakeMin / (t * 0.08)),
    0.75,
    Math.min((d.deepMin + d.remMin) / (t * 0.50), 1),
  ].map(v => Math.max(0, Math.min(1, v)))
}

function fmtMin(m: number): string {
  const h = Math.floor(m / 60), mm = m % 60
  return h === 0 ? `${mm}min` : mm === 0 ? `${h}h` : `${h}h${String(mm).padStart(2, '0')}`
}

export default function SleepScoreRing(p: SleepRingData) {
  const { t } = useI18n()
  const [step, setStep] = useState(-1)
  const vals = computeVals(p)

  useEffect(() => {
    const ts = FACTORS.map((_, i) => setTimeout(() => setStep(i), 150 + i * 300))
    return () => ts.forEach(clearTimeout)
  }, [])

  const R = 74, cx = 100, cy = 100, STROKE = 12, GAP = 5
  const ARC = (360 - GAP * 5) / 5

  function arcPath(startDeg: number, deg: number): string {
    const a1 = (startDeg - 90) * Math.PI / 180
    const a2 = (startDeg + Math.max(deg, 0.01) - 90) * Math.PI / 180
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1)
    const x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2)
    return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 ${deg > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
  }

  const badge = p.score >= 80 ? { t: t('recovery.sleepRing.badge.good'), c: '#10B981' }
    : p.score >= 60 ? { t: t('recovery.sleepRing.badge.average'), c: '#F97316' }
    : { t: t('recovery.sleepRing.badge.insufficient'), c: '#EF4444' }

  const subtitles = [
    fmtMin(p.totalMin), fmtMin(p.deepMin),
    fmtMin(Math.max(0, p.totalMin - p.wakeMin)),
    '—', fmtMin(p.deepMin + p.remMin),
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <svg width={200} height={200} viewBox="0 0 200 200">
        {/* Background arcs */}
        {FACTORS.map((f, i) => (
          <path key={`bg${i}`} d={arcPath(i * (ARC + GAP), ARC)}
            fill="none" stroke={f.color} strokeWidth={STROKE} strokeLinecap="round" opacity={0.12} />
        ))}
        {/* Animated fill arcs */}
        {FACTORS.map((f, i) => {
          const start = i * (ARC + GAP)
          const deg = ARC * vals[i]
          return (
            <path key={`fill${i}`}
              d={arcPath(start, deg)}
              fill="none" stroke={f.color} strokeWidth={STROKE} strokeLinecap="round"
              pathLength="1" strokeDasharray="1"
              strokeDashoffset={step >= i ? 0 : 1}
              style={{
                transition: step >= i ? 'stroke-dashoffset 0.35s ease-out' : 'none',
                filter: step >= i ? `drop-shadow(0 0 5px ${f.color}80)` : 'none',
              }} />
          )
        })}
        {/* Score */}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--text)"
          fontSize={34} fontWeight={800} fontFamily="Syne,sans-serif">{p.score}</text>
        <text x={cx} y={cy + 13} textAnchor="middle" fill="var(--text-dim)" fontSize={11}>/100</text>
        {/* Badge */}
        <rect x={cx - 55} y={cy + 24} width={110} height={20} rx={10}
          fill={`${badge.c}20`} stroke={`${badge.c}50`} strokeWidth={1} />
        <text x={cx} y={cy + 38} textAnchor="middle" fill={badge.c}
          fontSize={9} fontWeight={700}>{badge.t}</text>
      </svg>
      {/* Mini gauges */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%', maxWidth: 200 }}>
        {FACTORS.map((f, i) => (
          <div key={f.labelKey} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, color: f.color, width: 60, flexShrink: 0 }}>{t(f.labelKey)}</span>
            <div style={{ flex: 1, height: 3, background: `${f.color}22`, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', background: f.color, borderRadius: 2,
                width: `${i <= step ? Math.round(vals[i] * 100) : 0}%`,
                transition: `width 0.4s ease-out ${i * 0.3 + 0.15}s`,
              }} />
            </div>
            <span style={{ fontSize: 9, color: 'var(--text-dim)', width: 30, textAlign: 'right', fontFamily: 'DM Mono,monospace' }}>
              {subtitles[i]}
            </span>
          </div>
        ))}
      </div>
      {!p.fromDevice && (
        <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: 0, fontStyle: 'italic', textAlign: 'center' }}>
          {t('recovery.sleepRing.estimated')}
        </p>
      )}
    </div>
  )
}
