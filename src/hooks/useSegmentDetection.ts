'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Segment, ActiveEffort, CompletedEffortLocal } from '@/types/segment'

const PROXIMITY_M = 30
const MIN_EFFORT_SEC = 10

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function useSegmentDetection(
  currentLat: number | null,
  currentLng: number | null,
  sport: string,
  active: boolean,
) {
  const [segments, setSegments] = useState<Segment[]>([])
  const [activeEffort, setActiveEffort] = useState<ActiveEffort | null>(null)
  const [completedEfforts, setCompletedEfforts] = useState<CompletedEffortLocal[]>([])
  const userIdRef = useRef<string | null>(null)
  const passedStartRef = useRef<Set<string>>(new Set())
  const elapsedRef = useRef<Record<string, number>>({})
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Load userId once
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      userIdRef.current = data.user?.id ?? null
    })
  }, [])

  // Load nearby segments when first position is available
  const loadedRef = useRef(false)
  useEffect(() => {
    if (!currentLat || !currentLng || loadedRef.current) return
    loadedRef.current = true
    createClient()
      .from('segments')
      .select('*')
      .eq('sport', sport)
      .then(({ data }) => {
        if (!data) return
        // Filter segments whose first point is within 10km
        const nearby = (data as Segment[]).filter(seg => {
          if (!seg.points?.length) return false
          const d = haversine(currentLat, currentLng, seg.points[0].lat, seg.points[0].lng)
          return d < 10000
        })
        setSegments(nearby)
      })
  }, [currentLat, currentLng, sport])

  // Tick active effort timer
  useEffect(() => {
    if (!active || !activeEffort) return
    timerRef.current = setInterval(() => {
      setActiveEffort(e => e ? { ...e, elapsedSeconds: e.elapsedSeconds + 1 } : null)
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [active, activeEffort?.segmentId])

  const saveEffort = useCallback(async (seg: Segment, startedAt: string, durationSeconds: number) => {
    if (!userIdRef.current) return
    await createClient().from('segment_efforts').insert({
      segment_id: seg.id,
      user_id: userIdRef.current,
      started_at: startedAt,
      duration_seconds: durationSeconds,
      distance_m: seg.distance_m,
    })
  }, [])

  // Detect proximity to segment start/end
  useEffect(() => {
    if (!active || !currentLat || !currentLng || segments.length === 0) return

    for (const seg of segments) {
      if (!seg.points?.length) continue
      const start = seg.points[0]
      const end = seg.points[seg.points.length - 1]

      const distToStart = haversine(currentLat, currentLng, start.lat, start.lng)
      const distToEnd = haversine(currentLat, currentLng, end.lat, end.lng)

      // Enter start zone — begin effort
      if (distToStart < PROXIMITY_M && !passedStartRef.current.has(seg.id) && activeEffort?.segmentId !== seg.id) {
        passedStartRef.current.add(seg.id)
        const now = new Date().toISOString()
        elapsedRef.current[seg.id] = 0
        setActiveEffort({ segmentId: seg.id, segmentName: seg.name, startedAt: now, elapsedSeconds: 0 })
      }

      // Reach end zone — finish effort
      if (distToEnd < PROXIMITY_M && passedStartRef.current.has(seg.id) && activeEffort?.segmentId === seg.id) {
        const elapsed = activeEffort.elapsedSeconds
        if (elapsed >= MIN_EFFORT_SEC) {
          const effort: CompletedEffortLocal = {
            segmentId: seg.id,
            segmentName: seg.name,
            durationSeconds: elapsed,
            distanceM: seg.distance_m,
            startedAt: activeEffort.startedAt,
          }
          setCompletedEfforts(e => [...e, effort])
          saveEffort(seg, activeEffort.startedAt, elapsed)
        }
        passedStartRef.current.delete(seg.id)
        setActiveEffort(null)
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }
  }, [currentLat, currentLng, segments, active, activeEffort, saveEffort])

  return { activeEffort, completedEfforts }
}
