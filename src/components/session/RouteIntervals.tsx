'use client'
// ══════════════════════════════════════════════════════════════════
// RouteIntervals — uploader un parcours (GPX/FIT*) et poser les intervalles
// DESSUS : carte du tracé + profil d'altitude SYNCHRONISÉS. On découpe le
// parcours en segments (coupures le long de la distance) ; chaque segment
// porte une zone d'intensité, affichée à la fois sur le profil (bande
// colorée) et sur la carte (portion de tracé colorée). Sélection synchro.
//
// Réutilise le parseur GPX existant (src/lib/gpxParser.ts) + Leaflet (déjà
// utilisé par les composants gpx/). *FIT non parsé ici → GPX/TCX/KML XML.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState, useCallback } from 'react'
import { parseGPX } from '@/lib/gpxParser'

export interface RoutePoint { lat: number; lon: number }
export interface RouteElev  { distanceM: number; altitudeM: number }
export interface RouteData {
  fileName: string
  distanceM: number
  elevGain: number
  waypoints: RoutePoint[]
  elevation: RouteElev[]
  splits: number[]   // coupures en fraction de distance (0..1), triées
  zones: number[]    // zone par segment (1..5), longueur = splits.length + 1
}
export interface RouteSegment { index: number; distanceM: number; zone: number; startFrac: number; endFrac: number }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeafletMap = any

function downsample<T>(arr: T[], max = 400): { items: T[]; step: number } {
  if (arr.length <= max) return { items: arr, step: 1 }
  const step = Math.ceil(arr.length / max)
  return { items: arr.filter((_, i) => i % step === 0), step }
}

export function segmentsOf(r: RouteData): RouteSegment[] {
  const bounds = [0, ...[...r.splits].sort((a, b) => a - b), 1]
  const segs: RouteSegment[] = []
  for (let i = 0; i < bounds.length - 1; i++) {
    segs.push({
      index: i,
      startFrac: bounds[i],
      endFrac: bounds[i + 1],
      distanceM: Math.max(0, (bounds[i + 1] - bounds[i]) * r.distanceM),
      zone: r.zones[i] ?? 2,
    })
  }
  return segs
}

