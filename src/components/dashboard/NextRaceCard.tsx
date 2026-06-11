'use client'
// ══════════════════════════════════════════════════════════════
// PROCHAINE COMPÉTITION → tap page compétition (/planning).
// planned_races, date ≥ aujourd'hui, la plus proche.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sportColor, sportLabel } from '@/components/recovery/helpers'
import { Card, SectionTitle, SportDot, Skeleton, EmptyState } from './primitives'
import { FD, FB, NUM, todayIso, formatShortDate, daysUntil } from './lib'

interface Race { id: string; name: string; sport: string; date: string; goal: string | null }

export function NextRaceCard() {
  const [loading, setLoading] = useState(true)
  const [race, setRace] = useState<Race | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
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

  return (
    <Card href={race ? '/planning' : undefined}>
      <SectionTitle>Prochaine compétition</SectionTitle>

      {!race ? (
        <EmptyState title="Aucune compétition à venir" hint="Ajoute un objectif pour orienter ton plan." href="/planning" cta="Ajouter une course" />
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
            <span style={{ ...NUM, fontSize: 28, fontWeight: 600, lineHeight: 1 }}>J-{daysUntil(race.date)}</span>
            <span style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)' }}>{formatShortDate(race.date)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
            <SportDot color={sportColor(race.sport)} />
            <span style={{ fontFamily: FD, fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{race.name}</span>
          </div>
          {race.goal && <p style={{ margin: 'var(--space-1) 0 0', fontFamily: FB, fontSize: 13, color: 'var(--text-mid)' }}>{sportLabel(race.sport)} · {race.goal}</p>}
        </div>
      )}
    </Card>
  )
}
