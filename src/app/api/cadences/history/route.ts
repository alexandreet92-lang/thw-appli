// ══════════════════════════════════════════════════════════════════
// CADENCES — historique des tests terminés pour LE SITE (cookie → 401 natif).
// Lit les instantanés figés à la clôture (cadences_snapshots) + le profil de
// chaque campagne. Renvoie une liste prête pour la page « Mon historique ».
// Aucun recalcul : source de vérité = les snapshots de clôture.
// Les conditions (température / météo) ne sont pas encore collectées → null.
// ══════════════════════════════════════════════════════════════════
import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { levelFor } from '@/lib/cadences/engine'
import { CONFIG } from '@/lib/cadences/catalog'
import type { Mode } from '@/lib/cadences/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request): Promise<NextResponse> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ erreur: 'Connecte-toi sur le site.' }, { status: 401 })

  const url = new URL(request.url)
  const mode = (url.searchParams.get('mode') === 'age' ? 'age' : 'general') as Mode

  // Campagnes terminées de l'utilisateur (RLS), les plus anciennes d'abord.
  const { data: camps } = await sb
    .from('cadences_campaigns')
    .select('id, scale_sex, age_at_start, body_weight_kg, started_on, completed_on')
    .eq('status', 'completed')
    .order('completed_on', { ascending: true })
  if (!camps || !camps.length) return NextResponse.json({ tests: [] })

  // Instantanés du mode demandé pour ces campagnes.
  const ids = camps.map((c) => c.id)
  const { data: snaps } = await sb
    .from('cadences_snapshots')
    .select('campaign_id, total_points, quality_scores, test_scores')
    .in('campaign_id', ids)
    .eq('age_mode', mode)
  const snapById = new Map((snaps ?? []).map((s) => [s.campaign_id, s]))

  const max = CONFIG.total_points
  const ptsMax: Record<string, number> = {}
  CONFIG.tests.forEach((t) => { ptsMax[t.slug] = t.pts_max })

  const tests = camps.flatMap((c) => {
    const s = snapById.get(c.id)
    if (!s) return []
    const total = Number(s.total_points)
    // byTest (jsonb) → { slug: { points, level, value, max } }
    const byTest = (s.test_scores ?? {}) as Record<string, { points?: number; level?: string; valueUsed?: number }>
    const testsMap: Record<string, { points: number; level: string; value: number | null; max: number }> = {}
    for (const slug of Object.keys(byTest)) {
      const r = byTest[slug]
      testsMap[slug] = { points: Number(r.points ?? 0), level: String(r.level ?? ''), value: r.valueUsed ?? null, max: ptsMax[slug] ?? 0 }
    }
    // byQuality (jsonb) → { key: { pct, level } }
    const byQual = (s.quality_scores ?? {}) as Record<string, { pct?: number; level?: string }>
    const qualMap: Record<string, { pct: number; level: string }> = {}
    for (const key of Object.keys(byQual)) {
      qualMap[key] = { pct: Number(byQual[key].pct ?? 0), level: String(byQual[key].level ?? '') }
    }
    return [{
      id: c.id,
      date: c.completed_on ?? c.started_on,
      score: Math.round(total),
      level: levelFor(total / max, CONFIG),
      sex: c.scale_sex,
      age: c.age_at_start,
      weight: Number(c.body_weight_kg),
      // Conditions pas encore collectées (migration à venir) → non renseignées.
      tempC: null,
      outdoor: false,
      weatherLabel: '',
      tests: testsMap,
      qualities: qualMap,
    }]
  })

  return NextResponse.json({ tests })
}
