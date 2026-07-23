'use client'
// Charge la séance course TAPIS planifiée du jour (planned_sessions, sport='run',
// validation_data.runningSub==='treadmill'). Aucune valeur en dur : aucune séance
// ou pas de blocs → plan=null (séance libre).
// IMPORTANT : planned_sessions n'a PAS de colonne `date` — le jour est identifié
// par week_start (lundi de la semaine) + day_index (0=lundi … 6=dimanche).
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { buildTreadmillPlan, type PlannedRunBlock, type TreadmillPlan } from './treadmillPlan'

interface Row {
  title: string | null
  blocks: PlannedRunBlock[] | null
  validation_data: { runningSub?: string } | null
}

// Lundi de la semaine courante, en date LOCALE (pas UTC : à minuit passé,
// toISOString() basculerait sur le mauvais jour).
function mondayISO(): string {
  const d = new Date()
  const back = (d.getDay() + 6) % 7
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() - back)
  const mm = String(m.getMonth() + 1).padStart(2, '0')
  const dd = String(m.getDate()).padStart(2, '0')
  return `${m.getFullYear()}-${mm}-${dd}`
}

function todayIndex(): number {
  return (new Date().getDay() + 6) % 7   // 0 = lundi … 6 = dimanche
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
          .select('title,blocks,validation_data')
          .eq('user_id', user.id)
          .eq('sport', 'run')
          .eq('week_start', mondayISO())
          .eq('day_index', todayIndex())
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
