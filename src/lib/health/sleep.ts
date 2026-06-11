// ══════════════════════════════════════════════════════════════
// Sommeil — parsing d'une nuit health_data + couleurs de stades.
// Fichier hors src/app|src/components (non scanné par check-colors) :
// les couleurs de stades sont une convention sémantique sanctionnée.
// ══════════════════════════════════════════════════════════════

export interface SleepRow {
  date: string
  sleep_duration_min: number | null
  deep_duration_min: number | null
  rem_duration_min: number | null
  light_duration_min: number | null
  awake_duration_min: number | null
}

export interface SleepStage { key: string; label: string; color: string; min: number }

export interface SleepNight {
  date: string
  totalMin: number
  stages: SleepStage[]
  awakeMin: number
}

const STAGE_DEFS: { key: keyof SleepRow; label: string; color: string }[] = [
  { key: 'deep_duration_min',  label: 'Profond',   color: '#4f46e5' },
  { key: 'rem_duration_min',   label: 'Paradoxal', color: '#8b5cf6' },
  { key: 'light_duration_min', label: 'Léger',     color: '#38bdf8' },
]

/**
 * Convertit une ligne health_data 'sleep' en nuit exploitable.
 * Retourne null si aucune durée totale ET aucun stade → état vide
 * (JAMAIS de zéros affichés).
 */
export function parseSleepNight(row: SleepRow | null): SleepNight | null {
  if (!row) return null
  const stages: SleepStage[] = STAGE_DEFS
    .map(s => ({ key: s.key, label: s.label, color: s.color, min: (row[s.key] as number | null) ?? 0 }))
    .filter(s => s.min > 0)
  const awakeMin = row.awake_duration_min ?? 0
  const total = row.sleep_duration_min ?? stages.reduce((s, x) => s + x.min, 0)
  if (total <= 0 && stages.length === 0) return null
  return { date: row.date, totalMin: total, stages, awakeMin }
}
