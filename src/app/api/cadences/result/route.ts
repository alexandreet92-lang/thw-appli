// ══════════════════════════════════════════════════════════════════
// CADENCES — saisie d'un résultat (SITE uniquement, via cookie → 401 en natif).
// PUT upsert · DELETE efface. RLS : seulement sur ses propres campagnes.
// ══════════════════════════════════════════════════════════════════
import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { testBySlug, getConfig } from '@/lib/cadences/catalog'
import { PROTOCOLS, MAX_SKIPPED_STATIONS, parseSkippedStations, stationPenaltySec } from '@/lib/cadences/protocols'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PUT(request: Request): Promise<NextResponse> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ erreur: 'Connecte-toi sur le site.' }, { status: 401 })

  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const campaignId = typeof b?.campaignId === 'string' ? b.campaignId : ''
  const slug = typeof b?.slug === 'string' ? b.slug : ''
  if (!campaignId) return NextResponse.json({ erreur: 'Campagne manquante.' }, { status: 400 })

  // Résout l'épreuve dans la config DU PRODUIT de la campagne (test_key).
  const { data: camp } = await sb.from('cadences_campaigns').select('test_key, scale_sex').eq('id', campaignId).maybeSingle()
  const test = testBySlug(slug, getConfig(camp?.test_key as string | undefined))
  if (!test) return NextResponse.json({ erreur: 'Épreuve invalide pour ce test.' }, { status: 400 })

  const statut = b?.status === 'skipped' ? 'skipped' : b?.status === 'draft' ? 'draft' : 'validated'
  const value = b?.value == null || b?.value === '' ? null : Number(b.value)
  if (statut === 'validated' && (value == null || !Number.isFinite(value) || value <= 0)) {
    return NextResponse.json({ erreur: 'Valeur invalide.' }, { status: 400 })
  }

  // Lieu effectif : extérieur imposé, intérieur imposé, ou choix (vélo).
  const venueEff: 'indoor' | 'outdoor' =
    test.venue === 'outdoor' ? 'outdoor'
      : test.venue === 'toggle' ? (b?.venue === 'outdoor' ? 'outdoor' : 'indoor')
        : 'indoor'
  const temp = b?.temperatureC == null || b?.temperatureC === '' ? null : Number(b.temperatureC)
  const tempOk = temp != null && Number.isFinite(temp) && temp >= -30 && temp <= 55
  // En extérieur, la température est obligatoire pour valider (un peu de contexte
  // pour comparer les tests entre eux).
  if (statut === 'validated' && venueEff === 'outdoor' && !tempOk) {
    return NextResponse.json({ erreur: 'Température requise pour une épreuve en extérieur (°C).' }, { status: 400 })
  }
  const weather = venueEff === 'outdoor' && typeof b?.weather === 'string' && b.weather.trim() ? b.weather.slice(0, 40) : null

  // Conditioning : stations « passées » (forfait). Au plus 2, et le temps enregistré doit être le forfait calculé.
  const skippedStations = test.slug === 'conditioning' ? parseSkippedStations(b?.notes) : []
  if (skippedStations.length && statut === 'validated') {
    const share = PROTOCOLS.conditioning?.stationShare ?? []
    const parts = Array.isArray(b?.rawParts) ? (b.rawParts as unknown[]).map(Number) : []
    const ref = camp?.scale_sex === 'F' ? test.female.ref : test.male.ref
    if (skippedStations.length > MAX_SKIPPED_STATIONS || skippedStations.some((i) => i > share.length)) {
      return NextResponse.json({ erreur: `Tu peux passer ${MAX_SKIPPED_STATIONS} stations au maximum.` }, { status: 400 })
    }
    for (const i of skippedStations) {
      if (!(Math.abs((parts[i - 1] ?? NaN) - stationPenaltySec(ref, share[i - 1])) <= 2)) {
        return NextResponse.json({ erreur: 'Temps forfaitaire invalide pour une station passée.' }, { status: 400 })
      }
    }
  }

  const row: Record<string, unknown> = {
    campaign_id: campaignId,
    test_slug: slug,
    day_index: test.day,
    tested_on: new Date().toISOString().slice(0, 10),
    raw_value: statut === 'skipped' ? null : value,
    raw_parts: Array.isArray(b?.rawParts) ? b.rawParts : null,
    // 'box' | 'plate' : Hyrox ; 'rm5' : un 5RM saisi à la place du 3RM (épreuves `rm_choice` seulement).
    variant: b?.variant === 'box' || b?.variant === 'plate' || (b?.variant === 'rm5' && test.rm_choice) ? b.variant : null,
    equipment: ['normales', 'pointes', 'sans', 'ceinture', 'regression'].includes(b?.equipment as string) ? b?.equipment : null,
    timing_method: ['manuel', 'cellules', 'montre'].includes(b?.timingMethod as string) ? b?.timingMethod : null,
    pool_length_m: b?.poolLength === 25 || b?.poolLength === 50 ? b?.poolLength : null,
    venue: venueEff,
    temperature_c: venueEff === 'outdoor' && tempOk ? temp : null,
    weather,
    status: statut,
    skip_reason: statut === 'skipped' && typeof b?.skipReason === 'string' ? b.skipReason.slice(0, 300) : null,
    notes: typeof b?.notes === 'string' ? b.notes.slice(0, 500) : null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await sb.from('cadences_results').upsert(row, { onConflict: 'campaign_id,test_slug' })
  if (error) return NextResponse.json({ erreur: error.message }, { status: 502 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ erreur: 'Connecte-toi sur le site.' }, { status: 401 })

  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const campaignId = typeof b?.campaignId === 'string' ? b.campaignId : ''
  const slug = typeof b?.slug === 'string' ? b.slug : ''
  if (!campaignId || !slug) return NextResponse.json({ erreur: 'Paramètres manquants.' }, { status: 400 })

  const { error } = await sb.from('cadences_results').delete().eq('campaign_id', campaignId).eq('test_slug', slug)
  if (error) return NextResponse.json({ erreur: error.message }, { status: 502 })
  return NextResponse.json({ ok: true })
}
