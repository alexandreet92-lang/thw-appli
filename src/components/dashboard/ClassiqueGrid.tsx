'use client'
// ══════════════════════════════════════════════════════════════
// Dashboard (unique) — cartes façon Strava, dans l'ordre validé :
// Aujourd'hui · Forme du jour · Sommeil · Cette semaine · Charge ·
// Prochaines séances · Prochaine compétition · Dernière activité ·
// Nutrition · Records récents. Une carte = un sujet, tap → page détail.
// ══════════════════════════════════════════════════════════════

import { TodayCard } from './TodayCard'
import { FormeArc } from './FormeArc'
import { SleepCard } from './SleepCard'
import { WeekSummary } from './WeekSummary'
import { PmcChart } from './PmcChart'
import { NextSessionsCard } from './NextSessionsCard'
import { NextRaceCard } from './NextRaceCard'
import { LastActivityCard } from './LastActivityCard'
import { NutritionCard } from './NutritionCard'
import { RecentRecords } from './RecentRecords'
import { useDashboardActivities } from './useDashboardActivities'

export function ClassiqueGrid() {
  const { activities, loading } = useDashboardActivities()
  return (
    <div className="dash-cards">
      <div data-guide="today-card"><TodayCard /></div>
      <div data-guide="forme-arc"><FormeArc activities={activities} loading={loading} /></div>
      <div data-guide="sleep-card"><SleepCard /></div>
      <WeekSummary />
      <div data-guide="pmc-chart"><PmcChart activities={activities} loading={loading} /></div>
      <div data-guide="next-sessions"><NextSessionsCard /></div>
      <div data-guide="next-race"><NextRaceCard /></div>
      <div data-guide="last-activity"><LastActivityCard /></div>
      <NutritionCard />
      <RecentRecords />
    </div>
  )
}
