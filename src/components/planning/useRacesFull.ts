'use client'
// Charge TOUTES les courses de l'utilisateur (planned_races) au format Race complet
// (mêmes champs que la page Calendar), pour les afficher sur la grille du planning,
// ouvrir la fiche détail et éditer via le même éditeur que Calendar. Se recharge sur
// l'event `thw:sessions-changed` (création/édition depuis n'importe quelle page).
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { mapRowToRace, saveRaceWithFiles, deleteRaceById } from '@/lib/races/raceStore'
import type { Race } from '@/app/calendar/components/types'

export function useRacesFull() {
  const [races, setRaces] = useState<Race[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await sb.from('planned_races').select('*').eq('user_id', user.id).order('date')
    setRaces((data ?? []).map(r => mapRowToRace(r as Record<string, unknown>)))
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const h = () => void load()
    window.addEventListener('thw:sessions-changed', h)
    return () => window.removeEventListener('thw:sessions-changed', h)
  }, [load])

  // Crée/édite une course (+ parcours) puis notifie toutes les pages.
  const save = useCallback(async (race: Omit<Race, 'id'>, files: File[] = [], filesBike: File[] = [], filesRun: File[] = [], existingId?: string) => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    await saveRaceWithFiles(sb, user.id, race, files, filesBike, filesRun, existingId)
    await load()
    window.dispatchEvent(new Event('thw:sessions-changed'))
  }, [load])

  const remove = useCallback(async (id: string) => {
    const sb = createClient()
    await deleteRaceById(sb, id)
    await load()
    window.dispatchEvent(new Event('thw:sessions-changed'))
  }, [load])

  return { races, loading, reload: load, save, remove }
}
