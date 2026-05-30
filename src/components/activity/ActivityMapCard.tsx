'use client'
// ── ActivityMapCard — carte GPS de l'activité (collapsible) ─────────────────
// GPS source : raw_data.map.summary_polyline (Google polyline encodé, Strava)
// Si absent, le composant retourne null silencieusement.

import { useState } from 'react'
import type { CSSProperties } from 'react'
import dynamic from 'next/dynamic'
import { Maximize2, Minimize2 } from 'lucide-react'

type LayerId = 'std' | 'sat' | 'hyb'

interface LatLng { lat: number; lng: number }

// Chargement côté client uniquement (Leaflet ne supporte pas le SSR)
const ActivityMapInner = dynamic(() => import('./ActivityMapInner'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0F172A', color: '#64748B', fontSize: 12,
    }}>
      Chargement de la carte…
    </div>
  ),
})

// ── Décodeur Google Polyline ──────────────────────────────────────────────────
function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = []
  let lat = 0, lng = 0, i = 0
  while (i < encoded.length) {
    let b: number, shift = 0, result = 0
    do {
      b = encoded.charCodeAt(i++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 32)
    lat += (result & 1) ? ~(result >> 1) : (result >> 1)

    shift = 0; result = 0
    do {
      b = encoded.charCodeAt(i++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 32)
    lng += (result & 1) ? ~(result >> 1) : (result >> 1)

    points.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }
  return points
}

// ── Extraction du tracé depuis l'activité ────────────────────────────────────
function extractPoints(activity: Record<string, unknown>): LatLng[] | null {
  // Cas 1 : colonne dédiée summary_polyline (priorité — toujours présente après backfill)
  const col = activity.summary_polyline as string | null | undefined
  if (col && col.length > 0) return decodePolyline(col)

  // Cas 2 : snapped_points déjà en array [{lat,lng}]
  const snapped = activity.snapped_points
  if (Array.isArray(snapped) && snapped.length > 0) {
    return snapped as LatLng[]
  }

  // Cas 3 : Google polyline encodé dans raw_data.map (import complet)
  const rawData = activity.raw_data as Record<string, unknown> | null | undefined
  const mapObj  = rawData?.map as Record<string, unknown> | null | undefined
  const encoded = (mapObj?.polyline ?? mapObj?.summary_polyline) as string | null | undefined
  if (encoded && encoded.length > 0) {
    return decodePolyline(encoded)
  }

  return null
}

// ── Composant principal ───────────────────────────────────────────────────────
interface Props {
  activity: Record<string, unknown>
  isMobile?: boolean
  expanded?: boolean
  onToggle?: () => void
  hoverGps?: { lat: number; lng: number } | null
}

export function ActivityMapCard({ activity, isMobile = false, expanded = false, onToggle, hoverGps }: Props) {
  const [layer, setLayer] = useState<LayerId>('std')

  const points = extractPoints(activity)
  if (!points || points.length < 2) return null

  const cardStyle: CSSProperties = expanded
    ? {
        position: 'relative',
        width: '100%',
        height: 420,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
        zIndex: 1,
        transition: 'height 300ms ease',
      }
    : {
        position: 'relative',
        width: '100%',
        height: isMobile ? 180 : 220,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        zIndex: 1,
        transition: 'height 300ms ease',
      }

  return (
    <div style={cardStyle}>
      <ActivityMapInner points={points} layer={layer} onLayerChange={setLayer} hoverGps={hoverGps} />

      {/* Bouton agrandir / réduire — masqué sur mobile */}
      {!isMobile && onToggle && (
        <button
          onClick={onToggle}
          style={{
            position: 'absolute', top: 8, right: 8, zIndex: 10,
            backgroundColor: 'rgba(0,0,0,0.5)',
            border: 'none', borderRadius: 6, padding: 6,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
          }}
        >
          {expanded
            ? <Minimize2 size={14} color="white" />
            : <Maximize2 size={14} color="white" />
          }
        </button>
      )}
    </div>
  )
}
