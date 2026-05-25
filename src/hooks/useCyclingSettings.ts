'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface CyclingSettings {
  navigation: { followPosition: boolean; autoRecenter: boolean; defaultMapType: 'std'|'sat'|'hyb'; climbDetection: boolean; climbThreshold: number }
  alerts: { gpsLost: boolean; hrZone: boolean; hrMaxThreshold: number; powerHighThreshold: number; powerLowThreshold: number; hydrationInterval: number; nutritionInterval: number; vibration: boolean; sound: boolean }
  display: { keepAwake: boolean; theme: 'auto'|'light'|'dark'; dataSize: 'small'|'normal'|'large' }
  athlete: { ftp: number; maxHr: number; restHr: number }
  recording: { gpsFrequency: number|'auto'; autoPause: boolean; autoPauseThreshold: number; autoLap: number }
  units: { distance: 'metric'|'imperial'; altitude: 'm'|'ft'; temperature: 'c'|'f'; weight: 'kg'|'lbs' }
  postRide: { autoStrava: boolean; showSummary: boolean }
}

export const DEFAULT_CYCLING_SETTINGS: CyclingSettings = {
  navigation: { followPosition: true, autoRecenter: true, defaultMapType: 'std', climbDetection: true, climbThreshold: 50 },
  alerts: { gpsLost: true, hrZone: false, hrMaxThreshold: 185, powerHighThreshold: 300, powerLowThreshold: 100, hydrationInterval: 30, nutritionInterval: 45, vibration: true, sound: false },
  display: { keepAwake: true, theme: 'auto', dataSize: 'normal' },
  athlete: { ftp: 200, maxHr: 185, restHr: 55 },
  recording: { gpsFrequency: 1, autoPause: true, autoPauseThreshold: 5, autoLap: 0 },
  units: { distance: 'metric', altitude: 'm', temperature: 'c', weight: 'kg' },
  postRide: { autoStrava: false, showSummary: true },
}

function setNested<T extends object>(obj: T, path: string, value: unknown): T {
  const [head, ...rest] = path.split('.')
  if (rest.length === 0) return { ...obj, [head]: value }
  return { ...obj, [head]: setNested((obj as Record<string, unknown>)[head] as object, rest.join('.'), value) }
}

export function useCyclingSettings() {
  const [settings, setSettings] = useState<CyclingSettings>(DEFAULT_CYCLING_SETTINGS)
  const [loading, setLoading] = useState(true)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settingsRef = useRef(settings)
  useEffect(() => { settingsRef.current = settings }, [settings])

  useEffect(() => {
    void (async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const { data } = await sb.from('cycling_settings').select('settings').eq('user_id', user.id).maybeSingle()
        if (data?.settings) {
          setSettings(data.settings as CyclingSettings)
        } else {
          await sb.from('cycling_settings').upsert({ user_id: user.id, settings: DEFAULT_CYCLING_SETTINGS }, { onConflict: 'user_id' })
        }
      } catch { /* table absente — fallback */ }
      finally { setLoading(false) }
    })()
  }, [])

  const updateSetting = useCallback((path: string, value: unknown) => {
    setSettings(prev => {
      const next = setNested(prev, path, value)
      settingsRef.current = next
      return next
    })
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        await sb.from('cycling_settings').upsert({ user_id: user.id, settings: settingsRef.current }, { onConflict: 'user_id' })
      } catch (e) { console.error('[useCyclingSettings]', e) }
    }, 500)
  }, [])

  return { settings, updateSetting, loading }
}
