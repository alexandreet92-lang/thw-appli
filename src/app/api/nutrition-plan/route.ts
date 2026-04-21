import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient, MODELS, parseJsonResponse } from '@/lib/agents/base'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      profile: { weight_kg: number | null; full_name: string | null }
      sessions: unknown[]
      races: unknown[]
      historyLogs: unknown[]
    }
    const { profile, sessions, races, historyLogs } = body

    const client = getAnthropicClient()

    const systemPrompt = `Tu es un expert en nutrition sportive.
Tu réponds UNIQUEMENT avec un objet JSON valide correspondant exactement au schéma demandé.
Zéro texte avant ou après le JSON. Zéro commentaire dans le JSON.`

    const userPrompt = `Génère un plan nutritionnel pour cet athlète.

PROFIL :
${JSON.stringify(profile, null, 2)}

PLANNING 14 PROCHAINS JOURS :
${JSON.stringify(sessions, null, 2)}

COURSES PLANIFIÉES :
${JSON.stringify(races, null, 2)}

HISTORIQUE NUTRITIONNEL RÉCENT :
${JSON.stringify(historyLogs, null, 2)}

Retourne EXACTEMENT ce JSON (remplace les valeurs par les valeurs réelles calculées) :
{
  "plan_minimal": {
    "description": "string",
    "calories_low": 0,
    "calories_mid": 0,
    "calories_hard": 0,
    "macros_low": { "proteines": 0, "glucides": 0, "lipides": 0 },
    "macros_mid": { "proteines": 0, "glucides": 0, "lipides": 0 },
    "macros_hard": { "proteines": 0, "glucides": 0, "lipides": 0 },
    "jours": [
      {
        "date": "YYYY-MM-DD",
        "type_jour": "low",
        "kcal": 0,
        "proteines": 0,
        "glucides": 0,
        "lipides": 0,
        "repas": {
          "option_A": {
            "petit_dejeuner": "string",
            "collation_matin": "string",
            "dejeuner": "string",
            "collation_apres_midi": "string",
            "diner": "string",
            "collation_soir": "string"
          },
          "option_B": {
            "petit_dejeuner": "string",
            "collation_matin": "string",
            "dejeuner": "string",
            "collation_apres_midi": "string",
            "diner": "string",
            "collation_soir": "string"
          }
        }
      }
    ]
  },
  "plan_maximal": {
    "description": "string",
    "calories_low": 0,
    "calories_mid": 0,
    "calories_hard": 0,
    "macros_low": { "proteines": 0, "glucides": 0, "lipides": 0 },
    "macros_mid": { "proteines": 0, "glucides": 0, "lipides": 0 },
    "macros_hard": { "proteines": 0, "glucides": 0, "lipides": 0 },
    "jours": [
      {
        "date": "YYYY-MM-DD",
        "type_jour": "low",
        "kcal": 0,
        "proteines": 0,
        "glucides": 0,
        "lipides": 0,
        "repas": {
          "option_A": {
            "petit_dejeuner": "string",
            "collation_matin": "string",
            "dejeuner": "string",
            "collation_apres_midi": "string",
            "diner": "string",
            "collation_soir": "string"
          },
          "option_B": {
            "petit_dejeuner": "string",
            "collation_matin": "string",
            "dejeuner": "string",
            "collation_apres_midi": "string",
            "diner": "string",
            "collation_soir": "string"
          }
        }
      }
    ]
  },
  "warnings": [],
  "resume": "string"
}`

    const response = await client.messages.create({
      model: MODELS.powerful,
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') throw new Error('No text response')

    const plan = parseJsonResponse(textBlock.text)
    return NextResponse.json({ plan })
  } catch (err) {
    console.error('[nutrition-plan]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
