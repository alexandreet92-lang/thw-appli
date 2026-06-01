'use client'

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 37 + 11) % 100,
  y: (i * 53 + 7) % 100,
  r: 2 + (i % 4),
  delay: (i * 0.3) % 3,
  dur: 3 + (i % 3),
  op: 0.08 + (i % 3) * 0.07,
}))

export default function WelcomeSlide() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '0 32px', textAlign: 'center', position: 'relative' }}>
      <style>{`
        @keyframes logo-appear {
          from { transform: scale(0) rotate(-180deg); opacity: 0; }
          to   { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes logo-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes ob-float {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }
      `}</style>

      {/* Particules */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {PARTICLES.map((p, i) => (
          <circle
            key={i}
            cx={`${p.x}%`} cy={`${p.y}%`} r={p.r}
            fill="#06B6D4" opacity={p.op}
            style={{ animation: `ob-float ${p.dur}s ${p.delay}s ease-in-out infinite` }}
          />
        ))}
      </svg>

      {/* Logo */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <img
          src="/logos/logo_4bras.png"
          alt="THW"
          style={{
            width: 100, height: 100,
            animation: 'logo-appear 1s cubic-bezier(0.34,1.56,0.64,1) forwards, logo-spin 8s linear 1.1s infinite',
          }}
        />
      </div>

      <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', margin: '32px 0 16px', letterSpacing: '-0.5px', fontFamily: 'Syne, sans-serif', position: 'relative', zIndex: 1 }}>
        THW Coaching
      </h1>
      <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.62)', lineHeight: 1.65, margin: 0, fontFamily: 'DM Sans, sans-serif', position: 'relative', zIndex: 1 }}>
        Ton compagnon d'entraînement intelligent.<br />Enregistre, analyse, progresse.
      </p>
    </div>
  )
}
