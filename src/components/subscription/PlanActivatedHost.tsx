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
import { SheetPill, useMobileSafe } from '@/components/ui/BottomSheet'
import { useI18n } from '@/lib/i18n'

const ACCENT: Record<DisplayTier, string> = {
  premium: '#06B6D4', // design-allow-color — teinte de formule (célébration)
  pro:     '#8B5CF6', // design-allow-color — teinte de formule (célébration)
  expert:  '#F59E0B', // design-allow-color — teinte de formule (célébration)
}
const CONFETTI = ['#06B6D4', '#8B5CF6', '#F59E0B', '#22C55E', '#EC4899'] // design-allow-color — confettis décoratifs

export function PlanActivatedHost() {
  const [tier, setTier] = useState<DisplayTier | null>(null)
  const mobile = useMobileSafe()
  const { t } = useI18n()

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

  // Mobile (≤ 767 px) : carte blanche centrée sans bordure (radius 24),
  // pastille ✓ cyan, titre gras Inter, liste à filets, pilule cyan.
  if (mobile) {
    return (
      <div onClick={() => setTier(null)}
        style={{ position: 'fixed', inset: 0, zIndex: 14000, background: 'var(--scrim)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'var(--font-body)' }}>
        <style>{`
          @keyframes thw-pa-fall { 0% { transform: translateY(-20px) rotate(0); opacity: 1; } 100% { transform: translateY(105vh) rotate(540deg); opacity: 0.9; } }
          @keyframes thw-pa-pop { 0% { transform: scale(0.9) translateY(14px); opacity: 0; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
          @keyframes thw-pa-badge { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.12); } 100% { transform: scale(1); opacity: 1; } }
          @media (prefers-reduced-motion: reduce) { .thw-pa-anim { animation: none !important; } }
        `}</style>
        <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          {Array.from({ length: 32 }).map((_, i) => {
            const size = 6 + (i % 4) * 2
            return (
              <span key={i} className="thw-pa-anim" style={{
                position: 'absolute', top: -20, left: `${(i * 3.1) % 100}%`, width: size, height: size * 1.4,
                background: CONFETTI[i % CONFETTI.length], borderRadius: 1,
                animation: `thw-pa-fall ${2.2 + (i % 5) * 0.35}s linear ${(i % 10) * 0.12}s infinite`,
              }} />
            )
          })}
        </div>
        <div role="dialog" aria-modal="true" aria-label={t('pe6.planActivated')} onClick={e => e.stopPropagation()} className="thw-pa-anim"
          style={{ position: 'relative', width: '100%', maxWidth: 420, maxHeight: 'calc(100dvh - 48px - env(safe-area-inset-top) - env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column',
            background: 'var(--surface-card)', borderRadius: 'calc(var(--r-lg) + 4px)', boxShadow: 'var(--shadow-float)', overflow: 'hidden',
            animation: 'thw-pa-pop 0.3s cubic-bezier(0.2,0.8,0.2,1) both' }}>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '28px 20px 8px' }}>
            <div style={{ textAlign: 'center' }}>
              <span className="thw-pa-anim" aria-hidden style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--primary-dim)', color: 'var(--primary)', animation: 'thw-pa-badge 0.5s cubic-bezier(0.2,0.9,0.2,1) both' }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              </span>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', margin: '0 0 4px' }}>{t('pe6.planActivated')}</p>
              <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text)', margin: '0 0 4px', lineHeight: 1.2 }}>{t('pe6.welcomeTier', { name: TIER_NAME[tier] })}</h2>
              <p style={{ fontSize: 15, color: 'var(--text-mid)', margin: 0 }}>{TIER_TAGLINE[tier]}</p>
            </div>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-mid)', margin: '22px 0 4px' }}>{t('pe6.unlockedAll')}</p>
            <div>
              {feats.map((f, i) => (
                <div key={f} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 0' }}>
                  {i > 0 && <span aria-hidden style={{ position: 'absolute', top: 0, left: 30, right: 0, height: 1, background: 'var(--border)' }} />}
                  <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M20 6 9 17l-5-5"/></svg>
                  <span style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.4 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flexShrink: 0, padding: '12px 20px 20px' }}>
            <SheetPill onClick={() => setTier(null)}>{t('pe6.letsGo')}</SheetPill>
          </div>
        </div>
      </div>
    )
  }

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
          background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', padding: '30px 26px 24px',
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
          style={{ width: '100%', marginTop: 22, height: 48, borderRadius: 'var(--r-md)', border: 'none', background: accent, color: '#fff', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
        >
          C'est parti 🚀
        </button>
      </div>
    </div>
  )
}
