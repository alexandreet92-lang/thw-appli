'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'
import HrvDaily from './HrvDaily'
import HrvTrend from './HrvTrend'
import HrvHeatmap from './HrvHeatmap'

export interface HrvRow { date: string; hrv: number }

export default function HrvSection() {
  const { t } = useI18n()
  const [rows, setRows] = useState<HrvRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }

      // Source 1 : data_type='hrv' (entrées dédiées, colonne hrv_rmssd ou raw_data.hrv_rmssd)
      // Source 2 : data_type='nightly_recharge' (Polar v4, raw_data.hrv_ms ou raw_data.hrv_rmssd)
      Promise.all([
        sb.from('health_data')
          .select('date, hrv_rmssd, raw_data')
          .eq('user_id', user.id)
          .eq('data_type', 'hrv')
          .order('date', { ascending: false })
          .limit(90),
        sb.from('health_data')
          .select('date, raw_data')
          .eq('user_id', user.id)
          .eq('data_type', 'nightly_recharge')
          .order('date', { ascending: false })
          .limit(90),
      ]).then(([hd1, hd2]) => {
        type RawHrvRow = { date: string | null; hrv_rmssd?: number | null; raw_data: Record<string, unknown> | null }

        // Rows from dedicated hrv entries
        const fromHrv: HrvRow[] = ((hd1.data ?? []) as RawHrvRow[])
          .filter(r => r.date)
          .map(r => {
            const hrv = r.hrv_rmssd
              ?? (r.raw_data as Record<string, unknown> | null)?.['hrv_rmssd'] as number | null
              ?? null
            return hrv != null ? { date: r.date!, hrv } : null
          })
          .filter((r): r is HrvRow => r != null)

        // Rows from nightly recharge (Polar v4)
        const fromRecharge: HrvRow[] = ((hd2.data ?? []) as RawHrvRow[])
          .filter(r => r.date)
          .map(r => {
            const raw = r.raw_data as Record<string, unknown> | null
            const hrv = (raw?.['hrv_ms']    as number | null)
                     ?? (raw?.['hrv_rmssd'] as number | null)
                     ?? null
            return hrv != null ? { date: r.date!, hrv } : null
          })
          .filter((r): r is HrvRow => r != null)

        // Merge — hrv entries take precedence over nightly_recharge for same date
        const byDate = new Map<string, HrvRow>()
        for (const r of [...fromRecharge, ...fromHrv]) byDate.set(r.date, r)

        setRows([...byDate.values()])
        setLoading(false)
      })
    })
  }, [])

  if (loading || rows.length === 0) return null

  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date))
  const todayRow = sorted[sorted.length - 1]
  const hist7 = sorted.slice(-7)
  const avg7 = hist7.reduce((s, r) => s + r.hrv, 0) / hist7.length
  const allVals = sorted.map(r => r.hrv)

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 20, padding: 24, boxShadow: 'var(--shadow-card)',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', margin: '0 0 4px' }}>
          HRV
        </p>
        <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 700, margin: 0 }}>
          {t('recovery.hrv.hrvChartTitle')}
        </h2>
      </div>

      {/* Top 2-col: daily card | heatmap */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, alignItems: 'start' }}
        className="hrv-2col">
        <HrvDaily todayHrv={todayRow.hrv} avg7={avg7} allTime={allVals} />
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', margin: '0 0 10px' }}>
            {t('recovery.hrv.weeklyPatterns')}
          </p>
          <HrvHeatmap rows={sorted} />
        </div>
      </div>

      {/* Trend chart */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', margin: '0 0 8px' }}>
          {t('recovery.hrv.trendTitle')}
        </p>
        <HrvTrend rows={sorted} />
      </div>

      <style>{`@media (max-width: 640px) { .hrv-2col { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
