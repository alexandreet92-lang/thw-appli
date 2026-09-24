// ══════════════════════════════════════════════════════════════════════════
// Google Agenda — OAuth + API REST (Calendar v3) + moteur de sync 2 sens.
// Server-only. Nécessite GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (+ redirect).
// Sans ces variables, la connexion est simplement indisponible (status = non
// connecté) — le reste de l'app fonctionne.
// ══════════════════════════════════════════════════════════════════════════
import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token'
const CAL_API = 'https://www.googleapis.com/calendar/v3'
const SCOPES = ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/userinfo.email']

export function googleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}
function stateSecret(): string { return process.env.GOOGLE_STATE_SECRET || process.env.CRON_SECRET || 'thw-agenda' }

export function signState(userId: string): string {
  const payload = `${userId}.${Date.now()}`
  const sig = crypto.createHmac('sha256', stateSecret()).update(payload).digest('hex').slice(0, 32)
  return Buffer.from(`${payload}.${sig}`).toString('base64url')
}
export function verifyState(state: string): string | null {
  try {
    const raw = Buffer.from(state, 'base64url').toString()
    const [userId, ts, sig] = raw.split('.')
    const expected = crypto.createHmac('sha256', stateSecret()).update(`${userId}.${ts}`).digest('hex').slice(0, 32)
    if (sig !== expected) return null
    if (Date.now() - Number(ts) > 15 * 60000) return null   // état valable 15 min
    return userId
  } catch { return null }
}

export function authUrl(redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: redirectUri, response_type: 'code',
    scope: SCOPES.join(' '), access_type: 'offline', prompt: 'consent', state,
  })
  return `${GOOGLE_AUTH}?${p}`
}

interface TokenResp { access_token: string; refresh_token?: string; expires_in: number }
export async function exchangeCode(code: string, redirectUri: string): Promise<TokenResp> {
  const r = await fetch(GOOGLE_TOKEN, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  })
  if (!r.ok) throw new Error(`google token ${r.status}`)
  return await r.json() as TokenResp
}
async function refresh(refreshToken: string): Promise<TokenResp> {
  const r = await fetch(GOOGLE_TOKEN, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: refreshToken, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, grant_type: 'refresh_token' }),
  })
  if (!r.ok) throw new Error(`google refresh ${r.status}`)
  return await r.json() as TokenResp
}

export async function getUserEmail(accessToken: string): Promise<string | null> {
  try {
    const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!r.ok) return null
    const d = await r.json() as { email?: string }
    return d.email ?? null
  } catch { return null }
}

// Renvoie un access_token valide (rafraîchit si expiré), met à jour la DB.
export async function getValidToken(sb: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await sb.from('google_calendar_connections').select('access_token,refresh_token,token_expiry').eq('user_id', userId).maybeSingle()
  const c = data as { access_token?: string; refresh_token?: string; token_expiry?: string } | null
  if (!c?.access_token) return null
  const exp = c.token_expiry ? new Date(c.token_expiry).getTime() : 0
  if (exp - Date.now() > 60000) return c.access_token
  if (!c.refresh_token) return c.access_token
  try {
    const t = await refresh(c.refresh_token)
    await sb.from('google_calendar_connections').update({
      access_token: t.access_token, token_expiry: new Date(Date.now() + t.expires_in * 1000).toISOString(), updated_at: new Date().toISOString(),
    }).eq('user_id', userId)
    return t.access_token
  } catch { return c.access_token }
}

// ── API Calendar ───────────────────────────────────────────────────────────
interface GEvent { id: string; status?: string; summary?: string; description?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } }

