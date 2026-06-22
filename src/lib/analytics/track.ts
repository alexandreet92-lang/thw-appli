'use client'

// ══════════════════════════════════════════════════════════════════
// Tracking comportemental — DÉSACTIVÉ PAR DÉFAUT.
//
// ⚠️ Ne collecte STRICTEMENT RIEN tant que les DEUX conditions ne sont pas
// réunies : NEXT_PUBLIC_ANALYTICS_ENABLED === 'true'  ET  consentement analytics
// donné par l'utilisateur. Garder le flag à `false` jusqu'à la mise en ligne de
// la politique de confidentialité + du bandeau de consentement (analytics non
// essentiel). Voir PROMPT_ADMIN_STATS.md §5.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const ENABLED = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true'

function hasConsent(): boolean {
  if (typeof window === 'undefined') return false
  try { return window.localStorage.getItem('thw_analytics_consent') === 'granted' } catch { return false }
}

/** La collecte ne tourne que si le flag ET le consentement sont présents. */
export function analyticsActive(): boolean {
  return ENABLED && hasConsent()
}

let sessionId: string | null = null
function getSession(): string {
  if (sessionId) return sessionId
  try {
    sessionId = window.sessionStorage.getItem('thw_sid')
    if (!sessionId) { sessionId = crypto.randomUUID(); window.sessionStorage.setItem('thw_sid', sessionId) }
  } catch { sessionId = crypto.randomUUID() }
  return sessionId
}

export async function track(
  eventName: string,
  props: Record<string, unknown> = {},
  opts?: { path?: string; fromPath?: string; durationMs?: number },
): Promise<void> {
  if (!analyticsActive()) return
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    await sb.from('analytics_events').insert({
      user_id: user.id,
      session_id: getSession(),
      event_name: eventName,
      path: opts?.path ?? (typeof window !== 'undefined' ? window.location.pathname : null),
      from_path: opts?.fromPath ?? null,
      duration_ms: opts?.durationMs ?? null,
      is_mobile: typeof window !== 'undefined' ? window.matchMedia('(pointer: coarse)').matches : null,
      properties: props,
    })
  } catch { /* non-bloquant */ }
}

/** Fonctionnalité utilisée (clic d'une action produit). No-op si collecte inactive. */
export function trackFeature(name: string, props: Record<string, unknown> = {}): void {
  void track('feature_used', props, { path: name })
}

/**
 * Mesure le temps passé sur une page : on enregistre l'entrée et on envoie la
 * durée à la sortie (visibilitychange/pagehide). No-op si collecte inactive.
 * À câbler dans un layout client une fois la collecte autorisée.
 */
export function usePageView(path: string): void {
  const enter = useRef<number>(0)
  useEffect(() => {
    if (!analyticsActive()) return
    enter.current = Date.now()
    const flush = () => {
      const dur = Date.now() - enter.current
      if (dur > 0) void track('page_view', {}, { path, durationMs: dur })
      enter.current = Date.now()
    }
    const onVis = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      flush()
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [path])
}
