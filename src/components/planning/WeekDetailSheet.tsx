'use client'
// ══════════════════════════════════════════════════════════════════
// WeekDetailSheet — feuille « Détail de la semaine » du planning.
//
//  • Portail sur <body> : voile plein écran fixe (z-index > 100, interactif)
//    → MobileTabBar.anyOverpageOpen() le détecte et MASQUE la barre à bulles.
//  • Données RÉELLES chargées pour la semaine affichée ET la précédente
//    (planned_sessions + activities) → navigation semaine ← → autonome,
//    comparaison S-1, aucun mock. États vides quand il n'y a rien.
//  • Contenu : respect du plan (focale), tuiles KPI (séances, volume avec
//    barres de progression, charge, SM · SN en chiffres neutres + points),
//    sports en chips, volume par jour (prévu fantôme vs réalisé, aujourd'hui
//    surligné, tap → séances du jour), liste des séances (tap → ouvrir),
//    répartition de l'intensité prévue / réalisée, comparaison S-1, et
//    « Analyser ma semaine avec l'IA ».
// ══════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { resolvePlanningUid } from '@/lib/planning/scope'
import { currentLocale } from '@/lib/i18n'
import {
  normalizeSportType, normalizeBlocks, isRestSession, matchActivity, countsInVolume, formatHM, getTodayIdx, getWeekStart, SPORT_LABEL,
  type Session, type TrainingActivity, type PlanVariant, type SportType,
} from '@/app/planning/page'
import { sportKeyFromType, SPORT_ICON, type SportKey } from '@/components/icons/SportIcon'
import { MSheet, SheetHeader, useIsMobile } from '@/components/ai/mobile/MobileKit'
import { M_SCROLL, M_CARD } from '@/app/calendar/components/mobileForm'
import { useTx, sportColorOf } from './ActivitySheetKit'
import { estSmSn, isoWeekNum, addDaysIso, plannedSplit, bandOfActivity, emptySplit, type BandSplit, type IntensityBand } from './weekStats'

const FB = 'var(--font-body)'
const TNUM: CSSProperties = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'zero' 0" }

interface ActRow extends TrainingActivity {
  smScore: number | null
  snScore: number | null
  band: IntensityBand | null
}
interface WeekData { sessions: Session[]; activities: ActRow[] }

interface SessRow {
  id: string; day_index: number; week_start: string; sport: string; title: string; time: string | null
  duration_min: number | null; tss: number | null; status: Session['status']; notes: string | null; rpe: number | null
  blocks: unknown; plan_variant: PlanVariant | null; intensity: string | null
  original_content: Record<string, unknown> | null; parcours_data: Session['parcoursData'] | null
  parcours_id: string | null; nutrition_data: Session['nutritionItems'] | null; validation_data: Record<string, unknown> | null
}
interface ActDbRow {
  id: string; sport_type: string | null; title: string | null; started_at: string
  moving_time_s: number | null; elapsed_time_s: number | null; distance_m: number | null; tss: number | null
  sm_score: number | null; sn_score: number | null; rpe: number | null; perceived_effort: number | null; intensity_factor: number | null
}

function mapSession(r: SessRow): Session {
  return {
    id: r.id, dayIndex: r.day_index, weekStart: r.week_start, sport: normalizeSportType(r.sport), title: r.title,
    time: r.time ?? '09:00', durationMin: r.duration_min ?? 0, tss: r.tss ?? undefined, status: r.status,
    notes: r.notes ?? undefined, rpe: r.rpe ?? undefined, blocks: normalizeBlocks(r.blocks), main: false,
    planVariant: r.plan_variant ?? 'A', intensity: r.intensity ?? null,
    originalContent: r.original_content ?? undefined, parcoursData: r.parcours_data ?? undefined,
    parcoursId: r.parcours_id ?? undefined, nutritionItems: r.nutrition_data ?? undefined,
    ...(r.validation_data ?? {}),
  }
}

