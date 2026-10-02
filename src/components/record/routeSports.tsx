'use client'
// Sports proposés pour les parcours (création, filtres, vignettes) — une seule
// liste, dans l'ordre de l'éditeur : Course à pied, Trail, VTT, Vélo, Randonnée, Ski.
import { IconBike, IconMountain, IconRun, IconWalk, IconTrekking, IconSkiJumping } from '@tabler/icons-react'

export interface RouteSport { id: string; Icon: typeof IconBike; labelKey: string }

export const ROUTE_SPORTS: RouteSport[] = [
  { id: 'running', Icon: IconRun, labelKey: 'record.routeCreatorSportRunning' },
  { id: 'trail', Icon: IconTrekking, labelKey: 'record.routeCreatorSportTrail' },
  { id: 'mtb', Icon: IconMountain, labelKey: 'record.routeCreatorSportMtb' },
  { id: 'cycling', Icon: IconBike, labelKey: 'record.routeCreatorSportCycling' },
  { id: 'hiking', Icon: IconWalk, labelKey: 'record.routeCreatorSportHiking' },
  { id: 'ski', Icon: IconSkiJumping, labelKey: 'record.routeCreatorSportSki' },
]

export function routeSport(id: string | null | undefined): RouteSport {
  return ROUTE_SPORTS.find(s => s.id === id) ?? ROUTE_SPORTS[3]
}

/** Vitesse moyenne de référence (km/h) pour la durée estimée d'un parcours. */
export const ROUTE_SPEED_KMH: Record<string, number> = { cycling: 25, gravel: 22, mtb: 15, trail: 9, running: 10, hiking: 4.5, walking: 4.5, ski: 8 }

/** « 2 h 10 » / « 45 min » — durée estimée selon le sport. */
export function routeEstLabel(distanceM: number | null | undefined, sport: string): string {
  if (!distanceM) return '—'
  const sec = (distanceM / 1000) / (ROUTE_SPEED_KMH[sport] ?? 18) * 3600
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60)
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`
}

/** « 54,0 km » (≥ 100 km : sans décimale). */
export function routeKmLabel(distanceM: number | null | undefined): string {
  const km = (distanceM ?? 0) / 1000
  return `${km >= 100 ? Math.round(km) : km.toFixed(1).replace('.', ',')} km`
}

/** Entier avec espace fine des milliers (« 1 117 »). */
export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ')
}
