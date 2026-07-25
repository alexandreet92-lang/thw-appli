// ──────────────────────────────────────────────────────────────────────────
// units — conversions d'unités partagées par les écrans live (réglages
// units.distance km↔mi, units.altitude m↔ft, display.paceUnit min/km↔min/mi)
// + échelle « Taille des données » (display.dataSize) appliquée aux tuiles.
// Même mécanique que CyclingPageData, mutualisée pour les autres sports.
// ──────────────────────────────────────────────────────────────────────────

export interface LiveUnits {
  distance: 'metric' | 'imperial'
  altitude: 'm' | 'ft'
}

export type PaceUnit = 'min/km' | 'min/mile'
export type DataSize = 'small' | 'normal' | 'large'

export const KM_TO_MI = 0.621371
export const M_TO_FT = 3.28084

/** Facteur multiplicatif à appliquer aux km / km/h. */
export function distFactor(units?: LiveUnits): number {
  return units?.distance === 'imperial' ? KM_TO_MI : 1
}

/** Facteur multiplicatif à appliquer aux mètres (D+, altitude). */
export function altFactor(units?: LiveUnits): number {
  return units?.altitude === 'ft' ? M_TO_FT : 1
}

/** Facteur multiplicatif à appliquer à une allure exprimée en min/km. */
export function paceFactor(paceUnit?: PaceUnit): number {
  return paceUnit === 'min/mile' ? 1 / KM_TO_MI : 1
}

/** Traduit un libellé d'unité métrique brut selon les réglages actifs. */
export function getUnitLabel(unit: string | undefined, units?: LiveUnits, paceUnit?: PaceUnit): string | undefined {
  if (!unit) return unit
  if (units?.distance === 'imperial') {
    if (unit === 'km') return 'mi'
    if (unit === 'km/h') return 'mph'
  }
  if (units?.altitude === 'ft' && unit === 'm') return 'ft'
  if (paceUnit === 'min/mile' && unit === 'min/km') return 'min/mi'
  return unit
}

/** Distance courte selon les réglages : « 350 m » / « 1,5 km » — ou ft / mi. */
export function formatDistShortU(m: number, units?: LiveUnits): string {
  if (units?.distance === 'imperial') {
    const mi = m / 1609.344
    if (mi >= 0.2) return `${mi.toFixed(1).replace('.', ',')} mi`
    return `${Math.round((m * M_TO_FT) / 10) * 10} ft`
  }
  return m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(m)} m`
}

/** Réglage « Taille des données » appliqué aux tuiles (px de la valeur). */
export const SIZE_SCALE: Record<DataSize, { big: number; small: number }> = {
  small:  { big: 44, small: 24 },
  normal: { big: 56, small: 30 },
  large:  { big: 64, small: 34 },
}