function mapActivity(a: ActDbRow, fallbackName: string): ActRow {
  const d = new Date(a.started_at)
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
  const m = new Date(d); m.setDate(d.getDate() - dow)
  const ws = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(m.getDate()).padStart(2, '0')}`
  const num = (v: unknown): number | null => (v != null && Number.isFinite(Number(v)) ? Number(v) : null)
  return {
    id: a.id, sport: a.sport_type ?? 'run', name: a.title ?? fallbackName, startedAt: a.started_at,
    elapsedTime: a.moving_time_s ?? a.elapsed_time_s ?? 0, dayIndex: dow, weekStart: ws,
    distance: a.distance_m ?? undefined, startHour: d.getHours(), startMin: d.getMinutes(), tss: num(a.tss) ?? undefined,
    smScore: num(a.sm_score), snScore: num(a.sn_score),
    band: bandOfActivity(num(a.rpe) ?? num(a.perceived_effort), num(a.intensity_factor)),
  }
}

/** Charge la semaine ws et la précédente (une requête par table). */
function useWeekPair(ws: string | null, plan: PlanVariant, fallbackName: string, tick: number) {
  const [data, setData] = useState<Record<string, WeekData>>({})
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!ws) return
    let alive = true
    const prev = addDaysIso(ws, -7)
    const end = addDaysIso(ws, 7)
    setLoading(true)
    void (async () => {
      try {
        const sb = createClient()
        const uid = await resolvePlanningUid(sb)
        if (!alive) return
        if (!uid) { setData({ [prev]: { sessions: [], activities: [] }, [ws]: { sessions: [], activities: [] } }); return }
        const [s, a] = await Promise.all([
          sb.from('planned_sessions').select('*').eq('user_id', uid).in('week_start', [prev, ws]),
          sb.from('activities')
            .select('id,sport_type,title,started_at,moving_time_s,elapsed_time_s,distance_m,tss,sm_score,sn_score,rpe,perceived_effort,intensity_factor')
            .eq('user_id', uid)
            .gte('started_at', new Date(prev + 'T00:00:00').toISOString())
            .lt('started_at', new Date(end + 'T00:00:00').toISOString()),
        ])
        if (!alive) return
        const out: Record<string, WeekData> = { [prev]: { sessions: [], activities: [] }, [ws]: { sessions: [], activities: [] } }
        for (const r of ((s.data ?? []) as unknown as SessRow[])) {
          const sess = mapSession(r)
          if (sess.planVariant && sess.planVariant !== plan) continue
          if (isRestSession(sess)) continue
          out[r.week_start]?.sessions.push(sess)
        }
        for (const r of ((a.data ?? []) as unknown as ActDbRow[])) {
          const act = mapActivity(r, fallbackName)
          out[act.weekStart]?.activities.push(act)
        }
        setData(out)
      } catch { if (alive) setData(d => ({ ...d, [prev]: d[prev] ?? { sessions: [], activities: [] }, [ws]: d[ws] ?? { sessions: [], activities: [] } })) }
      finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [ws, plan, fallbackName, tick])
  return { data, loading }
}

interface WeekAgg {
  plannedN: number; doneN: number; matchedN: number
  plannedMin: number; doneMin: number
  tss: number; sm: number; sn: number; smPlanned: number; snPlanned: number; hasDoneSm: boolean
  perDayPlanned: number[]; perDayDone: number[]; perDayDoneBySport: Record<string, number>[]
  sports: { sport: SportType; planned: number; done: number; doneMin: number }[]
  splitPlanned: BandSplit; splitDone: BandSplit
  items: { day: number; kind: 'act' | 'sess'; act?: ActRow; sess?: Session; planned?: Session | null; min: number; sport: SportType; title: string; startMin: number }[]
}

function aggregate(w: WeekData | undefined): WeekAgg {
  const agg: WeekAgg = {
    plannedN: 0, doneN: 0, matchedN: 0, plannedMin: 0, doneMin: 0, tss: 0, sm: 0, sn: 0, smPlanned: 0, snPlanned: 0, hasDoneSm: false,
    perDayPlanned: [0, 0, 0, 0, 0, 0, 0], perDayDone: [0, 0, 0, 0, 0, 0, 0], perDayDoneBySport: Array.from({ length: 7 }, () => ({})),
    sports: [], splitPlanned: emptySplit(), splitDone: emptySplit(), items: [],
  }
  if (!w) return agg
  const bySport = new Map<SportType, { planned: number; done: number; doneMin: number }>()
  const sp = (s: SportType) => { let x = bySport.get(s); if (!x) { x = { planned: 0, done: 0, doneMin: 0 }; bySport.set(s, x) } return x }
  const matched = new Set<string>()
  for (const a of w.activities) {
    const daySess = w.sessions.filter(s => s.dayIndex === a.dayIndex)
    const pl = matchActivity(a, daySess)
    if (pl) matched.add(pl.id)
    const sport = normalizeSportType(a.sport)
    const min = Math.round(a.elapsedTime / 60)
    agg.items.push({ day: a.dayIndex, kind: 'act', act: a, planned: pl, min, sport: pl?.sport ?? sport, title: a.name || pl?.title || '', startMin: a.startHour * 60 + a.startMin })
    if (!countsInVolume(sport)) continue
    agg.doneN++
    agg.doneMin += min
    agg.perDayDone[a.dayIndex] += min
    const bs = agg.perDayDoneBySport[a.dayIndex]; bs[sport] = (bs[sport] ?? 0) + min
    agg.tss += a.tss ?? 0
    if (a.smScore != null) { agg.sm += a.smScore; agg.hasDoneSm = true }
    if (a.snScore != null) { agg.sn += a.snScore; agg.hasDoneSm = true }
    if (a.band) agg.splitDone[a.band] += min
    else if (pl) plannedSplit(pl.blocks, min, agg.splitDone)
    else agg.splitDone.unknown += min
    const x = sp(sport); x.done++; x.doneMin += min
  }
  for (const s of w.sessions) {
    const isDone = matched.has(s.id) || s.status === 'done'
    if (!matched.has(s.id)) {
      const [hh, mm] = (s.time ?? '09:00').split(':').map(n => parseInt(n, 10) || 0)
      agg.items.push({ day: s.dayIndex, kind: 'sess', sess: s, min: s.durationMin, sport: s.sport, title: s.title, startMin: hh * 60 + mm })
    }
    if (!countsInVolume(s.sport)) continue
    agg.plannedN++
    if (isDone) agg.matchedN++
    agg.plannedMin += s.durationMin
    agg.perDayPlanned[s.dayIndex] += s.durationMin
    const e = estSmSn(s.blocks, s.durationMin); agg.smPlanned += e.sm; agg.snPlanned += e.sn
    plannedSplit(s.blocks, s.durationMin, agg.splitPlanned)
    sp(s.sport).planned++
  }
  agg.items.sort((a, b) => a.day - b.day || a.startMin - b.startMin)
  agg.sports = [...bySport.entries()].map(([sport, v]) => ({ sport, ...v })).sort((a, b) => (b.doneMin - a.doneMin) || (b.planned - a.planned))
  return agg
}

// ── UI ────────────────────────────────────────────────────────────
function Card({ title, right, children, style }: { title?: string; right?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <section style={{ ...M_CARD, ...style }}>
      {(title || right) && (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
          {title && <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: FB }}>{title}</h3>}
          {right}
        </div>
      )}
      {children}
    </section>
  )
}

function Progress({ value, color = 'var(--primary)' }: { value: number; color?: string }) {
  const [w, setW] = useState(0)
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setW(value); return }
    const r = requestAnimationFrame(() => setW(value))
    return () => cancelAnimationFrame(r)
  }, [value])
  return (
    <div aria-hidden style={{ height: 6, borderRadius: 'var(--r-pill)', background: 'var(--surface-chip, var(--bg-card2))', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, w))}%`, background: color, borderRadius: 'var(--r-pill)', transition: 'width .9s cubic-bezier(.22,1,.36,1)' }} />
    </div>
  )
}

