'use client'
// ══════════════════════════════════════════════════════════════════
// ParcoursViewer — visualiseur de parcours réutilisable (Course + Stage).
// Rendu calqué sur la page Training : carte ActivityMapInner (mêmes tuiles +
// bascule Std/Sat/Hyb) + profil d'altitude SVG synchronisé (survol du profil
// → marqueur sur la carte) + KPIs (distance, D+, D−, alt min/max).
// Source : un fichier GPX local (File, aperçu immédiat) OU une URL stockée.
// Réutilise le parseur src/lib/gpxParser.ts.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { parseGPX } from '@/lib/gpxParser'
import { useI18n } from '@/lib/i18n'
import RouteElevationProfile, { type ProfilePortion, type SequencedPortion } from './RouteElevationProfile'

const MapInner = dynamic(() => import('@/components/activity/ActivityMapInner'), {
  ssr: false,
  loading: () => (
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#0F172A', color:'#64748B', fontSize:12 }}>
      Chargement de la carte…
    </div>
  ),
})

interface Parsed {
  points: { lat: number; lng: number }[]
  elev: { distanceM: number; altitudeM: number }[]
  distanceM: number
  gain: number
  loss: number
  altMin: number
  altMax: number
}

function analyse(gpxText: string): Parsed | null {
  const p = parseGPX(gpxText)
  if (p.waypoints.length < 2) return null
  let loss = 0
  for (let i = 1; i < p.elevationProfile.length; i++) {
    const d = p.elevationProfile[i].altitudeM - p.elevationProfile[i - 1].altitudeM
    if (d < 0) loss -= d
  }
  const alts = p.elevationProfile.map(e => e.altitudeM)
  return {
    points: p.waypoints.map(w => ({ lat: w.lat, lng: w.lng })),
    elev: p.elevationProfile,
    distanceM: p.distanceM,
    gain: p.elevGain,
    loss: Math.round(loss),
    altMin: alts.length ? Math.min(...alts) : 0,
    altMax: alts.length ? Math.max(...alts) : 0,
  }
}

// Données de parcours déjà parsées (ex. parcours_data d'une séance liée à un stage).
export interface ParcoursViewerData {
  gpsTrace?: { lat: number; lon: number }[]
  elevationProfile?: { distKm: number; ele: number }[]
  distance?: number | null   // km
  elevation?: number | null  // D+ (m)
}

function fromData(d: ParcoursViewerData): Parsed | null {
  const ep = d.elevationProfile ?? []
  if (ep.length < 2) return null
  let loss = 0
  for (let i = 1; i < ep.length; i++) { const diff = ep[i].ele - ep[i - 1].ele; if (diff < 0) loss -= diff }
  const alts = ep.map(e => e.ele)
  const lastKm = ep[ep.length - 1].distKm
  return {
    points: (d.gpsTrace ?? []).map(p => ({ lat: p.lat, lng: p.lon })),
    elev: ep.map(e => ({ distanceM: e.distKm * 1000, altitudeM: e.ele })),
    distanceM: (d.distance ?? lastKm) * 1000,
    gain: d.elevation ?? Math.round(ep.reduce((s, e, i) => i > 0 && e.ele > ep[i - 1].ele ? s + (e.ele - ep[i - 1].ele) : s, 0)),
    loss: Math.round(loss),
    altMin: alts.length ? Math.min(...alts) : 0,
    altMax: alts.length ? Math.max(...alts) : 0,
  }
}

