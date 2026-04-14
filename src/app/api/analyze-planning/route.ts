import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { weekStart, sessions, activities, intensities, kpis } = body

    const prompt = `Tu es un coach sportif expert en planification d'entraînement.
Analyse la semaine d'entraînement suivante et retourne UNIQUEMENT un objet JSON valide, sans texte avant ni après.

## Données de la semaine (${weekStart})

### KPIs
- Volume prévu : ${kpis.plannedMin} min | Réalisé : ${kpis.doneMin} min (${kpis.plannedMin ? Math.round(kpis.doneMin / kpis.plannedMin * 100) : 0}%)
- Séances prévues : ${kpis.plannedN} | Réalisées : ${kpis.doneN}
- TSS prévu : ${kpis.plannedTSS} pts | Réalisé : ${kpis.doneTSS} pts

### Séances planifiées
${sessions.length === 0 ? '(aucune)' : sessions.map((s: any) => `- Jour ${s.dayIndex} (${['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'][s.dayIndex]}): ${s.sport.toUpperCase()} "${s.title}" — ${s.durationMin}min, TSS:${s.tss || 0}, statut:${s.status}${s.blocks.length > 0 ? `, blocs:[${s.blocks.map((b: any) => `${b.type}Z${b.zone}/${b.durationMin}min`).join(',')}]` : ''}`).join('\n')}

### Activités réalisées
${activities.length === 0 ? '(aucune)' : activities.map((a: any) => `- Jour ${a.dayIndex} (${['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'][a.dayIndex]}): ${a.sport.toUpperCase()} "${a.name}" — ${a.durationMin}min, TSS:${a.tss || 0}`).join('\n')}

### Intensités des jours
${Object.entries(intensities).map(([d, v]) => `- Jour ${d} (${['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'][parseInt(d)]}): ${v}`).join('\n') || '(non renseigné)'}

## Format de réponse attendu (JSON strict)
{
  "score": <entier 0-100 représentant la qualité globale de la semaine>,
  "summary": "<résumé 2-3 phrases de la semaine : volume, équilibre, récupération>",
  "issues": [
    { "title": "<problème court>", "severity": "low"|"medium"|"high", "description": "<explication 1 phrase>" }
  ],
  "suggestions": [
    "<suggestion actionnable 1 phrase>"
  ],
  "optimized_plan": [
    { "day": "Lun"|"Mar"|"Mer"|"Jeu"|"Ven"|"Sam"|"Dim", "title": "<séance recommandée>", "durationMin": <minutes> }
  ]
}

Retourne UNIQUEMENT le JSON, rien d'autre.`

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = message.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from model')
    }

    // Extract JSON from the response (handle potential markdown code blocks)
    let rawText = textBlock.text.trim()
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) rawText = jsonMatch[1].trim()

    const result = JSON.parse(rawText)

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[analyze-planning]', err)
    return NextResponse.json(
      { error: err.message ?? 'Erreur interne' },
      { status: 500 }
    )
  }
}
