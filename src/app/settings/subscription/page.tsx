'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { TierName } from '@/lib/subscriptions/tier-limits'
import type { UsageType } from '@/lib/subscriptions/check-quota'

// ── Types ──────────────────────────────────────────────────────

interface UsageStat {
  used:     number
  limit:    number
  reset_at: string
}

interface SubscriptionInfo {
  tier:                    string | null
  status:                  string | null
  stripe_customer_id:      string | null
  stripe_subscription_id:  string | null   // null = plan gratuit, jamais souscrit
  current_period_end:      string | null
  current_period_start:    string | null
}

interface SummaryData {
  tier:         TierName
  unlimited?:   boolean
  usage:        Record<UsageType, UsageStat>
  subscription: SubscriptionInfo | null
}

// ── Plan definitions ───────────────────────────────────────────

interface PlanFeature {
  label: string
  values: Record<TierName, string | boolean>
}

const FEATURES: PlanFeature[] = [
  { label: 'Messages IA / mois',         values: { premium: '30',          pro: '100',          expert: '300'          } },
  { label: 'Plans d\'entraînement / mois', values: { premium: '2',           pro: '6',            expert: '20'           } },
  { label: 'Plans nutrition / mois',     values: { premium: '1',           pro: '3',            expert: '10'           } },
  { label: 'Briefings / semaine',        values: { premium: '4',           pro: '7 (quotidien)', expert: '7 (quotidien)' } },
  { label: 'Web search dans briefing',   values: { premium: false,         pro: true,           expert: true           } },
  { label: 'Actions outils / mois',      values: { premium: '50',          pro: '150',          expert: '400'          } },
  { label: 'Modèle IA',                  values: { premium: 'Haiku',       pro: 'Sonnet',       expert: 'Sonnet Max'   } },
  { label: 'Historique',                 values: { premium: '6 mois',      pro: '24 mois',      expert: 'Illimité'     } },
  { label: 'Sync Strava / mois',         values: { premium: '100',         pro: 'Illimité',     expert: 'Illimité'     } },
  { label: 'Stockage',                   values: { premium: '1 Go',        pro: '5 Go',         expert: '20 Go'        } },
]

interface PlanDef {
  tier:           TierName
  name:           string
  subtitle:       string
  monthlyPrice:   number
  yearlyPrice:    number
  yearlyMonthly:  number   // équivalent mensuel en annuel
  accent:         string
}

const PLANS: PlanDef[] = [
  {
    tier:          'premium',
    name:          'Premium',
    subtitle:      'Démarrer le coaching IA',
    monthlyPrice:  14,
    yearlyPrice:   132,
    yearlyMonthly: 11,
    accent:        'rgba(0,200,224,0.15)',
  },
  {
    tier:          'pro',
    name:          'Pro',
    subtitle:      'Pour l\'athlète sérieux',
    monthlyPrice:  26,
    yearlyPrice:   249,
    yearlyMonthly: 20.75,
    accent:        'rgba(0,200,224,0.22)',
  },
  {
    tier:          'expert',
    name:          'Expert',
    subtitle:      'Performance sans limites',
    monthlyPrice:  49,
    yearlyPrice:   468,
    yearlyMonthly: 39,
    accent:        'rgba(0,200,224,0.30)',
  },
]

const USAGE_LABELS: Partial<Record<UsageType, string>> = {
  message:         'Messages IA',
  plan_generation: 'Plans d\'entraînement',
  nutrition_plan:  'Plans nutrition',
  briefing:        'Briefings (7j)',
  tool_use:        'Actions outils',
}

// ── Skeleton ───────────────────────────────────────────────────

function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={className}
      style={{
        background:      'linear-gradient(90deg, var(--bg-card) 25%, var(--bg-card2) 50%, var(--bg-card) 75%)',
        backgroundSize:  '200% 100%',
        animation:       'shimmer 1.4s infinite linear',
        borderRadius:    8,
        ...style,
      }}
    />
  )
}

// ── Progress bar ───────────────────────────────────────────────

function UsageBar({ used, limit, label, resetAt }: {
  used:    number
  limit:   number
  label:   string
  resetAt: string
}) {
  const pct      = limit === Infinity ? 0 : Math.min(100, (used / limit) * 100)
  const isHigh   = pct >= 85
  const barColor = isHigh ? '#ef4444' : '#00c8e0'
  const limitStr = limit === Infinity ? '∞' : String(limit)
  const resetStr = new Date(resetAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'DM Sans, sans-serif' }}>{label}</span>
        <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace' }}>
          {used}<span style={{ opacity: 0.5 }}> / {limitStr}</span>
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-card2)', overflow: 'hidden' }}>
        <div style={{
          height:       '100%',
          width:        `${pct}%`,
          background:   barColor,
          borderRadius: 2,
          transition:   'width 0.5s ease',
        }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif' }}>
        Remise à zéro le {resetStr}
      </span>
    </div>
  )
}

