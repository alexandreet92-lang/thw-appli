'use client'
// ══════════════════════════════════════════════════════════════
// CHARGE — condition (CTL) en gros chiffre, évolution sur 7 jours,
// fatigue (ATL) en ligne secondaire, mini-courbes CTL/ATL sur 4 semaines.
// ══════════════════════════════════════════════════════════════

import { useMemo } from 'react'
import { useI18n } from '@/lib/i18n'
import { buildPmc, LOAD_COLORS, type ActivityRow, type PmcPoint } from '@/lib/training/pmc'
import { DashCard, DASH_ICONS, Metric, Skeleton, EmptyState } from './primitives'
import { CountUp } from '@/components/ui/CountUp'

const W = 110, H = 56

function line(pts: PmcPoint[], key: 'ctl' | 'atl', min: number, max: number): string {
  const range = max - min || 1
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${((i / (pts.length - 1)) * (W - 6)).toFixed(1)} ${(H - 4 - ((p[key] - min) / range) * (H - 8)).toFixed(1)}`).join(' ')
}

export function PmcChart({ activities, loading }: { activities: ActivityRow[]; loading: boolean }) {
  const { t } = useI18n()
  const pts = useMemo(() => (loading ? [] : buildPmc(activities, 28)), [activities, loading])
  if (loading) return <Skeleton height={130} />

  const last = pts[pts.length - 1]
  const weekAgo = pts[Math.max(0, pts.length - 8)]
  const delta = last && weekAgo ? Math.round(last.ctl - weekAgo.ctl) : 0
  const vals = pts.flatMap(p => [p.ctl, p.atl])
  const min = Math.min(...vals, 0), max = Math.max(...vals, 1)

  return (
    <DashCard icon={DASH_ICONS.load} title={t('dashboard.load')} meta={t('dashboard.weeks4')} href="/recovery">
      {pts.length < 2 || !last ? (
        <EmptyState title={t('dashboard.pmcEmptyTitle')} hint={t('dashboard.pmcEmptyHint')} />
      ) : (
        <Metric
          label={t('dashboard.condition')}
          value={<CountUp value={Math.round(last.ctl)} />}
          chip={delta !== 0 ? `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)}` : undefined}
          sub={`${t('dashboard.fatigue')} ${Math.round(last.atl)}`}
          right={
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
              <path d={line(pts, 'atl', min, max)} fill="none" stroke={LOAD_COLORS.atl} strokeWidth={2} strokeLinecap="round" opacity={0.75} />
              <path d={line(pts, 'ctl', min, max)} fill="none" stroke={LOAD_COLORS.ctl} strokeWidth={2.5} strokeLinecap="round" />
            </svg>
          }
        />
      )}
    </DashCard>
  )
}
