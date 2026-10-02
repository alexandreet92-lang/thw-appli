'use client'
// ══════════════════════════════════════════════════════════════
// Interface IA MOBILE — données réelles légères.
//  · useAimTokenLimits : jauges de tokens (même endpoint que TokenUsageBubble).
//  · useAimWelcomeData : contexte de l'écran d'accueil (forme TSB, séance
//    du jour / de demain, prochaine course, dernière activité). Requêtes
//    parallèles, best-effort : toute donnée absente → puce masquée.
//    Zéro donnée fictive.
// ══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { latestPmc, tsbVerdict, type ActivityRow } from '@/lib/training/pmc'
import { iso, todayIso, daysUntil } from '@/components/dashboard/lib'
import type { AimTokenLimits } from './types'

export function useAimTokenLimits(enabled: boolean, refreshKey: unknown): AimTokenLimits | null {
  const [limits, setLimits] = useState<AimTokenLimits | null>(null)
  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/tokens/limits')
      if (res.ok) setLimits(await res.json() as AimTokenLimits)
    } catch { /* silencieux : la puce reste masquée */ }
  }, [])
  // Rechargé à l'ouverture et à chaque fin/début de génération (refreshKey).
  useEffect(() => { if (enabled) void load() }, [enabled, load, refreshKey])
  return limits
}

export interface AimForm { tsb: number; label: string; color: string }
export interface AimSession { title: string; sport: string; when: 'today' | 'tomorrow'; weekStart: string }
export interface AimRace { id: string; name: string; days: number }
export interface AimLastActivity { id: string; title: string | null; sport: string; startedAt: string; seconds: number | null }

export interface AimWelcomeData {
  form: AimForm | null
  session: AimSession | null
  race: AimRace | null
  last: AimLastActivity | null
}

interface ActRow extends ActivityRow { title: string | null }
interface SessRow { week_start: string; day_index: number; sport: string | null; title: string | null; status: string | null }
interface RaceRow { id: string; name: string | null; date: string }

function mondayOf(d: Date): string {
  const m = new Date(d)
  m.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return iso(m)
}
function sessionDate(weekStart: string, dayIndex: number): string {
  const d = new Date(weekStart + 'T00:00:00')
  d.setDate(d.getDate() + dayIndex)
  return iso(d)
}

const EMPTY: AimWelcomeData = { form: null, session: null, race: null, last: null }
// Cache court (5 min) : une nouvelle conversation ne relance pas les requêtes.
let cache: { at: number; data: AimWelcomeData } | null = null
const CACHE_MS = 5 * 60_000

export function useAimWelcomeData(enabled: boolean): AimWelcomeData {
  const [data, setData] = useState<AimWelcomeData>(() => (cache && Date.now() - cache.at < CACHE_MS ? cache.data : EMPTY))
  const loadedRef = useRef(false)
  const aliveRef = useRef(true)
  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false } }, [])

  useEffect(() => {
    if (!enabled || loadedRef.current) return
    loadedRef.current = true
    if (cache && Date.now() - cache.at < CACHE_MS) return
    const alive = () => aliveRef.current
    void (async () => {
      try {
        const user = await getCurrentUser()
        if (!user || !alive()) return
        const sb = createClient()
        const now = new Date()
        const tomorrow = new Date(now)
        tomorrow.setDate(now.getDate() + 1)
        const since = new Date(now)
        since.setDate(now.getDate() - 180)
        const weeks = Array.from(new Set([mondayOf(now), mondayOf(tomorrow)]))
        const today = todayIso()
        const tomorrowIso = iso(tomorrow)

        const [acts, sess, races] = await Promise.all([
          sb.from('activities')
            .select('id, title, sport_type, started_at, moving_time_s, elapsed_time_s, tss')
            .eq('user_id', user.id)
            .gte('started_at', since.toISOString())
            .order('started_at', { ascending: true }),
          sb.from('planned_sessions')
            .select('week_start, day_index, sport, title, status')
            .eq('user_id', user.id)
            .in('week_start', weeks),
          sb.from('planned_races')
            .select('id, name, date')
            .eq('user_id', user.id)
            .gte('date', today)
            .order('date', { ascending: true })
            .limit(1),
        ])
        if (!alive()) return

        const actRows = ((acts.data as ActRow[] | null) ?? [])
        const pmc = actRows.length > 0 ? latestPmc(actRows) : null
        const form: AimForm | null = pmc ? (() => { const v = tsbVerdict(pmc.tsb); return { tsb: Math.round(pmc.tsb), label: v.label, color: v.color } })() : null
        const lastRow = actRows.length > 0 ? actRows[actRows.length - 1] : null
        const last: AimLastActivity | null = lastRow
          ? { id: lastRow.id, title: lastRow.title, sport: lastRow.sport_type ?? '', startedAt: lastRow.started_at, seconds: lastRow.moving_time_s ?? lastRow.elapsed_time_s }
          : null

        const sessRows = ((sess.data as SessRow[] | null) ?? [])
          .filter(r => (r.status ?? 'planned') === 'planned' && !!r.title)
          .map(r => ({ ...r, date: sessionDate(r.week_start, r.day_index) }))
        const pick = sessRows.find(r => r.date === today) ?? sessRows.find(r => r.date === tomorrowIso) ?? null
        const session: AimSession | null = pick
          ? { title: pick.title ?? '', sport: pick.sport ?? '', when: pick.date === today ? 'today' : 'tomorrow', weekStart: pick.week_start }
          : null

        const raceRow = ((races.data as RaceRow[] | null) ?? [])[0] ?? null
        const race: AimRace | null = raceRow && raceRow.name
          ? { id: raceRow.id, name: raceRow.name, days: daysUntil(raceRow.date) }
          : null

        const next: AimWelcomeData = { form, session, race, last }
        cache = { at: Date.now(), data: next }
        setData(next)
      } catch { /* best-effort : aucune puce */ }
    })()
  }, [enabled])

  return data
}