// ── Feature row value ──────────────────────────────────────────

function FeatureValue({ value }: { value: string | boolean }) {
  if (value === true)  return <span style={{ color: '#00c8e0', fontSize: 14 }}>✓</span>
  if (value === false) return <span style={{ color: 'var(--text-dim)', fontSize: 14, opacity: 0.4 }}>–</span>
  return <span style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'DM Sans, sans-serif' }}>{value}</span>
}

// ── Main page ──────────────────────────────────────────────────

export default function SubscriptionPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const success      = searchParams.get('success') === 'true'
  const canceled     = searchParams.get('canceled') === 'true'

  const [data,        setData]        = useState<SummaryData | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [billing,     setBilling]     = useState<'monthly' | 'yearly'>('monthly')
  const [ctaLoading,  setCtaLoading]  = useState<string | null>(null)  // tier en cours de checkout
  const [portalLoading, setPortalLoading] = useState(false)
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; msg: string } | null>(
    success ? { type: 'success', msg: '✓ Abonnement activé ! Bienvenue dans votre nouveau plan.' } : null,
  )

  // ── Fetch summary ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res  = await fetch('/api/subscriptions/summary')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json() as SummaryData
        if (!cancelled) setData(json)
      } catch (err) {
        console.error('[subscription] fetch summary:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // ── Checkout ──────────────────────────────────────────────────
  const handleCheckout = useCallback(async (tier: TierName) => {
    setCtaLoading(tier)
    setBanner(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tier, billingPeriod: billing }),
      })
      const json = await res.json() as { url?: string; error?: string }
      if (!res.ok || !json.url) throw new Error(json.error ?? 'Erreur inconnue')
      window.location.href = json.url
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setBanner({ type: 'error', msg: `Erreur : ${msg}` })
      setCtaLoading(null)
    }
  }, [billing])

  // ── Portal ────────────────────────────────────────────────────
  const handlePortal = useCallback(async () => {
    setPortalLoading(true)
    setBanner(null)
    try {
      const res  = await fetch('/api/stripe/portal', { method: 'POST' })
      const json = await res.json() as { url?: string; error?: string }
      if (!res.ok || !json.url) throw new Error(json.error ?? 'Erreur inconnue')
      window.location.href = json.url
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setBanner({ type: 'error', msg: `Erreur portail : ${msg}` })
      setPortalLoading(false)
    }
  }, [])

  const currentTier = data?.tier ?? 'premium'
  const isUnlimited = data?.unlimited === true
  // "Gérer mon abonnement" → uniquement si un abonnement Stripe réel existe.
  // stripe_customer_id peut exister sans abonnement (checkout abandonné) ; c'est
  // stripe_subscription_id qui confirme un vrai abonnement actif ou passé.
  const hasBilling  = Boolean(data?.subscription?.stripe_subscription_id) && !isUnlimited
  const periodEnd   = data?.subscription?.current_period_end
    ? new Date(data.subscription.current_period_end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  const subStatus   = data?.subscription?.status ?? null

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .sub-btn {
          min-height: 44px;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
          border: none;
          padding: 0 20px;
        }
        .sub-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .sub-btn:not(:disabled):hover {
          opacity: 0.88;
        }
        .sub-btn:not(:disabled):active {
          transform: scale(0.97);
        }
        .plan-card {
          border-radius: 12px;
          border: 1.5px solid var(--border);
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          transition: border-color 0.2s;
          background: var(--bg-card);
        }
        .plan-card.active {
          border-color: #00c8e0;
          box-shadow: 0 0 0 1px rgba(0,200,224,0.2);
        }
        .toggle-pill {
          display: inline-flex;
          border-radius: 8px;
          border: 1.5px solid var(--border);
          overflow: hidden;
          background: var(--bg-card);
        }
        .toggle-option {
          padding: 8px 20px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
          border: none;
          background: transparent;
          color: var(--text-mid);
          min-height: 38px;
        }
        .toggle-option.selected {
          background: #00c8e0;
          color: #0a0a0a;
          font-weight: 700;
        }
      `}</style>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 16px 64px', color: 'var(--text)' }}>

        {/* ── Header ───────────────────────────────────────────── */}
        <h1 style={{
          fontFamily: 'Syne, sans-serif',
          fontSize:   28,
          fontWeight: 700,
          margin:     '0 0 4px',
          color:      'var(--text)',
        }}>
          Mon abonnement
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif', margin: '0 0 32px' }}>
          Gérez votre plan et suivez votre utilisation mensuelle.
        </p>

        {/* ── Banner success / error ────────────────────────────── */}
        {banner && (
          <div style={{
            padding:      '12px 16px',
            borderRadius: 8,
            marginBottom: 24,
            background:   banner.type === 'success' ? 'rgba(0,200,224,0.12)' : 'rgba(239,68,68,0.12)',
            border:       `1px solid ${banner.type === 'success' ? 'rgba(0,200,224,0.4)' : 'rgba(239,68,68,0.4)'}`,
            color:        banner.type === 'success' ? '#00c8e0' : '#ef4444',
            fontFamily:   'DM Sans, sans-serif',
            fontSize:     14,
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'space-between',
          }}>
            <span>{banner.msg}</span>
            <button
              onClick={() => setBanner(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 18, lineHeight: 1, padding: 4 }}
            >×</button>
          </div>
        )}
        {canceled && !banner && (
          <div style={{
            padding:      '12px 16px',
            borderRadius: 8,
            marginBottom: 24,
            background:   'var(--bg-card)',
            border:       '1px solid var(--border)',
            color:        'var(--text-mid)',
            fontFamily:   'DM Sans, sans-serif',
            fontSize:     14,
          }}>
            Paiement annulé — vous restez sur votre plan actuel.
          </div>
        )}

        {/* ── Plan actuel + gestion ─────────────────────────────── */}
        <section style={{
          background:   'var(--bg-card)',
          border:       '1.5px solid var(--border)',
          borderRadius: 12,
          padding:      '20px 24px',
          marginBottom: 32,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'space-between',
          flexWrap:     'wrap',
          gap:          16,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {loading ? (
                <Skeleton className="" style={{ width: 80, height: 22 }} />
              ) : (
                <>
                  <span style={{
                    fontFamily:  'Syne, sans-serif',
                    fontSize:    18,
                    fontWeight:  700,
                    color:       'var(--text)',
                  }}>
                    {isUnlimited ? 'Compte créateur' : `Plan ${currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}`}
                  </span>
                  {isUnlimited && (
                    <span style={{
                      fontSize:     11,
                      fontWeight:   600,
                      padding:      '2px 8px',
                      borderRadius: 4,
                      fontFamily:   'DM Sans, sans-serif',
                      background:   'rgba(0,200,224,0.12)',
                      color:        '#00c8e0',
                    }}>
                      Illimité
                    </span>
                  )}
                  {!isUnlimited && subStatus && (
                    <span style={{
                      fontSize:     11,
                      fontWeight:   600,
                      padding:      '2px 8px',
                      borderRadius: 4,
                      fontFamily:   'DM Sans, sans-serif',
                      background:   subStatus === 'active' || subStatus === 'trialing'
                        ? 'rgba(0,200,224,0.12)' : 'rgba(239,68,68,0.12)',
                      color:        subStatus === 'active' || subStatus === 'trialing'
                        ? '#00c8e0' : '#ef4444',
                    }}>
                      {subStatus === 'active'   ? 'Actif'
                       : subStatus === 'trialing' ? 'Essai'
                       : subStatus === 'past_due' ? 'Paiement en retard'
                       : 'Annulé'}
                    </span>
                  )}
                </>
              )}
            </div>
            {loading ? (
              <Skeleton className="" style={{ width: 200, height: 16 }} />
            ) : isUnlimited ? (
              <span style={{ fontSize: 13, color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif' }}>
                Accès illimité à toutes les fonctionnalités
              </span>
            ) : periodEnd ? (
              <span style={{ fontSize: 13, color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif' }}>
                Prochaine facturation le {periodEnd}
              </span>
            ) : (
              <span style={{ fontSize: 13, color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif' }}>
                Aucun abonnement actif — plan gratuit
              </span>
            )}
          </div>

          {hasBilling && (
            <button
              className="sub-btn"
              onClick={() => void handlePortal()}
              disabled={portalLoading}
              style={{ background: 'var(--bg-card2)', color: 'var(--text)', border: '1.5px solid var(--border)' }}
            >
              {portalLoading ? 'Chargement…' : 'Gérer mon abonnement'}
            </button>
          )}
        </section>

        {/* ── Usage du mois ─────────────────────────────────────── */}
        {!isUnlimited && (
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: 'var(--text)' }}>
            Utilisation en cours
          </h2>
          <div style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap:                 16,
          }}>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Skeleton className="" style={{ width: '60%', height: 14 }} />
                    <Skeleton className="" style={{ width: '100%', height: 4 }} />
                    <Skeleton className="" style={{ width: '40%', height: 11 }} />
                  </div>
                ))
              : (Object.entries(USAGE_LABELS) as [UsageType, string][]).map(([type, label]) => {
                  const stat = data?.usage?.[type]
                  if (!stat) return null
                  return (
                    <div key={type} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 16 }}>
                      <UsageBar
                        label={label}
                        used={stat.used}
                        limit={stat.limit}
                        resetAt={stat.reset_at}
                      />
                    </div>
                  )
                })
            }
          </div>
        </section>
        )}

        {/* ── Plans pricing ─────────────────────────────────────── */}
        {!isUnlimited && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
              Changer de plan
            </h2>
            {/* Toggle mensuel / annuel */}
            <div className="toggle-pill">
              <button
                className={`toggle-option${billing === 'monthly' ? ' selected' : ''}`}
                onClick={() => setBilling('monthly')}
              >
                Mensuel
              </button>
              <button
                className={`toggle-option${billing === 'yearly' ? ' selected' : ''}`}
                onClick={() => setBilling('yearly')}
              >
                Annuel <span style={{ fontSize: 11, marginLeft: 4, opacity: 0.8 }}>−20%</span>
              </button>
            </div>
          </div>

          <div style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap:                 16,
          }}>
            {PLANS.map(plan => {
              const isActive      = currentTier === plan.tier
              const price         = billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
              const monthlyEquiv  = billing === 'yearly' ? plan.yearlyMonthly : plan.monthlyPrice
              const isCta         = ctaLoading === plan.tier

              return (
                <div
                  key={plan.tier}
                  className={`plan-card${isActive ? ' active' : ''}`}
                >
                  {/* Header */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
                        {plan.name}
                      </span>
                      {isActive && (
                        <span style={{
                          fontSize:     11,
                          fontWeight:   700,
                          padding:      '2px 8px',
                          borderRadius: 4,
                          background:   'rgba(0,200,224,0.12)',
                          color:        '#00c8e0',
                          fontFamily:   'DM Sans, sans-serif',
                        }}>
                          Plan actuel
                        </span>
                      )}
                      {plan.tier === 'expert' && !isActive && (
                        <span style={{
                          fontSize:     11,
                          fontWeight:   700,
                          padding:      '2px 8px',
                          borderRadius: 4,
                          background:   'rgba(0,200,224,0.08)',
                          color:        '#00c8e0',
                          fontFamily:   'DM Sans, sans-serif',
                        }}>
                          Recommandé
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
                      {plan.subtitle}
                    </p>
                  </div>

                  {/* Price */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 32, fontWeight: 700, color: 'var(--text)' }}>
                        €{billing === 'yearly' ? monthlyEquiv.toFixed(0) : price}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif' }}>
                        /mois
                      </span>
                    </div>
                    {billing === 'yearly' && (
                      <p style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif', margin: '4px 0 0' }}>
                        Facturé €{price}/an
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {FEATURES.map(f => (
                      <div key={f.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-mid)', fontFamily: 'DM Sans, sans-serif', flex: 1 }}>
                          {f.label}
                        </span>
                        <FeatureValue value={f.values[plan.tier]} />
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  {isActive ? (
                    <button
                      className="sub-btn"
                      disabled
                      style={{ background: 'var(--bg-card2)', color: 'var(--text-mid)', width: '100%' }}
                    >
                      Plan actuel
                    </button>
                  ) : (
                    <button
                      className="sub-btn"
                      onClick={() => void handleCheckout(plan.tier)}
                      disabled={ctaLoading !== null}
                      style={{
                        background: '#00c8e0',
                        color:      '#0a0a0a',
                        width:      '100%',
                      }}
                    >
                      {isCta ? 'Chargement…' : `Choisir ${plan.name}`}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
        )}

        {/* ── Note légale ───────────────────────────────────────── */}
        {!isUnlimited && (
          <p style={{
            marginTop:  40,
            fontSize:   12,
            color:      'var(--text-dim)',
            fontFamily: 'DM Sans, sans-serif',
            textAlign:  'center',
            lineHeight: 1.6,
          }}>
            Paiement sécurisé par Stripe · Annulation à tout moment · Prix TTC en euros
          </p>
        )}
      </div>
    </>
  )
}
