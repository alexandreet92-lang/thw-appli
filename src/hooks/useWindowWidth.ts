'use client'
import { useEffect, useState } from 'react'

// Largeur de fenêtre réactive (détection mobile/desktop). SSR-safe (1024 par défaut).
export function useWindowWidth(): number {
  const [w, setW] = useState<number>(() => (typeof window !== 'undefined' ? window.innerWidth : 1024))
  useEffect(() => {
    const f = () => setW(window.innerWidth)
    f()
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [])
  return w
}
