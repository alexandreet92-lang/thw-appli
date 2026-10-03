'use client'
// ══════════════════════════════════════════════════════════════════
// ActivitySheetKit — briques visuelles de la fiche « Activité réalisée »
// ouverte depuis le planning (et des aperçus de séance prévue) :
//
//  • ActivityHeader     : tuile sport + titre + date / heure + statut
//  • KpiGrid            : tuiles de métriques (chiffres tabulaires, unité discrète)
//  • IntensityProfile   : profil d'intensité RÉALISÉ par tour — barres aux
//                         couleurs de zone, coins hauts arrondis, légende des
//                         zones (part du temps), tap → valeurs du tour
//  • PlannedIntensityProfile : même rendu pour une séance PRÉVUE (blocs)
//  • ElevationProfile   : profil altimétrique avec curseur vertical, point
//                         sur la courbe et petite bulle « verre » placée dans
//                         une bande réservée (ne recouvre jamais la courbe)
//  • PlanVsDone         : comparaison prévu / réalisé avec écart et point d'état
//
// SVG brut uniquement (aucune lib de chart). Couleurs : tokens, sauf les
// palettes sanctionnées (zones via zColor, sports via SPORT_ICON).
// ══════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useI18n, currentLocale } from '@/lib/i18n'
import { ATHLETE, formatHM, type Session, type TrainingActivity } from '@/app/planning/page'
import { sportKeyFromType, SPORT_ICON, type SportKey } from '@/components/icons/SportIcon'
import {
  buildElevLapStats, buildLapBars, loadAthleteRefs, plannedTargets,
  type AthleteRefsLite, type FullActivity,
} from './ActivityDetails'
import { toBars, barHeightPct, type MBlock } from './mobile/blocks'
import { zColor, secToPace } from './mobile/editorial'
import { useAthleteRefs } from '@/hooks/useAthleteRefs'

const FB = 'var(--font-body)'
const TNUM: CSSProperties = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'zero' 0" }

// ── i18n avec repli (clés listées pour le dictionnaire) ───────────
export function useTx(): (k: string, fb: string, vars?: Record<string, string | number>) => string {
  const { t } = useI18n()
  return (k, fb, vars) => {
    const v = t(k, vars)
    if (v && v !== k) return v
    return vars ? fb.replace(/\{(\w+)\}/g, (_, n: string) => String(vars[n] ?? '')) : fb
  }
}

export function fmtNum(n: number, digits = 1): string {
  try { return new Intl.NumberFormat(currentLocale(), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n) }
  catch { return n.toFixed(digits) }
}

export function sportColorOf(sport: string): string {
  const k = sportKeyFromType(sport)
  return (k ? SPORT_ICON[k as SportKey]?.color : undefined) ?? 'var(--primary)'
}

// ── En-tête ───────────────────────────────────────────────────────
export function ActivityHeader({ sport, title, meta, badge }: {
  sport: string; title: string; meta: string; badge?: ReactNode
}) {
  const k = sportKeyFromType(sport)
  const cfg = k ? SPORT_ICON[k as SportKey] : null
  const col = cfg?.color ?? 'var(--primary)'
  const Ico = cfg?.Icon
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '2px 4px 0', minWidth: 0 }}>
      <span aria-hidden style={{
        width: 48, height: 48, borderRadius: 'var(--r-md)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: col, background: `color-mix(in srgb, ${col} 15%, transparent)`,
      }}>
        {Ico ? <Ico size={26} color={col} stroke={2.1} /> : <span style={{ width: 10, height: 10, borderRadius: '50%', background: col }} />}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, lineHeight: 1.2, color: 'var(--text)', overflowWrap: 'anywhere', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{title}</h2>
        <p style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 500, color: 'var(--text-mid)', fontFamily: FB, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ textTransform: 'capitalize' }}>{meta}</span>
          {badge}
        </p>
      </div>
    </div>
  )
}

/** Petite pastille d'état : point coloré + texte neutre. */
export function StatusPill({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 9px', borderRadius: 'var(--r-pill)', background: 'var(--surface-chip, var(--bg-card2))', fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
      <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
      {children}
    </span>
  )
}

