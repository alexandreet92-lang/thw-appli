'use client'
// Enregistrement de la séance terminée : état de sauvegarde + appel saveRide
// (insertion `activities` avec streams 1 Hz + SM/SN). Les échantillons vivent
// dans le moteur ; ce hook ne fait que persister à la demande.
import { useCallback, useState } from 'react'
import { saveRide, type SaveRideParams } from './saveRide'

export function useRideRecorder() {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = useCallback(async (p: SaveRideParams) => {
    setSaving(true); setError(null)
    try { await saveRide(p); setSaved(true) }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur de sauvegarde') }
    finally { setSaving(false) }
  }, [])

  return { saving, saved, error, save }
}
