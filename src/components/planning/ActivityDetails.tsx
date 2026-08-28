'use client'
// ══════════════════════════════════════════════════════════════════
// ActivityDetails — enrichissement des séances RÉALISÉES du planning.
//
//  • useActivityFull : charge l'activité complète (streams, D+, allure,
//    watts, FC, RPE) + le détail de force (workout_sessions) pour muscu,
//    boxe, hybrid et hyrox. La trace GPS vient des streams latlng, sinon
//    de summary_polyline (décodage Google polyline), sinon de raw_data.map.
//  • samples : séries RÉELLES rééchantillonnées et ALIGNÉES (temps, km,
//    altitude, vitesse, watts, position) — base du profil d'intensité
//    RÉALISÉ, du profil altimétrique et du curseur synchronisé sur la carte.
//  • CompareGrid / RealizedIntensityBars / ActivityElevation / ActivityMap /
//    StrengthDone : briques partagées popover + fiche coulissante.
//  • ActivityHoverPreview : popover desktop au survol d'une bulle réalisée.
//  • ActivityBubble : bulle grille au gabarit planifié, fond couleur sport.
//
// Règle streams (CLAUDE.md) : toujours `r.streams ?? r.raw_data?.streams`,
// avec null-safety (backfill partiel).
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { resolvePlanningUid } from '@/lib/planning/scope'
import { formatHM, matchStatus, normalizeSportType, ATHLETE, type Session, type TrainingActivity } from '@/app/planning/page'
import { sportKeyFromType, subSportIcon, SPORT_ICON, type SportKey } from '@/components/icons/SportIcon'
import { toBars, treadmillGainM, totalDistance, barHeightPct, type MBlock } from './mobile/blocks'
import { zColor, paceToSec, secToPace } from './mobile/editorial'
import { staticRouteMapUrl } from '@/lib/staticMap'
import { useAthleteRefs } from '@/hooks/useAthleteRefs'

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
/** Échantillon réel (séries alignées, ≤ 300 points). */
export interface ActSample {
  tS: number
  dKm: number
  ele: number | null
  vMs: number | null
  w: number | null
  ll: [number, number] | null
}
/** Tour (lap) — chaque appui sur la montre / le compteur. */
export interface ActLap {
  moving_time_s: number
  distance_m: number
  avg_speed_ms: number | null
  avg_watts: number | null
  avg_hr: number | null
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
  samples: ActSample[] | null
  laps: ActLap[]
  strength: StrengthDetail | null
}

export function isStrengthSport(sport: string): boolean {
  const k = sportKeyFromType(sport) ?? sport
  return k === 'muscu' || k === 'boxe' || k === 'hybrid' || k === 'hyrox' || sport === 'gym'
}

// ── Décodeur Google polyline (summary_polyline / raw_data.map) ────
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = []
  let lat = 0, lng = 0, i = 0
  while (i < encoded.length) {
    let b: number, shift = 0, result = 0
    do { b = encoded.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 32)
    lat += (result & 1) ? ~(result >> 1) : (result >> 1)
    shift = 0; result = 0
    do { b = encoded.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 32)
    lng += (result & 1) ? ~(result >> 1) : (result >> 1)
    points.push([lat / 1e5, lng / 1e5])
  }
  return points
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

// ── Références athlète (FTP / seuil course / CSS) — un fetch par session ──
interface AthleteRefsLite { ftp: number; runThr: number; css: number }
// Cache par utilisateur effectif (self OU athlète consulté par le coach) : sans
// clé par uid, les refs du coach « collaient » aux activités de l'athlète.
const refsCache: Record<string, AthleteRefsLite> = {}
const refsPromise: Record<string, Promise<AthleteRefsLite>> = {}
async function loadAthleteRefs(): Promise<AthleteRefsLite> {
  const sb = createClient()
  const uid = await resolvePlanningUid(sb)
  const key = uid ?? '_none'
  if (refsCache[key]) return refsCache[key]
  if (!refsPromise[key]) {
    refsPromise[key] = (async () => {
      const fallback: AthleteRefsLite = { ftp: ATHLETE.ftp, runThr: ATHLETE.thresholdPace, css: ATHLETE.css }
      if (!uid) return fallback
      try {
        const { data } = await sb.from('athlete_performance_profile')
          .select('ftp_watts,threshold_pace_s_km,css_s_100m')
          .eq('user_id', uid).maybeSingle()
        refsCache[key] = {
          ftp: Number(data?.ftp_watts) > 0 ? Number(data!.ftp_watts) : fallback.ftp,
          runThr: Number(data?.threshold_pace_s_km) > 0 ? Number(data!.threshold_pace_s_km) : fallback.runThr,
          css: Number(data?.css_s_100m) > 0 ? Number(data!.css_s_100m) : fallback.css,
        }
        return refsCache[key]
      } catch { return fallback }
    })()
  }
  return refsPromise[key]
}

