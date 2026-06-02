// ══════════════════════════════════════════════════════════════
// Multiplicateurs de consommation de tokens par modèle.
// La clé THWModel prime (Zeus et Athéna partagent l'ID API Sonnet).
// ══════════════════════════════════════════════════════════════

export const MODEL_MULTIPLIERS = {
  hermes: 1, // Haiku — tâches simples
  athena: 3, // Sonnet — usage standard
  zeus:   8, // analyse maximale — tâches complexes
} as const

export type ModelKey = keyof typeof MODEL_MULTIPLIERS

export function getModelMultiplier(model: string): number {
  const n = model.toLowerCase()
  if (n.includes('hermes') || n.includes('haiku')) return 1
  if (n.includes('zeus') || n.includes('opus')) return 8
  if (n.includes('athena') || n.includes('sonnet')) return 3
  return 3 // fallback sécurité : Athéna
}

export function getModelDisplayName(model: string): string {
  const n = model.toLowerCase()
  if (n.includes('hermes') || n.includes('haiku')) return 'Hermès'
  if (n.includes('zeus') || n.includes('opus')) return 'Zeus'
  if (n.includes('athena') || n.includes('sonnet')) return 'Athéna'
  return model
}
