// Zones de puissance — bornes définies EN % DU FTP (PROMPT_HOME_TRAINER.md).
// Les watts de zone sont donc recalculés par athlète. Les couleurs réutilisent
// les tokens immuables --zone-1..7 du design system.

export interface Zone { key: string; name: string; upper: number; token: string }

// upper = borne haute en fraction de FTP. Z7 non borné.
export const ZONES: Zone[] = [
  { key: 'Z1', name: 'Récup',     upper: 0.55, token: 'var(--zone-1)' },
  { key: 'Z2', name: 'Endurance', upper: 0.75, token: 'var(--zone-2)' },
  { key: 'Z3', name: 'Tempo',     upper: 0.90, token: 'var(--zone-3)' },
  { key: 'Z4', name: 'Seuil',     upper: 1.05, token: 'var(--zone-4)' },
  { key: 'Z5', name: 'VO2max',    upper: 1.20, token: 'var(--zone-5)' },
  { key: 'Z6', name: 'Anaéro',    upper: 1.50, token: 'var(--zone-6)' },
  { key: 'Z7', name: 'Neuro',     upper: Infinity, token: 'var(--zone-7)' },
]

/** Index de zone (0-based) pour une puissance donnée et un FTP. */
export function zoneIndex(watts: number, ftp: number): number {
  if (ftp <= 0) return 0
  const r = watts / ftp
  for (let i = 0; i < ZONES.length; i++) if (r <= ZONES[i].upper) return i
  return ZONES.length - 1
}

/** Token de couleur d'état pour la jauge d'écart à la cible (±12 / ±25 W). */
export function deviationToken(deltaW: number): string {
  const a = Math.abs(deltaW)
  if (a <= 12) return 'var(--charge-low)'   // vert
  if (a <= 25) return 'var(--charge-mid)'   // ambre
  return 'var(--charge-hard)'               // rouge
}
