'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface BodyMeasurement {
  id: string
  user_id?: string
  measured_at: string
  weight_kg: number | null
  fat_mass_percent: number | null
  muscle_mass_kg: number | null
  metabolic_age: number | null
  notes: string | null
  source: string
  created_at: string
}

export type WeightMetric = 'weight_kg' | 'fat_mass_percent' | 'muscle_mass_kg' | 'bmi' | 'metabolic_age'

export function getMetricValue(
  m: BodyMeasurement,
  metric: WeightMetric,
  heightCm: number | null,
): number | null {
  switch (metric) {
    case 'weight_kg':        return m.weight_kg
    case 'fat_mass_percent': return m.fat_mass_percent
    case 'muscle_mass_kg':   return m.muscle_mass_kg
    case 'metabolic_age':    return m.metabolic_age
    case 'bmi':
      if (m.weight_kg && heightCm) {
        const h = heightCm / 100
        return m.weight_kg / (h * h)
      }
      return null
  }
}

/** Linear regression on last 4 valid data points — returns slope in units/week */
export function computeTrendPerWeek(
  sorted: BodyMeasurement[],
  getVal: (m: BodyMeasurement) => number | null,
): number | null {
  const pts = sorted
    .slice(-4)
    .map(m => ({ t: new Date(m.measured_at).getTime(), v: getVal(m) }))
    .filter((p): p is { t: number; v: number } => p.v != null)
  if (pts.length < 2) return null
  const t0 = pts[0].t
  const xs = pts.map(p => (p.t - t0) / 86400000)
  const ys = pts.map(p => p.v)
  const n = pts.length
  const meanX = xs.reduce((s, x) => s + x, 0) / n
  const meanY = ys.reduce((s, y) => s + y, 0) / n
  const num = xs.reduce((s, x, i) => s + (x - meanX) * (ys[i] - meanY), 0)
  const den = xs.reduce((s, x) => s + (x - meanX) ** 2, 0)
  return den === 0 ? null : (num / den) * 7
}

export function useBodyMetrics() {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data, error } = await sb
        .from('body_measurements')
        .select('*')
        .eq('user_id', user.id)
        .order('measured_at', { ascending: true })
      if (error) console.error('[useBodyMetrics]', error)
      setMeasurements((data as BodyMeasurement[]) ?? [])
    } catch (err) { console.error('[useBodyMetrics]', err) }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const addMeasurement = useCallback(async (
    m: Omit<BodyMeasurement, 'id' | 'user_id' | 'created_at'>,
  ): Promise<void> => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { error } = await sb
      .from('body_measurements')
      .upsert({ user_id: user.id, ...m }, { onConflict: 'user_id,measured_at' })
    if (error) { console.error('[addMeasurement]', error); throw error }
    await load()
  }, [load])

  const updateMeasurement = useCallback(async (
    id: string,
    patch: Partial<Omit<BodyMeasurement, 'id' | 'user_id' | 'created_at'>>,
  ): Promise<void> => {
    const sb = createClient()
    const { error } = await sb.from('body_measurements').update(patch).eq('id', id)
    if (error) { console.error('[updateMeasurement]', error); throw error }
    await load()
  }, [load])

  const deleteMeasurement = useCallback(async (id: string): Promise<void> => {
    const sb = createClient()
    const { error } = await sb.from('body_measurements').delete().eq('id', id)
    if (error) { console.error('[deleteMeasurement]', error); throw error }
    await load()
  }, [load])

  return { measurements, loading, addMeasurement, updateMeasurement, deleteMeasurement }
}
