// ══════════════════════════════════════════════════════════════════
// CADENCES — état + scores d'une campagne pour LE SITE (cookie → 401 natif).
// En cours : recalcule l'aperçu via le moteur (général + âge). Terminée :
// renvoie les snapshots figés à la clôture. Source de vérité = serveur.
// ══════════════════════════════════════════════════════════════════
import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeCampaign, levelFor } from '@/lib/cadences/engine'
import { CONFIG } from '@/lib/cadences/catalog'
import type { CadencesConfig, Mode, TestInput } from '@/lib/cadences/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request): Promise<NextResponse> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ erreur: 'Connecte-toi sur le site.' }, { status: 401 })

  const url = new URL(request.url)
  const campaignId = url.searchParams.get('campaignId') ?? ''
  if (!campaignId) return NextResponse.json({ erreur: 'Campagne manquante.' }, { status: 400 })

  const { data: camp } = await sb
    .from('cadences_campaigns')
    .select('id, scale_version_id, scale_sex, age_at_start, age_band, body_weight_kg, started_on, completed_on, status')
    .eq('id', campaignId)
    .maybeSingle()
  if (!camp) return NextResponse.json({ erreur: 'Campagne introuvable.' }, { status: 404 })

  const { data: results } = await sb
    .from('cadences_results')
    .select('test_slug, raw_value, raw_parts, equipment, variant, timing_method, pool_length_m, status, skip_reason')
    .eq('campaign_id', campaignId)

  let scores: Record<Mode, unknown>

  if (camp.status === 'completed') {
    // Scores figés à la clôture.
    const { data: snaps } = await sb
      .from('cadences_snapshots')
      .select('age_mode, total_points, quality_scores, test_scores')
      .eq('campaign_id', campaignId)
    const pick = (mode: Mode) => {
      const s = (snaps ?? []).find((x) => x.age_mode === mode)
      if (!s) return null
      return {
        total: Number(s.total_points),
        globalLevel: levelFor(Number(s.total_points) / CONFIG.total_points, CONFIG),
        byQuality: s.quality_scores,
        byTest: s.test_scores,
      }
    }
    scores = { general: pick('general'), age: pick('age') }
  } else {
    // Aperçu en direct, recalculé sur les épreuves validées.
    let config: CadencesConfig = CONFIG
    const { data: scale } = await sb.from('cadences_scale_versions').select('config').eq('id', camp.scale_version_id).maybeSingle()
    if (scale?.config) config = scale.config as unknown as CadencesConfig

    const inputs: TestInput[] = (results ?? [])
      .filter((r) => r.status === 'validated' && r.raw_value != null)
      .map((r) => ({ slug: r.test_slug, value: Number(r.raw_value), equipment: r.equipment, parts: partsOf(r.raw_parts) }))
    const profile = { sex: camp.scale_sex as 'M' | 'F', bodyWeightKg: Number(camp.body_weight_kg), ageBand: camp.age_band }
    scores = {
      general: computeCampaign(inputs, profile, 'general', config),
      age: computeCampaign(inputs, profile, 'age', config),
    }
  }

  return NextResponse.json({
    campaign: {
      id: camp.id,
      scale_sex: camp.scale_sex,
      age_at_start: camp.age_at_start,
      age_band: camp.age_band,
      body_weight_kg: Number(camp.body_weight_kg),
      started_on: camp.started_on,
      completed_on: camp.completed_on,
      status: camp.status,
    },
    results: results ?? [],
    scores,
  })
}

/** Essais bruts (raw_parts jsonb) → nombres finis, ou null. */
function partsOf(raw: unknown): number[] | null {
  if (!Array.isArray(raw)) return null
  const v = raw.map(Number).filter((n) => Number.isFinite(n))
  return v.length ? v : null
}
