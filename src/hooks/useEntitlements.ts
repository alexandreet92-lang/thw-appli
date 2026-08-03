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
    community: s.community ?? communityEntitlements(tier, unlimited),
  }
}

async function load(): Promise<Entitlements> {
  if (cached) return cached
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const r = await fetch('/api/subscriptions/summary')
      const val = r.ok ? derive((await r.json()) as Summary) : { ...DEFAULT, loading: false }
      cached = val
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

export function useEntitlements(): Entitlements {
  const [state, setState] = useState<Entitlements>(cached ?? DEFAULT)
  useEffect(() => {
    let alive = true
    const onChange = (e: Entitlements) => { if (alive) setState(e) }
    subscribers.add(onChange)
    if (cached) setState(cached)
    else void load().then(onChange)
    return () => { alive = false; subscribers.delete(onChange) }
  }, [])
  return state
}
