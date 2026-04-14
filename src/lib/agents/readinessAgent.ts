import { callAgent, SYSTEM_BASE } from './base'
import type { ReadinessInput, ReadinessOutput } from '@/lib/coach-engine/schemas'

export async function runReadinessAgent(input: ReadinessInput): Promise<ReadinessOutput> {
  const { recentActivities, sleepQuality, subjectiveFeeling, hrv, restingHR, notes } = input

  const recentLines = recentActivities.length === 0
    ? '(aucune activité récente)'
    : recentActivities.map(a =>
        `- ${a.date}: ${a.sport} — ${a.durationMin}min, TSS:${a.tss}${a.rpe ? `, RPE:${a.rpe}/10` : ''}`
      ).join('\n')

  const userPrompt = `
Évalue la forme et la disponibilité à l'entraînement de cet athlète.

### Activités récentes (7 derniers jours)
${recentLines}

### Métriques subjectives / biologiques
${sleepQuality !== undefined ? `- Qualité du sommeil : ${sleepQuality}/10` : ''}
${subjectiveFeeling !== undefined ? `- Ressenti subjectif : ${subjectiveFeeling}/10` : ''}
${hrv !== undefined ? `- HRV : ${hrv}ms` : ''}
${restingHR !== undefined ? `- FC repos : ${restingHR} bpm` : ''}
${notes ? `- Notes : ${notes}` : ''}

### Format JSON attendu
{
  "score": number (0–100, forme du jour),
  "readinessLevel": "low"|"moderate"|"good"|"excellent",
  "fatigue": number (0–100),
  "recommendation": "string (conseil principal)",
  "trainingLoad": "reduce"|"maintain"|"increase",
  "todayAdvice": "string (conseil pour la séance du jour)"
}`.trim()

  return callAgent<ReadinessOutput>({
    agentName: 'readinessAgent',
    model: 'fast',
    maxTokens: 512,
    systemPrompt: SYSTEM_BASE,
    userPrompt,
  })
}
