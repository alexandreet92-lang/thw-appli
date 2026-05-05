export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient, MODELS, parseJsonResponse } from '@/lib/agents/base'

type StreamData = {
  heartrate?: number[]
  watts?: number[]
  velocity_smooth?: number[]
  altitude?: number[]
  distance?: number[]
  cadence?: number[]
  time?: number[]
} | null

type LapData = {
  distance_m: number
  moving_time_s: number
  avg_hr?: number
  avg_watts?: number
  avg_speed_ms?: number
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      activities: {
        id: string
        sport_type: string
        title: string | null
        started_at: string
        moving_time_s: number | null
        distance_m: number | null
        tss: number | null
        // Colonnes réelles Supabase
        avg_hr: number | null
        max_hr: number | null
        avg_speed_ms: number | null
        avg_watts: number | null
        avg_cadence: number | null
        avg_pace_s_km: number | null
        intensity_factor: number | null
        aerobic_decoupling: number | null
        is_race?: boolean | null
        // Métriques optionnelles
        normalized_watts?: number | null
        cardiac_drift_pct?: number | null
        laps?: LapData[]
        streams: StreamData
      }[]
      zones: unknown
      planned: unknown
      recovery: unknown[]
      similar: unknown[]
      tssWeekBefore: number
      isRace?: boolean
      sport?: string
      aiRules: { category: string; rule_text: string }[]
      // Métriques pré-calculées côté client
      cardiac_drift_pct?: number | null
      efficiency_index?: number | null
      ei_vs_similar_avg?: number | null
      zone_distribution?: { zone: string; pct: number; minutes: number; color: string }[] | null
    }

    const { activities, zones, planned, recovery, similar, tssWeekBefore, aiRules } = body
    const isComparison = activities.length >= 2
    const client = getAnthropicClient()
    const mainAct = activities[0]

    // ── Résumé des streams (stats basiques — pas les données brutes) ──
    function streamSummary(streams: StreamData): string {
      if (!streams) return 'Aucun stream disponible'
      const lines: string[] = []
      const summarize = (
        arr: number[] | undefined,
        label: string,
        unit: string,
        fmt?: (v: number) => string,
      ) => {
        if (!arr || arr.length < 10) return
        const min = Math.min(...arr)
        const max = Math.max(...arr)
        const avg = arr.reduce((a, b) => a + b, 0) / arr.length
        const q1 = arr.slice(0, Math.floor(arr.length / 4))
        const q4 = arr.slice(Math.floor(arr.length * 3 / 4))
        const avgQ1 = q1.reduce((a, b) => a + b, 0) / q1.length
        const avgQ4 = q4.reduce((a, b) => a + b, 0) / q4.length
        const f = fmt ?? ((v: number) => Math.round(v).toString())
        lines.push(
          `${label}: moy=${f(avg)} min=${f(min)} max=${f(max)} Q1_moy=${f(avgQ1)} Q4_moy=${f(avgQ4)} (${arr.length} pts) ${unit}`,
        )
      }
      summarize(streams.heartrate, 'FC', 'bpm')
      summarize(streams.watts, 'Puissance', 'W')
      summarize(streams.velocity_smooth, 'Vitesse', 'm/s', v => v.toFixed(2))
      summarize(streams.altitude, 'Altitude', 'm')
      summarize(streams.cadence, 'Cadence', 'rpm')
      return lines.length > 0 ? lines.join('\n') : 'Streams déclarés mais vides'
    }

    // ── Formatage des laps ────────────────────────────────────────
    function lapsText(laps: LapData[] | undefined): string {
      if (!laps || laps.length === 0) return 'Aucun lap/intervalle'
      return laps
        .map((l, i) => {
          const dist = l.distance_m > 0 ? `${(l.distance_m / 1000).toFixed(2)}km` : '—'
          const dur = `${Math.floor(l.moving_time_s / 60)}:${String(l.moving_time_s % 60).padStart(2, '0')}`
          const hr = l.avg_hr ? `FC ${Math.round(l.avg_hr)}bpm` : ''
          const w = l.avg_watts ? `${Math.round(l.avg_watts)}W` : ''
          const pace =
            l.avg_speed_ms && l.avg_speed_ms > 0
              ? `${Math.floor(1000 / l.avg_speed_ms / 60)}:${String(Math.round((1000 / l.avg_speed_ms) % 60)).padStart(2, '0')}/km`
              : ''
          return `  Lap ${i + 1}: ${dist} | ${dur} | ${[hr, w, pace].filter(Boolean).join(' | ')}`
        })
        .join('\n')
    }

    const rulesBlock =
      (aiRules ?? []).length > 0
        ? `\nRÈGLES PERSONNELLES DE L'ATHLÈTE :\n${(aiRules ?? []).map(r => `- [${r.category}] ${r.rule_text}`).join('\n')}`
        : ''

    const systemPrompt = `Tu es un coach sportif de haut niveau spécialisé en physiologie de l'effort et analyse de performance. Tu analyses les séances d'entraînement comme un entraîneur qui suit cet athlète depuis des mois.

TON APPROCHE :
- Tu ne LISTES PAS les métriques — l'athlète les voit déjà dans les graphiques. Tu INTERPRÈTES ce qu'elles signifient.
- Tu identifies les PATTERNS, les ANOMALIES et les SIGNAUX que l'athlète ne verrait pas seul.
- Tu fais des CONNEXIONS entre les données : "Ta FC a drifté de 8% mais ta puissance est restée stable → ton système aérobie a compensé, c'est un signe d'endurance de base solide malgré la fatigue."
- Tu donnes des EXPLICATIONS PHYSIOLOGIQUES accessibles : pourquoi ce drift, pourquoi cette chute de puissance, qu'est-ce que ça révèle sur le système énergétique.
- Tu es AUTONOME : tu adaptes ta profondeur d'analyse aux données disponibles. Plus il y a de données, plus l'analyse est profonde. Moins il y en a, plus tu le signales et tu te concentres sur ce qui est disponible.
- Si c'est une course (is_race=true), adapte : analyse la stratégie de pacing, les sections fortes/faibles, la gestion de l'effort, le finish.

STRUCTURE OBLIGATOIRE DE TON ANALYSE dans le champ "interpretation" :

"execution" — VERDICT + NARRATIVE DE LA SÉANCE (2-4 paragraphes)
Commence par 2-3 phrases percutantes : le message principal. Pas de blabla d'introduction.
Puis raconte l'histoire physiologique de la séance. Début, milieu, fin. Qu'est-ce qui a changé et pourquoi ?
Utilise les métriques pour raconter l'histoire, pas pour faire une liste.
Inclus la gestion de l'intensité : l'athlète a-t-il exécuté correctement ? Trop conservateur ? Trop agressif ?
Si laps disponibles : régularité des blocs, fatigue inter-blocs, capacité de reproduction de l'effort.
Signaux physiologiques : drift cardiaque (interprétation physio), découplement aérobie, EI vs habitudes, cadence.
Adapte au sport : vélo = focus puissance/cadence/NP, course = focus allure/cadence/dénivelé.

"contexte_recuperation" — ÉTAT DE FORME (1-2 paragraphes)
Si données de récupération disponibles (HRV, sommeil, fatigue) : "Tu as fait cette séance avec un HRV de X (Y% sous ta baseline). Ça explique probablement..."
Si TSS semaine avant disponible : interpréter la charge accumulée et son impact potentiel.
Si aucune donnée : signaler clairement ce que cela empêche d'analyser.

"plan_vs_realise" — PLAN VS RÉALITÉ (1 paragraphe, ou null si pas de planifié)
Si séance planifiée disponible : l'athlète a-t-il exécuté ce qui était prévu ? Écart significatif ?
Si course alors que planifiée entraînement : noter l'écart et adapter l'analyse.

"tendance_historique" — COMPARAISON AVEC L'HISTORIQUE (1-2 paragraphes)
Compare avec les séances similaires. Pas juste les chiffres — ce que ça SIGNIFIE pour la progression.
EI en progression, stagnation, régression ? Drift qui s'améliore ou se dégrade ?
Identifier les signaux de progression ou de plateau.

TABLEAUX MARKDOWN dans le champ "execution" :
Quand pertinent, utilise des tableaux markdown pour démontrer tes observations :
- Si laps disponibles : tableau de splits avec colonnes Lap | Distance | Durée | FC moy | Watts | Allure | Observation
- Tableau de comparaison par quart : Q1 | Q2 | Q3 | Q4 avec métriques clés
- Chaque tableau DOIT être précédé d'une phrase expliquant ce qu'on va y voir, et suivi d'une phrase interprétant ce que ça révèle.

METS EN GRAS (**...**) les insights clés et les chiffres importants.

${isComparison ? `MODE COMPARAISON ACTIVÉ :
- Tableau "deltas" détaillé avec toutes les métriques clés comparées
- Interpréter chaque delta : qu'est-ce que la différence RÉVÈLE ? Progression ? Conditions différentes ?
- Verdict de progression/régression/stable avec explication physiologique
- Si même distance : interpréter les différences en termes de progression physique réelle` : ''}

EFFICIENCY INDEX (EI) :
- Vélo : watts / FC (ex: 250W / 145bpm = 1.72)
- Course : vitesse_ms / FC × 100 (ex: 3.5 m/s / 145bpm × 100 = 2.41)
- Un EI plus élevé = plus efficace à même effort cardiaque

RÈGLES :
- Verdict : "excellent" si EI supérieur aux similaires ET drift < 5% ET exécution conforme ; "bon" si exécution correcte ; "passable" si dérive notable ou exécution approximative ; "a_revoir" si problème sérieux
- Conseils : 2-3 maximum, ultra-concrets et spécifiques à CETTE séance. Chaque conseil DOIT citer une donnée dans "data_justification".
- Si données manquantes (zones, FC, streams) : le signaler dans le conseil approprié.
- N'invente JAMAIS de données. Si une métrique n'est pas disponible, ne la mentionne pas.
- Sources : lister précisément quelles données ont été utilisées (avec dates pour les séances similaires).
- Confiance : "élevée" si streams + zones + récupération ; "modérée" si streams mais pas de zones/récup ; "faible" si données agrégées uniquement.
- actions_suggerees : tableau vide [].

Tu réponds UNIQUEMENT en JSON valide. Zéro texte avant ou après.`

    const userPrompt = `${isComparison ? 'COMPARAISON DE 2 SÉANCES' : 'SÉANCE À ANALYSER'} :
${activities
  .map(
    (a, i) => `
