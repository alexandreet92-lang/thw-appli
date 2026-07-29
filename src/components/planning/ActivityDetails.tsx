'use client'
// ══════════════════════════════════════════════════════════════════
// ActivityDetails — enrichissement des séances RÉALISÉES du planning.
//
//  • useActivityFull : charge l'activité complète (streams GPS/altitude,
//    D+, allure, watts, FC, RPE) + le détail de force (workout_sessions :
//    exercices / circuits réalisés) pour muscu, boxe, hybrid et hyrox.
//  • CompareGrid : prévu vs réalisé (temps, distance, D+, RPE, allure/watts).
//  • PlannedIntensityBars / ActivityMap / ActivityElevation / StrengthDone :
//    briques partagées entre la popover de survol et la fiche coulissante.
//  • ActivityHoverPreview : popover desktop au survol d'une bulle réalisée.
//  • ActivityBubble : bulle grille au gabarit des séances planifiées —
//    fond couleur du sport, titre/données/icône en blanc.
//
// Règle streams (CLAUDE.md) : toujours `r.streams ?? r.raw_data?.streams`,
// avec null-safety (backfill partiel).
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { formatHM, matchStatus, normalizeSportType, type Session, type TrainingActivity } from '@/app/planning/page'
import { sportKeyFromType, subSportIcon, SPORT_ICON, type SportKey } from '@/components/icons/SportIcon'
import { toBars, treadmillGainM, totalDistance, type MBlock } from './mobile/blocks'
import { zColor, paceToSec, secToPace } from './mobile/editorial'
import { barHeightPct } from './mobile/blocks'
import RouteElevationProfile from '@/components/gpx/RouteElevationProfile'
import { staticRouteMapUrl } from '@/lib/staticMap'

// ── Modèle ────────────────────────────────────────────────────────
export interface StrengthGroup {
  name: string
  meta: string          // « 4×8 @60kg » ou « 3 tours »
  items?: string[]      // exercices d'un circuit
}
export interface StrengthDetail {
  groups: StrengthGroup[]
  tonnageKg: number | null
  sets: number | null
}
export interface FullActivity {
  id: string
  distanceM: number | null
  elevM: number | null
  movingS: number
  paceSKm: number | null
  avgWatts: number | null
  avgHr: number | null
  rpe: number | null
  calories: number | null
  latlng: [number, number][] | null
  elevProfile: { distKm: number; ele: number }[] | null
  strength: StrengthDetail | null
}

export function isStrengthSport(sport: string): boolean {
  const k = sportKeyFromType(sport) ?? sport
  return k === 'muscu' || k === 'boxe' || k === 'hybrid' || k === 'hyrox' || sport === 'gym'
}

function downsampleProfile(pts: { distKm: number; ele: number }[], max = 220): { distKm: number; ele: number }[] {
  if (pts.length <= max) return pts
  const step = pts.length / max
  return Array.from({ length: max }, (_, i) => pts[Math.min(pts.length - 1, Math.round(i * step))])
}

function parseStrength(detail: unknown): StrengthDetail | null {
  const groups = Array.isArray(detail) ? (detail as Record<string, unknown>[]) : []
  if (!groups.length) return null
  let tonnage = 0, sets = 0
  const out: StrengthGroup[] = []
  const exoMeta = (e: Record<string, unknown>, mult = 1) => {
    const s = Number(e.sets ?? 0), r = Number(e.reps ?? 0), kg = Number(e.weightKg ?? e.weight ?? 0)
    const dist = Number(e.distanceM ?? e.meters ?? 0)
    if (s > 0 && r > 0) sets += s * mult
    if (s > 0 && r > 0 && kg > 0) tonnage += s * r * kg * mult
    const parts: string[] = []
    if (s > 0 && r > 0) parts.push(`${s}×${r}`)
    else if (r > 0) parts.push(`${r} reps`)
    if (kg > 0) parts.push(`@${kg}kg`)
    if (dist > 0) parts.push(`${dist}m`)
    if (typeof e.durationSec === 'number' && e.durationSec > 0) parts.push(`${Math.round(e.durationSec as number)}s`)
    return parts.join(' ')
  }
  for (const g of groups) {
    const nested = Array.isArray(g.circuitExercises) ? (g.circuitExercises as Record<string, unknown>[]) : null
    const rounds = Number(g.circuitRounds ?? g.emomMinutes ?? g.tabataRounds ?? 0)
    if (nested && nested.length) {
      out.push({
        name: String(g.name ?? 'Circuit'),
        meta: rounds > 0 ? `${rounds} tours` : `${nested.length} exos`,
        items: nested.map(e => [String(e.name ?? ''), exoMeta(e, Math.max(1, rounds))].filter(Boolean).join(' — ')),
      })
    } else {
      out.push({ name: String(g.name ?? 'Exercice'), meta: exoMeta(g) })
    }
  }
  return { groups: out, tonnageKg: tonnage > 0 ? Math.round(tonnage) : null, sets: sets > 0 ? sets : null }
}

