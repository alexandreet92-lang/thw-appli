'use client'

// ══════════════════════════════════════════════════════════════════
// ShurikenAnimated — logo THW (4 branches) animé, SVG inline (pas de
// dépendance PNG). Rotation douce + halo cyan pulsant. Respecte
// prefers-reduced-motion. 60fps (transform/opacity uniquement).
// NB : branche recréée en vectoriel d'après le logo ; remplaçable par
// l'asset officiel si fourni dans /public.
// ══════════════════════════════════════════════════════════════════

export function ShurikenAnimated() {
  return (
    <div className="shuriken-container" aria-hidden>
      <style>{`
        .shuriken-container { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 320px; height: 320px; z-index: 2; filter: drop-shadow(0 10px 24px rgba(6,182,212,0.30)); }
        .shuriken-halo { position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(circle, rgba(6,182,212,0.25) 0%, rgba(6,182,212,0) 70%); animation: halo-pulse 6.5s ease-in-out infinite; }
        .shuriken-svg { position: absolute; inset: 0; width: 100%; height: 100%; animation: shuriken-rotate 6.5s cubic-bezier(0.45,0,0.2,1) infinite; transform-origin: 50% 50%; }
        @keyframes halo-pulse { 0%,100% { transform: scale(0.8); opacity: 0.5; } 40%,85% { transform: scale(1.08); opacity: 1; } }
        @keyframes shuriken-rotate { 0% { transform: rotate(0deg); } 45% { transform: rotate(360deg); } 60% { transform: rotate(360deg); } 100% { transform: rotate(720deg); } }
        @media (max-width: 768px) { .shuriken-container { width: 200px; height: 200px; } }
        @media (prefers-reduced-motion: reduce) { .shuriken-svg, .shuriken-halo { animation: none; } }
      `}</style>
      <div className="shuriken-halo" />
      <svg className="shuriken-svg" viewBox="0 0 200 200" fill="none">
        <defs>
          <linearGradient id="shuriken-grad" x1="100" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0e7490" />
          </linearGradient>
        </defs>
        {[0, 90, 180, 270].map(deg => (
          <path
            key={deg}
            transform={`rotate(${deg} 100 100)`}
            d="M100 100 C 96 70, 100 44, 108 24 C 116 46, 120 72, 112 96 C 108 100, 104 101, 100 100 Z"
            fill="url(#shuriken-grad)"
          />
        ))}
        <circle cx="100" cy="100" r="6" fill="#0e7490" />
      </svg>
    </div>
  )
}
