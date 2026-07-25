'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DataFont } from '@/types/cycling'

export interface MTBSettings {
  navigation: { followPosition: boolean; autoRecenter: boolean; defaultMapType: 'std'|'sat'|'hyb'; climbDetection: boolean; climbThreshold: number }
  alerts:     { gpsLost: boolean; hrZone: boolean; hrMaxThreshold: number; powerHighThreshold: number; powerLowThreshold: number; hydrationInterval: number; nutritionInterval: number; vibration: boolean; sound: boolean; steepSlopeThreshold: number }
  display:    { keepAwake: boolean; theme: 'auto'|'light'|'dark'; dataSize: 'small'|'normal'|'large'; dataFont: DataFont }
  athlete:    { ftp: number; maxHr: number; restHr: number }
  recording:  { gpsFrequency: number|'auto'; autoPause: boolean; autoPauseThreshold: number; autoLap: number }
  units:      { distance: 'metric'|'imperial'; altitude: 'm'|'ft'; temperature: 'c'|'f'; weight: 'kg'|'lbs' }
  postRide:   { autoStrava: boolean; showSummary: boolean }
}

export const DEFAULT_MTB_SETTINGS: MTBSettings = {
  navigation: { followPosition: true, autoRecenter: true, defaultMapType: 'std', climbDetection: true, climbThreshold: 50 },
  alerts:     { gpsLost: true, hrZone: false, hrMaxThreshold: 185, powerHighThreshold: 300, powerLowThreshold: 100, hydrationInterval: 30, nutritionInterval: 45, vibration: true, sound: false, steepSlopeThreshold: 0 },
  display:    { keepAwake: true, theme: 'auto', dataSize: 'normal', dataFont: 'system' },
  athlete:    { ftp: 200, maxHr: 185, restHr: 55 },
  recording:  { gpsFrequency: 1, autoPause: true, autoPauseThreshold: 5, autoLap: 0 },
  units:      { distance: 'metric', altitude: 'm', temperature: 'c', weight: 'kg' },
  postRide:   { autoStrava: false, showSummary: true },
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

// La table `mtb_settings` n'existe pas dans le schéma Supabase (seule
// `running_settings` a été créée). Chaque upsert vers elle échouait et le
// client instrumenté affichait « Échec de l'enregistrement » à l'ouverture.
// Les réglages VTT sont donc persistés dans `sport_page_configs` (table
// existante, RLS user_id, UNIQUE (user_id, sport)) sous une clé sport
// réservée — aucun hook de pages n'utilise cette clé.
const SETTINGS_SPORT_KEY = 'mtb_settings'

export function useMTBSettings(onSaved?: () => void) {
  const supabase = createClient()
  const [settings, setSettings] = useState<MTBSettings>(DEFAULT_MTB_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestRef = useRef<MTBSettings>(DEFAULT_MTB_SETTINGS)
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
          const merged = { ...DEFAULT_MTB_SETTINGS, ...(data.pages as Partial<MTBSettings>) } as MTBSettings
          setSettings(merged); latestRef.current = merged
        }
        // Pas de ligne → défauts en mémoire. Aucune écriture au montage :
        // on ne persiste qu'au premier changement utilisateur.
      } catch { /* pas de session — fallback défauts */ }
      finally { setLoaded(true) }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const persistSettings = useCallback(async (next: MTBSettings) => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('sport_page_configs').upsert(
        { user_id: user.id, sport: SETTINGS_SPORT_KEY, pages: next },
        { onConflict: 'user_id,sport' }
      )
      if (!error) onSavedRef.current?.()
    } catch (e) { console.error('[useMTBSettings]', e) }
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
