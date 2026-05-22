import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient, MODELS } from '@/lib/agents/base'

interface DayEntry {
  date:   string
  kcal:   number
  target: number
  prot:   number
  gluc:   number
  lip:    number
}

// ── POST /api/nutrition-weekly-summary ───────────────────────────
// Body : { weekData: DayEntry[], planType?: string }
// Returns : { summary: string }
// ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { weekData?: DayEntry[]; planType?: string }
    const weekData = body.weekData ?? []

    const totalKcal   = weekData.reduce((s, d) => s + d.kcal,   0)
    const totalTarget = weekData.reduce((s, d) => s + d.target, 0)
    const daysLogged  = weekData.filter(d => d.kcal > 0).length

    if (daysLogged === 0) {
      return NextResponse.json({ summary: 'Aucune donnée cette semaine pour générer un bilan.' })
    }

    const client   = getAnthropicClient()
    const response = await client.messages.create({
      model:      MODELS.fast,
      max_tokens: 400,
      messages: [{
        role:    'user',
        content: `Tu es un coach nutritionnel expert.
Voici les données nutritionnelles de la semaine d'un sportif (${daysLogged}/7 jours renseignés) :

${JSON.stringify(weekData.map(d => ({
  date:         d.date,
  kcal:         d.kcal,
  objectif_kcal: d.target,
  prot_g:       d.prot,
  gluc_g:       d.gluc,
  lip_g:        d.lip,
})), null, 2)}

Total semaine : ${totalKcal} kcal (objectif : ${totalTarget} kcal).
${body.planType ? `Type de plan : ${body.planType}.` : ''}

Rédige une analyse courte (4-5 phrases max) en français, directe et actionnable :
1. Point fort de la semaine
2. Point faible principal
3. Une recommandation concrète pour la semaine suivante

Ton : coach direct, pas condescendant. Prose, pas de bullet points. Pas de titre ni introduction.`,
      }],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    const text = (textBlock && textBlock.type === 'text') ? textBlock.text : ''

    return NextResponse.json({ summary: text })
  } catch (err) {
    console.error('[nutrition-weekly-summary]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
