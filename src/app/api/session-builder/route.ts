import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient, MODELS, parseJsonResponse } from '@/lib/agents/base'

// Types
interface SessionBuilderRequestBody {
  sport: string
  sousType?: string
  typesSeance: string[]
  descriptionLibre?: string
  profil?: {
    ftp?: number
    sl1?: string
    sl2?: string
    zones?: Record<string, string>
  }
  // Pour modification
  sessionActuelle?: GeneratedSession
  modification?: string
}

interface GeneratedBloc {
  nom: string
  repetitions: number
  duree_effort: number
  recup: number
  zone_effort: string[]
  zone_recup: string[]
  watts: number | null
  fc_cible: number | null
  fc_max: number | null
  cadence: number | null
  allure_cible: string | null
  consigne: string
}

interface GeneratedSession {
  nom: string
  sport: string
  type_seance: string[]
  duree_estimee: number
  intensite: 'Faible' | 'Modéré' | 'Élevé' | 'Maximum'
  tss_estime: number
  rpe_cible: number
  tags: string[]
  description: string
  blocs: GeneratedBloc[]
}

const SYSTEM = `Tu es un coach expert en planification de séances d'entraînement sportif.
Tu réponds UNIQUEMENT avec un objet JSON valide selon le schéma fourni.
Aucun texte avant ni après, aucun commentaire, aucun bloc markdown.
Si une valeur n'est pas applicable, utilise null.

Avant de générer ta réponse, calcule mentalement la somme exacte des durées de tous les blocs (en tenant compte des répétitions et des récupérations) et vérifie qu'elle correspond à duree_estimee.
Ne jamais fusionner des répétitions en un seul bloc — chaque répétition doit rester distincte avec son effort et sa récupération. Si une séance contient 3×8min, le bloc doit avoir repetitions=3 et duree_effort=8, jamais repetitions=1 et duree_effort=24.`

function buildJsonSchema(sport: string): string { return `{
  "nom": "string — nom court et précis de la séance",
  "sport": "string — EXACTEMENT la valeur reçue en entrée, soit : '${sport}' — ne jamais changer le sport",
  "type_seance": ["string[]"],
  "duree_estimee": "number — durée totale en minutes",
  "intensite": "Faible | Modéré | Élevé | Maximum",
  "tss_estime": "number — TSS estimé",
  "rpe_cible": "number — RPE cible 1-10",
  "tags": ["string[]"],
  "description": "string — description générale de la séance",
  "blocs": [
    {
      "nom": "string",
      "repetitions": "number — nombre de répétitions (1 si bloc unique)",
      "duree_effort": "number — durée d'effort en minutes",
      "recup": "number — durée de récupération en minutes (0 si aucune)",
      "zone_effort": ["string[] — ex: ['Z4','Z5'] ou ['SL2']"],
      "zone_recup": ["string[] — ex: ['Z1','Z2']"],
      "watts": "number | null",
      "fc_cible": "number | null — FC cible bpm",
      "fc_max": "number | null — FC max bpm",
      "cadence": "number | null — RPM ou SPM",
      "allure_cible": "string | null — ex: '4:30/km'",
      "consigne": "string — consigne coach détaillée pour ce bloc"
    }
  ]
`}

// ── Validation ────────────────────────────────────────────────
interface ValidationResult {
  valid: boolean
  reasons: string[]
}

