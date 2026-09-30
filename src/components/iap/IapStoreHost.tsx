'use client'
// ══════════════════════════════════════════════════════════════════
// Boutique d'achat in-app (Apple) — feuille coulissante, app iOS uniquement.
// Abonnement athlète · Pack coach (avec option Pro/Expert intégrée) · Tokens.
// Les prix affichés sont ceux d'Apple (App Store Connect) ; l'achat passe par
// RevenueCat, le webhook débloque l'accès côté serveur.
// Ouverte via openIapStore(tab) depuis n'importe quel écran.
// ══════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import { isNativeApp, openWebsite, openExternalUrl } from '@/lib/native/platform'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { initIap, iapPrices, buyIap, restoreIap } from '@/lib/iap/purchases'
import {
  ALL_IAP_PRODUCT_IDS, IAP_COACH_PACK_KEYS, IAP_TOKEN_PRODUCTS,
  athleteProductId, coachProductId, type AthleteTier,
} from '@/lib/iap/products'
import { COACH_PACKS, type BillingPeriod, type CoachPackKey } from '@/lib/subscriptions/coach-packs'
import { refreshEntitlements } from '@/hooks/useEntitlements'
import { IAP_STORE_EVENT, type IapStoreTab } from '@/lib/iap/store-events'

const TIERS: AthleteTier[] = ['premium', 'pro', 'expert']
const TIER_NAME: Record<AthleteTier, string> = { premium: 'Premium', pro: 'Pro', expert: 'Expert' }
const APPLE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions'

type Msg = { kind: 'ok' | 'err'; text: string }

async function fetchTier(): Promise<string | null> {
  try {
    const r = await fetch('/api/subscriptions/summary')
    if (!r.ok) return null
    const j = await r.json() as { tier?: string }
    return j.tier ?? null
  } catch { return null }
}

const chip = (on: boolean): React.CSSProperties => ({
  minHeight: 44, padding: '0 var(--space-4)', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer',
  background: on ? 'var(--primary-dim)' : 'var(--bg-card2)', color: on ? 'var(--primary)' : 'var(--text-mid)',
  fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
})
const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  width: '100%', minHeight: 48, borderRadius: 'var(--r-md)', border: 'none',
  background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)',
  fontSize: 14.5, fontWeight: 700, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1,
})
const linkBtn: React.CSSProperties = {
  background: 'none', border: 'none', padding: 'var(--space-2)', minHeight: 44, cursor: 'pointer',
  color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 12.5, textDecoration: 'underline',
}
const num: React.CSSProperties = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'zero' 0" }

