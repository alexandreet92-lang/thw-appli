'use client'
// ══════════════════════════════════════════════════════════════
// Switcher de Dashboard : Salutation + sélecteur Classique/Datas,
// puis le corps du modèle choisi. Le chrome (sidebar/header/tab bar)
// vient du layout, pas d'ici.
// ══════════════════════════════════════════════════════════════

import './dashboard.css'
import { useState } from 'react'
import SlideSheet from '@/components/ui/SlideSheet'
import { Greeting } from './Greeting'
import { QuickActions } from './QuickActions'
import { Suggestions } from './Suggestions'
import { DailyPlanningNotifier } from './DailyPlanningNotifier'
import { AthleteCoachCard } from './AthleteCoachCard'
import { AthleteFormsCard } from '@/components/coach/CustomForms'
import { CoachActivityCard } from '@/components/coach/CoachActivityCard'
import { VitrineSection } from './VitrineSection'
import { ClassiqueGrid } from './ClassiqueGrid'

export function DashboardContent() {
  const [vitrineOpen, setVitrineOpen] = useState(false)
  const vitrineBtn = (
    <button data-guide="vitrine" onClick={() => setVitrineOpen(true)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 'var(--r-pill)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
      Ma vitrine
    </button>
  )

  return (
    <div className="dash-wrap">
      {/* Émet une fois/jour le résumé du planning du jour (sport + pro + perso). */}
      <DailyPlanningNotifier />
      {/* Mobile : pas de salutation / titre en haut de page (les sous-onglets suffisent). */}
      <div className="dash-desktop-only">
        <Greeting rightSlot={<QuickActions />} />
      </div>

      {/* Ma vitrine : rendu UNE seule fois (plus de doublon
          desktop/mobile). QuickActions reste à droite de la salutation en desktop. */}
      <div className="dash-desktop-only"><div className="dash-toolbar" style={{ marginBottom: 'var(--space-5)', display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
        {vitrineBtn}
      </div></div>

      <Suggestions />

      <div className="dash-gap"><AthleteCoachCard onlyLinked /></div>


      <div style={{ marginBottom: 'var(--space-5)' }}><AthleteFormsCard /></div>
      <div style={{ marginBottom: 'var(--space-5)' }}><CoachActivityCard onlyLinked /></div>

      {/* Un seul Dashboard (le choix Classique / Datas est supprimé). */}
      <ClassiqueGrid />

      {/* Ma vitrine (profil + activités) — surpage coulissante, coach & athlète */}
      <SlideSheet open={vitrineOpen} onClose={() => setVitrineOpen(false)} title="Ma vitrine">
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '8px clamp(16px,4vw,32px) 64px' }}>
          <VitrineSection />
        </div>
      </SlideSheet>
    </div>
  )
}
