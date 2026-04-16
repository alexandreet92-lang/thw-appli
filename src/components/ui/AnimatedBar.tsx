/**
 * Barre de progression animée — remplit de gauche à droite au mount.
 * Utilise transform: scaleX (GPU, pas de reflow).
 * Durée : 500ms ease-out cubic.
 */
export function AnimatedBar({
  pct,
  color,
  gradient,
  height = 5,
  className,
}: {
  pct: number
  color?: string
  gradient?: string       // ex: "linear-gradient(90deg,#00c8e0bb,#00c8e0)"
  height?: number
  className?: string
}) {
  const bg = gradient ?? color ?? '#00c8e0'

  return (
    <div
      className={className}
      style={{
        height,
        borderRadius: 999,
        overflow: 'hidden',
        background: 'var(--border)',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${Math.min(Math.max(pct, 0), 100)}%`,
          borderRadius: 999,
          background: bg,
          transformOrigin: 'left center',
          animation: 'barFill 0.50s cubic-bezier(0.4, 0, 0.2, 1) both',
        }}
      />
    </div>
  )
}

/**
 * Compteur animé — affiche `value` et anime de 0 → value au mount.
 * Wrap direct : <CountUp value={doneTSS} />
 */
import { useCountUp } from '@/hooks/useCountUp'

export function CountUp({ value, suffix }: { value: number; suffix?: string }) {
  const count = useCountUp(value)
  return <>{count}{suffix}</>
}