/** Zone RÉALISÉE d'un échantillon (vitesse ou watts vs références athlète). */
function sampleZone(sport: string, vMs: number | null, w: number | null, refs: AthleteRefsLite): number | null {
  if (sport === 'bike' || sport === 'elliptique') {
    if (w == null || w <= 0) return null
    const f = refs.ftp
    if (w < f * 0.55) return 1; if (w < f * 0.75) return 2; if (w < f * 0.87) return 3
    if (w < f * 1.05) return 4; if (w < f * 1.20) return 5; if (w < f * 1.50) return 6; return 7
  }
  if (vMs == null || vMs <= 0.3) return null
  if (sport === 'swim') {
    const p = 100 / vMs, c = refs.css
    if (p > c * 1.25) return 1; if (p > c * 1.10) return 2; if (p > c * 1.00) return 3; if (p > c * 0.90) return 4; return 5
  }
  const p = 1000 / vMs, t = refs.runThr
  if (p > t * 1.25) return 1; if (p > t * 1.10) return 2; if (p > t * 1.00) return 3; if (p > t * 0.90) return 4; return 5
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
          .select('id,sport_type,user_id,started_at,moving_time_s,elapsed_time_s,distance_m,elevation_gain_m,avg_pace_s_km,avg_speed_ms,avg_watts,avg_hr,rpe,perceived_effort,calories,streams,laps,summary_polyline,raw_data')
          .eq('id', id).maybeSingle()
        if (!r || cancelled) return
        const rec = r as Record<string, unknown>
        const rawData = rec.raw_data as Record<string, unknown> | null
        const streams = ((rec.streams ?? rawData?.streams) ?? null) as Record<string, unknown> | null
        const distanceM = rec.distance_m != null ? Number(rec.distance_m) : null

        // Trace GPS : streams.latlng → summary_polyline → raw_data.map.polyline
        const rawLl = Array.isArray(streams?.latlng) ? (streams!.latlng as unknown[]) : []
        let latlng: [number, number][] = rawLl
          .filter((p): p is [number, number] => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]))
        const llFromStreams = latlng.length > 1
        if (!llFromStreams) {
          const poly = (rec.summary_polyline as string | null)
            || ((rawData?.map as Record<string, unknown> | undefined)?.polyline as string | undefined)
            || ((rawData?.map as Record<string, unknown> | undefined)?.summary_polyline as string | undefined)
            || ''
          if (poly) latlng = decodePolyline(poly)
        }

        // Séries alignées ≤ 300 points (temps, km, altitude, vitesse, watts, position).
        const num = (a: unknown): number[] => Array.isArray(a) ? (a as unknown[]).map(Number) : []
        const timeS = num(streams?.time)
        const distS = num(streams?.distance)
        const alt = num(streams?.altitude)
        const vel = num(streams?.velocity ?? streams?.velocity_smooth)
        const watts = num(streams?.watts)
        const N = Math.max(timeS.length, distS.length, alt.length, vel.length)
        let samples: ActSample[] | null = null
        if (N > 1) {
          const M = Math.min(300, N)
          const totalKm = distS.length ? (distS[distS.length - 1] ?? 0) / 1000 : (distanceM ?? 0) / 1000
          samples = Array.from({ length: M }, (_, k) => {
            const i = Math.min(N - 1, Math.round((k / (M - 1)) * (N - 1)))
            const dKm = Number.isFinite(distS[i]) ? distS[i] / 1000 : (totalKm * k) / (M - 1)
            let ll: [number, number] | null = null
            if (llFromStreams && latlng.length > 1) {
              ll = latlng[Math.min(latlng.length - 1, i)] ?? null
            } else if (latlng.length > 1 && totalKm > 0) {
              // Polyline non alignée sur les streams → position par fraction de distance.
              ll = latlng[Math.min(latlng.length - 1, Math.round((dKm / totalKm) * (latlng.length - 1)))] ?? null
            }
            return {
              tS: Number.isFinite(timeS[i]) ? timeS[i] : k,
              dKm,
              ele: Number.isFinite(alt[i]) ? alt[i] : null,
              vMs: Number.isFinite(vel[i]) ? vel[i] : null,
              w: Number.isFinite(watts[i]) ? watts[i] : null,
              ll,
            }
          })
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
        // Laps : chaque appui montre/compteur = 1 tour → 1 barre du profil.
        const rawLaps = Array.isArray(rec.laps) ? (rec.laps as Record<string, unknown>[]) : []
        const laps: ActLap[] = rawLaps
          .map(l => ({
            moving_time_s: Number(l.moving_time_s ?? l.elapsed_time_s ?? 0),
            distance_m: Number(l.distance_m ?? 0),
            avg_speed_ms: l.avg_speed_ms != null ? Number(l.avg_speed_ms) : null,
            avg_watts: l.avg_watts != null ? Number(l.avg_watts) : null,
            avg_hr: l.avg_hr != null ? Number(l.avg_hr) : null,
          }))
          .filter(l => l.moving_time_s > 0)
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
          samples,
          laps,
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
  const blocksDistM = totalDistance((session.blocks ?? []) as MBlock[], sport)
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
  const { t: tr } = useI18n()
  const sport = planned.sport
  const isSwim = sport === 'swim'
  const isPower = sport === 'bike' || sport === 'elliptique'
  const t = plannedTargets(planned)
  const actMin = Math.round(activity.elapsedTime / 60)
  const st = matchStatus(planned.durationMin, actMin)
  const fmtDist = (m: number) => isSwim ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`
  const fmtPace = (s: number) => isSwim ? `${secToPace(s)}/100m` : `${secToPace(s)}/km`
  const actPace = full
    ? (isSwim
        ? (full.distanceM && full.distanceM > 25 && full.movingS > 0 ? full.movingS / (full.distanceM / 100) : null)
        : full.paceSKm)
    : null
  const rows: { label: string; prev: string; done: string; color?: string }[] = []
  rows.push({ label: tr('w3g.act_time'), prev: formatHM(planned.durationMin), done: formatHM(actMin), color: st.color })
  if (t.distM != null || (full?.distanceM != null && full.distanceM > 0)) rows.push({
    label: tr('w3g.act_distance'),
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
      label: tr('w3g.act_power'),
      prev: t.watts != null ? `${t.watts} W` : '—',
      done: full?.avgWatts != null ? `${full.avgWatts} W` : '—',
    })
  } else if (t.paceS != null || actPace != null) rows.push({
    label: tr('w3g.act_pace'),
    prev: t.paceS != null ? fmtPace(t.paceS) : '—',
    done: actPace != null ? fmtPace(actPace) : '—',
  })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: dense ? 3 : 5 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: dense ? '2px 10px' : '3px 12px', alignItems: 'baseline' }}>
        <span />
        <span style={{ ...rowLbl, fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tr('w3g.act_planned')}</span>
        <span style={{ ...rowLbl, fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tr('w3g.act_realized')}</span>
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

/** Profil d'intensité PLANIFIÉ (repli quand l'activité n'a pas de streams). */
export function PlannedIntensityBars({ session, height = 56 }: { session: Session; height?: number }) {
  const { t } = useI18n()
  const refs = useAthleteRefs()
  const blocks = (session.blocks ?? []).filter(b => b.type !== 'circuit_header' || (b.label ?? '').trim())
  const bars = toBars(blocks as MBlock[])
  if (bars.length === 0) return null
  return (
    <div>
      <p style={sectionLabel}>{t('w3g.act_intensity_planned')}</p>
      <div style={{ height, display: 'flex', alignItems: 'flex-end', gap: 1.5, borderBottom: '1px solid var(--border)' }}>
        {bars.map(bar => (
          <div key={bar.id} title={`Z${bar.zone}${bar.value ? ` · ${bar.value}` : ''} · ${Math.round(bar.min)}min`}
            style={{
              flexGrow: Math.max(1, bar.min), flexBasis: 0, minWidth: 2,
              height: `${barHeightPct(bar, session.sport, refs)}%`,
              background: zColor(bar.zone), opacity: bar.recovery ? 0.5 : 1,
              borderRadius: '2px 2px 0 0',
            }} />
        ))}
      </div>
    </div>
  )
}

interface LapBar { zone: number; label: string; weight: number; heightPct: number; f0: number; f1: number }

/** Hauteur CONTINUE (%) d'un lap : intensité rapportée au seuil → 12 %…100 %. */
function lapHeightPct(sport: string, vMs: number | null, w: number | null, refs: AthleteRefsLite): number {
  let ratio: number | null = null
  if (sport === 'bike' || sport === 'elliptique') ratio = w != null && w > 0 ? w / refs.ftp : null
  else if (vMs != null && vMs > 0.3) ratio = sport === 'swim' ? refs.css / (100 / vMs) : refs.runThr / (1000 / vMs)
  if (ratio == null) return 45
  // Z1 ≈ 0,70 · seuil ≈ 1,00 · Z5 ≈ 1,15 → échelle 0,55‥1,20 mappée 12‥100 %.
  return Math.max(12, Math.min(100, ((ratio - 0.55) / (1.20 - 0.55)) * 100))
}

/** Une barre par LAP (appui montre/compteur) : largeur ∝ durée, hauteur ∝ intensité,
 *  couleur = zone. Sans lap (ou un seul) → un unique bloc sur toute la séance. */
function buildLapBars(full: FullActivity, sport: string, refs: AthleteRefsLite): LapBar[] {
  const laps = full.laps
  const paceLabel = (vMs: number | null, w: number | null) =>
    (sport === 'bike' || sport === 'elliptique') ? (w != null ? `${Math.round(w)} W` : '—')
      : vMs != null && vMs > 0.3 ? (sport === 'swim' ? `${secToPace(100 / vMs)}/100m` : `${secToPace(1000 / vMs)}/km`) : '—'

  let items: { weight: number; vMs: number | null; w: number | null }[]
  if (laps.length > 1) {
    items = laps.map(l => ({
      weight: l.moving_time_s,
      vMs: l.avg_speed_ms ?? (l.distance_m > 0 && l.moving_time_s > 0 ? l.distance_m / l.moving_time_s : null),
      w: l.avg_watts,
    }))
  } else {
    // Aucun tour → un seul bloc entier (moyenne de la séance).
    const vMs = full.distanceM && full.distanceM > 100 && full.movingS > 0 ? full.distanceM / full.movingS : null
    items = [{ weight: Math.max(1, full.movingS), vMs, w: full.avgWatts }]
  }
  const total = items.reduce((s, it) => s + it.weight, 0) || 1
  let acc = 0
  return items.map(it => {
    const f0 = acc / total; acc += it.weight; const f1 = acc / total
    return {
      zone: sampleZone(sport, it.vMs, it.w, refs) ?? 1,
      label: paceLabel(it.vMs, it.w),
      weight: it.weight,
      heightPct: lapHeightPct(sport, it.vMs, it.w, refs),
      f0, f1,
    }
  })
}

/** Profil d'intensité RÉALISÉ (par tours). Survol → onHover(fraction 0…1 du temps). */
export function RealizedIntensityBars({ full, sport, height = 56, cursor, onHover, titleSuffix }: {
  full: FullActivity; sport: string; height?: number
  cursor?: number | null; onHover?: (frac: number | null) => void
  titleSuffix?: string
}) {
  const { t } = useI18n()
  const [refs, setRefs] = useState<AthleteRefsLite | null>(null)
  useEffect(() => { let ok = true; void loadAthleteRefs().then(r => { if (ok) setRefs(r) }); return () => { ok = false } }, [])
  const r = refs ?? { ftp: ATHLETE.ftp, runThr: ATHLETE.thresholdPace, css: ATHLETE.css }
  // Besoin d'au moins des laps OU une moyenne exploitable.
  if (full.laps.length === 0 && !(full.distanceM && full.distanceM > 100) && full.avgWatts == null) return null
  const bars = buildLapBars(full, sport, r)
  if (bars.length === 0) return null
  const single = full.laps.length <= 1
  return (
    <div>
      <p style={sectionLabel}>{t('w3g.act_intensity_realized')}{titleSuffix ? ` ${titleSuffix}` : ''}{single ? ` · ${t('w3g.act_continuous_session')}` : ` · ${t('w3g.act_laps_count', { n: full.laps.length })}`}</p>
      <div
        onMouseMove={onHover ? (e => {
          const rect = e.currentTarget.getBoundingClientRect()
          onHover(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)))
        }) : undefined}
        onMouseLeave={onHover ? (() => onHover(null)) : undefined}
        style={{ height, display: 'flex', alignItems: 'flex-end', gap: 2, borderBottom: '1px solid var(--border)', cursor: onHover ? 'crosshair' : undefined }}>
        {bars.map((bar, i) => {
          const active = cursor != null && cursor >= bar.f0 && cursor <= bar.f1
          return (
            <div key={i} title={`Z${bar.zone} · ${bar.label}`}
              style={{
                flexGrow: Math.max(1, bar.weight), flexBasis: 0, minWidth: 2,
                height: `${bar.heightPct}%`,
                background: zColor(bar.zone),
                opacity: cursor == null ? 1 : active ? 1 : 0.4,
                borderRadius: '2px 2px 0 0',
              }} />
          )
        })}
      </div>
    </div>
  )
}

/** Profil altimétrique RÉEL interactif : survol → onHover(fraction 0…1). */
export function ActivityElevation({ full, height = 64, cursor, onHover, showTitle = true }: {
  full: FullActivity; height?: number
  cursor?: number | null; onHover?: (frac: number | null) => void
  showTitle?: boolean
}) {
  const { t } = useI18n()
  const samples = full.samples
  if (!samples || samples.length < 2) return null
  const pts = samples.map(s => s.ele).filter((e): e is number => e != null)
  if (pts.length < 2) return null
  const W = 600, PAD = 5
  const lo = Math.min(...pts), hi = Math.max(...pts)
  const range = Math.max(10, hi - lo)
  const X = (i: number) => (i / (samples.length - 1)) * W
  const Y = (e: number) => PAD + (1 - (e - lo) / range) * (height - PAD * 2)
  let d = '', started = false
  samples.forEach((s, i) => {
    if (s.ele == null) return
    d += `${started ? 'L' : 'M'} ${X(i).toFixed(1)} ${Y(s.ele).toFixed(1)} `
    started = true
  })
  const area = `${d} L ${W} ${height} L 0 ${height} Z`
  const cx = cursor != null ? Math.max(0, Math.min(1, cursor)) * W : null
  return (
    <div>
      {showTitle && <p style={sectionLabel}>{t('w3g.act_elevation_profile')}{full.elevM ? ` · +${full.elevM} m D+` : ''}</p>}
      <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none"
        onMouseMove={onHover ? (e => {
          const rect = e.currentTarget.getBoundingClientRect()
          onHover(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)))
        }) : undefined}
        onMouseLeave={onHover ? (() => onHover(null)) : undefined}
        style={{ display: 'block', cursor: onHover ? 'crosshair' : undefined }}>
        <path d={area} fill="var(--primary)" opacity={0.14} />
        <path d={d} fill="none" stroke="var(--primary)" strokeWidth={1.8} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {cx != null && (
          <line x1={cx} y1={0} x2={cx} y2={height} stroke="var(--text)" strokeWidth={1.2} vectorEffect="non-scaling-stroke" opacity={0.8} />
        )}
      </svg>
    </div>
  )
}

/** Position GPS à une fraction 0…1 du parcours (échantillons ~uniformes en temps). */
export function sampleLLAtFraction(full: FullActivity | null, frac: number | null): [number, number] | null {
  if (!full?.samples || frac == null) return null
  const i = Math.max(0, Math.min(full.samples.length - 1, Math.round(frac * (full.samples.length - 1))))
  return full.samples[i]?.ll ?? null
}

// ── Carte GPS (image Mapbox ou SVG) + curseur synchronisé ─────────
// Projection Mercator ajustée aux bornes du tracé — réplique le cadrage
// « auto » de l'API Static (padding identique) pour positionner le curseur.
function mercatorFit(points: [number, number][], w: number, h: number, pad: number) {
  const proj = (lat: number, lng: number) => ({
    x: (lng + 180) / 360,
    y: (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2)) / Math.PI) / 2,
  })
  const ps = points.map(p => proj(p[0], p[1]))
  const minX = Math.min(...ps.map(p => p.x)), maxX = Math.max(...ps.map(p => p.x))
  const minY = Math.min(...ps.map(p => p.y)), maxY = Math.max(...ps.map(p => p.y))
  const dx = maxX - minX || 1e-9, dy = maxY - minY || 1e-9
  const scale = Math.min((w - pad * 2) / dx, (h - pad * 2) / dy)
  const ox = (w - dx * scale) / 2, oy = (h - dy * scale) / 2
  return (lat: number, lng: number) => {
    const p = proj(lat, lng)
    return { x: ox + (p.x - minX) * scale, y: oy + (p.y - minY) * scale }
  }
}

export function ActivityMap({ latlng, width, height, color, cursorLL }: {
  latlng: [number, number][]; width: number; height: number; color?: string
  cursorLL?: [number, number] | null
}) {
  const { t } = useI18n()
  const pts = latlng.map(p => ({ lat: p[0], lng: p[1] }))
  const mapUrl = staticRouteMapUrl(pts, { width, height, pins: true, color })
  const fit = mercatorFit(latlng, width, height, 26)
  const cursor = cursorLL ? fit(cursorLL[0], cursorLL[1]) : null
  if (mapUrl) {
    return (
      <div style={{ position: 'relative', width, height }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mapUrl} alt={t('w3g.act_gps_trace')} width={width} height={height}
          style={{ display: 'block', width, height, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} />
        {cursor && (
          <span style={{
            position: 'absolute', left: cursor.x - 7, top: cursor.y - 7, width: 14, height: 14,
            borderRadius: '50%', background: color ?? 'var(--primary)', border: '2.5px solid var(--bg-card)',
            boxShadow: '0 1px 6px rgba(0,0,0,0.35)', pointerEvents: 'none',
          }} />
        )}
      </div>
    )
  }
  // Repli SVG sans token Mapbox — même projection, curseur exact.
  let d = ''
  latlng.forEach((p, i) => {
    const q = fit(p[0], p[1])
    d += `${i === 0 ? 'M' : 'L'}${q.x.toFixed(1)},${q.y.toFixed(1)}`
  })
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', background: 'var(--bg-alt)', borderRadius: 10 }}>
      <path d={d} fill="none" stroke="var(--bg-card)" strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
      <path d={d} fill="none" stroke={color ?? 'var(--primary)'} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {cursor && (
        <circle cx={cursor.x} cy={cursor.y} r={6} fill={color ?? 'var(--primary)'} stroke="var(--bg-card)" strokeWidth={2.5} />
      )}
    </svg>
  )
}

export function StrengthDone({ strength, dense }: { strength: StrengthDetail; dense?: boolean }) {
  const { t } = useI18n()
  const meta = [
    strength.sets != null ? t('w3g.act_sets_count', { n: strength.sets }) : '',
    strength.tonnageKg != null ? t('w3g.act_tonnage', { kg: strength.tonnageKg }) : '',
  ].filter(Boolean).join(' · ')
  return (
    <div>
      <p style={sectionLabel}>{t('w3g.act_exercises_done')}{meta ? <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}> · {meta}</span> : null}</p>
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
  const { t } = useI18n()
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
  const estH = 190 + (full?.latlng ? 130 : 0) + (full?.samples ? 90 : 0)
  const top = Math.max(8, Math.min(anchor.top, vh - estH - 8))
  const MAP_W = WIDTH - 24, MAP_H = 104

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
        <span style={{ fontSize: 7.5, fontWeight: 800, background: color, color: '#fff', padding: '2px 5px', borderRadius: 4, letterSpacing: '0.06em', flexShrink: 0 }}>{t('w3g.act_badge_realized')}</span>
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
            ? <PlannedBlocksListStrength planned={planned} />
            : null
      ) : (
        <>
          {/* Profil d'intensité RÉALISÉ (par tours) — repli sur le prévu */}
          {full && (full.laps.length > 0 || (full.distanceM ?? 0) > 100 || full.avgWatts != null)
            ? <div style={{ marginBottom: 10 }}><RealizedIntensityBars full={full} sport={sp} /></div>
            : planned
              ? <div style={{ marginBottom: 10 }}><PlannedIntensityBars session={planned} /></div>
              : null}
          {full?.latlng && (
            <div style={{ marginBottom: 10 }}>
              <p style={sectionLabel}>{t('w3g.act_gps_trace')}</p>
              <ActivityMap latlng={full.latlng} width={MAP_W} height={MAP_H} color={color.startsWith('#') ? color.slice(1) : undefined} />
            </div>
          )}
          <ActivityElevation full={full ?? { samples: null } as FullActivity} height={54} />
        </>
      )}
    </div>
  )
  return createPortal(node, document.body)
}

// Force sans détail workout_sessions : on liste au moins les exercices PRÉVUS.
function PlannedBlocksListStrength({ planned }: { planned: Session }) {
  const { t } = useI18n()
  const blocks = (planned.blocks ?? []).filter(b => (b.label ?? '').trim())
  if (!blocks.length) return null
  return (
    <div>
      <p style={sectionLabel}>{t('w3g.act_planned_session')}</p>
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
