import { callAgent, SYSTEM_BASE } from './base'
import type { NutritionInput, NutritionOutput } from '@/lib/coach-engine/schemas'

export async function runNutritionAgent(input: NutritionInput): Promise<NutritionOutput> {
  const { athleteProfile, goal, activityToday, currentIntake, question } = input

  // Calcul BMR Mifflin-St Jeor (si données disponibles)
  let bmrNote = ''
  if (athleteProfile.weight && athleteProfile.height && athleteProfile.age) {
    const bmr = athleteProfile.gender === 'female'
      ? 10 * athleteProfile.weight + 6.25 * athleteProfile.height - 5 * athleteProfile.age - 161
      : 10 * athleteProfile.weight + 6.25 * athleteProfile.height - 5 * athleteProfile.age + 5
    bmrNote = `- BMR estimé (Mifflin-St Jeor) : ${Math.round(bmr)} kcal`
  }

  const userPrompt = `
Calcule les besoins nutritionnels et donne des conseils personnalisés.

### Profil athlète
- Sport : ${athleteProfile.sport}
- Poids : ${athleteProfile.weight ? athleteProfile.weight + ' kg' : 'non renseigné'}
- Taille : ${athleteProfile.height ? athleteProfile.height + ' cm' : 'non renseigné'}
- Âge : ${athleteProfile.age ?? 'non renseigné'}
- Genre : ${athleteProfile.gender ?? 'non renseigné'}
${bmrNote}

### Objectif
${goal === 'performance' ? 'Performance sportive maximale' : goal === 'weight_loss' ? 'Perte de poids' : goal === 'weight_gain' ? 'Prise de masse' : 'Maintien du poids'}

${activityToday ? `### Activité du jour
- Sport : ${activityToday.sport}
- Durée : ${activityToday.durationMin} min
- Intensité : ${activityToday.intensity}` : ''}

${currentIntake ? `### Apports actuels
- Calories : ${currentIntake.kcal} kcal
- Protéines : ${currentIntake.proteinG}g
- Glucides : ${currentIntake.carbsG}g
- Lipides : ${currentIntake.fatG}g` : ''}

${question ? `### Question de l'athlète\n${question}` : ''}

### Format JSON attendu
{
  "dailyTargets": {
    "kcal": number,
    "proteinG": number,
    "carbsG": number,
    "fatG": number
  },
  "timing": [
    { "meal": "string", "description": "string" }
  ],
  "recommendations": ["string"],
  "answer": "string ou null (réponse à la question si posée)"
}`.trim()

  return callAgent<NutritionOutput>({
    agentName: 'nutritionAgent',
    model: 'fast',
    maxTokens: 1024,
    systemPrompt: SYSTEM_BASE,
    userPrompt,
  })
}
