'use client'

export const dynamic = 'force-dynamic'

import { useMemo, useState } from 'react'
import { Activity, ClipboardList, Gauge, Moon, Plug } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { SectionLayout, type SectionDef } from '@/components/navigation/SectionLayout'
import RecoveryTrendChart, { type WeekData } from '@/components/recovery/RecoveryTrendChart'
import { buildWeeks } from '@/components/recovery/overviewData'
import { useRecoveryData } from '@/components/recovery/useRecoveryData'
import { useTrainingLoad } from '@/hooks/useTrainingLoad'
import { computeReadiness, type ReadinessResult } from '@/lib/recovery/computeReadiness'
import ReadinessCard from '@/components/recovery/ReadinessCard'
import CheckinTab from '@/components/recovery/CheckinTab'
import SleepHrvTab from '@/components/recovery/SleepHrvTab'
import ChargeTab from '@/components/recovery/ChargeTab'
import SourcesTab from '@/components/recovery/SourcesTab'
import { PageHelp } from '@/onboarding/system/PageHelp'
import { usePageOnboarding } from '@/onboarding/system/usePageOnboarding'
import { RECOVERY_ONBOARDING } from '@/onboarding/configs/recovery.config'

function OverviewTab({ weeks, readiness }: { weeks: WeekData[]; readiness: ReadinessResult | null }) {
  const { t } = useI18n()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ReadinessCard result={readiness} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 14,
        background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>
          {t('recovery.overview.hrvNote')}
        </p>
      </div>
      <RecoveryTrendChart weeks={weeks} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// PAGE RÉCUPÉRATION — coquille à onglets (sidebar verticale)
// ══════════════════════════════════════════════════════════════
export default function RecoveryPage() {
  const { t } = useI18n()
  const { show, dismiss } = usePageOnboarding(RECOVERY_ONBOARDING.pageId, RECOVERY_ONBOARDING.version)
  const [reload, setReload] = useState(0)
  const data = useRecoveryData(reload)
  const tl = useTrainingLoad()
  const tsb = tl.series.length > 0 ? tl.TSB_SM : null

  const inputs = { hrvToday: data.hrvToday, hrvBaseline: data.hrvBaseline, hrvNightsCount: data.hrvNightsCount, tsb }
  const todayReadiness = data.todayCheckin ? computeReadiness({ checkin: data.todayCheckin, ...inputs }) : null

  const weeks = useMemo(() => {
    const dates = [...data.readinessByDate.keys(), ...data.fatigueByDate.keys(), ...data.hrvRows.map(r => r.date)]
    const anchorStr = dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null
    const anchor = anchorStr ? new Date(`${anchorStr}T12:00:00`) : new Date()
    const hrv = new Map(data.hrvRows.map(r => [r.date, r.hrv] as [string, number]))
    return buildWeeks({ hrv, readiness: data.readinessByDate, fatigue: data.fatigueByDate }, 4, anchor)
  }, [data])

  const sections: SectionDef[] = [
    { id: 'overview', label: t('recovery.tab.overview'), subtitle: t('recovery.tab.overview.sub'),  icon: Activity,      content: <OverviewTab weeks={weeks} readiness={todayReadiness} /> },
    { id: 'checkin',  label: t('recovery.tab.checkin'),       subtitle: t('recovery.tab.checkin.sub'), icon: ClipboardList, content: <CheckinTab initial={data.todayCheckin} inputs={inputs} onSaved={() => setReload(x => x + 1)} /> },
    { id: 'load',     label: t('recovery.tab.load'), subtitle: t('recovery.tab.load.sub'),  icon: Gauge,         content: <ChargeTab /> },
    { id: 'sleep',    label: t('recovery.tab.sleep'),  subtitle: t('recovery.tab.sleep.sub'),    icon: Moon,          content: <SleepHrvTab rows={data.hrvRows} loading={data.loading} /> },
    { id: 'sources',  label: t('recovery.tab.sources'),        subtitle: t('recovery.tab.sources.sub'),     icon: Plug,          content: <SourcesTab hrvActive={data.hrvRows.length > 0} /> },
  ]

  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>{t('recovery.title')}</h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-dim)', margin: '5px 0 0' }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>
  )

  return (
    <>
      <PageHelp config={RECOVERY_ONBOARDING} show={show} onDismiss={dismiss} />
      <SectionLayout sections={sections} defaultSection="overview" urlParam="tab" header={header} contentMaxWidth={1100} />
    </>
  )
}