// ── Tuiles KPI ────────────────────────────────────────────────────
export interface Kpi { key: string; label: string; value: string; unit?: string }

export function KpiGrid({ items, cols = 3 }: { items: Kpi[]; cols?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 8 }}>
      {items.map(k => (
        <div key={k.key} style={{ background: 'var(--surface-chip, var(--bg-card2))', borderRadius: 'var(--r-md)', padding: '10px 12px', minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', fontFamily: FB, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.label}</p>
          <p style={{ margin: '3px 0 0', fontFamily: FB, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...TNUM }}>
            <span style={{ fontSize: 19, fontWeight: 700, color: 'var(--text)' }}>{k.value}</span>
            {k.unit && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', marginLeft: 3 }}>{k.unit}</span>}
          </p>
        </div>
      ))}
    </div>
  )
}

// ── Titre de bloc de graphique ────────────────────────────────────
function ChartTitle({ title, meta }: { title: string; meta?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: FB }}>{title}</span>
      {meta && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', fontFamily: FB, ...TNUM }}>{meta}</span>}
    </div>
  )
}

function useLapRefs(): AthleteRefsLite {
  const [refs, setRefs] = useState<AthleteRefsLite | null>(null)
  useEffect(() => { let ok = true; void loadAthleteRefs().then(r => { if (ok) setRefs(r) }); return () => { ok = false } }, [])
  return refs ?? { ftp: ATHLETE.ftp, runThr: ATHLETE.thresholdPace, css: ATHLETE.css }
}

/** Légende des zones présentes : point + Zn + part du temps. */
function ZoneLegend({ shares }: { shares: { zone: number; pct: number }[] }) {
  if (shares.length < 2) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 10 }}>
      {shares.map(s => (
        <span key={s.zone} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', fontFamily: FB, ...TNUM }}>
          <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: zColor(s.zone) }} />
          Z{s.zone} <span style={{ color: 'var(--text)' }}>{Math.round(s.pct)} %</span>
        </span>
      ))}
    </div>
  )
}

/** Barres d'intensité (rendu commun réalisé / prévu). */
function ZoneBars({ bars, active, height, onPick, onHoverFrac }: {
  bars: { zone: number; weight: number; heightPct: number; dim?: boolean; aria: string }[]
  active: number | null
  height: number
  onPick: (i: number) => void
  onHoverFrac?: (f: number | null) => void
}) {
  return (
    <div
      onPointerMove={onHoverFrac ? (e => {
        if (e.pointerType !== 'mouse') return
        const r = e.currentTarget.getBoundingClientRect()
        onHoverFrac(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)))
      }) : undefined}
      onPointerLeave={onHoverFrac ? (e => { if (e.pointerType === 'mouse') onHoverFrac(null) }) : undefined}
      style={{ position: 'relative', height, display: 'flex', alignItems: 'flex-end', gap: 2, borderBottom: '1px solid var(--border)' }}>
      {bars.map((b, i) => {
        const on = active === i
        return (
          <button key={i} type="button" aria-label={b.aria} aria-pressed={on} onClick={() => onPick(i)} data-no-fx
            style={{
              flexGrow: Math.max(1, b.weight), flexBasis: 0, minWidth: 3, height: '100%', padding: 0, border: 'none',
              background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'flex-end', WebkitTapHighlightColor: 'transparent',
            }}>
            <span style={{
              display: 'block', width: '100%', height: `${b.heightPct}%`, background: zColor(b.zone),
              borderRadius: '4px 4px 0 0',
              opacity: active == null ? (b.dim ? 0.55 : 1) : on ? 1 : 0.32,
              transition: 'opacity .18s ease, height .9s cubic-bezier(.22,1,.36,1)',
            }} />
          </button>
        )
      })}
    </div>
  )
}

