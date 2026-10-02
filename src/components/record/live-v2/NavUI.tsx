'use client'
// ════════════════════════════════════════════════════════════════════
// NavUI — briques de présentation PARTAGÉES par la navigation live
// (vélo : MapPage / RouteSheet ; course & trail : RouteNavScreen),
// maquette L6 :
//  • TurnBanner : bandeau sombre arrondi en haut (grosse distance,
//    instruction + nom de voie, tuile icône cyan, ▾ = liste des virages) ;
//  • ThenPill   : petite pilule blanche « puis … » (manœuvre suivante) ;
//  • NavStats   : ligne live W / bpm / km/h + 3 colonnes Restant /
//    Arrivée / D+ restant (avec « fait … ») ;
//  • NavProfile : profil altimétrique, partie déjà parcourue en gris.
// Aucune logique de navigation ici : tout arrive formaté.
// ════════════════════════════════════════════════════════════════════
import { forwardRef, useMemo, type ReactNode } from 'react'
import { ManeuverIcon, type ManeuverKind } from './GuidePanel'

export interface TurnBannerProps {
  /** Gros chiffre (« 350 m ») — absent en mode texte seul. */
  big?: string | null
  /** Instruction (« Tournez à droite »). */
  instruction: string
  /** Nom de voie / badge (« Rue Houdan »), en gras après l'instruction. */
  road?: string | null
  /** Sous-ligne discrète (« 41,6 km restants »). */
  sub?: string | null
  kind: ManeuverKind
  /** Icône pulsée (recherche de position). */
  pending?: boolean
  /** ▾ : ouvre la liste complète des virages. */
  onOpen?: () => void
  open?: boolean
  openLabel?: string
}

