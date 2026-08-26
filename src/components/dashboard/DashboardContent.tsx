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
import { AthleteCoachCard } from './AthleteCoachCard'
import { UnreadMessagesCard } from './UnreadMessagesCard'
import { AthleteFormsCard } from '@/components/coach/CustomForms'
import { CoachActivityCard } from '@/components/coach/CoachActivityCard'
import { BecomeCoachCard } from '@/components/coach/BecomeCoachCard'
import { VitrineSection } from './VitrineSection'
import { DashboardModelSwitch } from './DashboardModelSwitch'
import { ClassiqueGrid } from './ClassiqueGrid'
import { DataGrid } from './DataGrid'
import { useDashboardModel } from './useDashboardModel'
import { useGuideTabDemo } from '@/components/guide/guideDemo'

export function DashboardContent() {
  const [model, setModel, ready] = useDashboardModel()
  const [vitrineOpen, setVitrineOpen] = useState(false)
  // Le guide peut basculer Datas/Classique pour montrer les deux modèles.
  useGuideTabDemo('dash', (k) => setModel(k === 'data' ? 'data' : 'classique'))
  const switch_ = <DashboardModelSwitch value={model} onChange={setModel} />
  const vitrineBtn = (
    <button data-guide="vitrine" onClick={() => setVitrineOpen(true)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
      Ma vitrine
    </button>
  )

  return (
    <div className="dash-wrap">
      <Greeting rightSlot={
        <div className="dash-desktop-only">
          <QuickActions />
        </div>
      } />

      {/* Ma vitrine + Classique/Datas : rendus UNE seule fois (plus de doublon
          desktop/mobile). QuickActions reste à droite de la salutation en desktop. */}
      <div style={{ marginTop: 'calc(-1 * var(--space-3))', marginBottom: 'var(--space-5)', display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
        {vitrineBtn}
        {switch_}
      </div>

      <AthleteCoachCard />

      <UnreadMessagesCard />

      <div style={{ marginBottom: 'var(--space-5)' }}><AthleteFormsCard /></div>
      <div style={{ marginBottom: 'var(--space-5)' }}><CoachActivityCard /></div>
      <div style={{ marginBottom: 'var(--space-5)' }}><BecomeCoachCard /></div>

      {ready && (model === 'data' ? <DataGrid /> : <ClassiqueGrid />)}

      {/* Ma vitrine (profil + activités) — surpage coulissante, coach & athlète */}
      <SlideSheet open={vitrineOpen} onClose={() => setVitrineOpen(false)} title="Ma vitrine">
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '8px clamp(16px,4vw,32px) 64px' }}>
          <VitrineSection />
        </div>
      </SlideSheet>
    </div>
  )
}
