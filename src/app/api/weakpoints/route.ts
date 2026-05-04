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

TON RÔLE : identifier les POINTS FAIBLES INTRINSÈQUES de l'athlète dans les disciplines demandées — PAS critiquer son entraînement récent.

MÉTHODE D'ANALYSE EN 2 PARTIES DISTINCTES :

PARTIE 1 — PROFIL ATHLÉTIQUE & POINTS FAIBLES (la plus importante)
Analyse le profil GLOBAL de l'athlète sur toute la durée des données disponibles (jusqu'à 12 mois).
Identifie les faiblesses fondamentales dans chaque discipline :
- Capacité aérobie (VO2max, seuil lactique, endurance fondamentale)
- Puissance / vitesse maximale
- Endurance de force (capacité à maintenir l'effort longtemps)
- Technique / cadence / économie de course ou de pédalage
- Capacité à performer en compétition vs entraînement
- Points de rupture : à quelle distance ou durée la performance se dégrade
- Déséquilibres entre disciplines (si multi-sport)
Base-toi sur : l'évolution des performances dans le temps, les résultats de tests, les records personnels, les zones d'entraînement, les données physiologiques (FC, puissance, allure) sur des efforts comparables.

PARTIE 2 — DIAGNOSTIC DE L'ENTRAÎNEMENT ACTUEL (secondaire)
Ensuite seulement, analyse si l'entraînement actuel (dernières semaines) adresse ou aggrave ces points faibles :
- Distribution d'intensité : est-elle adaptée aux faiblesses identifiées ?
- Volume : suffisant pour les objectifs ?
- Cohérence avec les courses à venir
- Récupération : signes de surcharge ?

IMPORTANT :
- Ne confonds PAS "l'athlète n'a pas fait de Z5 ce mois-ci" (diagnostic entraînement) avec "l'athlète a un déficit de VO2max" (point faible intrinsèque). Le premier est une observation sur le plan, le second est un profil physiologique.
- Utilise les TENDANCES sur plusieurs mois, pas juste les données récentes.
- Compare les performances de l'athlète à différentes époques pour détecter les stagnations ou régressions.

Tu réponds UNIQUEMENT avec un objet JSON valide. Zéro texte avant ou après.`

    const userPrompt = `Analyse les points faibles de cet athlète dans : ${body.sports.join(', ')}

PROFIL ATHLÈTE :
${JSON.stringify(body.profile, null, 2)}

ZONES D'ENTRAÎNEMENT :
${JSON.stringify(body.zones, null, 2)}

ACTIVITÉS (12 DERNIERS MOIS) :
${JSON.stringify(body.activities, null, 2)}

RÉSULTATS DE TESTS (historique complet) :
${JSON.stringify(body.testResults, null, 2)}

COURSES PLANIFIÉES :
${JSON.stringify(body.races, null, 2)}

DONNÉES SANTÉ/RÉCUPÉRATION (14 DERNIERS JOURS) :
${JSON.stringify(body.health, null, 2)}

${body.aiRules.length > 0 ? `RÈGLES PERSONNELLES À RESPECTER :\n${body.aiRules.map(r => `- [${r.category}] ${r.rule_text}`).join('\n')}` : ''}

Retourne EXACTEMENT ce JSON :
{
  "resume": "Résumé global en 3-4 phrases des forces et faiblesses fondamentales de l'athlète",
  "score_global": 65,
  "profil_athletique": {
    "forces_majeures": [
      { "label": "Endurance fondamentale solide", "detail": "Explication basée sur les données historiques", "evidence": "Données qui le prouvent (ex: FC stable à 145bpm sur 2h, progression constante sur semi-marathon)" }
    ],
    "faiblesses_majeures": [
      { "label": "Déficit de puissance maximale aérobie", "detail": "Explication", "evidence": "Données qui le prouvent", "priority": 1 }
    ]
  },
  "sports_analysis": [
    {
      "sport": "course à pied",
      "score": 70,
      "profil": "Type d'athlète dans ce sport (ex: endurant mais manque de vitesse, puissant mais manque de fond)",
      "forces": [
        { "label": "Bonne endurance de base", "detail": "Explication", "evidence": "Données" }
      ],
      "faiblesses": [
        { "label": "VMA insuffisante pour objectif 10km sub-40", "detail": "Explication", "priority": 1, "evidence": "Données" }
      ],
      "evolution": "Tendance sur les derniers mois : progression, stagnation ou régression, avec explication"
    }
  ],
  "diagnostic_entrainement": {
    "resume": "L'entraînement actuel adresse-t-il les faiblesses identifiées ?",
    "points_positifs": [
      { "label": "Bon volume hebdomadaire", "detail": "Explication" }
    ],
    "points_negatifs": [
      { "label": "Pas assez de travail spécifique haute intensité", "detail": "Explication", "priority": 1 }
    ],
    "coherence_objectifs": { "status": "ok", "detail": "L'entraînement est-il cohérent avec les courses prévues ?" },
    "recuperation": { "status": "warning", "detail": "État de récupération" }
  },
  "plan_action": [
    {
      "priority": 1,
      "action": "Intégrer 1 séance VMA courte (6x800m) par semaine",
      "sport": "course à pied",
      "cible": "Faiblesse visée : déficit VO2max",
      "impact": "Amélioration estimée et en combien de temps",
      "detail": "Explication détaillée du pourquoi et du comment"
    }
  ],
  "sources_used": ["activités 12 mois (N activités)", "tests VMA/FTP", "zones FC/allure/puissance", "courses planifiées", "données récupération"]
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

export const POST = withQuotaCheck('tool_use')(
  postHandler as (req: NextRequest, ctx: { params?: Promise<Record<string, string>> }) => Promise<Response>
)
