// ══════════════════════════════════════════════════════════════
// STUDIO COACH — APPLIQUER une décision validée CHEZ l'athlète.
// Quand le coach valide un rendu dans le cockpit, le contenu approuvé
// (programme / synthèse) est envoyé à l'athlète en NOTIFICATION — la seule
// écriture sûre et immédiate. L'athlète reçoit la décision du coach, pas l'IA.
//   • auth : le coach (session) ;
//   • sécurité : lien coach↔athlète ACCEPTÉ obligatoire ;
//   • écriture via le service client (le coach est autorisé sur cet athlète).
// L'écriture directe dans le Planning de l'athlète viendra ensuite (structurée
// + testée) ; ici on ne fait qu'une notification, sans risque de corrompre des
// données d'entraînement.
// ══════════════════════════════════════════════════════════════

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const coachId = user.id

  let body: { athleteId?: string; systemId?: string; title?: string; body?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Requête invalide' }, { status: 400 }) }
  const athleteId = String(body.athleteId ?? '')
  const title = String(body.title ?? '').trim() || 'Programme de la semaine'
  const content = String(body.body ?? '').trim()
  if (!athleteId || !content) return NextResponse.json({ error: 'Athlète ou contenu manquant' }, { status: 400 })

  // Lien coach↔athlète ACCEPTÉ obligatoire.
  const { data: link } = await sb.from('coach_athlete')
    .select('athlete_id').eq('coach_id', coachId).eq('athlete_id', athleteId).eq('status', 'accepted').maybeSingle()
  if (!link) return NextResponse.json({ error: 'Athlète non autorisé' }, { status: 403 })

  // Écriture chez l'athlète : notification (service client, bypass RLS).
  const svc = createServiceClient()
  const { error } = await svc.from('notifications').insert({
    user_id: athleteId,
    type: 'studio.report',
    title,
    body: content.length > 2000 ? content.slice(0, 2000) + '…' : content,
    link: '/planning',
  })
  if (error) return NextResponse.json({ error: `Envoi impossible : ${error.message}` }, { status: 500 })

  return NextResponse.json({ ok: true })
}
