// ══════════════════════════════════════════════════════════════
// STUDIO COACH — exécute UN système du coach sur les données de PLUSIEURS
// athlètes (1 système → N athlètes). Un rendu par athlète.
//  • auth : le coach (session) ;
//  • sécurité : le système doit appartenir au coach + lien ACCEPTÉ requis
//    pour chaque athlète ciblé ;
//  • lecture des données de l'athlète via le service client (server-runner) ;
//  • conso débitée sur le solde STUDIO du COACH (billUserId).
// Aucune écriture chez l'athlète : le server-runner ne produit que des rendus.
// ══════════════════════════════════════════════════════════════

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { runGraphServer } from '@/lib/studio/server-runner'
import { validateGraph, genId, type StudioGraph } from '@/lib/studio/graph'
import { getStudioAccess } from '@/lib/tokens/studio'
import { estimateRunTokens, formatTokens } from '@/lib/studio/offers'

const MAX_ATHLETES = 20

export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const coachId = user.id

  let body: { systemId?: string; athleteIds?: string[] }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Requête invalide' }, { status: 400 }) }
  const systemId = String(body.systemId ?? '')
  const athleteIds = Array.from(new Set((body.athleteIds ?? []).map(String))).slice(0, MAX_ATHLETES)
  if (!systemId || athleteIds.length === 0) return NextResponse.json({ error: 'Système ou athlètes manquants' }, { status: 400 })

  // Le système doit appartenir au coach.
  const { data: system } = await sb.from('studio_systems').select('id, name, graph').eq('id', systemId).eq('user_id', coachId).maybeSingle()
  if (!system) return NextResponse.json({ error: 'Système introuvable' }, { status: 404 })
  const graph = system.graph as StudioGraph
  const v = validateGraph(graph)
  if (v.errors.length) return NextResponse.json({ error: `Système invalide : ${v.errors[0]}` }, { status: 400 })

  // Liens ACCEPTÉS uniquement.
  const { data: links } = await sb.from('coach_athlete')
    .select('athlete_id').eq('coach_id', coachId).eq('status', 'accepted').in('athlete_id', athleteIds)
  const allowed = new Set((links ?? []).map(l => l.athlete_id as string))
  const targets = athleteIds.filter(a => allowed.has(a))
  if (targets.length === 0) return NextResponse.json({ error: 'Aucun athlète autorisé' }, { status: 403 })

  // Solde coach : estimation × nombre d'athlètes.
  const access = await getStudioAccess(coachId)
  const estimate = estimateRunTokens(graph.nodes) * targets.length
  if (!access.allowed) return NextResponse.json({ error: 'Le Studio nécessite un abonnement Pro ou Expert.' }, { status: 402 })
  if (estimate > access.remaining) return NextResponse.json({ error: `Solde Studio insuffisant (~${formatTokens(estimate)} tokens nécessaires).` }, { status: 402 })

  // Noms des athlètes (service client — le coach est autorisé).
  const svc = createServiceClient()
  const { data: profs } = await svc.from('profiles').select('id, full_name, first_name').in('id', targets)
  const nameById = new Map((profs ?? []).map(p => [p.id as string, (p.full_name as string) || (p.first_name as string) || 'Athlète']))

  // Exécute séquentiellement (limite la charge) ; débite le coach.
  const results: { athleteId: string; name: string; status: 'done' | 'error'; renders: { title: string; text: string }[]; error?: string }[] = []
  for (const athleteId of targets) {
    try {
      const runId = genId()
      const res = await runGraphServer(athleteId, graph, runId, systemId, coachId)
      results.push({
        athleteId, name: nameById.get(athleteId) ?? 'Athlète',
        status: res.errors.length ? 'error' : 'done',
        renders: res.renders.filter(r => r.text),
        error: res.errors.length ? res.errors.map(e => `${e.title} — ${e.message}`).join(' · ') : undefined,
      })
    } catch (e) {
      results.push({ athleteId, name: nameById.get(athleteId) ?? 'Athlète', status: 'error', renders: [], error: e instanceof Error ? e.message : 'Erreur inconnue' })
    }
  }

  return NextResponse.json({ system: system.name, results })
}
