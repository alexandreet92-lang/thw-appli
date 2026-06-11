'use client'
// ══════════════════════════════════════════════════════════════
// Contenu du Dashboard — grille responsive (grid-template-areas).
// Le chrome (sidebar/header/tab bar) vient du layout, pas d'ici.
// ══════════════════════════════════════════════════════════════

import './dashboard.css'
import { Greeting } from './Greeting'
import { TodayCard } from './TodayCard'
import { NutritionCard } from './NutritionCard'
import { WeekSummary } from './WeekSummary'
import { NextSessionsCard } from './NextSessionsCard'
import { NextRaceCard } from './NextRaceCard'
import { LastActivityCard } from './LastActivityCard'
import { CoachAICard } from './CoachAICard'
import { QuickActions } from './QuickActions'
import { RecentRecords } from './RecentRecords'

export function DashboardContent() {
  return (
    <div className="dash-wrap">
      <Greeting rightSlot={<div className="dash-desktop-only"><QuickActions /></div>} />

      <div className="dash-grid">
        <div className="dash-a-today"><TodayCard /></div>
        <div className="dash-a-nutrition"><NutritionCard /></div>
        <div className="dash-a-week"><WeekSummary /></div>
        <div className="dash-a-nexts"><NextSessionsCard /></div>
        <div className="dash-a-race"><NextRaceCard /></div>
        <div className="dash-a-last"><LastActivityCard /></div>
        <div className="dash-a-coach"><CoachAICard /></div>
        <div className="dash-a-actions dash-mobile-only"><QuickActions /></div>
        <div className="dash-a-records"><RecentRecords /></div>
      </div>
    </div>
  )
}
