// Types de bloc par sport (maquettes validées). Extensible par l'utilisateur (types custom
// persistés à part). Clés = velo/running/hyrox/natation/muscu.
export const BLOC_TYPES: Record<string, string[]> = {
  velo:     ['PMA', 'Threshold SL1', 'Threshold SL2', 'Threshold mixe', 'EF', 'Durability', 'Sprints', 'Anaérobie', 'High z2'],
  running:  ['VMA longue', 'VMA courte', 'VMA mixe', 'Threshold SL1', 'Threshold SL2', 'Threshold mixe', 'EF', 'Strides / Sprints', 'Hills'],
  hyrox:    ['Strength', 'Strength endurance', 'Simulation', 'Ergo', 'Compromised run', 'Sled', 'Explosivity'],
  natation: ['Technique', 'Threshold', 'Hypoxie', 'EF'],
  muscu:    ['Push', 'Pull', 'Leg', 'Strength', 'Explosivity'],
}
