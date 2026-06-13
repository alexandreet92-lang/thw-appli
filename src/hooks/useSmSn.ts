'use client'
// Charge les benchmarks athlète (athlete_performance_profile, ligne la plus récente) et
// expose une fonction de calcul SM/SN par activité. Déterministe, aucun LLM.
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { smSnFromRow, type AthleteBenchmarks, type SmSn } from '@/lib/metrics/smSn'

const EMPTY: AthleteBenchmarks = { ftp: null, hrMax: null, hrRest: null, p5s: null, oneRm: null }

interface ProfileRow {
  ftp_watts: number | null
  hr_max: number | null
  hr_rest: number | null
  p5s_watts: number | null
  one_rm_estimates: Record<string, number> | null
}

export function useSmSn() {
  const [benchmarks, setBenchmarks] = useState<AthleteBenchmarks>(EMPTY)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { if (!cancelled) setReady(true); return }
        const { data } = await sb
          .from('athlete_performance_profile')
          .select('ftp_watts,hr_max,hr_rest,p5s_watts,one_rm_estimates')
          .eq('user_id', user.id)
          .order('effective_from', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (cancelled) return
        const r = (data ?? null) as ProfileRow | null
        if (r) setBenchmarks({ ftp: r.ftp_watts, hrMax: r.hr_max, hrRest: r.hr_rest, p5s: r.p5s_watts, oneRm: r.one_rm_estimates })
      } catch { /* profil indisponible → benchmarks vides, fallbacks moteur */ }
      finally { if (!cancelled) setReady(true) }
    })()
    return () => { cancelled = true }
  }, [])

  const compute = useCallback(
    (row: Parameters<typeof smSnFromRow>[0]): SmSn => smSnFromRow(row, benchmarks),
    [benchmarks],
  )

  return { benchmarks, ready, compute }
}
