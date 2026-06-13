import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient, MODELS } from '@/lib/agents/base'
import { anchorMacros } from '@/lib/nutrition/anchorMacros'

// ── POST /api/analyze-meal-photo ─────────────────────────────────
// Décompose un plat en INGRÉDIENTS (pas un bloc unique). Les ingrédients comptables
// (œufs, tranches, fruits) sont renvoyés en NOMBRE, pas en grammes ; la quantité issue de
// la photo est un PREMIER JET (estimated:true) confirmable. Les macros sont ANCRÉES sur
// common-foods (réf. type-CIQUAL) ingrédient par ingrédient ; repli sur l'estimation du
// modèle sinon. Note /10 + avis renvoyés dans la MÊME réponse (modèle Hermès/Haiku).
// Cette route ne décompte PAS le quota IA (aucun check-quota / recordTokenUsage) — inchangé.
// ─────────────────────────────────────────────────────────────────
interface RawIngredient {
  name?: string; countable?: boolean; count?: number; unit?: string; grams?: number
  kcal?: number; prot?: number; gluc?: number; lip?: number
}

const r0 = (n: unknown) => Math.max(0, Math.round(Number(n) || 0))

export async function POST(req: NextRequest) {
  try {
    const { base64, mimeType } = await req.json() as { base64?: string; mimeType?: string }
    if (!base64) return NextResponse.json({ error: 'Champ base64 manquant' }, { status: 400 })

    const mediaType = (mimeType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    const client = getAnthropicClient()
    const response = await client.messages.create({
      model: MODELS.fast,
      max_tokens: 900,
      system: `Tu es un coach nutrition de la performance qui analyse des photos de repas.
Tu réponds UNIQUEMENT avec un objet JSON valide. Zéro texte avant/après, zéro commentaire.
DÉCOMPOSE le plat en ingrédients distincts (ex: une omelette = "œuf" + "beurre", PAS
"omelette"). Pour les aliments comptables (œuf, tranche, fruit, biscuit), donne countable=true
+ count (un NOMBRE entier), PAS des grammes. Donne aussi grams = masse totale estimée de
l'ingrédient (sert au calcul des macros). Les quantités sont une ESTIMATION.
RÈGLE sur "advice" : conseil de PERFORMANCE constructif et bienveillant (ex: "ajoute une
source de glucides lents pour tenir la séance"). JAMAIS de jugement moral ni de
culpabilisation. Une phrase. "score" = qualité nutritionnelle pour la performance, 1 à 10.`,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: `Analyse ce repas. Retourne EXACTEMENT ce JSON :
{
  "meal_name": "Nom du plat",
  "ingredients": [
    { "name": "Œuf", "countable": true, "count": 3, "unit": "œuf", "grams": 150,
      "kcal": 233, "prot": 19, "gluc": 2, "lip": 16 }
  ],
  "confidence": "medium",
  "notes": null,
  "score": 7,
  "advice": "Conseil de performance constructif en une phrase"
}
Les champs kcal/prot/gluc/lip sont ta meilleure estimation par ingrédient (repli).` },
        ],
      }],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') throw new Error('Pas de réponse texte')
    let raw = textBlock.text.trim()
    const md = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (md) raw = md[1].trim()
    const s = raw.indexOf('{'); if (s > 0) raw = raw.slice(s)
    const e = raw.lastIndexOf('}'); if (e !== -1) raw = raw.slice(0, e + 1)

    const parsed = JSON.parse(raw) as {
      meal_name?: string; ingredients?: RawIngredient[]
      confidence?: 'low' | 'medium' | 'high'; notes?: string | null
      score?: number | null; advice?: string | null
    }

    // Ancrage macros ingrédient par ingrédient (common-foods) ; repli sur le modèle.
    const items = (parsed.ingredients ?? []).map(ing => {
      const grams = r0(ing.grams)
      const per100 = anchorMacros(String(ing.name ?? ''))
      let kcal: number, prot: number, gluc: number, lip: number, anchored = false
      if (per100 && grams > 0) {
        const ratio = grams / 100
        kcal = Math.round(per100.kcal * ratio); prot = Math.round(per100.prot * ratio)
        gluc = Math.round(per100.gluc * ratio); lip = Math.round(per100.lip * ratio); anchored = true
      } else {
        kcal = r0(ing.kcal); prot = r0(ing.prot); gluc = r0(ing.gluc); lip = r0(ing.lip)
      }
      const countable = !!ing.countable && r0(ing.count) > 0
      const qty = countable ? r0(ing.count) : grams
      const unit = countable ? String(ing.unit || 'u') : 'g'
      return { name: String(ing.name ?? ''), qty, unit, estimated: true, anchored, kcal, prot, gluc, lip }
    }).filter(it => it.name)

    const totals = items.reduce((a, it) => ({
      kcal: a.kcal + it.kcal, prot: a.prot + it.prot, gluc: a.gluc + it.gluc, lip: a.lip + it.lip,
    }), { kcal: 0, prot: 0, gluc: 0, lip: 0 })

    const confidence = (['low', 'medium', 'high'] as const).includes(parsed.confidence as 'low' | 'medium' | 'high')
      ? parsed.confidence : 'medium'
    const rawScore = Number(parsed.score)
    const score = Number.isFinite(rawScore) ? Math.min(10, Math.max(1, Math.round(rawScore))) : null
    const advice = typeof parsed.advice === 'string' && parsed.advice.trim() ? parsed.advice.trim() : null

    return NextResponse.json({
      meal_name: parsed.meal_name ?? 'Repas',
      items, totals, confidence, notes: parsed.notes ?? null, score, advice,
    })
  } catch (err) {
    console.error('[analyze-meal-photo]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
