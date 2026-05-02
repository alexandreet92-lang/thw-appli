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

interface QuestionnairePayload {
  // Identité
  prenom: string
  nom: string
  email: string
  age?: number
  sexe?: 'homme' | 'femme' | 'autre' | 'non_precise'

  // Objectif principal
  objectif_sport?: string
  objectif_course?: string
  objectif_date?: string
  objectif_temps?: string

  // Autres courses
  autres_courses?: AutreCourse[]

  // Mode de vie
  heures_par_semaine?: number
  jours_disponibles?: string[]
  contraintes?: string
  blessures?: string

  // Matériel
  montre_gps?: boolean
  capteur_puissance?: boolean
  home_trainer?: boolean
  salle_muscu?: boolean
  strava_connecte?: boolean

  // Coaching choisi
  coaching_type?: 'pack' | 'abonnement'
  coaching_duree?: string
  coaching_sport?: string
  coaching_objectif?: string

  // Options
  option_renfo?: boolean
  niveau_suivi?: 'essentiel' | 'standard' | 'premium'

  // Infos complémentaires
  infos_complementaires?: string
}

// ── CORS preflight ─────────────────────────────────────────────────

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

// ── Helpers ────────────────────────────────────────────────────────

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
      prenom: prenom.trim(),
      nom: nom.trim(),
      email: email.trim().toLowerCase(),
      age: body.age ?? null,
      sexe: body.sexe ?? null,

      objectif_sport: body.objectif_sport ?? null,
      objectif_course: body.objectif_course ?? null,
      objectif_date: body.objectif_date ?? null,
      objectif_temps: body.objectif_temps ?? null,

      autres_courses: body.autres_courses ?? [],

      heures_par_semaine: body.heures_par_semaine ?? null,
      jours_disponibles: body.jours_disponibles ?? [],
      contraintes: body.contraintes ?? null,
      blessures: body.blessures ?? null,

      montre_gps: body.montre_gps ?? false,
      capteur_puissance: body.capteur_puissance ?? false,
      home_trainer: body.home_trainer ?? false,
      salle_muscu: body.salle_muscu ?? false,
      strava_connecte: body.strava_connecte ?? false,

      coaching_type: body.coaching_type ?? null,
      coaching_duree: body.coaching_duree ?? null,
      coaching_sport: body.coaching_sport ?? null,
      coaching_objectif: body.coaching_objectif ?? null,

      option_renfo: body.option_renfo ?? false,
      niveau_suivi: body.niveau_suivi ?? null,

      infos_complementaires: body.infos_complementaires ?? null,
    })
    .select('id, created_at')
    .single()

  if (error) {
    console.error('[questionnaire] insert error:', error)
    return NextResponse.json({ error: 'Erreur base de données' }, { status: 500, headers: corsHeaders })
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
