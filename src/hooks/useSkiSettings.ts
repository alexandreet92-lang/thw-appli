'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import type { DataFont } from '@/types/cycling'

export interface SkiSettings {
  display:   { keepAwake: boolean; theme: 'auto'|'light'|'dark'; dataSize: 'small'|'normal'|'large'; dataFont: DataFont }
  alerts:    { gpsLost: boolean; vibration: boolean; sound: boolean; maxSpeedAlert: 0|80|100|120|140 }
  athlete:   { maxHr: number; restHr: number }
  recording: { gpsFrequency: number|'auto'; autoPause: boolean; autoPauseThreshold: number }
  units:     { distance: 'metric'|'imperial'; altitude: 'm'|'ft' }
  postRun:   { autoStrava: boolean; showSummary: boolean }
}

export const DEFAULT_SKI_SETTINGS: SkiSettings = {
  display:   { keepAwake: true, theme: 'auto', dataSize: 'normal', dataFont: 'system' },
  alerts:    { gpsLost: true, vibration: true, sound: false, maxSpeedAlert: 0 },
  athlete:   { maxHr: 185, restHr: 55 },
  recording: { gpsFrequency: 1, autoPause: true, autoPauseThreshold: 0.5 },
  units:     { distance: 'metric', altitude: 'm' },
  postRun:   { autoStrava: false, showSummary: true },
}

function deepSet<T>(obj: T, path: string, value: unknown): T {
  const result = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>
  const keys = path.split('.')
  let cur = result
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cur[keys[i]]) cur[keys[i]] = {}
    cur = cur[keys[i]] as Record<string, unknown>
  }
  cur[keys[keys.length - 1]] = value
  return result as T
}

// La table `ski_settings` n'existe pas dans le schéma Supabase (seule
// `running_settings` a été créée). Chaque upsert vers elle échouait et le
// client instrumenté affichait « Échec de l'enregistrement » à l'ouverture.
// Les réglages ski sont donc persistés dans `sport_page_configs` (table
// existante, RLS user_id, UNIQUE (user_id, sport)) sous une clé sport
// réservée — aucun hook de pages n'utilise cette clé.
const SETTINGS_SPORT_KEY = 'ski_settings'

export function useSkiSettings(onSaved?: () => void) {
  const supabase = createClient()
  const [settings, setSettings] = useState<SkiSettings>(DEFAULT_SKI_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestRef = useRef<SkiSettings>(DEFAULT_SKI_SETTINGS)
  const onSavedRef = useRef(onSaved)
  useEffect(() => { onSavedRef.current = onSaved }, [onSaved])

  useEffect(() => {
    void (async () => {
      try {
        const user = await getCurrentUser()
        if (!user) return
        const { data } = await supabase
          .from('sport_page_configs').select('pages')
          .eq('user_id', user.id).eq('sport', SETTINGS_SPORT_KEY).maybeSingle()
        if (data?.pages) {
          const merged = { ...DEFAULT_SKI_SETTINGS, ...(data.pages as Partial<SkiSettings>) } as SkiSettings
          setSettings(merged); latestRef.current = merged
        }
        // Pas de ligne → défauts en mémoire. Aucune écriture au montage :
        // on ne persiste qu'au premier changement utilisateur.
      } catch { /* pas de session — fallback défauts */ }
      finally { setLoaded(true) }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const persistSettings = useCallback(async (next: SkiSettings) => {
    setSaving(true)
    try {
      const user = await getCurrentUser()
      if (!user) return
      const { error } = await supabase.from('sport_page_configs').upsert(
        { user_id: user.id, sport: SETTINGS_SPORT_KEY, pages: next },
        { onConflict: 'user_id,sport' }
      )
      if (!error) onSavedRef.current?.()
    } catch (e) { console.error('[useSkiSettings]', e) }
    finally { setSaving(false) }
  }, [supabase])

  const updateSetting = useCallback((path: string, value: unknown) => {
    setSettings(prev => {
      const next = deepSet(prev, path, value)
      latestRef.current = next
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => { void persistSettings(latestRef.current) }, 500)
      return next
    })
  }, [persistSettings])

  return { settings, updateSetting, saving, loaded }
}