function Tile({ label, value, sub, children }: { label: string; value: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div style={{ background: 'var(--surface-chip, var(--bg-card2))', borderRadius: 'var(--r-md)', padding: '11px 12px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', fontFamily: FB, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <span style={{ fontSize: 19, fontWeight: 700, color: 'var(--text)', fontFamily: FB, lineHeight: 1.1, whiteSpace: 'nowrap', ...TNUM }}>{value}</span>
      {sub && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-dim)', fontFamily: FB, ...TNUM }}>{sub}</span>}
      {children}
    </div>
  )
}

function Delta({ cur, prev, fmt }: { cur: number; prev: number; fmt: (n: number) => string }) {
  const d = cur - prev
  if (prev === 0 && cur === 0) return <span style={{ color: 'var(--text-dim)' }}>—</span>
  const pct = prev > 0 ? Math.round((d / prev) * 100) : null
  const up = d > 0, flat = d === 0
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--text)', fontWeight: 700, ...TNUM }}>
      <span aria-hidden style={{ fontSize: 10, color: flat ? 'var(--text-dim)' : up ? 'var(--success)' : 'var(--charge-mid)' }}>{flat ? '●' : up ? '▲' : '▼'}</span>
      {up ? '+' : d < 0 ? '−' : ''}{fmt(Math.abs(d))}{pct != null && !flat ? <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}> ({up ? '+' : '−'}{Math.abs(pct)} %)</span> : null}
    </span>
  )
}

