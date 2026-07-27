'use client'
// ══════════════════════════════════════════════════════════════════
// ParcoursViewer — visualiseur de parcours réutilisable (Course + Stage).
// Rendu calqué sur la page Training : carte ActivityMapInner (mêmes tuiles +
// bascule Std/Sat/Hyb) + profil d'altitude SVG synchronisé (survol du profil
// → marqueur sur la carte) + KPIs (distance, D+, D−, alt min/max).
// Source : un fichier GPX local (File, aperçu immédiat) OU une URL stockée.
// Réutilise le parseur src/lib/gpxParser.ts.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { parseGPX } from '@/lib/gpxParser'
import { useI18n } from '@/lib/i18n'
import RouteElevationProfile, { type ProfilePortion, type SequencingConfig } from './RouteElevationProfile'

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

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
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
  /** Active le mode séquençage (boutons « + » / « Fractionné », drag-to-select). */
  sequencing?: SequencingConfig
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

  // ── Portions d'intensité surlignées en ROUGE sur la carte ──
  // km → index de point GPS via la distance cumulée réelle du tracé (le tracé
  // est décimé indépendamment du profil : on ne peut pas mapper par index).
  const cumKm = useMemo(() => {
    const pts = data?.points ?? []
    const out = new Array<number>(pts.length).fill(0)
    for (let i = 1; i < pts.length; i++) out[i] = out[i - 1] + haversineKm(pts[i - 1], pts[i])
    return out
  }, [data])
  const highlights = useMemo(() => {
    const pts = data?.points ?? []
    const hl = (portions ?? []).filter(p => p.highlight)
    if (pts.length < 2 || hl.length === 0) return []
    const traceKm = cumKm[cumKm.length - 1] || 1
    const routeKm = totD / 1000
    // Le tracé décimé peut être légèrement plus court que la distance officielle.
    const k = traceKm / (routeKm || traceKm)
    const idxAt = (km: number) => {
      const target = Math.max(0, Math.min(traceKm, km * k))
      let lo = 0, hi = cumKm.length - 1
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cumKm[m] <= target) lo = m; else hi = m }
      return lo
    }
    return hl.map(p => {
      const i0 = idxAt(Math.min(p.startKm, p.endKm))
      const i1 = idxAt(Math.max(p.startKm, p.endKm))
      return pts.slice(i0, Math.max(i0 + 2, i1 + 1))
    }).filter(seg => seg.length > 1)
  }, [data, portions, cumKm, totD])

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
        <MapInner points={data.points} layer={layer} onLayerChange={setLayer} hoverGps={hoverGps} highlights={highlights} />
      </div>

      {/* Profil d'altitude synchronisé — rendu fiche activité (silhouette bleue) */}
      <div style={{ background:'var(--bg-card)', borderTop:'1px solid var(--border)', borderRadius:'0 0 12px 12px', padding:'8px 10px 6px' }}>
        <RouteElevationProfile
          profile={prof.map(p => ({ distKm: p.distanceM / 1000, ele: p.altitudeM }))}
          totalKm={totD / 1000}
          totalGainM={Math.round(data.gain)}
          height={92}
          onHoverKm={onHoverKm}
          portions={portions}
          sequencing={sequencing}
        />
      </div>
    </div>
  )
}