/** Bandeau de guidage sombre (identique dans les deux thèmes). */
export function TurnBanner({ big, instruction, road, sub, kind, pending, onOpen, open, openLabel }: TurnBannerProps) {
  const inner = (
    <>
      <span aria-hidden style={{
        width: 52, height: 52, borderRadius: 'var(--r-md)', flexShrink: 0,
        background: pending ? 'color-mix(in srgb, var(--rk-nav-ink) 14%, transparent)' : 'var(--primary)',
        color: 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {pending
          ? <span className="rk-dot" data-live="1" style={{ width: 12, height: 12, background: 'var(--rk-nav-ink)' }} />
          : <ManeuverIcon kind={kind} size={28} />}
      </span>
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        {big && <span className="rk-num" style={{ display: 'block', fontSize: 30, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em' }}>{big}</span>}
        <span style={{
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          fontSize: big ? 16 : 18, fontWeight: big ? 500 : 800, lineHeight: 1.25, marginTop: big ? 3 : 0,
          color: big ? 'color-mix(in srgb, var(--rk-nav-ink) 86%, transparent)' : 'var(--rk-nav-ink)',
        }}>
          {instruction}
          {road && <> · <b style={{ fontWeight: 800, color: 'var(--rk-nav-ink)' }}>{road}</b></>}
        </span>
        {sub && <span className="rk-num" style={{ display: 'block', fontSize: 14, fontWeight: 600, marginTop: 2, letterSpacing: 0, color: 'color-mix(in srgb, var(--rk-nav-ink) 66%, transparent)' }}>{sub}</span>}
      </span>
      {onOpen && (
        <span aria-hidden style={{ flexShrink: 0, opacity: 0.7, display: 'flex', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 260ms cubic-bezier(0.22,1,0.36,1)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </span>
      )}
    </>
  )
  const style: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 80, padding: '14px 16px',
    borderRadius: 'calc(var(--r-lg) + 4px)', border: 'none',
    background: 'var(--rk-nav-bg)', color: 'var(--rk-nav-ink)', boxShadow: 'var(--shadow-float)',
  }
  return onOpen
    ? <button type="button" onClick={onOpen} aria-expanded={open} aria-label={openLabel} className="rk-press" style={{ ...style, cursor: 'pointer', fontFamily: 'inherit' }}>{inner}</button>
    : <div role="status" style={style}>{inner}</div>
}

/** Pilule « puis … » sous le bandeau. */
export function ThenPill({ children }: { children: ReactNode }) {
  return (
    <span className="rk-banner rk-num" style={{ animation: 'none', fontSize: 14, minHeight: 34, letterSpacing: 0, gap: 6 }}>
      {children}
    </span>
  )
}

export interface NavStatsProps {
  live: { value: string; unit: string; dot?: string }[]
  cols: { label: string; value: string; unit?: string; sub?: string | null }[]
}

/** Ligne live + 3 colonnes (Restant · Arrivée · D+ restant). */
export const NavStats = forwardRef<HTMLDivElement, NavStatsProps>(function NavStats({ live, cols }, ref) {
  return (
    <div ref={ref} style={{ padding: '0 12px 12px' }}>
      {live.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 22, marginBottom: 8, flexWrap: 'wrap' }}>
          {live.map((l, i) => (
            <span key={i} className="rk-num" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 17, fontWeight: 800, letterSpacing: 0 }}>
              {l.dot && <span className="rk-dot" style={{ width: 7, height: 7, background: l.dot }} />}
              {l.value}<span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-mid)' }}>{l.unit}</span>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))`, textAlign: 'center' }}>
        {cols.map(c => (
          <div key={c.label} style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-mid)' }}>{c.label}</div>
            <div className="rk-num" style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.1, whiteSpace: 'nowrap' }}>
              {c.value}{c.unit && <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-mid)', letterSpacing: 0 }}> {c.unit}</span>}
            </div>
            {c.sub && <div className="rk-num" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-dim)', marginTop: 1, letterSpacing: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  )
})

/** Profil altimétrique : restant en cyan, déjà parcouru en gris, point courant. */
export function NavProfile({ ep, totalM, traveledM, height = 64 }: {
  ep: { distanceM: number; altitudeM: number }[]; totalM: number; traveledM: number; height?: number
}) {
  const chart = useMemo(() => {
    const W = 340, H = 80
    if (ep.length < 2 || totalM <= 0) return null
    const alts = ep.map(e => e.altitudeM)
    const aMin = Math.min(...alts), aMax = Math.max(...alts), aR = (aMax - aMin) || 1
    const px = (d: number) => Math.min(W, (d / totalM) * W)
    const py = (a: number) => H - 4 - ((a - aMin) / aR) * (H - 14)
    const pts = ep.map(e => `${px(e.distanceM).toFixed(1)},${py(e.altitudeM).toFixed(1)}`)
    const done = ep.filter(e => e.distanceM <= traveledM)
    const donePts = done.map(e => `${px(e.distanceM).toFixed(1)},${py(e.altitudeM).toFixed(1)}`)
    const curAlt = done.length ? done[done.length - 1].altitudeM : ep[0].altitudeM
    const tx = px(Math.min(traveledM, totalM))
    return {
      W, H, line: pts.join(' '), area: `0,${H} ${pts.join(' ')} ${W},${H}`,
      doneLine: donePts.length > 1 ? `${donePts.join(' ')} ${tx.toFixed(1)},${py(curAlt).toFixed(1)}` : '',
      doneArea: donePts.length ? `0,${H} ${donePts.join(' ')} ${tx.toFixed(1)},${py(curAlt).toFixed(1)} ${tx.toFixed(1)},${H}` : '',
      dotX: tx, dotY: py(curAlt), started: traveledM > 0,
    }
  }, [ep, totalM, traveledM])
  if (!chart) return null
  return (
    <div style={{ position: 'relative', padding: '0 12px' }}>
      <svg viewBox={`0 0 ${chart.W} ${chart.H}`} preserveAspectRatio="none" style={{ display: 'block', width: '100%', height }}>
        <defs>
          <linearGradient id="rk-nav-elev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'var(--primary)', stopOpacity: 0.32 }} />
            <stop offset="100%" style={{ stopColor: 'var(--primary)', stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <polygon points={chart.area} fill="url(#rk-nav-elev)" />
        <polyline points={chart.line} fill="none" style={{ stroke: 'var(--primary)' }} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {chart.doneArea && <polygon points={chart.doneArea} style={{ fill: 'var(--surface-card)' }} opacity={0.6} />}
        {chart.doneLine && <polyline points={chart.doneLine} fill="none" style={{ stroke: 'var(--rk-ridden)' }} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
      </svg>
      {chart.started && (
        <span aria-hidden style={{
          position: 'absolute', left: `calc(12px + (100% - 24px) * ${(chart.dotX / chart.W).toFixed(4)})`, top: `${(chart.dotY / chart.H) * height}px`,
          width: 11, height: 11, borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 0 2px var(--surface-card)',
          transform: 'translate(-50%, -50%)',
        }} />
      )}
    </div>
  )
}