const BAND_COLOR: Record<IntensityBand | 'unknown', string> = {
  easy: 'var(--zone-2)', moderate: 'var(--zone-3)', hard: 'var(--zone-5)', unknown: 'var(--surface-bar, var(--border))',
}

function SplitBar({ label, split }: { label: string; split: BandSplit }) {
  const tot = split.easy + split.moderate + split.hard + split.unknown
  const parts = (['easy', 'moderate', 'hard', 'unknown'] as const).filter(k => split[k] > 0)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '64px minmax(0,1fr) 52px', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', fontFamily: FB }}>{label}</span>
      <div style={{ display: 'flex', gap: 2, height: 10, borderRadius: 'var(--r-pill)', overflow: 'hidden', background: tot === 0 ? 'var(--surface-chip, var(--bg-card2))' : 'transparent' }}>
        {tot > 0 && parts.map(k => (
          <span key={k} style={{ flexGrow: split[k], flexBasis: 0, background: BAND_COLOR[k] }} />
        ))}
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', fontFamily: FB, textAlign: 'right', ...TNUM }}>{tot > 0 ? formatHM(Math.round(tot)) : '—'}</span>
    </div>
  )
}

export interface WeekDetailSheetProps {
  weekStart: string | null
  plan: PlanVariant
  /** Change de semaine (flèches ← →). */
  onChangeWeek: (ws: string) => void
  onClose: () => void
  onOpenSession: (s: Session) => void
  onOpenActivity: (a: TrainingActivity) => void
  onAnalyzeAI: () => void
}

