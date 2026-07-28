'use client'
// ══════════════════════════════════════════════════════════════════
// TwelveWeekVolume — volume sur 12 semaines, façon Strava mais en BLEU.
// Un graphique PAR SPORT (chips de sélection + vue « Tous ») : ligne + aire
// avec un point par semaine ; on fait glisser le doigt/la souris sur le
// graphique pour sélectionner une semaine → l'en-tête affiche les stats du
// sport pour CETTE semaine (métriques spécifiques par sport, cf. specs).
// SVG raw uniquement (zéro lib de chart), couleurs par tokens + bleu #3B82F6.
// Muscu/Hyrox/Boxe : détails (exercices, circuits, wall balls, rounds…) lus
// en best-effort dans workout_sessions ; « — » quand la donnée n'existe pas.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { currentLocale } from '@/lib/i18n'

const BLUE = '#3B82F6'

interface ActLike {
  sport_type: string
  started_at: string
  moving_time_s: number | null
  distance_m: number | null
  elevation_gain_m: number | null
  avg_hr: number | null
  avg_watts: number | null
  normalized_watts: number | null
  calories: number | null
}

type SportKey = 'all' | 'bike' | 'run' | 'trail' | 'swim' | 'gym' | 'hyrox' | 'boxe'

const SPORT_DEFS: { key: SportKey; label: string; types: string[] }[] = [
  { key: 'all',   label: 'Tous',        types: [] },
  { key: 'bike',  label: 'Vélo',        types: ['bike', 'virtual_bike'] },
  { key: 'run',   label: 'Course',      types: ['run'] },
  { key: 'trail', label: 'Trail',       types: ['trail_run'] },
  { key: 'swim',  label: 'Natation',    types: ['swim'] },
  { key: 'gym',   label: 'Muscu',       types: ['gym'] },
  { key: 'hyrox', label: 'Hyrox',       types: ['hyrox'] },
  { key: 'boxe',  label: 'Boxe',        types: ['boxe', 'boxing'] },
]

// Extras hebdo issus de workout_sessions (best-effort).
interface WeekExtras { exercises: number; circuits: number; wallBalls: number; ergM: number; rounds: number }

interface WeekAgg {
  monday: Date
  label: string           // « 13 – 19 juil. »
  count: number
  timeS: number
  distM: number
  dPlus: number
  kcal: number
  // moyennes pondérées par la durée
  wSum: number; wW: number
  npSum: number; npW: number
  hrSum: number; hrW: number
  extras: WeekExtras
}

function mondayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}
const fmtH = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min` }
const fmtPace = (secPerKm: number | null) => {
  if (secPerKm == null || !isFinite(secPerKm) || secPerKm <= 0) return '—'
  const m = Math.floor(secPerKm / 60), s = Math.round(secPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
const fmtSwimPace = (secPer100: number | null) => {
  if (secPer100 == null || !isFinite(secPer100) || secPer100 <= 0) return '—'
  const m = Math.floor(secPer100 / 60), s = Math.round(secPer100 % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

interface WsRow { started_at: string; sport: string | null; exercises_detail: unknown; calories: number | null }

export function TwelveWeekVolume({ activities }: { activities: ActLike[] }) {
  const [sport, setSport] = useState<SportKey>('all')
  const [selIdx, setSelIdx] = useState(11)          // dernière semaine par défaut
  const svgRef = useRef<SVGSVGElement>(null)
  const [wsRows, setWsRows] = useState<WsRow[]>([])

  // workout_sessions des 12 dernières semaines (exercices/circuits/rounds/stations).
  useEffect(() => {
    void (async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const since = new Date(mondayOf(new Date())); since.setDate(since.getDate() - 77)
        const { data } = await sb.from('workout_sessions')
          .select('started_at, sport, exercises_detail, calories')
          .eq('user_id', user.id)
          .gte('started_at', since.toISOString())
          .limit(400)
        setWsRows((data ?? []) as WsRow[])
      } catch { /* best-effort */ }
    })()
  }, [])

  const def = SPORT_DEFS.find(s => s.key === sport)!

  const weeks: WeekAgg[] = useMemo(() => {
    const thisMonday = mondayOf(new Date())
    const list: WeekAgg[] = Array.from({ length: 12 }, (_, i) => {
      const monday = new Date(thisMonday); monday.setDate(monday.getDate() - (11 - i) * 7)
      const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6)
      const loc = currentLocale()
      const label = `${monday.getDate()} – ${sunday.getDate()} ${sunday.toLocaleDateString(loc, { month: 'short' })}`
      return { monday, label, count: 0, timeS: 0, distM: 0, dPlus: 0, kcal: 0, wSum: 0, wW: 0, npSum: 0, npW: 0, hrSum: 0, hrW: 0, extras: { exercises: 0, circuits: 0, wallBalls: 0, ergM: 0, rounds: 0 } }
    })
    const idxOf = (dateStr: string): number => {
      const m = mondayOf(new Date(dateStr))
      return Math.round((m.getTime() - list[0].monday.getTime()) / (7 * 86400_000))
    }
    for (const a of activities) {
      if (sport !== 'all' && !def.types.includes(a.sport_type)) continue
      const i = idxOf(a.started_at)
      if (i < 0 || i > 11) continue
      const w = list[i]
      const dur = a.moving_time_s ?? 0
      w.count++
      w.timeS += dur
      w.distM += a.distance_m ?? 0
      w.dPlus += a.elevation_gain_m ?? 0
      w.kcal += a.calories ?? 0
      if (a.avg_watts != null && dur > 0) { w.wSum += a.avg_watts * dur; w.wW += dur }
      if (a.normalized_watts != null && dur > 0) { w.npSum += a.normalized_watts * dur; w.npW += dur }
      if (a.avg_hr != null && dur > 0) { w.hrSum += a.avg_hr * dur; w.hrW += dur }
    }
    // Extras workout_sessions (muscu / hyrox / boxe)
    if (sport === 'gym' || sport === 'hyrox' || sport === 'boxe' || sport === 'all') {
      for (const r of wsRows) {
        const i = idxOf(r.started_at)
        if (i < 0 || i > 11) continue
        const groups = Array.isArray(r.exercises_detail) ? (r.exercises_detail as Record<string, unknown>[]) : []
        if (!groups.length) continue
        const ex = list[i].extras
        for (const g of groups) {
          const nested = Array.isArray(g.circuitExercises) ? (g.circuitExercises as Record<string, unknown>[]) : null
          if (nested && nested.length) { ex.circuits++; ex.exercises += nested.length } else ex.exercises++
          const rounds = Number(g.circuitRounds ?? g.emomMinutes ?? g.tabataRounds ?? 0)
          if (rounds > 0) ex.rounds += rounds
          // Stations Hyrox par nom d'exercice (best-effort)
          const scan = nested ?? [g]
          for (const e of scan) {
            const name = String(e.name ?? '').toLowerCase()
            const reps = Number(e.reps ?? 0) * Math.max(1, Number(g.circuitRounds ?? 1))
            const meters = Number(e.distanceM ?? e.meters ?? 0)
            if (/wall.?ball/.test(name) && reps > 0) ex.wallBalls += reps
            if (/(ski.?erg|rameur|row)/.test(name) && meters > 0) ex.ergM += meters
          }
        }
      }
    }
    return list
  }, [activities, wsRows, sport, def.types])

  const sel = weeks[Math.max(0, Math.min(11, selIdx))]

  // ── Métrique tracée : km (vélo/course/trail), m (natation), heures sinon.
  const chartVals = weeks.map(w =>
    sport === 'bike' || sport === 'run' || sport === 'trail' ? w.distM / 1000
    : sport === 'swim' ? w.distM
    : w.timeS / 3600)
  const chartUnit = sport === 'bike' || sport === 'run' || sport === 'trail' ? 'km' : sport === 'swim' ? 'm' : 'h'
  const maxV = Math.max(...chartVals, 0.1)

  // ── Stats de la semaine sélectionnée, selon le sport ─────────
  const avgW  = sel.wW > 0 ? Math.round(sel.wSum / sel.wW) : null
  const avgNp = sel.npW > 0 ? Math.round(sel.npSum / sel.npW) : null
  const avgHr = sel.hrW > 0 ? Math.round(sel.hrSum / sel.hrW) : null
  const paceS = sel.distM > 100 ? sel.timeS / (sel.distM / 1000) : null
  // VAP hebdo (approximation sans streams) : distance équivalente plat = dist + 8 m par m de D+.
  const vapS  = sel.distM > 100 ? sel.timeS / ((sel.distM + 8 * sel.dPlus) / 1000) : null
  const swimP = sel.distM > 25 ? sel.timeS / (sel.distM / 100) : null
  const km    = (sel.distM / 1000).toFixed(sel.distM >= 100_000 ? 0 : 1).replace('.', ',')
  const kcalS = sel.kcal > 0 ? String(Math.round(sel.kcal)) : '—'
  const dash = '—'

  type Stat = { label: string; value: string }
  const stats: Stat[] = (() => {
    switch (sport) {
      case 'bike': return [
        { label: 'Distance', value: `${km} km` }, { label: 'Temps', value: fmtH(sel.timeS) }, { label: 'Dénivelé', value: `${Math.round(sel.dPlus)} m` },
        { label: 'Séances', value: String(sel.count) }, { label: 'W moy', value: avgW != null ? `${avgW} W` : dash }, { label: 'W normalisés', value: avgNp != null ? `${avgNp} W` : dash },
        { label: 'FC moy', value: avgHr != null ? `${avgHr} bpm` : dash }, { label: 'Calories', value: kcalS },
      ]
      case 'run': return [
        { label: 'Distance', value: `${km} km` }, { label: 'Temps', value: fmtH(sel.timeS) }, { label: 'Dénivelé', value: `${Math.round(sel.dPlus)} m` },
        { label: 'Séances', value: String(sel.count) }, { label: 'Allure moy', value: paceS ? `${fmtPace(paceS)} /km` : dash }, { label: 'Allure VAP', value: vapS ? `${fmtPace(vapS)} /km` : dash },
        { label: 'FC moy', value: avgHr != null ? `${avgHr} bpm` : dash }, { label: 'Calories', value: kcalS },
      ]
      case 'trail': return [
        { label: 'Temps', value: fmtH(sel.timeS) }, { label: 'Séances', value: String(sel.count) }, { label: 'Dénivelé', value: `${Math.round(sel.dPlus)} m` },
        { label: 'Distance', value: `${km} km` }, { label: 'Allure VAP', value: vapS ? `${fmtPace(vapS)} /km` : dash },
        { label: 'FC moy', value: avgHr != null ? `${avgHr} bpm` : dash }, { label: 'Calories', value: kcalS },
      ]
      case 'gym': return [
        { label: 'Temps', value: fmtH(sel.timeS) }, { label: 'Séances', value: String(sel.count) },
        { label: 'Exercices', value: sel.extras.exercises > 0 ? String(sel.extras.exercises) : dash },
        { label: 'Circuits', value: sel.extras.circuits > 0 ? String(sel.extras.circuits) : dash },
        { label: 'Calories', value: kcalS },
      ]
      case 'swim': return [
        { label: 'Temps', value: fmtH(sel.timeS) }, { label: 'Séances', value: String(sel.count) },
        { label: 'Distance', value: sel.distM > 0 ? `${Math.round(sel.distM)} m` : dash },
        { label: 'Allure moy', value: swimP ? `${fmtSwimPace(swimP)} /100m` : dash },
        { label: 'Calories', value: kcalS },
      ]
      case 'hyrox': return [
        { label: 'Temps', value: fmtH(sel.timeS) }, { label: 'Séances', value: String(sel.count) },
        { label: 'Run compromised', value: sel.distM > 0 ? `${km} km` : dash },
        { label: 'Wall balls', value: sel.extras.wallBalls > 0 ? String(sel.extras.wallBalls) : dash },
        { label: 'Rameur + SkiErg', value: sel.extras.ergM > 0 ? `${(sel.extras.ergM / 1000).toFixed(1).replace('.', ',')} km` : dash },
        { label: 'Calories', value: kcalS }, { label: 'FC moy', value: avgHr != null ? `${avgHr} bpm` : dash },
      ]
      case 'boxe': return [
        { label: 'Temps', value: fmtH(sel.timeS) }, { label: 'Séances', value: String(sel.count) },
        { label: 'Calories', value: kcalS },
        { label: 'Rounds', value: sel.extras.rounds > 0 ? String(sel.extras.rounds) : dash },
      ]
      default: return [
        { label: 'Temps', value: fmtH(sel.timeS) }, { label: 'Séances', value: String(sel.count) },
        { label: 'Distance', value: sel.distM > 0 ? `${km} km` : dash }, { label: 'Dénivelé', value: sel.dPlus > 0 ? `${Math.round(sel.dPlus)} m` : dash },
        { label: 'Calories', value: kcalS },
      ]
    }
  })()

  // ── Géométrie du graphique ───────────────────────────────────
  const W = 640, H = 190, PL = 46, PR = 14, PT = 26, PB = 26
  const cW = W - PL - PR, cH = H - PT - PB
  const X = (i: number) => PL + (i / 11) * cW
  const Y = (v: number) => PT + (1 - v / (maxV * 1.08)) * cH
  const linePath = chartVals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L ${X(11).toFixed(1)} ${(PT + cH).toFixed(1)} L ${X(0).toFixed(1)} ${(PT + cH).toFixed(1)} Z`

  // Libellés de mois sous l'axe (au changement de mois).
  const monthTicks = weeks.map((w, i) => ({ i, m: w.monday.toLocaleDateString(currentLocale(), { month: 'short' }) }))
    .filter((t2, i, arr) => i === 0 || t2.m !== arr[i - 1].m)

  const pickFromClientX = (clientX: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const px = ((clientX - rect.left) / rect.width) * W
    const i = Math.round(((px - PL) / cW) * 11)
    setSelIdx(Math.max(0, Math.min(11, i)))
  }

  const fmtVal = (v: number) => chartUnit === 'h' ? v.toFixed(v >= 10 ? 0 : 1).replace('.', ',') : String(Math.round(v))

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: '16px 18px 12px', marginBottom: 16, boxShadow: 'var(--shadow-card)' }}>
      {/* Chips de sport */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 10 }}>
        {SPORT_DEFS.map(s => {
          const on = sport === s.key
          return (
            <button key={s.key} onClick={() => { setSport(s.key); setSelIdx(11) }}
              style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)',
                border: on ? `1.5px solid ${BLUE}` : '1px solid var(--border)',
                background: on ? 'rgba(59,130,246,0.08)' : 'var(--bg-card)',
                color: on ? BLUE : 'var(--text-mid)' }}>
              {s.label}
            </button>
          )
        })}
      </div>

      {/* Semaine sélectionnée + stats */}
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: '6px 0 10px', fontFamily: 'var(--font-display)' }}>
        Semaine du {sel.label}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px 14px', marginBottom: 14 }}>
        {stats.map(st => (
          <div key={st.label}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{st.label}</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', marginTop: 2, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{st.value}</div>
          </div>
        ))}
      </div>

      {/* Graphique 12 semaines — scrub doigt/souris */}
      <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', touchAction: 'pan-y' }}
        onMouseMove={e => pickFromClientX(e.clientX)}
        onMouseDown={e => pickFromClientX(e.clientX)}
        onTouchStart={e => pickFromClientX(e.touches[0].clientX)}
        onTouchMove={e => pickFromClientX(e.touches[0].clientX)}>
        <defs>
          <linearGradient id="vol12grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BLUE} stopOpacity={0.30} />
            <stop offset="100%" stopColor={BLUE} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {/* Grille + axe Y (0 / mid / max) */}
        {[0, maxV / 2, maxV].map((v, i) => (
          <g key={i}>
            <line x1={PL} y1={Y(v)} x2={PL + cW} y2={Y(v)} stroke="var(--border)" strokeWidth={1} strokeDasharray={i === 0 ? undefined : '3 4'} />
            <text x={PL - 6} y={Y(v) + 3.5} textAnchor="end" fontSize={10} fill="var(--text-dim)" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtVal(v)} {chartUnit}</text>
          </g>
        ))}
        {/* Colonnes de semaines (repères verticaux légers) */}
        {weeks.map((_, i) => (
          <line key={i} x1={X(i)} y1={PT} x2={X(i)} y2={PT + cH} stroke="var(--border)" strokeWidth={0.5} opacity={0.5} />
        ))}
        <path d={areaPath} fill="url(#vol12grad)" />
        <path d={linePath} fill="none" stroke={BLUE} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        {/* Curseur semaine sélectionnée */}
        <line x1={X(selIdx)} y1={Y(chartVals[selIdx])} x2={X(selIdx)} y2={PT + cH} stroke={BLUE} strokeWidth={2} />
        {/* Points hebdo */}
        {chartVals.map((v, i) => (
          i === selIdx
            ? <g key={i}>
                <circle cx={X(i)} cy={Y(v)} r={11} fill={BLUE} opacity={0.18} />
                <circle cx={X(i)} cy={Y(v)} r={5.5} fill={BLUE} />
                <text x={X(i)} y={Y(v) - 12} textAnchor="middle" fontSize={12} fontWeight={800} fill="var(--text)" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtVal(v)} {chartUnit}</text>
              </g>
            : <circle key={i} cx={X(i)} cy={Y(v)} r={4} fill="var(--bg-card)" stroke={BLUE} strokeWidth={2} />
        ))}
        {/* Mois */}
        {monthTicks.map(t2 => (
          <text key={t2.i} x={X(t2.i)} y={PT + cH + 16} textAnchor="middle" fontSize={10} fill="var(--text-dim)" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t2.m}</text>
        ))}
      </svg>
    </div>
  )
}
