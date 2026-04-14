import { callAgent, SYSTEM_BASE } from './base'
import type { PlanningAnalysisInput, PlanningAnalysisOutput } from '@/lib/coach-engine/schemas'

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export async function runPlanningAnalysisAgent(input: PlanningAnalysisInput): Promise<PlanningAnalysisOutput> {
  const { weekStart, sessions, activities, intensities, kpis } = input

  const sessionLines = sessions.length === 0
    ? '(aucune séance planifiée)'
    : sessions.map(s => {
        const day = DAY_NAMES[s.dayIndex] ?? `Jour ${s.dayIndex}`
        const blocks = s.blocks?.length
          ? ` | blocs: [${s.blocks.map(b => `${b.type}Z${b.zone}/${b.durationMin}min`).join(',')}]`
          : ''
        return `- ${day}: ${s.sport.toUpperCase()} "${s.title}" — ${s.durationMin}min, TSS:${s.tss}, statut:${s.status}${blocks}`
      }).join('\n')

  const activityLines = activities.length === 0
    ? '(aucune activité réalisée)'
    : activities.map(a => {
        const day = DAY_NAMES[a.dayIndex] ?? `Jour ${a.dayIndex}`
        return `- ${day}: ${a.sport.toUpperCase()} "${a.name}" — ${a.durationMin}min, TSS:${a.tss ?? 0}`
      }).join('\n')

  const intensityLines = Object.entries(intensities)
    .map(([d, v]) => `- ${DAY_NAMES[parseInt(d)] ?? `Jour ${d}`}: ${v}`)
    .join('\n') || '(non renseigné)'

  const completion = kpis.plannedMin
    ? Math.round(kpis.doneMin / kpis.plannedMin * 100)
    : 0

  const userPrompt = `
Analyse la semaine d'entraînement suivante.

### Semaine du ${weekStart}

#### KPIs
- Volume : ${kpis.doneMin}min réalisés / ${kpis.plannedMin}min prévus (${completion}%)
- Séances : ${kpis.doneN} réalisées / ${kpis.plannedN} prévues
- TSS : ${kpis.doneTSS} réalisés / ${kpis.plannedTSS} prévus

#### Séances planifiées
${sessionLines}

#### Activités réalisées
${activityLines}

#### Intensités
${intensityLines}

### Format JSON attendu
{
  "score": number (0–100),
  "summary": "string (2–3 phrases)",
  "issues": [
    { "title": "string", "severity": "low"|"medium"|"high", "description": "string" }
  ],
  "suggestions": ["string"],
  "optimized_plan": [
    { "day": "Lun"|"Mar"|"Mer"|"Jeu"|"Ven"|"Sam"|"Dim", "sport": "string", "title": "string", "durationMin": number, "tss": number, "type": "endurance"|"intervals"|"strength"|"recovery"|"race" }
  ]
}`.trim()

  return callAgent<PlanningAnalysisOutput>({
    agentName: 'planningAnalysisAgent',
    model: 'balanced',
    maxTokens: 1024,
    systemPrompt: SYSTEM_BASE,
    userPrompt,
  })
}
