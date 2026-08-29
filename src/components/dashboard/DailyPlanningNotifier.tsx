'use client'
// ══════════════════════════════════════════════════════════════════
// Notification « Résumé du jour » — une fois par jour, à l'ouverture de l'app,
// on émet un récap GLOBAL de la journée : séances sportives prévues + éléments
// Pro et Perso du calendrier. Best-effort, dédupliqué par jour (dedupKey +
// garde localStorage) → jamais deux fois le même jour, jamais bloquant.
// (Pas d'infra cron : on émet côté client au 1er chargement de la journée.)
// ══════════════════════════════════════════════════════════════════
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { emitNotification } from '@/lib/notifications/emit'
import { localDateStr, weekStartStr, mondayIndex } from '@/lib/date/weekStart'
import { useI18n } from '@/lib/i18n'

export function DailyPlanningNotifier() {
  const { t } = useI18n()
  useEffect(() => {
    const today = localDateStr(new Date())
    const guardKey = `thw_daily_summary_${today}`
    try { if (localStorage.getItem(guardKey)) return } catch { /* ignore */ }

    let cancelled = false
    void (async () => {
      try {
        const user = await getCurrentUser()
        if (!user || cancelled) return
        const sb = createClient()
        const ws = weekStartStr(new Date())
        const di = mondayIndex(new Date())

        const [sess, races, events] = await Promise.all([
          sb.from('planned_sessions').select('title,sport,duration_min').eq('user_id', user.id).eq('week_start', ws).eq('day_index', di),
          sb.from('planned_races').select('name').eq('user_id', user.id).eq('date', today),
          sb.from('calendar_events').select('title,category').eq('user_id', user.id).eq('date', today).in('category', ['pro', 'perso']),
        ])
        if (cancelled) return

        const sessions = (sess.data ?? []) as { title: string | null; sport: string | null; duration_min: number | null }[]
        const raceRows = (races.data ?? []) as { name: string | null }[]
        const proRows = (events.data ?? []).filter((e: { category: string }) => e.category === 'pro') as { title: string | null }[]
        const persoRows = (events.data ?? []).filter((e: { category: string }) => e.category === 'perso') as { title: string | null }[]

        const parts: string[] = []
        if (sessions.length) {
          const totalMin = sessions.reduce((s, x) => s + (x.duration_min ?? 0), 0)
          const names = sessions.map(s => s.title?.trim()).filter(Boolean).slice(0, 3).join(', ')
          parts.push(`${t('dashboard.dailySport')} : ${sessions.length}${totalMin ? ` (${totalMin} min)` : ''}${names ? ` — ${names}` : ''}`)
        }
        if (raceRows.length) parts.push(`${t('dashboard.dailyRace')} : ${raceRows.map(r => r.name).filter(Boolean).join(', ')}`)
        if (proRows.length) parts.push(`${t('dashboard.dailyPro')} : ${proRows.map(r => r.title).filter(Boolean).join(', ')}`)
        if (persoRows.length) parts.push(`${t('dashboard.dailyPerso')} : ${persoRows.map(r => r.title).filter(Boolean).join(', ')}`)

        // On marque le jour comme traité MÊME si rien de prévu (pas de spam de
        // notifications « journée vide »).
        try { localStorage.setItem(guardKey, '1') } catch { /* ignore */ }
        if (!parts.length) return

        emitNotification({
          key: 'daily_summary',
          dedupKey: `daily-summary-${today}`,
          once: true,
          title: t('dashboard.dailySummaryTitle'),
          body: parts.join(' · '),
          url: '/planning',
        })
      } catch { /* silencieux */ }
    })()
    return () => { cancelled = true }
  }, [t])

  return null
}
