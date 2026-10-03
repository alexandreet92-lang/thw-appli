// ══════════════════════════════════════════════════════════════════════════
// Envoi APNs (Apple Push Notification service) en HTTP/2, authentification par
// JETON (.p8) — aucune dépendance : node:http2 + node:crypto (ES256).
//
// Variables d'environnement (Vercel) :
//   APNS_KEY_ID      identifiant de la clé (10 caractères, Apple Developer › Keys)
//   APNS_TEAM_ID     Team ID (10 caractères, Membership)
//   APNS_KEY         contenu du fichier AuthKey_XXXX.p8 (PEM ; les \n littéraux
//                    et le base64 du fichier sont acceptés)
//   APNS_BUNDLE_ID   com.thehybridway.app (topic)
//   APNS_PRODUCTION  true (TestFlight / App Store) | false (build Xcode Debug)
//
// Robustesse : un jeton émis par un build Debug n'est valable que sur la
// passerelle SANDBOX (et inversement). Sur « BadDeviceToken » on retente donc
// automatiquement sur l'autre passerelle et on mémorise celle qui marche.
// Serveur uniquement (runtime nodejs).
// ══════════════════════════════════════════════════════════════════════════
import http2 from 'node:http2'
import { createPrivateKey, sign, type KeyObject } from 'node:crypto'

export type ApnsEnv = 'production' | 'sandbox'

const HOSTS: Record<ApnsEnv, string> = {
  production: 'https://api.push.apple.com',
  sandbox: 'https://api.sandbox.push.apple.com',
}

function env(name: string): string { return (process.env[name] ?? '').trim() }

export function apnsBundleId(): string { return env('APNS_BUNDLE_ID') || 'com.thehybridway.app' }
export function apnsDefaultEnv(): ApnsEnv { return env('APNS_PRODUCTION').toLowerCase() === 'false' ? 'sandbox' : 'production' }

/** Liste des variables manquantes (vide = APNs configuré). */
export function apnsMissingEnv(): string[] {
  return ['APNS_KEY_ID', 'APNS_TEAM_ID', 'APNS_KEY'].filter(k => !env(k))
}
export function apnsConfigured(): boolean { return apnsMissingEnv().length === 0 }

