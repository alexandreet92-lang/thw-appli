// ══════════════════════════════════════════════════════════════════
// URL de retour des emails d'authentification (Supabase).
//
// POURQUOI CE FICHIER : Supabase VALIDE le `redirectTo` envoyé avec
// resetPasswordForEmail / signUp / resend contre l'allowlist
// « Authentication > URL Configuration > Redirect URLs ». Si l'URL n'y
// figure pas, GoTrue ne renvoie AUCUNE erreur : il remplace silencieusement
// la destination par la « Site URL ». L'email part, l'utilisateur clique,
// et atterrit sur l'accueil au lieu de l'écran de réinitialisation.
//
// Deux pièges qui déclenchaient exactement ça ici :
//  1. `window.location.origin` en build NATIF (Capacitor) vaut
//     capacitor://localhost — jamais dans l'allowlist, et l'app n'a de
//     toute façon pas de serveur pour servir /auth/callback.
//  2. `window.location.origin` sur un déploiement de PREVIEW Vercel
//     (URL à hash, différente à chaque déploiement) — jamais dans
//     l'allowlist non plus.
//
// → On ancre donc TOUJOURS les liens d'email sur une base publique stable :
//   NEXT_PUBLIC_SITE_URL (canonique) > NEXT_PUBLIC_API_BASE (build natif)
//   > window.location.origin (dev local / web sans variable).
// ══════════════════════════════════════════════════════════════════

// Repli utilisé si aucune variable n'est définie ET qu'on n'est pas dans un
// navigateur (rendu serveur). Correspond au domaine de production actuel.
const FALLBACK_BASE = 'https://thw-appli.vercel.app'

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

/**
 * Base publique sur laquelle pointent les liens envoyés par email.
 * Cette URL DOIT figurer dans les « Redirect URLs » du dashboard Supabase.
 */
export function authRedirectBase(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_API_BASE
  if (explicit) return stripTrailingSlash(explicit)
  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    return stripTrailingSlash(window.location.origin)
  }
  return FALLBACK_BASE
}

// Build natif (Capacitor) : le bundle est local, il n'y a pas de serveur pour
// consommer le jeton. Le lien d'email passe donc par /auth/callback?native=1
// sur Vercel, qui REBONDIT vers com.thehybridway.app://auth-callback.
const NATIVE = !!process.env.NEXT_PUBLIC_API_BASE

/**
 * URL complète de retour d'email : `<base>/auth/callback?next=<destination>`.
 * `next` doit être un chemin relatif interne (jamais une URL absolue).
 */
export function authCallbackUrl(next = '/'): string {
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/'
  const q = new URLSearchParams({ next: safeNext })
  if (NATIVE) q.set('native', '1')
  return `${authRedirectBase()}/auth/callback?${q.toString()}`
}

/**
 * Normalise le paramètre `next` reçu côté serveur : on n'accepte qu'un chemin
 * interne, pour ne pas transformer /auth/callback en redirecteur ouvert.
 */
export function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/'
  return next
}
