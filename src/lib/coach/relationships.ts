// ══════════════════════════════════════════════════════════════
// COACH ↔ ATHLÈTE — helpers de relation (côté client, RLS).
// ──────────────────────────────────────────────────────────────
// Le lien exige le CONSENTEMENT de l'athlète : le coach génère une
// invitation (code), l'athlète l'accepte via accept_coach_invite (RPC
// SECURITY DEFINER). Chacun peut révoquer à tout moment.
// ══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/client'
import { emitServerEvent } from '@/lib/notifications/clientEvents'

export type CoachLinkStatus = 'pending' | 'accepted' | 'revoked'

export interface CoachAthleteLink {
  id: string
  coach_id: string
  athlete_id: string | null
  code: string | null
  status: CoachLinkStatus
  created_at: string
  accepted_at: string | null
  revoked_at: string | null
}

// Profil minimal d'un athlète (lisible par son coach grâce à la RLS coach).
export interface AthleteSummary {
  id: string
  full_name: string | null
  first_name: string | null
  avatar_url: string | null
  last_seen_at: string | null
  linkId: string
  since: string | null
}

async function uid(): Promise<string> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Non connecté')
  return user.id
}

// Code d'invitation court, lisible, non ambigu (pas de O/0/I/1).
function makeCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  const arr = new Uint32Array(8)
  ;(globalThis.crypto ?? window.crypto).getRandomValues(arr)
  for (let i = 0; i < 8; i++) s += alphabet[arr[i] % alphabet.length]
  return `${s.slice(0, 4)}-${s.slice(4)}`
}

// Le coach crée une invitation → renvoie le code à partager avec l'athlète.
export async function createInvite(): Promise<{ id: string; code: string }> {
  const sb = createClient()
  const coachId = await uid()
  // Quelques tentatives en cas de collision de code (unique).
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = makeCode()
    const { data, error } = await sb.from('coach_athlete')
      .insert({ coach_id: coachId, code, status: 'pending' })
      .select('id, code').single()
    if (!error && data) return { id: data.id as string, code: data.code as string }
    if (error && !/duplicate|unique/i.test(error.message)) throw new Error(error.message)
  }
  throw new Error('Impossible de générer une invitation — réessaie.')
}

// L'athlète accepte une invitation par code (consentement).
// Le code est stocké au format « XXXX-YYYY » (voir makeCode), mais la saisie en
// cellules (CodeInput) ne transporte pas le tiret. On normalise ici (on retire
// tout séparateur puis on ré-insère le tiret) pour matcher exactement la valeur
// stockée en base — sans ça, la comparaison échoue et l'invitation paraît « invalide ».
export async function acceptInvite(code: string): Promise<void> {
  const sb = createClient()
  const raw = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  const clean = raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw
  const { error } = await sb.rpc('accept_coach_invite', { invite_code: clean })
  if (error) {
    // Capacité du pack coach atteinte → message clair pour l'athlète.
    if (error.message.includes('CAPACITY_FULL')) {
      throw new Error('Ce coach a atteint la limite d\'athlètes de son abonnement. Contacte-le pour qu\'il augmente sa capacité.')
    }
    throw new Error(error.message.replace(/^.*?:/, '').trim() || 'Invitation invalide')
  }
  // Prévient (côté serveur) le coach que l'athlète a rejoint son roster.
  emitServerEvent('joined', {})
}

// Révoque un lien (annule une invitation, ou met fin au coaching). Utilisable
// par le coach OU l'athlète (chacun de son côté).
export async function revokeLink(linkId: string): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('coach_athlete')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('id', linkId)
  if (error) throw new Error(error.message)
}

// Invitations en attente créées par le coach (codes encore valides).
export async function listPendingInvites(): Promise<CoachAthleteLink[]> {
  const sb = createClient()
  const coachId = await uid()
  const { data } = await sb.from('coach_athlete')
    .select('*').eq('coach_id', coachId).eq('status', 'pending')
    .order('created_at', { ascending: false })
  return (data ?? []) as CoachAthleteLink[]
}

// Athlètes acceptés du coach + leur profil (lisible via la RLS coach).
export async function listMyAthletes(): Promise<AthleteSummary[]> {
  const sb = createClient()
  const coachId = await uid()
  const { data: links } = await sb.from('coach_athlete')
    .select('id, athlete_id, accepted_at').eq('coach_id', coachId).eq('status', 'accepted')
    .order('accepted_at', { ascending: false })
  const rows = (links ?? []) as { id: string; athlete_id: string; accepted_at: string | null }[]
  if (!rows.length) return []
  const ids = rows.map(r => r.athlete_id)
  const { data: profs } = await sb.from('profiles')
    .select('id, full_name, first_name, avatar_url, last_seen_at').in('id', ids)
  const byId = new Map((profs ?? []).map(p => [p.id as string, p as Record<string, unknown>]))
  return rows.map(r => {
    const p = byId.get(r.athlete_id)
    return {
      id: r.athlete_id,
      full_name: (p?.full_name as string | null) ?? null,
      first_name: (p?.first_name as string | null) ?? null,
      avatar_url: (p?.avatar_url as string | null) ?? null,
      last_seen_at: (p?.last_seen_at as string | null) ?? null,
      linkId: r.id,
      since: r.accepted_at,
    }
  })
}

// Coachs de l'athlète courant (pour qu'il voie/gère qui le coache).
export async function listMyCoaches(): Promise<{ linkId: string; coachId: string; since: string | null }[]> {
  const sb = createClient()
  const me = await uid()
  const { data } = await sb.from('coach_athlete')
    .select('id, coach_id, accepted_at').eq('athlete_id', me).eq('status', 'accepted')
    .order('accepted_at', { ascending: false })
  return ((data ?? []) as { id: string; coach_id: string; accepted_at: string | null }[])
    .map(r => ({ linkId: r.id, coachId: r.coach_id, since: r.accepted_at }))
}

// Suis-je coach d'au moins un athlète accepté ? (pour afficher le mode coach)
export async function hasAthletes(): Promise<boolean> {
  const sb = createClient()
  const coachId = await uid()
  const { count } = await sb.from('coach_athlete')
    .select('id', { count: 'exact', head: true })
    .eq('coach_id', coachId).eq('status', 'accepted')
  return (count ?? 0) > 0
}
