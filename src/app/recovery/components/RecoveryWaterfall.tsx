'use client'
import { useEffect, useState } from 'react'
import type { CheckInRow, ActivityRow } from './types'
import { estimateTss } from './types'
import { useI18n } from '@/lib/i18n'

interface Props {
  checkin: CheckInRow | null
  activities: ActivityRow[]
  hrvToday?: number | null
  hrvMin?: number | null
  hrvMax?: number | null
}

interface Factor { labelKey: string; pts: number; color: string }

function isoToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function computeFactors(p: Props): Factor[] {
  if (!p.checkin) return []
  const c = p.checkin

  // Yesterday's TSS
  const yd = new Date(); yd.setDate(yd.getDate() - 1)
  const ydStr = `${yd.getFullYear()}-${String(yd.getMonth()+1).padStart(2,'0')}-${String(yd.getDate()).padStart(2,'0')}`
  const tssYd = p.activities
    .filter(a => a.started_at.slice(0, 10) === ydStr)
    .reduce((s, a) => s + estimateTss(a), 0)

  const sleep   = Math.round((c.sleep_quality / 10) * 25)
  const hrv     = p.hrvToday != null && p.hrvMin != null && p.hrvMax != null && p.hrvMax > p.hrvMin
    ? Math.round(((p.hrvToday - p.hrvMin) / (p.hrvMax - p.hrvMin)) * 20)
    : Math.round((c.energy / 10) * 20)
  const stress  = Math.round(((10 - c.stress) / 10) * 15)
  const fatigue = Math.round(((10 - c.fatigue) / 10) * 20)
  const load    = tssYd > 150 ? -15 : tssYd > 80 ? -8 : -3
  const pain    = c.pain > 5 ? -10 : c.pain >= 3 ? -5 : 0

  return [
    { labelKey: 'recovery.metric.sleep',   pts: sleep,   color: '#3B82F6' },
    { labelKey: p.hrvToday != null ? 'recovery.metric.hrv' : 'recovery.metric.energy', pts: hrv, color: '#7C3AED' },
    { labelKey: 'recovery.metric.stress',    pts: stress,  color: stress  > 10 ? '#10B981' : '#F59E0B' },
    { labelKey: 'recovery.metric.fatigue',   pts: fatigue, color: fatigue > 14 ? '#10B981' : '#F59E0B' },
    { labelKey: 'recovery.waterfall.loadPrevDay', pts: load,    color: '#EF4444' },
    { labelKey: 'recovery.metric.pain',  pts: pain,    color: pain < 0 ? '#EF4444' : '#9CA3AF' },
  ]
}

export default function RecoveryWaterfall({ checkin, activities, hrvToday, hrvMin, hrvMax }: Props) {
  const { t } = useI18n()
  const [step, setStep] = useState(-1)
  const factors = computeFactors({ checkin, activities, hrvToday, hrvMin, hrvMax })

  useEffect(() => {
    if (!checkin) return
    const ts = factors.map((_, i) => setTimeout(() => setStep(i), 200 + i * 400))
    return () => ts.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkin?.id])

  if (!checkin || factors.length === 0) return null

  const total = Math.min(100, Math.max(0, factors.reduce((s, f) => s + f.pts, 0)))
  const maxAbs = Math.max(...factors.map(f => Math.abs(f.pts)), 1)
  const totalColor = total >= 75 ? '#10B981' : total >= 50 ? '#F59E0B' : '#EF4444'

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, boxShadow: 'var(--shadow-card)' }}>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', margin: '0 0 4px' }}>{t('recovery.title')}</p>
      <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 700, margin: '0 0 18px' }}>{t('recovery.waterfall.title')}</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {factors.map((f, i) => {
          const show = i <= step
          const barPct = (Math.abs(f.pts) / maxAbs) * 55  // max 55% width each side
          const pos = f.pts >= 0
          return (
            <div key={f.labelKey} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: 'var(--text-dim)', width: 72, flexShrink: 0 }}>{t(f.labelKey)}</span>
              {/* Bar zone */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: 22, position: 'relative' }}>
                <div style={{ width: '45%', display: 'flex', justifyContent: 'flex-end' }}>
                  {!pos && (
                    <div style={{
                      height: 16, borderRadius: '4px 0 0 4px',
                      background: `${f.color}75`,
                      width: show ? `${barPct}%` : '0%',
                      transition: `width 0.45s ease-out ${i*400+200}ms`,
                    }} />
                  )}
                </div>
                <div style={{ width: 2, height: 22, background: 'var(--border)', flexShrink: 0 }} />
                <div style={{ width: '55%' }}>
                  {pos && (
                    <div style={{
                      height: 16, borderRadius: '0 4px 4px 0',
                      background: `${f.color}75`,
                      width: show ? `${barPct}%` : '0%',
                      transition: `width 0.45s ease-out ${i*400+200}ms`,
                    }} />
                  )}
                </div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, width: 30, textAlign: 'right',
                color: f.pts > 0 ? '#10B981' : f.pts < 0 ? '#EF4444' : 'var(--text-dim)',
                fontFamily: 'DM Mono,monospace',
              }}>
                {f.pts > 0 ? '+' : ''}{f.pts}
              </span>
            </div>
          )
        })}

        {/* Total */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{t('recovery.waterfall.totalScore')}</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: totalColor, fontFamily: 'Syne,sans-serif' }}>
            {total}/100
          </span>
        </div>
      </div>
    </div>
  )
}
