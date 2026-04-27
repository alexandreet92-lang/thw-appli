import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient, MODELS } from '@/lib/agents/base'

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
  note_coach?: string
  // Toutes les semaines ont des séances ; les blocs sont détaillés S1-S2 uniquement
  seances?: PlanSeance[]
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

// ── JSON schema ────────────────────────────────────────────────

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
      "description": "string (1 phrase)",
      "volume_hebdo_h": "number"
    }
  ],
  "semaines": [
    {
      "numero": "number",
      "type": "string",
      "volume_h": "number",
      "tss_semaine": "number",
      "theme": "string (1 phrase courte)",
      "note_coach": "string (1 phrase de coaching)",
      "seances": [
          {
            "jour": "number (0=lundi, 6=dimanche)",
            "sport": "string",
            "titre": "string",
            "duree_min": "number",
            "tss": "number",
            "intensite": "low | moderate | high | max",
            "heure": "string (ex: 06:30)",
            "notes": "string (1 phrase, ≤12 mots)",
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
                "consigne": "string (1 phrase, ≤10 mots)"
              }
            ]
          }
      ]
    }
  ],
  "conseils_adaptation": ["string (3 max)"],
  "points_cles": ["string (3 max)"]
}`

// ── repairJSON ────────────────────────────────────────────────
// Tente de réparer un JSON tronqué en trouvant le dernier
// objet complet et en fermant proprement les crochets manquants.

function repairJSON(raw: string): string {
  // Nettoyer markdown et trouver le début JSON
  let text = raw.trim()
  const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (mdMatch) text = mdMatch[1].trim()
  const start = text.search(/[{[]/)
  if (start > 0) text = text.slice(start)

  // Tenter le parse direct
  try { JSON.parse(text); return text } catch { /* repair needed */ }

  // Scanner pour trouver le dernier endroit "propre" à couper
  // et la séquence de fermeture manquante
  const stack: string[] = []
  let inStr = false
  let esc = false
  let lastSafeClose = -1

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (esc)                  { esc = false; continue }
    if (c === '\\' && inStr)  { esc = true;  continue }
    if (c === '"')            { inStr = !inStr; continue }
    if (inStr)                continue

    if (c === '{' || c === '[') {
      stack.push(c === '{' ? '}' : ']')
    } else if (c === '}' || c === ']') {
      stack.pop()
      // Enregistrer les positions où on ferme un élément imbriqué
      // (pas à la racine = stack non vide après le pop)
      if (stack.length >= 1) lastSafeClose = i
    }
  }

  // Si le JSON est déjà équilibré mais invalide → rien à faire
  if (stack.length === 0) return text

  // Tronquer au dernier endroit propre
  let repaired = lastSafeClose >= 0
    ? text.slice(0, lastSafeClose + 1)
    : text

  // Supprimer une éventuelle virgule finale orpheline
  repaired = repaired.replace(/,\s*$/, '')

  // Ajouter les fermetures manquantes dans l'ordre inverse
  repaired += stack.reverse().join('')

  // Vérifier que le résultat est valide
  try { JSON.parse(repaired); return repaired } catch { return text }
}

// ─────────────────────────────────────────────────────────────

function parseAndRepair<T>(raw: string): T {
  console.log('[training-plan] raw response length:', raw.length)
  console.log('[training-plan] raw response tail (200 chars):', raw.slice(-200))

  let text = raw.trim()

  // Strip markdown code block
  const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (mdMatch) text = mdMatch[1].trim()

  // Find first { or [
  const start = text.search(/[{[]/)
  if (start > 0) text = text.slice(start)

  // First attempt: direct parse
  try {
    return JSON.parse(text) as T
  } catch (e) {
    console.log('[training-plan] Direct parse failed:', e instanceof Error ? e.message : String(e))
  }

  // Second attempt: repair truncated JSON
  const repaired = repairJSON(raw)
  console.log('[training-plan] Attempting repaired JSON parse, length:', repaired.length)
  return JSON.parse(repaired) as T
}

// ─────────────────────────────────────────────────────────────
// normalizePlan — accepte les variations de clés renvoyées par l'agent
// (programme/program, semaines/weeks, blocs/blocks/blocs_periodisation)
// et ramène vers la forme GeneratedPlan attendue par le front.
// ─────────────────────────────────────────────────────────────

function normalizePlan(raw: unknown): GeneratedPlan {
  const r = (raw ?? {}) as Record<string, unknown>

  // Unwrap si l'agent double-wrap : { programme: {...} } ou { program: {...} }
  const inner = (r.programme && typeof r.programme === 'object') ? r.programme as Record<string, unknown>
              : (r.program   && typeof r.program   === 'object') ? r.program   as Record<string, unknown>
              : r

  // Aliases top-level
  const semainesRaw = (inner.semaines ?? inner.weeks) as unknown[] | undefined
  const blocsRaw    = (inner.blocs_periodisation ?? inner.blocs ?? inner.blocks) as unknown[] | undefined

  // Normaliser chaque semaine : seances/sessions, et chaque seance : blocs/blocks
  const semaines = Array.isArray(semainesRaw) ? semainesRaw.map(w => {
    const wr = (w ?? {}) as Record<string, unknown>
    const seancesRaw = (wr.seances ?? wr.sessions) as unknown[] | undefined
    const seances = Array.isArray(seancesRaw) ? seancesRaw.map(s => {
      const sr = (s ?? {}) as Record<string, unknown>
      const blocsSeance = (sr.blocs ?? sr.blocks) as unknown[] | undefined
      return { ...sr, blocs: Array.isArray(blocsSeance) ? blocsSeance : [] }
    }) : undefined
    return seances ? { ...wr, seances } : { ...wr }
  }) : []

  return {
    ...(inner as unknown as GeneratedPlan),
    // Alias: AI may return `name` instead of the schema-mandated `nom`
    nom: (inner.nom ?? inner.name ?? 'Plan d\'entraînement') as string,
    // Alias: AI may return `objectif` instead of `objectif_principal`
    objectif_principal: (inner.objectif_principal ?? inner.objectif ?? '') as string,
    semaines: semaines as GeneratedPlan['semaines'],
    blocs_periodisation: (Array.isArray(blocsRaw) ? blocsRaw : []) as GeneratedPlan['blocs_periodisation'],
    conseils_adaptation: Array.isArray(inner.conseils_adaptation) ? inner.conseils_adaptation as string[] : [],
    points_cles: Array.isArray(inner.points_cles) ? inner.points_cles as string[] : [],
  }
}

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

  const userPrompt = `Crée un programme d'entraînement avec ces informations :

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

