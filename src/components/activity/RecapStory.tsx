'use client'
// ══════════════════════════════════════════════════════════════════
// RecapStory — surpage plein écran « stories » (façon Wrapped) pour le
// récap SEMAINE ou MOIS. Pager horizontal au swipe + défilement auto toutes
// les 15 s + barres de progression en haut. Chaque page s'anime à l'arrivée
// (compteurs qui montent, jauges/barres/donut qui se remplissent).
//
// Pages : 1) Vue d'ensemble + mini-tendance 6 périodes · 2) Répartition & charge
//         3…N) une page par sport · dernière) Temps forts.
// 100 % client-side, aucune dépendance chart externe (SVG brut).
// ══════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconX, IconChevronLeft, IconChevronRight, IconShare2, IconDownload, IconTrophy, IconFlame, IconMountain, IconClock, IconBolt, IconRoad, IconGauge, IconMedal } from '@tabler/icons-react'
import { SPORT_ICON, sportKeyFromType, type SportKey } from '@/components/icons/SportIcon'
import { shareCard, type ShareStat } from '@/lib/share/shareCard'

export interface RecapAct {
  started_at: string; sport_type: string
  moving_time_s: number | null; distance_m: number | null; elevation_gain_m: number | null
  avg_hr: number | null; avg_speed_ms: number | null; avg_pace_s_km: number | null; avg_watts: number | null
  tss: number | null; rpe: number | null; calories: number | null; title: string | null; is_race?: boolean | null
}

const STORY_MS = 15000
const N_TREND = 6

