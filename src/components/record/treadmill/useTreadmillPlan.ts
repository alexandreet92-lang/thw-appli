'use client'
// Charge les séances course planifiées (planned_sessions, sport='run') de la
// SEMAINE COURANTE + SUIVANTE, pour que l'athlète retrouve et lance n'importe
// laquelle sur le tapis (pas seulement celle du jour).
//  • Sélection automatique : séance « tapis » du jour (validation_data.
//    runningSub === 'treadmill'), sinon 1re course du jour, sinon rien (libre).
//  • L'écran affiche la liste : un clic charge la séance choisie.
// IMPORTANT : planned_sessions n'a PAS de colonne `date` — le jour est identifié
// par week_start (lundi de la semaine) + day_index (0=lundi … 6=dimanche).
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { currentLocale } from '@/lib/i18n'
import { buildTreadmillPlan, type PlannedRunBlock, type TreadmillPlan } from './treadmillPlan'

interface Row {
  id: string
  title: string | null
  blocks: PlannedRunBlock[] | null
  validation_data: { runningSub?: string } | null
  week_start: string
  day_index: number
  duration_min: number | null
  status: string | null
}

export interface TreadmillSessionOption {
  id: string
  title: string
  dayLabel: string        // « Lun. 28 juil. »
  isToday: boolean
  isTreadmill: boolean
  durationMin: number | null
  hasBlocks: boolean
  blocks: PlannedRunBlock[] | null
}

// Lundi de la semaine courante, en date LOCALE (pas UTC : à minuit passé,
// toISOString() basculerait sur le mauvais jour).
function mondayISO(offsetWeeks = 0): string {
  const d = new Date()
  const back = (d.getDay() + 6) % 7
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() - back + offsetWeeks * 7)
  const mm = String(m.getMonth() + 1).padStart(2, '0')
  const dd = String(m.getDate()).padStart(2, '0')
  return `${m.getFullYear()}-${mm}-${dd}`
}

function todayIndex(): number {
  return (new Date().getDay() + 6) % 7   // 0 = lundi … 6 = dimanche
}

function dayLabelOf(weekStart: string, dayIndex: number): string {
  const d = new Date(`${weekStart}T00:00:00`)
  d.setDate(d.getDate() + dayIndex)
  return d.toLocaleDateString(currentLocale(), { weekday: 'short', day: 'numeric', month: 'short' })
}

export function useTreadmillPlan(enabled: boolean) {
  const [options, setOptions] = useState<TreadmillSessionOption[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!enabled) { setLoading(false); return }
    let cancelled = false
    void (async () => {
      try {
        const sb = createClient()
        const user = await getCurrentUser()
        if (!user) { if (!cancelled) setLoading(false); return }
        const { data } = await sb
          .from('planned_sessions')
          .select('id,title,blocks,validation_data,week_start,day_index,duration_min,status')
          .eq('user_id', user.id)
          .eq('sport', 'run')
          .in('week_start', [mondayISO(0), mondayISO(1)])
          .order('week_start', { ascending: true })
          .order('day_index', { ascending: true })
        if (cancelled) return
        const rows = ((data ?? []) as Row[]).filter(r => r.status !== 'completed')
        const curWeek = mondayISO(0), todayIdx = todayIndex()
        const opts: TreadmillSessionOption[] = rows.map(r => ({
          id: r.id,
          title: r.title || 'Séance course',
          dayLabel: dayLabelOf(r.week_start, r.day_index),
          isToday: r.week_start === curWeek && r.day_index === todayIdx,
          isTreadmill: r.validation_data?.runningSub === 'treadmill',
          durationMin: r.duration_min,
          hasBlocks: Array.isArray(r.blocks) && r.blocks.length > 0,
          blocks: r.blocks,
        }))
        setOptions(opts)
        // Sélection auto : tapis du jour > course du jour > rien (mode libre).
        const auto = opts.find(o => o.isToday && o.isTreadmill) ?? opts.find(o => o.isToday) ?? null
        if (auto) setSelectedId(auto.id)
      } catch { /* pas de séance → libre */ }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [enabled])

  const plan: TreadmillPlan | null = useMemo(() => {
    const sel = options.find(o => o.id === selectedId)
    if (!sel) return null
    return buildTreadmillPlan(sel.blocks, sel.title)
  }, [options, selectedId])

  return { plan, loading, options, selectedId, select: setSelectedId }
}
