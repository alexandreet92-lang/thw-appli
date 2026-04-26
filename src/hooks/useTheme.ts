'use client'

import { useEffect, useState, useCallback } from 'react'

type ThemeMode = 'light' | 'dark'

const NIGHT_START = 20
const NIGHT_END   = 7

function getAutoMode(): ThemeMode {
  return 'dark'
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
    const saved = localStorage.getItem('thw-theme') as ThemeMode | null
    const initial = saved ?? getAutoMode()
    setMode(initial)
    applyTheme(initial)
    if (saved) setIsManual(true)
  }, [])

  useEffect(() => {
    if (isManual) return
    const interval = setInterval(() => {
      const auto = getAutoMode()
      if (auto !== mode) {
        setMode(auto)
        applyTheme(auto)
      }
    }, 60_000)
    return () => clearInterval(interval)
  }, [mode, isManual])

  const toggleTheme = useCallback(() => {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark'
    setMode(next)
    setIsManual(true)
    applyTheme(next)
    localStorage.setItem('thw-theme', next)
    setTimeout(() => {
      setIsManual(false)
      localStorage.removeItem('thw-theme')
    }, 4 * 60 * 60 * 1000)
  }, [mode])

  return {
    mode,
    toggleTheme,
    label: mode === 'dark' ? 'Mode Nuit' : 'Mode Jour'
  }
}
