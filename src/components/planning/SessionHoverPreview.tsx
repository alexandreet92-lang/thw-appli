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
//   4. MINI-CARTE du tracé — VRAIE carte (image Mapbox Static, tuiles +
//      relief) via staticRouteMapUrl ; repli polyline SVG sans token
//   5. PROFIL ALTIMÉTRIQUE du parcours (RouteElevationProfile, statique)
//   6. notes libres de la séance
//
// pointerEvents: none → ne gêne jamais le drag des séances.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatHM, parseGymExercise, type Session } from '@/app/planning/page'
import { sportKeyFromType } from '@/components/icons/SportIcon'
import { toBars, barHeightPct, treadmillProfile, type MBlock } from './mobile/blocks'
import { zColor } from './mobile/editorial'
import RouteElevationProfile from '@/components/gpx/RouteElevationProfile'
import { staticRouteMapUrl } from '@/lib/staticMap'
import { useAthleteRefs } from '@/hooks/useAthleteRefs'
import { moveDef, type ComposedMove, type ComposedCircuit, type ComposedSport } from './composedSports'

const WIDTH = 262

// Une ligne d'exo composé : « Bike 7' @190w - 30'' récup », « Pompes ×15 ».
function composedLineText(sport: ComposedSport, m: ComposedMove): string {
  const def = moveDef(sport, m.kind)
  const name = m.customName || def?.label || m.kind
  const parts: string[] = [name]
  // Mesure principale
  if (m.timeSec) parts.push(m.timeSec % 60 === 0 ? `${m.timeSec / 60}'` : `${Math.floor(m.timeSec / 60)}'${String(m.timeSec % 60).padStart(2, '0')}''`)
  else if (m.reps) parts.push(`×${m.reps}`)
  else if (m.distanceM) parts.push(`${m.distanceM} m`)
  else if (m.calories) parts.push(`${m.calories} kcal`)
  // Intensité cible
  if (m.watts) parts.push(`@${m.watts}w`)
  else if (m.speedKmh) parts.push(`@${m.speedKmh}km/h`)
  else if (m.paceMinKm) parts.push(`@${m.paceMinKm}/km`)
  else if (m.paceSec500) parts.push(`@${Math.floor(m.paceSec500 / 60)}:${String(m.paceSec500 % 60).padStart(2, '0')}/500`)
  else if (m.speedLevel) parts.push(`niv ${m.speedLevel}`)
  if (m.weightKg) parts.push(`${m.weightKg} kg`)
  let line = parts.join(' ')
  if (m.restAfterSec) line += ` - ${m.restAfterSec < 60 ? `${m.restAfterSec}''` : `${Math.round(m.restAfterSec / 60)}'`} récup`
  return line
}

