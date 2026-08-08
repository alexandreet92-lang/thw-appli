'use client'
// ══════════════════════════════════════════════════════════════
// Switcher de Dashboard : Salutation + sélecteur Classique/Datas,
// puis le corps du modèle choisi. Le chrome (sidebar/header/tab bar)
// vient du layout, pas d'ici.
// ══════════════════════════════════════════════════════════════

import './dashboard.css'
import { Greeting } from './Greeting'
import { QuickActions } from './QuickActions'
import { AthleteCoachCard } from './AthleteCoachCard'
import { AthleteFormsCard } from '@/components/coach/CustomForms'
import { CoachActivityCard } from '@/components/coach/CoachActivityCard'
import { BecomeCoachCard } from '@/components/coach/BecomeCoachCard'
import { VitrineSection } from './VitrineSection'
import { DashboardModelSwitch } from './DashboardModelSwitch'
import { ClassiqueGrid } from './ClassiqueGrid'
import { DataGrid } from './DataGrid'
import { useDashboardModel } from './useDashboardModel'

export function DashboardContent() {
  const [model, setModel, ready] = useDashboardModel()
  const switch_ = <DashboardModelSwitch value={model} onChange={setModel} />

  return (
    <div className="dash-wrap">
      <Greeting rightSlot={
        <div className="dash-desktop-only">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {switch_}
            <QuickActions />
          </div>
        </div>
      } />

      <div className="dash-mobile-only" style={{ marginTop: 'calc(-1 * var(--space-3))', marginBottom: 'var(--space-5)' }}>
        {switch_}
      </div>

      <AthleteCoachCard />

      <div style={{ marginBottom: 'var(--space-5)' }}><AthleteFormsCard /></div>
      <div style={{ marginBottom: 'var(--space-5)' }}><CoachActivityCard /></div>
      <div style={{ marginBottom: 'var(--space-5)' }}><BecomeCoachCard /></div>

      {ready && (model === 'data' ? <DataGrid /> : <ClassiqueGrid />)}

      {/* Ma vitrine (profil + activités) — coach & athlète */}
      <div style={{ marginTop: 'var(--space-6, 32px)' }}><VitrineSection /></div>
    </div>
  )
}
