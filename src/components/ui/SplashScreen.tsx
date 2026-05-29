'use client'
import { useEffect, useState } from 'react'

interface SplashScreenProps {
  onDone: () => void
}

export function SplashScreen({ onDone }: SplashScreenProps) {
  /*
    Phases de l'animation :
    'logo'    (0ms)    → logo apparaît et tourne
    'explode' (1200ms) → logo grossit et disparaît
    'title'   (1500ms) → texte "Hybrid" apparaît
    'fadeout' (2400ms) → tout disparaît
    → onDone() (2800ms)
  */
  const [phase, setPhase] = useState<
    'logo' | 'explode' | 'title' | 'fadeout'
  >('logo')

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('explode'),  1200),
      setTimeout(() => setPhase('title'),    1500),
      setTimeout(() => setPhase('fadeout'),  2400),
      setTimeout(() => onDone(),             2800),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onDone])

  return (
    <div
      data-splash-screen=""
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: phase === 'fadeout' ? 0 : 1,
        transition: phase === 'fadeout'
          ? 'opacity 400ms ease-out'
          : 'none',
      }}
    >
      {/* ── Logo shuriken ── */}
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition:
            'transform 350ms ease-out, opacity 300ms ease-out',
          transform:
            phase === 'explode' ||
            phase === 'title'   ||
            phase === 'fadeout'
              ? 'scale(5)'
              : 'scale(1)',
          opacity:
            phase === 'explode' ||
            phase === 'title'   ||
            phase === 'fadeout'
              ? 0
              : 1,
          animation:
            phase === 'logo'
              ? 'spinPause 3s ease-in-out infinite'
              : 'none',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logos/logo_4bras.png"
          alt=""
          width={72}
          height={72}
          style={{ width: 72, height: 72, display: 'block' }}
        />
      </div>

      {/* ── Texte "Hybrid" ── */}
      <div
        style={{
          position: 'absolute',
          transition: 'opacity 350ms ease-out, transform 350ms ease-out',
          opacity: phase === 'title' ? 1 : 0,
          transform: phase === 'title' ? 'scale(1)' : 'scale(0.7)',
        }}
      >
        <span
          data-splash-title=""
          style={{
            fontSize: 46,
            fontWeight: 700,
            letterSpacing: '-0.025em',
            fontFamily: 'inherit',
          }}
        >
          Hybrid
        </span>
      </div>
    </div>
  )
}
