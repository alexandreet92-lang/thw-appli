'use client'
import { useState, useEffect } from 'react'

function MockupPhone() {
  const [speed, setSpeed] = useState(28.4)
  const [hr, setHr] = useState(152)
  useEffect(() => {
    const i = setInterval(() => {
      setSpeed(s => +Math.max(15, Math.min(45, s + (Math.random() - 0.5) * 2)).toFixed(1))
      setHr(h => Math.round(Math.max(120, Math.min(190, h + (Math.random() - 0.5) * 4))))
    }, 2000)
    return () => clearInterval(i)
  }, [])
  return (
    <div style={{ width: 156, height: 272, border: '2.5px solid rgba(255,255,255,0.18)', borderRadius: 22, overflow: 'hidden', background: '#0A0A0A', margin: '0 auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
      <div style={{ padding: '14px 12px 8px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.38)', margin: '0 0 2px', letterSpacing: 1.2, fontFamily: 'DM Sans, sans-serif' }}>VITESSE</p>
        <p style={{ fontSize: 38, fontWeight: 700, color: '#fff', margin: 0, transition: 'all 0.6s ease', fontFamily: 'DM Mono, monospace', lineHeight: 1 }}>{speed}</p>
        <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.38)', margin: '2px 0 0', fontFamily: 'DM Sans, sans-serif' }}>km/h</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'rgba(255,255,255,0.06)', margin: '8px 0 0' }}>
        {[{ l: 'FC', v: hr, u: 'bpm' }, { l: 'D+', v: 245, u: 'm' }, { l: 'DIST.', v: '18.4', u: 'km' }, { l: 'DURÉE', v: '38:24', u: '' }].map((d, i) => (
          <div key={i} style={{ padding: '8px 4px', textAlign: 'center', background: '#131313' }}>
            <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.38)', margin: '0 0 2px', fontFamily: 'DM Sans, sans-serif' }}>{d.l}</p>
            <p style={{ fontSize: 19, fontWeight: 700, color: '#fff', margin: 0, fontFamily: 'DM Mono, monospace', transition: 'all 0.6s ease' }}>{d.v}</p>
            <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.38)', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>{d.u}</p>
          </div>
        ))}
      </div>
      <div style={{ margin: '10px 12px 0', height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: '62%', background: 'linear-gradient(90deg,#00c8e0,#2563EB)', borderRadius: 2 }} />
      </div>
    </div>
  )
}

const SPORT_ICONS = [
  { label: 'Vélo', color: '#3b82f6', path: 'M5 10a5 5 0 1 0 10 0 5 5 0 0 0-10 0zm5-3 2 3H8l2-3zm0 0V4M8 7h8' },
  { label: 'Run', color: '#f97316', path: 'M13 4a1 1 0 1 0 2 0 1 1 0 0 0-2 0M8 20l2-5 3 2 3-6M6 11l2-3 3 1 2-2' },
  { label: 'Trail', color: '#10b981', path: 'M3 18l4-8 3 4 2-3 3 7M8 6l4-3 4 4' },
  { label: 'Swim', color: '#06b6d4', path: 'M3 12c2-2 4-2 6 0s4 2 6 0M3 17c2-2 4-2 6 0s4 2 6 0M9 7a3 3 0 1 0 6 0' },
  { label: 'Muscu', color: '#8b5cf6', path: 'M6 8h12M6 16h12M4 12h16M9 5v14M15 5v14' },
  { label: 'Ski', color: '#a78bfa', path: 'M5 18l5-10 4 6 3-4M3 20h18' },
]

export default function RecordSlide() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '0 24px', gap: 24 }}>
      <MockupPhone />
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
        {SPORT_ICONS.map((s, i) => (
          <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, animation: `fade-in-up 0.4s ${i * 80}ms both` }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}22`, border: `1px solid ${s.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={s.path} />
              </svg>
            </div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 10px', fontFamily: 'Syne, sans-serif' }}>Enregistre chaque séance</h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.58)', lineHeight: 1.6, margin: 0, fontFamily: 'DM Sans, sans-serif' }}>GPS précis, données temps réel,<br />tous les sports.</p>
      </div>
    </div>
  )
}
