// ══════════════════════════════════════════════════════════════
// API — /api/rule-helper
// Reformule une règle IA en langage clair + suggestions.
// Pas de streaming, pas de quota — Haiku, coût négligeable.
// ══════════════════════════════════════════════════════════════

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient, MODELS } from '@/lib/agents/base'
import { createClient } from '@/lib/supabase/server'

const SYSTEM = `Tu es un assistant expert en coaching sportif. L'utilisateur crée une règle personnelle pour son Coach IA.

Ton rôle :
1. Reformuler ce que l'utilisateur veut en une règle claire et concise (2 phrases max)
2. Proposer 2-4 suggestions d'améliorations ou règles complémentaires que l'utilisateur pourrait aussi vouloir ajouter

Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après :
{
  "rule": "La règle reformulée, claire et actionnable",
  "suggestions": [
    "Suggestion d'amélioration ou règle complémentaire 1",
    "Suggestion 2",
    "Suggestion 3"
  ]
}

Règles de reformulation :
- La règle doit être à l'impératif ou au présent, adressée au Coach IA (ex: "Ne jamais proposer de squats avec charge")
- Reste fidèle à l'intention de l'utilisateur, ne change pas le sens
- Les suggestions doivent être des extensions logiques de la règle initiale`

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { userInput, category, previousRule, modification } = await req.json() as {
      userInput?: string
      category: string
      previousRule?: string
      modification?: string
    }

    let userPrompt: string
    if (modification && previousRule) {
      userPrompt = `Règle actuelle : "${previousRule}"\nL'utilisateur veut modifier : "${modification}"\nCatégorie : ${category}\n\nReformule la règle en intégrant la modification demandée et propose des suggestions.`
    } else {
      userPrompt = `L'utilisateur veut créer cette règle (catégorie ${category}) : "${userInput ?? ''}"\n\nReformule et propose des suggestions.`
    }

    const client = getAnthropicClient()
    const response = await client.messages.create({
      model: MODELS.fast,
      max_tokens: 500,
      system: SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No response' }, { status: 500 })
    }

    let parsed: { rule: string; suggestions: string[] }
    try {
      const clean = textBlock.text.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(clean) as typeof parsed
    } catch {
      parsed = { rule: textBlock.text.trim(), suggestions: [] }
    }

    return NextResponse.json(parsed)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
