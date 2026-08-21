'use client'
// Charge le profil d'intervalles depuis la séance vélo planifiée du jour
// (planned_sessions, sport = 'bike'). La séance est repérée par la clé du
// planning : week_start (lundi local) + day_index (0 = lundi … 6 = dimanche) —
// PAS par une colonne `date` (inexistante). Aucune valeur en dur : si aucune
// séance n'est trouvée ou qu'elle n'a pas de blocs, plan = null → sortie libre.
// Le plan se charge même sans FTP (cibles indisponibles → repli watts 0), pour
// que l'athlète VOIE quand même sa séance planifiée sur l'écran de démarrage.
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { buildPlan, type PlannedBlock } from './buildPlan'
import type { RidePlan } from './types'
import { weekStartStr, mondayIndex } from '@/lib/date/weekStart'

interface Row { id: string; title: string | null; blocks: PlannedBlock[] | null; validation_data: { cyclingSub?: string } | null }

// overrideId : séance planifiée CHOISIE dans le launcher (prioritaire sur la
// séance du jour). null explicite = « lancer sans programme » → aucun plan.
export function useRidePlan(ftp: number | null, enabled: boolean, overrideId?: string | null) {
  const [plan, setPlan] = useState<RidePlan | null>(null)
  const [plannedId, setPlannedId] = useState<string | null>(null)   // séance planifiée source (à clôturer)
  const [cyclingSub, setCyclingSub] = useState<string | null>(null) // 'ht' = home trainer
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!enabled) { setLoading(false); return }
    // « Sans programme » explicite : on n'interroge pas la base, sortie libre.
    if (overrideId === null) { setPlan(null); setPlannedId(null); setLoading(false); return }
    let cancelled = false
    void (async () => {
      try {
        const sb = createClient()
        const user = await getCurrentUser()
        if (!user) { if (!cancelled) setLoading(false); return }
        const now = new Date()
        let q = sb.from('planned_sessions').select('id,title,blocks,validation_data').eq('user_id', user.id)
        // Séance choisie par son id, sinon repli sur la séance vélo du jour.
        q = overrideId
          ? q.eq('id', overrideId)
          : q.eq('sport', 'bike').eq('week_start', weekStartStr(now)).eq('day_index', mondayIndex(now))
        const { data, error } = await q.order('updated_at', { ascending: false }).limit(1).maybeSingle()
        if (cancelled) return
        if (error) { console.error('[ride] chargement séance planifiée:', error.message); return }
        const row = (data ?? null) as Row | null
        if (row) {
          setPlan(buildPlan(row.blocks, ftp ?? 0, row.title ?? 'Séance vélo'))
          setPlannedId(row.id)
          setCyclingSub(row.validation_data?.cyclingSub ?? null)
        }
      } catch { /* pas de séance → sortie libre */ }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [ftp, enabled, overrideId])

  return { plan, plannedId, cyclingSub, loading }
}
