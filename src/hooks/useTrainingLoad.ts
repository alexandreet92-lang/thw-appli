'use client'
// Charge d'entraînement : CTL/ATL/TSB sur SM ET SN (EWMA 42/7), depuis les activités.
// Déterministe (moteur smSn). Remplace l'ancien PMC basé TSS. Streams non chargés pour la
// série (perf) → SN cyclisme en repli FC ; suffisant pour la tendance de charge.
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSmSn } from '@/hooks/useSmSn'
import { buildPmcDual, combinedVerdict, type PmcDualPoint, type LoadVerdict } from '@/lib/training/pmcDual'

const COLS = 'started_at,sport_type,moving_time_s,elapsed_time_s,normalized_watts,ftp_at_time,avg_hr,avg_temp_c,elevation_gain_m,total_descent_m,elevation_loss_m,distance_m'

export interface TrainingLoad {
  loading: boolean
  series: PmcDualPoint[]
  CTL_SM: number; ATL_SM: number; TSB_SM: number
  CTL_SN: number; ATL_SN: number; TSB_SN: number
  verdict: LoadVerdict | null
}

export function useTrainingLoad(days = 90): TrainingLoad {
  const { compute, ready } = useSmSn()
  const [series, setSeries] = useState<PmcDualPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    void (async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { if (!cancelled) { setSeries([]); setLoading(false) } return }
        const since = new Date(); since.setDate(since.getDate() - days - 42)
        const { data } = await sb
          .from('activities')
          .select(COLS)
          .eq('user_id', user.id)
          .gte('started_at', since.toISOString())
          .order('started_at', { ascending: true })
        if (cancelled) return
        const rows = (data ?? []) as Array<{ started_at: string } & Parameters<typeof compute>[0]>
        const daily = rows
          .filter(r => r.started_at)
          .map(row => { const { sm, sn } = compute(row); return { date: row.started_at.slice(0, 10), sm, sn } })
        setSeries(buildPmcDual(daily, days))
      } catch { if (!cancelled) setSeries([]) }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [ready, compute, days])

  const last = series[series.length - 1] ?? null
  return {
    loading,
    series,
    CTL_SM: last?.ctlSm ?? 0, ATL_SM: last?.atlSm ?? 0, TSB_SM: last?.tsbSm ?? 0,
    CTL_SN: last?.ctlSn ?? 0, ATL_SN: last?.atlSn ?? 0, TSB_SN: last?.tsbSn ?? 0,
    verdict: last ? combinedVerdict(last.tsbSm, last.tsbSn) : null,
  }
}
