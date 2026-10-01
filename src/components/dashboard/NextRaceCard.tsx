'use client'
// ══════════════════════════════════════════════════════════════
// PROCHAINE COMPÉTITION → tap page compétition (/planning).
// planned_races, date ≥ aujourd'hui, la plus proche.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { sportLabel } from '@/components/recovery/helpers'
import { DashCard, DASH_ICONS, Metric, Ring, Skeleton, EmptyState } from './primitives'
import { todayIso, daysUntil } from './lib'
import { currentLocale } from '@/lib/i18n/locale'

interface Race { id: string; name: string; sport: string; date: string; goal: string | null }

export function NextRaceCard() {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [race, setRace] = useState<Race | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const user = await getCurrentUser()
      if (!user) { if (!cancelled) setLoading(false); return }
      const { data } = await supabase
        .from('planned_races')
        .select('id, name, sport, date, goal')
        .eq('user_id', user.id)
        .gte('date', todayIso())
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (cancelled) return
      setRace((data as Race | null) ?? null)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) return <Skeleton height={120} />

  const d = race ? daysUntil(race.date) : 0
  return (
    <DashCard icon={DASH_ICONS.race} title={t('dashboard.nextRace')} href={race ? `/calendar?race=${race.id}` : '/calendar'}>
      {!race ? (
        <EmptyState title={t('dashboard.nextRaceEmptyTitle')} hint={t('dashboard.nextRaceEmptyHint')} />
      ) : (
        <Metric
          label={race.name}
          value={t('dashboard.daysCountdown', { n: d })}
          sub={[longDate(race.date), race.goal ?? sportLabel(race.sport)].filter(Boolean).join(' · ')}
          right={<Ring value={1 - Math.min(d, 84) / 84} />}
        />
      )}
    </DashCard>
  )
}

function longDate(isoDate: string): string {
  const s = new Date(isoDate + 'T00:00:00').toLocaleDateString(currentLocale(), { weekday: 'short', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
