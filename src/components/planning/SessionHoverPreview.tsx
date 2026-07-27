'use client'
// ══════════════════════════════════════════════════════════════════
// SessionHoverPreview — popover de survol d'une carte de séance dans la
// grille planning (desktop). Affiche le PROFIL D'INTENSITÉ (barres par
// zone, mêmes toBars/zColor que le builder) et, si la séance a un
// parcours_data, une mini-carte SVG du tracé (polyline normalisée sur
// fond var(--bg-alt) — pas de tuiles Leaflet dans un survol) + distance/D+.
// pointerEvents: none → ne gêne jamais le drag des séances.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Session } from '@/app/planning/page'
import { toBars, type MBlock } from './mobile/blocks'
import { zColor } from './mobile/editorial'

const WIDTH = 262

export function SessionHoverPreview({ session, anchor }: { session: Session; anchor: DOMRect }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted || typeof document === 'undefined') return null

  const vw = window.innerWidth
  const vh = window.innerHeight
  const fitsRight = anchor.right + 10 + WIDTH <= vw
  const left = fitsRight ? anchor.right + 10 : Math.max(8, anchor.left - WIDTH - 10)
  const estH = 250
  const top = Math.max(8, Math.min(anchor.top, vh - estH - 8))

  const bars = toBars((session.blocks ?? []) as MBlock[])
  const nZones = session.sport === 'bike' ? 7 : 5

  const pd = session.parcoursData
  const trace = pd?.gpsTrace && pd.gpsTrace.length > 1 ? pd.gpsTrace : null

  // Mini-carte : polyline normalisée, aspect conservé
  const MAP_W = WIDTH - 24, MAP_H = 104
  let traceD = ''
  if (trace) {
    const lats = trace.map(p => p.lat), lons = trace.map(p => p.lon)
    const minLat = Math.min(...lats), maxLat = Math.max(...lats)
    const minLon = Math.min(...lons), maxLon = Math.max(...lons)
    const latR = maxLat - minLat || 0.001, lonR = maxLon - minLon || 0.001
    // Compensation de la latitude pour un rendu moins écrasé
    const lonScale = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180)
    const aspect = (lonR * lonScale) / latR
    const pad = 8
    let plotW = MAP_W - pad * 2, plotH = MAP_H - pad * 2
    if (aspect > plotW / plotH) plotH = plotW / aspect
    else plotW = plotH * aspect
    const ox = (MAP_W - plotW) / 2, oy = (MAP_H - plotH) / 2
    traceD = trace.map((p, i) => {
      const x = ox + ((p.lon - minLon) / lonR) * plotW
      const y = oy + (1 - (p.lat - minLat) / latR) * plotH
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    }).join('')
  }

  const node = (
    <div style={{
      position: 'fixed', left, top, width: WIDTH, zIndex: 1400,
      pointerEvents: 'none',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 12,
      boxShadow: '0 12px 40px rgba(0,0,0,0.30)',
      animation: 'shpIn .16s ease-out forwards',
    }}>
      <style>{`@keyframes shpIn { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* Titre */}
      <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {session.title}
      </p>

      {/* Profil d'intensité — mêmes barres que le builder */}
      <p style={{ margin: '0 0 5px', fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)' }}>
        Profil d&apos;intensité
      </p>
      <div style={{ height: 56, display: 'flex', alignItems: 'flex-end', gap: 1.5, borderBottom: '1px solid var(--border)', marginBottom: trace ? 10 : 0 }}>
        {bars.length === 0
          ? <span style={{ fontSize: 10, color: 'var(--text-dim)', alignSelf: 'center', margin: '0 auto' }}>Aucun bloc</span>
          : bars.map(bar => (
            <div key={bar.id} style={{
              flexGrow: Math.max(1, bar.min), flexBasis: 0, minWidth: 2,
              height: `${(Math.max(1, Math.min(nZones, bar.zone)) / nZones) * 100}%`,
              background: zColor(bar.zone), opacity: bar.recovery ? 0.5 : 1,
              borderRadius: '2px 2px 0 0',
            }} />
          ))}
      </div>

      {/* Mini-carte du parcours (si parcours_data) */}
      {trace && (
        <>
          <p style={{ margin: '0 0 5px', fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)' }}>
            Parcours
          </p>
          <svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            style={{ display: 'block', background: 'var(--bg-alt)', borderRadius: 10 }}>
            {/* contour puis tracé bleu */}
            <path d={traceD} fill="none" stroke="var(--bg-card)" strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
            <path d={traceD} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          </svg>
          <p style={{ margin: '6px 0 0', fontSize: 10.5, color: 'var(--text-mid)', fontVariantNumeric: 'tabular-nums' }}>
            {pd?.distance != null && <><strong style={{ color: 'var(--text)' }}>{pd.distance}</strong> km</>}
            {pd?.distance != null && pd?.elevation != null && ' · '}
            {pd?.elevation != null && <><strong style={{ color: 'var(--text)' }}>{pd.elevation}</strong> m D+</>}
          </p>
        </>
      )}
    </div>
  )

  return createPortal(node, document.body)
}