function DetailRow({ dot, title, cells }: { dot: string; title: string; cells: [string, string][] }) {
  return (
    <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 'var(--r-md)', background: 'var(--surface-chip, var(--bg-card2))', fontFamily: FB }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: dot }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{title}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(4, cells.length)}, minmax(0, 1fr))`, gap: 8 }}>
        {cells.map(([l, v]) => (
          <div key={l} style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l}</p>
            <p style={{ margin: '1px 0 0', fontSize: 14, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', ...TNUM }}>{v}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const fmtClock = (s: number) => s >= 3600
  ? `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(Math.round(s % 60)).padStart(2, '0')}`
  : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

// ── Profil d'intensité RÉALISÉ ────────────────────────────────────
export function IntensityProfile({ full, sport, cursor, onCursor, height = 96 }: {
  full: FullActivity; sport: string; height?: number
  cursor?: number | null; onCursor?: (frac: number | null) => void
}) {
  const tx = useTx()
  const refs = useLapRefs()
  const [sel, setSel] = useState<number | null>(null)
  const bars = useMemo(() => buildLapBars(full, sport, refs), [full, sport, refs])
  const stats = useMemo(() => buildElevLapStats(full, sport), [full, sport])
  if (bars.length === 0) return null
  const isPower = sport === 'bike' || sport === 'elliptique'
  const isSwim = sport === 'swim'
  const cursorIdx = cursor != null ? bars.findIndex(b => cursor >= b.f0 && cursor <= b.f1) : -1
  const active = sel ?? (cursorIdx >= 0 ? cursorIdx : null)
  const total = bars.reduce((s, b) => s + b.weight, 0) || 1
  const byZone = new Map<number, number>()
  bars.forEach(b => byZone.set(b.zone, (byZone.get(b.zone) ?? 0) + b.weight))
  const shares = [...byZone.entries()].sort((a, b) => a[0] - b[0]).map(([zone, w]) => ({ zone, pct: (w / total) * 100 }))
  const single = full.laps.length <= 1
  const lap = active != null ? stats[active] : null
  const lapBar = active != null ? bars[active] : null
  const pick = (i: number) => {
    const next = sel === i ? null : i
    setSel(next)
    onCursor?.(next != null ? (bars[i].f0 + bars[i].f1) / 2 : null)
  }
  const meta = single ? tx('w3g.act_continuous_session', 'Séance continue') : tx('w3g.act_laps_count', '{n} tours', { n: full.laps.length })
  const cells: [string, string][] = lap ? [
    [tx('w3g.act_distance', 'Distance'), isSwim ? `${Math.round(lap.distanceM)} m` : `${fmtNum(lap.distanceM / 1000, 2)} km`],
    [tx('plnp.field.duration', 'Durée'), fmtClock(lap.timeS)],
    isPower
      ? [tx('w3g.act_power', 'Puissance'), lap.watts != null ? `${Math.round(lap.watts)} W` : '—']
      : [tx('w3g.act_pace', 'Allure'), lap.paceS != null ? `${secToPace(lap.paceS)}${isSwim ? '/100m' : '/km'}` : '—'],
    [tx('pl.sheet.hrAvg', 'FC moy'), lap.hr != null ? `${lap.hr} bpm` : '—'],
  ] : []
  return (
    <div>
      <ChartTitle title={tx('pl.sheet.intensity', 'Profil d’intensité')} meta={meta} />
      <ZoneBars
        height={height}
        active={active}
        onPick={pick}
        onHoverFrac={onCursor ? (f => { if (sel == null) onCursor(f) }) : undefined}
        bars={bars.map((b, i) => ({ zone: b.zone, weight: b.weight, heightPct: b.heightPct, aria: `${tx('pl.sheet.lap', 'Tour {n}', { n: i + 1 })} · Z${b.zone} · ${b.label}` }))}
      />
      {lap && lapBar ? (
        <DetailRow dot={zColor(lapBar.zone)} title={`${single ? tx('pl.sheet.wholeSession', 'Séance entière') : tx('pl.sheet.lap', 'Tour {n}', { n: (active ?? 0) + 1 })} · Z${lapBar.zone}`} cells={cells} />
      ) : (
        !single && <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-dim)', fontFamily: FB }}>{tx('pl.sheet.tapLap', 'Touche une barre pour voir les valeurs du tour.')}</p>
      )}
      <ZoneLegend shares={shares} />
    </div>
  )
}

// ── Profil d'intensité PRÉVU (séance non réalisée) ────────────────
export function PlannedIntensityProfile({ session, height = 96 }: { session: Session; height?: number }) {
  const tx = useTx()
  const refs = useAthleteRefs()
  const [sel, setSel] = useState<number | null>(null)
  const blocks = (session.blocks ?? []).filter(b => b.type !== 'circuit_header' || (b.label ?? '').trim())
  const bars = toBars(blocks as MBlock[])
  if (bars.length === 0) return null
  const total = bars.reduce((s, b) => s + Math.max(0, b.min), 0) || 1
  const byZone = new Map<number, number>()
  bars.forEach(b => byZone.set(b.zone, (byZone.get(b.zone) ?? 0) + Math.max(0, b.min)))
  const shares = [...byZone.entries()].sort((a, b) => a[0] - b[0]).map(([zone, w]) => ({ zone, pct: (w / total) * 100 }))
  const cur = sel != null ? bars[sel] : null
  return (
    <div>
      <ChartTitle title={tx('pl.sheet.intensityPlanned', 'Profil d’intensité prévu')} meta={formatHM(Math.round(total))} />
      <ZoneBars
        height={height}
        active={sel}
        onPick={i => setSel(s => (s === i ? null : i))}
        bars={bars.map(b => ({ zone: b.zone, weight: b.min, heightPct: barHeightPct(b, session.sport, refs), dim: b.recovery, aria: `Z${b.zone}${b.value ? ` · ${b.value}` : ''} · ${Math.round(b.min)} min` }))}
      />
      {cur ? (
        <DetailRow dot={zColor(cur.zone)} title={`Z${cur.zone}${cur.recovery ? ` · ${tx('pl.sheet.recovery', 'Récupération')}` : ''}`}
          cells={[
            [tx('plnp.field.duration', 'Durée'), cur.min >= 1 ? formatHM(Math.round(cur.min)) : `${Math.round(cur.min * 60)} s`],
            [tx('pl.sheet.target', 'Cible'), cur.value || '—'],
          ]} />
      ) : (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-dim)', fontFamily: FB }}>{tx('pl.sheet.tapBlock', 'Touche une barre pour voir le bloc.')}</p>
      )}
      <ZoneLegend shares={shares} />
    </div>
  )
}

// ── Profil altimétrique (curseur + bulle verre) ───────────────────
const BAND = 44 // bande réservée à la bulle, au-dessus de la courbe

export function ElevationProfile({ full, sport, cursor, onCursor, height = 140 }: {
  full: FullActivity; sport: string; height?: number
  cursor?: number | null; onCursor?: (frac: number | null) => void
}) {
  const tx = useTx()
  const plotRef = useRef<HTMLDivElement>(null)
  const samples = full.samples
  const eles = samples ? samples.map(s => s.ele).filter((e): e is number => e != null) : []
  const stats = useMemo(() => buildElevLapStats(full, sport), [full, sport])
  if (!samples || samples.length < 2 || eles.length < 2) return null
  const W = 600, PAD_T = 8, PAD_B = 4
  const lo = Math.min(...eles), hi = Math.max(...eles)
  const range = Math.max(10, hi - lo)
  const yOf = (e: number) => PAD_T + (1 - (e - lo) / range) * (height - PAD_T - PAD_B)
  const xOf = (i: number) => (i / (samples.length - 1)) * W
  let d = '', started = false
  samples.forEach((s, i) => {
    if (s.ele == null) return
    d += `${started ? 'L' : 'M'}${xOf(i).toFixed(1)},${yOf(s.ele).toFixed(1)}`
    started = true
  })
  const area = `${d}L${W},${height}L0,${height}Z`
  const totalKm = samples[samples.length - 1]?.dKm ?? (full.distanceM ? full.distanceM / 1000 : 0)
  const ticks: number[] = []
  if (totalKm > 0.5) {
    const raw = totalKm / 5
    const step = raw >= 5 ? Math.round(raw / 5) * 5 : raw >= 1 ? Math.round(raw) : raw >= 0.5 ? 0.5 : 0.25
    for (let k = step; k < totalKm - step * 0.35; k += step) ticks.push(Math.round(k * 100) / 100)
  }

  const frac = cursor != null ? Math.max(0, Math.min(1, cursor)) : null
  const idx = frac != null ? Math.round(frac * (samples.length - 1)) : null
  // Altitude au curseur : échantillon le plus proche ayant une altitude.
  let eleAt: number | null = null
  if (idx != null) {
    for (let k = 0; k < samples.length; k++) {
      const a = samples[idx - k]?.ele, b = samples[idx + k]?.ele
      if (a != null) { eleAt = a; break }
      if (b != null) { eleAt = b; break }
    }
  }
  const kmAt = idx != null ? samples[idx]?.dKm ?? null : null
  const lapIdx = frac != null ? stats.findIndex(l => frac >= l.f0 && frac <= l.f1) : -1
  const lap = lapIdx >= 0 ? stats[lapIdx] : null
  const isPower = sport === 'bike' || sport === 'elliptique'
  const lapBits: string[] = []
  if (lap && stats.length > 1) lapBits.push(tx('pl.sheet.lap', 'Tour {n}', { n: lapIdx + 1 }))
  if (lap) {
    if (isPower) { if (lap.watts != null) lapBits.push(`${Math.round(lap.watts)} W`) }
    else if (lap.paceS != null) lapBits.push(`${secToPace(lap.paceS)}${sport === 'swim' ? '/100m' : '/km'}`)
    if (lap.hr != null) lapBits.push(`${lap.hr} bpm`)
  }

  const fracFromEvent = (clientX: number): number | null => {
    const el = plotRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (r.width <= 0) return null
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width))
  }

  return (
    <div>
      <ChartTitle title={tx('w3g.act_elevation_profile', 'Profil altimétrique')} meta={full.elevM ? `+${full.elevM} m D+` : undefined} />
      <div style={{ position: 'relative', paddingTop: BAND }}>
        {/* Bande haute : résumé, ou bulle « verre » qui suit le curseur */}
        {frac != null && eleAt != null ? (
          <div role="status" style={{
            position: 'absolute', top: 2, left: `clamp(72px, ${frac * 100}%, calc(100% - 72px))`, transform: 'translateX(-50%)',
            padding: '5px 10px', borderRadius: 'var(--r-md)', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 2,
            background: 'var(--glass-bg)', backdropFilter: 'blur(14px) saturate(1.6)', WebkitBackdropFilter: 'blur(14px) saturate(1.6)',
            boxShadow: 'var(--shadow-card)', fontFamily: FB, textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', ...TNUM }}>
              {Math.round(eleAt)} m{kmAt != null ? <span style={{ color: 'var(--text-mid)', fontWeight: 600 }}> · {fmtNum(kmAt, 1)} km</span> : null}
            </div>
            {lapBits.length > 0 && <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-mid)', marginTop: 1, ...TNUM }}>{lapBits.join(' · ')}</div>}
          </div>
        ) : (
          <div style={{ position: 'absolute', top: 10, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', fontFamily: FB, ...TNUM, pointerEvents: 'none' }}>
            <span>{tx('pl.sheet.altMinMax', 'Min {lo} m · Max {hi} m', { lo: Math.round(lo), hi: Math.round(hi) })}</span>
            {onCursor && <span>{tx('pl.sheet.scrubHint', 'Glisse pour explorer')}</span>}
          </div>
        )}

        <div ref={plotRef}
          onPointerDown={onCursor ? (e => { const f = fracFromEvent(e.clientX); if (f != null) onCursor(f) }) : undefined}
          onPointerMove={onCursor ? (e => {
            if (e.pointerType !== 'mouse' && e.buttons === 0 && e.pressure === 0) return
            const f = fracFromEvent(e.clientX); if (f != null) onCursor(f)
          }) : undefined}
          onPointerLeave={onCursor ? (e => { if (e.pointerType === 'mouse') onCursor(null) }) : undefined}
          style={{ position: 'relative', height, touchAction: 'pan-y', cursor: onCursor ? 'crosshair' : undefined }}>
          <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
            <defs>
              <linearGradient id="thwElevGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[0, 0.5, 1].map(f => (
              <line key={f} x1={0} x2={W} y1={PAD_T + f * (height - PAD_T - PAD_B)} y2={PAD_T + f * (height - PAD_T - PAD_B)}
                stroke="var(--border)" strokeWidth={1} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
            ))}
            <path d={area} fill="url(#thwElevGrad2)" />
            <path d={d} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          {frac != null && (
            <>
              <span aria-hidden style={{ position: 'absolute', top: -BAND + 40, bottom: 0, left: `${frac * 100}%`, width: 1, background: 'var(--text)', opacity: 0.55, pointerEvents: 'none' }} />
              {eleAt != null && (
                <span aria-hidden style={{
                  position: 'absolute', left: `${frac * 100}%`, top: yOf(eleAt), width: 11, height: 11, marginLeft: -5.5, marginTop: -5.5,
                  borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 0 2.5px var(--bg-card)', pointerEvents: 'none',
                }} />
              )}
            </>
          )}
        </div>
        {/* Abscisse (km) */}
        <div style={{ position: 'relative', height: 16, marginTop: 4, fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', fontFamily: FB, ...TNUM }}>
          {ticks.map(k => (
            <span key={k} style={{ position: 'absolute', left: `${(k / totalKm) * 100}%`, transform: 'translateX(-50%)' }}>{fmtNum(k, k % 1 === 0 ? 0 : 1)}</span>
          ))}
          <span style={{ position: 'absolute', right: 0 }}>km</span>
        </div>
      </div>
    </div>
  )
}

// ── Prévu vs réalisé ──────────────────────────────────────────────
function devColor(ratio: number): string {
  const dv = Math.abs(ratio - 1)
  return dv <= 0.15 ? 'var(--success)' : dv <= 0.4 ? 'var(--charge-mid)' : 'var(--danger)'
}

/** État global (durée) : point + libellé. */
export function complianceOf(plannedMin: number, doneMin: number): { color: string; key: string; fb: string } {
  if (!(plannedMin > 0)) return { color: 'var(--success)', key: 'plnp.matchStatus.conforme', fb: 'Conforme' }
  const diff = (doneMin - plannedMin) / plannedMin
  if (Math.abs(diff) <= 0.15) return { color: 'var(--success)', key: 'plnp.matchStatus.conforme', fb: 'Conforme' }
  if (diff < 0) return { color: diff < -0.4 ? 'var(--danger)' : 'var(--charge-mid)', key: 'plnp.matchStatus.ecourtee', fb: 'Écourtée' }
  return { color: 'var(--charge-mid)', key: 'plnp.matchStatus.prolongee', fb: 'Prolongée' }
}

export function PlanVsDone({ planned, full, activity }: { planned: Session; full: FullActivity | null; activity: TrainingActivity }) {
  const tx = useTx()
  const sport = planned.sport
  const isSwim = sport === 'swim'
  const isPower = sport === 'bike' || sport === 'elliptique'
  const tg = plannedTargets(planned)
  const actMin = Math.round(activity.elapsedTime / 60)
  const fmtDist = (m: number) => isSwim ? `${Math.round(m)} m` : `${fmtNum(m / 1000, 1)} km`
  const unitPace = isSwim ? '/100m' : '/km'
  const actPace = full
    ? (isSwim ? (full.distanceM && full.distanceM > 25 && full.movingS > 0 ? full.movingS / (full.distanceM / 100) : null) : full.paceSKm)
    : null
  type Row = { k: string; label: string; prev: string; done: string; delta?: string; color?: string }
  const rows: Row[] = []
  const pct = (r: number) => `${r >= 1 ? '+' : '−'}${Math.round(Math.abs(r - 1) * 100)} %`
  if (planned.durationMin > 0) {
    const r = actMin / planned.durationMin
    rows.push({ k: 'time', label: tx('w3g.act_time', 'Durée'), prev: formatHM(planned.durationMin), done: formatHM(actMin), delta: pct(r), color: devColor(r) })
  }
  const dDone = full?.distanceM != null && full.distanceM > 0 ? full.distanceM : null
  if (tg.distM != null || dDone != null) {
    const r = tg.distM && dDone ? dDone / tg.distM : null
    rows.push({ k: 'dist', label: tx('w3g.act_distance', 'Distance'), prev: tg.distM != null ? fmtDist(tg.distM) : '—', done: dDone != null ? fmtDist(dDone) : '—', ...(r ? { delta: pct(r), color: devColor(r) } : {}) })
  }
  if (isPower) {
    if (tg.watts != null || full?.avgWatts != null) {
      const r = tg.watts && full?.avgWatts ? full.avgWatts / tg.watts : null
      rows.push({ k: 'pow', label: tx('w3g.act_power', 'Puissance'), prev: tg.watts != null ? `${tg.watts} W` : '—', done: full?.avgWatts != null ? `${full.avgWatts} W` : '—', ...(r ? { delta: pct(r), color: devColor(r) } : {}) })
    }
  } else if (tg.paceS != null || actPace != null) {
    const ds = tg.paceS != null && actPace != null ? Math.round(actPace - tg.paceS) : null
    rows.push({
      k: 'pace', label: tx('w3g.act_pace', 'Allure'),
      prev: tg.paceS != null ? `${secToPace(tg.paceS)}${unitPace}` : '—',
      done: actPace != null ? `${secToPace(actPace)}${unitPace}` : '—',
      ...(ds != null ? { delta: `${ds <= 0 ? '−' : '+'}${Math.abs(ds)} s`, color: devColor(actPace! / tg.paceS!) } : {}),
    })
  }
  if (tg.elevM != null || (full?.elevM != null && full.elevM > 0)) {
    rows.push({ k: 'elev', label: 'D+', prev: tg.elevM != null ? `${Math.round(tg.elevM)} m` : '—', done: full?.elevM != null ? `${full.elevM} m` : '—' })
  }
  if (planned.rpe != null || full?.rpe != null) {
    rows.push({ k: 'rpe', label: 'RPE', prev: planned.rpe != null ? String(planned.rpe) : '—', done: full?.rpe != null ? String(Math.round(full.rpe * 10) / 10) : '—' })
  }
  const head: CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textAlign: 'right', fontFamily: FB }
  return (
    <div style={{ fontFamily: FB }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto auto 64px', columnGap: 12, rowGap: 0, alignItems: 'center' }}>
        <span />
        <span style={head}>{tx('w3g.act_planned', 'Prévu')}</span>
        <span style={head}>{tx('w3g.act_realized', 'Réalisé')}</span>
        <span style={head}>{tx('pl.sheet.delta', 'Écart')}</span>
        {rows.map(r => (
          <RowCells key={r.k} r={r} />
        ))}
      </div>
    </div>
  )
}
function RowCells({ r }: { r: { label: string; prev: string; done: string; delta?: string; color?: string } }) {
  const cell: CSSProperties = { padding: '9px 0', borderTop: '1px solid var(--border)', whiteSpace: 'nowrap', ...TNUM }
  return (
    <>
      <span style={{ ...cell, fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>{r.label}</span>
      <span style={{ ...cell, fontSize: 14, fontWeight: 500, color: 'var(--text-mid)', textAlign: 'right' }}>{r.prev}</span>
      <span style={{ ...cell, fontSize: 14, fontWeight: 700, color: 'var(--text)', textAlign: 'right' }}>{r.done}</span>
      <span style={{ ...cell, fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
        {r.delta ? (<>{r.color && <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: r.color }} />}{r.delta}</>) : <span style={{ color: 'var(--text-dim)' }}>—</span>}
      </span>
    </>
  )
}

/** Squelette d'une carte de fiche (jamais de spinner). */
export function SheetSkeleton({ height }: { height: number }) {
  return (
    <div aria-hidden style={{ height, borderRadius: 'var(--r-lg)', background: 'var(--surface-chip, var(--bg-card2))', animation: 'askPulse 1.4s ease-in-out infinite' }}>
      <style>{'@keyframes askPulse{0%,100%{opacity:.55}50%{opacity:1}}@media (prefers-reduced-motion: reduce){[style*="askPulse"]{animation:none!important}}'}</style>
    </div>
  )
}
