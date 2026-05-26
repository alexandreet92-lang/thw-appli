'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
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
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('ski_settings').select('settings').eq('user_id', user.id).maybeSingle()
        if (data?.settings) {
          const merged = { ...DEFAULT_SKI_SETTINGS, ...(data.settings as Partial<SkiSettings>) } as SkiSettings
          setSettings(merged); latestRef.current = merged
        } else {
          await supabase.from('ski_settings').upsert(
            { user_id: user.id, settings: DEFAULT_SKI_SETTINGS },
            { onConflict: 'user_id' }
          )
        }
      } catch { /* table absent — fallback */ }
      finally { setLoaded(true) }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const persistSettings = useCallback(async (next: SkiSettings) => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('ski_settings').upsert(
        { user_id: user.id, settings: next, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
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
