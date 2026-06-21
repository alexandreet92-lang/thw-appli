import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient, MODELS } from '@/lib/agents/base'
import { anchorMacros } from '@/lib/nutrition/anchorMacros'

// ── POST /api/estimate-meal-macros ────────────────────────────────
// Estime kcal/proteines/glucides/lipides d'un repas décrit en texte.
// MÊME méthode que l'analyse photo : le modèle DÉCOMPOSE le repas en ingrédients
// (avec grammes estimés), puis chaque ingrédient est ANCRÉ sur la table de
// référence (anchorMacros / common-foods) ; repli sur l'estimation du modèle.
// → cohérence avec /api/analyze-meal-photo (plus de gros écart photo vs texte).
// ─────────────────────────────────────────────────────────────────
interface RawIngredient {
  name?: string; grams?: number
  kcal?: number; prot?: number; gluc?: number; lip?: number
}

const r0 = (n: unknown) => Math.max(0, Math.round(Number(n) || 0))

export async function POST(req: NextRequest) {
  try {
    const { description } = await req.json() as { description?: string }
    if (!description || description.trim() === '-') {
      return NextResponse.json({ kcal: 0, proteines: 0, glucides: 0, lipides: 0, items: [] })
    }

    const client = getAnthropicClient()

    const response = await client.messages.create({
      model: MODELS.fast,
      max_tokens: 700,
      system: `Tu es un nutritionniste expert. Tu réponds UNIQUEMENT avec un objet JSON valide.
Zéro texte avant/après le JSON, zéro commentaire.
DÉCOMPOSE le repas décrit en ingrédients distincts. Pour CHAQUE ingrédient, donne
"grams" = masse estimée en grammes (en tenant compte des quantités indiquées par
l'utilisateur). Les champs kcal/prot/gluc/lip sont ta meilleure estimation par
ingrédient (utilisés seulement en repli).`,
      messages: [{
        role: 'user',
        content: `Repas : "${description.trim()}"

Retourne EXACTEMENT ce JSON (valeurs entières) :
{"ingredients": [
  { "name": "Riz cuit", "grams": 150, "kcal": 195, "prot": 4, "gluc": 42, "lip": 1 }
]}`,
      }],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') throw new Error('No text response')

    let raw = textBlock.text.trim()
    const md = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (md) raw = md[1].trim()
    const start = raw.indexOf('{'); if (start > 0) raw = raw.slice(start)
    const end = raw.lastIndexOf('}'); if (end !== -1) raw = raw.slice(0, end + 1)

    const parsed = JSON.parse(raw) as { ingredients?: RawIngredient[] }

    // Ancrage macros ingrédient par ingrédient (common-foods) ; repli sur le modèle.
    const items = (parsed.ingredients ?? []).map(ing => {
      const grams = r0(ing.grams)
      const per100 = anchorMacros(String(ing.name ?? ''))
      if (per100 && grams > 0) {
        const ratio = grams / 100
        return {
          name: String(ing.name ?? ''), grams,
          kcal: Math.round(per100.kcal * ratio), prot: Math.round(per100.prot * ratio),
          gluc: Math.round(per100.gluc * ratio), lip: Math.round(per100.lip * ratio),
        }
      }
      return { name: String(ing.name ?? ''), grams, kcal: r0(ing.kcal), prot: r0(ing.prot), gluc: r0(ing.gluc), lip: r0(ing.lip) }
    }).filter(it => it.name)

    const totals = items.reduce((a, it) => ({
      kcal: a.kcal + it.kcal, prot: a.prot + it.prot, gluc: a.gluc + it.gluc, lip: a.lip + it.lip,
    }), { kcal: 0, prot: 0, gluc: 0, lip: 0 })

    return NextResponse.json({
      kcal: r0(totals.kcal), proteines: r0(totals.prot), glucides: r0(totals.gluc), lipides: r0(totals.lip),
      items,
    })
  } catch (err) {
    console.error('[estimate-meal-macros]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