export async function listEvents(token: string, timeMin: string, timeMax: string): Promise<GEvent[]> {
  const out: GEvent[] = []
  let pageToken: string | undefined
  do {
    const p = new URLSearchParams({ timeMin, timeMax, singleEvents: 'true', maxResults: '250', showDeleted: 'true' })
    if (pageToken) p.set('pageToken', pageToken)
    const r = await fetch(`${CAL_API}/calendars/primary/events?${p}`, { headers: { Authorization: `Bearer ${token}` } })
    if (!r.ok) break
    const d = await r.json() as { items?: GEvent[]; nextPageToken?: string }
    out.push(...(d.items ?? []))
    pageToken = d.nextPageToken
  } while (pageToken)
  return out
}
export async function insertEvent(token: string, ev: { summary: string; description?: string | null; start: string; end: string; allDay: boolean }): Promise<string | null> {
  const body = ev.allDay
    ? { summary: ev.summary, description: ev.description ?? undefined, start: { date: ev.start.slice(0, 10) }, end: { date: ev.end.slice(0, 10) } }
    : { summary: ev.summary, description: ev.description ?? undefined, start: { dateTime: ev.start }, end: { dateTime: ev.end } }
  const r = await fetch(`${CAL_API}/calendars/primary/events`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!r.ok) return null
  const d = await r.json() as { id?: string }
  return d.id ?? null
}

// ── Moteur de sync 2 sens (fenêtre glissante) ──────────────────────────────
export async function syncUser(sb: SupabaseClient, userId: string): Promise<{ pulled: number; pushed: number }> {
  const token = await getValidToken(sb, userId)
  if (!token) return { pulled: 0, pushed: 0 }
  const now = Date.now()
  const timeMin = new Date(now - 30 * 86400000).toISOString()
  const timeMax = new Date(now + 120 * 86400000).toISOString()

  // Couche « Google » de l'utilisateur (créée si absente).
  let { data: gcal } = await sb.from('agenda_calendars').select('id').eq('user_id', userId).eq('kind', 'google').maybeSingle()
  if (!gcal) {
    const ins = await sb.from('agenda_calendars').insert({ user_id: userId, name: 'Google Agenda', color: '#10B981', kind: 'google', sort: 10 }).select('id').maybeSingle()
    gcal = ins.data
  }
  const gcalId = (gcal as { id?: string } | null)?.id ?? null

  // ── PULL Google → app ──
  let pulled = 0
  const gEvents = await listEvents(token, timeMin, timeMax)
  for (const g of gEvents) {
    const allDay = !!g.start?.date
    if (g.status === 'cancelled') {
      await sb.from('agenda_events').delete().eq('user_id', userId).eq('google_event_id', g.id)
      continue
    }
    const start = g.start?.dateTime ?? (g.start?.date ? g.start.date + 'T00:00:00' : null)
    const end = g.end?.dateTime ?? (g.end?.date ? g.end.date + 'T00:00:00' : null)
    if (!start || !end) continue
    const { data: existing } = await sb.from('agenda_events').select('id').eq('user_id', userId).eq('google_event_id', g.id).maybeSingle()
    const row = {
      user_id: userId, calendar_id: gcalId, title: g.summary ?? '(sans titre)', description: g.description ?? null,
      starts_at: new Date(start).toISOString(), ends_at: new Date(end).toISOString(), all_day: allDay,
      source: 'google', google_event_id: g.id, updated_at: new Date().toISOString(),
    }
    if (existing) await sb.from('agenda_events').update(row).eq('id', (existing as { id: string }).id)
    else await sb.from('agenda_events').insert(row)
    pulled++
  }

  // ── PUSH app → Google (événements perso créés dans l'app, non encore synced) ──
  let pushed = 0
  const { data: toPush } = await sb.from('agenda_events').select('id,title,description,starts_at,ends_at,all_day')
    .eq('user_id', userId).eq('source', 'app').is('google_event_id', null)
    .gte('starts_at', timeMin).lte('starts_at', timeMax).limit(50)
  for (const e of (toPush ?? []) as Record<string, unknown>[]) {
    const gid = await insertEvent(token, { summary: (e.title as string) || '(sans titre)', description: (e.description as string) ?? null, start: e.starts_at as string, end: e.ends_at as string, allDay: !!e.all_day })
    if (gid) { await sb.from('agenda_events').update({ google_event_id: gid }).eq('id', e.id as string); pushed++ }
  }

  await sb.from('google_calendar_connections').update({ updated_at: new Date().toISOString() }).eq('user_id', userId)
  return { pulled, pushed }
}
