import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient, MODELS } from '@/lib/agents/base'

// ── POST /api/analyze-meal-photo ─────────────────────────────────
// Receives a multipart/form-data request with an image field.
// Returns JSON { kcal, prot, gluc, lip, confidence } estimated by Claude Haiku vision.
// ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const fd    = await req.formData()
    const image = fd.get('image') as File | null
    if (!image) {
      return NextResponse.json({ error: 'Champ image manquant' }, { status: 400 })
    }

    const bytes     = await image.arrayBuffer()
    const base64    = Buffer.from(bytes).toString('base64')
    const mediaType = (image.type || 'image/jpeg') as
      | 'image/jpeg'
      | 'image/png'
      | 'image/gif'
      | 'image/webp'

    const client   = getAnthropicClient()
    const response = await client.messages.create({
      model:      MODELS.fast,
      max_tokens: 200,
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
            text: `Analyse ce repas en photo et estime ses valeurs nutritionnelles.
Retourne EXACTEMENT ce JSON (valeurs entières, confidence entre 0.0 et 1.0) :
{"kcal": 0, "prot": 0, "gluc": 0, "lip": 0, "confidence": 0.8}`,
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
      kcal: number; prot: number; gluc: number; lip: number; confidence: number
    }

    return NextResponse.json({
      kcal:       Math.max(0, Math.round(parsed.kcal       ?? 0)),
      prot:       Math.max(0, Math.round(parsed.prot       ?? 0)),
      gluc:       Math.max(0, Math.round(parsed.gluc       ?? 0)),
      lip:        Math.max(0, Math.round(parsed.lip        ?? 0)),
      confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.5)),
    })
  } catch (err) {
    console.error('[analyze-meal-photo]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
