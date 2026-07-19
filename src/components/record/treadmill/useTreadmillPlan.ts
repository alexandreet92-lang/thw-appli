'use client'
// Charge la séance course TAPIS planifiée du jour (planned_sessions, sport='run',
// validation_data.runningSub==='treadmill'). Aucune valeur en dur : aucune séance
// ou pas de blocs → plan=null (séance libre). Récupère aussi les séances tapis de
// la semaine pour un éventuel choix.
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { buildTreadmillPlan, type PlannedRunBlock, type TreadmillPlan } from './treadmillPlan'

interface Row {
  title: string | null
  blocks: PlannedRunBlock[] | null
  validation_data: { runningSub?: string } | null
  date: string | null
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function useTreadmillPlan(enabled: boolean) {
  const [plan, setPlan] = useState<TreadmillPlan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!enabled) { setLoading(false); return }
    let cancelled = false
    void (async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { if (!cancelled) setLoading(false); return }
        const { data } = await sb
          .from('planned_sessions')
          .select('title,blocks,validation_data,date')
          .eq('user_id', user.id)
          .eq('sport', 'run')
          .eq('date', todayISO())
          .order('day_index', { ascending: true })
        if (cancelled) return
        const rows = (data ?? []) as Row[]
        // Priorité à une séance explicitement « tapis » ; sinon la 1re course du jour.
        const tapis = rows.find(r => r.validation_data?.runningSub === 'treadmill')
        const row = tapis ?? rows[0] ?? null
        if (row) setPlan(buildTreadmillPlan(row.blocks, row.title ?? 'Séance tapis'))
      } catch { /* pas de séance → libre */ }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [enabled])

  return { plan, loading }
}