// ── Chargement (cache module : un fetch par activité) ─────────────
const cache = new Map<string, FullActivity>()

export function useActivityFull(activity: TrainingActivity | null): FullActivity | null {
  const id = activity?.id ?? null
  const [full, setFull] = useState<FullActivity | null>(id ? cache.get(id) ?? null : null)
  useEffect(() => {
    if (!id) { setFull(null); return }
    const hit = cache.get(id)
    if (hit) { setFull(hit); return }
    let cancelled = false
    void (async () => {
      try {
        const sb = createClient()
        const { data: r } = await sb.from('activities')
          .select('id,sport_type,user_id,started_at,moving_time_s,elapsed_time_s,distance_m,elevation_gain_m,avg_pace_s_km,avg_speed_ms,avg_watts,avg_hr,rpe,perceived_effort,calories,streams,raw_data')
          .eq('id', id).maybeSingle()
        if (!r || cancelled) return
        const rec = r as Record<string, unknown>
        const streams = ((rec.streams ?? (rec.raw_data as Record<string, unknown> | null)?.streams) ?? null) as Record<string, unknown> | null
        const distanceM = rec.distance_m != null ? Number(rec.distance_m) : null
        // Trace GPS
        const rawLl = Array.isArray(streams?.latlng) ? (streams!.latlng as unknown[]) : []
        const latlng = rawLl
          .filter((p): p is [number, number] => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]))
        // Profil altimétrique réel (altitude + distance des streams)
        const alt = Array.isArray(streams?.altitude) ? (streams!.altitude as unknown[]).map(Number) : []
        const distS = Array.isArray(streams?.distance) ? (streams!.distance as unknown[]).map(Number) : []
        let elevProfile: { distKm: number; ele: number }[] | null = null
        if (alt.length > 1) {
          elevProfile = downsampleProfile(alt.map((ele, i) => ({
            distKm: Number.isFinite(distS[i]) ? distS[i] / 1000 : ((i / (alt.length - 1)) * (distanceM ?? 0)) / 1000,
            ele: Number.isFinite(ele) ? ele : 0,
          })))
        }
        // Force : exercices / circuits réellement faits (workout_sessions, ±3 h)
        let strength: StrengthDetail | null = null
        if (isStrengthSport(String(rec.sport_type ?? ''))) {
          const t0 = new Date(String(rec.started_at)).getTime()
          const { data: ws } = await sb.from('workout_sessions')
            .select('started_at,exercises_detail,total_volume_kg,sets_completed')
            .eq('user_id', String(rec.user_id))
            .gte('started_at', new Date(t0 - 3 * 3600_000).toISOString())
            .lte('started_at', new Date(t0 + 3 * 3600_000).toISOString())
            .not('exercises_detail', 'is', null)
          const best = (ws ?? [])
            .slice()
            .sort((a, b) => Math.abs(new Date(a.started_at).getTime() - t0) - Math.abs(new Date(b.started_at).getTime() - t0))[0]
          if (best) {
            strength = parseStrength(best.exercises_detail)
            if (strength) {
              if (strength.tonnageKg == null && best.total_volume_kg != null) strength.tonnageKg = Math.round(Number(best.total_volume_kg))
              if (strength.sets == null && best.sets_completed != null) strength.sets = Number(best.sets_completed)
            }
          }
        }
        const movingS = Number(rec.moving_time_s ?? rec.elapsed_time_s ?? 0)
        const built: FullActivity = {
          id,
          distanceM,
          elevM: rec.elevation_gain_m != null ? Math.round(Number(rec.elevation_gain_m)) : null,
          movingS,
          paceSKm: rec.avg_pace_s_km != null ? Number(rec.avg_pace_s_km)
            : (distanceM && distanceM > 100 && movingS > 0 ? movingS / (distanceM / 1000) : null),
          avgWatts: rec.avg_watts != null ? Math.round(Number(rec.avg_watts)) : null,
          avgHr: rec.avg_hr != null ? Math.round(Number(rec.avg_hr)) : null,
          rpe: rec.rpe != null ? Number(rec.rpe) : (rec.perceived_effort != null ? Number(rec.perceived_effort) : null),
          calories: rec.calories != null ? Number(rec.calories) : null,
          latlng: latlng.length > 1 ? latlng : null,
          elevProfile,
          strength,
        }
        cache.set(id, built)
        if (!cancelled) setFull(built)
      } catch { /* silencieux : la popover reste minimale */ }
    })()
    return () => { cancelled = true }
  }, [id])
  return full
}

