// ══════════════════════════════════════════════════════════════════
// CADENCES — campagnes (SITE uniquement). GET liste · POST crée · DELETE supprime un test entier.
//
// On utilise le client serveur BASÉ COOKIE : l'app native (Bearer sans cookie)
// n'a pas de session cookie → 401 automatique. La saisie reste donc « site
// uniquement » (spéc §3), et la RLS garantit que chacun ne voit que ses lignes.
// ══════════════════════════════════════════════════════════════════
import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ageBandFor, getConfig } from '@/lib/cadences/catalog'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ erreur: 'Connecte-toi sur le site pour passer le test.' }, { status: 401 })

  const { data, error } = await sb
    .from('cadences_campaigns')
    .select('id, test_key, status, scale_sex, age_at_start, age_band, body_weight_kg, started_on, completed_on, created_at')
    .order('started_on', { ascending: false })
  if (error) return NextResponse.json({ erreur: error.message }, { status: 502 })
  return NextResponse.json({ campagnes: data ?? [] })
}

/** Âge de la majorité numérique en France. */
const PARENTAL_AGE = 15

export async function POST(request: Request): Promise<NextResponse> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ erreur: 'Connecte-toi sur le site pour passer le test.' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const testKey = typeof body?.testKey === 'string' ? body.testKey : 'decaform'
  const config = getConfig(testKey)
  const effectiveKey = config.test_key ?? 'decaform'   // repli decaform si clé inconnue
  const age = Number(body?.age)
  const bodyWeightKg = Number(body?.bodyWeightKg)
  const sex = body?.sex === 'F' ? 'F' : body?.sex === 'M' ? 'M' : null
  const scaleSex = body?.scaleSex === 'F' ? 'F' : body?.scaleSex === 'M' ? 'M' : sex

  const aMin = config.age.min, aMax = config.age.max
  if (!sex) return NextResponse.json({ erreur: 'Sexe manquant.' }, { status: 400 })
  if (!Number.isFinite(age) || age < aMin || age > aMax) {
    return NextResponse.json({ erreur: `Âge requis pour ${config.title ?? 'ce test'} : ${aMin}–${aMax} ans.` }, { status: 400 })
  }
  if (!Number.isFinite(bodyWeightKg) || bodyWeightKg < 12 || bodyWeightKg > 250) {
    return NextResponse.json({ erreur: 'Poids de corps requis (12–250 kg).' }, { status: 400 })
  }
  // Sous 15 ans (majorité numérique en France, art. 45 de la loi Informatique et Libertés) : l'accord d'un parent
  // ou représentant légal est obligatoire pour enregistrer les données de l'enfant. Horodaté en base.
  const needsParental = age < PARENTAL_AGE
  if (needsParental && body?.parentalConsent !== true) {
    return NextResponse.json({ erreur: 'Accord d’un parent ou représentant légal requis sous 15 ans.', code: 'parental_consent' }, { status: 400 })
  }
  const ageBand = ageBandFor(age, config)
  if (!ageBand) return NextResponse.json({ erreur: `Âge hors barème (${aMin}–${aMax} ans).` }, { status: 400 })

  // Barème actif DE CE PRODUIT (test_key).
  const { data: scale } = await sb
    .from('cadences_scale_versions').select('id').eq('test_key', effectiveKey).eq('is_active', true).maybeSingle()
  if (!scale) return NextResponse.json({ erreur: 'Aucun barème actif pour ce test.' }, { status: 500 })

  // Une campagne en cours à la fois PAR PRODUIT : on reprend celle ouverte s'il y en a une.
  const { data: ouverte } = await sb
    .from('cadences_campaigns').select('id').eq('status', 'in_progress').eq('test_key', effectiveKey).maybeSingle()
  if (ouverte) return NextResponse.json({ ok: true, id: ouverte.id, reprise: true })

  const { data, error } = await sb
    .from('cadences_campaigns')
    .insert({
      user_id: user.id,
      test_key: effectiveKey,
      scale_version_id: scale.id,
      scale_sex: scaleSex,
      age_at_start: Math.trunc(age),
      age_band: ageBand,
      body_weight_kg: bodyWeightKg,
      share_for_calibration: body?.shareForCalibration === true,
      // Clé ajoutée UNIQUEMENT pour les moins de 15 ans (la colonne vient de 20261022_cadences_parental_consent.sql).
      ...(needsParental ? { parental_consent_at: new Date().toISOString() } : {}),
    })
    .select('id')
    .single()
  if (error) return NextResponse.json({ erreur: error.message }, { status: 502 })
  return NextResponse.json({ ok: true, id: data.id })
}

/** Supprime un test ENTIER (campagne + résultats + instantanés).
 *  Pas de migration : la politique RLS `cadences_campaigns_del` (propriétaire) existe et les résultats / instantanés
 *  sont en `on delete cascade` (20261004_cadences.sql). Irréversible : la confirmation est faite côté site. */
export async function DELETE(request: Request): Promise<NextResponse> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ erreur: 'Connecte-toi sur le site.' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const campaignId = typeof body?.campaignId === 'string' ? body.campaignId : ''
  if (!/^[0-9a-f-]{36}$/i.test(campaignId)) return NextResponse.json({ erreur: 'Test introuvable.' }, { status: 400 })

  // Propriétaire seulement (RLS + filtre explicite) ; select d'abord pour distinguer « absent » de « refusé ».
  const { data: camp } = await sb.from('cadences_campaigns').select('id').eq('id', campaignId).eq('user_id', user.id).maybeSingle()
  if (!camp) return NextResponse.json({ erreur: 'Test introuvable.' }, { status: 404 })

  const { error } = await sb.from('cadences_campaigns').delete().eq('id', campaignId).eq('user_id', user.id)
  if (error) return NextResponse.json({ erreur: error.message }, { status: 502 })
  return NextResponse.json({ ok: true })
}
