// ══════════════════════════════════════════════════════════════════
// Vitrine coach (profil public) + demandes de coaching.
// ══════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'

export interface CoachSocials { instagram?: string; tiktok?: string; youtube?: string; strava?: string }

/** Diplôme / certification. */
export interface CoachDiploma { title: string; org?: string; year?: string }
/** Ligne de palmarès / résultat marquant. */
export interface CoachPalmares { title: string; year?: string }

export interface CoachProfile {
  coach_id: string
  slug: string | null
  display_name: string | null
  headline: string | null
  bio: string | null
  logo_url: string | null
  avatar_url: string | null
  website_url: string | null
  socials: CoachSocials
  sports: string[]
  location: string | null
  diplomas: CoachDiploma[]
  palmares: CoachPalmares[]
  gallery: string[]
  intro_video_url: string | null
  contact_email: string | null
  phone: string | null
  show_contact: boolean
  visibility: 'public' | 'private' | 'subscribers'
  accepting_requests: boolean
  published: boolean
}

export interface CoachingRequest {
  id: string
  athlete_id: string
  coach_id: string
  message: string | null
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

const COLS = 'coach_id, slug, display_name, headline, bio, logo_url, avatar_url, website_url, socials, sports, location, diplomas, palmares, gallery, intro_video_url, contact_email, phone, show_contact, visibility, accepting_requests, published'

function norm(r: unknown): CoachProfile {
  const p = r as CoachProfile
  return {
    ...p,
    socials: (p.socials ?? {}) as CoachSocials,
    sports: p.sports ?? [],
    diplomas: Array.isArray(p.diplomas) ? p.diplomas : [],
    palmares: Array.isArray(p.palmares) ? p.palmares : [],
    gallery: Array.isArray(p.gallery) ? p.gallery : [],
    show_contact: !!p.show_contact,
    visibility: (['public', 'private', 'subscribers'].includes(p.visibility) ? p.visibility : 'public') as CoachProfile['visibility'],
  }
}

/** Valeurs de compte (nom, avatar) pour pré-remplir un profil vierge. */
export async function getAccountDefaults(): Promise<{ full_name: string | null; avatar_url: string | null }> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { full_name: null, avatar_url: null }
  const { data } = await sb.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle()
  return { full_name: (data as { full_name?: string } | null)?.full_name ?? null, avatar_url: (data as { avatar_url?: string } | null)?.avatar_url ?? null }
}

/** Slug URL sûr à partir d'un nom (ascii, minuscules, tirets). */
export function slugify(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48)
}

export async function getMyCoachProfile(): Promise<CoachProfile | null> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data } = await sb.from('coach_profiles').select(COLS).eq('coach_id', user.id).maybeSingle()
  return data ? norm(data) : null
}

export async function getCoachProfileBySlug(slug: string): Promise<CoachProfile | null> {
  const sb = createClient()
  const { data } = await sb.from('coach_profiles').select(COLS).eq('slug', slug).eq('published', true).maybeSingle()
  return data ? norm(data) : null
}

export async function upsertMyCoachProfile(patch: Partial<CoachProfile>): Promise<CoachProfile> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const { data, error } = await sb.from('coach_profiles')
    .upsert({ coach_id: user.id, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'coach_id' })
    .select(COLS).single()
  if (error) throw new Error(error.message)
  return norm(data)
}

/** Fiche publique minimale d'un coach par id (pour attribuer un programme). */
export async function getCoachBriefById(coachId: string): Promise<CoachProfile | null> {
  const sb = createClient()
  const { data } = await sb.from('coach_profiles').select(COLS)
    .eq('coach_id', coachId).eq('published', true).maybeSingle()
  return data ? norm(data) : null
}

/** Coachs publiés qui acceptent des demandes (annuaire). */
export async function listPublishedCoaches(): Promise<CoachProfile[]> {
  const sb = createClient()
  const { data } = await sb.from('coach_profiles').select(COLS)
    .eq('published', true).eq('accepting_requests', true)
    .order('updated_at', { ascending: false }).limit(60)
  return (data ?? []).map(norm)
}

// ── Demandes de coaching ────────────────────────────────────────────
export async function requestCoaching(coachId: string, message: string): Promise<void> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Connecte-toi pour envoyer une demande.')
  const { error } = await sb.from('coaching_requests')
    .upsert({ athlete_id: user.id, coach_id: coachId, message, status: 'pending' }, { onConflict: 'athlete_id,coach_id' })
  if (error) throw new Error(error.message)
}

/** État de MA demande envers un coach (null si aucune). */
export async function myRequestTo(coachId: string): Promise<CoachingRequest | null> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data } = await sb.from('coaching_requests').select('*')
    .eq('athlete_id', user.id).eq('coach_id', coachId).maybeSingle()
  return (data as CoachingRequest) ?? null
}

/** Demandes reçues par le coach courant (avec le nom de l'athlète). */
export async function listIncomingRequests(): Promise<(CoachingRequest & { athleteName: string })[]> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return []
  const { data } = await sb.from('coaching_requests').select('*')
    .eq('coach_id', user.id).eq('status', 'pending').order('created_at', { ascending: false })
  const reqs = (data ?? []) as CoachingRequest[]
  if (!reqs.length) return []
  const ids = [...new Set(reqs.map(r => r.athlete_id))]
  const { data: profs } = await sb.from('profiles').select('id, full_name, first_name').in('id', ids)
  const nameOf = new Map((profs ?? []).map(p => [p.id as string, (p.full_name || p.first_name || 'Athlète') as string]))
  return reqs.map(r => ({ ...r, athleteName: nameOf.get(r.athlete_id) ?? 'Athlète' }))
}

/** Capacité du coach : athlètes actuels vs plafond du pack (Infinity si aucun pack). */
export async function getCoachCapacity(): Promise<{ used: number; max: number }> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { used: 0, max: 0 }
  const [countRes, subRes] = await Promise.all([
    sb.from('coach_athlete').select('id', { count: 'exact', head: true }).eq('coach_id', user.id).eq('status', 'accepted'),
    sb.from('coach_subscriptions').select('max_athletes, status').eq('user_id', user.id).maybeSingle(),
  ])
  const cs = subRes.data as { max_athletes?: number; status?: string } | null
  const active = cs && (cs.status === 'active' || cs.status === 'trialing')
  const max = active ? (cs!.max_athletes ?? 0) : Infinity   // pas de pack → pas de plafond dur (owner / coachs historiques)
  return { used: countRes.count ?? 0, max }
}

/** Le coach accepte (crée le lien coach-athlète) ou refuse une demande. */
export async function respondToRequest(req: CoachingRequest, accept: boolean): Promise<void> {
  const sb = createClient()
  if (accept) {
    const { used, max } = await getCoachCapacity()
    if (used >= max) throw new Error('CAPACITY')   // plafond du pack atteint
  }
  await sb.from('coaching_requests').update({ status: accept ? 'accepted' : 'declined' }).eq('id', req.id)
  if (accept) {
    await sb.from('coach_athlete').upsert(
      { coach_id: req.coach_id, athlete_id: req.athlete_id, status: 'accepted' },
      { onConflict: 'coach_id,athlete_id' },
    )
  }
}