// ── Cibles PRÉVUES d'une séance planifiée ─────────────────────────
export function plannedTargets(session: Session): {
  paceS: number | null; watts: number | null; distM: number | null; elevM: number | null
} {
  const sport = session.sport
  const bars = toBars((session.blocks ?? []) as MBlock[])
  const isPower = sport === 'bike' || sport === 'elliptique'
  let num = 0, den = 0
  for (const bar of bars) {
    if (!bar.min || bar.min <= 0) continue
    if (isPower) {
      const w = parseFloat(bar.value ?? '')
      if (isFinite(w) && w > 0) { num += w * bar.min; den += bar.min }
    } else {
      const p = paceToSec(bar.value ?? '')
      if (!isNaN(p) && p > 0) { num += p * bar.min; den += bar.min }
    }
  }
  const pd = session.parcoursData
  const blocksDistM = totalDistance((session.blocks ?? []) as MBlock[])
  const distM = pd?.distance != null ? pd.distance * 1000 : (blocksDistM > 0 ? blocksDistM : null)
  const isTreadmill = sport === 'run' && session.runningSub === 'treadmill'
  const elevM = pd?.elevation != null ? pd.elevation : (isTreadmill ? (treadmillGainM((session.blocks ?? []) as MBlock[]) || null) : null)
  return {
    paceS: !isPower && den > 0 ? num / den : null,
    watts: isPower && den > 0 ? Math.round(num / den) : null,
    distM, elevM,
  }
}

