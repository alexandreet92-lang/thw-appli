// ══════════════════════════════════════════════════════════════════
// Moteur de PÉRIODISATION déterministe — calcule la structure d'une saison
// (phases, longueur d'affûtage, semaines de décharge, polarisation) à partir
// du nombre de semaines jusqu'à la course. But : donner à l'IA un SQUELETTE
// méthodologiquement correct qu'elle remplit ensuite avec les vraies zones
// de l'athlète (au lieu d'improviser la structure).
// ══════════════════════════════════════════════════════════════════

export type Phase = 'base' | 'build' | 'specific' | 'taper'

export interface PhaseBlock {
  phase: Phase
  label: string
  week_start: number   // 1-indexé
  week_end: number
  weeks: number
  focus: string
  volume: string
}

export interface Blueprint {
  total_weeks: number
  taper_weeks: number
  blocks: PhaseBlock[]
  deload_weeks: number[]
  polarization: string
  notes: string[]
}

const LONG_RE = /marathon|ironman|70\.?3|half.?iron|ultra|trail(\s|-)?(long|ultra)|100\s?k|100\s?miles?/i

/** Structure de périodisation à partir du nombre de semaines de prépa. */
export function periodizationBlueprint(opts: { weeks: number; level?: string; race_type?: string }): Blueprint {
  const W = Math.max(4, Math.min(52, Math.round(opts.weeks || 12)))
  const level = (opts.level || 'intermediaire').toLowerCase()
  const long = LONG_RE.test(opts.race_type || '')

  // Affûtage : plus long pour les longues distances / niveau avancé.
  const taper = W >= 16 ? (long ? 3 : 2) : W >= 10 ? 2 : 1
  const prep = W - taper

  // Répartition base / build / spécifique de la phase de prépa.
  let baseW = Math.round(prep * 0.45)
  let buildW = Math.round(prep * 0.33)
  let specW = prep - baseW - buildW
  if (specW < 1 && prep >= 3) { specW = 1; if (baseW >= buildW) baseW--; else buildW-- }
  if (baseW < 0) baseW = 0
  if (buildW < 0) buildW = 0

  const blocks: PhaseBlock[] = []
  let cur = 1
  const push = (phase: Phase, label: string, weeks: number, focus: string, volume: string) => {
    if (weeks > 0) { blocks.push({ phase, label, week_start: cur, week_end: cur + weeks - 1, weeks, focus, volume }); cur += weeks }
  }
  push('base', 'Base', baseW, 'Aérobie, volume, technique — poser le socle (grande majorité en Z1–Z2).', 'progressif ↑')
  push('build', 'Développement', buildW, 'Seuil puis VO2max, montée d\'intensité en gardant du volume.', 'élevé')
  push('specific', 'Spécifique', specW, 'Allure de course, simulations, on affine la forme.', 'volume ↓ · intensité ciblée')
  push('taper', 'Affûtage', taper, 'Réduction du volume de 40–60 %, on garde 1–2 rappels d\'intensité — fraîcheur maximale pour le jour J.', 'volume −40→60 %')

  // Décharge toutes les ~4 semaines pendant la prépa (pas en affûtage).
  const deload: number[] = []
  for (let w = 4; w <= prep; w += 4) deload.push(w)

  const polarization = level === 'avance' || long ? '≈ 80 % facile / 20 % dur (polarisé)' : '≈ 75–80 % facile / 20–25 % dur'
  const notes = [
    'Alterne jours durs et jours faciles ; jamais deux séances dures d\'affilée sans raison.',
    'Semaines de décharge : −30 à −40 % de volume pour absorber la charge et progresser.',
    'La forme de fond (CTL) doit monter progressivement (rampe régulière), pas par à-coups.',
    'Remplis chaque phase avec les VRAIES zones de l\'athlète (allures/watts) — pas des intensités génériques.',
  ]
  return { total_weeks: W, taper_weeks: taper, blocks, deload_weeks: deload, polarization, notes }
}
