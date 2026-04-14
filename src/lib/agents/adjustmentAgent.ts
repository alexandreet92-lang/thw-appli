import { callAgent, SYSTEM_BASE } from './base'
import type { AdjustmentInput, AdjustmentOutput } from '@/lib/coach-engine/schemas'

export async function runAdjustmentAgent(input: AdjustmentInput): Promise<AdjustmentOutput> {
  const { readiness, performance, plannedSessions, currentWeek, constraints } = input

  const sessionLines = plannedSessions.length === 0
    ? '(aucune séance planifiée)'
    : plannedSessions.map(s =>
        `- ${s.day}: ${s.sport} "${s.title}" — ${s.durationMin}min, TSS:${s.tss}`
      ).join('\n')

  const userPrompt = `
Ajuste le plan de semaine de cet athlète selon sa forme et ses performances.

### Forme du jour (Readiness)
- Score : ${readiness.score}/100 — ${readiness.readinessLevel}
- Fatigue : ${readiness.fatigue}/100
- Charge recommandée : ${readiness.trainingLoad}
- Conseil : ${readiness.recommendation}

### Analyse performance
- Score fitness : ${performance.fitnessScore}/100
- Bilan : ${performance.summary}
- Forces : ${performance.strengths.join(', ')}
- Faiblesses : ${performance.weaknesses.join(', ')}

### Plan prévu (semaine du ${currentWeek})
${sessionLines}

${constraints?.length ? `### Contraintes\n${constraints.join('\n')}` : ''}

### Instructions
- Si readiness < 50 : réduire volume et intensité de 20–30%
- Si readiness 50–70 : maintenir mais adapter les séances intenses
- Si readiness > 70 : maintenir ou légèrement augmenter
- Toujours garder au moins 1 jour de récupération

### Format JSON attendu
{
  "adjustedSessions": [
    {
      "day": "Lun"|"Mar"|"Mer"|"Jeu"|"Ven"|"Sam"|"Dim",
      "sport": "string",
      "title": "string",
      "durationMin": number,
      "tss": number,
      "type": "endurance"|"intervals"|"strength"|"recovery"|"race",
      "notes": "string"
    }
  ],
  "changes": [
    { "day": "string", "original": "string", "adjusted": "string", "durationMin": number, "tss": number, "reason": "string" }
  ],
  "summary": "string",
  "urgency": "none"|"minor"|"significant"
}`.trim()

  return callAgent<AdjustmentOutput>({
    agentName: 'adjustmentAgent',
    model: 'balanced',
    maxTokens: 1536,
    systemPrompt: SYSTEM_BASE,
    userPrompt,
  })
}
