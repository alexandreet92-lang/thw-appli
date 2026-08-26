'use client'
// ══════════════════════════════════════════════════════════════
// Modèle 2 « Datas » — corps (grille). 9 blocs, SANS Dernière
// activité. Forme/Trio/PMC partagent une seule source d'activités.
// Les blocs Aujourd'hui / Nutrition / Semaine / Compét / Coach sont
// réutilisés du Modèle 1.
// ══════════════════════════════════════════════════════════════

import { useDashboardActivities } from './useDashboardActivities'
import { FormeArc } from './FormeArc'
import { LoadKpis } from './LoadKpis'
import { PmcChart } from './PmcChart'
import { SleepCard } from './SleepCard'
import { TodayCard } from './TodayCard'
import { NutritionCard } from './NutritionCard'
import { WeekSummary } from './WeekSummary'
import { NextRaceCard } from './NextRaceCard'

export function DataGrid() {
  const { activities, loading } = useDashboardActivities()

  return (
    <div className="dash-grid-data">
      <div className="dash-a-forme" data-guide="forme-arc"><FormeArc activities={activities} loading={loading} /></div>
      <div className="dash-a-kpis" data-guide="load-kpis"><LoadKpis /></div>
      <div className="dash-a-pmc" data-guide="pmc-chart"><PmcChart activities={activities} loading={loading} /></div>
      <div className="dash-a-sleep" data-guide="sleep-card"><SleepCard /></div>
      <div className="dash-a-today" data-guide="today-card"><TodayCard /></div>
      <div className="dash-a-nutrition"><NutritionCard /></div>
      <div className="dash-a-week"><WeekSummary /></div>
      <div className="dash-a-race"><NextRaceCard /></div>
    </div>
  )
}
