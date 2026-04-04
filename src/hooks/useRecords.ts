'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface PersonalRecord {
  id:               string
  sport:            string
  distance_label:   string
  performance:      string
  event_type:       'training' | 'competition'
  race_name:        string | null
  achieved_at:      string
  year:             number
  pace_s_km:        number | null
  elevation_gain_m: number | null
  split_swim:       string | null
  split_bike:       string | null
  split_run:        string | null
  station_times:    Record<string, string> | null
  notes:            string | null
}

export interface RaceResult {
  id:             string
  sport:          string
  race_name:      string
  race_date:      string
  year:           number
  finish_time:    string | null
  overall_rank:   string | null
  category:       string | null
  split_swim:     string | null
  split_bike:     string | null
  split_run:      string | null
  station_times:  Record<string, string> | null
  notes:          string | null
}

export function useRecords() {
  const [records,  setRecords]  = useState<PersonalRecord[]>([])
  const [palmares, setPalmares] = useState<RaceResult[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [recRes, palRes] = await Promise.all([
      supabase.from('personal_records').select('*').eq('user_id', user.id).order('achieved_at', { ascending: false }),
      supabase.from('race_results').select('*').eq('user_id', user.id).order('race_date', { ascending: false }),
    ])

    setRecords(recRes.data ?? [])
    setPalmares(palRes.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const addRecord = useCallback(async (entry: Omit<PersonalRecord, 'id' | 'year'>) => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    await supabase.from('personal_records').insert({
      user_id:          user.id,
      sport:            entry.sport,
      distance_label:   entry.distance_label,
      performance:      entry.performance,
      performance_unit: entry.sport === 'bike' ? 'watts' : 'time',
      event_type:       entry.event_type,
      race_name:        entry.race_name || null,
      achieved_at:      entry.achieved_at,
      pace_s_km:        entry.pace_s_km ?? null,
      elevation_gain_m: entry.elevation_gain_m ?? null,
      split_swim:       entry.split_swim ?? null,
      split_bike:       entry.split_bike ?? null,
      split_run:        entry.split_run ?? null,
      station_times:    entry.station_times ?? null,
      notes:            entry.notes ?? null,
    })

    await load()
    setSaving(false)
  }, [load])

  const addPalmares = useCallback(async (entry: Omit<RaceResult, 'id' | 'year'>) => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    await supabase.from('race_results').insert({
      user_id:       user.id,
      sport:         entry.sport,
      race_name:     entry.race_name,
      race_date:     entry.race_date,
      finish_time:   entry.finish_time ?? null,
      overall_rank:  entry.overall_rank ? parseInt(entry.overall_rank) : null,
      category:      entry.category ?? null,
      split_swim:    entry.split_swim ?? null,
      split_bike:    entry.split_bike ?? null,
      split_run:     entry.split_run ?? null,
      station_times: entry.station_times ?? null,
      notes:         entry.notes ?? null,
    })

    await load()
    setSaving(false)
  }, [load])

  const deleteRecord = useCallback(async (id: string) => {
    await supabase.from('personal_records').delete().eq('id', id)
    await load()
  }, [load])

  const deletePalmares = useCallback(async (id: string) => {
    await supabase.from('race_results').delete().eq('id', id)
    await load()
  }, [load])

  return { records, palmares, loading, saving, addRecord, addPalmares, deleteRecord, deletePalmares, reload: load }
}
