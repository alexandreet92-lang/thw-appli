// ══════════════════════════════════════════════════════════════════
// CADENCES — saisie d'un résultat (SITE uniquement, via cookie → 401 en natif).
// PUT upsert · DELETE efface. RLS : seulement sur ses propres campagnes.
// ══════════════════════════════════════════════════════════════════
import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { testBySlug } from '@/lib/cadences/catalog'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PUT(request: Request): Promise<NextResponse> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ erreur: 'Connecte-toi sur le site.' }, { status: 401 })

  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const campaignId = typeof b?.campaignId === 'string' ? b.campaignId : ''
  const slug = typeof b?.slug === 'string' ? b.slug : ''
  const test = testBySlug(slug)
  if (!campaignId || !test) return NextResponse.json({ erreur: 'Campagne ou épreuve invalide.' }, { status: 400 })

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

  const row: Record<string, unknown> = {
    campaign_id: campaignId,
    test_slug: slug,
    day_index: test.day,
    tested_on: new Date().toISOString().slice(0, 10),
    raw_value: statut === 'skipped' ? null : value,
    raw_parts: Array.isArray(b?.rawParts) ? b.rawParts : null,
    variant: b?.variant === 'box' || b?.variant === 'plate' ? b.variant : null,
    equipment: ['normales', 'pointes', 'sans', 'ceinture'].includes(b?.equipment as string) ? b?.equipment : null,
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
