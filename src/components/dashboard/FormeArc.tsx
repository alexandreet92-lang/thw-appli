'use client'
// ══════════════════════════════════════════════════════════════
// FORME DU JOUR — fraîcheur (TSB) en gros chiffre + verdict + petite
// jauge. CTL/ATL/TSB via le PMC partagé (pas de recalcul).
// ══════════════════════════════════════════════════════════════

import { useI18n } from '@/lib/i18n'
import { latestPmc, tsbVerdict, daysToOptimal, type ActivityRow } from '@/lib/training/pmc'
import { DashCard, DASH_ICONS, Metric, Skeleton, EmptyState } from './primitives'

const TSB_MIN = -40, TSB_MAX = 25

function MiniGauge({ frac, color }: { frac: number; color: string }) {
  const R = 35, len = Math.PI * R
  const arc = 'M 8 50 A 35 35 0 0 1 78 50'
  return (
    <svg width="86" height="56" viewBox="0 0 86 56">
      <path d={arc} fill="none" stroke="var(--bg-hover)" strokeWidth={8} strokeLinecap="round" />
      <path d={arc} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - frac)} />
    </svg>
  )
}

export function FormeArc({ activities, loading }: { activities: ActivityRow[]; loading: boolean }) {
  const { t } = useI18n()
  if (loading) return <Skeleton height={150} />
  const pmc = latestPmc(activities)

  return (
    <DashCard icon={DASH_ICONS.forme} title={t('dashboard.todayForm')} href="/recovery">
      {!pmc ? (
        <EmptyState title={t('dashboard.formEmptyTitle')} hint={t('dashboard.formEmptyHint')} />
      ) : (() => {
        const tsb = pmc.tsb
        const v = tsbVerdict(tsb)
        const days = daysToOptimal(pmc.ctl, pmc.atl)
        const frac = Math.min(1, Math.max(0, (tsb - TSB_MIN) / (TSB_MAX - TSB_MIN)))
        return (
          <Metric
            label={t('dashboard.freshness')}
            value={`${tsb > 0 ? '+' : ''}${Math.round(tsb)}`}
            chip={v.label} chipColor={v.color}
            sub={days != null && days > 0 ? t('dashboard.optimalFormIn', { n: days }) : undefined}
            right={<MiniGauge frac={frac} color={v.color} />}
          />
        )
      })()}
    </DashCard>
  )
}
