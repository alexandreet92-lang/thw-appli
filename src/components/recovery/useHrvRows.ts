'use client'

// ══════════════════════════════════════════════════════════════
// useHrvRows — lecture du HRV réel depuis health_data (pipeline
// existant, repris de HrvSection : data_type='hrv' + 'nightly_recharge',
// colonne hrv_rmssd ou raw_data.hrv_rmssd/hrv_ms). Aucun nouveau pipeline.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface HrvRow { date: string; hrv: number }

export function useHrvRows() {
  const [rows, setRows] = useState<HrvRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      Promise.all([
        sb.from('health_data').select('date, hrv_rmssd, raw_data')
          .eq('user_id', user.id).eq('data_type', 'hrv')
          .order('date', { ascending: false }).limit(90),
        sb.from('health_data').select('date, raw_data')
          .eq('user_id', user.id).eq('data_type', 'nightly_recharge')
          .order('date', { ascending: false }).limit(90),
      ]).then(([hd1, hd2]) => {
        type RawHrvRow = { date: string | null; hrv_rmssd?: number | null; raw_data: Record<string, unknown> | null }

        const fromHrv: HrvRow[] = ((hd1.data ?? []) as RawHrvRow[])
          .filter(r => r.date)
          .map(r => {
            const v = r.hrv_rmssd ?? ((r.raw_data as Record<string, unknown> | null)?.['hrv_rmssd'] as number | null) ?? null
            return v != null && Number.isFinite(Number(v)) ? { date: r.date!, hrv: Number(v) } : null
          })
          .filter((r): r is HrvRow => r != null)

        const fromRecharge: HrvRow[] = ((hd2.data ?? []) as RawHrvRow[])
          .filter(r => r.date)
          .map(r => {
            const raw = r.raw_data as Record<string, unknown> | null
            const v = (raw?.['hrv_ms'] as number | null) ?? (raw?.['hrv_rmssd'] as number | null) ?? null
            return v != null && Number.isFinite(Number(v)) ? { date: r.date!, hrv: Number(v) } : null
          })
          .filter((r): r is HrvRow => r != null)

        // hrv dédié prioritaire sur nightly_recharge pour une même date
        const byDate = new Map<string, HrvRow>()
        for (const r of [...fromRecharge, ...fromHrv]) byDate.set(r.date, r)

        setRows([...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)))
        setLoading(false)
      })
    })
  }, [])

  return { rows, loading }
}
