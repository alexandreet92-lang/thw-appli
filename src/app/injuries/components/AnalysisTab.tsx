'use client'
// Onglet Analyse : stats 12 mois (réelles) + corrélation charge (indisponible V1 :
// le hook useTrainingLoad n'existe pas encore — état honnête, pas de donnée inventée).
import { type Injury } from '../types'
import { stats12mo } from '../lib'
import { useI18n } from '@/lib/i18n'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const lbl: React.CSSProperties = { fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: 0 }

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ flex: 1, minWidth: 140 }}>
      <p style={lbl}>{label}</p>
      <p className="tnum" style={{ fontFamily: FB, fontSize: 22, fontWeight: 600, color: 'var(--text)', margin: 'var(--space-1) 0 0' }}>{value}</p>
      <p style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-mid)', margin: 'var(--space-1) 0 0' }}>{sub}</p>
    </div>
  )
}

export function AnalysisTab({ injuries }: { injuries: Injury[] }) {
  const { t } = useI18n()
  const s = stats12mo(injuries)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
        <Stat label={t('injuries.statInjuries12mo')} value={`${s.count}`} sub={t('injuries.statInjuries12moSub')} />
        <Stat label={t('injuries.statAvgDuration')} value={s.avgDuration == null ? '—' : `${s.avgDuration} ${t('injuries.dayUnit')}`} sub={t('injuries.statAvgDurationSub')} />
        <Stat label={t('injuries.statRecidiveRate')} value={s.recidiveRate == null ? '—' : `${s.recidiveRate}%`} sub={t('injuries.statRecidiveRateSub')} />
        <Stat label={t('injuries.statAvgReturn')} value={s.avgReturn == null ? '—' : `${s.avgReturn} ${t('injuries.dayUnit')}`} sub={t('injuries.statAvgReturnSub')} />
      </div>
      <div>
        <h2 style={{ fontFamily: FD, fontSize: 17, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{t('injuries.chargeTitle')}</h2>
        <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 'var(--space-1) 0 var(--space-2)' }}>{t('injuries.chargeSubtitle')}</p>
        <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5, margin: 0 }}>
          {t('injuries.chargeBody')}
        </p>
      </div>
    </div>
  )
}
