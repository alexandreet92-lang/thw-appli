'use client'
import { useEffect, useState } from 'react'

/**
 * true quand la fenêtre est « étroite » (mobile). SSR-safe : rend false au
 * premier paint serveur puis se corrige côté client.
 */
export function useNarrow(maxWidth = 720): boolean {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`)
    const on = () => setNarrow(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [maxWidth])
  return narrow
}
