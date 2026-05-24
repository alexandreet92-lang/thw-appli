'use client'
import { useState, useEffect } from 'react'

export function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    : `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

/** Incrément 1s/s tant que isRunning=true. */
export function useStopwatch(isRunning: boolean) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(interval)
  }, [isRunning])
  const reset = () => setSeconds(0)
  return { seconds, formatted: formatSeconds(seconds), reset }
}