export function IapStoreHost() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(false)
  const [tab, setTab] = useState<IapStoreTab>('athlete')
  const [period, setPeriod] = useState<BillingPeriod>('monthly')
  const [coachPack, setCoachPack] = useState<CoachPackKey>('coach10')
  const [coachTier, setCoachTier] = useState<AthleteTier>('premium')
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<Msg | null>(null)

  const close = useCallback(() => { setShown(false); setTimeout(() => setOpen(false), 260) }, [])

  // Ouverture via événement + chargement des prix Apple.
  useEffect(() => {
    if (!isNativeApp()) return
    const on = (e: Event) => {
      const wanted = (e as CustomEvent<{ tab?: IapStoreTab }>).detail?.tab ?? 'athlete'
      setTab(wanted); setMsg(null); setOpen(true)
      setLoading(true)
      void (async () => {
        const user = await getCurrentUser()
        if (user?.id) await initIap(user.id)
        setPrices(await iapPrices(ALL_IAP_PRODUCT_IDS))
        setLoading(false)
      })()
    }
    window.addEventListener(IAP_STORE_EVENT, on)
    return () => window.removeEventListener(IAP_STORE_EVENT, on)
  }, [])

  useEffect(() => {
    if (!open) return
    const r = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(r)
  }, [open])

  const buy = useCallback(async (productId: string, kind: 'sub' | 'tokens') => {
    if (busy) return
    setBusy(productId); setMsg(null)
    const before = kind === 'sub' ? await fetchTier() : null
    const res = await buyIap(productId)
    if (!res.ok) {
      setBusy(null)
      if (!res.cancelled) setMsg({ kind: 'err', text: res.error ?? 'Achat impossible pour le moment.' })
      return
    }
    // Le webhook RevenueCat débloque l'accès de façon asynchrone : on attend un peu.
    for (let i = 0; i < 7; i++) {
      await new Promise(r => setTimeout(r, 1500))
      if (kind === 'sub') { const now = await fetchTier(); if (now && now !== before) break }
      else if (i >= 1) break
    }
    refreshEntitlements()
    setBusy(null)
    setMsg({ kind: 'ok', text: kind === 'tokens' ? 'Tokens ajoutés à ton compte.' : 'Achat confirmé. Ton accès est mis à jour.' })
  }, [busy])

  const restore = useCallback(async () => {
    if (busy) return
    setBusy('restore'); setMsg(null)
    const ok = await restoreIap()
    refreshEntitlements()
    setBusy(null)
    setMsg(ok ? { kind: 'ok', text: 'Achats restaurés.' } : { kind: 'err', text: 'Restauration impossible pour le moment.' })
  }, [busy])

  const coach = useMemo(() => COACH_PACKS.find(p => p.key === coachPack), [coachPack])
  const coachId = coachProductId(coachPack, coachTier, period)
  const coachPrice = coachId ? prices[coachId] : undefined
  const noPrices = !loading && Object.keys(prices).length === 0

  if (!open || typeof document === 'undefined') return null

  const periodToggle = (
    <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
      <button style={chip(period === 'monthly')} onClick={() => setPeriod('monthly')}>{t('misc.monthly')}</button>
      <button style={chip(period === 'yearly')} onClick={() => setPeriod('yearly')}>{t('misc.yearly')}</button>
    </div>
  )

  const skeleton = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {[0, 1, 2].map(i => <div key={i} style={{ height: 88, borderRadius: 'var(--r-md)', background: 'var(--bg-card2)', opacity: 0.6 }} />)}
    </div>
  )

  const subtitles: Record<AthleteTier, string> = {
    premium: t('misc.planPremiumSubtitle'), pro: t('misc.planProSubtitle'), expert: t('misc.planExpertSubtitle'),
  }

  return createPortal(
    <div onClick={close} style={{
      position: 'fixed', inset: 0, zIndex: 14000, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      opacity: shown ? 1 : 0, transition: 'opacity 0.26s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 'min(560px, 100%)', maxHeight: '92vh', overflowY: 'auto', background: 'var(--bg-card)',
        borderRadius: 'var(--r-lg) var(--r-lg) 0 0', padding: 'var(--space-5)',
        paddingBottom: 'calc(var(--space-5) + env(safe-area-inset-bottom))',
        transform: shown ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.28s cubic-bezier(0.32,0.72,0,1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
            Choisis ton offre
          </h2>
          <button onClick={close} aria-label={t('w3c.close')} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', minWidth: 44, minHeight: 44 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
          <button style={chip(tab === 'athlete')} onClick={() => setTab('athlete')}>Athlète</button>
          <button style={chip(tab === 'coach')} onClick={() => setTab('coach')}>Coach</button>
          <button style={chip(tab === 'tokens')} onClick={() => setTab('tokens')}>Tokens</button>
        </div>

        {msg && (
          <p style={{ margin: '0 0 var(--space-4)', fontFamily: 'var(--font-body)', fontSize: 13, color: msg.kind === 'ok' ? 'var(--text)' : 'var(--danger, #ef4444)' }}>
            {msg.text}
          </p>
        )}

        {noPrices && (
          <p style={{ margin: '0 0 var(--space-4)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mid)' }}>
            Les offres ne sont pas disponibles pour le moment. Réessaie dans quelques instants.
          </p>
        )}

        {/* ── Abonnement athlète ─────────────────────────────── */}
        {tab === 'athlete' && (
          <>
            {periodToggle}
            {loading ? skeleton : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {TIERS.map(tier => {
                  const id = athleteProductId(tier, period)
                  const price = prices[id]
                  return (
                    <div key={tier} style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-4)' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>{TIER_NAME[tier]}</span>
                        <span style={{ ...num, fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                          {price ? `${price} / ${period === 'yearly' ? 'an' : 'mois'}` : '—'}
                        </span>
                      </div>
                      <p style={{ margin: 'var(--space-2) 0 var(--space-3)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mid)' }}>{subtitles[tier]}</p>
                      <button style={primaryBtn(!price || busy !== null)} disabled={!price || busy !== null} onClick={() => void buy(id, 'sub')}>
                        {busy === id ? 'Validation…' : `S'abonner à ${TIER_NAME[tier]}`}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── Pack coach (option Pro/Expert intégrée) ────────── */}
        {tab === 'coach' && (
          <>
            <p style={{ margin: '0 0 var(--space-3)', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)' }}>Capacité</p>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
              {IAP_COACH_PACK_KEYS.map(k => {
                const p = COACH_PACKS.find(x => x.key === k)
                return p ? <button key={k} style={chip(coachPack === k)} onClick={() => setCoachPack(k)}>{p.name} · {p.maxAthletes}</button> : null
              })}
            </div>
            <p style={{ margin: '0 0 var(--space-3)', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)' }}>Option athlète incluse</p>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              <button style={chip(coachTier === 'premium')} onClick={() => setCoachTier('premium')}>Sans option</button>
              <button style={chip(coachTier === 'pro')} onClick={() => setCoachTier('pro')}>Pro</button>
              <button style={chip(coachTier === 'expert')} onClick={() => setCoachTier('expert')}>Expert</button>
            </div>
            {periodToggle}
            {loading ? skeleton : (
              <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>
                    Coach {coach?.name ?? ''}
                  </span>
                  <span style={{ ...num, fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                    {coachPrice ? `${coachPrice} / ${period === 'yearly' ? 'an' : 'mois'}` : '—'}
                  </span>
                </div>
                <p style={{ margin: 'var(--space-2) 0 var(--space-3)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mid)' }}>
                  {coach?.label}{coachTier !== 'premium' ? ` · option ${TIER_NAME[coachTier]} incluse` : ''}
                </p>
                {!coachPrice && !noPrices && (
                  <p style={{ margin: '0 0 var(--space-3)', fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-dim)' }}>
                    Cette formule n'est pas disponible à l'achat dans l'app.
                  </p>
                )}
                <button style={primaryBtn(!coachPrice || busy !== null)} disabled={!coachPrice || busy !== null || !coachId} onClick={() => coachId && void buy(coachId, 'sub')}>
                  {busy === coachId ? 'Validation…' : 'Souscrire'}
                </button>
              </div>
            )}
            <p style={{ margin: 'var(--space-4) 0 0', fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>
              Packs Académie, Élite et Fédération : offres sur mesure.{' '}
              <button style={{ ...linkBtn, padding: 0, minHeight: 0 }} onClick={() => void openWebsite('/site/support.html')}>Nous contacter</button>
            </p>
          </>
        )}

        {/* ── Tokens ─────────────────────────────────────────── */}
        {tab === 'tokens' && (
          loading ? skeleton : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {IAP_TOKEN_PRODUCTS.map(p => {
                const price = prices[p.id]
                return (
                  <div key={p.id} style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                    <div>
                      <div style={{ ...num, fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>
                        {p.amount.toLocaleString('fr-FR')} tokens
                      </div>
                      <div style={{ ...num, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mid)', marginTop: 2 }}>{price ?? '—'}</div>
                    </div>
                    <button style={{ ...primaryBtn(!price || busy !== null), width: 'auto', padding: '0 var(--space-5)' }} disabled={!price || busy !== null} onClick={() => void buy(p.id, 'tokens')}>
                      {busy === p.id ? '…' : 'Acheter'}
                    </button>
                  </div>
                )
              })}
              <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                Les tokens s'ajoutent à ton solde et n'expirent pas avec ton abonnement.
              </p>
            </div>
          )
        )}

        {/* ── Mentions obligatoires Apple ───────────────────── */}
        <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
          <p style={{ margin: '0 0 var(--space-3)', fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>
            Le paiement est débité sur ton compte Apple à la confirmation de l'achat. Les abonnements se renouvellent
            automatiquement, sauf annulation au moins 24 h avant la fin de la période en cours. Tu peux gérer ou
            résilier ton abonnement à tout moment dans les réglages de ton compte Apple.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'var(--space-2)' }}>
            <button style={linkBtn} disabled={busy !== null} onClick={() => void restore()}>{busy === 'restore' ? 'Restauration…' : 'Restaurer mes achats'}</button>
            <button style={linkBtn} onClick={() => void openExternalUrl(APPLE_SUBSCRIPTIONS_URL)}>Gérer mes abonnements</button>
            <button style={linkBtn} onClick={() => void openWebsite('/site/conditions-utilisation.html')}>Conditions d'utilisation</button>
            <button style={linkBtn} onClick={() => void openWebsite('/site/confidentialite.html')}>Confidentialité</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
