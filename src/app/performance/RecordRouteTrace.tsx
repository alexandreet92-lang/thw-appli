'use client'
// ══════════════════════════════════════════════════════════════════
// RecordRouteTrace — tracé GPS + profil d'altitude + données d'une activité
// LIÉE à un record (running / triathlon). Les records sont posés
// automatiquement ; quand un record pointe vers une activité réelle, on va
// chercher sa trace GPS (streams/raw_data) pour afficher :
//   • une petite carte d'itinéraire (composant partagé RouteMapImage) ;
//   • un profil d'altitude en SVG brut (aucune lib de chart) ;
//   • des données réelles : distance, D+, température si disponible.
// Tout est null-safe : beaucoup de records n'ont pas d'activité liée, ou
// l'activité n'a pas de GPS → on ne rend rien (jamais de boîte vide),
// gracieusement.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { RouteMapImage } from '@/components/activity/RouteMapImage'
import { fetchActivityTrace, type ActivityTrace } from './triActivities'

const FB = 'var(--font-body)'

/** Profil d'altitude en SVG brut (aire + ligne). Null-safe : ≥ 2 points requis. */
function AltitudeProfile({ altitude, distance, color, height = 64 }: {
  altitude: number[]; distance?: number[] | null; color: string; height?: number
}) {
  const uid = useRef(`alt-${Math.random().toString(36).slice(2, 9)}`).current
  const W = 300, H = height
  const n = altitude.length
  if (n < 2) return null
  const min = Math.min(...altitude)
  const max = Math.max(...altitude)
  const span = max - min || 1
  // X : par distance cumulée si alignée, sinon par index (régulier).
  const useDist = Array.isArray(distance) && distance.length === n && distance[n - 1] > distance[0]
  const xOf = (i: number) => useDist
    ? ((distance![i] - distance![0]) / (distance![n - 1] - distance![0])) * W
    : (i / (n - 1)) * W
  const yOf = (v: number) => H - ((v - min) / span) * (H - 6) - 3
  // Sous-échantillonnage pour un path raisonnable (~240 pts max).
  const step = Math.max(1, Math.floor(n / 240))
  const pts: string[] = []
  for (let i = 0; i < n; i += step) pts.push(`${xOf(i).toFixed(1)},${yOf(altitude[i]).toFixed(1)}`)
  const last = `${xOf(n - 1).toFixed(1)},${yOf(altitude[n - 1]).toFixed(1)}`
  if (pts[pts.length - 1] !== last) pts.push(last)
  const line = `M${pts.join(' L')}`
  const area = `M${xOf(0).toFixed(1)},${H} L${pts.join(' L')} L${W},${H} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img"
      aria-label={`${Math.round(min)}–${Math.round(max)} m`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${uid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function RecordRouteTrace({ activityId, color, compact, showData = true }: {
  /** Id de l'activité liée au record (null/undefined → rien n'est rendu). */
  activityId: string | null | undefined
  /** Couleur du sport (hex ou var(--token)) pour le tracé et le profil. */
  color: string
  /** Mode compact (hauteurs réduites). */
  compact?: boolean
  /** Afficher les puces distance / D+ / température (défaut true). */
  showData?: boolean
}) {
  const { t } = useI18n()
  const [trace, setTrace] = useState<ActivityTrace | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let alive = true
    setTrace(null); setDone(false)
    if (!activityId) { setDone(true); return }
    void fetchActivityTrace(activityId).then(r => { if (alive) { setTrace(r); setDone(true) } })
    return () => { alive = false }
  }, [activityId])

  if (!activityId || !done || !trace) return null

  const hasMap = (trace.latlng && trace.latlng.length >= 2) || !!trace.polyline
  const hasAlt = !!trace.altitude && trace.altitude.length >= 2
  const chips: { label: string; value: string }[] = []
  if (showData) {
    if (trace.distance_m != null && trace.distance_m > 0) chips.push({ label: t('perf2.distance'), value: `${(trace.distance_m / 1000).toFixed(trace.distance_m < 10000 ? 2 : 1)} km` })
    if (trace.elevation_gain_m != null && trace.elevation_gain_m > 0) chips.push({ label: t('record.routeFilterElev'), value: `${Math.round(trace.elevation_gain_m)} m` })
    if (trace.avg_temp_c != null) chips.push({ label: t('actp.avg_temp'), value: `${Math.round(trace.avg_temp_c)} °C` })
  }

  // Rien d'exploitable → ne rien afficher (gracieux).
  if (!hasMap && !hasAlt && chips.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {hasMap && (
        <RouteMapImage
          latlng={trace.latlng ?? undefined}
          polyline={trace.polyline ?? undefined}
          color={color}
          height={compact ? 120 : 148}
          radius="var(--r-md)"
          ariaLabel={t('perf2.linkedActivity')}
        />
      )}
      {hasAlt && (
        <div>
          <p style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 4px' }}>
            {t('sed.elevationProfile')}
          </p>
          <div style={{ borderRadius: 'var(--r-sm)', background: 'var(--surface-chip, var(--bg-card2))', padding: '6px 8px' }}>
            <AltitudeProfile altitude={trace.altitude!} distance={trace.altDistance} color={color} height={compact ? 52 : 64} />
          </div>
        </div>
      )}
      {chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {chips.map(c => (
            <span key={c.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: 28, padding: '0 10px', borderRadius: 'var(--r-pill)', background: 'var(--surface-chip, var(--bg-card2))', fontFamily: FB, fontSize: 12 }}>
              <span style={{ color: 'var(--text-mid)' }}>{c.label}</span>
              <span className="tnum" style={{ color: 'var(--text)', fontWeight: 700 }}>{c.value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
