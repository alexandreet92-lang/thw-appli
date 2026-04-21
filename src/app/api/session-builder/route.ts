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

  if (modification && sessionActuelle) {
    // Mode modification
    userPrompt = `Tu as précédemment généré cette séance :
${JSON.stringify(sessionActuelle, null, 2)}

L'athlète souhaite la modifier ainsi :
"${modification}"

Génère une nouvelle version modifiée selon ses demandes.
Conserve ce qui n'est pas explicitement modifié.

Profil athlète :${profil?.ftp ? `\n- FTP : ${profil.ftp}W` : ''}${profil?.sl1 ? `\n- SL1 run : ${profil.sl1}` : ''}${profil?.sl2 ? `\n- SL2 run : ${profil.sl2}` : ''}${profil?.zones ? `\n- Zones : ${JSON.stringify(profil.zones)}` : ''}

Retourne UNIQUEMENT ce JSON :
${JSON_SCHEMA}`
  } else {
    // Mode génération initiale
    userPrompt = `Crée une séance d'entraînement structurée avec les paramètres suivants :

Sport : ${sport}${sousType ? `\nSous-type : ${sousType}` : ''}
Types de séance : ${typesSeance.join(', ')}${descriptionLibre ? `\nDescription libre de l'athlète : "${descriptionLibre}"` : ''}

Profil athlète :${profil?.ftp ? `\n- FTP vélo : ${profil.ftp}W` : ''}${profil?.sl1 ? `\n- SL1 run : ${profil.sl1}` : ''}${profil?.sl2 ? `\n- SL2 run : ${profil.sl2}` : ''}${profil?.zones ? `\n- Zones : ${JSON.stringify(profil.zones)}` : ''}
${!profil?.ftp && !profil?.sl1 ? '- Profil non configuré — utilise des valeurs relatives (zones)' : ''}

Règles :
- Inclure systématiquement un bloc échauffement et un retour au calme
- Les intensités doivent être précises (zones, watts, allures si disponibles)
- TSS estimé cohérent avec la durée et l'intensité
- RPE cible cohérent avec l'intensité
- Les blocs doivent être dans l'ordre chronologique
- Pour muscu/renfo : duree_effort = durée d'un circuit ou série, recup = repos entre séries

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