--- ${isComparison ? `Séance ${String.fromCharCode(65 + i)}` : 'Séance'} ---
Titre : ${a.title ?? a.sport_type}
Sport : ${a.sport_type}
Date : ${a.started_at?.slice(0, 10)}
Course/Compétition : ${a.is_race ? 'OUI' : 'non'}
Durée : ${a.moving_time_s ? Math.round(a.moving_time_s / 60) + 'min' : 'N/A'}
Distance : ${a.distance_m ? (a.distance_m / 1000).toFixed(2) + 'km' : 'N/A'}
TSS : ${a.tss ?? 'N/A'}
FC moyenne : ${a.avg_hr ?? 'N/A'}bpm · FC max : ${a.max_hr ?? 'N/A'}bpm
Puissance moyenne : ${a.avg_watts ?? 'N/A'}W · NP : ${a.normalized_watts ?? 'N/A'}W
Allure moyenne : ${a.avg_pace_s_km ? Math.floor(a.avg_pace_s_km / 60) + ':' + String(Math.round(a.avg_pace_s_km % 60)).padStart(2, '0') + '/km' : 'N/A'}
Vitesse moyenne : ${a.avg_speed_ms ? (a.avg_speed_ms * 3.6).toFixed(1) + 'km/h' : 'N/A'}
Cadence : ${a.avg_cadence ?? 'N/A'}rpm
Intensity Factor : ${a.intensity_factor ?? 'N/A'}
Aerobic Decoupling : ${a.aerobic_decoupling ?? 'N/A'}%
Drift cardiaque : ${a.cardiac_drift_pct != null ? a.cardiac_drift_pct.toFixed(1) + '%' : 'non calculé'}

