import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient, MODELS } from '@/lib/agents/base'

// ── POST /api/analyze-meal-photo ─────────────────────────────────
// Receives JSON { base64: string, mimeType: string }.
// Returns detailed meal analysis: meal_name, items[], totals, confidence, notes.
// ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { base64?: string; mimeType?: string }
    const { base64, mimeType } = body
    if (!base64) {
      return NextResponse.json({ error: 'Champ base64 manquant' }, { status: 400 })
    }

    const mediaType = (mimeType || 'image/jpeg') as
      | 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

    const client   = getAnthropicClient()
    const response = await client.messages.create({
      model:      MODELS.fast,
      max_tokens: 600,
      system: `Tu es un nutritionniste expert en analyse d'images de repas.
Tu réponds UNIQUEMENT avec un objet JSON valide. Zéro texte avant ou après. Zéro commentaire.`,
      messages: [{
        role:    'user',
        content: [
          {
            type:   'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: `Analyse ce repas en photo et identifie chaque aliment visible.
Retourne EXACTEMENT ce JSON (valeurs entières, confidence = "low"|"medium"|"high") :
{
  "meal_name": "Nom du repas",
  "items": [
    { "name": "Aliment", "qty": 150, "unit": "g", "kcal": 200 }
  ],
  "totals": { "kcal": 0, "prot": 0, "gluc": 0, "lip": 0 },
  "confidence": "medium",
  "notes": "Remarque optionnelle courte ou null"
}`,
          },
        ],
      }],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') throw new Error('Pas de réponse texte')

    let raw = textBlock.text.trim()
    const md = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (md) raw = md[1].trim()
    const start = raw.indexOf('{')
    if (start > 0) raw = raw.slice(start)
    const end = raw.lastIndexOf('}')
    if (end !== -1) raw = raw.slice(0, end + 1)

    const parsed = JSON.parse(raw) as {
      meal_name:  string
      items:      Array<{ name: string; qty: number; unit: string; kcal: number }>
      totals:     { kcal: number; prot: number; gluc: number; lip: number }
      confidence: 'low' | 'medium' | 'high'
      notes?:     string | null
    }

    const items = (parsed.items ?? []).map(it => ({
      name: String(it.name ?? ''),
      qty:  Math.max(0, Math.round(Number(it.qty)  || 0)),
      unit: String(it.unit ?? 'g'),
      kcal: Math.max(0, Math.round(Number(it.kcal) || 0)),
    }))

    const totals = {
      kcal: Math.max(0, Math.round(Number(parsed.totals?.kcal) || 0)),
      prot: Math.max(0, Math.round(Number(parsed.totals?.prot) || 0)),
      gluc: Math.max(0, Math.round(Number(parsed.totals?.gluc) || 0)),
      lip:  Math.max(0, Math.round(Number(parsed.totals?.lip)  || 0)),
    }

    // Recompute totals from items if totals.kcal is 0 but items exist
    if (totals.kcal === 0 && items.length > 0) {
      totals.kcal = items.reduce((s, it) => s + it.kcal, 0)
    }

    const confidence = (['low', 'medium', 'high'] as const).includes(parsed.confidence as 'low' | 'medium' | 'high')
      ? parsed.confidence
      : 'medium'

    return NextResponse.json({
      meal_name:  parsed.meal_name ?? 'Repas',
      items,
      totals,
      confidence,
      notes: parsed.notes ?? null,
    })
  } catch (err) {
    console.error('[analyze-meal-photo]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
