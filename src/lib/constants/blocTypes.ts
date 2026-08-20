// Types de bloc par sport (maquettes validées). Extensible par l'utilisateur (types custom
// persistés à part). Clés = velo/running/hyrox/natation/muscu.
export const BLOC_TYPES: Record<string, string[]> = {
  velo:     ['PMA', 'Threshold SL1', 'Threshold SL2', 'Threshold mixe', 'EF', 'Durability', 'Sprints', 'Anaérobie', 'High z2'],
  running:  ['VMA longue', 'VMA courte', 'VMA mixe', 'Threshold SL1', 'Threshold SL2', 'Threshold mixe', 'EF', 'Strides / Sprints', 'Hills'],
  trail:    ['VMA côte', 'Seuil côte', 'EF vallonné', 'Descente technique', 'Rando-course D+', 'Sortie longue', 'Renfo spécifique'],
  hyrox:    ['Strength', 'Strength endurance', 'Simulation', 'Ergo', 'Compromised run', 'Sled', 'Explosivity'],
  natation: ['Technique', 'Threshold', 'Hypoxie', 'EF'],
  muscu:    ['Push', 'Pull', 'Leg', 'Strength', 'Explosivity'],
  boxe:     ['Technique', 'Sparring', 'Sac / Frappe', 'Cardio-boxe', 'Renfo spécifique', 'Explosivité'],
  aviron:   ['Technique', 'Threshold', 'Sprints', 'EF', 'Force-endurance', 'Simulation'],
  hybrid:   ['Endurance', 'Force', 'Métabolique', 'Compromised', 'Puissance-endurance', 'Récup active'],
}

export const SPORT_LABELS: Record<string, string> = {
  velo: 'Vélo', running: 'Running', trail: 'Trail', hyrox: 'Hyrox', natation: 'Natation', muscu: 'Muscu', boxe: 'Boxe', aviron: 'Aviron', hybrid: 'Hybrid',
}

// Teintes sport (immuables, sanctionnées) — utilisées via cette constante, jamais en dur.
export const SPORT_COLORS: Record<string, string> = {
  velo: '#3b82f6', running: '#22c55e', trail: '#84cc16', hyrox: '#ec4899', natation: '#0ea5b7', muscu: '#f97316', boxe: '#e11d48', aviron: '#14b8a6', hybrid: '#f59e0b',
}

export const BLOC_SPORT_KEYS = ['velo', 'running', 'trail', 'hyrox', 'natation', 'muscu', 'boxe', 'aviron', 'hybrid'] as const
