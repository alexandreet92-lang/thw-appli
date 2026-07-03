'use client'
export const dynamic = 'force-dynamic'
// Page Blessures (refonte design system). 3 onglets + 2 feuilles coulissantes.
// Modèle : sévérité (gêne/douleur/blessure) + phase de guérison. Pas de 3D (V2).
import { useState } from 'react'
import { useInjuries } from './useInjuries'
import { OverviewTab } from './components/OverviewTab'
import { HistoryTab } from './components/HistoryTab'
import { AnalysisTab } from './components/AnalysisTab'
import { ReportSheet } from './components/ReportSheet'
import { TrackSheet } from './components/TrackSheet'
import { TabbedPageLayout, type PageTab } from '@/components/ui/TabbedPageLayout'
import { LayoutDashboard, History, LineChart } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

type Tab = 'apercu' | 'historique' | 'analyse'
const FB = 'var(--font-body)', FD = 'var(--font-display)'

export default function InjuriesPage() {
  const { t } = useI18n()
  const { injuries, logs, loading, errorCode, add, update, resolve, addLog, reload } = useInjuries()
  const TABS: PageTab<Tab>[] = [
    { id: 'apercu', label: t('injuries.tabOverview'), subtitle: t('injuries.tabOverviewSub'), icon: LayoutDashboard },
    { id: 'historique', label: t('injuries.tabHistory'), subtitle: t('injuries.tabHistorySub'), icon: History },
    { id: 'analyse', label: t('injuries.tabAnalysis'), subtitle: t('injuries.tabAnalysisSub'), icon: LineChart },
  ]
  const [tab, setTab] = useState<Tab>('apercu')
  const [report, setReport] = useState(false)
  const [trackId, setTrackId] = useState<string | null>(null)
  const trackInj = trackId ? injuries.find(i => i.id === trackId) ?? null : null

  const signaler = (
    <button onClick={() => setReport(true)} style={{ height: 36, padding: '0 16px', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary-gradient)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ {t('injuries.reportAction')}</button>
  )

  return (
    <>
      {/* Sous-nav TOUJOURS visible (rail desktop / onglets mobile) : l'état d'erreur
          est rendu DANS le layout, pas à la place de la nav. */}
      <TabbedPageLayout title={t('injuries.pageTitle')} headerExtra={signaler} tabs={TABS} active={tab} onChange={setTab}>
        {loading ? (
          <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-dim)' }}>{t('injuries.loading')}</p>
        ) : errorCode ? (
          <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-6)' }}>
            <p style={{ fontFamily: FD, fontSize: 17, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{t('injuries.errUnavailableTitle')}</p>
            <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 'var(--space-2) 0 var(--space-4)', lineHeight: 1.5 }}>
              {errorCode === 'PGRST205'
                ? t('injuries.errReloadSchema')
                : errorCode === '42703'
                  ? <>{t('injuries.err42703A')}<strong>{t('injuries.err42703Incompatible')}</strong>{t('injuries.err42703B')}<span className="tnum">42703</span>{t('injuries.err42703C')}</>
                  : errorCode === '42P01'
                    ? t('injuries.err42P01')
                    : <>{t('injuries.errGenericA')}<span className="tnum">{errorCode}</span>{t('injuries.errGenericB')}</>}
            </p>
            <button onClick={() => void reload()} style={{ height: 36, padding: '0 16px', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t('injuries.retry')}</button>
          </div>
        ) : tab === 'apercu' ? (
          <OverviewTab injuries={injuries} onOpen={i => setTrackId(i.id)} onCheckin={(inj, r, e) => addLog({ injury_id: inj.id, log_date: new Date().toISOString().slice(0, 10), note: null, intensity_rest: r, intensity_effort: e })} />
        ) : tab === 'historique' ? (
          <HistoryTab injuries={injuries} onOpen={i => setTrackId(i.id)} />
        ) : (
          <AnalysisTab injuries={injuries} />
        )}
      </TabbedPageLayout>

      {report && <ReportSheet onClose={() => setReport(false)} onSave={add} />}
      {trackInj && <TrackSheet injury={trackInj} logs={logs} onClose={() => setTrackId(null)} onUpdate={update} onAddLog={addLog} onResolve={resolve} />}
    </>
  )
}
