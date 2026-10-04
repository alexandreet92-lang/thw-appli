// ══════════════════════════════════════════════════════════════════
// CADENCES — clôture d'une campagne (SITE uniquement, client cookie → 401 natif).
// Recalcule le score CÔTÉ SERVEUR (§14) dans les DEUX modes (général + âge) et
// fige les snapshots, puis passe la campagne « completed ». Les résultats bruts
// ne sont jamais modifiés : on pourra toujours recalculer avec une autre version.
// ══════════════════════════════════════════════════════════════════
import 'server-only'
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { computeCampaign } from '@/lib/cadences/engine'
import { CONFIG } from '@/lib/cadences/catalog'
import type { CadencesConfig, Mode, TestInput } from '@/lib/cadences/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request): Promise<NextResponse> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ erreur: 'Connecte-toi sur le site.' }, { status: 401 })

  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const campaignId = typeof b?.campaignId === 'string' ? b.campaignId : ''
  if (!campaignId) return NextResponse.json({ erreur: 'Campagne manquante.' }, { status: 400 })

  // Campagne possédée (RLS) + barème utilisé.
  const { data: camp } = await sb
    .from('cadences_campaigns')
    .select('id, scale_version_id, scale_sex, age_band, body_weight_kg, status')
    .eq('id', campaignId)
    .maybeSingle()
  if (!camp) return NextResponse.json({ erreur: 'Campagne introuvable.' }, { status: 404 })
  if (camp.status !== 'in_progress') return NextResponse.json({ erreur: 'Campagne déjà clôturée.' }, { status: 409 })

  // Config de la version utilisée (recalcul fidèle), repli sur la config embarquée.
  let config: CadencesConfig = CONFIG
  const { data: scale } = await sb.from('cadences_scale_versions').select('config').eq('id', camp.scale_version_id).maybeSingle()
  if (scale?.config) config = scale.config as unknown as CadencesConfig

  const { data: results } = await sb
    .from('cadences_results')
    .select('test_slug, raw_value, equipment, status')
    .eq('campaign_id', campaignId)
    .eq('status', 'validated')

  const inputs: TestInput[] = (results ?? [])
    .filter((r) => r.raw_value != null)
    .map((r) => ({ slug: r.test_slug, value: Number(r.raw_value), equipment: r.equipment }))

  const profile = { sex: camp.scale_sex as 'M' | 'F', bodyWeightKg: Number(camp.body_weight_kg), ageBand: camp.age_band }

  const svc = createServiceClient()
  const snapshots = (['general', 'age'] as Mode[]).map((ageMode) => {
    const s = computeCampaign(inputs, profile, ageMode, config)
    return {
      campaign_id: campaignId,
      scale_version_id: camp.scale_version_id,
      age_mode: ageMode,
      total_points: s.total,
      quality_scores: s.byQuality,
      test_scores: s.byTest,
    }
  })

  const { error: snapErr } = await svc
    .from('cadences_snapshots')
    .upsert(snapshots, { onConflict: 'campaign_id,scale_version_id,age_mode' })
  if (snapErr) return NextResponse.json({ erreur: snapErr.message }, { status: 502 })

  const today = new Date()
  const retest = new Date(today); retest.setFullYear(retest.getFullYear() + 1)
  const { error: upErr } = await sb
    .from('cadences_campaigns')
    .update({
      status: 'completed',
      completed_on: today.toISOString().slice(0, 10),
      next_retest_on: retest.toISOString().slice(0, 10),
    })
    .eq('id', campaignId)
  if (upErr) return NextResponse.json({ erreur: upErr.message }, { status: 502 })

  return NextResponse.json({ ok: true, id: campaignId })
}