PROFIL DES STREAMS :
${streamSummary(a.streams)}

LAPS / INTERVALLES :
${lapsText(a.laps)}
`,
  )
  .join('\n')}

MÉTRIQUES PRÉ-CALCULÉES (côté client) :
Drift cardiaque global : ${body.cardiac_drift_pct != null ? body.cardiac_drift_pct.toFixed(1) + '%' : 'non calculé'}
Efficiency Index : ${body.efficiency_index != null ? body.efficiency_index.toFixed(3) : 'non calculé'}
EI vs moyenne séances similaires : ${body.ei_vs_similar_avg != null ? (body.ei_vs_similar_avg > 0 ? '+' : '') + body.ei_vs_similar_avg.toFixed(1) + '%' : 'non calculé'}
Distribution zones (client) : ${body.zone_distribution ? JSON.stringify(body.zone_distribution) : 'non calculée — à estimer depuis la FC et les zones configurées'}

TSS cumulé semaine avant cette séance : ${tssWeekBefore}pts

ZONES CONFIGURÉES (${mainAct.sport_type}) :
${zones ? JSON.stringify(zones, null, 2) : "Aucune zone configurée — signaler que cela limite l'analyse de la distribution d'intensité"}

SÉANCE PLANIFIÉE CORRESPONDANTE :
${planned ? JSON.stringify(planned, null, 2) : 'Aucune séance planifiée trouvée'}

DONNÉES RÉCUPÉRATION (3 derniers jours) :
${(recovery ?? []).length > 0 ? JSON.stringify(recovery, null, 2) : "Aucune donnée de récupération disponible — signaler que cela empêche d'analyser le contexte de forme"}

SÉANCES SIMILAIRES HISTORIQUE (10 dernières de même sport et durée proche) :
${(similar ?? []).length > 0 ? JSON.stringify(similar, null, 2) : 'Aucune séance similaire trouvée'}
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
    "execution": "VERDICT PERCUTANT en 2-3 phrases. Puis narrative physiologique de la séance avec **chiffres en gras**. Tableaux markdown si laps disponibles. 2-4 paragraphes minimum.",
    "contexte_recuperation": "Analyse de l'état de forme au moment de la séance.",
    "plan_vs_realise": "Comparaison plan vs réalité (null si pas de planifié).",
    "tendance_historique": "Comparaison avec l'historique et signification pour la progression."
  },
  "conseils": [
    { "label": "Titre du conseil", "detail": "Explication concrète et spécifique à cette séance.", "data_justification": "Données de cette séance qui justifient ce conseil." }
  ],
  "comparison": ${
    isComparison
      ? `{
    "activite_b": { "titre": "${activities[1]?.title ?? activities[1]?.sport_type ?? 'Séance B'}", "date": "${activities[1]?.started_at?.slice(0, 10) ?? ''}" },
    "deltas": [
      { "metrique": "Métrique", "a": "valeur A", "b": "valeur B", "delta": "+X", "interpretation": "Ce que cette différence révèle physiologiquement." }
    ],
    "verdict": "Interprétation globale de la comparaison — pas juste les chiffres.",
    "progression": "progression|regression|stable"
  }`
      : 'null'
  },
  "sources_used": ["liste précise des sources utilisées avec dates"],
  "confiance": "élevée|modérée|faible",
  "actions_suggerees": []
}`

    const response = await client.messages.create({
      model: MODELS.powerful,
      max_tokens: isComparison ? 10000 : 8000,
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
    console.error('[analyze-training]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
