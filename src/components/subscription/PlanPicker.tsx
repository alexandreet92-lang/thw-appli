'use client'

// ══════════════════════════════════════════════════════════════
// PlanPicker — sélecteur de formule (Premium / Pro / Expert), mensuel
// ou annuel, puis redirection vers Stripe Checkout (paiement sécurisé).
// Style minimal & raffiné (façon Claude).
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { MobileSheet, SheetPill, SHEET_CARD_SHADOW, useMobileSafe } from '@/components/ui/BottomSheet'

interface Props { onClose: () => void }

type Period = 'monthly' | 'yearly'

const PLANS: { tier: string; name: string; coach: string; monthly: number; yearly: number; popular?: boolean }[] = [
  { tier: 'premium', name: 'Premium', coach: 'Coach Hermès', monthly: 14, yearly: 132 },
  { tier: 'pro',     name: 'Pro',     coach: 'Coach Athéna', monthly: 26, yearly: 249, popular: true },
  { tier: 'expert',  name: 'Expert',  coach: 'Coach Zeus',   monthly: 49, yearly: 468 },
]

export default function PlanPicker({ onClose }: Props) {
  const { t } = useI18n()
  const [period, setPeriod] = useState<Period>('monthly')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)
  useEffect(() => { const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r) }, [])
  const requestClose = () => { setClosing(true); setShown(false); setTimeout(onClose, 280) }
  const mobile = useMobileSafe()
  const [selected, setSelected] = useState<string>(PLANS.find(p => p.popular)?.tier ?? PLANS[0].tier)

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
      if (!res.ok || !json.url) throw new Error(json.error ?? t('w3c.checkout_error'))
      window.location.href = json.url
    } catch (e) {
      setError(e instanceof Error ? e.message : t('w3c.error_generic'))
      setLoading(null)
    }
  }

  // Mobile (≤ 767 px) : feuille du bas — piste mensuel/annuel (pouce blanc),
  // cartes de formule blanches à cocher, une seule pilule cyan.
  if (mobile) {
    const sel = PLANS.find(p => p.tier === selected) ?? PLANS[0]
    return (
      <MobileSheet open={shown && !closing} onClose={requestClose} locked={loading !== null} title={t('w3c.pp_title')} sub={t('w3c.pp_subtitle')} zIndex={14500}
        footer={<>
          {error && <p style={{ fontSize: 13, color: 'var(--danger)', textAlign: 'center', margin: 0 }}>{error}</p>}
          <SheetPill onClick={() => void choose(sel.tier)} disabled={loading !== null}>
            {loading ? t('w3c.redirecting') : t('w3c.choose_plan', { name: sel.name })}
          </SheetPill>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div role="tablist" style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 'var(--r-pill)', background: 'var(--surface-chip)' }}>
            {(['monthly', 'yearly'] as Period[]).map(p => {
              const on = period === p
              return (
                <button key={p} type="button" role="tab" aria-selected={on} onClick={() => setPeriod(p)}
                  style={{ flex: 1, minHeight: 44, borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: on ? 700 : 600,
                    background: on ? 'var(--surface-card)' : 'transparent', color: on ? 'var(--text)' : 'var(--text-mid)', boxShadow: on ? SHEET_CARD_SHADOW : 'none', transition: 'background 0.2s ease, color 0.2s ease' }}>
                  {p === 'monthly' ? t('w3c.monthly') : t('w3c.annual_discount')}
                </button>
              )
            })}
          </div>
          {PLANS.map(pl => {
            const on = selected === pl.tier
            return (
              <button key={pl.tier} type="button" aria-pressed={on} onClick={() => setSelected(pl.tier)} disabled={loading !== null}
                style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 76, padding: '16px', textAlign: 'left', border: 'none', cursor: 'pointer',
                  borderRadius: 'var(--r-lg)', background: 'var(--surface-card)', fontFamily: 'var(--font-body)',
                  boxShadow: on ? 'inset 0 0 0 2px var(--primary)' : SHEET_CARD_SHADOW, transition: 'box-shadow 0.2s ease' }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{pl.name}</span>
                    {pl.popular && <span style={{ padding: '3px 10px', borderRadius: 'var(--r-pill)', background: 'var(--surface-chip)', color: 'var(--text-mid)', fontSize: 12, fontWeight: 600 }}>{t('w3c.popular')}</span>}
                  </span>
                  <span style={{ display: 'block', marginTop: 2, fontSize: 14, color: 'var(--text-mid)' }}>{pl.coach}</span>
                </span>
                <span aria-hidden style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: on ? 'var(--primary)' : 'transparent', boxShadow: on ? 'none' : 'inset 0 0 0 2px var(--text-dim)' }}>
                  {on && <Check size={16} strokeWidth={3} color="var(--on-primary)" />}
                </span>
              </button>
            )
          })}
        </div>
      </MobileSheet>
    )
  }

  return (
    <div onClick={requestClose} style={{ position: 'fixed', inset: 0, zIndex: 13000, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18, opacity: shown && !closing ? 1 : 0, transition: 'opacity 0.28s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 420, maxWidth: '100%', maxHeight: '88dvh', overflowY: 'auto', background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', padding: 24, boxShadow: '0 30px 80px rgba(0,0,0,0.35)', border: '1px solid var(--border)', transform: shown && !closing ? 'translateY(0)' : 'translateY(100%)', opacity: shown && !closing ? 1 : 0, transition: 'transform 0.28s cubic-bezier(0.32,0.72,0,1), opacity 0.28s ease' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text)', textAlign: 'center', margin: '0 0 4px' }}>{t('w3c.pp_title')}</h2>
        <p style={{ fontSize: 13, color: 'var(--text-mid)', textAlign: 'center', margin: '0 0 18px' }}>{t('w3c.pp_subtitle')}</p>

        {/* Toggle mensuel / annuel */}
        <div style={{ display: 'flex', background: 'var(--bg-alt)', borderRadius: 'var(--r-pill)', padding: 4, marginBottom: 18 }}>
          {(['monthly', 'yearly'] as Period[]).map(p => {
            const on = period === p
            return (
              <button key={p} onClick={() => setPeriod(p)} style={{ flex: 1, padding: '9px 6px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', background: on ? 'var(--bg-card)' : 'transparent', color: on ? 'var(--text)' : 'var(--text-dim)', fontSize: 13, fontWeight: 600, boxShadow: on ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all .15s' }}>
                {p === 'monthly' ? t('w3c.monthly') : t('w3c.annual_discount')}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PLANS.map(pl => (
            <div key={pl.tier} style={{ position: 'relative', borderRadius: 'var(--r-md)', border: `1px solid ${pl.popular ? 'var(--text)' : 'var(--border)'}`, background: 'color-mix(in srgb, var(--text) 4%, var(--bg))', padding: 16 }}>
              {pl.popular && <span style={{ position: 'absolute', top: -9, left: 16, padding: '2px 9px', borderRadius: 'var(--r-pill)', background: 'var(--text)', color: 'var(--bg)', fontSize: 10, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase' }}>{t('w3c.popular')}</span>}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>{pl.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>{pl.coach}</p>
                </div>
                {/* Prix non affichés dans l'app (règles App Store). */}
              </div>
              <button onClick={() => void choose(pl.tier)} disabled={loading !== null} style={{ width: '100%', marginTop: 12, padding: '11px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--text)', color: 'var(--bg)', fontSize: 13.5, fontWeight: 600, cursor: loading ? 'default' : 'pointer', opacity: loading && loading !== pl.tier ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {loading === pl.tier ? t('w3c.redirecting') : <>{t('w3c.choose_plan', { name: pl.name })} <Check size={15} strokeWidth={2.4} /></>}
              </button>
            </div>
          ))}
        </div>

        {error && <p style={{ fontSize: 12, color: 'var(--danger)', textAlign: 'center', margin: '14px 0 0' }}>{error}</p>}
        <button onClick={requestClose} style={{ width: '100%', marginTop: 14, padding: 11, borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mid)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{t('w3c.close')}</button>
      </div>
    </div>
  )
}
