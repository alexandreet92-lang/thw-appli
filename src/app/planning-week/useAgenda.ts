'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { getCalendars, fetchAgenda } from '@/lib/agenda/data'
import type { AgendaCalendar, CalEvent } from '@/lib/agenda/types'

// Hook de données de l'agenda : couches + événements de la plage visible,
// avec rafraîchissement. Recharge quand la plage change.
export function useAgenda(rangeStartISO: string, rangeEndISO: string) {
  const [calendars, setCalendars] = useState<AgendaCalendar[]>([])
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const calsRef = useRef<AgendaCalendar[]>([])

  const loadCalendars = useCallback(async () => {
    const cals = await getCalendars()
    calsRef.current = cals
    setCalendars(cals)
    return cals
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const cals = calsRef.current.length ? calsRef.current : await loadCalendars()
      const ev = await fetchAgenda(rangeStartISO, rangeEndISO, cals)
      setEvents(ev)
    } finally { setLoading(false) }
  }, [rangeStartISO, rangeEndISO, loadCalendars])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    const h = () => { void refresh() }
    window.addEventListener('thw:sessions-changed', h)
    window.addEventListener('thw:agenda-changed', h)
    return () => { window.removeEventListener('thw:sessions-changed', h); window.removeEventListener('thw:agenda-changed', h) }
  }, [refresh])

  const toggleCalendar = useCallback(async (id: string, visible: boolean) => {
    const { setCalendarVisible } = await import('@/lib/agenda/data')
    setCalendars(prev => prev.map(c => c.id === id ? { ...c, visible } : c))
    calsRef.current = calsRef.current.map(c => c.id === id ? { ...c, visible } : c)
    await setCalendarVisible(id, visible)
    void refresh()
  }, [refresh])

  return { calendars, events, loading, refresh, reloadCalendars: loadCalendars, toggleCalendar }
}
