'use client'
import { useEffect, useState } from 'react'

interface SplashScreenProps {
  onDone: () => void
}

// Splash de marque (cold open) : halo cyan qui respire, shuriken en arrivée
// ressort + rotation lente, wordmark « Hybrid » (Fraunces) + tagline, puis fondu.
// Respecte prefers-reduced-motion (version statique, fondu rapide). À la charte
// (tokens : var(--bg), var(--text), var(--primary)).
export function SplashScreen({ onDone }: SplashScreenProps) {
  const [out, setOut] = useState(false)

  useEffect(() => {
    const reduce = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const holdT = reduce ? 700 : 1900
    const timers = [
      setTimeout(() => setOut(true), holdT),
      setTimeout(() => onDone(), holdT + 420),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onDone])

  return (
    <div
      data-splash-screen=""
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)',
        opacity: out ? 0 : 1,
        transition: 'opacity 400ms ease-out',
      }}
    >
      <style>{`
        @keyframes splashHalo { 0%,100% { transform: scale(0.9); opacity: 0.5 } 50% { transform: scale(1.1); opacity: 0.9 } }
        @keyframes splashLogoIn { 0% { transform: scale(0.4) rotate(-120deg); opacity: 0 } 60% { transform: scale(1.08) rotate(8deg); opacity: 1 } 100% { transform: scale(1) rotate(0deg); opacity: 1 } }
        @keyframes splashSpin { to { transform: rotate(360deg) } }
        @keyframes splashRise { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
        .splash-halo { animation: splashHalo 2.4s ease-in-out infinite }
        .splash-logo { animation: splashLogoIn 0.7s cubic-bezier(0.16,1,0.3,1) both }
        .splash-logo-spin { animation: splashSpin 9s linear infinite }
        .splash-word { animation: splashRise 0.6s ease-out 0.65s both }
        .splash-tag { animation: splashRise 0.6s ease-out 0.9s both }
        @media (prefers-reduced-motion: reduce) {
          .splash-halo, .splash-logo, .splash-logo-spin, .splash-word, .splash-tag { animation: none !important; opacity: 1 !important; transform: none !important }
        }
      `}</style>

      {/* Halo cyan qui respire */}
      <div className="splash-halo" aria-hidden style={{
        position: 'absolute', width: 360, height: 360, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.22), transparent 62%)',
        filter: 'blur(8px)', pointerEvents: 'none',
      }} />

      {/* Shuriken : arrivée ressort + rotation lente continue */}
      <div className="splash-logo" style={{ position: 'relative' }}>
        <div className="splash-logo-spin">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/logo_4bras.png" alt="" width={84} height={84} style={{ width: 84, height: 84, display: 'block', objectFit: 'contain' }} />
        </div>
      </div>

      {/* Wordmark + tagline */}
      <span className="splash-word" style={{
        position: 'relative', marginTop: 22,
        fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600,
        letterSpacing: '-0.02em', color: 'var(--text)',
      }}>
        Hybrid
      </span>
      <span className="splash-tag" style={{
        position: 'relative', marginTop: 8,
        fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500,
        letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-dim)',
      }}>
        by The Hybrid Way
      </span>
    </div>
  )
}
