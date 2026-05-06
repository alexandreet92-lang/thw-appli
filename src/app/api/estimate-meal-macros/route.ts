import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient, MODELS } from '@/lib/agents/base'

// ── POST /api/estimate-meal-macros ────────────────────────────────
// Estime kcal/proteines/glucides/lipides d'un repas décrit en texte.
// Utilise le modèle rapide (Haiku) — réponse en ~300ms.
// ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { description } = await req.json() as { description?: string }
    if (!description || description.trim() === '-') {
      return NextResponse.json({ kcal: 0, proteines: 0, glucides: 0, lipides: 0 })
    }

    const client = getAnthropicClient()

    const response = await client.messages.create({
      model: MODELS.fast,
      max_tokens: 120,
      system: `Tu es un nutritionniste expert. Tu réponds UNIQUEMENT avec un objet JSON valide.
Zéro texte avant ou après le JSON. Zéro commentaire.`,
      messages: [{
        role: 'user',
        content: `Estime les macros nutritionnelles de ce repas.
Repas : "${description.trim()}"

Retourne EXACTEMENT ce JSON (valeurs entières) :
{"kcal": 0, "proteines": 0, "glucides": 0, "lipides": 0}`,
      }],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response')
    }

    // Parse — tolère les backticks markdown
    let raw = textBlock.text.trim()
    const md = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (md) raw = md[1].trim()
    const start = raw.indexOf('{')
    if (start > 0) raw = raw.slice(start)
    const end = raw.lastIndexOf('}')
    if (end !== -1) raw = raw.slice(0, end + 1)

    const macros = JSON.parse(raw) as { kcal: number; proteines: number; glucides: number; lipides: number }

    return NextResponse.json({
      kcal:      Math.max(0, Math.round(macros.kcal      ?? 0)),
      proteines: Math.max(0, Math.round(macros.proteines ?? 0)),
      glucides:  Math.max(0, Math.round(macros.glucides  ?? 0)),
      lipides:   Math.max(0, Math.round(macros.lipides   ?? 0)),
    })
  } catch (err) {
    console.error('[estimate-meal-macros]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
