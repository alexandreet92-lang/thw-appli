'use client'

import { useState, useMemo } from 'react'
import { useI18n } from '@/lib/i18n'

interface Props {
  watts: number[]
  ftp:   number | null
}

const ZONE_COLORS  = ['#94A3B8', '#10B981', '#06B6D4', '#F97316', '#EF4444', '#7C3AED']
const ZONE_LABELS  = ['Z1 <55%', 'Z2 55-75%', 'Z3 75-90%', 'Z4 90-105%', 'Z5 105-120%', 'Z6 >120%']
const ZONE_THRESHOLDS = [55, 75, 90, 105, 120] // % FTP

function getZoneIdx(watts: number, ftp: number): number {
  const pct = (watts / ftp) * 100
  for (let i = 0; i < ZONE_THRESHOLDS.length; i++) {
    if (pct < ZONE_THRESHOLDS[i]) return i
  }
  return 5
}

function fmtTimeShort(s: number): string {
  if (s < 60)   return `${Math.round(s)}s`
  if (s < 3600) return `${Math.floor(s / 60)}'${String(Math.round(s % 60)).padStart(2, '0')}`
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}h${String(m).padStart(2, '0')}`
}

export function PowerDistribution({ watts, ftp }: Props) {
  const { t } = useI18n()
  const [mode, setMode] = useState<'abs' | 'pct'>('abs')

  const { bins, zoneTime, totalActive } = useMemo(() => {
    const BIN = 25
    const maxW = Math.max(...watts, 0)
    const numBins = Math.ceil(maxW / BIN) + 1
    const counts = new Array<number>(numBins).fill(0)

    const zTime = [0, 0, 0, 0, 0, 0]

    for (const w of watts) {
      if (w <= 0) continue
      const b = Math.min(Math.floor(w / BIN), numBins - 1)
      counts[b]++
      if (ftp) zTime[getZoneIdx(w, ftp)]++
    }

    const built = counts
      .map((count, i) => ({
        label:    `${i * BIN}–${(i + 1) * BIN}`,
        midW:     i * BIN + BIN / 2,
        count,
        zoneIdx:  ftp ? getZoneIdx(i * BIN + BIN / 2, ftp) : 0,
      }))
      .filter(b => b.count > 0)

    return {
      bins:        built,
      zoneTime:    zTime,
      totalActive: watts.filter(w => w > 0).length,
    }
  }, [watts, ftp])

  const maxCount = Math.max(...bins.map(b => b.count), 1)

  // Horizontal bar dimensions
  const BAR_H    = 14
  const BAR_GAP  = 3
  const LABEL_W  = 58
  const BAR_AREA = 600
  const SVG_W    = LABEL_W + BAR_AREA
  // Bins displayed top→bottom: highest power at top, 0W at bottom
  const binsDesc = [...bins].reverse()
  const SVG_H    = binsDesc.length * (BAR_H + BAR_GAP)

  // Insight
  const insight = useMemo(() => {
    if (!ftp || totalActive === 0) return null
    const z2pct = zoneTime[1] / totalActive
    const z3pct = zoneTime[2] / totalActive
    if (z2pct > 0.50)
      return { type: 'good',    text: t('activities.powerInsightEndurance') }
    if (z3pct > 0.40)
      return { type: 'neutral', text: t('activities.powerInsightTempo') }
    return   { type: 'neutral', text: t('activities.powerInsightVariable') }
  }, [ftp, zoneTime, totalActive, t])

  if (bins.length === 0) return null

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {(['abs', 'pct'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', border: '1px solid var(--border)',
              background: mode === m ? 'var(--border-mid)' : 'transparent',
              color: mode === m ? 'var(--text)' : 'var(--text-dim)',
            }}
          >
            {m === 'abs' ? t('activities.absoluteMin') : t('activities.relativePct')}
          </button>
        ))}
      </div>

      {/* Histogram */}
      <div style={{ overflowY: 'auto', maxHeight: 420, minHeight: 320 }}>
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ width: '100%', height: Math.max(320, Math.min(SVG_H, 420)), display: 'block' }}
          preserveAspectRatio="xMinYMin meet"
        >
          {binsDesc.map((bin, i) => {
            const val    = mode === 'abs' ? bin.count : (bin.count / totalActive) * 100
            const maxVal = mode === 'abs' ? maxCount   : 100
            const barW   = (val / maxVal) * BAR_AREA
            const color  = ftp ? ZONE_COLORS[bin.zoneIdx] : '#94A3B8'
            const y      = i * (BAR_H + BAR_GAP)
            // Show label only every 50W to avoid clutter
            const showLabel = (bin.midW - 12.5) % 50 === 0

            return (
              <g key={bin.label}>
                {showLabel && (
                  <text
                    x={LABEL_W - 5} y={y + BAR_H - 2}
                    textAnchor="end" fontSize="11" fill="var(--text-dim)"
                  >
                    {Math.round(bin.midW - 12.5)}W
                  </text>
                )}
                <rect
                  x={LABEL_W} y={y}
                  width={Math.max(2, barW)} height={BAR_H}
                  fill={color} opacity={0.85} rx="2"
                />
                {barW > 20 && (
                  <text
                    x={LABEL_W + barW - 4} y={y + BAR_H - 3}
                    textAnchor="end" fontSize="10" fill="#fff" fontWeight="700"
                  >
                    {mode === 'abs' ? fmtTimeShort(bin.count) : `${val.toFixed(1)}%`}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Zone legend */}
      {ftp && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {ZONE_COLORS.map((col, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: col, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                {ZONE_LABELS[i]}
                {zoneTime[i] > 0 && (
                  <span style={{ color: 'var(--text-mid)', marginLeft: 3 }}>
                    {fmtTimeShort(zoneTime[i])}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Insight */}
      {insight && (
        <div style={{
          marginTop: 12, padding: '8px 12px', borderRadius: 8, fontSize: 12,
          color: 'var(--text-body)', lineHeight: 1.55,
          background: insight.type === 'good' ? 'rgba(16,185,129,0.06)' : 'var(--bg-card2)',
          border: `1px solid ${insight.type === 'good' ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
        }}>
          {insight.text}
        </div>
      )}
    </div>
  )
}
