import { callAgent, SYSTEM_BASE } from './base'
import type { PerformanceInput, PerformanceOutput } from '@/lib/coach-engine/schemas'

export async function runPerformanceAgent(input: PerformanceInput): Promise<PerformanceOutput> {
  const { activities, metrics, period } = input

  const actLines = activities.length === 0
    ? '(aucune activité sur la période)'
    : activities.map(a => {
        const parts = [
          `- ${a.date}: ${a.sport} — ${a.durationMin}min, TSS:${a.tss}`,
          a.distance ? `${(a.distance / 1000).toFixed(1)}km` : null,
          a.avgPace ? `allure:${a.avgPace}` : null,
          a.avgWatts ? `${a.avgWatts}W` : null,
          a.hrAvg ? `FC:${a.hrAvg}bpm` : null,
        ].filter(Boolean)
        return parts.join(', ')
      }).join('\n')

  const periodLabel = { '7d': '7 jours', '30d': '30 jours', '90d': '90 jours' }[period]

  const userPrompt = `
Analyse les performances de cet athlète sur les ${periodLabel} écoulés.

### Activités (${periodLabel})
${actLines}

### Métriques de référence
${metrics?.ftp ? `- FTP : ${metrics.ftp}W` : ''}
${metrics?.thresholdPace ? `- Allure seuil : ${metrics.thresholdPace}s/km` : ''}
${metrics?.css ? `- CSS natation : ${metrics.css}s/100m` : ''}

### Format JSON attendu
{
  "summary": "string (2–3 phrases bilan)",
  "trends": [
    { "metric": "string", "direction": "improving"|"stable"|"declining", "change": "string" }
  ],
  "strengths": ["string"],
  "weaknesses": ["string"],
  "recommendations": ["string"],
  "fitnessScore": number (0–100)
}`.trim()

  return callAgent<PerformanceOutput>({
    agentName: 'performanceAgent',
    model: 'balanced',
    maxTokens: 1024,
    systemPrompt: SYSTEM_BASE,
    userPrompt,
  })
}
