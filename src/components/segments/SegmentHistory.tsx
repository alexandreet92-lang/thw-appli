'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'
import { currentLocale } from '@/lib/i18n'

interface Effort {
  started_at: string
  duration_seconds: number
}

interface Props {
  segmentId: string
  isDark: boolean
}

function fmt(s: number) {
  const m = Math.floor(s / 60), sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export default function SegmentHistory({ segmentId, isDark }: Props) {
  const { t } = useI18n()
  const [efforts, setEfforts] = useState<Effort[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      sb.from('segment_efforts')
        .select('started_at, duration_seconds')
        .eq('segment_id', segmentId)
        .eq('user_id', user.id)
        .order('started_at', { ascending: true })
        .then(({ data }) => {
          setEfforts((data as Effort[]) ?? [])
          setLoading(false)
        })
    })
  }, [segmentId])

  const text = isDark ? '#fff' : '#0A0A0A'
  const dim = isDark ? 'rgba(255,255,255,0.45)' : '#8C8C8C'
  const gridLine = isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6'

  if (loading) return <div style={{ padding: '32px 0', textAlign: 'center', color: dim, fontFamily: 'DM Sans, sans-serif' }}>{t('shared.loading')}</div>

  if (!efforts.length) return (
    <div style={{ padding: '32px 20px', textAlign: 'center', fontFamily: 'DM Sans, sans-serif' }}>
      <p style={{ fontSize: 15, color: dim, margin: 0 }}>{t('shared.noPersonalEffort')}</p>
    </div>
  )

  // SVG chart — raw, no external lib
  const W = 320, H = 120, PAD = { top: 12, right: 12, bottom: 28, left: 48 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const values = efforts.map(e => e.duration_seconds)
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const range = maxV - minV || 1

  // y: lower duration = top of chart (better time)
  const xScale = (i: number) => PAD.left + (i / (efforts.length - 1 || 1)) * chartW
  const yScale = (v: number) => PAD.top + ((v - minV) / range) * chartH

  const polyline = efforts.map((e, i) => `${xScale(i)},${yScale(e.duration_seconds)}`).join(' ')

  // Best effort index
  const bestIdx = values.indexOf(minV)

  return (
    <div style={{ padding: '20px', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { l: t('shared.efforts'), v: String(efforts.length) },
          { l: t('shared.best'), v: fmt(minV) },
          { l: t('shared.last'), v: fmt(values[values.length - 1]) },
        ].map(({ l, v }) => (
          <div key={l} style={{ flex: 1, background: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6', borderRadius: 12, padding: '10px 12px' }}>
            <p style={{ fontSize: 9, color: dim, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 3px' }}>{l}</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: text, margin: 0, fontVariantNumeric: 'tabular-nums' }}>{v}</p>
          </div>
        ))}
      </div>

      {/* SVG chart — time progression */}
      {efforts.length >= 2 && (
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
          {/* Grid lines */}
          {[0, 0.5, 1].map(t => {
            const y = PAD.top + t * chartH
            const v = minV + (1 - t) * range
            return (
              <g key={t}>
                <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke={gridLine} strokeWidth={1} />
                <text x={PAD.left - 4} y={y + 4} textAnchor="end" fill={dim} fontSize={9}>{fmt(Math.round(v))}</text>
              </g>
            )
          })}

          {/* Line */}
          <polyline points={polyline} fill="none" stroke="#06B6D4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {/* Area fill */}
          <polyline
            points={`${PAD.left},${PAD.top + chartH} ${polyline} ${xScale(efforts.length - 1)},${PAD.top + chartH}`}
            fill="url(#segGrad)"
            stroke="none"
          />
          <defs>
            <linearGradient id="segGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Dots */}
          {efforts.map((e, i) => (
            <circle key={i} cx={xScale(i)} cy={yScale(e.duration_seconds)} r={i === bestIdx ? 5 : 3}
              fill={i === bestIdx ? '#F59E0B' : '#06B6D4'} stroke={isDark ? '#0A0A0A' : '#fff'} strokeWidth={1.5} />
          ))}

          {/* X axis dates */}
          {efforts.length <= 8 && efforts.map((e, i) => (
            <text key={i} x={xScale(i)} y={H - 4} textAnchor="middle" fill={dim} fontSize={8}>
              {new Date(e.started_at).toLocaleDateString(currentLocale(), { day: 'numeric', month: 'numeric' })}
            </text>
          ))}
        </svg>
      )}

      {/* List */}
      <div style={{ marginTop: 16 }}>
        {[...efforts].reverse().slice(0, 5).map((e, i) => {
          const isBest = e.duration_seconds === minV
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${gridLine}` }}>
              <p style={{ fontSize: 13, color: dim, margin: 0 }}>
                {new Date(e.started_at).toLocaleDateString(currentLocale(), { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {isBest && <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>PR</span>}
                <span style={{ fontSize: 16, fontWeight: 700, color: isBest ? '#F59E0B' : text, fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(e.duration_seconds)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