// ── format ────────────────────────────────────────────────────────
function fmtH(s: number): string { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min` }
function fmtKm(m: number): string { return m > 0 ? `${(m / 1000).toFixed(m >= 100000 ? 0 : 1).replace(/\.0$/, '')}` : '0' }
function fmtPace(s: number): string { const m = Math.floor(s / 60), sec = Math.round(s % 60); return `${m}:${String(sec).padStart(2, '0')}` }
function getMonday(d: Date): Date { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); return x }
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

interface Bounds { start: Date; end: Date; label: string; short: string }
function periodBounds(period: 'week' | 'month', offset: number, ref: Date): Bounds {
  if (period === 'month') {
    const start = new Date(ref.getFullYear(), ref.getMonth() - 1 - offset, 1)
    const end = new Date(ref.getFullYear(), ref.getMonth() - offset, 1)
    return { start, end, label: cap(start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })), short: start.toLocaleDateString('fr-FR', { month: 'short' }) }
  }
  const mon = getMonday(ref)
  const start = new Date(mon); start.setDate(start.getDate() - 7 * (offset + 1))
  const end = new Date(start); end.setDate(end.getDate() + 7)
  return { start, end, label: `Semaine du ${start.getDate()} ${start.toLocaleDateString('fr-FR', { month: 'long' })}`, short: `${start.getDate()}/${start.getMonth() + 1}` }
}

interface SportStat { key: SportKey | string; time: number; dist: number; count: number; sm: number; elev: number; hrSum: number; hrN: number; speedSum: number; speedN: number; paceSum: number; paceN: number; wattSum: number; wattN: number; bestPace: number | null; maxWatt: number | null; best: RecapAct | null; longAct: RecapAct | null }
interface PeriodStat {
  count: number; time: number; dist: number; sm: number; elev: number; calories: number
  activeDays: number; races: number; rpeAvg: number | null
  bySport: SportStat[]; top: RecapAct | null; longest: RecapAct | null
  farthest: RecapAct | null; mostClimb: RecapAct | null; racesList: RecapAct[]
}
function computeStats(acts: RecapAct[], b: Bounds): PeriodStat {
  const inRange = acts.filter(a => { const d = new Date(a.started_at); return d >= b.start && d < b.end })
  const sportMap = new Map<string, SportStat>()
  const days = new Set<string>()
  let rpeSum = 0, rpeN = 0
  for (const a of inRange) {
    const k = sportKeyFromType(a.sport_type) ?? a.sport_type
    let s = sportMap.get(k)
    if (!s) { s = { key: k, time: 0, dist: 0, count: 0, sm: 0, elev: 0, hrSum: 0, hrN: 0, speedSum: 0, speedN: 0, paceSum: 0, paceN: 0, wattSum: 0, wattN: 0, bestPace: null, maxWatt: null, best: null, longAct: null }; sportMap.set(k, s) }
    s.time += a.moving_time_s ?? 0; s.dist += a.distance_m ?? 0; s.count++; s.sm += a.tss ?? 0; s.elev += a.elevation_gain_m ?? 0
    if (a.avg_hr) { s.hrSum += a.avg_hr; s.hrN++ }
    if (a.avg_speed_ms) { s.speedSum += a.avg_speed_ms; s.speedN++ }
    if (a.avg_pace_s_km) { s.paceSum += a.avg_pace_s_km; s.paceN++; if (s.bestPace == null || a.avg_pace_s_km < s.bestPace) s.bestPace = a.avg_pace_s_km }
    if (a.avg_watts) { s.wattSum += a.avg_watts; s.wattN++; if (s.maxWatt == null || a.avg_watts > s.maxWatt) s.maxWatt = a.avg_watts }
    if (!s.best || (a.tss ?? 0) > (s.best.tss ?? 0)) s.best = a
    if (!s.longAct || (a.moving_time_s ?? 0) > (s.longAct.moving_time_s ?? 0)) s.longAct = a
    days.add(new Date(a.started_at).toDateString())
    if (a.rpe) { rpeSum += a.rpe; rpeN++ }
  }
  const bySport = [...sportMap.values()].sort((x, y) => y.time - x.time)
  const top = inRange.slice().sort((x, y) => (y.tss ?? 0) - (x.tss ?? 0))[0] ?? null
  const longest = inRange.slice().sort((x, y) => (y.moving_time_s ?? 0) - (x.moving_time_s ?? 0))[0] ?? null
  const farthest = inRange.slice().sort((x, y) => (y.distance_m ?? 0) - (x.distance_m ?? 0))[0] ?? null
  const mostClimb = inRange.slice().sort((x, y) => (y.elevation_gain_m ?? 0) - (x.elevation_gain_m ?? 0))[0] ?? null
  const racesList = inRange.filter(a => a.is_race).sort((x, y) => +new Date(y.started_at) - +new Date(x.started_at))
  return {
    farthest, mostClimb, racesList,
    count: inRange.length,
    time: inRange.reduce((s, a) => s + (a.moving_time_s ?? 0), 0),
    dist: inRange.reduce((s, a) => s + (a.distance_m ?? 0), 0),
    sm: inRange.reduce((s, a) => s + (a.tss ?? 0), 0),
    elev: inRange.reduce((s, a) => s + (a.elevation_gain_m ?? 0), 0),
    calories: inRange.reduce((s, a) => s + (a.calories ?? 0), 0),
    activeDays: days.size, races: inRange.filter(a => a.is_race).length,
    rpeAvg: rpeN > 0 ? rpeSum / rpeN : null,
    bySport, top, longest,
  }
}

const sportCfg = (k: string) => (k in SPORT_ICON ? SPORT_ICON[k as SportKey] : null)
const sportColor = (k: string) => sportCfg(k)?.color ?? '#06B6D4'
const sportLabel = (k: string) => sportCfg(k)?.label ?? cap(k)

// ── count-up (rAF, easing cubic-out) ──────────────────────────────
function useCountUp(target: number, active: boolean, ms = 1100): number {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!active) { setV(0); return }
    let raf = 0; const t0 = performance.now()
    const tick = (t: number) => { const p = Math.min(1, (t - t0) / ms); setV(target * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, active, ms])
  return v
}

// ── petits blocs UI ───────────────────────────────────────────────
function BigStat({ value, label, accent, active, delay = 0 }: { value: number; label: string; accent: string; active: boolean; delay?: number; }) {
  const n = useCountUp(value, active, 1000 + delay)
  return (
    <div style={{ opacity: active ? 1 : 0, transform: active ? 'none' : 'translateY(14px)', transition: `opacity .5s ${delay}ms, transform .6s cubic-bezier(.2,.8,.2,1) ${delay}ms` }}>
      <div style={{ fontSize: 44, fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em', fontFamily: 'var(--font-display, sans-serif)' }}>
        {Math.round(n)}<span style={{ fontSize: 20, marginLeft: 3, color: accent }}></span>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'rgba(255,255,255,0.6)', marginTop: 5 }}>{label}</div>
    </div>
  )
}
function StatLine({ label, value, sub }: { label: string; value: string; sub?: string; }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{value}{sub && <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>{sub}</span>}</span>
    </div>
  )
}
function DeltaBadge({ cur, prev }: { cur: number; prev: number; }) {
  if (prev <= 0 && cur <= 0) return null
  const pct = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : 100
  const up = pct >= 0
  const c = up ? '#34d399' : '#f87171'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 800, color: c, background: `${c}22`, borderRadius: 999, padding: '3px 9px' }}>
      {up ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  )
}

export function RecapStory({ period, activities, refDate, onClose }: {
  period: 'week' | 'month'; activities: RecapAct[]; refDate?: string; onClose: () => void;
}) {
  const ref = useMemo(() => (refDate ? new Date(refDate) : new Date()), [refDate])
  // Période courante = celle qui vient de se terminer (offset 0) + tendance sur N_TREND périodes.
  const cur = useMemo(() => computeStats(activities, periodBounds(period, 0, ref)), [activities, period, ref])
  const prev = useMemo(() => computeStats(activities, periodBounds(period, 1, ref)), [activities, period, ref])
  const trend = useMemo(() => Array.from({ length: N_TREND }, (_, i) => {
    const b = periodBounds(period, N_TREND - 1 - i, ref)
    return { b, st: computeStats(activities, b) }
  }), [activities, period, ref])
  const curBounds = useMemo(() => periodBounds(period, 0, ref), [period, ref])

  // Accent global = sport dominant de la période.
  const heroSport = cur.bySport[0]?.key ?? 'run'
  const accent = sportColor(String(heroSport))

  // ── Construction des pages ──
  const pages = useMemo(() => {
    const list: { id: string; bg: string; accent: string; render: (active: boolean) => ReactNode; share: { title: string; subtitle: string; stats: ShareStat[] } }[] = []
    const grad = (c: string) => `linear-gradient(160deg, ${c} 0%, #0a0a0f 125%)`
    const per = period === 'week' ? 'la semaine' : 'le mois'

    // 1 — Vue d'ensemble + tendance
    list.push({
      id: 'overview', bg: grad(accent), accent,
      share: { title: curBounds.label, subtitle: `Récap ${period === 'week' ? 'hebdo' : 'mensuel'}`, stats: [
        { label: 'Séances', value: String(cur.count) }, { label: 'Temps', value: fmtH(cur.time) },
        { label: 'Distance', value: cur.dist > 0 ? `${Math.round(cur.dist / 1000)} km` : '—' }, { label: 'Charge SM', value: String(Math.round(cur.sm)) },
      ] },
      render: (active) => {
        const maxSm = Math.max(1, ...trend.map(t => t.st.sm))
        return (
          <div style={{ padding: '64px 26px 30px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>
              Récap {period === 'week' ? 'de la semaine' : 'du mois'}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginTop: 4 }}>{curBounds.label}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '26px 20px', marginTop: 34 }}>
              <BigStat value={cur.count} label="Séances" accent={accent} active={active} delay={0} />
              <BigStat value={Math.round(cur.time / 3600)} label="Heures" accent={accent} active={active} delay={90} />
              <BigStat value={Math.round(cur.dist / 1000)} label="Kilomètres" accent={accent} active={active} delay={180} />
              <BigStat value={Math.round(cur.sm)} label="Charge (SM)" accent={accent} active={active} delay={270} />
            </div>
            {/* Mini-tendance */}
            <div style={{ marginTop: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.55)' }}>Charge · {N_TREND} dern. {period === 'week' ? 'semaines' : 'mois'}</span>
                <DeltaBadge cur={cur.sm} prev={prev.sm} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 92 }}>
                {trend.map((t, i) => {
                  const isCur = i === trend.length - 1
                  const h = (t.st.sm / maxSm) * 100
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: '100%', height: 72, display: 'flex', alignItems: 'flex-end' }}>
                        <div style={{
                          width: '100%', borderRadius: '6px 6px 3px 3px',
                          height: active ? `${Math.max(4, h)}%` : '0%',
                          background: isCur ? '#fff' : 'rgba(255,255,255,0.4)',
                          transition: `height .8s cubic-bezier(.2,.8,.2,1) ${i * 70}ms`,
                        }} />
                      </div>
                      <span style={{ fontSize: 8.5, color: isCur ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: isCur ? 800 : 600 }}>{t.b.short}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      },
    })

    // 2 — Répartition & charge
    list.push({
      id: 'split', bg: grad('#1e293b'), accent,
      share: { title: `Répartition — ${per}`, subtitle: 'Temps par sport', stats: cur.bySport.slice(0, 4).map(s => ({ label: sportLabel(String(s.key)), value: fmtH(s.time) })) },
      render: (active) => {
        const totalTime = Math.max(1, cur.bySport.reduce((s, x) => s + x.time, 0))
        const C = 2 * Math.PI * 52
        let acc = 0
        return (
          <div style={{ padding: '64px 26px 30px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>Répartition</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginTop: 4, marginBottom: 8 }}>Où est passé ton temps</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '10px 0 18px' }}>
              <svg width="164" height="164" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="52" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="15" />
                {cur.bySport.map((s, i) => {
                  const frac = s.time / totalTime
                  const len = frac * C
                  const off = acc; acc += len
                  return (
                    <circle key={i} cx="70" cy="70" r="52" fill="none" stroke={sportColor(String(s.key))} strokeWidth="15"
                      strokeDasharray={active ? `${len} ${C - len}` : `0 ${C}`} strokeDashoffset={-off}
                      transform="rotate(-90 70 70)" strokeLinecap="butt"
                      style={{ transition: `stroke-dasharray .9s cubic-bezier(.3,.8,.3,1) ${i * 120}ms` }} />
                  )
                })}
                <text x="70" y="66" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff">{fmtH(cur.time)}</text>
                <text x="70" y="84" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.6)">au total</text>
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {cur.bySport.slice(0, 5).map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', opacity: active ? 1 : 0, transform: active ? 'none' : 'translateX(12px)', transition: `all .5s ${300 + i * 80}ms` }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: sportColor(String(s.key)), flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', flex: 1 }}>{sportLabel(String(s.key))}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{fmtH(s.time)}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', width: 38, textAlign: 'right' }}>{Math.round((s.time / totalTime) * 100)}%</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { l: 'Jours actifs', v: String(cur.activeDays) },
                { l: 'RPE moyen', v: cur.rpeAvg != null ? cur.rpeAvg.toFixed(1) : '—' },
                { l: 'D+ total', v: `${Math.round(cur.elev)}m` },
              ].map((x, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 10px', textAlign: 'center', opacity: active ? 1 : 0, transition: `opacity .5s ${600 + i * 100}ms` }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{x.v}</div>
                  <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.55)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>{x.l}</div>
                </div>
              ))}
            </div>
          </div>
        )
      },
    })

    // 3…N — une page par sport
    cur.bySport.forEach((s) => {
      const c = sportColor(String(s.key))
      const Cfg = sportCfg(String(s.key))
      const prevS = prev.bySport.find(x => x.key === s.key)
      const shareStats: ShareStat[] = [{ label: 'Séances', value: String(s.count) }, { label: 'Temps', value: fmtH(s.time) }]
      if (s.dist > 0) shareStats.push({ label: 'Distance', value: `${fmtKm(s.dist)} km` })
      shareStats.push({ label: 'Charge SM', value: String(Math.round(s.sm)) })
      list.push({
        id: `sport-${s.key}`, bg: grad(c), accent: c,
        share: { title: `${sportLabel(String(s.key))} — ${per}`, subtitle: `Bilan ${period === 'week' ? 'hebdo' : 'mensuel'}`, stats: shareStats },
        render: (active) => {
          const lines: { label: string; value: string; sub?: string }[] = [
            { label: 'Séances', value: String(s.count) },
            { label: 'Temps', value: fmtH(s.time) },
          ]
          if (s.dist > 0) lines.push({ label: 'Distance', value: fmtKm(s.dist), sub: 'km' })
          if (s.elev > 0) lines.push({ label: 'Dénivelé +', value: `${Math.round(s.elev)}`, sub: 'm' })
          if (s.paceN > 0) lines.push({ label: 'Allure moy.', value: fmtPace(s.paceSum / s.paceN), sub: '/km' })
          else if (s.speedN > 0) lines.push({ label: 'Vitesse moy.', value: `${((s.speedSum / s.speedN) * 3.6).toFixed(1)}`, sub: 'km/h' })
          if (s.wattN > 0) lines.push({ label: 'Puissance moy.', value: `${Math.round(s.wattSum / s.wattN)}`, sub: 'W' })
          if (s.hrN > 0) lines.push({ label: 'FC moyenne', value: `${Math.round(s.hrSum / s.hrN)}`, sub: 'bpm' })
          lines.push({ label: 'Charge (SM)', value: String(Math.round(s.sm)) })
          return (
            <div style={{ padding: '64px 26px 30px', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {Cfg ? <Cfg.Icon size={26} color="#fff" stroke={2.2} /> : null}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>Bilan sport</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{sportLabel(String(s.key))}</div>
                </div>
                {prevS && <div style={{ marginLeft: 'auto' }}><DeltaBadge cur={s.time} prev={prevS.time} /></div>}
              </div>
              <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column' }}>
                {lines.map((l, i) => (
                  <div key={i} style={{ opacity: active ? 1 : 0, transform: active ? 'none' : 'translateY(10px)', transition: `all .45s cubic-bezier(.2,.8,.2,1) ${i * 70}ms` }}>
                    <StatLine label={l.label} value={l.value} sub={l.sub} />
                  </div>
                ))}
              </div>
              {s.best && (
                <div style={{ marginTop: 'auto', background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 11, opacity: active ? 1 : 0, transition: 'opacity .6s .5s' }}>
                  <IconBolt size={20} color="#fff" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Meilleure séance</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.best.title || 'Séance'} · SM {Math.round(s.best.tss ?? 0)}</div>
                  </div>
                </div>
              )}
            </div>
          )
        },
      })
    })

    // Records — bests toutes disciplines + plus grosse séance (durée) par sport
    {
      const recs: { icon: ReactNode; label: string; value: string; sub: string }[] = []
      if (cur.longest) recs.push({ icon: <IconClock size={20} color="#fff" />, label: 'Plus longue séance', value: fmtH(cur.longest.moving_time_s ?? 0), sub: cur.longest.title || sportLabel(String(sportKeyFromType(cur.longest.sport_type) ?? cur.longest.sport_type)) })
      if (cur.farthest && (cur.farthest.distance_m ?? 0) > 0) recs.push({ icon: <IconRoad size={20} color="#fff" />, label: 'Plus longue distance', value: `${fmtKm(cur.farthest.distance_m ?? 0)} km`, sub: cur.farthest.title || '' })
      if (cur.mostClimb && (cur.mostClimb.elevation_gain_m ?? 0) > 0) recs.push({ icon: <IconMountain size={20} color="#fff" />, label: 'Plus gros dénivelé', value: `${Math.round(cur.mostClimb.elevation_gain_m ?? 0)} m`, sub: cur.mostClimb.title || '' })
      if (cur.top) recs.push({ icon: <IconGauge size={20} color="#fff" />, label: 'Séance la plus intense', value: `SM ${Math.round(cur.top.tss ?? 0)}`, sub: cur.top.title || '' })
      list.push({
        id: 'records', bg: grad('#0f766e'), accent: '#14b8a6',
        share: { title: `Records — ${per}`, subtitle: 'Tes meilleures perfs', stats: recs.slice(0, 4).map(r => ({ label: r.label, value: r.value })) },
        render: (active) => (
          <div style={{ padding: '64px 26px 30px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>Records</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginTop: 4, marginBottom: 18 }}>Tes meilleures perfs</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {recs.map((r, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: '13px 13px', opacity: active ? 1 : 0, transform: active ? 'none' : 'scale(.95) translateY(8px)', transition: `all .5s cubic-bezier(.2,.8,.2,1) ${i * 90}ms` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r.icon}</div>
                    <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.15 }}>{r.label}</span>
                  </div>
                  <div style={{ fontSize: 21, fontWeight: 800, color: '#fff' }}>{r.value}</div>
                  {r.sub && <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sub}</div>}
                </div>
              ))}
            </div>
            {/* Plus grosse séance (durée) par sport */}
            <div style={{ marginTop: 18, background: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>Plus longue séance par sport</div>
              {cur.bySport.filter(s => s.longAct).map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < cur.bySport.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none', opacity: active ? 1 : 0, transition: `opacity .5s ${400 + i * 80}ms` }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: sportColor(String(s.key)), flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', flex: 1 }}>{sportLabel(String(s.key))}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>{fmtH(s.longAct?.moving_time_s ?? 0)}</span>
                </div>
              ))}
            </div>
          </div>
        ),
      })
    }

    // Compétitions de la période
    list.push({
      id: 'races', bg: grad('#b45309'), accent: '#f59e0b',
      share: { title: `Compétitions — ${per}`, subtitle: cur.racesList.length > 0 ? `${cur.racesList.length} course${cur.racesList.length > 1 ? 's' : ''}` : 'Aucune course', stats: cur.racesList.slice(0, 4).map(r => ({ label: r.title || 'Course', value: r.distance_m ? `${fmtKm(r.distance_m)} km` : fmtH(r.moving_time_s ?? 0) })) },
      render: (active) => (
        <div style={{ padding: '64px 26px 30px', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>Compétitions</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginTop: 4, marginBottom: 22 }}>Tes dossards {period === 'week' ? 'de la semaine' : 'du mois'}</div>
          {cur.racesList.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'rgba(255,255,255,0.75)' }}>
              <IconMedal size={54} color="rgba(255,255,255,0.6)" />
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 12 }}>Aucune compétition sur {per}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>Marque une activité comme course pour la voir ici.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cur.racesList.slice(0, 6).map((r, i) => {
                const k = sportKeyFromType(r.sport_type) ?? r.sport_type
                const Cfg = sportCfg(String(k))
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, background: 'rgba(255,255,255,0.1)', borderRadius: 15, padding: '13px 15px', opacity: active ? 1 : 0, transform: active ? 'none' : 'translateX(12px)', transition: `all .5s ${i * 100}ms` }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: sportColor(String(k)), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{Cfg ? <Cfg.Icon size={22} color="#fff" stroke={2.2} /> : <IconMedal size={20} color="#fff" />}</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title || 'Course'}</div>
                      <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)' }}>{new Date(r.started_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {sportLabel(String(k))}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{r.distance_m ? `${fmtKm(r.distance_m)} km` : fmtH(r.moving_time_s ?? 0)}</div>
                      {r.tss != null && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>SM {Math.round(r.tss)}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ),
    })

    // Dernière — Temps forts
    list.push({
      id: 'highlights', bg: grad(accent), accent,
      share: { title: `Temps forts — ${per}`, subtitle: 'Tes moments', stats: [
        ...(cur.top ? [{ label: 'Plus intense', value: `SM ${Math.round(cur.top.tss ?? 0)}` }] : []),
        ...(cur.longest ? [{ label: 'Plus longue', value: fmtH(cur.longest.moving_time_s ?? 0) }] : []),
        ...(cur.elev > 0 ? [{ label: 'D+ cumulé', value: `${Math.round(cur.elev)} m` }] : []),
        ...(cur.calories > 0 ? [{ label: 'Énergie', value: `${Math.round(cur.calories)} kcal` }] : []),
      ] },
      render: (active) => {
        const cards: { icon: ReactNode; label: string; value: string; sub: string }[] = []
        if (cur.top) cards.push({ icon: <IconTrophy size={22} color="#fff" />, label: 'Séance la plus intense', value: `SM ${Math.round(cur.top.tss ?? 0)}`, sub: cur.top.title || sportLabel(String(sportKeyFromType(cur.top.sport_type) ?? cur.top.sport_type)) })
        if (cur.longest) cards.push({ icon: <IconClock size={22} color="#fff" />, label: 'Plus longue séance', value: fmtH(cur.longest.moving_time_s ?? 0), sub: cur.longest.title || '' })
        if (cur.elev > 0) cards.push({ icon: <IconMountain size={22} color="#fff" />, label: 'Dénivelé cumulé', value: `${Math.round(cur.elev)} m`, sub: 'de montée' })
        if (cur.calories > 0) cards.push({ icon: <IconFlame size={22} color="#fff" />, label: 'Énergie dépensée', value: `${Math.round(cur.calories)} kcal`, sub: `${cur.races > 0 ? `${cur.races} course${cur.races > 1 ? 's' : ''}` : 'brûlées'}` })
        return (
          <div style={{ padding: '64px 26px 30px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>Temps forts</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginTop: 4, marginBottom: 22 }}>Tes moments {period === 'week' ? 'de la semaine' : 'du mois'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cards.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: '15px 16px', opacity: active ? 1 : 0, transform: active ? 'none' : 'scale(.95) translateY(10px)', transition: `all .5s cubic-bezier(.2,.8,.2,1) ${i * 110}ms` }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{c.icon}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</div>
                    <div style={{ fontSize: 19, fontWeight: 800, color: '#fff' }}>{c.value}</div>
                    {c.sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.sub}</div>}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => void shareCard({
              title: `Mon ${period === 'week' ? 'semaine' : 'mois'} — ${curBounds.label}`,
              subtitle: `Récap ${period === 'week' ? 'hebdo' : 'mensuel'}`, accent,
              stats: [
                { label: 'Séances', value: String(cur.count) },
                { label: 'Temps', value: fmtH(cur.time) },
                { label: 'Distance', value: cur.dist > 0 ? `${Math.round(cur.dist / 1000)} km` : '—' },
                { label: 'SM total', value: String(Math.round(cur.sm)) },
              ], filename: `hybrid-${period}.png`,
            })} style={{ marginTop: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 999, background: '#fff', border: 'none', color: '#0a0a0f', fontSize: 14, fontWeight: 800, cursor: 'pointer', opacity: active ? 1 : 0, transition: 'opacity .6s .5s' }}>
              <IconShare2 size={17} /> Partager mon {period === 'week' ? 'semaine' : 'mois'}
            </button>
          </div>
        )
      },
    })
    return list
  }, [cur, prev, trend, accent, period, curBounds])

  const nPages = pages.length
  const [idx, setIdx] = useState(0)
  const [drag, setDrag] = useState<{ x0: number; dx: number } | null>(null)
  const [paused, setPaused] = useState(false)
  const clamp = (i: number) => Math.max(0, Math.min(nPages - 1, i))
  const go = (i: number) => setIdx(clamp(i))

  // Auto-play 15 s (boucle).
  useEffect(() => {
    if (paused || drag) return
    const t = setTimeout(() => setIdx(i => (i + 1) % nPages), STORY_MS)
    return () => clearTimeout(t)
  }, [idx, paused, drag, nPages])

  // Clavier + verrou du scroll de fond.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(idx + 1)
      else if (e.key === 'ArrowLeft') go(idx - 1)
    }
    window.addEventListener('keydown', onKey)
    const prevOv = document.body.style.overflow; document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prevOv }
  }, [idx, nPages]) // eslint-disable-line react-hooks/exhaustive-deps

  const shareCurrent = () => {
    const p = pages[idx]; if (!p) return
    void shareCard({ title: p.share.title, subtitle: p.share.subtitle, accent: p.accent, stats: p.share.stats, transparent: true, filename: `thw-${period}-${p.id}.png` })
  }
  const stop = (e: React.PointerEvent) => e.stopPropagation()

  const portal = (node: ReactNode) => (typeof document !== 'undefined' ? createPortal(node, document.body) : null)

  if (cur.count === 0) {
    return portal(
      <div style={overlay} role="dialog" aria-modal>
        <button onClick={onClose} aria-label="Fermer" style={closeBtn}><IconX size={20} color="#fff" /></button>
        <div style={{ color: '#fff', textAlign: 'center', padding: 30, alignSelf: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Aucune activité sur {period === 'week' ? 'cette semaine' : 'ce mois'}.</div>
        </div>
      </div>
    )
  }

  return portal(
    <div style={overlay} role="dialog" aria-modal>
      <div
        style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#0a0a0f' }}
        onPointerDown={e => { setDrag({ x0: e.clientX, dx: 0 }); setPaused(true) }}
        onPointerMove={e => drag && setDrag(d => d ? { ...d, dx: e.clientX - d.x0 } : d)}
        onPointerUp={() => { if (drag) { if (drag.dx < -55) go(idx + 1); else if (drag.dx > 55) go(idx - 1) } setDrag(null); setPaused(false) }}
        onPointerCancel={() => { setDrag(null); setPaused(false) }}
      >
        <style>{'@keyframes storyBar{from{transform:scaleX(0)}to{transform:scaleX(1)}}@keyframes storyFade{from{opacity:0}to{opacity:1}}'}</style>

        {/* Piste des pages (fond plein écran) */}
        <div style={{
          display: 'flex', height: '100%', width: `${nPages * 100}%`,
          transform: `translateX(calc(${-idx * (100 / nPages)}% + ${drag?.dx ?? 0}px))`,
          transition: drag ? 'none' : 'transform .38s cubic-bezier(.3,.8,.3,1)',
        }}>
          {pages.map((p, i) => (
            <div key={p.id} style={{ width: `${100 / nPages}%`, height: '100%', background: p.bg, overflow: 'hidden' }}>
              {/* Contenu centré dans une colonne lisible, le fond remplit tout l'écran */}
              <div style={{ height: '100%', width: '100%', maxWidth: 560, margin: '0 auto' }}>
                {Math.abs(i - idx) <= 1 ? p.render(i === idx) : null}
              </div>
            </div>
          ))}
        </div>

        {/* Barre supérieure : progression + actions (colonne centrée) */}
        <div style={{ position: 'absolute', top: 'calc(10px + env(safe-area-inset-top))', left: 0, right: 0, zIndex: 6, padding: '0 12px', maxWidth: 584, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {pages.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.28)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3, background: '#fff',
                  width: i <= idx ? '100%' : '0%', transformOrigin: 'left',
                  animation: i === idx && !paused && !drag ? `storyBar ${STORY_MS}ms linear forwards` : 'none',
                }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
            <button onPointerDown={stop} onClick={shareCurrent} aria-label="Télécharger / partager cette page" style={pillBtn}>
              <IconDownload size={17} color="#fff" /><span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>Partager</span>
            </button>
            <button onPointerDown={stop} onClick={onClose} aria-label="Fermer" style={{ ...closeBtn, position: 'static' }}><IconX size={20} color="#fff" /></button>
          </div>
        </div>

        {/* Zones de tap (gauche/droite) */}
        <button aria-label="Précédent" onPointerDown={stop} onClick={() => go(idx - 1)} style={{ position: 'absolute', left: 0, top: 90, bottom: 70, width: '25%', background: 'transparent', border: 'none', cursor: idx > 0 ? 'pointer' : 'default' }} />
        <button aria-label="Suivant" onPointerDown={stop} onClick={() => go(idx + 1)} style={{ position: 'absolute', right: 0, top: 90, bottom: 70, width: '25%', background: 'transparent', border: 'none', cursor: 'pointer' }} />

        {/* Flèches desktop */}
        {idx > 0 && <button onPointerDown={stop} onClick={() => go(idx - 1)} aria-label="Précédent" style={{ ...navArrow, left: 14 }}><IconChevronLeft size={22} color="#fff" /></button>}
        {idx < nPages - 1 && <button onPointerDown={stop} onClick={() => go(idx + 1)} aria-label="Suivant" style={{ ...navArrow, right: 14 }}><IconChevronRight size={22} color="#fff" /></button>}
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 13000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', animation: 'storyFade .25s ease' }
const closeBtn: React.CSSProperties = { position: 'absolute', top: 24, right: 16, zIndex: 6, width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const navArrow: React.CSSProperties = { position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 6, width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const pillBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 13px', borderRadius: 999, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)', cursor: 'pointer' }
