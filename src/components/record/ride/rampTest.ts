// ══════════════════════════════════════════════════════════════════
// Calcul PMA / FTP / zones à partir d'un test vélo (rampe ou CP20).
// Pur & testable — aucune dépendance réseau.
//
// RAMPE (paliers) : l'athlète part à `startW`, +`stepW` toutes les `stepMin`.
// Il valide `validatedPaliers` paliers pleins puis tient `heldSecOnFailed`
// secondes sur le palier suivant (échoué).
//   PMA = dernier palier validé + (temps tenu / durée du palier) × incrément
//   FTP = 0,76 × PMA
// Arrondi à l'entier le plus proche (166,2 → 166 ; 166,6 → 167).
//
// SL1 / SL2 = watts aux frontières de zone (modèle Coggan de la page Performance) :
//   SL1 ≈ frontière Z2/Z3 = 0,755 × FTP  ·  SL2 ≈ frontière Z3/Z4 = 0,905 × FTP
// (powerZones : Z2 0,56–0,75 · Z3 0,76–0,90 · Z4 0,91–1,05 × FTP.)
//
// CP20 : 20 min à fond, moyenne de puissance mesurée → FTP = 0,95 × moyenne.
// ══════════════════════════════════════════════════════════════════
import { powerZones, type Zone } from '@/app/performance/components/profil/zones'

export interface RampInput {
  startW: number
  stepW: number
  stepMin: number
  validatedPaliers: number   // paliers entièrement tenus
  heldSecOnFailed: number    // secondes tenues sur le palier échoué (0 si aucun)
}

export interface TestResult {
  pma: number | null   // null pour un CP20 (pas de PMA directe)
  ftp: number
  sl1: number
  sl2: number
  zones: Zone[]
}

/** SL1 (frontière Z2/Z3) et SL2 (frontière Z3/Z4) en watts. */
export function seuilsFromFtp(ftp: number): { sl1: number; sl2: number } {
  return { sl1: Math.round(0.755 * ftp), sl2: Math.round(0.905 * ftp) }
}

/** Résultat d'un ramp test → PMA, FTP, seuils, zones. */
export function computeRamp(inp: RampInput): TestResult & { lastValidatedW: number; failedW: number } {
  const startW = Math.max(0, Math.round(inp.startW))
  const stepW = Math.max(1, Math.round(inp.stepW))
  const stepSec = Math.max(1, Math.round(inp.stepMin * 60))
  const validated = Math.max(1, Math.round(inp.validatedPaliers))
  const held = Math.max(0, Math.min(stepSec, Math.round(inp.heldSecOnFailed)))
  const lastValidatedW = startW + (validated - 1) * stepW
  const failedW = lastValidatedW + stepW
  const pma = Math.round(lastValidatedW + (held / stepSec) * stepW)
  const ftp = Math.round(0.76 * pma)
  const { sl1, sl2 } = seuilsFromFtp(ftp)
  return { pma, ftp, sl1, sl2, zones: powerZones(ftp), lastValidatedW, failedW }
}

/** Résultat d'un CP20 → FTP = 0,95 × moyenne 20 min. */
export function computeCp20(avgWatts: number): TestResult {
  const ftp = Math.round(0.95 * Math.max(0, avgWatts))
  const { sl1, sl2 } = seuilsFromFtp(ftp)
  return { pma: null, ftp, sl1, sl2, zones: powerZones(ftp) }
}