// ── Comparaison prévu / réalisé ───────────────────────────────────
const rowLbl: React.CSSProperties = { fontSize: 10, color: 'var(--text-dim)', fontWeight: 600 }
const rowVal: React.CSSProperties = { fontSize: 10.5, color: 'var(--text)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }

export function CompareGrid({ planned, full, activity, dense }: {
  planned: Session; full: FullActivity | null; activity: TrainingActivity; dense?: boolean
}) {
  const sport = planned.sport
  const isSwim = sport === 'swim'
  const isPower = sport === 'bike' || sport === 'elliptique'
  const t = plannedTargets(planned)
  const actMin = Math.round(activity.elapsedTime / 60)
  const st = matchStatus(planned.durationMin, actMin)
  const fmtDist = (m: number) => isSwim ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`
  const fmtPace = (s: number) => isSwim ? `${secToPace(s)}/100m` : `${secToPace(s)}/km`
  // Allure réalisée : natation → s/100m depuis temps/distance ; sinon s/km.
  const actPace = full
    ? (isSwim
        ? (full.distanceM && full.distanceM > 25 && full.movingS > 0 ? full.movingS / (full.distanceM / 100) : null)
        : full.paceSKm)
    : null
  const rows: { label: string; prev: string; done: string; color?: string }[] = []
  rows.push({ label: 'Temps', prev: formatHM(planned.durationMin), done: formatHM(actMin), color: st.color })
  if (t.distM != null || (full?.distanceM != null && full.distanceM > 0)) rows.push({
    label: 'Distance',
    prev: t.distM != null ? fmtDist(t.distM) : '—',
    done: full?.distanceM != null && full.distanceM > 0 ? fmtDist(full.distanceM) : '—',
  })
  if (t.elevM != null || (full?.elevM != null && full.elevM > 0)) rows.push({
    label: 'D+',
    prev: t.elevM != null ? `${Math.round(t.elevM)} m` : '—',
    done: full?.elevM != null ? `${full.elevM} m` : '—',
  })
  if (planned.rpe != null || full?.rpe != null) rows.push({
    label: 'RPE',
    prev: planned.rpe != null ? String(planned.rpe) : '—',
    done: full?.rpe != null ? String(Math.round(full.rpe * 10) / 10) : '—',
  })
  if (isPower) {
    if (t.watts != null || full?.avgWatts != null) rows.push({
      label: 'Puissance',
      prev: t.watts != null ? `${t.watts} W` : '—',
      done: full?.avgWatts != null ? `${full.avgWatts} W` : '—',
    })
  } else if (t.paceS != null || actPace != null) rows.push({
    label: 'Allure',
    prev: t.paceS != null ? fmtPace(t.paceS) : '—',
    done: actPace != null ? fmtPace(actPace) : '—',
  })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: dense ? 3 : 5 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: dense ? '2px 10px' : '3px 12px', alignItems: 'baseline' }}>
        <span />
        <span style={{ ...rowLbl, fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prévu</span>
        <span style={{ ...rowLbl, fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Réalisé</span>
        {rows.map(r => (
          <FragmentRow key={r.label} r={r} />
        ))}
      </div>
    </div>
  )
}
function FragmentRow({ r }: { r: { label: string; prev: string; done: string; color?: string } }) {
  return (
    <>
      <span style={rowLbl}>{r.label}</span>
      <span style={{ ...rowVal, color: 'var(--text-mid)', fontWeight: 600 }}>{r.prev}</span>
      <span style={{ ...rowVal, color: r.color ?? 'var(--text)' }}>{r.done}</span>
    </>
  )
}

// ── Briques visuelles partagées ───────────────────────────────────
const sectionLabel: React.CSSProperties = {
  margin: '0 0 5px', fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.06em', color: 'var(--text-dim)',
}

export function PlannedIntensityBars({ session, height = 56 }: { session: Session; height?: number }) {
  const blocks = (session.blocks ?? []).filter(b => b.type !== 'circuit_header' || (b.label ?? '').trim())
  const bars = toBars(blocks as MBlock[])
  if (bars.length === 0) return null
  return (
    <div>
      <p style={sectionLabel}>Profil d&apos;intensité</p>
      <div style={{ height, display: 'flex', alignItems: 'flex-end', gap: 1.5, borderBottom: '1px solid var(--border)' }}>
        {bars.map(bar => (
          <div key={bar.id} title={`Z${bar.zone}${bar.value ? ` · ${bar.value}` : ''} · ${Math.round(bar.min)}min`}
            style={{
              flexGrow: Math.max(1, bar.min), flexBasis: 0, minWidth: 2,
              height: `${barHeightPct(bar, session.sport)}%`,
              background: zColor(bar.zone), opacity: bar.recovery ? 0.5 : 1,
              borderRadius: '2px 2px 0 0',
            }} />
        ))}
      </div>
    </div>
  )
}

export function ActivityMap({ latlng, width, height, color }: {
  latlng: [number, number][]; width: number; height: number; color?: string
}) {
  const pts = latlng.map(p => ({ lat: p[0], lng: p[1] }))
  const mapUrl = staticRouteMapUrl(pts, { width, height, pins: true, color })
  if (mapUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={mapUrl} alt="Trace GPS" width={width} height={height}
      style={{ display: 'block', width, height, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} />
  }
  // Repli SVG sans token Mapbox
  const lats = pts.map(p => p.lat), lons = pts.map(p => p.lng)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const minLon = Math.min(...lons), maxLon = Math.max(...lons)
  const latR = maxLat - minLat || 0.001, lonR = maxLon - minLon || 0.001
  const lonScale = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180)
  const aspect = (lonR * lonScale) / latR
  const pad = 8
  let plotW = width - pad * 2, plotH = height - pad * 2
  if (aspect > plotW / plotH) plotH = plotW / aspect
  else plotW = plotH * aspect
  const ox = (width - plotW) / 2, oy = (height - plotH) / 2
  const d = pts.map((p, i) => {
    const x = ox + ((p.lng - minLon) / lonR) * plotW
    const y = oy + (1 - (p.lat - minLat) / latR) * plotH
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join('')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', background: 'var(--bg-alt)', borderRadius: 10 }}>
      <path d={d} fill="none" stroke="var(--bg-card)" strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
      <path d={d} fill="none" stroke={color ?? 'var(--primary)'} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function StrengthDone({ strength, dense }: { strength: StrengthDetail; dense?: boolean }) {
  const meta = [
    strength.sets != null ? `${strength.sets} séries` : '',
    strength.tonnageKg != null ? `${strength.tonnageKg} kg soulevés` : '',
  ].filter(Boolean).join(' · ')
  return (
    <div>
      <p style={sectionLabel}>Exercices réalisés{meta ? <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}> · {meta}</span> : null}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: dense ? 4 : 6, maxHeight: dense ? 150 : undefined, overflow: 'hidden' }}>
        {strength.groups.map((g, i) => (
          <div key={i}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 11.5, color: 'var(--text)', fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
              {g.meta && <span style={{ fontSize: 10.5, color: 'var(--text-mid)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{g.meta}</span>}
            </div>
            {g.items && g.items.length > 0 && (
              <div style={{ margin: '2px 0 0 10px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {g.items.map((it, k) => (
                  <span key={k} style={{ fontSize: 10, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Popover de survol (desktop) ───────────────────────────────────
const WIDTH = 262

export function ActivityHoverPreview({ activity, planned, anchor }: {
  activity: TrainingActivity; planned: Session | null; anchor: DOMRect
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const full = useActivityFull(activity)
  if (!mounted || typeof document === 'undefined') return null

  const sp = normalizeSportType(activity.sport)
  const key = sportKeyFromType(sp)
  const color = (key ? SPORT_ICON[key as SportKey]?.color : undefined) ?? 'var(--primary)'
  const strengthMode = isStrengthSport(sp)

  const vw = window.innerWidth, vh = window.innerHeight
  const fitsRight = anchor.right + 10 + WIDTH <= vw
  const left = fitsRight ? anchor.right + 10 : Math.max(8, anchor.left - WIDTH - 10)
  const estH = 190 + (full?.latlng ? 130 : 0) + (full?.elevProfile ? 90 : 0)
  const top = Math.max(8, Math.min(anchor.top, vh - estH - 8))
  const MAP_W = WIDTH - 24, MAP_H = 104

  // Sans séance planifiée associée : infos réalisées seules.
  const actMin = Math.round(activity.elapsedTime / 60)
  const infos: string[] = [formatHM(actMin)]
  if (full?.distanceM && full.distanceM > 100) infos.push(`${(full.distanceM / 1000).toFixed(1).replace('.', ',')} km`)
  if (full?.elevM) infos.push(`${full.elevM} m D+`)
  if (full?.rpe != null) infos.push(`RPE ${Math.round(full.rpe * 10) / 10}`)
  if (full?.avgHr != null) infos.push(`${full.avgHr} bpm`)

  const node = (
    <div data-testid="activity-hover-preview" style={{
      position: 'fixed', left, top, width: WIDTH, zIndex: 3000,
      pointerEvents: 'none',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 12,
      boxShadow: 'var(--shadow-card)',
      maxHeight: '80vh', overflow: 'hidden',
      animation: 'ahpIn .16s ease-out forwards',
    }}>
      <style>{`@keyframes ahpIn { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* Titre + badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 7.5, fontWeight: 800, background: color, color: '#fff', padding: '2px 5px', borderRadius: 4, letterSpacing: '0.06em', flexShrink: 0 }}>RÉALISÉ</span>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {planned?.title || activity.name}
        </p>
      </div>

      {/* Comparaison prévu / réalisé — sinon infos réalisées */}
      {planned ? (
        <div style={{ margin: '6px 0 9px' }}>
          <CompareGrid planned={planned} full={full} activity={activity} dense />
        </div>
      ) : (
        <p style={{ margin: '0 0 9px', fontSize: 10.5, color: 'var(--text-mid)', fontVariantNumeric: 'tabular-nums' }}>{infos.join(' · ')}</p>
      )}

      {/* Muscu / boxe / hybrid : exercices & circuits faits — pas de profil ni carte */}
      {strengthMode ? (
        full?.strength
          ? <StrengthDone strength={full.strength} dense />
          : planned && (planned.blocks ?? []).length > 0
            ? <PlannedIntensityBarsFallbackStrength planned={planned} />
            : null
      ) : (
        <>
          {planned && <div style={{ marginBottom: (full?.latlng || full?.elevProfile) ? 10 : 0 }}><PlannedIntensityBars session={planned} /></div>}
          {full?.latlng && (
            <div style={{ marginBottom: full?.elevProfile ? 10 : 0 }}>
              <p style={sectionLabel}>Trace GPS</p>
              <ActivityMap latlng={full.latlng} width={MAP_W} height={MAP_H} color={color.startsWith('#') ? color.slice(1) : undefined} />
            </div>
          )}
          {full?.elevProfile && (
            <div>
              <p style={sectionLabel}>Profil altimétrique{full.elevM ? ` · +${full.elevM} m D+` : ''}</p>
              <RouteElevationProfile profile={full.elevProfile} totalKm={full.distanceM ? full.distanceM / 1000 : undefined}
                totalGainM={full.elevM ?? undefined} height={54} staticMode />
            </div>
          )}
        </>
      )}
    </div>
  )
  return createPortal(node, document.body)
}

