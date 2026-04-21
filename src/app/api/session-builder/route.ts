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
Si une valeur n'est pas applicable, utilise null.`

const JSON_SCHEMA = `{
  "nom": "string — nom court et précis de la séance",
  "sport": "string — sport de la séance",
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
}`

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
      context = `- SL1 (Seuil lactique) : ${p.sl1 || 'non configuré'}
- SL2 (Seuil anaérobie) : ${p.sl2 || 'non configuré'}
- Zones d'intensité définies : ${p.zones ? Object.entries(p.zones).map(([k, v]) => `${k}=${v}`).join(', ') : 'non configurées'}
NOTES :
  • Utilise SL1/SL2 pour recommander allure_cible en minutes/km
  • La zone Z1 est environ +20s/km au-dessus de SL2, Z2 est SL1 à SL2, Z3 est SL2, Z4/Z5 sont en-dessous de Z2
  • Si zones sont configurées, utilise-les pour dériver les allures correspondantes
  • Chaque bloc doit avoir une allure_cible explicite basée sur l'athlète`
    } else if (sp === 'cycling' || sp === 'vélo') {
      context = `- FTP (Functional Threshold Power) : ${p.ftp || 'non configuré'}W
- Zones d'intensité définies : ${p.zones ? Object.entries(p.zones).map(([k, v]) => `${k}=${v}%FTP`).join(', ') : 'non configurées'}
NOTES :
  • Utilise FTP pour calculer les watts cibles
  • Si zones sont configurées (ex: Z3=85-105% FTP), recommande des watts dans ces plages
  • Chaque bloc de puissance doit avoir watts explicite : watts = FTP × pourcentage_zone / 100
  • Évite d'utiliser des watts génériques — base-toi sur le FTP de l'athlète`
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
${JSON_SCHEMA}`
  } else {
    // Mode génération initiale
    userPrompt = `Crée une séance d'entraînement structurée avec les paramètres suivants :

Sport : ${sport}${sousType ? `\nSous-type : ${sousType}` : ''}
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
${JSON_SCHEMA}`
  }

  try {
    const client = getAnthropicClient()
    const resp = await client.messages.create({
      model: MODELS.balanced,
      max_tokens: 3000,
      system: SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
    })
    const text = resp.content.find(b => b.type === 'text')
    if (!text || text.type !== 'text') {
      return NextResponse.json({ error: 'No response from model' }, { status: 500 })
    }
    const session = parseJsonResponse<GeneratedSession>(text.text)
    return NextResponse.json({ session })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
