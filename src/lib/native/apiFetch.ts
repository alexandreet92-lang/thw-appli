'use client'
// ══════════════════════════════════════════════════════════════════════════
// Phase 5 (app native Capacitor) : le bundle est packagé EN LOCAL (capacitor://),
// mais les routes /api restent sur Vercel. Ce patch redirige les appels
// relatifs vers l'API Vercel (base absolue) et y ajoute le token d'auth Supabase
// (Authorization: Bearer …) — car les cookies ne traversent pas en cross-origin.
//
// Activé UNIQUEMENT quand NEXT_PUBLIC_API_BASE est défini (build Capacitor).
// En web normal (base vide) → no-op total, zéro impact.
// ══════════════════════════════════════════════════════════════════════════

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ''

// Récupère le token d'accès Supabase depuis le localStorage (clé sb-<ref>-auth-token).
function supabaseAccessToken(): string | null {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const ref = url.match(/https:\/\/([^.]+)\./)?.[1]
    if (!ref) return null
    const raw = localStorage.getItem(`sb-${ref}-auth-token`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // supabase-js v2 : { access_token } ; anciennes variantes : { currentSession }
    return parsed?.access_token ?? parsed?.currentSession?.access_token ?? (Array.isArray(parsed) ? parsed[0] : null) ?? null
  } catch { return null }
}

function isApiPath(p: string): boolean {
  return p.startsWith('/api/') || p.startsWith('/auth/callback')
}

export function installNativeApiFetch(): void {
  if (!API_BASE) return                        // web normal → rien
  if (typeof window === 'undefined') return
  const w = window as unknown as { __thwApiFetch?: boolean; fetch: typeof fetch }
  if (w.__thwApiFetch) return
  w.__thwApiFetch = true

  const orig = window.fetch.bind(window)
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
      // Uniquement les chemins relatifs vers NOTRE API (pas les URL absolues Supabase/externes).
      if (rawUrl && rawUrl.startsWith('/') && isApiPath(rawUrl)) {
        const headers = new Headers(init?.headers || (typeof input !== 'string' && !(input instanceof URL) ? (input as Request).headers : undefined))
        const token = supabaseAccessToken()
        if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
        return orig(API_BASE + rawUrl, { ...init, headers, credentials: 'omit' })
      }
    } catch { /* fallback → fetch normal */ }
    return orig(input as RequestInfo, init)
  }) as typeof fetch
}
