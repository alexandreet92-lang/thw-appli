// Types de bloc par sport (maquettes validées). Extensible par l'utilisateur (types custom
// persistés à part). Clés = velo/running/hyrox/natation/muscu.
export const BLOC_TYPES: Record<string, string[]> = {
  velo:     ['PMA', 'Threshold SL1', 'Threshold SL2', 'Threshold mixe', 'EF', 'Durability', 'Sprints', 'Anaérobie', 'High z2'],
  running:  ['VMA longue', 'VMA courte', 'VMA mixe', 'Threshold SL1', 'Threshold SL2', 'Threshold mixe', 'EF', 'Strides / Sprints', 'Hills'],
  hyrox:    ['Strength', 'Strength endurance', 'Simulation', 'Ergo', 'Compromised run', 'Sled', 'Explosivity'],
  natation: ['Technique', 'Threshold', 'Hypoxie', 'EF'],
  muscu:    ['Push', 'Pull', 'Leg', 'Strength', 'Explosivity'],
}

export const SPORT_LABELS: Record<string, string> = {
  velo: 'Vélo', running: 'Running', hyrox: 'Hyrox', natation: 'Natation', muscu: 'Muscu',
}

// Teintes sport (immuables, sanctionnées) — utilisées via cette constante, jamais en dur.
export const SPORT_COLORS: Record<string, string> = {
  velo: '#3b82f6', running: '#f97316', hyrox: '#ec4899', natation: '#0ea5b7', muscu: '#8b5cf6',
}

export const BLOC_SPORT_KEYS = ['velo', 'running', 'hyrox', 'natation', 'muscu'] as const
