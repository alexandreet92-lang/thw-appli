'use client'
// Accès coach côté client (owner / payant / essai 14 j), fetch partagé.
import { useEffect, useState } from 'react'
import { getCoachAccessState, type CoachAccessState } from '@/lib/coach/owner'

const DEFAULT: CoachAccessState = { access: false, paid: false, isTrial: false, trialDaysLeft: 0, everStarted: false, expired: false }

let cached: CoachAccessState | null = null
let inflight: Promise<CoachAccessState> | null = null
const subs = new Set<(s: CoachAccessState) => void>()

async function load(): Promise<CoachAccessState> {
  if (cached) return cached
  if (inflight) return inflight
  inflight = getCoachAccessState().then(s => { cached = s; subs.forEach(f => f(s)); return s })
    .catch(() => DEFAULT).finally(() => { inflight = null })
  return inflight
}

export function refreshCoachAccess(): void { cached = null; void load() }

let lastFocusRefresh = 0

export function useCoachAccess(): CoachAccessState & { loading: boolean } {
  const [state, setState] = useState<CoachAccessState | null>(cached)
  useEffect(() => {
    let alive = true
    const on = (s: CoachAccessState) => { if (alive) setState(s) }
    subs.add(on)
    if (cached) setState(cached); else void load().then(on)
    // Au retour dans l'app (ex. après un paiement coach sur Stripe), on ré-interroge
    // l'accès coach pour débloquer l'espace coach tout de suite (throttle 8 s).
    const onFocus = () => {
      if (document.visibilityState === 'hidden') return
      const now = Date.now()
      if (now - lastFocusRefresh < 8000) return
      lastFocusRefresh = now
      refreshCoachAccess()
    }
    window.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)
    return () => { alive = false; subs.delete(on); window.removeEventListener('visibilitychange', onFocus); window.removeEventListener('focus', onFocus) }
  }, [])
  return { ...(state ?? DEFAULT), loading: state === null }
}
