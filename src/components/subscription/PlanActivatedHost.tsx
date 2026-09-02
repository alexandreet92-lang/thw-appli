'use client'
// ══════════════════════════════════════════════════════════════════
// PlanActivatedHost — animation « nouvel abonnement ». Monté une fois dans le
// shell. Écoute l'événement global « thw:plan-activated » (émis par
// useEntitlements quand la formule change vers une formule payante, ex. au
// retour d'un paiement) et affiche une célébration : confettis + nom de la
// formule + TOUTES les fonctionnalités débloquées.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { TIER_NAME, TIER_TAGLINE, featuresForTier, type DisplayTier } from '@/lib/subscriptions/tier-features'

const ACCENT: Record<DisplayTier, string> = {
  premium: '#06B6D4',
  pro:     '#8B5CF6',
  expert:  '#F59E0B',
}
const CONFETTI = ['#06B6D4', '#8B5CF6', '#F59E0B', '#22C55E', '#EC4899']

export function PlanActivatedHost() {
  const [tier, setTier] = useState<DisplayTier | null>(null)

  useEffect(() => {
    const onActivated = (e: Event) => {
      const t = (e as CustomEvent<{ tier?: string }>).detail?.tier
      if (t === 'premium' || t === 'pro' || t === 'expert') setTier(t)
    }
    window.addEventListener('thw:plan-activated', onActivated)
    return () => window.removeEventListener('thw:plan-activated', onActivated)
  }, [])

  if (!tier) return null
  const accent = ACCENT[tier]
  const feats = featuresForTier(tier)

  return (
    <div
      onClick={() => setTier(null)}
      style={{ position: 'fixed', inset: 0, zIndex: 14000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'var(--font-body)' }}
    >
      <style>{`
        @keyframes thw-pa-fall { 0% { transform: translateY(-20px) rotate(0); opacity: 1; } 100% { transform: translateY(105vh) rotate(540deg); opacity: 0.9; } }
        @keyframes thw-pa-pop { 0% { transform: scale(0.9) translateY(14px); opacity: 0; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
        @keyframes thw-pa-badge { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.12); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes thw-pa-row { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* Confettis */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({ length: 40 }).map((_, i) => {
          const left = (i * 2.5) % 100
          const delay = (i % 10) * 0.12
          const dur = 2.2 + (i % 5) * 0.35
          const size = 6 + (i % 4) * 2
          return (
            <span key={i} style={{
              position: 'absolute', top: -20, left: `${left}%`, width: size, height: size * 1.4,
              background: CONFETTI[i % CONFETTI.length], borderRadius: 1,
              animation: `thw-pa-fall ${dur}s linear ${delay}s infinite`,
            }} />
          )
        })}
      </div>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', width: 'min(440px, 100%)', maxHeight: '88vh', overflowY: 'auto',
          background: 'var(--bg-card)', borderRadius: 24, padding: '30px 26px 24px',
          boxShadow: '0 30px 90px rgba(0,0,0,0.4)', border: `1px solid ${accent}44`,
          animation: 'thw-pa-pop 0.3s cubic-bezier(0.2,0.8,0.2,1) both',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 66, height: 66, borderRadius: '50%', margin: '0 auto 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${accent}18`, border: `2px solid ${accent}`,
            animation: 'thw-pa-badge 0.5s cubic-bezier(0.2,0.9,0.2,1) both',
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </div>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: accent, margin: '0 0 4px' }}>Abonnement activé</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>
            Bienvenue en {TIER_NAME[tier]}
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-mid)', margin: 0 }}>{TIER_TAGLINE[tier]}</p>
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '20px 0 16px' }} />

        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 12px' }}>Tout ce que tu débloques</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {feats.map((f, i) => (
            <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, animation: `thw-pa-row 0.35s ease ${0.15 + i * 0.03}s both` }}>
              <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: '50%', background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              </span>
              <span style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.4 }}>{f}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => setTier(null)}
          style={{ width: '100%', marginTop: 22, height: 48, borderRadius: 14, border: 'none', background: accent, color: '#fff', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
        >
          C'est parti 🚀
        </button>
      </div>
    </div>
  )
}
