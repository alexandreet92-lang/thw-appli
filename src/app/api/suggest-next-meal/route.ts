import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient, MODELS } from '@/lib/agents/base'

// ── POST /api/suggest-next-meal ──────────────────────────────────
// Reçoit { remaining: {kcal,prot,gluc,lip}, dayType, nextSlot }.
// Renvoie une suggestion courte de repas adaptée aux macros restantes
// et au type de jour (low/mid/hard).
// ─────────────────────────────────────────────────────────────────
interface Body {
  remaining?: { kcal: number; prot: number; gluc: number; lip: number }
  dayType?:   'low' | 'mid' | 'hard'
  nextSlot?:  string
}

export async function POST(req: NextRequest) {
  try {
    const { remaining, dayType, nextSlot } = await req.json() as Body
    if (!remaining) {
      return NextResponse.json({ error: 'Champ remaining manquant' }, { status: 400 })
    }

    const dayLabel = dayType === 'hard' ? 'jour intense (besoin élevé en glucides)'
      : dayType === 'mid' ? 'jour modéré'
      : 'jour léger / repos'

    const client = getAnthropicClient()
    const response = await client.messages.create({
      model:      MODELS.fast,
      max_tokens: 350,
      system: `Tu es un nutritionniste sportif. Tu proposes UN repas concret, simple à préparer,
adapté aux macros restantes de la journée. Réponds UNIQUEMENT avec un objet JSON valide,
zéro texte avant/après :
{
  "title": "Nom court du repas",
  "description": "1 phrase : ingrédients + quantités approximatives",
  "kcal": 0, "prot": 0, "gluc": 0, "lip": 0
}`,
      messages: [{
        role: 'user',
        content: `Contexte : ${dayLabel}.${nextSlot ? ` Prochain repas : ${nextSlot}.` : ''}
Macros restantes à couvrir aujourd'hui :
- ${Math.round(remaining.kcal)} kcal
- ${Math.round(remaining.prot)} g protéines
- ${Math.round(remaining.gluc)} g glucides
- ${Math.round(remaining.lip)} g lipides
Propose un repas qui s'approche au mieux de ces valeurs (sans forcément les atteindre exactement).`,
      }],
    })

    const first = response.content[0]
    const text = first && first.type === 'text' ? first.text : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'Réponse invalide' }, { status: 502 })
    const parsed = JSON.parse(match[0]) as Record<string, unknown>
    return NextResponse.json(parsed)
  } catch (err) {
    console.error('[suggest-next-meal]', err)
    return NextResponse.json({ error: 'Suggestion impossible' }, { status: 500 })
  }
}
