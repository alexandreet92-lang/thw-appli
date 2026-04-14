import { callAgent, SYSTEM_BASE } from './base'
import type { SessionBuilderInput, SessionBuilderOutput } from '@/lib/coach-engine/schemas'

export async function runSessionBuilderAgent(input: SessionBuilderInput): Promise<SessionBuilderOutput> {
  const { sport, type, targetDurationMin, targetTSS, athleteProfile, context } = input

  const userPrompt = `
Construis une séance d'entraînement détaillée avec des blocs.

### Paramètres
- Sport : ${sport}
- Type : ${type}
- Durée cible : ${targetDurationMin} min
${targetTSS ? `- TSS cible : ${targetTSS}` : ''}
${context ? `- Contexte : ${context}` : ''}
${athleteProfile?.ftp ? `- FTP athlète : ${athleteProfile.ftp}W` : ''}
${athleteProfile?.thresholdPace ? `- Allure seuil : ${athleteProfile.thresholdPace}s/km` : ''}
${athleteProfile?.level ? `- Niveau : ${athleteProfile.level}` : ''}

### Zones (Z1=facile → Z5=max)
Z1: récupération active, Z2: endurance fondamentale, Z3: tempo, Z4: seuil, Z5: VO2max+

### Format JSON attendu
{
  "title": "string",
  "blocks": [
    {
      "type": "warmup"|"effort"|"recovery"|"cooldown",
      "zone": 1|2|3|4|5,
      "durationMin": number,
      "label": "string",
      "description": "string"
    }
  ],
  "totalDurationMin": number,
  "estimatedTSS": number,
  "coachNotes": "string"
}`.trim()

  return callAgent<SessionBuilderOutput>({
    agentName: 'sessionBuilderAgent',
    model: 'balanced',
    maxTokens: 1024,
    systemPrompt: SYSTEM_BASE,
    userPrompt,
  })
}
