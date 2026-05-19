'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import HrvDaily from './HrvDaily'
import HrvTrend from './HrvTrend'
import HrvHeatmap from './HrvHeatmap'

export interface HrvRow { date: string; hrv: number }

export default function HrvSection() {
  const [rows, setRows] = useState<HrvRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      // Try hrv_rmssd column, then raw_data fallback
      sb.from('health_data')
        .select('date, hrv_rmssd, raw_data')
        .eq('user_id', user.id)
        .eq('data_type', 'hrv')
        .order('date', { ascending: false })
        .limit(90)
        .then(({ data }) => {
          if (data) {
            const parsed = (data as { date: string | null; hrv_rmssd: number | null; raw_data: Record<string, unknown> | null }[])
              .filter(r => r.date)
              .map(r => {
                const hrv = r.hrv_rmssd
                  ?? (r.raw_data as Record<string, unknown> | null)?.['hrv_rmssd'] as number | null
                  ?? null
                return hrv != null ? { date: r.date!, hrv } : null
              })
              .filter((r): r is HrvRow => r != null)
            setRows(parsed)
          }
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
          Variabilité cardiaque
        </h2>
      </div>

      {/* Top 2-col: daily card | heatmap */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, alignItems: 'start' }}
        className="hrv-2col">
        <HrvDaily todayHrv={todayRow.hrv} avg7={avg7} allTime={allVals} />
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', margin: '0 0 10px' }}>
            Patterns hebdomadaires
          </p>
          <HrvHeatmap rows={sorted} />
        </div>
      </div>

      {/* Trend chart */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', margin: '0 0 8px' }}>
          Tendance HRV
        </p>
        <HrvTrend rows={sorted} />
      </div>

      <style>{`@media (max-width: 640px) { .hrv-2col { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