export default function ParcoursViewer({ file, fileUrl, data: dataProp, mapHeight = 230, portions, sequencing }: {
  file?: File
  fileUrl?: string
  data?: ParcoursViewerData
  mapHeight?: number
  /** Portions séquencées — overlay discret sur le profil (couleur de zone). */
  portions?: ProfilePortion[]
  /** Active le mode séquençage (bouton « + », drag-to-select, bulle watts/FC). */
  sequencing?: { riderKg: number; bikeKg?: number; defaultWatts?: number; onAddBlock: (p: SequencedPortion) => void }
}) {
  const { t } = useI18n()
  const [data, setData] = useState<Parsed | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [layer, setLayer] = useState<'std' | 'sat' | 'hyb'>('std')
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setStatus('loading'); setData(null)
    // Mode « données parsées » (parcours_data) — pas de fichier à lire.
    if (dataProp) {
      const parsed = fromData(dataProp)
      if (parsed) { setData(parsed); setStatus('ok') } else setStatus('error')
      return
    }
    ;(async () => {
      try {
        const text = file ? await file.text() : fileUrl ? await fetch(fileUrl).then(r => r.text()) : null
        if (!text) { if (!cancelled) setStatus('error'); return }
        const parsed = analyse(text)
        if (cancelled) return
        if (!parsed) { setStatus('error'); return }
        setData(parsed); setStatus('ok')
      } catch { if (!cancelled) setStatus('error') }
    })()
    return () => { cancelled = true }
  }, [file, fileUrl, dataProp])

  // ── Profil — rendu partagé RouteElevationProfile (fiche activité) ──
  const prof = data?.elev ?? []
  const totD = data?.distanceM || 1
  // Survol du profil → marqueur carte : index proportionnel dans le tracé GPS.
  const hoverGps = hoverIdx !== null && data ? data.points[hoverIdx] ?? null : null
  function onHoverKm(km: number | null) {
    if (km == null || !data || data.points.length === 0) { setHoverIdx(null); return }
    const frac = Math.max(0, Math.min(1, (km * 1000) / totD))
    setHoverIdx(Math.round(frac * (data.points.length - 1)))
  }

  if (status === 'error') {
    return <p style={{ fontSize:12, color:'#ef4444', margin:'8px 0 0' }}>{t('shared.gpxInvalid')}</p>
  }
  if (status === 'loading' || !data) {
    return <div style={{ height: mapHeight, borderRadius:12, background:'#0F172A', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748B', fontSize:12 }}>{t('shared.readingRoute')}</div>
  }

  const KPI = ({ label, value }: { label: string; value: string }) => (
    <div style={{ flex:1, minWidth:70 }}>
      <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-dim)', margin:0 }}>{label}</p>
      <p style={{ fontSize:17, fontWeight:600, color:'var(--text)', margin:'2px 0 0', fontVariantNumeric:'tabular-nums' }}>{value}</p>
    </div>
  )

  return (
    <div style={{ borderRadius:12, border:'1px solid var(--border)' }}>
      {/* KPIs */}
      <div style={{ display:'flex', gap:14, padding:'12px 14px', background:'var(--bg-card2)', flexWrap:'wrap', borderRadius:'12px 12px 0 0' }}>
        <KPI label={t('shared.distance')} value={`${(data.distanceM/1000).toFixed(1)} km`} />
        <KPI label="D+" value={`${Math.round(data.gain)} m`} />
        <KPI label="D−" value={`${data.loss} m`} />
        <KPI label="Alt." value={`${Math.round(data.altMin)}–${Math.round(data.altMax)} m`} />
      </div>

      {/* Carte (façon Training) */}
      <div style={{ position:'relative', width:'100%', height:mapHeight, background:'#0F172A', overflow:'hidden' }}>
        <MapInner points={data.points} layer={layer} onLayerChange={setLayer} hoverGps={hoverGps} />
      </div>

      {/* Profil d'altitude synchronisé — rendu fiche activité (silhouette bleue) */}
      <div style={{ background:'var(--bg-card)', borderTop:'1px solid var(--border)', borderRadius:'0 0 12px 12px', padding:'8px 10px 6px' }}>
        <RouteElevationProfile
          profile={prof.map(p => ({ distKm: p.distanceM / 1000, ele: p.altitudeM }))}
          totalKm={totD / 1000}
          height={92}
          onHoverKm={onHoverKm}
          portions={portions}
          sequencing={sequencing}
        />
      </div>
    </div>
  )
}