export default function WeekDetailSheet({ weekStart, plan, onChangeWeek, onClose, onOpenSession, onOpenActivity, onAnalyzeAI }: WeekDetailSheetProps) {
  const tx = useTx()
  const isMobile = useIsMobile()
  const [last, setLast] = useState<string | null>(weekStart)
  useEffect(() => { if (weekStart) setLast(weekStart) }, [weekStart])
  const ws = weekStart ?? last
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const h = () => setTick(t => t + 1)
    window.addEventListener('thw:sessions-changed', h)
    return () => window.removeEventListener('thw:sessions-changed', h)
  }, [])
  const fallbackName = tx('plnp.activityFallback', 'Activité')
  const { data } = useWeekPair(weekStart, plan, fallbackName, tick)
  const [day, setDay] = useState<number | null>(null)
  useEffect(() => { setDay(null) }, [ws])
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const cur = useMemo(() => aggregate(ws ? data[ws] : undefined), [data, ws])
  const prev = useMemo(() => aggregate(ws ? data[addDaysIso(ws, -7)] : undefined), [data, ws])
  if (!ws || !mounted) return null
  const loaded = !!data[ws]

  const loc = currentLocale()
  const dStart = new Date(ws + 'T00:00:00'), dEnd = new Date(addDaysIso(ws, 6) + 'T00:00:00')
  const sameMonth = dStart.getMonth() === dEnd.getMonth()
  const range = sameMonth
    ? `${dStart.getDate()}–${dEnd.toLocaleDateString(loc, { day: 'numeric', month: 'short' })}`
    : `${dStart.toLocaleDateString(loc, { day: 'numeric', month: 'short' })} – ${dEnd.toLocaleDateString(loc, { day: 'numeric', month: 'short' })}`
  const title = `${tx('plnp.week', 'Semaine')} ${isoWeekNum(ws)} · ${range}`
  const isCurrentWeek = ws === getWeekStart()
  const todayIdx = isCurrentWeek ? getTodayIdx() : -1
  const dayLetters = tx('plnp.dayLetters', 'L,M,M,J,V,S,D').split(',')
  const dayAbbrs = tx('plnp.dayAbbrs', 'Lun,Mar,Mer,Jeu,Ven,Sam,Dim').split(',')

  const compliance = cur.plannedN > 0 ? Math.round((cur.matchedN / cur.plannedN) * 100) : null
  const volPct = cur.plannedMin > 0 ? Math.round((cur.doneMin / cur.plannedMin) * 100) : null
  const empty = loaded && cur.plannedN === 0 && cur.doneN === 0 && cur.items.length === 0

  const arrowBtn: CSSProperties = {
    width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'var(--surface-chip, var(--bg-card2))', color: 'var(--text)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
  }
  const chevron = (dir: 'l' | 'r') => (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === 'l' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  )

  // ── Volume par jour (prévu fantôme vs réalisé) ──
  const GH = 116
  const maxDay = Math.max(1, ...cur.perDayPlanned, ...cur.perDayDone)
  const dayChart = (
    <div role="group" aria-label={tx('plnp.datas.volumeByDay', 'Volume par jour')} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
      {cur.perDayDone.map((done, i) => {
        const planned = cur.perDayPlanned[i]
        const sel = day === i
        const isToday = i === todayIdx
        const stacks = Object.entries(cur.perDayDoneBySport[i]).filter(([, m]) => m > 0)
        return (
          <button key={i} type="button" onClick={() => setDay(d => (d === i ? null : i))} aria-pressed={sel}
            aria-label={`${dayAbbrs[i] ?? ''} · ${formatHM(done)} / ${formatHM(planned)}`} data-no-fx
            style={{
              border: 'none', cursor: 'pointer', padding: '6px 0 4px', borderRadius: 'var(--r-md)', minWidth: 0,
              background: sel ? 'var(--primary-dim)' : isToday ? 'var(--surface-chip, var(--bg-card2))' : 'transparent',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, WebkitTapHighlightColor: 'transparent',
            }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', height: 12, fontFamily: FB, ...TNUM }}>{done > 0 ? formatHM(done) : planned > 0 ? formatHM(planned) : ''}</span>
            <div style={{ position: 'relative', width: '62%', maxWidth: 28, height: GH }}>
              {planned > 0 && (
                <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${(planned / maxDay) * 100}%`, borderRadius: '4px 4px 0 0', background: 'var(--surface-chip, var(--bg-card2))', boxShadow: 'inset 0 0 0 1.5px var(--border)' }} />
              )}
              {done > 0 && (
                <span style={{ position: 'absolute', left: 3, right: 3, bottom: 0, height: `${(done / maxDay) * 100}%`, display: 'flex', flexDirection: 'column-reverse', gap: 2, borderRadius: '4px 4px 0 0', overflow: 'hidden', transition: 'height .9s cubic-bezier(.22,1,.36,1)' }}>
                  {stacks.map(([sport, m]) => <span key={sport} style={{ flexGrow: m, flexBasis: 0, background: sportColorOf(sport) }} />)}
                </span>
              )}
              {planned === 0 && done === 0 && <span style={{ position: 'absolute', left: '50%', bottom: 0, width: 4, height: 4, marginLeft: -2, borderRadius: '50%', background: 'var(--border)' }} />}
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: FB, color: isToday ? 'var(--primary)' : sel ? 'var(--text)' : 'var(--text-mid)' }}>{dayLetters[i] ?? ''}</span>
          </button>
        )
      })}
    </div>
  )

  const listItems = day == null ? cur.items : cur.items.filter(it => it.day === day)
  const sessionList = listItems.length === 0 ? (
    <p style={{ margin: 0, fontSize: 14, color: 'var(--text-mid)', fontFamily: FB }}>
      {day == null ? tx('pl.week.noSessions', 'Aucune séance cette semaine.') : tx('pl.week.restDay', 'Jour de repos.')}
    </p>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {listItems.map((it, k) => {
        const k2 = sportKeyFromType(it.sport)
        const cfg = k2 ? SPORT_ICON[k2 as SportKey] : null
        const col = cfg?.color ?? 'var(--primary)'
        const Ico = cfg?.Icon
        const done = it.kind === 'act'
        const missed = !done && (isCurrentWeek ? it.day < todayIdx : ws < getWeekStart())
        const onTap = () => {
          if (it.kind === 'act' && it.act) onOpenActivity({ ...it.act, planned: it.planned ?? undefined })
          else if (it.sess) onOpenSession(it.sess)
        }
        return (
          <button key={`${it.kind}_${it.act?.id ?? it.sess?.id ?? k}`} type="button" onClick={onTap}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, padding: '8px 0', border: 'none', background: 'transparent',
              borderTop: k === 0 ? 'none' : '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: FB,
            }}>
            <span aria-hidden style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `color-mix(in srgb, ${col} 15%, transparent)` }}>
              {Ico ? <Ico size={20} color={col} stroke={2.1} /> : <span style={{ width: 8, height: 8, borderRadius: '50%', background: col }} />}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title || SPORT_LABEL[it.sport]}</span>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-mid)', marginTop: 1, ...TNUM }}>
                {dayAbbrs[it.day] ?? ''} · {formatHM(it.min)}{done && it.planned ? ` · ${tx('w3g.act_planned', 'Prévu')} ${formatHM(it.planned.durationMin)}` : ''}
              </span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', flexShrink: 0 }}>
              <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: done ? 'var(--success)' : missed ? 'var(--danger)' : 'var(--border-mid, var(--border))' }} />
              {done ? tx('plnp.done', 'Réalisé') : missed ? tx('pl.week.missed', 'Manquée') : tx('plnp.planned', 'Prévu')}
            </span>
          </button>
        )
      })}
    </div>
  )

  const skel = (h: number) => <div aria-hidden style={{ height: h, borderRadius: 'var(--r-lg)', background: 'var(--surface-chip, var(--bg-card2))', animation: 'wdsPulse 1.4s ease-in-out infinite' }} />

  const body = (
    <>
      <style>{'@keyframes wdsPulse{0%,100%{opacity:.55}50%{opacity:1}}@media (prefers-reduced-motion: reduce){[style*="wdsPulse"]{animation:none!important}}'}</style>
      {/* En-tête : semaine + navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 2px' }}>
        <button type="button" aria-label={tx('pl.week.prev', 'Semaine précédente')} onClick={() => onChangeWeek(addDaysIso(ws, -7))} style={arrowBtn}>{chevron('l')}</button>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h2>
          {isCurrentWeek && <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--primary)', fontFamily: FB }}>{tx('pl.week.thisWeek', 'Cette semaine')}</p>}
        </div>
        <button type="button" aria-label={tx('pl.week.next', 'Semaine suivante')} onClick={() => onChangeWeek(addDaysIso(ws, 7))} style={arrowBtn}>{chevron('r')}</button>
      </div>

      {!loaded ? (
        <>{skel(120)}{skel(150)}{skel(200)}</>
      ) : empty ? (
        <Card>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)', fontFamily: FB }}>{tx('pl.week.emptyTitle', 'Semaine vide')}</p>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-mid)', fontFamily: FB }}>{tx('pl.week.emptySub', 'Aucune séance prévue ni activité réalisée. Ajoute une séance depuis le planning.')}</p>
        </Card>
      ) : (
        <>
          {/* Focale : respect du plan */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', fontFamily: FB }}>{tx('pl.week.compliance', 'Respect du plan')}</p>
                <p style={{ margin: '2px 0 0', fontSize: 38, fontWeight: 600, color: 'var(--text)', fontFamily: FB, lineHeight: 1.05, ...TNUM }}>{compliance != null ? `${compliance} %` : '—'}</p>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-mid)', fontFamily: FB, textAlign: 'right', ...TNUM }}>
                {cur.plannedN > 0 ? tx('pl.week.complianceSub', '{done} séances sur {total}', { done: cur.matchedN, total: cur.plannedN }) : tx('pl.week.noPlan', 'Aucune séance prévue')}
              </p>
            </div>
            {compliance != null && <div style={{ marginTop: 12 }}><Progress value={compliance} /></div>}
          </Card>

          {/* KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            <Tile label={tx('pl.week.sessions', 'Séances réalisées')} value={<>{cur.doneN}<span style={{ color: 'var(--text-dim)', fontWeight: 600, fontSize: 15 }}> / {cur.plannedN}</span></>}>
              {cur.plannedN > 0 && <Progress value={(cur.doneN / cur.plannedN) * 100} />}
            </Tile>
            <Tile label={tx('pl.week.volume', 'Volume réalisé')} value={<>{formatHM(cur.doneMin)}<span style={{ color: 'var(--text-dim)', fontWeight: 600, fontSize: 15 }}> / {formatHM(cur.plannedMin)}</span></>}>
              {volPct != null && <Progress value={volPct} />}
            </Tile>
            <Tile label={tx('pl.week.load', 'Charge (TSS)')} value={cur.tss > 0 ? Math.round(cur.tss) : '—'}
              sub={prev.tss > 0 || cur.tss > 0 ? <Delta cur={Math.round(cur.tss)} prev={Math.round(prev.tss)} fmt={n => String(n)} /> : undefined} />
            <Tile label={cur.hasDoneSm ? 'SM · SN' : `SM · SN · ${tx('plnp.planned', 'Prévu').toLowerCase()}`}
              value={
                <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 12 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)' }} />{cur.hasDoneSm ? Math.round(cur.sm) : cur.smPlanned}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--zone-7)' }} />{cur.hasDoneSm ? Math.round(cur.sn) : cur.snPlanned}</span>
                </span>
              }
              sub={cur.hasDoneSm && (cur.smPlanned > 0 || cur.snPlanned > 0) ? `${tx('plnp.planned', 'Prévu')} ${cur.smPlanned} · ${cur.snPlanned}` : undefined} />
          </div>

          {/* Sports */}
          {cur.sports.length > 0 && (
            <Card title={tx('pl.week.bySport', 'Séances par sport')}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {cur.sports.map(s => {
                  const k2 = sportKeyFromType(s.sport)
                  const cfg = k2 ? SPORT_ICON[k2 as SportKey] : null
                  const col = cfg?.color ?? 'var(--primary)'
                  const Ico = cfg?.Icon
                  return (
                    <span key={s.sport} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 40, padding: '0 12px 0 6px', borderRadius: 'var(--r-pill)', background: 'var(--surface-chip, var(--bg-card2))', fontFamily: FB }}>
                      <span aria-hidden style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `color-mix(in srgb, ${col} 18%, transparent)` }}>
                        {Ico ? <Ico size={16} color={col} stroke={2.2} /> : <span style={{ width: 7, height: 7, borderRadius: '50%', background: col }} />}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', ...TNUM }}>{s.done}{s.planned > 0 ? <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>/{s.planned}</span> : null}</span>
                      {s.doneMin > 0 && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', ...TNUM }}>{formatHM(s.doneMin)}</span>}
                    </span>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Volume par jour */}
          <Card title={tx('pl.week.volumeByDay', 'Volume par jour')}
            right={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', fontFamily: FB }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span aria-hidden style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--surface-chip, var(--bg-card2))', boxShadow: 'inset 0 0 0 1.5px var(--border)' }} />{tx('plnp.planned', 'Prévu')}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span aria-hidden style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--text-mid)' }} />{tx('plnp.done', 'Réalisé')}</span>
            </span>}>
            {dayChart}
          </Card>

          {/* Séances de la semaine / du jour */}
          <Card title={day == null ? tx('pl.week.sessionsList', 'Séances de la semaine') : `${dayAbbrs[day] ?? ''} ${new Date(addDaysIso(ws, day) + 'T00:00:00').toLocaleDateString(loc, { day: 'numeric', month: 'short' })}`}
            right={day != null ? <button type="button" onClick={() => setDay(null)} style={{ border: 'none', background: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FB, padding: 0 }}>{tx('pl.week.allWeek', 'Toute la semaine')}</button> : undefined}>
            {sessionList}
          </Card>

          {/* Intensité */}
          <Card title={tx('pl.week.intensity', 'Répartition de l’intensité')}>
            {(cur.splitPlanned.easy + cur.splitPlanned.moderate + cur.splitPlanned.hard + cur.splitDone.easy + cur.splitDone.moderate + cur.splitDone.hard) === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-mid)', fontFamily: FB }}>{tx('pl.week.intensityEmpty', 'Pas encore de données d’intensité (zones des séances ou RPE des activités).')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <SplitBar label={tx('plnp.planned', 'Prévu')} split={cur.splitPlanned} />
                <SplitBar label={tx('plnp.done', 'Réalisé')} split={cur.splitDone} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 2 }}>
                  {([['easy', tx('pl.week.easy', 'Facile (Z1-Z2)')], ['moderate', tx('pl.week.moderate', 'Modéré (Z3)')], ['hard', tx('pl.week.hard', 'Difficile (Z4+)')], ['unknown', tx('pl.week.unknown', 'Non classé')]] as const)
                    .filter(([k]) => k !== 'unknown' || cur.splitDone.unknown + cur.splitPlanned.unknown > 0)
                    .map(([k, l]) => (
                      <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', fontFamily: FB }}>
                        <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: BAND_COLOR[k] }} />{l}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </Card>

          {/* Comparaison S-1 */}
          <Card title={tx('pl.week.vsPrev', 'Par rapport à la semaine {n}', { n: isoWeekNum(addDaysIso(ws, -7)) })}>
            {prev.doneN === 0 && prev.plannedN === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-mid)', fontFamily: FB }}>{tx('pl.week.vsPrevEmpty', 'Aucune donnée la semaine précédente.')}</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', rowGap: 10, columnGap: 12, fontFamily: FB, fontSize: 14 }}>
                <span style={{ color: 'var(--text-mid)', fontWeight: 600 }}>{tx('pl.week.volume', 'Volume réalisé')}</span>
                <Delta cur={cur.doneMin} prev={prev.doneMin} fmt={n => formatHM(n)} />
                <span style={{ color: 'var(--text-mid)', fontWeight: 600 }}>{tx('pl.week.load', 'Charge (TSS)')}</span>
                <Delta cur={Math.round(cur.tss)} prev={Math.round(prev.tss)} fmt={n => String(n)} />
                <span style={{ color: 'var(--text-mid)', fontWeight: 600 }}>{tx('pl.week.sessions', 'Séances réalisées')}</span>
                <Delta cur={cur.doneN} prev={prev.doneN} fmt={n => String(n)} />
              </div>
            )}
          </Card>

          {/* IA */}
          <button type="button" onClick={onAnalyzeAI} className="thw-press"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 52, width: '100%', border: 'none', cursor: 'pointer',
              borderRadius: 'var(--r-pill)', background: 'var(--ai-accent-dim)', color: 'var(--ai-accent)', fontSize: 16, fontWeight: 700, fontFamily: FB,
            }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/logo_4bras.png" alt="" width={22} height={22} style={{ objectFit: 'contain', display: 'block' }} />
            {tx('pl.week.analyzeAI', 'Analyser ma semaine avec l’IA')}
          </button>
        </>
      )}
    </>
  )

  if (isMobile) {
    return (
      <MSheet open={!!weekStart} onClose={onClose} label={title} zIndex={9000}>
        <SheetHeader leftLabel={tx('plnp.close', 'Fermer')} onLeft={onClose} title={tx('pl.week.sheetTitle', 'Détail de la semaine')} />
        <div style={M_SCROLL}>{body}</div>
      </MSheet>
    )
  }

  if (!weekStart) return null
  // Desktop : panneau centré, porté sur <body> (voile plein écran).
  return createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} role="presentation"
      style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'var(--scrim)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-label={title}
        style={{
          width: 'min(680px, 96vw)', maxHeight: '90vh', overflowY: 'auto', borderRadius: 'var(--r-lg)', background: 'var(--surface-page, var(--bg))',
          boxShadow: 'var(--shadow-float)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16, boxSizing: 'border-box', fontFamily: FB,
          animation: 'wdsPop .18s ease',
        }}>
        <style>{'@keyframes wdsPop{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}'}</style>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: -8 }}>
          <button type="button" onClick={onClose} aria-label={tx('plnp.close', 'Fermer')}
            style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'var(--surface-chip, var(--bg-card2))', color: 'var(--text-mid)', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
        {body}
      </div>
    </div>,
    document.body,
  )
}
