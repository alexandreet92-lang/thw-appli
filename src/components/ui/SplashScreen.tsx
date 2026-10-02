'use client'
import { useEffect, useState } from 'react'

interface SplashScreenProps {
  onDone: () => void
}

// Écran de démarrage (cold open) — court et calme : halo cyan fixe, logo qui
// se pose (échelle + fondu), wordmark « Hybrid » en Fraunces puis la ligne de
// marque, et fondu de sortie. Tous les éléments sont rendus dès le départ
// (seules opacité / transform s'animent) → aucun saut de mise en page.
// Fond = --surface-page, identique à l'écran d'entrée qui apparaît dessous.
// `data-splash-screen="out"` signale le début du fondu : l'écran d'entrée
// lance alors sa propre animation (pas sous le splash).
// prefers-reduced-motion : version statique, plus brève.
export function SplashScreen({ onDone }: SplashScreenProps) {
  const [out, setOut] = useState(false)

  useEffect(() => {
    const reduce = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const holdT = reduce ? 450 : 1150
    const timers = [
      setTimeout(() => setOut(true), holdT),
      setTimeout(() => onDone(), holdT + 340),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onDone])

  return (
    <div
      data-splash-screen={out ? 'out' : ''}
      aria-hidden
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'var(--surface-page, var(--bg))',
        opacity: out ? 0 : 1,
        transition: 'opacity 320ms ease-out',
        pointerEvents: out ? 'none' : 'auto',
      }}
    >
      <style>{`
        @keyframes splashLogoIn { from { opacity: 0; transform: scale(0.72) } to { opacity: 1; transform: scale(1) } }
        @keyframes splashRise { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
        .splash-logo { animation: splashLogoIn 0.6s cubic-bezier(0.16,1,0.3,1) both }
        .splash-word { animation: splashRise 0.5s cubic-bezier(0.22,1,0.36,1) 0.18s both }
        .splash-tag  { animation: splashRise 0.5s cubic-bezier(0.22,1,0.36,1) 0.32s both }
        @media (prefers-reduced-motion: reduce) {
          .splash-logo, .splash-word, .splash-tag { animation: none !important }
        }
      `}</style>

      {/* Fond réel = --surface-page (globals.css force --bg-card sur
          [data-splash-screen] ; cette couche garantit la continuité avec
          l'écran d'entrée qui apparaît dessous). */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'var(--surface-page)' }} />

      {/* Halo cyan, statique (aucune « respiration » qui distrait). */}
      <div aria-hidden style={{
        position: 'absolute', width: 420, height: 420, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, color-mix(in srgb, var(--primary) 20%, transparent), transparent 64%)',
      }} />

      <div className="splash-logo" style={{ position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/logo_4bras.png" alt="" width={76} height={76} style={{ width: 76, height: 76, display: 'block', objectFit: 'contain' }} />
      </div>

      <span className="splash-word" style={{
        position: 'relative', marginTop: 14, lineHeight: 1.05,
        fontFamily: 'var(--font-serif)', fontSize: 44, fontWeight: 500,
        letterSpacing: '-0.02em', color: 'var(--text)',
      }}>
        Hybrid
      </span>
      <span className="splash-tag" style={{
        position: 'relative', marginTop: 10,
        fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
        letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)',
      }}>
        by The Hybrid Way
      </span>
    </div>
  )
}
