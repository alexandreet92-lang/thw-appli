// ══════════════════════════════════════════════════════════════
// POST /api/briefing/generate
// Déclenche l'agent Briefing Matinal, parse la réponse JSON et
// upsert dans daily_briefing pour le compte créateur (CREATOR_USER_ID).
//
// L'insert utilise le service client Supabase (bypass RLS) car on
// écrit pour un user_id figé côté serveur, pas pour l'utilisateur
// actuellement connecté.
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient, parseJsonResponse } from '@/lib/agents/base'
import { createServiceClient } from '@/lib/supabase/server'

const BRIEFING_AGENT_ID = 'agent_011CaNGPbXrPXiVHMkWhypqb'

// Retourne la date du jour au format ISO YYYY-MM-DD (timezone locale serveur).
function todayIso(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const creatorId = process.env.CREATOR_USER_ID
  if (!creatorId) {
    return NextResponse.json(
      { error: 'CREATOR_USER_ID manquant dans l\'environnement serveur.' },
      { status: 500 },
    )
  }

  // Body optionnel — permet de passer un contexte complémentaire à l'agent
  let extraContext: Record<string, unknown> = {}
  try {
    extraContext = await req.json() as Record<string, unknown>
  } catch {
    /* pas de body, on continue */
  }

  try {
    const client = getAnthropicClient()

    const userPrompt =
      `Génère le briefing matinal du jour pour l'athlète.\n` +
      `Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans texte avant/après).\n` +
      (Object.keys(extraContext).length > 0
        ? `\nContexte complémentaire :\n${JSON.stringify(extraContext, null, 2)}`
        : '')

    const resp = await client.messages.create({
      model: BRIEFING_AGENT_ID,
      max_tokens: 8000,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const textBlock = resp.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'Réponse agent vide.' }, { status: 502 })
    }

    let content: unknown
    try {
      content = parseJsonResponse<unknown>(textBlock.text)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.log('[briefing/generate] JSON parse failed:', msg)
      console.log('[briefing/generate] raw tail:', textBlock.text.slice(-200))
      return NextResponse.json({ error: 'Réponse agent non-JSON.' }, { status: 502 })
    }

    const date = todayIso()

    // Upsert sur (user_id, date) → si le briefing existe déjà,
    // on l'écrase avec la version fraîchement générée.
    const sb = createServiceClient()
    const { data, error } = await sb
      .from('daily_briefing')
      .upsert(
        {
          user_id: creatorId,
          date,
          content: content as Record<string, unknown>,
          lu: false,
        },
        { onConflict: 'user_id,date' },
      )
      .select()
      .single()

    if (error) {
      console.log('[briefing/generate] DB upsert failed:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ briefing: data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log('[briefing/generate] Fatal:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
