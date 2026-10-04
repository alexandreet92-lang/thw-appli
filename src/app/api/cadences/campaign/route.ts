// ══════════════════════════════════════════════════════════════════
// CADENCES — campagnes (SITE uniquement). GET liste · POST crée.
//
// On utilise le client serveur BASÉ COOKIE : l'app native (Bearer sans cookie)
// n'a pas de session cookie → 401 automatique. La saisie reste donc « site
// uniquement » (spéc §3), et la RLS garantit que chacun ne voit que ses lignes.
// ══════════════════════════════════════════════════════════════════
import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ageBandFor } from '@/lib/cadences/catalog'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ erreur: 'Connecte-toi sur le site pour passer le test.' }, { status: 401 })

  const { data, error } = await sb
    .from('cadences_campaigns')
    .select('id, status, scale_sex, age_at_start, age_band, body_weight_kg, started_on, completed_on, created_at')
    .order('started_on', { ascending: false })
  if (error) return NextResponse.json({ erreur: error.message }, { status: 502 })
  return NextResponse.json({ campagnes: data ?? [] })
}

export async function POST(request: Request): Promise<NextResponse> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ erreur: 'Connecte-toi sur le site pour passer le test.' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const age = Number(body?.age)
  const bodyWeightKg = Number(body?.bodyWeightKg)
  const sex = body?.sex === 'F' ? 'F' : body?.sex === 'M' ? 'M' : null
  const scaleSex = body?.scaleSex === 'F' ? 'F' : body?.scaleSex === 'M' ? 'M' : sex

  if (!sex) return NextResponse.json({ erreur: 'Sexe manquant.' }, { status: 400 })
  if (!Number.isFinite(age) || age < 18 || age > 80) {
    return NextResponse.json({ erreur: 'Âge requis : réservé aux 18–80 ans.' }, { status: 400 })
  }
  if (!Number.isFinite(bodyWeightKg) || bodyWeightKg < 30 || bodyWeightKg > 250) {
    return NextResponse.json({ erreur: 'Poids de corps requis (30–250 kg).' }, { status: 400 })
  }
  const ageBand = ageBandFor(age)
  if (!ageBand) return NextResponse.json({ erreur: 'Âge hors barème (18–80 ans).' }, { status: 400 })

  // Barème actif.
  const { data: scale } = await sb.from('cadences_scale_versions').select('id').eq('is_active', true).maybeSingle()
  if (!scale) return NextResponse.json({ erreur: 'Aucun barème actif.' }, { status: 500 })

  // Une seule campagne en cours à la fois : on reprend celle ouverte s'il y en a une.
  const { data: ouverte } = await sb
    .from('cadences_campaigns').select('id').eq('status', 'in_progress').maybeSingle()
  if (ouverte) return NextResponse.json({ ok: true, id: ouverte.id, reprise: true })

  const { data, error } = await sb
    .from('cadences_campaigns')
    .insert({
      user_id: user.id,
      scale_version_id: scale.id,
      scale_sex: scaleSex,
      age_at_start: Math.trunc(age),
      age_band: ageBand,
      body_weight_kg: bodyWeightKg,
      share_for_calibration: body?.shareForCalibration === true,
    })
    .select('id')
    .single()
  if (error) return NextResponse.json({ erreur: error.message }, { status: 502 })
  return NextResponse.json({ ok: true, id: data.id })
}
