'use client'
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'

interface Props { onDone: () => void }

export function SplashScreen({ onDone }: Props) {
  const { t } = useI18n()
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 800)
    const t2 = setTimeout(() => setPhase(2), 1600)
    const t3 = setTimeout(() => setPhase(3), 2300)
    const t4 = setTimeout(() => onDone(), 2500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [onDone])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      animation: phase === 3 ? 'splash-out 200ms ease-in forwards' : undefined,
    }}>
      <style>{`
        @keyframes bg-rotate { from { filter: hue-rotate(0deg); } to { filter: hue-rotate(30deg); } }
        @keyframes logo-spin-in { from { transform: scale(0) rotate(-180deg); opacity: 0; } to { transform: scale(1) rotate(0deg); opacity: 1; } }
        @keyframes logo-rise { from { transform: translateY(0); } to { transform: translateY(-32px); } }
        @keyframes name-appear { from { transform: translateY(10px); opacity: 0; letter-spacing: 8px; } to { transform: translateY(0); opacity: 1; letter-spacing: -1px; } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes splash-out { from { opacity: 1; } to { opacity: 0; } }
      `}</style>

      {/* Fond animé */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'conic-gradient(from 0deg at 50% 50%, #060614, #0A1628, #060614)',
        animation: 'bg-rotate 8s linear infinite',
      }} />

      {/* Contenu centré */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img
          src="/logos/logo_4bras.png"
          alt="Hybrid"
          style={{
            width: 80, height: 80,
            animation: phase === 0
              ? 'logo-spin-in 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards'
              : 'logo-spin-in 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards, logo-rise 0.6s cubic-bezier(0.16,1,0.3,1) forwards',
          }}
        />

        {phase >= 1 && (
          <h1 style={{
            fontSize: 42, fontWeight: 900, margin: 0,
            letterSpacing: '-1px',
            fontFamily: 'Syne, sans-serif',
            background: 'linear-gradient(135deg, #fff 30%, rgba(6,182,212,0.8))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'name-appear 0.5s 0.4s cubic-bezier(0.16,1,0.3,1) both',
          }}>
            Hybrid
          </h1>
        )}

        {phase >= 2 && (
          <p style={{
            fontSize: 12, color: 'rgba(255,255,255,0.4)',
            letterSpacing: 3, textTransform: 'uppercase',
            margin: '12px 0 0',
            fontFamily: 'DM Sans, sans-serif',
            animation: 'fade-in 0.4s both',
          }}>
            {t('auth.tagline')}
          </p>
        )}
      </div>
    </div>
  )
}
