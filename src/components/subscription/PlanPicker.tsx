'use client'

// ══════════════════════════════════════════════════════════════
// PlanPicker — sélecteur de formule (Premium / Pro / Expert), mensuel
// ou annuel, puis redirection vers Stripe Checkout (paiement sécurisé).
// Style minimal & raffiné (façon Claude).
// ══════════════════════════════════════════════════════════════

import { useState } from 'react'
import { Check } from 'lucide-react'

interface Props { onClose: () => void }

type Period = 'monthly' | 'yearly'

const PLANS: { tier: string; name: string; coach: string; monthly: number; popular?: boolean }[] = [
  { tier: 'premium', name: 'Premium', coach: 'Coach Hermès', monthly: 14 },
  { tier: 'pro',     name: 'Pro',     coach: 'Coach Athéna', monthly: 26, popular: true },
  { tier: 'expert',  name: 'Expert',  coach: 'Coach Zeus',   monthly: 49 },
]

export default function PlanPicker({ onClose }: Props) {
  const [period, setPeriod] = useState<Period>('monthly')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function choose(tier: string) {
    if (loading) return
    setLoading(tier); setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, billingPeriod: period }),
      })
      const json = await res.json() as { url?: string; error?: string }
      if (!res.ok || !json.url) throw new Error(json.error ?? 'Erreur lors de la création du paiement.')
      window.location.href = json.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
      setLoading(null)
    }
  }

  const priceLabel = (monthly: number) =>
    period === 'monthly' ? `${monthly} €` : `${monthly * 10} €`
  const priceUnit = period === 'monthly' ? '/mois' : '/an'

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 13000, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 420, maxWidth: '100%', maxHeight: '88dvh', overflowY: 'auto', background: 'var(--bg-card)', borderRadius: 22, padding: 24, boxShadow: '0 30px 80px rgba(0,0,0,0.35)', border: '1px solid var(--border)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text)', textAlign: 'center', margin: '0 0 4px' }}>Choisis ta formule</h2>
        <p style={{ fontSize: 13, color: 'var(--text-mid)', textAlign: 'center', margin: '0 0 18px' }}>Paiement sécurisé via Stripe · sans engagement.</p>

        {/* Toggle mensuel / annuel */}
        <div style={{ display: 'flex', background: 'var(--bg-alt)', borderRadius: 999, padding: 4, marginBottom: 18 }}>
          {(['monthly', 'yearly'] as Period[]).map(p => {
            const on = period === p
            return (
              <button key={p} onClick={() => setPeriod(p)} style={{ flex: 1, padding: '9px 6px', borderRadius: 999, border: 'none', cursor: 'pointer', background: on ? 'var(--bg-card)' : 'transparent', color: on ? 'var(--text)' : 'var(--text-dim)', fontSize: 13, fontWeight: 600, boxShadow: on ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all .15s' }}>
                {p === 'monthly' ? 'Mensuel' : 'Annuel · 2 mois offerts'}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PLANS.map(pl => (
            <div key={pl.tier} style={{ position: 'relative', borderRadius: 16, border: `1px solid ${pl.popular ? 'var(--text)' : 'var(--border)'}`, background: 'color-mix(in srgb, var(--text) 4%, var(--bg))', padding: 16 }}>
              {pl.popular && <span style={{ position: 'absolute', top: -9, left: 16, padding: '2px 9px', borderRadius: 999, background: 'var(--text)', color: 'var(--bg)', fontSize: 10, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase' }}>Populaire</span>}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>{pl.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>{pl.coach}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{priceLabel(pl.monthly)}<span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-dim)' }}>{priceUnit}</span></p>
                </div>
              </div>
              <button onClick={() => void choose(pl.tier)} disabled={loading !== null} style={{ width: '100%', marginTop: 12, padding: '11px', borderRadius: 12, border: 'none', background: 'var(--text)', color: 'var(--bg)', fontSize: 13.5, fontWeight: 600, cursor: loading ? 'default' : 'pointer', opacity: loading && loading !== pl.tier ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {loading === pl.tier ? 'Redirection…' : <>Choisir {pl.name} <Check size={15} strokeWidth={2.4} /></>}
              </button>
            </div>
          ))}
        </div>

        {error && <p style={{ fontSize: 12, color: '#EF4444', textAlign: 'center', margin: '14px 0 0' }}>{error}</p>}
        <button onClick={onClose} style={{ width: '100%', marginTop: 14, padding: 11, borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mid)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Fermer</button>
      </div>
    </div>
  )
}
