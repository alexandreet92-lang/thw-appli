'use client'

// ══════════════════════════════════════════════════════════════════
// RouteMapImage — aperçu STATIQUE et robuste d'un tracé GPS (façon Strava).
// Composant UNIQUE pour toutes les vignettes de carte : fil d'activités,
// fiche « Activité réalisée » du planning, popovers…
//
// Chaîne de rendu (chaque étage prend le relais du précédent) :
//   1. Image Mapbox Static Images (@2x, ≤ 1280 px logiques), cadrée par
//      NOTRE fit-bounds (src/lib/maps/routeMap) ;
//   2. si elle échoue (onError) ou traîne (> 9 s) → tuiles raster assemblées
//      (même source que la carte « Lancer », qui s'affiche sur iPhone) ;
//   3. si les tuiles échouent aussi, ou jeton absent → fond « papier carte »
//      en SVG (jamais une boîte grise vide).
// Le tracé est TOUJOURS dessiné en SVG par-dessus avec la même projection :
// trait épais couleur du sport + liseré blanc, départ vert, arrivée damier,
// curseur optionnel (synchronisé avec un profil).
//
// Corrige les causes des cartes « absentes » :
//   • course onLoad/useEffect : l'image en cache se chargeait AVANT l'effet
//     qui remettait `loaded=false` → opacité 0 définitive. L'état « chargé »
//     est maintenant indexé par URL et vérifié via img.complete ;
//   • loading="lazy" dans des conteneurs défilants imbriqués (WKWebView) :
//     remplacé par un IntersectionObserver maison (marge 300 px) ;
//   • aucun onError : désormais repli tuiles puis fond SVG ;
//   • taille lue via clientWidth (insensible aux transforms des feuilles).
// ══════════════════════════════════════════════════════════════════

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  cleanLatLng, computeRouteFit, decodePolyline, noteStaticFailure, noteStaticSuccess,
  staticLooksBroken, staticMapUrl, tilesForFit, viewSize, warnIfNoToken, MAPBOX_TOKEN,
  type LatLng, type MapPad,
} from '@/lib/maps/routeMap'

export interface RouteMapImageProps {
  /** Positions [lat, lng] (streams latlng…). Prioritaire sur `polyline`. */
  latlng?: readonly unknown[] | null
  /** Polyline Google encodée (summary_polyline). */
  polyline?: string | null
  /** Couleur du trait (hex ou var(--token)). */
  color: string
  /** Hauteur / largeur (défaut 2/3, comme Strava). Ignoré si `height`. */
  ratio?: number
  /** Hauteur fixe (px). */
  height?: number
  /** Étiquette blanche en haut à gauche (« Entraînement »…). */
  label?: string
  /** Curseur synchronisé (position sur le tracé). */
  cursor?: LatLng | null
  /** Rayon du cadre (token var(--r-*)). */
  radius?: string
  /** Marges autour du tracé (px). */
  padding?: Partial<MapPad>
  /** Épaisseur du trait (px de vue). */
  strokeWidth?: number
  /** Libellé accessible ; sans lui, la carte est décorative (aria-hidden). */
  ariaLabel?: string
  style?: CSSProperties
}

type Phase = 'static' | 'tiles' | 'plain'

const STATIC_TIMEOUT_MS = 9000

const NO_TOUCH: CSSProperties = {
  pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none', WebkitTapHighlightColor: 'transparent',
}

// Couleurs de la carte : TOUJOURS claires (une carte n'est jamais sombre,
// comme Strava) → littéraux sanctionnés, indépendants du thème.
const PAPER = '#eef1ea' // design-allow-color — fond « papier carte » (repli)
const PAPER_GRID = '#e1e6dc' // design-allow-color — quadrillage du repli
const PAPER_ROAD = '#ffffff' // design-allow-color — routes stylisées du repli
const CASING = '#ffffff' // design-allow-color — liseré blanc du tracé
const INK = '#111111' // design-allow-color — damier d'arrivée / texte d'étiquette

