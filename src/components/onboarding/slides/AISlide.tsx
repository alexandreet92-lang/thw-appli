'use client'
import { useState, useEffect } from 'react'

const MESSAGES = [
  { role: 'user', text: 'Comment améliorer ma VMA ?', delay: 200 },
  { role: 'ai', text: 'Intègre 2 séances de fractionné par semaine à 100–105% VMA.', delay: 1200 },
  { role: 'user', text: 'Quelle durée de récup ?', delay: 2800 },
  { role: 'ai', text: '1 min de repos pour 30s d\'effort. Débute par 6 répétitions.', delay: 3800 },
]

function ChatMockup() {
  const [visible, setVisible] = useState(0)
  useEffect(() => {
    MESSAGES.forEach((m, i) => {
      const t = setTimeout(() => setVisible(i + 1), m.delay)
      return () => clearTimeout(t)
    })
  }, [])

  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 18, padding: 14, width: '100%', maxWidth: 300, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 170 }}>
      {/* AI badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#8b5cf6,#5b6fff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#8b5cf6', fontFamily: 'DM Sans, sans-serif' }}>Coach IA</span>
      </div>
      {MESSAGES.slice(0, visible).map((m, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', animation: 'fade-in-up 0.28s ease' }}>
          <div style={{ maxWidth: '82%', padding: '8px 12px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: m.role === 'user' ? 'rgba(6,182,212,0.22)' : 'rgba(139,92,246,0.18)', border: `1px solid ${m.role === 'user' ? 'rgba(6,182,212,0.3)' : 'rgba(139,92,246,0.3)'}`, fontSize: 12, color: '#fff', lineHeight: 1.55, fontFamily: 'DM Sans, sans-serif' }}>
            {m.text}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AISlide() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '0 24px', gap: 28 }}>
      <ChatMockup />
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 10px', fontFamily: 'Syne, sans-serif' }}>Ton coach IA 24h/24</h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.58)', lineHeight: 1.6, margin: 0, fontFamily: 'DM Sans, sans-serif' }}>Nutrition, entraînement, récupération.<br />Des réponses personnalisées à chaque question.</p>
      </div>
    </div>
  )
}
