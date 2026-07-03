'use client'
import { useEffect, useState } from 'react'
import type { ActivityRow } from './types'
import { estimateTss } from './types'
import { useI18n } from '@/lib/i18n'

interface Props { activities: ActivityRow[]; recoveryScore: number }

function fmtH(h: number): string {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60)
  if (hh === 0) return `${mm}min`
  return mm === 0 ? `${hh}h` : `${hh}h${String(mm).padStart(2, '0')}`
}

function recPct(t: number): number {
  return 1 - Math.exp(-3 * t) // 0→0.95 as t goes 0→1
}

export default function RecoveryTimeline({ activities, recoveryScore }: Props) {
  const { t } = useI18n()
  const [animated, setAnimated] = useState(false)
  useEffect(() => { const id = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(id) }, [])

  const intense = [...activities]
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .find(a => estimateTss(a) >= 60)

  if (!intense) return null

  const tss = estimateTss(intense)
  const adjFactor = 1 + (100 - Math.max(recoveryScore, 10)) / 150
  const totalH = tss * 0.8 * adjFactor
  const elapsedH = (Date.now() - new Date(intense.started_at).getTime()) / 3_600_000
  const progress = Math.min(elapsedH / totalH, 1)
  const remainH = Math.max(0, totalH - elapsedH)

  const sport = (intense.sport_type ?? t('recovery.session')).replace(/_/g, ' ')
  const W = 500, H = 80
  const pathLen = W * 1.5
  const nowX = progress * W
  const nowY = H - recPct(progress) * H

  const curveD = Array.from({ length: 51 }, (_, i) => {
    const t = i / 50
    return `${i === 0 ? 'M' : 'L'}${(t * W).toFixed(1)} ${(H - recPct(t) * H).toFixed(1)}`
  }).join(' ')

  const fillD = curveD + ` L${W} ${H} L0 ${H} Z`

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, boxShadow: 'var(--shadow-card)' }}>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', margin: '0 0 4px' }}>{t('recovery.title')}</p>
      <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 700, margin: '0 0 14px' }}>{t('recovery.timeline.title')}</h2>

      {/* Info cards */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ padding: '8px 14px', borderRadius: 10, background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 2px' }}>{t('recovery.timeline.lastIntense')}</p>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', margin: 0, textTransform: 'capitalize' }}>
            {t('recovery.timeline.lastSessionLine', { sport, tss, time: fmtH(elapsedH) })}
          </p>
        </div>
        {remainH > 0.5 ? (
          <div style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 2px' }}>{t('recovery.timeline.fullRecovery')}</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#10B981', margin: 0 }}>{t('recovery.timeline.in', { time: fmtH(remainH) })}</p>
          </div>
        ) : (
          <div style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.4)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#10B981', margin: 0 }}>{t('recovery.timeline.recovered')}</p>
          </div>
        )}
      </div>

      {/* SVG timeline */}
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H+22}`} style={{ width: '100%', minWidth: 260, height: 'auto', display: 'block' }}>
          {/* Background zones */}
          <rect x={0} y={H * 0.6}  width={W} height={H * 0.4} fill="rgba(239,68,68,0.07)" />
          <rect x={0} y={H * 0.25} width={W} height={H * 0.35} fill="rgba(245,158,11,0.06)" />
          <rect x={0} y={0}        width={W} height={H * 0.25} fill="rgba(16,185,129,0.07)" />
          <text x={4} y={H*0.6-3}  fill="rgba(239,68,68,0.5)"    fontSize={7}>{t('recovery.timeline.notRecovered')}</text>
          <text x={4} y={H*0.25-3} fill="rgba(245,158,11,0.5)"   fontSize={7}>{t('recovery.timeline.partial')}</text>
          <text x={4} y={8}        fill="rgba(16,185,129,0.6)"   fontSize={7}>{t('recovery.timeline.recoveredShort')}</text>
          {/* Fill under curve */}
          <path d={fillD} fill="rgba(59,130,246,0.06)" />
          {/* Curve */}
          <path d={curveD} fill="none" stroke="#3B82F6" strokeWidth={2}
            strokeDasharray={pathLen} strokeDashoffset={animated ? 0 : pathLen}
            style={{ transition: 'stroke-dashoffset 2s ease-out' }} />
          {/* Now marker */}
          <line x1={nowX} y1={0} x2={nowX} y2={H} stroke="#7C3AED" strokeWidth={1.5} strokeDasharray="3 3" opacity={0.7} />
          <circle cx={nowX} cy={nowY} r={5} fill="#7C3AED" />
          <text x={nowX} y={H+16} textAnchor="middle" fill="#7C3AED" fontSize={8} fontWeight={600}>{t('recovery.timeline.now')}</text>
          {/* Full recovery marker */}
          {remainH > 0.5 && (
            <>
              <line x1={W} y1={0} x2={W} y2={H} stroke="#10B981" strokeWidth={1} opacity={0.5} />
              <text x={W - 4} y={H+16} textAnchor="end" fill="#10B981" fontSize={8} fontWeight={600}>{t('recovery.timeline.recoveredShort')}</text>
            </>
          )}
        </svg>
      </div>
    </div>
  )
}
