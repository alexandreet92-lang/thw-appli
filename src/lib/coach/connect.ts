'use client'
// ══════════════════════════════════════════════════════════════════
// Stripe Connect côté client : onboarding du coach vendeur + statut + gains.
// ══════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'

export interface ConnectStatus { connected: boolean; chargesEnabled: boolean; payoutsEnabled: boolean }

/** Démarre (ou reprend) l'inscription Stripe Connect ; renvoie l'URL hébergée. */
export async function startConnectOnboarding(): Promise<string> {
  const res = await fetch('/api/coach/connect/onboard', { method: 'POST' })
  const json = await res.json() as { url?: string; error?: string }
  if (!res.ok || !json.url) throw new Error(json.error ?? 'Impossible de démarrer l’inscription.')
  return json.url
}

export async function getConnectStatus(): Promise<ConnectStatus> {
  const res = await fetch('/api/coach/connect/status')
  const json = await res.json() as ConnectStatus & { error?: string }
  if (!res.ok) throw new Error(json.error ?? 'Statut indisponible.')
  return { connected: !!json.connected, chargesEnabled: !!json.chargesEnabled, payoutsEnabled: !!json.payoutsEnabled }
}

/** Gains du coach (somme des achats de ses programmes, net de commission). */
export async function getCoachEarnings(): Promise<{ gross: number; fee: number; net: number; sales: number }> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { gross: 0, fee: 0, net: 0, sales: 0 }
  const { data } = await sb.from('program_purchases')
    .select('amount_cents, platform_fee_cents').eq('coach_id', user.id).eq('status', 'active')
  const rows = (data ?? []) as { amount_cents: number; platform_fee_cents: number }[]
  const gross = rows.reduce((s, r) => s + (r.amount_cents ?? 0), 0)
  const fee = rows.reduce((s, r) => s + (r.platform_fee_cents ?? 0), 0)
  return { gross, fee, net: gross - fee, sales: rows.length }
}
