'use client'
// ══════════════════════════════════════════════════════════════════
// useEntitlements — état d'abonnement CÔTÉ CLIENT (tier, essai, gratuit).
// Source unique : /api/subscriptions/summary (getUserTier + trial_days_left).
// Un seul fetch partagé entre tous les composants (cache module + abonnés),
// pour piloter le bandeau d'essai, les verrous de fonctionnalités et l'upsell.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { communityEntitlements, type TierName, type CommunityEntitlements } from '@/lib/subscriptions/tier-limits'

export interface Entitlements {
  loading: boolean
  tier: TierName
  unlimited: boolean       // compte créateur
  trialDaysLeft: number | null
  isFree: boolean
  isTrial: boolean
  isPaid: boolean          // premium / pro / expert (ou créateur)
  community: CommunityEntitlements  // capacités « créateur » de la Communauté
}

interface Summary {
  tier?: TierName
  unlimited?: boolean
  trial_days_left?: number | null
  community?: CommunityEntitlements
}

const DEFAULT: Entitlements = {
  loading: true, tier: 'premium', unlimited: false,
  trialDaysLeft: null, isFree: false, isTrial: false, isPaid: true,
  community: communityEntitlements('premium'),
}

// ── Cache module : une seule requête réseau partagée ────────────────
let cached: Entitlements | null = null
let inflight: Promise<Entitlements> | null = null
const subscribers = new Set<(e: Entitlements) => void>()

function derive(s: Summary): Entitlements {
  const tier = (s.tier ?? 'premium') as TierName
  const unlimited = !!s.unlimited
  const isFree = !unlimited && tier === 'free'
  const isTrial = !unlimited && tier === 'trial'
  return {
    loading: false, tier, unlimited,
    trialDaysLeft: s.trial_days_left ?? null,
    isFree, isTrial, isPaid: unlimited || (!isFree && !isTrial),
    // JSON ne transporte pas Infinity (sérialisé en null par l'API) : on restaure
    // les quotas illimités côté client pour que isFinite(...) se comporte bien.
    community: s.community
      ? { ...s.community, maxSpaces: s.community.maxSpaces ?? Infinity, maxMembers: s.community.maxMembers ?? Infinity }
      : communityEntitlements(tier, unlimited),
  }
}

const PAID_TIERS = new Set<TierName>(['premium', 'pro', 'expert'])

// Dernière formule CONNUE (persistée) : sert à détecter un changement (après un
// paiement) pour déclencher l'animation « nouvel abonnement ».
function readLastTier(): TierName | null {
  try { return (localStorage.getItem('thw_last_tier') as TierName | null) || null } catch { return null }
}
function writeLastTier(t: TierName): void {
  try { localStorage.setItem('thw_last_tier', t) } catch { /* ignore */ }
}

// Détecte un changement vers une formule PAYANTE différente → événement global
// que l'hôte d'animation écoute. On ne fête pas le tout premier chargement.
function maybeAnnouncePlanChange(next: Entitlements): void {
  if (typeof window === 'undefined' || next.loading) return
  const prev = readLastTier()
  writeLastTier(next.tier)
  if (prev === null) return                    // premier chargement → pas d'anim
  if (prev === next.tier) return               // inchangé
  if (!PAID_TIERS.has(next.tier)) return       // on ne fête pas free/trial
  try { window.dispatchEvent(new CustomEvent('thw:plan-activated', { detail: { tier: next.tier, previous: prev } })) } catch { /* ignore */ }
}

async function load(): Promise<Entitlements> {
  if (cached) return cached
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const r = await fetch('/api/subscriptions/summary')
      const val = r.ok ? derive((await r.json()) as Summary) : { ...DEFAULT, loading: false }
      cached = val
      maybeAnnouncePlanChange(val)
      subscribers.forEach(fn => fn(val))
      return val
    } catch {
      const val = { ...DEFAULT, loading: false }
      cached = val
      return val
    } finally {
      inflight = null
    }
  })()
  return inflight
}

/** Force un rechargement (ex. après un achat / changement d'abonnement). */
export function refreshEntitlements(): void {
  cached = null
  void load()
}

// Rafraîchissement automatique : au RETOUR sur l'app (l'utilisateur revient d'un
// paiement web) et à la reprise de focus/visibilité → les nouveaux droits
// s'appliquent immédiatement, sans redémarrer l'app. Throttlé à 8 s.
let autoRefreshArmed = false
let lastRefreshAt = 0
function armAutoRefresh(): void {
  if (autoRefreshArmed || typeof window === 'undefined') return
  autoRefreshArmed = true
  const tick = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    const now = Date.now()
    if (now - lastRefreshAt < 8000) return
    lastRefreshAt = now
    refreshEntitlements()
  }
  window.addEventListener('visibilitychange', tick)
  window.addEventListener('focus', tick)
}

export function useEntitlements(): Entitlements {
  const [state, setState] = useState<Entitlements>(cached ?? DEFAULT)
  useEffect(() => {
    let alive = true
    armAutoRefresh()
    const onChange = (e: Entitlements) => { if (alive) setState(e) }
    subscribers.add(onChange)
    if (cached) setState(cached)
    else void load().then(onChange)
    return () => { alive = false; subscribers.delete(onChange) }
  }, [])
  return state
}
