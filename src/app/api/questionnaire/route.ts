import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// ── Types ──────────────────────────────────────────────────────────

interface AutreCourse {
  nom: string
  date?: string
  importance?: 'A' | 'B' | 'C'
  temps_vise?: string
}

// Tous les champs acceptent string pour gérer les envois de formulaires HTML
interface QuestionnairePayload {
  prenom: string
  nom: string
  email: string
  age?: unknown
  sexe?: unknown
  objectif_sport?: unknown
  objectif_course?: unknown
  objectif_date?: unknown
  objectif_temps?: unknown
  autres_courses?: AutreCourse[]
  heures_par_semaine?: unknown
  jours_disponibles?: string[]
  contraintes?: unknown
  blessures?: unknown
  montre_gps?: unknown
  capteur_puissance?: unknown
  home_trainer?: unknown
  salle_muscu?: unknown
  strava_connecte?: unknown
  coaching_type?: unknown
  coaching_duree?: unknown
  coaching_sport?: unknown
  coaching_objectif?: unknown
  option_renfo?: unknown
  niveau_suivi?: unknown
  infos_complementaires?: unknown
}

// ── Cast helpers ───────────────────────────────────────────────────
// Chaque helper gère "", undefined, null et les strings "true"/"false"

function toInt(val: unknown): number | null {
  if (val === '' || val === undefined || val === null) return null
  const n = parseInt(String(val), 10)
  return isNaN(n) ? null : n
}

// boolean NOT NULL en DB → jamais null, fallback false
function toBool(val: unknown): boolean {
  if (val === '' || val === undefined || val === null) return false
  if (val === 'false' || val === '0') return false
  return Boolean(val)
}

// text nullable → "" devient null pour respecter les CHECK enum
function toText(val: unknown): string | null {
  if (val === undefined || val === null) return null
  const s = String(val).trim()
  return s === '' ? null : s
}

// date nullable → "" interdit par Postgres (erreur 22007)
function toDate(val: unknown): string | null {
  if (val === undefined || val === null) return null
  const s = String(val).trim()
  return s === '' ? null : s
}

// ── CORS preflight ─────────────────────────────────────────────────

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

// ── Response helpers ───────────────────────────────────────────────

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400, headers: corsHeaders })
}

// ── POST /api/questionnaire ────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Protection par clé API — le site web externe doit envoyer
  // Authorization: Bearer <QUESTIONNAIRE_API_KEY>
  const apiKey = process.env.QUESTIONNAIRE_API_KEY
  if (apiKey) {
    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (token !== apiKey) return unauthorized()
  }

  let body: QuestionnairePayload
  try {
    body = await req.json()
  } catch {
    return badRequest('Corps de requête JSON invalide')
  }

  // Validation champs obligatoires
  const { prenom, nom, email } = body
  if (!prenom?.trim()) return badRequest('prenom est requis')
  if (!nom?.trim()) return badRequest('nom est requis')
  if (!email?.trim() || !email.includes('@')) return badRequest('email valide requis')

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('athlete_questionnaires')
    .insert({
      // text NOT NULL — validés ci-dessus
      prenom: prenom.trim(),
      nom: nom.trim(),
      email: email.trim().toLowerCase(),

      // integer nullable, CHECK (age > 0 AND age < 120)
      age: toInt(body.age),

      // text nullable, CHECK enum ('homme','femme','autre','non_precise')
      sexe: toText(body.sexe),

      // text nullable
      objectif_sport: toText(body.objectif_sport),
      objectif_course: toText(body.objectif_course),

      // date nullable — "" → erreur 22007, doit être null
      objectif_date: toDate(body.objectif_date),

      // text nullable
      objectif_temps: toText(body.objectif_temps),

      // jsonb NOT NULL, default []
      autres_courses: body.autres_courses ?? [],

      // integer nullable, CHECK (heures_par_semaine >= 0)
      heures_par_semaine: toInt(body.heures_par_semaine),

      // jsonb NOT NULL, default []
      jours_disponibles: body.jours_disponibles ?? [],

      // text nullable
      contraintes: toText(body.contraintes),
      blessures: toText(body.blessures),

      // boolean NOT NULL, default false
      montre_gps: toBool(body.montre_gps),
      capteur_puissance: toBool(body.capteur_puissance),
      home_trainer: toBool(body.home_trainer),
      salle_muscu: toBool(body.salle_muscu),
      strava_connecte: toBool(body.strava_connecte),

      // text nullable, CHECK enum ('pack','abonnement')
      coaching_type: toText(body.coaching_type),

      // text nullable
      coaching_duree: toText(body.coaching_duree),
      coaching_sport: toText(body.coaching_sport),
      coaching_objectif: toText(body.coaching_objectif),

      // boolean NOT NULL, default false
      option_renfo: toBool(body.option_renfo),

      // text nullable, CHECK enum ('essentiel','standard','premium')
      niveau_suivi: toText(body.niveau_suivi),

      // text nullable
      infos_complementaires: toText(body.infos_complementaires),
    })
    .select('id, created_at')
    .single()

  if (error) {
    console.error('[questionnaire] insert error:', error)
    return NextResponse.json(
      { error: 'Erreur base de données', details: error.message, code: error.code },
      { status: 500, headers: corsHeaders }
    )
  }

  return NextResponse.json(
    { success: true, id: data.id, created_at: data.created_at },
    { status: 201, headers: corsHeaders }
  )
}

// ── GET /api/questionnaire ─────────────────────────────────────────
// Lecture des questionnaires côté coach (authentifié)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const statut = searchParams.get('statut') // filtre optionnel
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  // Vérifier l'auth cookie (le coach est connecté à l'app)
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  let query = supabase
    .from('athlete_questionnaires')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (statut) {
    query = query.eq('statut', statut)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('[questionnaire] fetch error:', error)
    return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 })
  }

  return NextResponse.json({ questionnaires: data, total: count })
}

// ── PATCH /api/questionnaire?id=<uuid> ────────────────────────────
// Mise à jour statut / notes_coach

export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return badRequest('id requis')

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  let body: { statut?: string; notes_coach?: string }
  try {
    body = await req.json()
  } catch {
    return badRequest('Corps JSON invalide')
  }

  const updates: Record<string, unknown> = {}
  if (body.statut !== undefined) updates.statut = body.statut
  if (body.notes_coach !== undefined) updates.notes_coach = body.notes_coach

  if (Object.keys(updates).length === 0) return badRequest('Aucun champ à mettre à jour')

  const { data, error } = await supabase
    .from('athlete_questionnaires')
    .update(updates)
    .eq('id', id)
    .select('id, statut, notes_coach, updated_at')
    .single()

  if (error) {
    console.error('[questionnaire] update error:', error)
    return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 })
  }

  return NextResponse.json(data)
}
