'use client'
import { useMemo, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CheckInRow } from './types'
import SleepScoreRing, { type SleepRingData } from './sleep/SleepScoreRing'
import SleepPhasesStack, { type SleepNightPhases } from './sleep/SleepPhasesStack'
import SleepTrends, { type TrendNight } from './sleep/SleepTrends'
import SleepDebt from './sleep/SleepDebt'
import CircadianClock, { type SleepWindow } from './sleep/CircadianClock'

interface PolarRow {
  date: string | null
  sleep_duration_min: number | null; sleep_score: number | null
  rem_duration_min: number | null; deep_duration_min: number | null
  light_duration_min: number | null; awake_duration_min: number | null
  sleep_start: string | null; sleep_end: string | null
}

function tsToHour(ts: string | null): number {
  if (!ts) return 0
  try { const d = new Date(ts); return d.getHours() + d.getMinutes() / 60 }
  catch { return 0 }
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

interface Props { checkin: CheckInRow | null; history: CheckInRow[] }

export default function SleepSection({ checkin, history }: Props) {
  const [rows, setRows] = useState<PolarRow[]>([])

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      sb.from('health_data')
        .select('date,sleep_duration_min,sleep_score,rem_duration_min,deep_duration_min,light_duration_min,awake_duration_min,sleep_start,sleep_end')
        .eq('user_id', user.id).eq('data_type', 'sleep')
        .order('date', { ascending: false }).limit(90)
        .then(({ data }) => { if (data) setRows(data as PolarRow[]) })
    })
  }, [])

  const hasDevice = rows.length > 0
  const latest = rows[0]

  // ── Score ring ────────────────────────────────────────────────
  const ringData = useMemo<SleepRingData | null>(() => {
    if (hasDevice && latest && (latest.sleep_duration_min ?? 0) > 0) {
      const totalMin = latest.sleep_duration_min ?? 0
      const deepMin  = latest.deep_duration_min  ?? 0
      const remMin   = latest.rem_duration_min   ?? 0
      const lightMin = latest.light_duration_min ?? Math.max(0, totalMin - deepMin - remMin)
      const wakeMin  = latest.awake_duration_min ?? 0
      return { totalMin, deepMin, remMin, lightMin, wakeMin, score: latest.sleep_score ?? 0, fromDevice: true }
    }
    if (checkin && (checkin.sleep_hours ?? 0) > 0) {
      const totalMin = Math.round((checkin.sleep_hours ?? 0) * 60)
      const score = Math.round(checkin.sleep_quality / 10 * 60 + Math.min(checkin.sleep_hours ?? 0, 9) / 9 * 40)
      const deepMin = Math.round(totalMin * 0.18), remMin = Math.round(totalMin * 0.22)
      return { totalMin, deepMin, remMin, lightMin: Math.round(totalMin * 0.55), wakeMin: Math.round(totalMin * 0.05), score, fromDevice: false }
    }
    return null
  }, [rows, checkin, hasDevice, latest])

  // ── Phases stack ──────────────────────────────────────────────
  const phaseNights = useMemo<SleepNightPhases[]>(() =>
    rows.filter(r => r.date && (r.sleep_duration_min ?? 0) > 0).slice(0, 10).map(r => ({
      date: r.date!, totalMin: r.sleep_duration_min ?? 0,
      deepMin: r.deep_duration_min ?? 0, remMin: r.rem_duration_min ?? 0,
      lightMin: r.light_duration_min ?? 0, wakeMin: r.awake_duration_min ?? 0,
    }))
  , [rows])

  // ── Trend nights (polar + checkin merged) ─────────────────────
  const trendNights = useMemo<TrendNight[]>(() => {
    const polarByDate = new Map(
      rows.filter(r => r.date && (r.sleep_duration_min ?? 0) > 0).map(r => [r.date!, {
        date: r.date!, totalMin: r.sleep_duration_min,
        deepMin: r.deep_duration_min, remMin: r.rem_duration_min,
        lightMin: r.light_duration_min, wakeMin: r.awake_duration_min,
      }])
    )
    const checkinPts: TrendNight[] = history
      .filter(c => !polarByDate.has(c.date) && (c.sleep_hours ?? 0) > 0)
      .map(c => ({ date: c.date, totalMin: Math.round((c.sleep_hours ?? 0) * 60), deepMin: null, remMin: null, lightMin: null, wakeMin: null }))
    return [...polarByDate.values(), ...checkinPts].sort((a, b) => a.date.localeCompare(b.date))
  }, [rows, history])

  // ── Debt (7 days) ─────────────────────────────────────────────
  const debt7 = useMemo(() => {
    const cut = new Date(); cut.setDate(cut.getDate() - 6)
    return trendNights.filter(n => n.date >= isoDate(cut)).map(n => ({ date: n.date, totalMin: n.totalMin }))
  }, [trendNights])

  // ── Circadian windows ─────────────────────────────────────────
  const circadian = useMemo<SleepWindow[]>(() =>
    rows.filter(r => r.date && r.sleep_start && r.sleep_end).slice(0, 7).map(r => {
      const start = tsToHour(r.sleep_start)
      let end = tsToHour(r.sleep_end)
      if (end < start) end += 24
      return { date: r.date!, startHour: start, endHour: end }
    })
  , [rows])

  if (!ringData && trendNights.length === 0) return null

  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:20, padding:24, boxShadow:'var(--shadow-card)' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-dim)', margin:'0 0 4px' }}>Sommeil</p>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700, margin:0 }}>Analyse du sommeil</h2>
        </div>
        {latest?.date && (
          <span style={{ fontSize:10, color:'var(--text-dim)', fontStyle:'italic', paddingTop:4 }}>
            Dernière nuit&nbsp;: {new Date(latest.date+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long'})}
          </span>
        )}
      </div>

      {/* Desktop 2-col: ring+debt | clock */}
      {ringData && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24, alignItems:'start' }} className="sleep-2col">
          <div style={{ display:'flex', flexDirection:'column', gap:14, alignItems:'center' }}>
            <SleepScoreRing {...ringData} />
            {debt7.length >= 3 && <SleepDebt nights7={debt7} />}
          </div>
          {circadian.length > 0
            ? <CircadianClock windows={circadian} />
            : <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:140 }}>
                <p style={{ fontSize:10, color:'var(--text-dim)', fontStyle:'italic', textAlign:'center' }}>
                  Connecte Polar pour voir<br/>ta régularité circadienne
                </p>
              </div>
          }
        </div>
      )}

      {/* Phases empilées */}
      {phaseNights.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <p style={{ fontSize:11, fontWeight:600, color:'var(--text-dim)', margin:'0 0 10px' }}>Répartition des phases</p>
          <SleepPhasesStack nights={phaseNights} />
        </div>
      )}

      {/* Courbes tendance */}
      {trendNights.length >= 3 && (
        <div>
          <p style={{ fontSize:11, fontWeight:600, color:'var(--text-dim)', margin:'0 0 8px' }}>Tendances de sommeil</p>
          <SleepTrends nights={trendNights} />
        </div>
      )}

      <style>{`
        @media (max-width: 640px) { .sleep-2col { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
