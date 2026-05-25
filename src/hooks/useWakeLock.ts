'use client'
import { useEffect, useRef } from 'react'

export function useWakeLock(active: boolean): void {
  const lockRef = useRef<WakeLockSentinel | null>(null)

  const acquire = async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return
    try {
      lockRef.current = await navigator.wakeLock.request('screen')
    } catch {
      // silently ignore — wake lock not critical
    }
  }

  const release = async () => {
    if (lockRef.current) {
      try { await lockRef.current.release() } catch { /* ignore */ }
      lockRef.current = null
    }
  }

  useEffect(() => {
    if (!active) { release(); return }
    acquire()

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && active) acquire()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      release()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
}
