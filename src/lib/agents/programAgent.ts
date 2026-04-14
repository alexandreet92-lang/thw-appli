import { callAgent, SYSTEM_BASE } from './base'
import type { ProgramInput, ProgramOutput } from '@/lib/coach-engine/schemas'

export async function runProgramAgent(input: ProgramInput): Promise<ProgramOutput> {
  const { strategy, athleteProfile, startDate, weekCount } = input

  const userPrompt = `
Génère un programme d'entraînement détaillé semaine par semaine.

### Stratégie validée
- Objectif : ${strategy.mainObjective}
- Focus : ${strategy.keyFocusAreas.join(', ')}
- Charge hebdo : ${strategy.weeklyHours.min}–${strategy.weeklyHours.max}h
- Phases : ${strategy.trainingPhases.map(p => `${p.name} (${p.durationWeeks}sem, ${p.weeklyHoursTarget}h/sem)`).join(' → ')}
- Principes : ${strategy.keyPrinciples.join('; ')}

### Athlète
- Sport : ${athleteProfile.sport}
${athleteProfile.ftp ? `- FTP : ${athleteProfile.ftp}W` : ''}
${athleteProfile.thresholdPace ? `- Allure seuil : ${athleteProfile.thresholdPace}s/km` : ''}

### Paramètres
- Début : ${startDate}
- Nombre de semaines : ${weekCount}

### Format JSON attendu
{
  "programName": "string",
  "weeks": [
    {
      "weekNumber": number,
      "label": "string",
      "focus": "string",
      "sessions": [
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
      "totalTSS": number,
      "totalHours": number
    }
  ],
  "notes": "string"
}`.trim()

  return callAgent<ProgramOutput>({
    agentName: 'programAgent',
    model: 'powerful',
    maxTokens: 4096,
    systemPrompt: SYSTEM_BASE,
    userPrompt,
  })
}
