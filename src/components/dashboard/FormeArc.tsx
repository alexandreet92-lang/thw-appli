'use client'
// ══════════════════════════════════════════════════════════════
// FORME DU JOUR (héros, Modèle Datas). Arc TSB SVG brut + verdict +
// « CTL · ATL » + « forme optimale dans ~X j ». CTL/ATL/TSB via
// le PMC partagé (pas de recalcul). Arc animé par strokeDashoffset
// (ref DOM + transition CSS), prefers-reduced-motion respecté.
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react'
import { useI18n } from '@/lib/i18n'
import { latestPmc, tsbVerdict, daysToOptimal, type ActivityRow, LOAD_COLORS } from '@/lib/training/pmc'
import { Card, SectionTitle, Skeleton, EmptyState, useReducedMotion } from './primitives'
import { FD, FB, NUM } from './lib'

const W = 240, CX = 120, CY = 120, R = 100
const LEN = Math.PI * R // longueur du demi-cercle
const TSB_MIN = -40, TSB_MAX = 25
const arc = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`

export function FormeArc({ activities, loading }: { activities: ActivityRow[]; loading: boolean }) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const ref = useRef<SVGPathElement>(null)
  const pmc = loading ? null : latestPmc(activities)
  const tsb = pmc?.tsb ?? 0
  const frac = Math.min(1, Math.max(0, (tsb - TSB_MIN) / (TSB_MAX - TSB_MIN)))
  const v = tsbVerdict(tsb)
  const days = pmc ? daysToOptimal(pmc.ctl, pmc.atl) : null

  useEffect(() => {
    const el = ref.current
    if (!el || !pmc) return
    el.style.strokeDashoffset = String(LEN) // état vide
    void el.getBoundingClientRect()
    el.style.strokeDashoffset = String(LEN * (1 - frac))
  }, [frac, pmc])

  if (loading) return <Skeleton height={220} />

  return (
    <Card style={{ background: 'var(--bg-elev)' }}>
      <SectionTitle>{t('dashboard.todayForm')}</SectionTitle>

      {!pmc ? (
        <EmptyState title={t('dashboard.formEmptyTitle')} hint={t('dashboard.formEmptyHint')} href="/session" cta={t('dashboard.record')} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <svg viewBox={`0 0 ${W} 132`} style={{ width: '100%', maxWidth: 320, height: 'auto', display: 'block' }}>
            <path d={arc} fill="none" stroke="var(--bg-hover)" strokeWidth={12} strokeLinecap="round" />
            <path ref={ref} d={arc} fill="none" stroke={v.color} strokeWidth={12} strokeLinecap="round"
              strokeDasharray={LEN}
              style={{ strokeDashoffset: LEN, transition: reduce ? 'none' : 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)' }} />
            <text x={CX} y={104} textAnchor="middle" style={{ fontFamily: FB, fontSize: 38, fontWeight: 600, fill: v.color, fontVariantNumeric: 'tabular-nums' }}>
              {tsb > 0 ? '+' : ''}{Math.round(tsb)}
            </text>
            <text x={CX} y={124} textAnchor="middle" style={{ fontFamily: FB, fontSize: 12, fontWeight: 600, fill: 'var(--text-mid)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>TSB</text>
          </svg>

          <p style={{ margin: 0, fontFamily: FD, fontSize: 17, fontWeight: 600, color: v.color }}>{v.label}</p>

          <p style={{ margin: 'var(--space-2) 0 0', ...NUM, fontSize: 13, color: 'var(--text-mid)' }}>
            CTL <span style={{ color: LOAD_COLORS.ctl, fontWeight: 600 }}>{Math.round(pmc.ctl)}</span>
            <span style={{ color: 'var(--text-dim)' }}> · </span>
            ATL <span style={{ color: LOAD_COLORS.atl, fontWeight: 600 }}>{Math.round(pmc.atl)}</span>
          </p>

          {days != null && days > 0 && (
            <p style={{ margin: 'var(--space-1) 0 0', fontFamily: FB, fontSize: 12, color: 'var(--text-dim)' }}>
              {t('dashboard.optimalFormIn', { n: days })}
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