export function SessionHoverPreview({ session, anchor }: { session: Session; anchor: DOMRect }) {
  const [mounted, setMounted] = useState(false)
  // Repères de zones du VRAI athlète (FTP réel, ex. 118 W) → hauteurs de barres
  // correctes au lieu du repli 200 W.
  const refs = useAthleteRefs()
  useEffect(() => { setMounted(true) }, [])
  if (!mounted || typeof document === 'undefined') return null

  const vw = window.innerWidth
  const vh = window.innerHeight
  const fitsRight = anchor.right + 10 + WIDTH <= vw

  const isGym = sportKeyFromType(session.sport) === 'muscu'
  // Sports composés (boxe / hybride) : détail lu depuis composed/composedCircuits.
  const isComposed = (session.sport === 'boxe' || session.sport === 'hybrid') && !!session.composed?.length
  const composedSport = (session.sport === 'hybrid' ? 'hybrid' : 'boxe') as ComposedSport
  const composedMoves = session.composed ?? []
  const composedCircuits: ComposedCircuit[] = session.composedCircuits ?? (session.composedCircuit ? [session.composedCircuit] : [{ id: 'c1', rounds: 1, restSec: 0 }])
  const blocks = (session.blocks ?? []).filter(b => b.type !== 'circuit_header' || (b.label ?? '').trim())
  const bars = (isGym || isComposed) ? [] : toBars(blocks as MBlock[], session.sport)

  const pd = session.parcoursData
  const trace = pd?.gpsTrace && pd.gpsTrace.length > 1 ? pd.gpsTrace : null
  const elevProfile = pd?.elevationProfile && pd.elevationProfile.length > 1 ? pd.elevationProfile : null

  // Tapis (course indoor) : profil altimétrique reconstruit depuis la pente des
  // blocs, faute de trace GPS. Affiché comme profil altimétrique du parcours.
  const isTreadmill = sportKeyFromType(session.sport) === 'run' && session.runningSub === 'treadmill'
  const treadProfile = isTreadmill && !elevProfile ? treadmillProfile(blocks as MBlock[]) : []
  const treadGain = treadProfile.length ? Math.round(treadProfile[treadProfile.length - 1].ele) : 0
  const treadKm = treadProfile.length ? treadProfile[treadProfile.length - 1].distKm : 0
  const showTread = isTreadmill && treadProfile.length > 1 && treadGain > 0

  const left = fitsRight ? anchor.right + 10 : Math.max(8, anchor.left - WIDTH - 10)
  const estH = 150 + (trace ? 130 : 0) + (elevProfile ? 80 : 0)
  const top = Math.max(8, Math.min(anchor.top, vh - estH - 8))

  // Mini-carte : vraie carte Mapbox (tuiles + relief) via l'API Static Images.
  // Repli sur une polyline SVG si aucun token Mapbox n'est configuré.
  const MAP_W = WIDTH - 24, MAP_H = 104
  const mapUrl = trace
    // pins:false → plus de gros points départ/arrivée qui masquaient le tracé ;
    // on veut voir la LIGNE du parcours nettement.
    ? staticRouteMapUrl(trace.map(p => ({ lat: p.lat, lng: p.lon })), { width: MAP_W, height: MAP_H, pins: false })
    : null
  let traceD = ''
  if (trace && !mapUrl) {
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

      {/* 3a-bis. Boxe / Hybride : détail ligne par ligne, chaque circuit encadré
          par des parenthèses avec ×N tours (comme demandé). */}
      {isComposed && (
        <div data-testid="shp-composed" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={sectionLabel}>Détail</p>
          {composedCircuits.map((c, ci) => {
            const cm = composedMoves.filter(m => (m.circuitId ?? composedCircuits[0].id) === c.id)
            if (!cm.length) return null
            const rounds = Math.max(1, c.rounds)
            const lines = cm.map((m, i) => (
              <p key={m.id || i} style={{ margin: 0, fontSize: 11, color: 'var(--text)', fontWeight: 600, lineHeight: 1.45 }}>{composedLineText(composedSport, m)}</p>
            ))
            if (rounds <= 1) return <div key={c.id}>{c.name && <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: 'var(--text-dim)' }}>{c.name}</p>}{lines}</div>
            // Circuit répété : parenthèses gauche/droite + ×N
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'stretch', gap: 6 }}>
                <span style={{ fontSize: 30, fontWeight: 300, color: 'var(--text-dim)', lineHeight: 1, alignSelf: 'stretch', display: 'flex', alignItems: 'center' }}>(</span>
                <div style={{ flex: 1, minWidth: 0 }}>{c.name && <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: 'var(--text-dim)' }}>{c.name}</p>}{lines}</div>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontSize: 30, fontWeight: 300, color: 'var(--text-dim)', lineHeight: 1 }}>)</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>×{rounds}</span>
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* 3b. Profil d'intensité — mêmes barres, mêmes hauteurs que le builder */}
      {!isGym && !isComposed && (
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
                    height: `${barHeightPct(bar, session.sport, refs)}%`,
                    background: zColor(bar.zone), opacity: bar.recovery ? 0.5 : 1,
                    borderRadius: '2px 2px 0 0',
                  }} />
              ))}
          </div>
        </>
      )}

      {/* 4. Mini-carte du parcours — vraie carte Mapbox (repli SVG sans token) */}
      {trace && (
        <>
          <p style={sectionLabel}>Parcours</p>
          {mapUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img data-testid="shp-map" src={mapUrl} alt="Carte du parcours" width={MAP_W} height={MAP_H}
              style={{ display: 'block', width: MAP_W, height: MAP_H, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} />
          ) : (
            <svg data-testid="shp-map" width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}
              style={{ display: 'block', background: 'var(--bg-alt)', borderRadius: 10 }}>
              {/* contour puis tracé bleu */}
              <path d={traceD} fill="none" stroke="var(--bg-card)" strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
              <path d={traceD} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          )}
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

      {/* 5b. Tapis : profil altimétrique reconstruit depuis la pente des blocs */}
      {showTread && (
        <div data-testid="shp-tread-elevation" style={{ marginTop: 10 }}>
          <p style={sectionLabel}>Profil altimétrique · +{treadGain} m D+</p>
          <RouteElevationProfile
            profile={treadProfile}
            totalKm={treadKm}
            totalGainM={treadGain}
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
