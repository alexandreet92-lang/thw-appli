'use client'

import { useEffect, useState, useCallback } from 'react'
import { isDaytime } from '@/lib/theme/sun'
import { coordsFromTimezone, type Coords } from '@/lib/theme/timezoneCoords'

type ThemeMode = 'light' | 'dark'

const GEO_KEY = 'thw-geo'        // coordonnées précises mises en cache (si géoloc autorisée)
const MANUAL_KEY = 'thw-theme'   // surcharge manuelle temporaire
const AUTO_KEY = 'thw-auto-mode' // dernier mode auto calculé (anti-flash au boot)

function readCachedGeo(): Coords | null {
  try {
    const raw = localStorage.getItem(GEO_KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as Coords
    if (typeof c?.lat === 'number' && typeof c?.lon === 'number') return c
  } catch { /* ignore */ }
  return null
}

// Mode auto = clair le jour, sombre la nuit, selon le lever/coucher du soleil à
// la position de l'utilisateur (géoloc précise si dispo, sinon fuseau horaire).
function computeAutoMode(): ThemeMode {
  const c = readCachedGeo() ?? coordsFromTimezone()
  const mode: ThemeMode = isDaytime(c.lat, c.lon) ? 'light' : 'dark'
  try { localStorage.setItem(AUTO_KEY, mode) } catch { /* ignore */ }
  return mode
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(mode)
}

export function useTheme() {
  const [mode, setMode]         = useState<ThemeMode>('dark')
  const [isManual, setIsManual] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(MANUAL_KEY) as ThemeMode | null
    const initial = saved ?? computeAutoMode()
    setMode(initial)
    applyTheme(initial)
    if (saved) setIsManual(true)

    // Si la géoloc est DÉJÀ autorisée, on récupère la position exacte (sans prompt)
    // pour un lever/coucher précis, puis on recalcule.
    if (!saved && typeof navigator !== 'undefined' && navigator.permissions && navigator.geolocation) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then(res => {
        if (res.state !== 'granted') return
        navigator.geolocation.getCurrentPosition(
          pos => {
            try { localStorage.setItem(GEO_KEY, JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude })) } catch { /* ignore */ }
            const next = computeAutoMode()
            setMode(next); applyTheme(next)
          },
          () => { /* ignore */ },
          { maximumAge: 6 * 3600_000, timeout: 8000 },
        )
      }).catch(() => { /* ignore */ })
    }
  }, [])

  // Réévaluation périodique (le jour bascule en nuit pendant la session).
  useEffect(() => {
    if (isManual) return
    const interval = setInterval(() => {
      const auto = computeAutoMode()
      if (auto !== mode) { setMode(auto); applyTheme(auto) }
    }, 5 * 60_000)
    return () => clearInterval(interval)
  }, [mode, isManual])

  // Bascule manuelle : surcharge temporaire (revient en auto après 4 h).
  const toggleTheme = useCallback(() => {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark'
    setMode(next)
    setIsManual(true)
    applyTheme(next)
    localStorage.setItem(MANUAL_KEY, next)
    setTimeout(() => {
      setIsManual(false)
      localStorage.removeItem(MANUAL_KEY)
    }, 4 * 60 * 60 * 1000)
  }, [mode])

  return {
    mode,
    toggleTheme,
    label: mode === 'dark' ? 'Mode Nuit' : 'Mode Jour',
  }
}
