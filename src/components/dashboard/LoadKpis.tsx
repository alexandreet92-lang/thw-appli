'use client'
// ══════════════════════════════════════════════════════════════
// CTL / ATL / TSB sur DEUX axes : SM (métabolique) et SN (neuromusculaire).
// Plus de TSS. Valeurs neutres + filet coloré par axe (SM cyan / SN violet).
// ══════════════════════════════════════════════════════════════

import { useTrainingLoad } from '@/hooks/useTrainingLoad'
import { useI18n } from '@/lib/i18n'
import { PMC_COLORS } from '@/lib/training/pmcDual'
import { InfoSmSn } from '@/components/metrics/InfoSmSn'
import { Skeleton } from './primitives'
import { FB, NUM } from './lib'

function Kpi({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0, borderLeft: `3px solid ${accent}`, background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-3)' }}>
      <p style={{ margin: 0, fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-mid)' }}>{label}</p>
      <p className="tnum" style={{ margin: '4px 0 0', ...NUM, fontSize: 23, fontWeight: 600, color: 'var(--text)' }}>
        {`${value > 0 && label.startsWith('TSB') ? '+' : ''}${Math.round(value)}`}
      </p>
    </div>
  )
}

export function LoadKpis() {
  const { t: tr } = useI18n()
  const t = useTrainingLoad()
  if (t.loading) return <Skeleton height={90} />
  const empty = !t.CTL_SM && !t.ATL_SM && !t.CTL_SN && !t.ATL_SN
  if (empty) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-mid)' }}>{tr('dashboard.metabolicSm')}</span>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: PMC_COLORS.sm }} />
        <InfoSmSn />
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <Kpi label="CTL" value={t.CTL_SM} accent={PMC_COLORS.sm} />
        <Kpi label="ATL" value={t.ATL_SM} accent={PMC_COLORS.sm} />
        <Kpi label="TSB" value={t.TSB_SM} accent={PMC_COLORS.sm} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'var(--space-1)' }}>
        <span style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-mid)' }}>{tr('dashboard.neuromuscularSn')}</span>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: PMC_COLORS.sn }} />
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <Kpi label="CTL " value={t.CTL_SN} accent={PMC_COLORS.sn} />
        <Kpi label="ATL " value={t.ATL_SN} accent={PMC_COLORS.sn} />
        <Kpi label="TSB " value={t.TSB_SN} accent={PMC_COLORS.sn} />
      </div>
      {t.verdict && (
        <p style={{ margin: '2px 0 0', fontFamily: FB, fontSize: 12, color: 'var(--text-mid)' }}>{t.verdict.label}</p>
      )}
    </div>
  )
}