${modification ? `MODIFICATION DEMANDÉE :\n${modification}\n\nPROGRAMME EXISTANT :\n${JSON.stringify(programme_actuel ?? null, null, 2)}` : ''}

INSTRUCTIONS POUR LA GÉNÉRATION — RESPECTER IMPÉRATIVEMENT :
- Génère le détail complet des séances (seances[]) pour TOUTES les semaines du plan, sans exception.
- Pour chaque séance de chaque semaine : sport, titre, jour, duree_min, tss, intensite, heure, notes, rpe.
- Les blocs détaillés (blocs[]) : UNIQUEMENT pour les semaines 1 et 2. Pour les semaines 3+, mettre blocs à [] (tableau vide).
- Note_coach : OBLIGATOIRE pour chaque semaine, 1 phrase de coaching contextuelle.
- Limite conseils_adaptation à 3 éléments maximum.
- Limite points_cles à 3 éléments maximum.
- Chaque "consigne" ≤ 10 mots, chaque "notes" ≤ 12 mots — concision obligatoire pour tenir dans les tokens.
- Ne jamais omettre les séances d'une semaine, même en fin de plan.

Génère selon ce schéma JSON (UNIQUEMENT le JSON, rien d'autre) :
${JSON_SCHEMA}

RÈGLES :
1. Programme réaliste adapté au niveau et au temps disponible
2. Progression logique et périodisation intelligente
3. Semaine de deload toutes les 3-4 semaines
4. TSS cohérent avec la durée et l'intensité
5. Respect des jours de repos demandés`

  try {
    const client = getAnthropicClient()
    const AGENT_ID = 'agent_011Ca8Ar5a3gyowSA6fQ94UT'
    let plan: GeneratedPlan | null = null

    try {
      const resp = await client.messages.create({
        model: AGENT_ID,
        max_tokens: 16000,
        system: SYSTEM,
        messages: [{ role: 'user', content: userPrompt }],
      })
      const textBlock = resp.content.find(b => b.type === 'text')
      if (textBlock && textBlock.type === 'text') {
        plan = parseAndRepair<GeneratedPlan>(textBlock.text)
      }
    } catch (agentErr) {
      console.log('[training-plan] Agent failed, falling back to model:', agentErr instanceof Error ? agentErr.message : String(agentErr))
      // Fallback to powerful model
      const resp = await client.messages.create({
        model: MODELS.powerful,
        max_tokens: 16000,
        system: SYSTEM,
        messages: [{ role: 'user', content: userPrompt }],
      })
      const textBlock = resp.content.find(b => b.type === 'text')
      if (textBlock && textBlock.type === 'text') {
        plan = parseAndRepair<GeneratedPlan>(textBlock.text)
      }
    }

    if (!plan) {
      return NextResponse.json({ error: 'No response from model' }, { status: 500 })
    }

    // Log brut reçu de l'agent (pour debug des variations de clés)
    console.log('FULL DATA RAW:', JSON.stringify(plan, null, 2))

    // Normalisation : l'agent peut renvoyer les données avec des clés alternatives
    // (programme vs program, weeks vs semaines, blocs/blocks vs blocs_periodisation).
    // On ramène tout vers le schéma attendu par le front.
    const normalized = normalizePlan(plan)

    return NextResponse.json({ program: normalized })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.log('[training-plan] Fatal error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
