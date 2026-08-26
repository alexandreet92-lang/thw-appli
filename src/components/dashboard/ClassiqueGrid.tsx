'use client'
// ══════════════════════════════════════════════════════════════
// Modèle 1 « Classique » — corps (grille). Salutation + sélecteur
// sont gérés par le parent (DashboardContent).
// ══════════════════════════════════════════════════════════════

import { TodayCard } from './TodayCard'
import { NutritionCard } from './NutritionCard'
import { WeekSummary } from './WeekSummary'
import { NextSessionsCard } from './NextSessionsCard'
import { NextRaceCard } from './NextRaceCard'
import { LastActivityCard } from './LastActivityCard'
import { QuickActions } from './QuickActions'
import { RecentRecords } from './RecentRecords'

export function ClassiqueGrid() {
  return (
    <div className="dash-grid">
      <div className="dash-a-today" data-guide="today-card"><TodayCard /></div>
      <div className="dash-a-nutrition"><NutritionCard /></div>
      <div className="dash-a-week"><WeekSummary /></div>
      <div className="dash-a-nexts" data-guide="next-sessions"><NextSessionsCard /></div>
      <div className="dash-a-race" data-guide="next-race"><NextRaceCard /></div>
      <div className="dash-a-last" data-guide="last-activity"><LastActivityCard /></div>
      <div className="dash-a-actions dash-mobile-only"><QuickActions /></div>
      <div className="dash-a-records"><RecentRecords /></div>
    </div>
  )
}
