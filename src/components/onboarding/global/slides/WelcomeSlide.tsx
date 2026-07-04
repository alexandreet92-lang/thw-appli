'use client'

export const WELCOME_META = {
  badge: 'onboarding.g.welcome.badge',
  title: 'onboarding.g.welcome.title',
  description: 'onboarding.g.welcome.desc',
  keyPoints: [
    'onboarding.g.welcome.kp1',
    'onboarding.g.welcome.kp2',
    'onboarding.g.welcome.kp3',
  ],
}

export function WelcomeVisual() {
  const angles = [0, 45, 90, 135, 180, 225, 270, 315]
  return (
    <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto' }}>
      <style>{`
        @keyframes go-orbit-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes go-logo-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        @keyframes go-spin-in { from { transform: scale(0) rotate(-180deg); opacity: 0; } to { transform: scale(1) rotate(0deg); opacity: 1; } }
      `}</style>

      {/* Halo */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
      }} />

      {/* Cercle orbital */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: '1px solid rgba(139,92,246,0.25)',
        animation: 'go-orbit-rotate 10s linear infinite',
      }}>
        {angles.map((angle, i) => (
          <div key={i} style={{
            position: 'absolute', width: 7, height: 7, borderRadius: '50%',
            background: i % 2 === 0 ? 'rgba(139,92,246,0.9)' : 'rgba(139,92,246,0.3)',
            top: '50%', left: '50%',
            transform: `rotate(${angle}deg) translateX(90px) translateY(-50%)`,
            boxShadow: i % 2 === 0 ? '0 0 8px rgba(139,92,246,0.7)' : 'none',
          }} />
        ))}
      </div>

      {/* Logo central */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
      }}>
        <img
          src="/logos/logo_4bras.png"
          alt="Hybrid"
          style={{ width: 72, height: 72, animation: 'go-spin-in 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards, go-logo-pulse 3s 0.8s ease-in-out infinite' }}
        />
      </div>
    </div>
  )
}
