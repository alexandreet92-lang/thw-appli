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

type Tab = 'apercu' | 'historique' | 'analyse'
const FB = 'var(--font-body)', FD = 'var(--font-display)'
const TABS: PageTab<Tab>[] = [
  { id: 'apercu', label: 'Aperçu', subtitle: 'En cours', icon: LayoutDashboard },
  { id: 'historique', label: 'Historique', subtitle: 'Épisodes', icon: History },
  { id: 'analyse', label: 'Analyse', subtitle: 'Tendances', icon: LineChart },
]

export default function InjuriesPage() {
  const { injuries, logs, loading, errorCode, add, update, resolve, addLog, reload } = useInjuries()
  const [tab, setTab] = useState<Tab>('apercu')
  const [report, setReport] = useState(false)
  const [trackId, setTrackId] = useState<string | null>(null)
  const trackInj = trackId ? injuries.find(i => i.id === trackId) ?? null : null

  const signaler = (
    <button onClick={() => setReport(true)} style={{ height: 36, padding: '0 16px', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary-gradient)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Signaler</button>
  )

  return (
    <>
      {/* Sous-nav TOUJOURS visible (rail desktop / onglets mobile) : l'état d'erreur
          est rendu DANS le layout, pas à la place de la nav. */}
      <TabbedPageLayout title="Blessures" headerExtra={signaler} tabs={TABS} active={tab} onChange={setTab}>
        {loading ? (
          <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-dim)' }}>Chargement…</p>
        ) : errorCode ? (
          <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-6)' }}>
            <p style={{ fontFamily: FD, fontSize: 17, fontWeight: 500, color: 'var(--text)', margin: 0 }}>Suivi indisponible</p>
            <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 'var(--space-2) 0 var(--space-4)', lineHeight: 1.5 }}>
              {errorCode === 'PGRST205'
                ? "Cache de schéma Supabase non à jour. Exécute « notify pgrst, 'reload schema'; » dans le SQL Editor, puis Réessayer."
                : errorCode === '42703'
                  ? <>La table « injuries » existe mais avec un <strong>schéma incompatible</strong> (ancienne version — colonne manquante, <span className="tnum">42703</span>). Le schéma doit être migré : « create table if not exists » n&apos;a rien fait car la table existait déjà.</>
                  : errorCode === '42P01'
                    ? "La table des blessures n'existe pas dans le projet ciblé par l'app."
                    : <>Erreur de chargement (<span className="tnum">{errorCode}</span>).</>}
            </p>
            <button onClick={() => void reload()} style={{ height: 36, padding: '0 16px', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Réessayer</button>
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
