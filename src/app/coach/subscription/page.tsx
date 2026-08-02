'use client'
export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════════
// Abonnement COACH — 6 packs par capacité d'athlètes. Base commune :
// Premium athlète + toutes les fonctions coach + 1 M tokens Studio.
// Changement / annulation via le portail de facturation Stripe.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { COACH_PACKS, getCoachPack, type CoachPackKey } from '@/lib/subscriptions/coach-packs'
import CoachSubscribeEmailModal from '@/components/subscription/CoachSubscribeEmailModal'

interface CurrentSub { pack_key: string; status: string; current_period_end: string | null }

export default function CoachSubscriptionPage() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [current, setCurrent] = useState<CurrentSub | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [emailPack, setEmailPack] = useState<CoachPackKey | null>(null)

  useEffect(() => {
    void (async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        const { data } = await sb.from('coach_subscriptions').select('pack_key, status, current_period_end').eq('user_id', user.id).maybeSingle()
        setCurrent((data as CurrentSub) ?? null)
      }
      setLoading(false)
    })()
  }, [])

  // On ne redirige pas directement vers Stripe : on ouvre la modale qui envoie
  // le lien de paiement par email (preuve de possession de l'adresse).
  const subscribe = (packKey: CoachPackKey) => setEmailPack(packKey)

  const manage = async () => {
    setBusy('portal')
    try {
      const r = await fetch('/api/stripe/portal', { method: 'POST' })
      const d = await r.json()
      if (d.url) window.location.href = d.url
      else alert(d.error ?? 'Portail indisponible.')
    } catch { alert('Erreur réseau.') } finally { setBusy(null) }
  }

  const activePack = current && (current.status === 'active' || current.status === 'trialing') ? getCoachPack(current.pack_key) : null

  return (
    <div style={{ width: '100%', maxWidth: 960, margin: '0 auto', padding: '24px clamp(16px,4vw,40px) 64px', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>Abonnement coach</h1>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 20px' }}>Chaque pack inclut : ton compte athlète Premium, toutes les fonctions coach et 1 M de tokens Studio par mois. Le pack définit ta capacité d’athlètes.</p>

      {activePack && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Pack actif · {activePack.label}</div>
            {current?.current_period_end && <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 2 }}>Prochain renouvellement : {new Date(current.current_period_end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>}
          </div>
          <button onClick={manage} disabled={busy === 'portal'} style={btnManage}>{busy === 'portal' ? '…' : 'Changer / annuler'}</button>
        </div>
      )}

      {/* Toggle mensuel / annuel */}
      <div style={{ display: 'inline-flex', gap: 3, padding: 3, borderRadius: 999, background: 'var(--bg-card2)', marginBottom: 20 }}>
        {(['monthly', 'yearly'] as const).map(b => (
          <button key={b} onClick={() => setBilling(b)} style={{ padding: '7px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, background: billing === b ? 'var(--bg-card)' : 'transparent', color: billing === b ? 'var(--primary)' : 'var(--text-mid)', boxShadow: billing === b ? '0 1px 3px rgba(0,0,0,0.12)' : 'none' }}>
            {b === 'monthly' ? 'Mensuel' : 'Annuel'}{b === 'yearly' && <span style={{ fontSize: 11, marginLeft: 5, color: 'var(--text-dim)' }}>−17 %</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Chargement…</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {COACH_PACKS.map(p => {
            const price = billing === 'yearly' ? p.yearlyEur : p.monthlyEur
            const isCurrent = activePack?.key === p.key
            return (
              <div key={p.key} style={{ background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{p.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '6px 0 2px' }}>
                  <span className="tnum" style={{ fontSize: 30, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{price}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>€ / {billing === 'yearly' ? 'an' : 'mois'}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>{Math.round((price / p.maxAthletes) * (billing === 'yearly' ? 1 / 12 : 1) * 100) / 100} € / athlète / mois</div>
                <div style={{ flex: 1 }} />
                {isCurrent ? (
                  <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--primary)', padding: '11px 0' }}>Ton pack actuel</div>
                ) : (
                  <button onClick={() => subscribe(p.key as CoachPackKey)} disabled={!!busy}
                    style={{ height: 44, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                    {busy === p.key ? '…' : activePack ? 'Passer à ce pack' : 'Choisir'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 20, lineHeight: 1.5 }}>Le paiement, le changement de pack et l’annulation se gèrent via Stripe. L’annulation garde ton accès jusqu’à la fin de la période déjà payée.</p>

      {emailPack && (() => {
        const p = getCoachPack(emailPack)
        if (!p) return null
        return (
          <CoachSubscribeEmailModal
            packKey={p.key}
            packName={p.name}
            packLabel={p.label}
            price={billing === 'yearly' ? p.yearlyEur : p.monthlyEur}
            billingPeriod={billing}
            onClose={() => setEmailPack(null)}
          />
        )
      })()}
    </div>
  )
}

const btnManage: React.CSSProperties = { padding: '9px 16px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--bg-card)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }
