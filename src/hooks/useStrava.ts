'use client'

import { useState, useEffect, useCallback } from 'react'

export interface StravaActivity {
  id:                string
  strava_id?:        number
  provider_id?:      string
  name?:             string
  title?:            string
  sport_type:        string
  started_at:        string
  distance_m:        number | null
  moving_time_s:     number | null
  elapsed_time_s:    number | null
  elevation_gain_m:  number | null
  avg_speed_ms:      number | null
  max_speed_ms:      number | null
  avg_hr?:           number | null
  max_hr?:           number | null
  avg_watts?:        number | null
  normalized_watts?: number | null
  kilojoules?:       number | null
  suffer_score?:     number | null
  avg_cadence?:      number | null
  tss?:              number | null
}

export function useStrava() {
  const [activities, setActivities] = useState<StravaActivity[]>([])
  const [loading,    setLoading]    = useState(true)
  const [syncing,    setSyncing]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [connected,  setConnected]  = useState(false)
  const [offset,     setOffset]     = useState(0)

  const load = useCallback(async (reset = false) => {
    try {
      const currentOffset = reset ? 0 : offset
      const res = await fetch(`/api/strava/activities?limit=20&offset=${currentOffset}`)
      if (res.status === 401) { setConnected(false); setLoading(false); return }
      if (!res.ok) throw new Error('Failed to fetch activities')
      const data = await res.json()
      setConnected(true)
      if (reset) {
        setActivities(data.activities)
        setOffset(20)
      } else {
        setActivities(prev => [...prev, ...data.activities])
        setOffset(prev => prev + 20)
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [offset])

  useEffect(() => { load(true) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sync = useCallback(async () => {
    setSyncing(true)
    setError(null)
    try {
      const res = await fetch('/api/strava/activities', { method: 'POST' })
      if (!res.ok) throw new Error('Sync failed')
      await load(true)
    } catch (e) {
      setError(String(e))
    } finally {
      setSyncing(false)
    }
  }, [load])

  const disconnect = useCallback(async () => {
    const res = await fetch('/api/strava/disconnect', { method: 'POST' })
    if (res.ok) {
      setConnected(false)
      setActivities([])
      setOffset(0)
    }
  }, [])

  // Fetch les streams d'une activité (lazy-load + cache DB)
  const fetchStreams = useCallback(async (activityId: string) => {
    const res = await fetch(`/api/strava/streams?activity_id=${activityId}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.streams ?? null
  }, [])

  return {
    activities,
    loading,
    syncing,
    error,
    connected,
    sync,
    disconnect,
    fetchMore:    () => load(false),
    fetchStreams,
  }
}
