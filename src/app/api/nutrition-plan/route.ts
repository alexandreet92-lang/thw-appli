import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient, MODELS, parseJsonResponse } from '@/lib/agents/base'
import { withQuotaCheck } from '@/lib/subscriptions/quota-middleware'

async function postHandler(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json() as {
      profile: { weight_kg: number | null; height_cm?: number | null; full_name?: string | null }
      sessions: unknown[]
      races: unknown[]
      historyLogs: unknown[]
      questionnaire?: { question: string; response: string }[]
      mealTemplates?: { nom: string; type_repas: string; kcal: number | null; proteines: number | null; glucides: number | null; lipides: number | null }[]
    }
    const { profile, sessions, races, historyLogs, questionnaire, mealTemplates } = body

    const client = getAnthropicClient()

    const systemPrompt = `Tu es un expert en nutrition sportive.
Tu réponds UNIQUEMENT avec un objet JSON valide correspondant exactement au schéma demandé.
Zéro texte avant ou après le JSON. Zéro commentaire dans le JSON.`

    const userPrompt = `Génère un plan nutritionnel pour cet athlète.

PROFIL :
- Poids : ${profile.weight_kg ? `${profile.weight_kg} kg` : 'Non renseigné'}
- Taille : ${profile.height_cm ? `${profile.height_cm} cm` : 'Non renseignée'}
${profile.full_name ? `- Nom : ${profile.full_name}` : ''}

PLANNING 14 PROCHAINS JOURS :
${JSON.stringify(sessions, null, 2)}

COURSES PLANIFIÉES :
${JSON.stringify(races, null, 2)}

HISTORIQUE NUTRITIONNEL RÉCENT :
${JSON.stringify(historyLogs, null, 2)}
${questionnaire && questionnaire.length > 0 ? `
RÉPONSES AU QUESTIONNAIRE :
${questionnaire.map(q => `${q.question} → ${q.response}`).join('\n')}` : ''}
${mealTemplates && mealTemplates.length > 0 ? `
REPAS TYPES HABITUELS DE L'ATHLÈTE (à intégrer dans le plan) :
${mealTemplates.map(t => `- [${t.type_repas}] ${t.nom} | ${t.kcal ?? '?'} kcal | P:${t.proteines ?? '?'}g G:${t.glucides ?? '?'}g L:${t.lipides ?? '?'}g`).join('\n')}
IMPORTANT : Base le plan sur ces repas habituels. Adapte-les si nécessaire mais ne les ignore jamais.` : ''}

INSTRUCTIONS :
- Génère exactement 7 jours (une semaine type) à partir d'aujourd'hui
- Chaque jour doit avoir un type_jour (low, mid, hard) cohérent avec le planning d'entraînement
- Les dates doivent être les vraies dates à partir d'aujourd'hui
- Pour les repas, sois concis : 1 ligne par repas, pas de descriptions longues
- Si un repas n'est pas nécessaire (ex: collation soir), mets "-"

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
      max_tokens: 16000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') throw new Error('No text response')

    let plan
    try {
      plan = parseJsonResponse(textBlock.text)
    } catch (parseErr) {
      // Tentative de réparation : le JSON est probablement tronqué
      console.error('[nutrition-plan] JSON parse failed, attempting repair')
      let raw = textBlock.text.trim()
      // Retirer les backticks markdown
      const mdMatch = raw.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/)
      if (mdMatch) raw = mdMatch[1].trim()
      // Trouver le début du JSON
      const start = raw.search(/[{[]/)
      if (start > 0) raw = raw.slice(start)
      // Fermer les accolades/crochets manquants
      let braces = 0, brackets = 0
      for (const c of raw) {
        if (c === '{') braces++
        if (c === '}') braces--
        if (c === '[') brackets++
        if (c === ']') brackets--
      }
      raw += ']'.repeat(Math.max(0, brackets)) + '}'.repeat(Math.max(0, braces))
      try {
        plan = JSON.parse(raw)
      } catch {
        throw new Error(`JSON repair failed: ${String(parseErr)}`)
      }
    }
    return NextResponse.json({ plan })
  } catch (err) {
    console.error('[nutrition-plan]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export const POST = withQuotaCheck('nutrition_plan')(
  postHandler as (req: NextRequest, ctx: { params?: Promise<Record<string, string>> }) => Promise<Response>
)
