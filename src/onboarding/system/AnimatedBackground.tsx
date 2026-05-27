'use client'
import { useMemo } from 'react'

export function AnimatedBackground() {
  const particles = useMemo(() =>
    Array.from({ length: 25 }, (_, i) => ({
      id: i,
      x: (i * 37.3 + 11) % 100,
      y: (i * 53.7 + 7) % 100,
      size: (i % 3) + 1,
      duration: (i % 15) + 10,
      delay: (i * 2.3) % 10,
      opacity: ((i % 6) * 0.05) + 0.05,
    })), []
  )

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', top: '20%', left: '30%',
        width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)',
        animation: 'pulse-slow 6s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: '30%', right: '20%',
        width: 250, height: 250, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.10) 0%, transparent 70%)',
        animation: 'pulse-slow 8s 2s ease-in-out infinite',
      }} />
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size,
          borderRadius: '50%',
          background: 'rgba(6,182,212,0.8)',
          opacity: p.opacity,
          animation: `float-particle ${p.duration}s ${p.delay}s ease-in-out infinite`,
        }} />
      ))}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(6,182,212,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(6,182,212,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />
    </div>
  )
}
