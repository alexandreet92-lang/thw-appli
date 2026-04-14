import { callAgent, SYSTEM_BASE } from './base'
import type { StrategyInput, StrategyOutput } from '@/lib/coach-engine/schemas'

export async function runStrategyAgent(input: StrategyInput): Promise<StrategyOutput> {
  const { athleteProfile, goal, currentLevel, availableHoursPerWeek, targetDate, constraints } = input

  const userPrompt = `
Crée une stratégie d'entraînement pour cet athlète.

### Profil athlète
- Sport : ${athleteProfile.sport}
- Niveau : ${athleteProfile.level ?? currentLevel}
- Âge : ${athleteProfile.age ?? 'non renseigné'}
- Poids : ${athleteProfile.weight ? athleteProfile.weight + ' kg' : 'non renseigné'}
${athleteProfile.ftp ? `- FTP : ${athleteProfile.ftp}W` : ''}
${athleteProfile.thresholdPace ? `- Allure seuil : ${athleteProfile.thresholdPace}s/km` : ''}

### Objectif
${goal}

### Niveau actuel
${currentLevel}

### Disponibilités
${availableHoursPerWeek}h/semaine
${targetDate ? `Date cible : ${targetDate}` : ''}
${constraints?.length ? `Contraintes : ${constraints.join(', ')}` : ''}

### Format JSON attendu
{
  "mainObjective": "string",
  "keyFocusAreas": ["string"],
  "trainingPhases": [
    { "name": "string", "durationWeeks": number, "focus": "string", "weeklyHoursTarget": number }
  ],
  "weeklyHours": { "min": number, "max": number },
  "keyPrinciples": ["string"],
  "notes": "string"
}`.trim()

  return callAgent<StrategyOutput>({
    agentName: 'strategyAgent',
    model: 'balanced',
    maxTokens: 1024,
    systemPrompt: SYSTEM_BASE,
    userPrompt,
  })
}
