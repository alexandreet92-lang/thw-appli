import { useState, useEffect, useRef } from 'react'

/**
 * Anime un nombre de 0 à `target` en `duration` ms.
 * Easing : ease-out cubic pour un rendu naturel.
 * Si target change, repart de zéro.
 */
export function useCountUp(target: number, duration = 520): number {
  const [value, setValue] = useState(0)
  const startRef = useRef<number | null>(null)
  const rafRef   = useRef<number>(0)

  useEffect(() => {
    if (target === 0) { setValue(0); return }

    // Repart à chaque changement de target
    startRef.current = null
    cancelAnimationFrame(rafRef.current)

    function step(timestamp: number) {
      if (startRef.current === null) startRef.current = timestamp
      const elapsed  = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic : décélération naturelle
      const ease = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(ease * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return value
}