// ── Clé privée (.p8) ─────────────────────────────────────────────────────
function normalizePem(raw: string): string {
  let k = raw.trim().replace(/^["']|["']$/g, '')
  if (!k.includes('BEGIN')) {
    try {
      const decoded = Buffer.from(k, 'base64').toString('utf8')
      if (decoded.includes('BEGIN')) k = decoded.trim()
    } catch { /* pas du base64 */ }
  }
  k = k.replace(/\\n/g, '\n')
  if (!k.includes('\n')) {
    // PEM collé sur une seule ligne → reconstruit (lignes de 64 caractères).
    const body = k.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '')
    k = `-----BEGIN PRIVATE KEY-----\n${(body.match(/.{1,64}/g) ?? []).join('\n')}\n-----END PRIVATE KEY-----`
  }
  return k
}

let keyObj: KeyObject | null = null
function privateKey(): KeyObject {
  if (!keyObj) keyObj = createPrivateKey({ key: normalizePem(env('APNS_KEY')), format: 'pem' })
  return keyObj
}

const b64url = (b: Buffer): string => b.toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')

// Jeton fournisseur : Apple impose un renouvellement entre 20 et 60 min.
let jwtCache: { token: string; iat: number } | null = null
function providerToken(): string {
  const now = Math.floor(Date.now() / 1000)
  if (jwtCache && now - jwtCache.iat < 50 * 60) return jwtCache.token
  const header = b64url(Buffer.from(JSON.stringify({ alg: 'ES256', kid: env('APNS_KEY_ID') })))
  const claims = b64url(Buffer.from(JSON.stringify({ iss: env('APNS_TEAM_ID'), iat: now })))
  const input = `${header}.${claims}`
  const sig = sign('sha256', Buffer.from(input), { key: privateKey(), dsaEncoding: 'ieee-p1363' })
  jwtCache = { token: `${input}.${b64url(sig)}`, iat: now }
  return jwtCache.token
}

// ── Message ──────────────────────────────────────────────────────────────
export interface ApnsMessage {
  title: string
  body: string
  /** Page ouverte au toucher (chemin relatif de l'app, ex. /planning). */
  url?: string
  /** Regroupe / remplace (thread-id + apns-collapse-id). */
  tag?: string
  badge?: number
  subtitle?: string
}

export interface ApnsResult {
  token: string
  ok: boolean
  status: number
  reason?: string
  /** Passerelle qui a accepté (ou dernière essayée). */
  env: ApnsEnv
  /** true → jeton définitivement invalide : à supprimer. */
  dead: boolean
}

function buildPayload(m: ApnsMessage): string {
  const aps: Record<string, unknown> = {
    alert: { title: m.title, body: m.body, ...(m.subtitle ? { subtitle: m.subtitle } : {}) },
    sound: 'default',
  }
  if (m.tag) aps['thread-id'] = m.tag
  if (typeof m.badge === 'number') aps.badge = m.badge
  return JSON.stringify({ aps, url: m.url ?? '/', ...(m.tag ? { tag: m.tag } : {}) })
}

function request(session: http2.ClientHttp2Session, token: string, payload: string, collapseId?: string): Promise<{ status: number; reason?: string }> {
  return new Promise(resolve => {
    let status = 0
    let data = ''
    let settled = false
    const done = (r: { status: number; reason?: string }) => { if (!settled) { settled = true; resolve(r) } }
    try {
      const headers: http2.OutgoingHttpHeaders = {
        ':method': 'POST',
        ':path': `/3/device/${token}`,
        authorization: `bearer ${providerToken()}`,
        'apns-topic': apnsBundleId(),
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'apns-expiration': String(Math.floor(Date.now() / 1000) + 24 * 3600),
        'content-type': 'application/json',
      }
      if (collapseId) headers['apns-collapse-id'] = collapseId.slice(0, 64)
      const req = session.request(headers)
      req.setTimeout(10000, () => { try { req.close() } catch { /* ignore */ } done({ status: 0, reason: 'Timeout' }) })
      req.on('response', h => { status = Number(h[':status'] ?? 0) })
      req.setEncoding('utf8')
      req.on('data', (c: string) => { data += c })
      req.on('end', () => {
        let reason: string | undefined
        if (data) { try { reason = (JSON.parse(data) as { reason?: string }).reason } catch { reason = data.slice(0, 120) } }
        done({ status, reason })
      })
      req.on('error', e => done({ status: 0, reason: e.message }))
      req.end(payload)
    } catch (e) {
      done({ status: 0, reason: e instanceof Error ? e.message : 'request_error' })
    }
  })
}

// Sessions HTTP/2 ouvertes le temps d'un envoi groupé.
function openSession(e: ApnsEnv): http2.ClientHttp2Session {
  const s = http2.connect(HOSTS[e])
  s.on('error', () => { /* géré par requête */ })
  return s
}

const DEAD_REASONS = new Set(['Unregistered', 'DeviceTokenNotForTopic'])

/**
 * Envoie `m` à chaque jeton. `envHint` = passerelle mémorisée pour ce jeton
 * (null → APNS_PRODUCTION). Ne jette jamais.
 */
export async function sendApns(targets: { token: string; env: ApnsEnv | null }[], m: ApnsMessage): Promise<ApnsResult[]> {
  if (!apnsConfigured() || targets.length === 0) return []
  try { providerToken() } catch (e) {
    const reason = `InvalidKey: ${e instanceof Error ? e.message : 'APNS_KEY'}`
    return targets.map(t => ({ token: t.token, ok: false, status: 0, reason, env: t.env ?? apnsDefaultEnv(), dead: false }))
  }
  const payload = buildPayload(m)
  const sessions: Partial<Record<ApnsEnv, http2.ClientHttp2Session>> = {}
  const sess = (e: ApnsEnv) => (sessions[e] ??= openSession(e))

  try {
    return await Promise.all(targets.map(async ({ token, env: hint }) => {
      const first: ApnsEnv = hint ?? apnsDefaultEnv()
      let used = first
      let r = await request(sess(first), token, payload, m.tag)
      if (r.status === 400 && r.reason === 'BadDeviceToken') {
        // Jeton d'un build de l'autre environnement (Debug ↔ TestFlight) ?
        const other: ApnsEnv = first === 'production' ? 'sandbox' : 'production'
        const r2 = await request(sess(other), token, payload, m.tag)
        // Succès, ou autre erreur plus parlante → on la retient. Deux
        // BadDeviceToken d'affilée = jeton réellement invalide (supprimé).
        if (r2.status === 200 || r2.reason !== 'BadDeviceToken') { r = r2; used = other }
      }
      const ok = r.status === 200
      const dead = !ok && (r.status === 410 || DEAD_REASONS.has(r.reason ?? '') || (r.status === 400 && r.reason === 'BadDeviceToken'))
      return { token, ok, status: r.status, reason: r.reason, env: used, dead }
    }))
  } finally {
    Object.values(sessions).forEach(s => { try { s?.close() } catch { /* ignore */ } })
  }
}
