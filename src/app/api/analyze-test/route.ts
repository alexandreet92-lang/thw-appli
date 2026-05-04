export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient, MODELS, parseJsonResponse } from '@/lib/agents/base'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      test: { date: string; valeurs: Record<string, unknown>; notes: string | null; test_definitions: { nom: string; sport: string } | null }
      testContext: { tssWeek: number; hrv: number | null; hrvBaseline: number | null; validityScore: number } | null
      allTestsSameType: { date: string; valeurs: Record<string, unknown> }[]
      zones: unknown
      profile: unknown
      aiRules: { category: string; rule_text: string }[]
    }

    const { test, testContext, allTestsSameType, zones, profile, aiRules } = body
    const client = getAnthropicClient()

    const systemPrompt = `Tu es un expert en physiologie du sport et analyse de tests de performance.
Tu réponds UNIQUEMENT en JSON valide. Zéro texte avant ou après le JSON.

ANALYSE EN 4 PARTIES OBLIGATOIRES :
1. INTERPRÉTATION — niveau de performance, ce que ça signifie pour cet athlète
2. FIABILITÉ — score de fiabilité basé sur les conditions du test (HRV, charge semaine précédente). Si conditions dégradées, ESTIMER la valeur corrigée.
3. ÉVOLUTION — si historique disponible : progression %, tendance, projection 3-6 mois. Les valeurs dans "tests" doivent être des NOMBRES (pas des strings comme "278W" — donne 278).
4. IMPACT ZONES — comparer le résultat avec les zones actuellement configurées. Si écart > 5%, recommander mise à jour et proposer les nouvelles zones.

RÈGLES :
- Toutes les valeurs doivent être dérivées des données fournies, jamais inventées
- Si les zones ne sont pas configurées, proposer des zones depuis le test
- Être précis sur les chiffres et les pourcentages
- Ne survends JAMAIS la précision. Si validityScore < 60, dis clairement que le test est potentiellement biaisé.`

    const rulesBlock = (aiRules ?? []).length > 0
      ? `\n\nRÈGLES PERSONNELLES :\n${(aiRules ?? []).map(r => `- [${r.category}] ${r.rule_text}`).join('\n')}`
      : ''

    const userPrompt = `TEST ANALYSÉ :
Nom : ${test.test_definitions?.nom ?? 'Test'}
Sport : ${test.test_definitions?.sport ?? 'inconnu'}
Date : ${test.date}
Valeurs : ${JSON.stringify(test.valeurs)}
Notes : ${test.notes ?? 'aucune'}

CONTEXTE DU JOUR DU TEST :
TSS semaine précédente : ${testContext?.tssWeek ?? 'non disponible'}
HRV du jour : ${testContext?.hrv ?? 'non disponible'}
HRV baseline 28j : ${testContext?.hrvBaseline ?? 'non disponible'}
Validity score calculé : ${testContext?.validityScore ?? 'non calculé'}/100

HISTORIQUE TESTS DU MÊME TYPE (du plus récent au plus ancien) :
${allTestsSameType?.length > 1 ? JSON.stringify(allTestsSameType.map(t => ({ date: t.date, valeurs: t.valeurs })), null, 2) : 'Aucun test précédent disponible'}

ZONES ACTUELLEMENT CONFIGURÉES (${test.test_definitions?.sport}) :
${zones ? JSON.stringify(zones, null, 2) : 'Aucune zone configurée pour ce sport'}

PROFIL ATHLÈTE :
${profile ? JSON.stringify(profile, null, 2) : 'Non renseigné'}
${rulesBlock}

Retourne ce JSON (les valeurs dans evolution.tests doivent être des NOMBRES purs, pas des strings) :
{
  "interpretation": { "niveau": "Bon", "signification": "Ce que ça signifie concrètement", "detail": "Explication détaillée" },
  "fiabilite": {
    "score": 85,
    "facteurs": [
      { "label": "HRV dans la norme", "impact": "+4.9% vs baseline", "status": "ok" },
      { "label": "Charge semaine", "impact": "420 TSS (normale)", "status": "ok" }
    ],
    "estimation_corrigee": null
  },
  "evolution": {
    "disponible": true,
    "tests": [ { "date": "2025-01-10", "valeur": 264, "delta_pct": null }, { "date": "2025-03-15", "valeur": 278, "delta_pct": 5.3 } ],
    "tendance": "Progression régulière de +5.3% en 2 mois",
    "projection_3mois": "Si la tendance se maintient : ~292W estimés d'ici juin 2025"
  },
  "impact_zones": {
    "mise_a_jour_necessaire": true,
    "ecart_pct": 11.2,
    "zones_estimees": [
      { "zone": "Z1", "label": "Récupération", "watts_min": 0, "watts_max": 153 },
      { "zone": "Z2", "label": "Endurance", "watts_min": 153, "watts_max": 209 },
      { "zone": "Z3", "label": "Tempo", "watts_min": 209, "watts_max": 250 },
      { "zone": "Z4", "label": "Seuil", "watts_min": 250, "watts_max": 278 },
      { "zone": "Z5", "label": "VO2max", "watts_min": 278, "watts_max": 350 }
    ],
    "detail": "Tes zones actuelles sont basées sur FTP 250W. Le test donne 278W → écart de 11.2%."
  },
  "recommandations": [
    { "label": "Mettre à jour tes zones vélo", "detail": "FTP réel 278W vs 250W configuré" },
    { "label": "Refaire le test dans 8 semaines", "detail": "Pour confirmer la tendance" }
  ],
  "sources_used": ["test CP20 du 15/03", "2 tests historiques", "zones vélo actuelles", "HRV baseline 28j"],
  "confiance": "élevée"
}`

    const response = await client.messages.create({
      model: MODELS.powerful,
      max_tokens: 4000,
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
    console.error('[analyze-test]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
