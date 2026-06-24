'use client'
// Lance les générateurs de notifications in-app une fois par chargement d'app
// (best-effort, jamais bloquant). À appeler depuis le shell. Idempotent côté
// base via dedup_key — sans cron ni backend.
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generateRaceCountdowns } from './raceCountdown'

let ran = false

export function useNotificationGenerators() {
  useEffect(() => {
    if (ran) return
    ran = true
    void (async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { ran = false; return }
        const todayISO = new Date().toISOString().slice(0, 10)
        const { data: races } = await sb
          .from('planned_races')
          .select('id, name, sport, date')
          .eq('user_id', user.id)
          .gte('date', todayISO)
          .order('date')
        if (races && races.length) {
          await generateRaceCountdowns(sb, user.id, races as { id: string; name: string; sport: string; date: string }[])
        }
      } catch { ran = false }
    })()
  }, [])
}
