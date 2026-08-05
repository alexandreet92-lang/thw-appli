// POST /api/programs/personalize  { programId, answers? }
// Programme IA : convertit les cibles relatives/fourchettes du coach en valeurs
// ABSOLUES personnalisées pour l'athlète (allure, watts…), à partir de son
// objectif + ses réponses au questionnaire (et ses données si dispo).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { MODEL_IDS } from '@/lib/subscriptions/tier-limits'
import type { ProgramWeek } from '@/lib/coach/programs'

export async function POST(req: Request) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { programId, answers } = await req.json() as { programId?: string; answers?: Record<string, string> }
    if (!programId) return NextResponse.json({ error: 'programId manquant' }, { status: 400 })

    const svc = createServiceClient()
    const { data: prog } = await svc.from('coach_programs')
      .select('id, coach_id, title, objective, prep_type, sports, level, structure, ai_enabled, price_cents, published')
      .eq('id', programId).maybeSingle()
    if (!prog) return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 })
    const p = prog as { id: string; coach_id: string; title: string; objective: string | null; prep_type: string | null; sports: string[]; level: string | null; structure: ProgramWeek[]; ai_enabled: boolean; price_cents: number; published: boolean }
    if (!p.ai_enabled) return NextResponse.json({ error: 'Programme sans IA' }, { status: 400 })

    // Accès : gratuit, propriétaire ou acheté.
    if (p.price_cents > 0 && p.coach_id !== user.id) {
      const { data: owned } = await svc.from('program_purchases').select('id').eq('program_id', p.id).eq('buyer_id', user.id).eq('status', 'active').maybeSingle()
      if (!owned) return NextResponse.json({ error: 'Achat requis' }, { status: 403 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'IA non configurée' }, { status: 500 })
    const anthropic = new Anthropic({ apiKey })

    const athleteInfo = Object.entries(answers ?? {}).map(([k, v]) => `- ${k} : ${v}`).join('\n') || '(peu d’informations fournies)'

    const sys = `Tu es un coach expert en préparation sportive. On te donne la structure JSON d'un programme dont les séances ont des cibles RELATIVES ou en fourchette (target.relative, target.low/high). Tu dois PERSONNALISER ces cibles en valeurs ABSOLUES réalistes pour CET athlète (allure mm:ss par km pour la course, watts pour le vélo, /100m pour la natation), en remplissant target.low et target.high. Ne change ni le nombre de semaines, ni de séances, ni les noms/sports/durées. Réponds UNIQUEMENT avec un JSON strict de la forme {"structure": <même structure avec cibles remplies>}. Aucune prose.`
    const usr = `OBJECTIF DU PROGRAMME : ${p.objective ?? p.title}\nTYPE : ${p.prep_type ?? '—'} · NIVEAU : ${p.level ?? '—'} · SPORTS : ${(p.sports ?? []).join(', ')}\n\nINFOS ATHLÈTE :\n${athleteInfo}\n\nSTRUCTURE À PERSONNALISER :\n${JSON.stringify(p.structure)}`

    const msg = await anthropic.messages.create({
      model: MODEL_IDS.athena, max_tokens: 8000,
      system: sys, messages: [{ role: 'user', content: usr }],
    })
    const text = msg.content.map(c => (c.type === 'text' ? c.text : '')).join('')
    let structure: ProgramWeek[] = p.structure
    try {
      const jsonStr = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
      const parsed = JSON.parse(jsonStr) as { structure?: ProgramWeek[] }
      if (Array.isArray(parsed.structure)) structure = parsed.structure
    } catch (e) { console.warn('[programs/personalize] parse failed, fallback to original:', e) }

    await svc.from('program_instances').upsert(
      { program_id: p.id, user_id: user.id, structure, answers: answers ?? null, updated_at: new Date().toISOString() },
      { onConflict: 'program_id,user_id' },
    )
    return NextResponse.json({ structure })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[programs/personalize] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