// Force sans détail workout_sessions : on liste au moins les exercices PRÉVUS.
function PlannedIntensityBarsFallbackStrength({ planned }: { planned: Session }) {
  const blocks = (planned.blocks ?? []).filter(b => (b.label ?? '').trim())
  if (!blocks.length) return null
  return (
    <div>
      <p style={sectionLabel}>Séance prévue</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 130, overflow: 'hidden' }}>
        {blocks.slice(0, 10).map((b, i) => (
          <span key={i} style={{ fontSize: 10.5, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.label}</span>
        ))}
      </div>
    </div>
  )
}

// ── Bulle de séance RÉALISÉE (grille planning) ────────────────────
// Même gabarit que la bulle planifiée, mais fond à la couleur du sport et
// titre / données / icône en BLANC. Survol desktop → ActivityHoverPreview.
export function ActivityBubble({ activity, planned, onClick }: {
  activity: TrainingActivity; planned: Session | null; onClick?: () => void
}) {
  const [tip, setTip] = useState<DOMRect | null>(null)
  const sp = normalizeSportType(activity.sport)
  const key = sportKeyFromType(sp)
  const cfg = key ? SPORT_ICON[key as SportKey] : null
  const color = cfg?.color ?? 'var(--text-mid)'
  const Ico = subSportIcon(planned?.cyclingSub ?? planned?.runningSub) ?? cfg?.Icon
  const actMin = Math.round(activity.elapsedTime / 60)
  const rpe = planned?.vRpe != null ? Number(planned.vRpe) : undefined
  return (
    <>
      <button onClick={onClick}
        onMouseEnter={e => setTip(e.currentTarget.getBoundingClientRect())} onMouseLeave={() => setTip(null)}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 2, padding: '4px 6px',
          borderRadius: 8, border: 'none', background: color, cursor: 'pointer', width: '100%',
          boxSizing: 'border-box', position: 'relative',
        }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, minWidth: 0 }}>
          {Ico ? <span style={{ flexShrink: 0, marginTop: 1, display: 'flex' }}><Ico size={13} color="#fff" stroke={2.2} /></span> : <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', flexShrink: 0, marginTop: 3 }} />}
          <span style={{ flex: 1, minWidth: 0, fontSize: 9.5, fontWeight: 700, lineHeight: 1.18, color: '#fff', textAlign: 'left', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
            {planned?.title || activity.name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, flexWrap: 'wrap' }}>
          <span className="tnum" style={{ fontSize: 9, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{formatHM(actMin)}</span>
          {rpe != null && <span className="tnum" style={{ fontSize: 8.5, fontWeight: 600, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>RPE {rpe}</span>}
        </div>
      </button>
      {tip && <ActivityHoverPreview activity={activity} planned={planned} anchor={tip} />}
    </>
  )
}
