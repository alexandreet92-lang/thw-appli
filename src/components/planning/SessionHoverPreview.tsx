'use client'
// ══════════════════════════════════════════════════════════════════
// SessionHoverPreview — popover de survol d'une carte de séance dans la
// grille planning (desktop). POPOVER UNIQUE : elle a remplacé l'ancienne
// « SessionTipPortal » de planning/page.tsx, qui doublonnait le profil
// d'intensité avec sa propre échelle de couleurs et de hauteurs et ne
// montrait jamais le parcours.
//
// Ordre de lecture (fixe) :
//   1. titre
//   2. durée · km · D+ · RPE  (km / D+ seulement s'il y a un parcours)
//   3. PROFIL D'INTENSITÉ — barres par zone (mêmes toBars / zColor /
//      barHeightPct que le builder : Z1 20 % → Z5 100 %, Z6-Z7 plafonnées
//      au niveau de Z5, ordre chronologique le long du parcours)
//      · séance de muscu : liste des exercices à la place
//   4. MINI-CARTE du tracé (polyline normalisée sur fond var(--bg-alt) —
//      pas de tuiles Leaflet dans un survol)
//   5. PROFIL ALTIMÉTRIQUE du parcours (RouteElevationProfile, statique)
//   6. notes libres de la séance
//
// pointerEvents: none → ne gêne jamais le drag des séances.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatHM, parseGymExercise, type Session } from '@/app/planning/page'
import { sportKeyFromType } from '@/components/icons/SportIcon'
import { toBars, barHeightPct, type MBlock } from './mobile/blocks'
import { zColor } from './mobile/editorial'
import RouteElevationProfile from '@/components/gpx/RouteElevationProfile'

const WIDTH = 262

export function SessionHoverPreview({ session, anchor }: { session: Session; anchor: DOMRect }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted || typeof document === 'undefined') return null

  const vw = window.innerWidth
  const vh = window.innerHeight
  const fitsRight = anchor.right + 10 + WIDTH <= vw

  const isGym = sportKeyFromType(session.sport) === 'muscu'
  const blocks = (session.blocks ?? []).filter(b => b.type !== 'circuit_header' || (b.label ?? '').trim())
  const bars = isGym ? [] : toBars(blocks as MBlock[])

  const pd = session.parcoursData
  const trace = pd?.gpsTrace && pd.gpsTrace.length > 1 ? pd.gpsTrace : null
  const elevProfile = pd?.elevationProfile && pd.elevationProfile.length > 1 ? pd.elevationProfile : null

  const left = fitsRight ? anchor.right + 10 : Math.max(8, anchor.left - WIDTH - 10)
  const estH = 150 + (trace ? 130 : 0) + (elevProfile ? 80 : 0)
  const top = Math.max(8, Math.min(anchor.top, vh - estH - 8))

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

  // Ligne d'infos : durée · km · D+ · RPE
  const infos: string[] = []
  if (session.durationMin > 0) infos.push(formatHM(session.durationMin))
  if (pd?.distance != null) infos.push(`${pd.distance} km`)
  if (pd?.elevation != null) infos.push(`${pd.elevation} m D+`)
  if (session.rpe != null && session.rpe > 0) infos.push(`RPE ${session.rpe}`)

  const sectionLabel: React.CSSProperties = {
    margin: '0 0 5px', fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.06em', color: 'var(--text-dim)',
  }

  const node = (
    <div data-testid="session-hover-preview" style={{
      position: 'fixed', left, top, width: WIDTH, zIndex: 3000,
      pointerEvents: 'none',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 12,
      boxShadow: 'var(--shadow-card)',
      maxHeight: '78vh', overflow: 'hidden',
      animation: 'shpIn .16s ease-out forwards',
    }}>
      <style>{`@keyframes shpIn { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* 1. Titre */}
      <p style={{ margin: '0 0 3px', fontSize: 12, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {session.title}
      </p>

      {/* 2. Durée · km · D+ · RPE */}
      {infos.length > 0 && (
        <p data-testid="shp-infos" style={{ margin: '0 0 9px', fontSize: 10.5, color: 'var(--text-mid)', fontVariantNumeric: 'tabular-nums' }}>
          {infos.join(' · ')}
        </p>
      )}

      {/* 3a. Muscu : liste des exercices (pas de profil d'intensité pertinent) */}
      {isGym && blocks.length > 0 && (
        <div data-testid="shp-exercises" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={sectionLabel}>Exercices</p>
          {blocks.map((b, i) => {
            const ex = parseGymExercise(b)
            const meta = [ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : (ex.sets ? `${ex.sets} séries` : ''), ex.charge ? `@${ex.charge}` : ''].filter(Boolean).join(' ')
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 11.5, color: 'var(--text)', fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.nom}</span>
                {meta && <span style={{ fontSize: 10.5, color: 'var(--text-mid)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{meta}</span>}
              </div>
            )
          })}
        </div>
      )}

      {/* 3b. Profil d'intensité — mêmes barres, mêmes hauteurs que le builder */}
      {!isGym && (
        <>
          <p style={sectionLabel}>Profil d&apos;intensité</p>
          <div data-testid="shp-bars" style={{ height: 56, display: 'flex', alignItems: 'flex-end', gap: 1.5, borderBottom: '1px solid var(--border)', marginBottom: trace || elevProfile ? 10 : 0 }}>
            {bars.length === 0
              ? <span style={{ fontSize: 10, color: 'var(--text-dim)', alignSelf: 'center', margin: '0 auto' }}>Aucun bloc</span>
              : bars.map(bar => (
                <div key={bar.id} data-zone={bar.zone} data-km={bar.startKm ?? ''}
                  title={`Z${bar.zone}${bar.value ? ` · ${bar.value}` : ''} · ${Math.round(bar.min)}min`}
                  style={{
                    flexGrow: Math.max(1, bar.min), flexBasis: 0, minWidth: 2,
                    height: `${barHeightPct(bar, session.sport)}%`,
                    background: zColor(bar.zone), opacity: bar.recovery ? 0.5 : 1,
                    borderRadius: '2px 2px 0 0',
                  }} />
              ))}
          </div>
        </>
      )}

      {/* 4. Mini-carte du parcours */}
      {trace && (
        <>
          <p style={sectionLabel}>Parcours</p>
          <svg data-testid="shp-map" width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            style={{ display: 'block', background: 'var(--bg-alt)', borderRadius: 10 }}>
            {/* contour puis tracé bleu */}
            <path d={traceD} fill="none" stroke="var(--bg-card)" strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
            <path d={traceD} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </>
      )}

      {/* 5. Profil altimétrique — même rendu que l'éditeur, statique */}
      {elevProfile && (
        <div data-testid="shp-elevation" style={{ marginTop: trace ? 10 : 0 }}>
          <p style={sectionLabel}>Profil altimétrique</p>
          <RouteElevationProfile
            profile={elevProfile}
            totalKm={pd?.distance ?? undefined}
            totalGainM={pd?.elevation ?? undefined}
            height={54}
            staticMode
          />
        </div>
      )}

      {/* 6. Notes libres */}
      {session.notes?.trim() && (
        <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--text-mid)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
          {session.notes.trim()}
        </p>
      )}
    </div>
  )

  return createPortal(node, document.body)
}
