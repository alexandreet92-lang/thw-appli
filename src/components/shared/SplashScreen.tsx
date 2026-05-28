'use client'
import { useEffect, useState } from 'react'

type Phase = 'logo-in' | 'logo-spin' | 'logo-out' | 'text-in' | 'text-stable' | 'done'

export default function SplashScreen() {
  const [visible, setVisible] = useState(false)
  const [fadingOut, setFadingOut] = useState(false)
  const [phase, setPhase] = useState<Phase>('logo-in')

  useEffect(() => {
    const shown = sessionStorage.getItem('splash_shown')
    if (shown) return
    setVisible(true)

    const t1 = setTimeout(() => setPhase('logo-spin'),    800)
    const t2 = setTimeout(() => setPhase('logo-out'),    1200)
    const t3 = setTimeout(() => setPhase('text-in'),     1500)
    const t4 = setTimeout(() => setPhase('text-stable'), 2200)
    const t5 = setTimeout(() => setFadingOut(true),      3200)
    const t6 = setTimeout(() => {
      sessionStorage.setItem('splash_shown', '1')
      setVisible(false)
    }, 3600)

    return () => [t1, t2, t3, t4, t5, t6].forEach(clearTimeout)
  }, [])

  if (!visible) return null

  const letters = ['H', 'y', 'b', 'r', 'i', 'd']
  const showLogo = phase === 'logo-in' || phase === 'logo-spin' || phase === 'logo-out'
  const showText = phase === 'text-in' || phase === 'text-stable'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #060614 0%, #0A0F1E 50%, #050B1A 100%)',
        overflow: 'hidden',
        opacity: fadingOut ? 0 : 1,
        transition: 'opacity 400ms ease',
      }}
    >
      {/* Halo centré */}
      <div
        style={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)',
          transition: 'opacity 600ms',
          opacity: phase === 'text-stable' ? 0.6 : 0.3,
        }}
      />

      {/* LOGO */}
      {showLogo && (
        <img
          src="/logo-4bras.png"
          alt=""
          style={{
            width: 72,
            height: 72,
            position: 'absolute',
            animation:
              phase === 'logo-in'
                ? 'logo-arrive 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards'
                : phase === 'logo-spin'
                ? 'logo-accelerate 0.4s ease-in forwards'
                : 'logo-implode 0.35s cubic-bezier(0.4,0,1,1) forwards',
          }}
        />
      )}

      {/* TEXTE "Hybrid" */}
      {showText && (
        <div style={{ display: 'flex', alignItems: 'center', position: 'absolute' }}>
          {letters.map((letter, i) => (
            <span
              key={i}
              style={{
                fontSize: 52,
                fontWeight: 900,
                letterSpacing: '-1px',
                display: 'inline-block',
                background: 'linear-gradient(135deg, #ffffff 30%, rgba(6,182,212,0.9) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation:
                  phase === 'text-in'
                    ? `letter-explode 0.5s ${i * 0.06}s cubic-bezier(0.34,1.56,0.64,1) both`
                    : `letter-glow 2s ${i * 0.04}s ease-in-out infinite`,
              }}
            >
              {letter}
            </span>
          ))}
        </div>
      )}

      {/* Tagline */}
      {phase === 'text-stable' && (
        <p
          style={{
            position: 'absolute',
            top: 'calc(50% + 44px)',
            fontSize: 11,
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: 4,
            textTransform: 'uppercase',
            margin: 0,
            animation: 'fade-in 0.6s 0.3s both',
          }}
        >
          by The Hybrid Way
        </p>
      )}
    </div>
  )
}
