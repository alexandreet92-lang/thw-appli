'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DataFont } from '@/types/cycling'

export interface TrailSettings {
  display:    { keepAwake: boolean; theme: 'auto'|'light'|'dark'; dataSize: 'small'|'normal'|'large'; dataFont: DataFont; paceUnit: 'min/km'|'min/mile' }
  alerts:     { gpsLost: boolean; hrZone: boolean; hrMaxThreshold: number; hydrationInterval: number; nutritionInterval: number; vibration: boolean; sound: boolean; steepSlopeThreshold: number }
  athlete:    { vma: number; maxHr: number; restHr: number; pace5k: string; pace10k: string; paceHalf: string; paceMarathon: string; utmbIndex: number; ascentSpeedMh: number }
  recording:  { gpsFrequency: number|'auto'; autoPause: boolean; autoPauseThreshold: number; autoLap: number }
  units:      { distance: 'metric'|'imperial'; altitude: 'm'|'ft' }
  postRun:    { autoStrava: boolean; showSummary: boolean }
  navigation: { followPosition: boolean; autoRecenter: boolean; defaultMapType: 'std'|'sat'|'hyb'; climbDetection: boolean; climbThreshold: number }
}

export const DEFAULT_TRAIL_SETTINGS: TrailSettings = {
  display:    { keepAwake: true, theme: 'auto', dataSize: 'normal', dataFont: 'system', paceUnit: 'min/km' },
  alerts:     { gpsLost: true, hrZone: false, hrMaxThreshold: 185, hydrationInterval: 0, nutritionInterval: 0, vibration: true, sound: false, steepSlopeThreshold: 0 },
  athlete:    { vma: 16, maxHr: 185, restHr: 55, pace5k: '4:30', pace10k: '4:45', paceHalf: '5:00', paceMarathon: '5:15', utmbIndex: 0, ascentSpeedMh: 500 },
  recording:  { gpsFrequency: 1, autoPause: true, autoPauseThreshold: 0.5, autoLap: 0 },
  units:      { distance: 'metric', altitude: 'm' },
  postRun:    { autoStrava: false, showSummary: true },
  navigation: { followPosition: true, autoRecenter: true, defaultMapType: 'std', climbDetection: true, climbThreshold: 50 },
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

// La table `trail_settings` n'existe pas dans le schéma Supabase (seule
// `running_settings` a été créée). Chaque upsert vers elle échouait et le
// client instrumenté affichait « Échec de l'enregistrement » à l'ouverture.
// Les réglages trail sont donc persistés dans `sport_page_configs` (table
// existante, RLS user_id, UNIQUE (user_id, sport)) sous une clé sport
// réservée — aucun hook de pages n'utilise cette clé.
const SETTINGS_SPORT_KEY = 'trail_settings'

export function useTrailSettings(onSaved?: () => void) {
  const supabase = createClient()
  const [settings, setSettings] = useState<TrailSettings>(DEFAULT_TRAIL_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestRef = useRef<TrailSettings>(DEFAULT_TRAIL_SETTINGS)
  const onSavedRef = useRef(onSaved)
  useEffect(() => { onSavedRef.current = onSaved }, [onSaved])

  useEffect(() => {
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('sport_page_configs').select('pages')
          .eq('user_id', user.id).eq('sport', SETTINGS_SPORT_KEY).maybeSingle()
        if (data?.pages) {
          const merged = { ...DEFAULT_TRAIL_SETTINGS, ...(data.pages as Partial<TrailSettings>) } as TrailSettings
          setSettings(merged); latestRef.current = merged
        }
        // Pas de ligne → défauts en mémoire. Aucune écriture au montage :
        // on ne persiste qu'au premier changement utilisateur.
      } catch { /* pas de session — fallback défauts */ }
      finally { setLoaded(true) }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const persistSettings = useCallback(async (next: TrailSettings) => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('sport_page_configs').upsert(
        { user_id: user.id, sport: SETTINGS_SPORT_KEY, pages: next },
        { onConflict: 'user_id,sport' }
      )
      if (!error) onSavedRef.current?.()
    } catch (e) { console.error('[useTrailSettings]', e) }
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
