export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient, MODELS, parseJsonResponse } from '@/lib/agents/base'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      activities: {
        id: string; sport_type: string; title: string | null; started_at: string
        moving_time_s: number | null; distance_m: number | null; tss: number | null
        average_heartrate: number | null; max_heartrate: number | null
        average_speed: number | null; average_watts: number | null
        avg_cadence: number | null; intensity_factor: number | null
        aerobic_decoupling: number | null; cardiac_drift_pct: number | null
        streams: { heartrate?: number[]; watts?: number[]; velocity_smooth?: number[]; altitude?: number[] } | null
      }[]
      zones: unknown
      planned: unknown
      recovery: unknown[]
      similar: unknown[]
      tssWeekBefore: number
      aiRules: { category: string; rule_text: string }[]
    }

    const { activities, zones, planned, recovery, similar, tssWeekBefore, aiRules } = body
    const isComparison = activities.length >= 2
    const client = getAnthropicClient()

    const systemPrompt = `Tu es un coach sportif expert en analyse de séances d'entraînement.
Tu réponds UNIQUEMENT en JSON valide. Zéro texte avant ou après.

ANALYSE EN 4 COUCHES OBLIGATOIRES :
1. EXÉCUTION — qualité de réalisation de la séance (intensité, distribution des zones, drift cardiaque, EI)
2. CONTEXTE RÉCUPÉRATION — état de forme et récupération au moment de la séance (HRV, sommeil, fatigue)
3. PLAN VS RÉALISÉ — comparer avec la séance planifiée si disponible
4. TENDANCE HISTORIQUE — comparer avec les séances similaires passées

${isComparison ? `MODE COMPARAISON ACTIVÉ :
- Produire un tableau "deltas" avec toutes les métriques clés comparées
- Verdict de progression/régression/stable
- Si même parcours (distance similaire) : interpréter les différences en termes de progression physique` : ''}

EFFICIENCY INDEX (EI) :
- Vélo : watts / FC (ex: 250W / 145bpm = 1.72 EI)
- Course : vitesse_ms / FC × 100 (ex: 3.5 m/s / 145bpm × 100 = 2.41)
- Un EI plus élevé = plus efficace à même effort cardiaque
- Compare avec les séances similaires pour évaluer progression

DISTRIBUTION DES ZONES (si pas calculée côté client) :
- Utilise les données de FC brutes ou average_heartrate + zones configurées
- Retourne zone_distribution avec des couleurs : Z1=#93c5fd, Z2=#6ee7b7, Z3=#fde68a, Z4=#fca5a5, Z5=#f87171

RÈGLES :
- Verdict : excellent si EI supérieur aux similaires ET drift < 5% ; bon si exécution conforme ; passable si dérive notable ; a_revoir si problème sérieux
- Conseils : 2-3 maximum, justifiés par les données
- Actions suggérées : choisir parmi estimer_zones, analyser_progression, analyser_semaine
- Sources : lister précisément quelles données ont été utilisées`

    const rulesBlock = (aiRules ?? []).length > 0
      ? `\nRÈGLES PERSONNELLES :\n${(aiRules ?? []).map(r => `- [${r.category}] ${r.rule_text}`).join('\n')}`
      : ''

    const mainAct = activities[0]

    const userPrompt = `${isComparison ? 'COMPARAISON DE 2 SÉANCES' : 'SÉANCE À ANALYSER'} :
${activities.map((a, i) => `
--- ${isComparison ? `Séance ${String.fromCharCode(65 + i)}` : 'Séance'} ---
Titre : ${a.title ?? a.sport_type}
Sport : ${a.sport_type}
Date : ${a.started_at?.slice(0, 10)}
Durée : ${a.moving_time_s ? Math.round(a.moving_time_s / 60) + 'min' : 'N/A'}
Distance : ${a.distance_m ? (a.distance_m / 1000).toFixed(2) + 'km' : 'N/A'}
TSS : ${a.tss ?? 'N/A'}
FC moyenne : ${a.average_heartrate ?? 'N/A'}bpm · FC max : ${a.max_heartrate ?? 'N/A'}bpm
Puissance moyenne : ${a.average_watts ?? 'N/A'}W
Vitesse moyenne : ${a.average_speed ? (a.average_speed * 3.6).toFixed(1) + 'km/h' : 'N/A'}
Cadence : ${a.avg_cadence ?? 'N/A'}rpm
Intensity Factor : ${a.intensity_factor ?? 'N/A'}
Aerobic Decoupling : ${a.aerobic_decoupling ?? 'N/A'}%
Drift cardiaque calculé : ${a.cardiac_drift_pct ?? 'N/A'}%
Streams disponibles : ${a.streams ? Object.keys(a.streams).join(', ') : 'aucun'}
`).join('\n')}

TSS cumulé semaine avant cette séance : ${tssWeekBefore}pts

ZONES CONFIGURÉES (${mainAct.sport_type}) :
${zones ? JSON.stringify(zones, null, 2) : 'Aucune zone configurée'}

SÉANCE PLANIFIÉE CORRESPONDANTE :
${planned ? JSON.stringify(planned, null, 2) : 'Aucune séance planifiée trouvée'}

DONNÉES RÉCUPÉRATION (3 derniers jours) :
${JSON.stringify(recovery, null, 2)}

SÉANCES SIMILAIRES HISTORIQUE (10 dernières de même sport et durée proche) :
${JSON.stringify(similar, null, 2)}
${rulesBlock}

Retourne ce JSON (mode: "${isComparison ? 'comparison' : 'single'}") :
{
  "mode": "${isComparison ? 'comparison' : 'single'}",
  "verdict": "bon",
  "kpis": { "duree_min": 75, "distance_km": 32.0, "tss": 88, "efficiency_index": 1.72, "ei_vs_average": 3.5 },
  "zone_distribution": [
    { "zone": "Z1", "pct": 10, "minutes": 7, "color": "#93c5fd" },
    { "zone": "Z2", "pct": 55, "minutes": 41, "color": "#6ee7b7" },
    { "zone": "Z3", "pct": 25, "minutes": 19, "color": "#fde68a" },
    { "zone": "Z4", "pct": 8, "minutes": 6, "color": "#fca5a5" },
    { "zone": "Z5", "pct": 2, "minutes": 2, "color": "#f87171" }
  ],
  "cardiac_drift_pct": 3.2,
  "interpretation": {
    "execution": "Exécution propre — distribution de zones conforme à une séance Z2/Z3.",
    "contexte_recuperation": "HRV normal, récupération correcte.",
    "plan_vs_realise": "Séance planifiée : 1h Endurance. Réalisé : 1h15 avec dérive en Z3 en fin.",
    "tendance_historique": "EI en progression de +3.5% vs les 10 dernières séances similaires."
  },
  "conseils": [
    { "label": "Maintenir la maîtrise en Z2", "detail": "La dérive vers Z3 en fin de séance indique une légère fatigue.", "data_justification": "Drift cardiaque +3.2% et 25% du temps en Z3" }
  ],
  "comparison": ${isComparison ? `{
    "activite_b": { "titre": "${activities[1]?.title ?? activities[1]?.sport_type ?? 'Séance B'}", "date": "${activities[1]?.started_at?.slice(0, 10) ?? ''}" },
    "deltas": [
      { "metrique": "Durée", "a": "1h15", "b": "1h10", "delta": "+5min", "interpretation": "Séance A plus longue" },
      { "metrique": "TSS", "a": "88", "b": "82", "delta": "+6", "interpretation": "Charge légèrement supérieure" },
      { "metrique": "EI", "a": "1.72", "b": "1.68", "delta": "+2.4%", "interpretation": "Légère progression d'efficience" }
    ],
    "verdict": "Progression légère sur l'efficience — confirmation en refaisant ce parcours dans 4 semaines.",
    "progression": "progression"
  }` : 'null'},
  "sources_used": ["séance du ${mainAct.started_at?.slice(0, 10)}", "zones configurées", "récupération 3j", "10 séances similaires"],
  "confiance": "élevée",
  "actions_suggerees": [
    { "label": "Analyser ma progression", "flow": "analyser_progression" },
    { "label": "Estimer mes zones", "flow": "estimer_zones" }
  ]
}`

    const response = await client.messages.create({
      model: MODELS.powerful,
      max_tokens: isComparison ? 8000 : 6000,
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
      for (const c of raw) { if (c === '{') braces++; if (c === '}') braces--; if (c === '[') brackets++; if (c === ']') brackets-- }
      raw += ']'.repeat(Math.max(0, brackets)) + '}'.repeat(Math.max(0, braces))
      report = JSON.parse(raw) as unknown
    }

    return NextResponse.json({ report })
  } catch (err) {
    console.error('[analyze-training]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
