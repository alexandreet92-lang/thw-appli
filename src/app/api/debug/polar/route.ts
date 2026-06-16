// ════════════════════════════════════════════════════════════════════════
// ROUTE DEBUG TEMPORAIRE — diagnostic Polar sommeil (à SUPPRIMER ensuite).
//
// But : déterminer à quelle étape le sommeil casse entre Polar et THW.
// Lecture seule (aucune écriture en base). Protégée : seul l'utilisateur
// authentifié interroge SES propres données. Option d'allowlist via
// DEBUG_POLAR_USER_ID (si défini, restreint à cet user_id précis).
//
// Appel : GET /api/debug/polar  (être connecté)
// Le token n'est JAMAIS renvoyé ni loggé en clair.
//
// Robuste au token mort : si aucun token valide (expiré + refresh échoué),
// la route renvoie quand même l'état stocké (scope, expiry, last_error) et
// les compteurs DB — c'est précisément là que l'info est utile.
// ════════════════════════════════════════════════════════════════════════

export const runtime = 'nodejs'
export const maxDuration = 30

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPolarContext } from '@/lib/sync/polar'
import { callPolarV4, polarDateRange } from '@/lib/polar'

const POLAR_V4_BASE = 'https://www.polaraccesslink.com/v4/data'

interface ProbeResult {
  endpoint: string
  status: number | string
  bodyEmpty: boolean
  bodyPreview: string
  headers: Record<string, string>
}

export async function GET() {
  // ── Auth : session utilisateur uniquement ──────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allow = process.env.DEBUG_POLAR_USER_ID
  if (allow && user.id !== allow) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── 1. État stocké du token (sans le token) + compteurs DB ──────────
  const db = createServiceClient()
  const { data: row } = await db
    .from('oauth_tokens')
    .select('scope, provider_user_id, expires_at, is_active, last_error, last_used_at, updated_at')
    .eq('user_id', user.id).eq('provider', 'polar').maybeSingle()

  const scopes = (row?.scope as string | null) ?? ''
  const expiresAt = (row?.expires_at as number | null) ?? null
  const nowSec = Math.floor(Date.now() / 1000)

  const { data: sleepRows } = await db
    .from('health_data')
    .select('date, raw_data, sleep_duration_min, sleep_score')
    .eq('user_id', user.id).eq('provider', 'polar').eq('data_type', 'sleep')
    .order('date', { ascending: false }).limit(15)

  const sleepRowsArr = (sleepRows ?? []) as Array<{ date: string; raw_data: unknown; sleep_duration_min: number | null; sleep_score: number | null }>
  const sleepRawKeys = sleepRowsArr[0] && sleepRowsArr[0].raw_data && typeof sleepRowsArr[0].raw_data === 'object'
    ? Object.keys(sleepRowsArr[0].raw_data as Record<string, unknown>)
    : []

  const tokenState = {
    scope: scopes,
    scopeHasSleep: /sleep/i.test(scopes),
    scopeHasNightly: /nightly|recharge/i.test(scopes),
    providerUserIdStored: (row?.provider_user_id as string | null) ?? null,
    isActive: (row?.is_active as boolean | null) ?? null,
    lastError: (row?.last_error as string | null) ?? null,
    lastUsedAt: (row?.last_used_at as string | null) ?? null,
    expiresAt,
    expiresAtIso: expiresAt ? new Date(expiresAt * 1000).toISOString() : null,
    isExpired: expiresAt != null ? expiresAt < nowSec + 300 : null,
  }

  const dbState = {
    sleepRowCount: sleepRowsArr.length,
    lastSleepDate: sleepRowsArr[0]?.date ?? null,
    firstSleepRawKeys: sleepRawKeys,
    sleepContentMissing:
      sleepRowsArr.length > 0 &&
      sleepRowsArr.every(r => r.sleep_duration_min == null && r.sleep_score == null),
    sample: sleepRowsArr.slice(0, 5).map(r => ({
      date: r.date,
      sleep_duration_min: r.sleep_duration_min,
      sleep_score: r.sleep_score,
      raw: JSON.stringify(r.raw_data).slice(0, 120),
    })),
  }

  // ── 2. Token valide ? (rafraîchi si possible par getValidToken) ─────
  const ctx = await getPolarContext(user.id)

  async function probe(endpoint: string, params?: Record<string, string>): Promise<ProbeResult> {
    try {
      const r = await callPolarV4(endpoint, ctx!.token, params)
      const headers: Record<string, string> = {}
      r.headers.forEach((v, k) => { headers[k] = v })
      const body = await r.text()
      return {
        endpoint: `${POLAR_V4_BASE}/${endpoint}`,
        status: r.status,
        bodyEmpty: body.trim() === '' || body.trim() === '[]',
        bodyPreview: body.slice(0, 600),
        headers,
      }
    } catch (e) {
      return {
        endpoint: `${POLAR_V4_BASE}/${endpoint}`,
        status: `FETCH_ERROR: ${e instanceof Error ? e.message : String(e)}`,
        bodyEmpty: true, bodyPreview: '', headers: {},
      }
    }
  }

  // Live probes uniquement si token valide
  const { from, to } = polarDateRange(90)
  const { from: from28 } = polarDateRange(28)

  let userInfoStatus: number | string = 'SKIPPED_NO_VALID_TOKEN'
  let sleep: ProbeResult | { status: string } = { status: 'SKIPPED_NO_VALID_TOKEN' }
  let recharge: ProbeResult | { status: string } = { status: 'SKIPPED_NO_VALID_TOKEN' }

  if (ctx) {
    try { userInfoStatus = (await callPolarV4('physical-information', ctx.token)).status }
    catch (e) { userInfoStatus = `FETCH_ERROR: ${e instanceof Error ? e.message : String(e)}` }
    sleep = await probe('sleeps', { from, to })
    recharge = await probe('nightly-recharge-results', { from: from28, to })
  }

  // ── 3. Récapitulatif ────────────────────────────────────────────────
  return NextResponse.json({
    _warning: 'Route de debug TEMPORAIRE — supprimer src/app/api/debug/polar/ après diagnostic.',
    apiVersion: 'v4-dynamic',
    apiBase: POLAR_V4_BASE,
    hasValidToken: !!ctx,
    tokenState,
    dbState,
    dateRange: { from, to, nightlyFrom: from28 },
    userInfoStatus,
    sleep,
    recharge,
    notes: {
      scope: 'La colonne scope peut refléter le scope DEMANDÉ (fallback cfg.scope) si Polar ne renvoie pas de scope. Seul sleep.status live tranche.',
      userInfo: 'v4 (Dynamic API) n’a pas d’étape d’enregistrement. physical-information sert de preuve que le token résout vers un utilisateur valide.',
      sleepContent: 'Si dbState.sleepContentMissing=true et firstSleepRawKeys=[sleepDate], la LISTE sleeps ne renvoie que l’index des nuits — le DÉTAIL par nuit n’est jamais récupéré par le sync.',
    },
    interpretation: {
      'hasValidToken=false + lastError=refresh_failed': 'Le rafraîchissement du token a échoué → reconnecter Polar.',
      '403 / insufficient_scope': 'Token sans scope sommeil → reconnecter Polar.',
      '200 + body vide ([])': 'Token OK mais aucune nuit dans la fenêtre 90 j.',
      '404': 'Mauvais endpoint / mauvaise version d’API.',
    },
  })
}
