'use client'

export const dynamic = 'force-dynamic'

import { useMemo } from 'react'
import { Activity, ClipboardList, Gauge, Moon, Plug } from 'lucide-react'
import { SectionLayout, type SectionDef } from '@/components/navigation/SectionLayout'
import RecoveryTrendChart from '@/components/recovery/RecoveryTrendChart'
import { buildEmptyWeeks } from '@/components/recovery/overviewData'
import AIAssistantButton from '@/components/ai/AIAssistantButton'
import { PageHelp } from '@/onboarding/system/PageHelp'
import { usePageOnboarding } from '@/onboarding/system/usePageOnboarding'
import { RECOVERY_ONBOARDING } from '@/onboarding/configs/recovery.config'

// ── Placeholder onglets à venir ────────────────────────────────
function Placeholder({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
      minHeight: 320, padding: 32, textAlign: 'center',
      background: 'var(--bg-card)', border: '1px dashed var(--border-mid)', borderRadius: 20 }}>
      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--text)', margin: 0 }}>{title}</p>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>À implémenter — prochain lot</p>
    </div>
  )
}

// ── Onglet Vue d'ensemble ──────────────────────────────────────
function OverviewTab() {
  const weeks = useMemo(() => buildEmptyWeeks(4), [])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 14,
        background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>
          Vue d&apos;ensemble de ta récupération. Connecte une source (Garmin, Polar, Oura…) ou remplis ton check-in
          pour suivre HRV, sommeil, FC de repos, readiness et fatigue au fil des semaines.
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
  const { show, dismiss, reopen } = usePageOnboarding(RECOVERY_ONBOARDING.pageId, RECOVERY_ONBOARDING.version)

  const sections: SectionDef[] = [
    { id: 'overview',  label: "Vue d'ensemble", subtitle: 'KPI + tendances',  icon: Activity,      content: <OverviewTab /> },
    { id: 'checkin',   label: 'Check-in',       subtitle: 'Ressenti du jour', icon: ClipboardList, content: <Placeholder title="Check-in" /> },
    { id: 'load',      label: 'Charge & forme', subtitle: 'CTL / ATL / TSB',  icon: Gauge,         content: <Placeholder title="Charge & forme" /> },
    { id: 'sleep',     label: 'Sommeil & HRV',  subtitle: 'Non synchronisé',  icon: Moon,          content: <Placeholder title="Sommeil & HRV" /> },
    { id: 'sources',   label: 'Sources',        subtitle: 'Intégrations',     icon: Plug,          content: <Placeholder title="Sources" /> },
  ]

  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>Récupération</h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-dim)', margin: '5px 0 0' }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={reopen} aria-label="Aide" style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary-dim)', border: '1px solid var(--border)', color: 'var(--primary)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?</button>
        <AIAssistantButton agent="readiness" context={{ page: 'recovery' }} />
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