function validateSession(session: GeneratedSession, expectedSport: string): ValidationResult {
  const reasons: string[] = []

  // (1) Sport must match exactly
  if (session.sport !== expectedSport) {
    reasons.push(`sport "${session.sport}" ne correspond pas au sport attendu "${expectedSport}"`)
  }

  // (2) Total bloc duration must be within 5 min of duree_estimee
  // Total = Σ blocs [ repetitions × duree_effort + max(repetitions-1, 0) × recup ]
  // (recovery counted between reps only, not after last rep — matches chart logic)
  const totalMin = session.blocs.reduce((sum, b) => {
    const reps      = Math.max(1, b.repetitions ?? 1)
    const effort    = (b.duree_effort ?? 0) * reps
    const recovery  = (b.recup ?? 0) * Math.max(0, reps - 1)
    return sum + effort + recovery
  }, 0)
  const diff = Math.abs(totalMin - session.duree_estimee)
  if (diff > 5) {
    reasons.push(
      `durée totale des blocs (${totalMin} min) diffère de duree_estimee (${session.duree_estimee} min) de ${diff} min (tolérance : 5 min)`
    )
  }

  // (3) Detect "merged" repetitions: a bloc with repetitions > 1 whose duree_effort
  // equals (repetitions × a suspiciously round unit), i.e. duree_effort is divisible
  // by repetitions and the quotient is a plausible effort duration (≥ 1 min).
  // This catches cases like repetitions=3, duree_effort=24 (= 3×8) that should be
  // repetitions=3, duree_effort=8.
  for (const b of session.blocs) {
    const reps = Math.max(1, b.repetitions ?? 1)
    if (reps <= 1) continue
    const effort = b.duree_effort ?? 0
    if (effort > 0 && effort % reps === 0) {
      const unitDur = effort / reps
      // Only flag if unitDur >= 1 min (genuine merge, not rounding artifact)
      if (unitDur >= 1) {
        reasons.push(
          `bloc "${b.nom}" semble avoir des répétitions fusionnées : repetitions=${reps}, duree_effort=${effort} min` +
          ` (= ${reps}×${unitDur} min). Chaque répétition doit avoir duree_effort=${unitDur} min`
        )
      }
    }
  }

  return { valid: reasons.length === 0, reasons }
}

// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: SessionBuilderRequestBody
  try {
    body = await req.json() as SessionBuilderRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { sport, sousType, typesSeance, descriptionLibre, profil, sessionActuelle, modification } = body

  let userPrompt: string

  // Build sport-specific profil context
  const buildProfilContext = (sp: string, p?: typeof profil): string => {
    if (!p) return 'Profil non configuré — utilise des valeurs relatives (zones)'

    let context = ''

    if (sp === 'running') {
      const runZones = p.zones ? Object.entries(p.zones).filter(([k]) => k.startsWith('run_')).map(([k, v]) => `${k.replace('run_', '')}=${v}`).join(', ') : ''
      context = `- SL1 (Seuil lactique) : ${p.sl1 || 'non configuré'}
- SL2 (Seuil anaérobie) : ${p.sl2 || 'non configuré'}
- Zones d'intensité définies : ${runZones || 'non configurées'}
NOTES :
  • SL1 et SL2 sont des seuils clés — utilise-les pour recommander les allures_cible
  • Les zones run_z1 à run_z5 définissent les fourchettes précises de chaque intensité
  • Recommande des allures_cible qui correspondent EXACTEMENT aux zones ou seuils de l'athlète
  • Chaque bloc d'effort doit avoir une allure_cible explicite dans une zone de l'athlète
  • Ne jamais inventer des allures — utilise uniquement les seuils/zones fournis`
    } else if (sp === 'cycling' || sp === 'vélo') {
      const bikeZones = p.zones ? Object.entries(p.zones).filter(([k]) => k.startsWith('bike_')).map(([k, v]) => `${k.replace('bike_', '')}=${v}`).join(', ') : ''
      context = `- FTP (Functional Threshold Power) : ${p.ftp || 'non configuré'}W
- Zones d'intensité définies : ${bikeZones || 'non configurées'}
NOTES :
  • FTP est la puissance de référence — utilise-la pour calculer les watts cibles
  • Les zones bike_z1 à bike_z5 définissent les fourchettes précises en % de FTP
  • Recommande des watts_cible qui correspondent EXACTEMENT aux zones de l'athlète
  • Chaque bloc doit avoir watts explicite : cherche la fourchette dans la zone correspondante
  • Ne jamais inventer des watts génériques — utilise uniquement le FTP et zones fournis`
    } else if (sp === 'hyrox') {
      context = `- Configuration disponible : ${p.zones ? 'zones d\'intensité' : 'générique'}
NOTES :
  • Hyrox combine course + stations spécialisées
  • Utilise les zones disponibles pour structurer l'effort
  • Chaque bloc doit spécifier la zone_effort précise`
    } else if (sp === 'gym' || sp === 'natation' || sp === 'swimming') {
      context = `- Configuration disponible : ${p.zones ? 'zones d\'intensité' : 'générique'}
NOTES :
  • Utilise les zones ou seuils disponibles pour structurer l'intensité
  • Pour gym/renfo : duree_effort = durée d'une série, recup = repos
  • Chaque bloc doit avoir zone_effort et cadence/consignes précises`
    } else {
      context = `- FTP/SL1/SL2 : ${p.ftp ? 'FTP ' + p.ftp + 'W' : ''}${p.sl1 ? ', SL1 ' + p.sl1 : ''}${p.sl2 ? ', SL2 ' + p.sl2 : ''}
- Zones : ${p.zones ? JSON.stringify(p.zones) : 'non configurées'}`
    }

    return context
  }

  if (modification && sessionActuelle) {
    // Mode modification
    userPrompt = `Tu as précédemment généré cette séance :
${JSON.stringify(sessionActuelle, null, 2)}

L'athlète souhaite la modifier ainsi :
"${modification}"

Génère une nouvelle version modifiée selon ses demandes.
Conserve ce qui n'est pas explicitement modifié.

Profil athlète (Sport: ${sport}) :
${buildProfilContext(sport, profil)}

Retourne UNIQUEMENT ce JSON :
${buildJsonSchema(sport)}`
  } else {
    // Mode génération initiale
    userPrompt = `Crée une séance d'entraînement structurée avec les paramètres suivants :

Sport : ${sport}
IMPORTANT : le champ sport dans le JSON doit être EXACTEMENT "${sport}"${sousType ? `\nSous-type : ${sousType}` : ''}
Types de séance : ${typesSeance.join(', ')}${descriptionLibre ? `\nDescription libre de l'athlète : "${descriptionLibre}"` : ''}

Profil athlète (Sport: ${sport}) :
${buildProfilContext(sport, profil)}

Règles prioritaires :
1. Adapte la séance au profil de l'athlète (pas de données génériques)
2. Inclure systématiquement un bloc échauffement et un retour au calme
3. Les intensités doivent être précises :
   - Running : allure_cible en min/km, zone_effort basées sur SL1/SL2
   - Cycling : watts cibles basés sur FTP, zone_effort en % FTP
   - Autres : zone_effort précises selon les zones disponibles
4. TSS estimé cohérent avec la durée et l'intensité
5. RPE cible cohérent avec l'intensité
6. Les blocs doivent être dans l'ordre chronologique
7. Pour muscu/renfo : duree_effort = durée d'un circuit ou série, recup = repos entre séries
8. JAMAIS de valeurs génériques — TOUJOURS utiliser les données du profil de l'athlète

Retourne UNIQUEMENT ce JSON :
${buildJsonSchema(sport)}`
  }

  async function callModel(prompt: string): Promise<GeneratedSession | null> {
    const client = getAnthropicClient()
    const resp = await client.messages.create({
      model: MODELS.balanced,
      max_tokens: 3000,
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = resp.content.find(b => b.type === 'text')
    if (!text || text.type !== 'text') return null
    return parseJsonResponse<GeneratedSession>(text.text)
  }

  try {
    // ── Premier appel ──────────────────────────────────────────
    const session = await callModel(userPrompt)
    if (!session) {
      return NextResponse.json({ error: 'No response from model' }, { status: 500 })
    }

    // ── Validation + retry si nécessaire ──────────────────────
    const validation = validateSession(session, sport)
    if (!validation.valid) {
      const retryPrompt = userPrompt +
        `\n\nATTENTION — ta réponse précédente contenait les erreurs suivantes, corrige-les :\n` +
        validation.reasons.map(r => `• ${r}`).join('\n') +
        `\n\nGénère une nouvelle version corrigée en respectant strictement toutes les contraintes.`

      const retried = await callModel(retryPrompt)
      if (retried) {
        return NextResponse.json({ session: retried, _retried: true })
      }
      // Si le retry échoue, on retourne quand même la première réponse avec un avertissement
      return NextResponse.json({ session, _validation_warnings: validation.reasons })
    }

    return NextResponse.json({ session })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
