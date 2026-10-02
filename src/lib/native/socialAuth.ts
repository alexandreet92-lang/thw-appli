'use client'
// ══════════════════════════════════════════════════════════════════════════
// Connexion sociale — Sign in with Apple + Google, web ET app native iOS.
//
//  • Apple sur iOS natif : feuille NATIVE « Sign in with Apple »
//    (@capacitor-community/apple-sign-in) → identityToken signé par Apple, que
//    Supabase vérifie (signInWithIdToken). Nonce : on génère un nonce brut
//    aléatoire, on donne son SHA-256 (hex) à Apple — qui le recopie dans le
//    jeton — et le nonce BRUT à Supabase, qui le re-hache pour comparer.
//    Apple ne transmet le nom qu'à la PREMIÈRE autorisation : on l'enregistre
//    tout de suite (métadonnées du compte + profiles.full_name).
//  • Repli (plugin absent, Android, build sans le plugin) et Google partout :
//    OAuth Supabase classique. Web → redirection pleine page ; natif → Safari
//    (Capacitor Browser) puis retour dans l'app par /auth/callback?native=1 qui
//    rebondit vers com.thehybridway.app://auth-callback (géré par ClientShell).
// ══════════════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import { isNativeApp, isIOS } from './platform'

export type SocialProvider = 'apple' | 'google'

/** Issue d'une tentative de connexion sociale. */
export type SocialOutcome =
  /** Session ouverte sur place (Apple natif) → l'appelant entre dans l'app. */
  | { kind: 'signedIn' }
  /** Le flux continue ailleurs (redirection web ou Safari natif). */
  | { kind: 'redirect' }
  /** Annulé par l'utilisateur → rien à afficher. */
  | { kind: 'cancelled' }
  /** Échec. `reason` oriente le message affiché. */
  | { kind: 'error'; reason: 'provider_disabled' | 'network' | 'failed'; detail?: string }

// Identifiant de l'app iOS (= « Client ID » natif déclaré côté Supabase › Apple).
const BUNDLE_ID = 'com.thehybridway.app'
// Base publique du site (rebond OAuth natif). Défini dans le build Capacitor.
const NATIVE_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://thw-appli.vercel.app'

// ── Nonce ─────────────────────────────────────────────────────────────────
function toHex(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0')
  return s
}

/** Nonce brut aléatoire (hex, 64 caractères). */
export function randomNonce(bytes = 32): string {
  const buf = new Uint8Array(bytes)
  globalThis.crypto.getRandomValues(buf)
  return toHex(buf)
}

// SHA-256 de secours (WebView sans crypto.subtle — contexte non « sécurisé »).
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

function sha256Js(msg: Uint8Array): Uint8Array {
  const len = msg.length
  const total = Math.ceil((len + 9) / 64) * 64
  const buf = new Uint8Array(total)
  buf.set(msg)
  buf[len] = 0x80
  const view = new DataView(buf.buffer)
  view.setUint32(total - 8, Math.floor((len * 8) / 0x100000000))
  view.setUint32(total - 4, (len * 8) >>> 0)
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19])
  const w = new Uint32Array(64)
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n))
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4)
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }
    let [a, b, c, d, e, f, g, hh] = [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7]]
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + maj) >>> 0
      hh = g; g = f; f = e; e = (d + t1) >>> 0
      d = c; c = b; b = a; a = (t1 + t2) >>> 0
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0
  }
  const out = new Uint8Array(32)
  const ov = new DataView(out.buffer)
  for (let i = 0; i < 8; i++) ov.setUint32(i * 4, h[i])
  return out
}

/** SHA-256 hexadécimal (WebCrypto, repli JS pur). */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const subtle = globalThis.crypto?.subtle
  if (subtle) {
    try { return toHex(new Uint8Array(await subtle.digest('SHA-256', data))) } catch { /* repli */ }
  }
  return toHex(sha256Js(data))
}

// ── Erreurs ───────────────────────────────────────────────────────────────
function messageOf(e: unknown): string {
  if (!e) return ''
  if (typeof e === 'string') return e
  const o = e as { message?: unknown; errorMessage?: unknown; code?: unknown }
  return String(o.message ?? o.errorMessage ?? o.code ?? '')
}

// ASAuthorizationError.canceled = 1001 (« … AuthorizationError error 1001 »).
function isCancel(e: unknown): boolean {
  return /\b1001\b|cancel|annul/i.test(messageOf(e))
}

// Plugin non embarqué dans le binaire (ancien build, Android, `cap sync` oublié).
function isUnavailable(e: unknown): boolean {
  const code = (e as { code?: unknown } | null)?.code
  return code === 'UNIMPLEMENTED' || /not implemented|unimplemented|not available/i.test(messageOf(e))
}

function classify(e: unknown): SocialOutcome {
  const m = messageOf(e)
  if (/provider is not enabled|unsupported provider|provider.*disabled/i.test(m)) return { kind: 'error', reason: 'provider_disabled', detail: m }
  if (/fetch|network|timeout|offline/i.test(m)) return { kind: 'error', reason: 'network', detail: m }
  return { kind: 'error', reason: 'failed', detail: m }
}

