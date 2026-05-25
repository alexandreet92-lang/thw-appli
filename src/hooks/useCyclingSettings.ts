'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DataFont } from '@/types/cycling'

export interface CyclingSettings {
  navigation: { followPosition: boolean; autoRecenter: boolean; defaultMapType: 'std'|'sat'|'hyb'; climbDetection: boolean; climbThreshold: number }
  alerts: { gpsLost: boolean; hrZone: boolean; hrMaxThreshold: number; powerHighThreshold: number; powerLowThreshold: number; hydrationInterval: number; nutritionInterval: number; vibration: boolean; sound: boolean }
  display: { keepAwake: boolean; theme: 'auto'|'light'|'dark'; dataSize: 'small'|'normal'|'large'; dataFont: DataFont }
  athlete: { ftp: number; maxHr: number; restHr: number }
  recording: { gpsFrequency: number|'auto'; autoPause: boolean; autoPauseThreshold: number; autoLap: number }
  units: { distance: 'metric'|'imperial'; altitude: 'm'|'ft'; temperature: 'c'|'f'; weight: 'kg'|'lbs' }
  postRide: { autoStrava: boolean; showSummary: boolean }
}

export const DEFAULT_CYCLING_SETTINGS: CyclingSettings = {
  navigation: { followPosition: true, autoRecenter: true, defaultMapType: 'std', climbDetection: true, climbThreshold: 50 },
  alerts: { gpsLost: true, hrZone: false, hrMaxThreshold: 185, powerHighThreshold: 300, powerLowThreshold: 100, hydrationInterval: 30, nutritionInterval: 45, vibration: true, sound: false },
  display: { keepAwake: true, theme: 'auto', dataSize: 'normal', dataFont: 'system' },
  athlete: { ftp: 200, maxHr: 185, restHr: 55 },
  recording: { gpsFrequency: 1, autoPause: true, autoPauseThreshold: 5, autoLap: 0 },
  units: { distance: 'metric', altitude: 'm', temperature: 'c', weight: 'kg' },
  postRide: { autoStrava: false, showSummary: true },
}

function deepSet<T>(obj: T, path: string, value: unknown): T {
  const result = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>
  const keys = path.split('.')
  let current = result
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) current[keys[i]] = {}
    current = current[keys[i]] as Record<string, unknown>
  }
  current[keys[keys.length - 1]] = value
  return result as T
}

export function useCyclingSettings(onSaved?: () => void) {
  const supabase = createClient()
  const [settings, setSettings] = useState<CyclingSettings>(DEFAULT_CYCLING_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestRef = useRef<CyclingSettings>(DEFAULT_CYCLING_SETTINGS)
  const onSavedRef = useRef(onSaved)
  useEffect(() => { onSavedRef.current = onSaved }, [onSaved])

  useEffect(() => {
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('cycling_settings').select('settings').eq('user_id', user.id).maybeSingle()
        if (data?.settings) {
          const merged = { ...DEFAULT_CYCLING_SETTINGS, ...(data.settings as Partial<CyclingSettings>) } as CyclingSettings
          setSettings(merged)
          latestRef.current = merged
        } else {
          await supabase.from('cycling_settings').upsert(
            { user_id: user.id, settings: DEFAULT_CYCLING_SETTINGS },
            { onConflict: 'user_id' }
          )
        }
      } catch { /* table absent — fallback */ }
      finally { setLoaded(true) }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const persistSettings = useCallback(async (next: CyclingSettings) => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('cycling_settings').upsert(
        { user_id: user.id, settings: next, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      if (!error) onSavedRef.current?.()
    } catch (e) { console.error('[useCyclingSettings]', e) }
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
