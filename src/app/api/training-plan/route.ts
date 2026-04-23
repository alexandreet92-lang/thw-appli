import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient, MODELS, parseJsonResponse } from '@/lib/agents/base'

// ── Types ─────────────────────────────────────────────────────

interface TrainingPlanRequestBody {
  questionnaire: Record<string, unknown>
  profil?: Record<string, unknown> | null
  zones?: Record<string, unknown> | null
  historique_90j?: Record<string, unknown>[] | null
  calendrier_objectifs?: Record<string, unknown>[] | null
  sante?: Record<string, unknown>[] | null
  modification?: string
  programme_actuel?: Record<string, unknown> | null
}

interface PlanBloc {
  nom: string
  duree_min: number
  zone: number
  repetitions: number
  recup_min: number
  watts: number | null
  allure: string | null
  consigne: string
}

interface PlanSeance {
  jour: number
  sport: string
  titre: string
  duree_min: number
  tss: number
  intensite: 'low' | 'moderate' | 'high' | 'max'
  heure: string
  notes: string
  rpe: number
  blocs: PlanBloc[]
}

interface PlanSemaine {
  numero: number
  type: string
  volume_h: number
  tss_semaine: number
  theme: string
  seances: PlanSeance[]
}

interface PlanPeriodisation {
  nom: string
  type: 'Base' | 'Intensité' | 'Spécifique' | 'Deload' | 'Compétition'
  semaine_debut: number
  semaine_fin: number
  description: string
  volume_hebdo_h: number
}

interface GeneratedPlan {
  nom: string
  duree_semaines: number
  objectif_principal: string
  blocs_periodisation: PlanPeriodisation[]
  semaines: PlanSemaine[]
  conseils_adaptation: string[]
  points_cles: string[]
}

// ── System prompt ─────────────────────────────────────────────

const SYSTEM = `Tu es un coach expert en planification d'entraînement sportif de haut niveau.
Tu crées des programmes structurés, périodisés et personnalisés.
Tu réponds UNIQUEMENT avec un objet JSON valide selon le schéma fourni.
Aucun texte avant ni après, aucun commentaire, aucun bloc markdown.`

// ── JSON schema string ─────────────────────────────────────────

const JSON_SCHEMA = `{
  "nom": "string — nom du programme",
  "duree_semaines": "number",
  "objectif_principal": "string",
  "blocs_periodisation": [
    {
      "nom": "string",
      "type": "Base | Intensité | Spécifique | Deload | Compétition",
      "semaine_debut": "number",
      "semaine_fin": "number",
      "description": "string",
      "volume_hebdo_h": "number"
    }
  ],
  "semaines": [
    {
      "numero": "number",
      "type": "string",
      "volume_h": "number",
      "tss_semaine": "number",
      "theme": "string",
      "seances": [
        {
          "jour": "number (0=lundi, 6=dimanche)",
          "sport": "string",
          "titre": "string",
          "duree_min": "number",
          "tss": "number",
          "intensite": "low | moderate | high | max",
          "heure": "string (ex: 06:30)",
          "notes": "string",
          "rpe": "number",
          "blocs": [
            {
              "nom": "string",
              "duree_min": "number",
              "zone": "number (1-5)",
              "repetitions": "number",
              "recup_min": "number",
              "watts": "number | null",
              "allure": "string | null",
              "consigne": "string"
            }
          ]
        }
      ]
    }
  ],
  "conseils_adaptation": ["string"],
  "points_cles": ["string"]
}`

// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: TrainingPlanRequestBody
  try {
    body = await req.json() as TrainingPlanRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    questionnaire,
    profil,
    zones,
    historique_90j,
    calendrier_objectifs,
    sante,
    modification,
    programme_actuel,
  } = body

  const userPrompt = `Crée un programme d'entraînement complet avec ces informations :

QUESTIONNAIRE ATHLÈTE :
${JSON.stringify(questionnaire, null, 2)}

PROFIL PERFORMANCE :
${JSON.stringify(profil ?? null, null, 2)}

ZONES D'ENTRAÎNEMENT :
${JSON.stringify(zones ?? null, null, 2)}

HISTORIQUE 90 DERNIERS JOURS :
${JSON.stringify(historique_90j ?? [], null, 2)}

CALENDRIER ET OBJECTIFS :
${JSON.stringify(calendrier_objectifs ?? [], null, 2)}

DONNÉES SANTÉ RÉCENTES :
${JSON.stringify(sante ?? [], null, 2)}

${modification ? `MODIFICATION DEMANDÉE (sur le programme existant) :\n${modification}\n\nPROGRAMME EXISTANT :\n${JSON.stringify(programme_actuel ?? null, null, 2)}` : ''}

Génère le programme complet selon ce schéma JSON (UNIQUEMENT le JSON, rien d'autre) :
${JSON_SCHEMA}

RÈGLES :
1. Programme réaliste adapté au niveau et au temps disponible
2. Progression logique et périodisation intelligente
3. Semaine de deload toutes les 3-4 semaines selon réaction au volume
4. TSS cohérent avec la durée et l'intensité
5. Respect des jours de repos demandés
6. Conseils d'adaptation détaillés et personnalisés
7. IMPORTANT : génère UNIQUEMENT les 4 premières semaines en détail dans le tableau "semaines". Les semaines suivantes seront générées à la demande. Cela permet de produire un JSON complet et non tronqué.`

  try {
    const client = getAnthropicClient()

    // Try agent first, fallback to model
    const AGENT_ID = 'agent_011Ca8Ar5a3gyowSA6fQ94UT'
    let plan: GeneratedPlan | null = null

    try {
      const resp = await client.messages.create({
        model: AGENT_ID,
        max_tokens: 8000,
        system: SYSTEM,
        messages: [{ role: 'user', content: userPrompt }],
      })
      const text = resp.content.find(b => b.type === 'text')
      if (text && text.type === 'text') {
        plan = parseJsonResponse<GeneratedPlan>(text.text)
      }
    } catch {
      // Fallback to powerful model
      const resp = await client.messages.create({
        model: MODELS.powerful,
        max_tokens: 8000,
        system: SYSTEM,
        messages: [{ role: 'user', content: userPrompt }],
      })
      const text = resp.content.find(b => b.type === 'text')
      if (text && text.type === 'text') {
        plan = parseJsonResponse<GeneratedPlan>(text.text)
      }
    }

    if (!plan) {
      return NextResponse.json({ error: 'No response from model' }, { status: 500 })
    }

    return NextResponse.json({ program: plan })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
