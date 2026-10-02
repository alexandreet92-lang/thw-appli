'use client'
// ══════════════════════════════════════════════════════════════════
// CountUp — gros chiffre KPI qui « compte » jusqu'à sa valeur, UNE seule fois
// au montage (ease-out expo, ~0,9 s), puis suit la valeur sans animation.
// Chiffres Inter tabulaires (largeur stable pendant le comptage).
// Mobile uniquement (desktop : valeur finale immédiate, inchangé) ;
// prefers-reduced-motion → valeur finale immédiate. Aucune lib.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion, isMobileViewport } from '@/components/ui/motion'

interface Props {
  value: number
  /** Mise en forme (ex. durée « 1 h 05 », signe « +12 »). Défaut : arrondi. */
  format?: (n: number) => string
  /** Durée en ms (défaut 900). */
  duration?: number
  /** Valeur de départ (défaut 0). */
  from?: number
  className?: string
  style?: React.CSSProperties
}

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))

export function CountUp({ value, format = n => String(Math.round(n)), duration = 900, from = 0, className, style }: Props) {
  // Desktop / mouvement réduit : la valeur finale dès le 1er rendu (aucun flash de 0).
  const [shown, setShown] = useState<number>(() =>
    typeof window !== 'undefined' && (!isMobileViewport() || prefersReducedMotion()) ? value : from)
  const played = useRef(false)
  const raf = useRef(0)

  useEffect(() => {
    if (!Number.isFinite(value)) { setShown(value); return }
    // Après la 1re animation : la valeur suit sans recompter.
    if (played.current || prefersReducedMotion() || !isMobileViewport() || value === from) { played.current = true; setShown(value); return }
    played.current = true
    let started = false
    const t0 = performance.now()
    const tick = (now: number) => {
      started = true
      const p = Math.min(1, (now - t0) / duration)
      setShown(from + (value - from) * easeOutExpo(p))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf.current)
      // Démontage/remontage immédiat (StrictMode) avant la 1re frame : on rejoue.
      if (!started) played.current = false
    }
  }, [value, from, duration])

  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'zero' 0", ...style }}>
      {format(shown)}
    </span>
  )
}

export default CountUp
