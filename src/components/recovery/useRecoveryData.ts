'use client'

// ══════════════════════════════════════════════════════════════
// useRecoveryData — source unique pour l'UI Récupération (pipeline
// existant health_data + recovery_checkin). Lecture seule côté hook ;
// l'écriture (check-in + readiness) se fait dans CheckinTab.
//  • HRV réel (data_type='hrv' / 'nightly_recharge')
//  • readiness/fatigue dérivés (data_type='readiness' : readiness_score / fatigue_level)
//  • check-in du jour (recovery_checkin) pour préremplissage + readiness live
// `reloadKey` : incrémenter pour refetch après une validation de check-in.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CheckinScales } from '@/lib/recovery/computeReadiness'

export interface HrvRow { date: string; hrv: number }

export interface RecoveryData {
  loading: boolean
  hrvRows: HrvRow[]
  hrvToday: number | null
  hrvBaseline: number | null
  hrvNightsCount: number
  readinessByDate: Map<string, number>
  fatigueByDate: Map<string, number>
  todayCheckin: CheckinScales | null
}

const EMPTY: RecoveryData = {
  loading: true, hrvRows: [], hrvToday: null, hrvBaseline: null, hrvNightsCount: 0,
  readinessByDate: new Map(), fatigueByDate: new Map(), todayCheckin: null,
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function useRecoveryData(reloadKey = 0): RecoveryData {
  const [data, setData] = useState<RecoveryData>(EMPTY)

  useEffect(() => {
    let cancelled = false
    const sb = createClient()
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) { if (!cancelled) setData({ ...EMPTY, loading: false }); return }
      Promise.all([
        sb.from('health_data').select('date, hrv_rmssd, raw_data')
          .eq('user_id', user.id).eq('data_type', 'hrv')
          .order('date', { ascending: false }).limit(90),
        sb.from('health_data').select('date, raw_data')
          .eq('user_id', user.id).eq('data_type', 'nightly_recharge')
          .order('date', { ascending: false }).limit(90),
        sb.from('health_data').select('date, readiness_score, fatigue_level')
          .eq('user_id', user.id).eq('data_type', 'readiness')
          .order('date', { ascending: false }).limit(90),
        sb.from('recovery_checkin').select('sleep_quality, fatigue, soreness, mood')
          .eq('user_id', user.id).eq('date', todayStr()).maybeSingle(),
      ]).then(([hd1, hd2, rd, ci]) => {
        if (cancelled) return
        type RawHrv = { date: string | null; hrv_rmssd?: number | null; raw_data: Record<string, unknown> | null }

        const byDate = new Map<string, number>()
        for (const r of (hd2.data ?? []) as RawHrv[]) {
          const raw = r.raw_data
          const v = (raw?.['hrv_ms'] as number | null) ?? (raw?.['hrv_rmssd'] as number | null) ?? null
          if (r.date && v != null && Number.isFinite(Number(v))) byDate.set(r.date, Number(v))
        }
        for (const r of (hd1.data ?? []) as RawHrv[]) {
          const v = r.hrv_rmssd ?? (r.raw_data?.['hrv_rmssd'] as number | null) ?? null
          if (r.date && v != null && Number.isFinite(Number(v))) byDate.set(r.date, Number(v)) // hrv prioritaire
        }
        const hrvRows: HrvRow[] = [...byDate.entries()]
          .map(([date, hrv]) => ({ date, hrv }))
          .sort((a, b) => a.date.localeCompare(b.date))

        const readinessByDate = new Map<string, number>()
        const fatigueByDate = new Map<string, number>()
        for (const r of (rd.data ?? []) as { date: string | null; readiness_score: number | null; fatigue_level: number | null }[]) {
          if (!r.date) continue
          if (r.readiness_score != null) readinessByDate.set(r.date, Number(r.readiness_score))
          if (r.fatigue_level != null) fatigueByDate.set(r.date, Number(r.fatigue_level))
        }

        const vals = hrvRows.map(r => r.hrv)
        const hrvBaseline = vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : null
        const c = ci.data as { sleep_quality: number; fatigue: number; soreness: number; mood: number } | null

        setData({
          loading: false,
          hrvRows,
          hrvToday: hrvRows.length ? hrvRows[hrvRows.length - 1].hrv : null,
          hrvBaseline,
          hrvNightsCount: hrvRows.length,
          readinessByDate,
          fatigueByDate,
          todayCheckin: c ? { sleepQuality: c.sleep_quality, fatigue: c.fatigue, soreness: c.soreness, mood: c.mood } : null,
        })
      })
    })
    return () => { cancelled = true }
  }, [reloadKey])

  return data
}