export default function RouteIntervals({
  value, onChange, zoneColor, accent, onApply,
}: {
  value?: RouteData
  onChange: (v: RouteData | undefined) => void
  zoneColor: Record<number, string>
  accent: string
  onApply: (segments: RouteSegment[]) => void
}) {
  const [status, setStatus] = useState<'idle' | 'parsing' | 'error'>('idle')
  const [selected, setSelected] = useState<number | null>(null)
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const layerRef = useRef<LeafletMap | null>(null)   // LayerGroup des segments

  const segs = value ? segmentsOf(value) : []

  // ── Upload + parse ──
  async function onFile(file: File) {
    setStatus('parsing')
    try {
      const text = await file.text()
      const parsed = parseGPX(text)
      if (parsed.waypoints.length < 2) { setStatus('error'); return }
      const wp = downsample(parsed.waypoints, 400)
      const el = downsample(parsed.elevationProfile, 400)
      onChange({
        fileName: file.name,
        distanceM: parsed.distanceM,
        elevGain: parsed.elevGain,
        waypoints: wp.items.map(p => ({ lat: p.lat, lon: p.lng })),
        elevation: el.items.map(p => ({ distanceM: p.distanceM, altitudeM: p.altitudeM })),
        splits: [],
        zones: [2],
      })
      setSelected(null)
      setStatus('idle')
    } catch { setStatus('error') }
  }

  // ── Carte Leaflet : init quand un nouveau parcours est chargé ──
  const wpKey = value ? `${value.fileName}:${value.waypoints.length}` : ''
  useEffect(() => {
    if (!value || !mapDivRef.current) return
    let cancelled = false
    ;(async () => {
      const L = (await import('leaflet')).default
      if (cancelled || !mapDivRef.current) return
      if (!document.getElementById('leaflet-css-gpx')) {
        const lk = document.createElement('link')
        lk.id = 'leaflet-css-gpx'; lk.rel = 'stylesheet'
        lk.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(lk)
      }
      try { mapRef.current?.remove() } catch { /* ignore */ }
      const m = L.map(mapDivRef.current, { zoomControl: false, attributionControl: false, scrollWheelZoom: false })
      mapRef.current = m
      L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX ?? ''}`,
        { tileSize: 512, zoomOffset: -1, maxZoom: 20 }).addTo(m)
      const latlngs = value.waypoints.map(p => [p.lat, p.lon] as [number, number])
      const bounds = L.latLngBounds(latlngs)
      m.fitBounds(bounds, { padding: [12, 12] })
      layerRef.current = L.layerGroup().addTo(m)
    })()
    return () => { cancelled = true; try { mapRef.current?.remove() } catch { /* ignore */ } mapRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wpKey])

  // ── Redessine les segments colorés sur la carte (splits/zones/selection) ──
  const redraw = useCallback(async () => {
    if (!value || !mapRef.current || !layerRef.current) return
    const L = (await import('leaflet')).default
    layerRef.current.clearLayers()
    const idxOf = (frac: number) => {
      const target = frac * value.distanceM
      let best = 0, bd = Infinity
      value.elevation.forEach((e, i) => { const d = Math.abs(e.distanceM - target); if (d < bd) { bd = d; best = i } })
      return best
    }
    segmentsOf(value).forEach(seg => {
      const a = idxOf(seg.startFrac), b = Math.max(a + 1, idxOf(seg.endFrac))
      const pts = value.waypoints.slice(a, b + 1).map(p => [p.lat, p.lon] as [number, number])
      if (pts.length < 2) return
      L.polyline(pts, {
        color: zoneColor[seg.zone] ?? accent,
        weight: selected === seg.index ? 7 : 4,
        opacity: selected === null || selected === seg.index ? 1 : 0.45,
      }).addTo(layerRef.current)
    })
  }, [value, selected, zoneColor, accent])

  useEffect(() => { void redraw() }, [redraw])

  // ── Profil SVG ──
  const W = 500, H = 96, PL = 30, PR = 8, PT = 8, PB = 16
  const cW = W - PL - PR, cH = H - PT - PB
  const prof = value?.elevation ?? []
  const totD = value?.distanceM || 1
  const minE = prof.length ? Math.min(...prof.map(p => p.altitudeM)) : 0
  const maxE = prof.length ? Math.max(...prof.map(p => p.altitudeM)) : 100
  const eR = maxE - minE || 1
  const px = (d: number) => PL + (d / totD) * cW
  const py = (e: number) => PT + cH - ((e - minE) / eR) * cH
  const linePts = prof.map(p => `${px(p.distanceM)},${py(p.altitudeM)}`).join(' ')
  const areaPts = prof.length ? `${px(0)},${py(minE)} ${linePts} ${px(totD)},${py(minE)}` : ''

  function addSplitAt(clientX: number, rect: DOMRect) {
    if (!value) return
    const frac = Math.max(0.02, Math.min(0.98, ((clientX - rect.left) / rect.width)))
    // refuse une coupure trop proche d'une existante
    if (value.splits.some(s => Math.abs(s - frac) < 0.02)) return
    const splits = [...value.splits, frac].sort((a, b) => a - b)
    // insère la zone du nouveau segment = copie du segment coupé
    const bounds = [0, ...value.splits.sort((a, b) => a - b), 1]
    let segIdx = bounds.findIndex((b, i) => i < bounds.length - 1 && frac > b && frac < bounds[i + 1])
    if (segIdx < 0) segIdx = 0
    const zones = [...value.zones]
    zones.splice(segIdx + 1, 0, value.zones[segIdx] ?? 2)
    onChange({ ...value, splits, zones })
  }

  function cycleZone(i: number) {
    if (!value) return
    const zones = [...value.zones]
    zones[i] = (zones[i] % 5) + 1
    onChange({ ...value, zones })
  }
  function removeSplitBefore(i: number) {
    if (!value || i === 0) return
    const sorted = [...value.splits].sort((a, b) => a - b)
    sorted.splice(i - 1, 1)
    const zones = [...value.zones]
    zones.splice(i, 1)   // fusionne le segment i avec i-1 (garde la zone de i-1)
    onChange({ ...value, splits: sorted, zones })
    setSelected(null)
  }

  const lbl: React.CSSProperties = { fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-dim)', margin:0 }

  // ── État vide : zone d'upload ──
  if (!value) {
    return (
      <div style={{ marginBottom:16, padding:'18px 16px', borderRadius:14, border:'1px dashed var(--border)', background:'var(--bg-card2)' }}>
        <p style={{ ...lbl, marginBottom:8 }}>Parcours</p>
        <label style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'9px 16px', borderRadius:10, border:`1px solid ${accent}`, color:accent, background:`${accent}10`, fontFamily:'DM Sans,sans-serif', fontSize:13, fontWeight:600, cursor:'pointer' }}>
          {status === 'parsing' ? 'Lecture…' : 'Importer un parcours (GPX)'}
          <input type="file" accept=".gpx,.tcx,.kml" style={{ display:'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) void onFile(f) }}/>
        </label>
        <p style={{ fontSize:11, color:'var(--text-dim)', margin:'8px 0 0', lineHeight:1.5 }}>
          Pose ensuite tes intervalles directement sur le tracé et le profil d'altitude.
        </p>
        {status === 'error' && <p style={{ fontSize:11, color:'#ef4444', margin:'6px 0 0' }}>Fichier illisible — vérifie que c'est un GPX valide.</p>}
      </div>
    )
  }

  return (
    <div style={{ marginBottom:16, borderRadius:14, border:'1px solid var(--border)', overflow:'hidden', background:'var(--bg-card2)' }}>
      {/* En-tête */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, padding:'10px 14px', flexWrap:'wrap' }}>
        <div>
          <p style={lbl}>Parcours</p>
          <p style={{ fontSize:12, color:'var(--text-main)', margin:'2px 0 0', fontFamily:'DM Sans,sans-serif' }}>
            {value.fileName} · <span style={{ fontFamily:'DM Mono,monospace' }}>{(value.distanceM/1000).toFixed(1)}km · D+{Math.round(value.elevGain)}m</span>
          </p>
        </div>
        <button onClick={() => { onChange(undefined); setSelected(null) }}
          style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'5px 10px', cursor:'pointer', color:'var(--text-dim)', fontSize:11, fontFamily:'DM Sans,sans-serif' }}>
          Retirer
        </button>
      </div>

      {/* Carte */}
      <div ref={mapDivRef} style={{ width:'100%', height:180, background:'#1a1a2e' }} />

      {/* Profil d'altitude + bandes de zones */}
      <div style={{ background:'#111827', borderTop:'1px solid var(--border)' }}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
          style={{ display:'block', cursor:'copy' }}
          onClick={e => addSplitAt(e.clientX, e.currentTarget.getBoundingClientRect())}>
          {/* bandes de zones par segment */}
          {segs.map(seg => (
            <rect key={`band-${seg.index}`} x={px(seg.startFrac*totD)} y={PT}
              width={Math.max(0, px(seg.endFrac*totD) - px(seg.startFrac*totD))} height={cH}
              fill={zoneColor[seg.zone] ?? accent}
              opacity={selected === null ? 0.16 : selected === seg.index ? 0.32 : 0.07}/>
          ))}
          <polygon points={areaPts} fill="rgba(255,255,255,0.06)"/>
          <polyline points={linePts} fill="none" stroke="#9ca3af" strokeWidth="1.4"/>
          {/* coupures */}
          {[...value.splits].sort((a,b)=>a-b).map((s,i) => (
            <line key={`sp-${i}`} x1={px(s*totD)} y1={PT} x2={px(s*totD)} y2={PT+cH}
              stroke="#fff" strokeWidth="1.4" strokeDasharray="3,3" opacity={0.7}/>
          ))}
          <text x={PL-2} y={PT+8}  fontSize="8" fill="#6b7280" textAnchor="end">{Math.round(maxE)}m</text>
          <text x={PL-2} y={PT+cH} fontSize="8" fill="#6b7280" textAnchor="end">{Math.round(minE)}m</text>
          <text x={W-PR}  y={H-3}   fontSize="8" fill="#6b7280" textAnchor="end">{(totD/1000).toFixed(1)}km</text>
        </svg>
        <p style={{ fontSize:10, color:'#6b7280', margin:0, padding:'4px 10px 8px' }}>Clique sur le profil pour ajouter une coupure d'intervalle.</p>
      </div>

      {/* Segments → zone par segment (synchro carte/profil au survol) */}
      <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:8 }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {segs.map(seg => {
            const c = zoneColor[seg.zone] ?? accent
            const on = selected === seg.index
            return (
              <div key={seg.index}
                onMouseEnter={() => setSelected(seg.index)} onMouseLeave={() => setSelected(null)}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 8px 5px 10px', borderRadius:99,
                  border:`1px solid ${on ? c : 'var(--border)'}`, background: on ? `${c}18` : 'var(--bg-card)',
                  borderLeft:`3px solid ${c}` }}>
                <span style={{ fontSize:10, color:'var(--text-dim)', fontFamily:'DM Mono,monospace' }}>{seg.index+1}</span>
                <span style={{ fontSize:11, color:'var(--text-main)', fontFamily:'DM Mono,monospace' }}>{(seg.distanceM/1000).toFixed(2)}km</span>
                <button onClick={() => cycleZone(seg.index)} title="Changer la zone"
                  style={{ border:'none', background:'transparent', cursor:'pointer', fontSize:11, fontWeight:700, color:c, fontFamily:'DM Mono,monospace', padding:'0 2px' }}>
                  Z{seg.zone}
                </button>
                {seg.index > 0 && (
                  <button onClick={() => removeSplitBefore(seg.index)} title="Fusionner avec le précédent"
                    style={{ border:'none', background:'transparent', cursor:'pointer', fontSize:13, color:'var(--text-dim)', padding:0, lineHeight:1 }}>×</button>
                )}
              </div>
            )
          })}
        </div>
        <button onClick={() => onApply(segs)}
          style={{ alignSelf:'flex-start', padding:'8px 14px', borderRadius:10, border:'none', background:accent, color:'#fff',
            fontFamily:'DM Sans,sans-serif', fontSize:12, fontWeight:600, cursor:'pointer' }}>
          Convertir en blocs d'intervalles
        </button>
      </div>
    </div>
  )
}