// ── Nom renvoyé par Apple (première autorisation uniquement) ────────────────
async function saveAppleName(userId: string | undefined, given: string | null, family: string | null): Promise<void> {
  const first = (given ?? '').trim()
  const last = (family ?? '').trim()
  const full = [first, last].filter(Boolean).join(' ')
  if (!userId || !full) return
  const sb = createClient()
  // Métadonnées du compte (lues par l'IA et les mails), comme ProfileCompletion.
  try { await sb.auth.updateUser({ data: { full_name: full, first_name: first || null, last_name: last || null } }) } catch { /* best-effort */ }
  // profiles.full_name : la source affichée partout (salutation, sidebar…).
  // On n'écrase JAMAIS un nom déjà saisi par l'utilisateur.
  try {
    const res: { data: { full_name: string | null } | null } = await sb.from('profiles').select('full_name').eq('id', userId).maybeSingle()
    if (res.data && (res.data.full_name ?? '').trim()) return
    const withFirst: { error: unknown } = await sb.from('profiles').update({ full_name: full, first_name: first || null }).eq('id', userId)
    if (withFirst.error) await sb.from('profiles').update({ full_name: full }).eq('id', userId)
  } catch { /* best-effort : la connexion reste valide */ }
}

// ── Apple natif ───────────────────────────────────────────────────────────
/** null = plugin indisponible → l'appelant bascule sur l'OAuth navigateur. */
async function appleNative(): Promise<SocialOutcome | null> {
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (!Capacitor.isPluginAvailable('SignInWithApple')) return null
  } catch { return null }

  const { SignInWithApple } = await import('@capacitor-community/apple-sign-in')
  const rawNonce = randomNonce()
  const hashedNonce = await sha256Hex(rawNonce)

  let identityToken = ''
  let givenName: string | null = null
  let familyName: string | null = null
  try {
    const res = await SignInWithApple.authorize({
      clientId: BUNDLE_ID,
      redirectURI: `${NATIVE_BASE}/auth/callback`,
      scopes: 'email name',
      nonce: hashedNonce,
    })
    identityToken = res.response.identityToken
    givenName = res.response.givenName
    familyName = res.response.familyName
  } catch (e) {
    if (isUnavailable(e)) return null
    if (isCancel(e)) return { kind: 'cancelled' }
    return classify(e)
  }
  if (!identityToken) return { kind: 'error', reason: 'failed', detail: 'missing identity token' }

  const sb = createClient()
  const { data, error } = await sb.auth.signInWithIdToken({ provider: 'apple', token: identityToken, nonce: rawNonce })
  if (error) return classify(error)
  await saveAppleName(data.user?.id, givenName, familyName)
  return { kind: 'signedIn' }
}

// ── OAuth (web + Safari natif) ─────────────────────────────────────────────
async function oauth(provider: SocialProvider, next: string): Promise<SocialOutcome> {
  const sb = createClient()
  const q = new URLSearchParams()
  if (next !== '/') q.set('next', next)
  const qs = q.toString()
  if (isNativeApp()) {
    // Google refuse les webviews intégrées → Safari (Capacitor Browser). Retour
    // via /auth/callback?native=1 (déjà autorisé dans Supabase) qui rebondit
    // vers com.thehybridway.app://auth-callback → ClientShell échange le code.
    const { data, error } = await sb.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${NATIVE_BASE}/auth/callback?native=1${qs ? `&${qs}` : ''}`, skipBrowserRedirect: true },
    })
    if (error) return classify(error)
    if (!data?.url) return { kind: 'error', reason: 'failed' }
    try {
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url: data.url })
    } catch (e) { return classify(e) }
    return { kind: 'redirect' }
  }
  const { error } = await sb.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/auth/callback${qs ? `?${qs}` : ''}` },
  })
  if (error) return classify(error)
  return { kind: 'redirect' }
}

/**
 * Lance la connexion Apple ou Google selon la plateforme. Ne jette jamais.
 * `next` : chemin interne où atterrir après l'OAuth (validé par /auth/callback).
 */
export async function signInWithProvider(provider: SocialProvider, next = '/'): Promise<SocialOutcome> {
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/'
  try {
    if (provider === 'apple' && isNativeApp() && isIOS()) {
      const native = await appleNative()
      if (native) return native
    }
    return await oauth(provider, safeNext)
  } catch (e) {
    if (isCancel(e)) return { kind: 'cancelled' }
    return classify(e)
  }
}

/**
 * App native : prévient quand l'utilisateur ferme Safari sans terminer l'OAuth
 * (bouton « OK »), pour relâcher l'état « chargement » du bouton. No-op web.
 */
export async function onNativeBrowserClosed(cb: () => void): Promise<() => void> {
  if (!isNativeApp()) return () => {}
  try {
    const { Browser } = await import('@capacitor/browser')
    const h = await Browser.addListener('browserFinished', cb)
    return () => { void h.remove() }
  } catch { return () => {} }
}
