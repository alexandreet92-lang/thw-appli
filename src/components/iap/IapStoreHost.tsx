'use client'
// ══════════════════════════════════════════════════════════════════
// Boutique d'achat in-app (Apple) — logique : prix Apple, achat, restauration.
// L'affichage est dans IapStoreSheet. App iOS uniquement ; ouverte par
// openIapStore(tab) depuis n'importe quel écran. Le webhook RevenueCat
// débloque l'accès côté serveur.
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
import { IAP_STORE_EVENT } from '@/lib/iap/store-events'
import { IapStoreSheet, type Msg, type StoreTab } from './IapStoreSheet'

const APPLE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions'
const TIER_NAME: Record<AthleteTier, string> = { premium: 'Premium', pro: 'Pro', expert: 'Expert' }

async function fetchTier(): Promise<string | null> {
  try {
    const r = await fetch('/api/subscriptions/summary')
    if (!r.ok) return null
    const j = await r.json() as { tier?: string }
    return j.tier ?? null
  } catch { return null }
}

export function IapStoreHost() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(false)
  const [tab, setTab] = useState<StoreTab>('athlete')
  const [period, setPeriod] = useState<BillingPeriod>('monthly')
  const [selectedTier, setSelectedTier] = useState<AthleteTier>('pro')
  const [coachPack, setCoachPack] = useState<CoachPackKey>('coach10')
  const [coachTier, setCoachTier] = useState<AthleteTier>('premium')
  const [selectedToken, setSelectedToken] = useState('tokens_500k')
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<Msg | null>(null)

  const close = useCallback(() => { setShown(false); setTimeout(() => setOpen(false), 260) }, [])

  // Ouverture via événement + chargement des prix Apple.
  useEffect(() => {
    if (!isNativeApp()) return
    const on = (e: Event) => {
      const wanted = (e as CustomEvent<{ tab?: StoreTab }>).detail?.tab ?? 'athlete'
      setTab(wanted); setMsg(null); setOpen(true); setLoading(true)
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

  const athleteTiers = useMemo(() => (['premium', 'pro', 'expert'] as AthleteTier[]).map(tier => ({
    tier, name: TIER_NAME[tier],
    subtitle: tier === 'premium' ? t('misc.planPremiumSubtitle') : tier === 'pro' ? t('misc.planProSubtitle') : t('misc.planExpertSubtitle'),
  })), [t])

  const coachPacks = useMemo(() => IAP_COACH_PACK_KEYS.flatMap(k => {
    const p = COACH_PACKS.find(x => x.key === k)
    return p ? [{ key: k, name: p.name, label: p.label }] : []
  }), [])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <IapStoreSheet
      shown={shown} tab={tab} onTab={setTab}
      labels={{ close: t('w3c.close'), monthly: t('misc.monthly'), yearly: t('misc.yearly') }}
      prices={prices} loading={loading} busy={busy} msg={msg} onClose={close}
      athleteTiers={athleteTiers} athleteId={athleteProductId} period={period} onPeriod={setPeriod}
      selectedTier={selectedTier} onSelectTier={setSelectedTier}
      coachPacks={coachPacks} coachPack={coachPack} onCoachPack={setCoachPack}
      coachTier={coachTier} onCoachTier={setCoachTier} coachId={(pack, tier) => coachProductId(pack, tier, period)}
      tokens={IAP_TOKEN_PRODUCTS} selectedToken={selectedToken} onSelectToken={setSelectedToken}
      onBuy={(id, kind) => void buy(id, kind)} onRestore={() => void restore()}
      onManage={() => void openExternalUrl(APPLE_SUBSCRIPTIONS_URL)}
      onTerms={() => void openWebsite('/site/conditions-utilisation.html')}
      onPrivacy={() => void openWebsite('/site/confidentialite.html')}
      onContact={() => void openWebsite('/site/support.html')}
    />,
    document.body,
  )
}
