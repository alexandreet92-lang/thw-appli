'use client'
import { useState, useEffect } from 'react'

export const FINAL_META = {
  badge: null,
  title: 'onboarding.g.final.title',
  description: 'onboarding.g.final.desc',
  keyPoints: null,
}

const ICONS = [
  { src: '/logos/logo_3bras.png', angle: 0 },
  { src: '/logos/logo_4bras.png', angle: 90 },
  { src: '/logos/logo_6bras.png', angle: 180 },
  { src: '/logos/logo_app.png',   angle: 270 },
]

export function FinalVisual() {
  const [ready, setReady] = useState(false)

  useEffect(() => { const t = setTimeout(() => setReady(true), 300); return () => clearTimeout(t) }, [])

  return (
    <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto' }}>
      <style>{`
        @keyframes go-orbit-icon { from { opacity: 0; transform: rotate(var(--a)) translateX(0px) translateY(-50%); } to { opacity: 1; transform: rotate(var(--a)) translateX(75px) translateY(-50%); } }
        @keyframes go-logo-pulse { 0%,100% { transform: translate(-50%,-50%) scale(1); } 50% { transform: translate(-50%,-50%) scale(1.1); } }
        @keyframes go-pulse-glow { 0%,100% { box-shadow: 0 8px 32px rgba(139,92,246,0.4); } 50% { box-shadow: 0 8px 48px rgba(139,92,246,0.7); } }
      `}</style>

      {/* Halo */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)' }} />

      {/* Logo central */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        animation: 'go-logo-pulse 2s 0.6s ease-in-out infinite',
        textAlign: 'center',
      }}>
        <img src="/logos/logo_4bras.png" alt="Hybrid" style={{ width: 56, height: 56, display: 'block', margin: '0 auto' }} />
        <p style={{ fontSize: 18, fontWeight: 900, color: 'white', margin: '6px 0 0', letterSpacing: '-0.5px', fontFamily: 'Syne, sans-serif', whiteSpace: 'nowrap' }}>
          Hybrid
        </p>
      </div>

      {/* Icônes orbitantes */}
      {ready && ICONS.map((icon, i) => (
        <div key={i} style={{
          position: 'absolute', top: '50%', left: '50%',
          ['--a' as string]: `${icon.angle}deg`,
          animation: `go-orbit-icon 0.5s ${i * 0.1}s cubic-bezier(0.34,1.56,0.64,1) forwards`,
          opacity: 0,
        }}>
          <img src={icon.src} alt="" style={{ width: 28, height: 28, display: 'block', transform: 'translateY(-50%)' }} />
        </div>
      ))}
    </div>
  )
}
