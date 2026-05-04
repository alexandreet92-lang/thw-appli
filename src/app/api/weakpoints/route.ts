export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient, MODELS, parseJsonResponse } from '@/lib/agents/base'
import { withQuotaCheck } from '@/lib/subscriptions/quota-middleware'

async function postHandler(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json() as {
      sports: string[]
      profile: unknown
      zones: unknown
      activities: unknown[]
      testResults: unknown[]
      races: unknown[]
      health: unknown[]
      aiRules: { category: string; rule_text: string }[]
    }

    const client = getAnthropicClient()

    const systemPrompt = `Tu es un coach sportif expert en analyse de performance.
Tu dois identifier les points faibles de l'athlète en croisant TOUTES les données disponibles.
Tu réponds UNIQUEMENT avec un objet JSON valide correspondant exactement au schéma demandé.
Zéro texte avant ou après le JSON. Zéro commentaire dans le JSON.

Critères d'analyse :
- Volume et régularité : l'athlète s'entraîne-t-il assez ? Régulièrement ?
- Distribution d'intensité : trop de Z3 pas assez de Z1-Z2 ? Pas assez de haute intensité ?
- Progression ou stagnation : les performances s'améliorent-elles ?
- Équilibre entre sports : s'il est triathlète, est-il bon partout ou a-t-il un maillon faible ?
- Récupération : signes de surcharge ? Mauvais sommeil ?
- Lacunes par rapport aux objectifs de course : a-t-il les capacités pour ses courses prévues ?
- Zones : sont-elles à jour et cohérentes avec les données récentes ?`

    const userPrompt = `Analyse les points faibles de cet athlète dans : ${body.sports.join(', ')}

PROFIL ATHLÈTE :
${JSON.stringify(body.profile, null, 2)}

ZONES D'ENTRAÎNEMENT :
${JSON.stringify(body.zones, null, 2)}

ACTIVITÉS (3 DERNIERS MOIS) :
${JSON.stringify(body.activities, null, 2)}

RÉSULTATS DE TESTS :
${JSON.stringify(body.testResults, null, 2)}

COURSES PLANIFIÉES :
${JSON.stringify(body.races, null, 2)}

DONNÉES SANTÉ/RÉCUPÉRATION (14 DERNIERS JOURS) :
${JSON.stringify(body.health, null, 2)}

${body.aiRules.length > 0 ? `RÈGLES PERSONNELLES À RESPECTER :\n${body.aiRules.map(r => `- [${r.category}] ${r.rule_text}`).join('\n')}` : ''}

Retourne EXACTEMENT ce JSON :
{
  "resume": "Résumé global en 2-3 phrases de l'état de l'athlète",
  "score_global": 65,
  "sports_analysis": [
    {
      "sport": "course à pied",
      "score": 70,
      "forces": [
        { "label": "Régularité du volume", "detail": "Explication courte" }
      ],
      "faiblesses": [
        { "label": "Manque de travail en Z5", "detail": "Explication courte", "priority": 1 }
      ]
    }
  ],
  "cross_analysis": {
    "recuperation": { "status": "ok|warning|critical", "detail": "Explication" },
    "distribution_intensite": { "status": "ok|warning|critical", "detail": "Explication" },
    "volume_global": { "status": "ok|warning|critical", "detail": "Explication" },
    "coherence_objectifs": { "status": "ok|warning|critical", "detail": "Explication" },
    "equilibre_sports": { "status": "ok|warning|critical", "detail": "Explication" }
  },
  "plan_action": [
    {
      "priority": 1,
      "action": "Ajouter 1 séance VMA courte par semaine",
      "sport": "course à pied",
      "impact": "Amélioration VO2max estimée +3% en 6 semaines",
      "detail": "Explication détaillée de pourquoi et comment"
    }
  ],
  "sources_used": ["activités 3 mois", "zones course", "tests VMA", "planning courses"]
}`

    const response = await client.messages.create({
      model: MODELS.powerful,
      max_tokens: 6000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') throw new Error('No text response')

    let report: unknown
    try {
      report = parseJsonResponse(textBlock.text)
    } catch {
      let raw = textBlock.text.trim()
      const mdMatch = raw.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/)
      if (mdMatch) raw = mdMatch[1].trim()
      const start = raw.search(/[{[]/)
      if (start > 0) raw = raw.slice(start)
      let braces = 0, brackets = 0
      for (const c of raw) {
        if (c === '{') braces++
        if (c === '}') braces--
        if (c === '[') brackets++
        if (c === ']') brackets--
      }
      raw += ']'.repeat(Math.max(0, brackets)) + '}'.repeat(Math.max(0, braces))
      report = JSON.parse(raw) as unknown
    }

    return NextResponse.json({ report })
  } catch (err) {
    console.error('[weakpoints]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export const POST = withQuotaCheck('coach_analysis')(
  postHandler as (req: NextRequest, ctx: { params?: Promise<Record<string, string>> }) => Promise<Response>
)
