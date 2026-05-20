/**
 * Polar AccessLink v3 — client HTTP partagé
 *
 * UNE SEULE implémentation utilisée par :
 *   - le live test  (GET /api/sync/polar?live=1)
 *   - le sync réel  (POST /api/sync/polar)
 *
 * Garantit que les deux modes appellent l'API Polar avec
 * les mêmes headers, la même URL, les mêmes options fetch.
 */

const POLAR_BASE = 'https://www.polaraccesslink.com'

/**
 * Appelle l'API Polar AccessLink.
 *
 * @param endpointOrUrl  Soit un chemin absolu  ('/v3/users/123/physical-information')
 *                       Soit une URL complète  ('https://www.polaraccesslink.com/v3/...')
 *                       Les resource-uri retournés par Polar sont des URLs complètes.
 * @param token          Bearer token OAuth2
 * @param method         GET (défaut) | POST | PUT
 */
export async function callPolarAPI(
  endpointOrUrl: string,
  token: string,
  method: 'GET' | 'POST' | 'PUT' = 'GET',
): Promise<Response> {
  const url = endpointOrUrl.startsWith('http')
    ? endpointOrUrl
    : `${POLAR_BASE}${endpointOrUrl}`

  console.log(`[Polar API] ${method} ${url} | token[0:8]: ${token.slice(0, 8)}`)

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept:        'application/json',
    },
    cache: 'no-store',
  })

  console.log(`[Polar API] ${method} ${url.replace(POLAR_BASE, '')} → ${res.status}`)
  return res
}
