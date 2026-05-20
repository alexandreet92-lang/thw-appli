/**
 * Polar Dynamic API v4 — client HTTP partagé
 *
 * Base : https://www.polaraccesslink.com/v4/data
 * Utilisé par le live test ET le sync réel — UNE seule implémentation.
 *
 * Les endpoints v4 n'ont PAS de user ID dans l'URL.
 * Le Bearer token identifie l'utilisateur.
 */

const POLAR_V4_BASE = 'https://www.polaraccesslink.com/v4/data'

/**
 * Appelle un endpoint Polar v4.
 *
 * @param endpoint   Nom de l'endpoint ex: 'sleeps', 'exercises'
 *                   Ou URL complète si elle commence par 'http'
 * @param token      Bearer token OAuth2
 * @param params     Query params (?from=...&to=...)
 * @param method     GET (défaut) ou POST
 */
export async function callPolarV4(
  endpoint: string,
  token: string,
  params?: Record<string, string>,
  method: 'GET' | 'POST' = 'GET',
): Promise<Response> {
  const url = endpoint.startsWith('http')
    ? new URL(endpoint)
    : new URL(`${POLAR_V4_BASE}/${endpoint}`)

  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  console.log(`[Polar v4] ${method} ${url.toString()} | token[0:8]: ${token.slice(0, 8)}`)

  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept:        'application/json',
    },
    cache: 'no-store',
  })

  console.log(`[Polar v4] ${method} /${endpoint.replace(POLAR_V4_BASE, '')} → ${res.status}`)
  return res
}

/** Construit la plage de dates (YYYY-MM-DD) pour les requêtes v4 */
export function polarDateRange(daysBack = 90): { from: string; to: string } {
  const to   = new Date().toISOString().split('T')[0]
  const from = new Date(Date.now() - daysBack * 86400000).toISOString().split('T')[0]
  return { from, to }
}
