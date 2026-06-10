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

type Tab = 'apercu' | 'historique' | 'analyse'
const FB = 'var(--font-body)', FD = 'var(--font-display)'
const TABS: { id: Tab; label: string }[] = [
  { id: 'apercu', label: 'Aperçu' }, { id: 'historique', label: 'Historique' }, { id: 'analyse', label: 'Analyse' },
]

export default function InjuriesPage() {
  const { injuries, logs, loading, tableMissing, add, update, resolve, addLog } = useInjuries()
  const [tab, setTab] = useState<Tab>('apercu')
  const [report, setReport] = useState(false)
  const [trackId, setTrackId] = useState<string | null>(null)
  const trackInj = trackId ? injuries.find(i => i.id === trackId) ?? null : null

  return (
    <div className="px-[var(--space-5)] md:px-[var(--space-8)]" style={{ paddingTop: 'var(--space-5)', paddingBottom: 'var(--space-8)', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <h1 style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Blessures</h1>
        <button onClick={() => setReport(true)} style={{ height: 36, padding: '0 16px', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Signaler</button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--space-6)' }}>
        {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`tab-btn${tab === t.id ? ' active' : ''}`}>{t.label}</button>)}
      </div>

      {loading ? (
        <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-dim)' }}>Chargement…</p>
      ) : tableMissing ? (
        <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-6)' }}>
          <p style={{ fontFamily: FD, fontSize: 17, fontWeight: 500, color: 'var(--text)', margin: 0 }}>Fonctionnalité prête — base à initialiser</p>
          <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 'var(--space-2) 0 0', lineHeight: 1.5 }}>
            La table des blessures n&apos;existe pas encore. Applique la migration proposée
            (<span className="tnum">supabase/migrations/PROPOSED_blessures.sql</span>) pour activer le suivi.
          </p>
        </div>
      ) : (
        <>
          {tab === 'apercu' && <OverviewTab injuries={injuries} onOpen={i => setTrackId(i.id)} onCheckin={(inj, r, e) => addLog({ injury_id: inj.id, log_date: new Date().toISOString().slice(0, 10), note: null, intensity_rest: r, intensity_effort: e })} />}
          {tab === 'historique' && <HistoryTab injuries={injuries} onOpen={i => setTrackId(i.id)} />}
          {tab === 'analyse' && <AnalysisTab injuries={injuries} />}
        </>
      )}

      {report && <ReportSheet onClose={() => setReport(false)} onSave={add} />}
      {trackInj && <TrackSheet injury={trackInj} logs={logs} onClose={() => setTrackId(null)} onUpdate={update} onAddLog={addLog} onResolve={resolve} />}
    </div>
  )
}