export function RouteMapImage({
  latlng, polyline, color, ratio = 2 / 3, height, label, cursor, radius,
  padding, strokeWidth = 4.5, ariaLabel, style,
}: RouteMapImageProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [visible, setVisible] = useState(false)
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')

  // Largeur RÉELLE du cadre (clientWidth : non affectée par les transforms).
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const read = () => {
      const w = el.clientWidth
      setWidth(prev => (Math.abs(prev - w) >= 4 ? w : prev))
    }
    read()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Chargement à l'approche de l'écran (remplace loading="lazy", peu fiable
  // dans les conteneurs défilants imbriqués du WKWebView).
  useEffect(() => {
    const el = boxRef.current
    if (!el || visible) return
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setVisible(true); io.disconnect() }
    }, { rootMargin: '300px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [visible])

  useEffect(() => { warnIfNoToken() }, [])

  const pts = useMemo<LatLng[]>(() => {
    const fromLl = cleanLatLng(latlng ?? null)
    if (fromLl.length >= 2) return fromLl
    return polyline ? decodePolyline(polyline) : []
  }, [latlng, polyline])

  const pad: MapPad = {
    top: padding?.top ?? (label ? 46 : 26),
    right: padding?.right ?? 24,
    bottom: padding?.bottom ?? 26,
    left: padding?.left ?? 24,
  }
  const cssH = height ?? Math.round(width * ratio)
  const { W, H } = viewSize(width, cssH)
  const fit = useMemo(
    () => (width > 0 ? computeRouteFit(pts, W, H, pad) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pts, W, H, pad.top, pad.right, pad.bottom, pad.left, width],
  )

  const [phase, setPhase] = useState<Phase>(() =>
    !MAPBOX_TOKEN ? 'plain' : staticLooksBroken() ? 'tiles' : 'static')
  const staticUrl = fit && phase === 'static' ? staticMapUrl(fit) : null
  const tiles = useMemo(() => (fit && phase === 'tiles' ? tilesForFit(fit) : []), [fit, phase])

  // État de chargement indexé par URL → aucune course possible entre l'évènement
  // load (image en cache) et un « reset » d'effet.
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const [tileState, setTileState] = useState<Record<string, 'ok' | 'err'>>({})
  const staticReady = !!staticUrl && loadedUrl === staticUrl

  // Image statique trop lente → tuiles.
  useEffect(() => {
    if (phase !== 'static' || !staticUrl || !visible || staticReady) return
    const tm = window.setTimeout(() => { noteStaticFailure(); setPhase('tiles') }, STATIC_TIMEOUT_MS)
    return () => window.clearTimeout(tm)
  }, [phase, staticUrl, visible, staticReady])

  // Toutes les tuiles en erreur → fond SVG.
  useEffect(() => {
    if (phase !== 'tiles' || tiles.length === 0) return
    if (tiles.every(t => tileState[t.url] === 'err')) setPhase('plain')
  }, [phase, tiles, tileState])

  const tilesReady = phase === 'tiles' && tiles.some(t => tileState[t.url] === 'ok')
  const ready = phase === 'plain' || staticReady || tilesReady
  const stroke = color || 'var(--primary)'
  const cur = fit && cursor ? fit.project(cursor) : null

  return (
    <div
      ref={boxRef}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      style={{
        ...NO_TOUCH,
        position: 'relative', width: '100%', overflow: 'hidden',
        ...(height != null ? { height } : { aspectRatio: `1 / ${ratio}` }),
        borderRadius: radius, background: 'var(--bg-card2)', isolation: 'isolate',
        ...style,
      }}
    >
      <style>{`@keyframes rmiPulse{0%,100%{opacity:.55}50%{opacity:1}}@media (prefers-reduced-motion: reduce){.rmi-skel{animation:none!important}}`}</style>

      {/* Squelette (forme exacte du cadre) tant que le fond n'est pas prêt */}
      {!ready && (
        <div className="rmi-skel" style={{ ...NO_TOUCH, position: 'absolute', inset: 0, background: 'var(--surface-chip, var(--bg-card2))', animation: 'rmiPulse 1.4s ease-in-out infinite' }} />
      )}

      {/* 1. Image statique Mapbox */}
      {visible && staticUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={staticUrl}
          src={staticUrl} alt="" draggable={false} decoding="async"
          ref={el => { if (el && el.complete && el.naturalWidth > 0) setLoadedUrl(u => (u === staticUrl ? u : staticUrl)) }}
          onLoad={() => { noteStaticSuccess(); setLoadedUrl(staticUrl) }}
          onError={() => { noteStaticFailure(); setPhase('tiles') }}
          style={{
            ...NO_TOUCH, position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'fill', display: 'block',
            opacity: staticReady ? 1 : 0, transition: 'opacity 0.25s ease',
          }}
        />
      )}

      {/* 2. Repli : tuiles raster assemblées (même cadrage) */}
      {visible && fit && phase === 'tiles' && (
        <div style={{ ...NO_TOUCH, position: 'absolute', inset: 0 }}>
          {/* Positions en % de la vue : l'image suit exactement le cadre CSS. */}
          <div style={{ position: 'absolute', inset: 0 }}>
            {tiles.map(tl => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={tl.key} src={tl.url} alt="" draggable={false} decoding="async"
                ref={el => { if (el && el.complete && el.naturalWidth > 0) setTileState(s => (s[tl.url] === 'ok' ? s : { ...s, [tl.url]: 'ok' })) }}
                onLoad={() => setTileState(s => (s[tl.url] === 'ok' ? s : { ...s, [tl.url]: 'ok' }))}
                onError={() => setTileState(s => (s[tl.url] === 'err' ? s : { ...s, [tl.url]: 'err' }))}
                style={{
                  ...NO_TOUCH, position: 'absolute',
                  left: `${(tl.left / fit.W) * 100}%`, top: `${(tl.top / fit.H) * 100}%`,
                  width: `${((tl.size + 0.5) / fit.W) * 100}%`, height: `${((tl.size + 0.5) / fit.H) * 100}%`,
                  maxWidth: 'none', display: 'block',
                  opacity: tileState[tl.url] === 'ok' ? 1 : 0, transition: 'opacity 0.25s ease',
                }}
              />
            ))}
          </div>
          <span style={{
            position: 'absolute', right: 4, bottom: 3, padding: '1px 5px', borderRadius: 'var(--r-sm)',
            fontSize: 10, lineHeight: 1.3, fontFamily: 'var(--font-body)', color: INK, opacity: 0.75,
            background: 'rgba(255,255,255,0.7)', // design-allow-color — fond de l'attribution sur la carte
          }}>© Mapbox © OpenStreetMap</span>
        </div>
      )}

      {/* Tracé (et fond « papier carte » en dernier recours) */}
      {fit && (
        <svg
          viewBox={`0 0 ${fit.W} ${fit.H}`} width="100%" height="100%" preserveAspectRatio="none"
          style={{ ...NO_TOUCH, position: 'absolute', inset: 0, overflow: 'visible' }}
        >
          <defs>
            <pattern id={`rmi-chk-${uid}`} width="4" height="4" patternUnits="userSpaceOnUse">
              <rect width="4" height="4" fill={CASING} />
              <rect width="2" height="2" fill={INK} />
              <rect x="2" y="2" width="2" height="2" fill={INK} />
            </pattern>
            <pattern id={`rmi-grid-${uid}`} width="36" height="36" patternUnits="userSpaceOnUse">
              <path d="M36 0H0V36" fill="none" stroke={PAPER_GRID} strokeWidth={1} />
            </pattern>
          </defs>
          {phase === 'plain' && (
            <g>
              <rect width={fit.W} height={fit.H} fill={PAPER} />
              <rect width={fit.W} height={fit.H} fill={`url(#rmi-grid-${uid})`} />
              <path d={`M0 ${fit.H * 0.72} C ${fit.W * 0.3} ${fit.H * 0.6}, ${fit.W * 0.55} ${fit.H * 0.9}, ${fit.W} ${fit.H * 0.66}`} fill="none" stroke={PAPER_ROAD} strokeWidth={6} opacity={0.9} />
              <path d={`M${fit.W * 0.18} 0 C ${fit.W * 0.24} ${fit.H * 0.4}, ${fit.W * 0.1} ${fit.H * 0.7}, ${fit.W * 0.22} ${fit.H}`} fill="none" stroke={PAPER_ROAD} strokeWidth={4} opacity={0.8} />
            </g>
          )}
          {/* Liseré (contraste sur le fond de carte) puis trait couleur du sport */}
          <path d={fit.path} fill="none" stroke={CASING} strokeOpacity={0.95} strokeWidth={strokeWidth + 3.5} strokeLinecap="round" strokeLinejoin="round" />
          <path d={fit.path} fill="none" style={{ stroke }} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          {/* Arrivée (damier) sous le départ (vert) quand la boucle se referme */}
          <circle cx={fit.end[0]} cy={fit.end[1]} r={6.5} fill={`url(#rmi-chk-${uid})`} stroke={CASING} strokeWidth={2} />
          <circle cx={fit.start[0]} cy={fit.start[1]} r={6.5} style={{ fill: 'var(--success)' }} stroke={CASING} strokeWidth={2} />
          {cur && <circle cx={cur[0]} cy={cur[1]} r={7.5} style={{ fill: stroke }} stroke={CASING} strokeWidth={3} />}
        </svg>
      )}

      {label && (
        <span style={{
          ...NO_TOUCH,
          position: 'absolute', top: 12, left: 12,
          padding: '5px 10px', borderRadius: 'var(--r-sm)',
          fontSize: 13, fontWeight: 700, lineHeight: 1.2, fontFamily: 'var(--font-body)',
          color: INK, background: CASING,
          boxShadow: '0 1px 3px rgba(0,0,0,0.18)', // design-allow-color — ombre de l'étiquette sur la carte
        }}>
          {label}
        </span>
      )}
    </div>
  )
}
