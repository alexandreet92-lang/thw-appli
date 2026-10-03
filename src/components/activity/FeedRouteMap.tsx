'use client'

// ══════════════════════════════════════════════════════════════
// FeedRouteMap — aperçu du tracé GPS d'une activité dans le fil (façon
// Strava). Délègue au composant partagé RouteMapImage (image statique
// Mapbox → repli tuiles → repli fond SVG, tracé SVG aligné, squelette).
// Aucune interaction : pointer-events none (le tap remonte à la carte).
// ══════════════════════════════════════════════════════════════

import { RouteMapImage } from '@/components/activity/RouteMapImage'

interface Props {
  encodedPolyline: string
  /** Couleur du sport (hex ou var()) — trait du tracé. */
  color:           string
  /** Étiquette en haut à gauche (« Entraînement » / « Compétition »). */
  label?:          string
  /** Hauteur / largeur du cadre (défaut 2/3, comme Strava). */
  ratio?:          number
}

export function FeedRouteMap({ encodedPolyline, color, label, ratio = 2 / 3 }: Props) {
  return <RouteMapImage polyline={encodedPolyline} color={color} label={label} ratio={ratio} strokeWidth={4.5} />
}
