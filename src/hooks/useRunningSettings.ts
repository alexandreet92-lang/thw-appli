'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DataFont } from '@/types/cycling'

export interface RunningSettings {
  display:    { keepAwake: boolean; theme: 'auto'|'light'|'dark'; dataSize: 'small'|'normal'|'large'; dataFont: DataFont; paceUnit: 'min/km'|'min/mile' }
  alerts:     { gpsLost: boolean; hrZone: boolean; hrMaxThreshold: number; hydrationInterval: number; nutritionInterval: number; vibration: boolean; sound: boolean }
  athlete:    { vma: number; maxHr: number; restHr: number; pace5k: string; pace10k: string; paceHalf: string; paceMarathon: string }
  recording:  { gpsFrequency: number|'auto'; autoPause: boolean; autoPauseThreshold: number; autoLap: number }
  units:      { distance: 'metric'|'imperial'; altitude: 'm'|'ft' }
  postRun:    { autoStrava: boolean; showSummary: boolean }
  navigation: { followPosition: boolean; autoRecenter: boolean; defaultMapType: 'std'|'sat'|'hyb'; climbDetection: boolean; climbThreshold: number }
}

export const DEFAULT_RUNNING_SETTINGS: RunningSettings = {
  display:    { keepAwake: true, theme: 'auto', dataSize: 'normal', dataFont: 'system', paceUnit: 'min/km' },
  alerts:     { gpsLost: true, hrZone: false, hrMaxThreshold: 185, hydrationInterval: 0, nutritionInterval: 0, vibration: true, sound: false },
  athlete:    { vma: 16, maxHr: 185, restHr: 55, pace5k: '4:30', pace10k: '4:45', paceHalf: '5:00', paceMarathon: '5:15' },
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

export function useRunningSettings(onSaved?: () => void) {
  const supabase = createClient()
  const [settings, setSettings] = useState<RunningSettings>(DEFAULT_RUNNING_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestRef = useRef<RunningSettings>(DEFAULT_RUNNING_SETTINGS)
  const onSavedRef = useRef(onSaved)
  useEffect(() => { onSavedRef.current = onSaved }, [onSaved])

  useEffect(() => {
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('running_settings').select('settings').eq('user_id', user.id).maybeSingle()
        if (data?.settings) {
          const merged = { ...DEFAULT_RUNNING_SETTINGS, ...(data.settings as Partial<RunningSettings>) } as RunningSettings
          setSettings(merged); latestRef.current = merged
        } else {
          await supabase.from('running_settings').upsert(
            { user_id: user.id, settings: DEFAULT_RUNNING_SETTINGS },
            { onConflict: 'user_id' }
          )
        }
      } catch { /* table absent — fallback */ }
      finally { setLoaded(true) }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const persistSettings = useCallback(async (next: RunningSettings) => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('running_settings').upsert(
        { user_id: user.id, settings: next, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      if (!error) onSavedRef.current?.()
    } catch (e) { console.error('[useRunningSettings]', e) }
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
