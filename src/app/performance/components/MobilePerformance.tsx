'use client'
// ══════════════════════════════════════════════════════════════
// Performance — version mobile façon Strava.
//  • Mon profil (FTP, VMA, FC max, seuil) → profil complet (zones,
//    benchmarks, niveau estimé, Analyser).
//  • Choix du sport, puis des cartes résumé propres au sport (radar avec
//    le vrai calcul de niveau, puissance, records avec « Préc. », ascensions,
//    courses…) → la page complète du sport (écrans existants).
//  • Évolution (volume par année) → données annuelles complètes.
//  • Tests (prochain test planifié, catalogue) → onglet Tests complet.
// Aucune donnée inventée : chaque carte lit Supabase, sinon état vide.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useI18n, currentLocale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { resolvePlanningUid } from '@/lib/planning/scope'
import { DashCard, Metric, MiniBars } from '@/components/dashboard/primitives'
import { DetailSlide } from '@/components/ui/DetailSlide'
import { useDetailView } from '@/hooks/useDetailView'
import { CyclingRadar, RunningRadar, HyroxRadar, TriathlonRadar } from '../RadarChart'
import { TESTS } from '@/lib/tests/protocols'
import type { RecordSport } from '../DatasTab'

export interface PerfProfile {
  ftp: number; weight: number; age: number; lthr: number; hrMax: number; hrRest: number
  thresholdPace: string; vma: number; css: string; vo2max: number
}
// Vue détail : profil, évolution, tests, page d'un sport, ou sous-page d'un sport
// (vélo : radar · power · compare · climbs · races ; course : radar).
type View = 'profil' | 'year' | 'tests' | `sport:${RecordSport}` | `sport:${RecordSport}:${string}`

interface PR { sport: string; distance_label: string; performance: string; achieved_at: string }
const NUM: React.CSSProperties = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'zero' 0" }
const SPORTS: { id: RecordSport; key: string }[] = [
  { id: 'bike', key: 'perf2.bike' }, { id: 'run', key: 'perf2.run' }, { id: 'swim', key: 'perf2.swimming' },
  { id: 'rowing', key: 'perf2.rowing' }, { id: 'triathlon', key: 'Triathlon' }, { id: 'hyrox', key: 'Hyrox' }, { id: 'gym', key: 'perf2.gymShort' },
]
const I = (d: string) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
const IC = {
  profil: I('M22 12h-4l-3 9L9 3l-3 9H2'),
  power: I('m3 17 6-6 4 4 8-8M14 7h7v7'),
  trophy: I('M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M18 2H6v7a6 6 0 0 0 12 0V2z'),
  trend: I('M3 3v18h18M7 16v-4M12 16V8M17 16v-7'),
  test: I('M9 11l3 3 8-8M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'),
  mountain: I('m8 3 4 8 5-5 5 15H2L8 3z'),
}

const toSec = (t: string) => { const p = (t || '').split(':').map(Number); if (p.some(isNaN)) return 0; return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : 0 }
const watts = (t: string) => parseInt(t, 10) || 0
const fmtPace = (s: number | null) => s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : ''
const shortDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' })

/** Meilleure perf d'un label (plus haut = mieux pour les watts/kg, plus bas pour les temps). */
function best(rows: PR[], label: string, higher: boolean, year?: string): PR | null {
  const r = rows.filter(x => x.distance_label === label && x.performance && x.performance !== '—' && (!year || x.achieved_at.startsWith(year)))
  if (!r.length) return null
  const val = (x: PR) => higher ? watts(x.performance) : toSec(x.performance)
  return r.reduce((a, b) => (higher ? val(b) > val(a) : (val(b) > 0 && val(b) < val(a))) ? b : a)
}

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const W = 96, H = 50, mn = Math.min(...values), mx = Math.max(...values), rg = mx - mn || 1
  const pts = values.map((v, i) => `${(3 + (i / (values.length - 1)) * (W - 6)).toFixed(1)},${(H - 4 - ((v - mn) / rg) * (H - 8)).toFixed(1)}`)
  return <svg width={W} height={H}><polyline points={pts.join(' ')} fill="none" stroke="var(--primary)" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" /></svg>
}

function RecRow({ label, value, sub, right2, pr, first }: { label: string; value: string; sub: string; right2?: string; pr?: boolean; first: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: first ? 'none' : '1px solid var(--dash-line, var(--border))' }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <b style={{ display: 'block', fontSize: 15, color: 'var(--text)' }}>{label}</b>
        <span style={{ display: 'block', fontSize: 13, color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>
      </span>
      <span style={{ textAlign: 'right', flexShrink: 0 }}>
        <b style={{ ...NUM, display: 'block', fontSize: 16, color: 'var(--text)' }}>{value}{pr && <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--charge-mid)', marginLeft: 4 }}>PR</span>}</b>
        {right2 && <span style={{ ...NUM, display: 'block', fontSize: 12, color: 'var(--text-mid)' }}>{right2}</span>}
      </span>
    </div>
  )
}

export function MobilePerformance({ profile, setProfile, profileNode, testsNode, yearNode, renderSport, initialView }: {
  profile: PerfProfile
  setProfile: (p: PerfProfile) => void
  profileNode: React.ReactNode
  testsNode: React.ReactNode
  yearNode: React.ReactNode
  /** Page détail d'un sport ; `section` = sous-page, `nav` ouvre une sous-page enfant. */
  renderSport: (s: RecordSport, section: string | undefined, nav: (section: string) => void) => React.ReactNode
  initialView?: 'tests' | null
}) {
  const { t } = useI18n()
  const [view, open, close] = useDetailView<View>()
  const [sport, setSport] = useState<RecordSport>(() => {
    try { const v = localStorage.getItem('thw_perf_sport'); if (v && SPORTS.some(s => s.id === v)) return v as RecordSport } catch { /* ignore */ }
    return 'bike'
  })
  useEffect(() => { try { localStorage.setItem('thw_perf_sport', sport) } catch { /* ignore */ } }, [sport])
  const [prs, setPrs] = useState<PR[]>([])
  const [climbs, setClimbs] = useState<{ name: string; wpkg: number; score: number | null; date: string }[]>([])
  const [races, setRaces] = useState<{ name: string; wpkg_np: number | null; date: string }[]>([])
  const [hyrox, setHyrox] = useState<{ temps_final: string; date: string; format: string }[]>([])
  const [yearHours, setYearHours] = useState<Record<string, number>>({})
  const [nextTest, setNextTest] = useState<{ title: string; date: string } | null>(null)

  // Lien direct ?tab=tests → on ouvre l'onglet Tests.
  useEffect(() => { if (initialView === 'tests') open('tests') }, [initialView, open])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const sb = createClient()
      const uid = await resolvePlanningUid(sb)
      if (!uid) return
      const since = `${new Date().getFullYear() - 3}-01-01`
      const today = new Date().toISOString().slice(0, 10)
      const [pr, cl, rc, hx, act, perf, prof, ev] = await Promise.all([
        sb.from('personal_records').select('sport, distance_label, performance, achieved_at').eq('user_id', uid),
        sb.from('climb_records').select('name, wpkg, score, date').eq('user_id', uid),
        sb.from('race_records').select('name, wpkg_np, date').eq('user_id', uid),
        sb.from('hyrox_races').select('temps_final, date, format').eq('user_id', uid),
        sb.from('activities').select('started_at, moving_time_s').eq('user_id', uid).gte('started_at', since).limit(5000),
        sb.from('athlete_performance_profile').select('ftp_watts, hr_max, hr_rest, lthr_run, threshold_pace_s_km, css_s_100m, vma_km_h, vo2max_ml_kg_min, age_years').eq('user_id', uid).maybeSingle(),
        sb.from('profiles').select('weight_kg').eq('id', uid).maybeSingle(),
        sb.from('calendar_events').select('title, date').eq('user_id', uid).eq('category', 'test').gte('date', today).order('date').limit(1),
      ])
      if (cancelled) return
      setPrs((pr.data as PR[] | null) ?? [])
      setClimbs((cl.data as typeof climbs | null) ?? [])
      setRaces((rc.data as typeof races | null) ?? [])
      setHyrox((hx.data as typeof hyrox | null) ?? [])
      const yh: Record<string, number> = {}
      for (const a of (act.data as { started_at: string; moving_time_s: number | null }[] | null) ?? []) {
        const y = a.started_at.slice(0, 4); yh[y] = (yh[y] ?? 0) + (Number(a.moving_time_s) || 0) / 3600
      }
      setYearHours(yh)
      const e = (ev.data as { title: string; date: string }[] | null)?.[0]
      setNextTest(e ?? null)
      const p = perf.data as Record<string, number | null> | null
      const w = (prof.data as { weight_kg: number | null } | null)?.weight_kg ?? 0
      if (p || w) {
        const pace = p?.threshold_pace_s_km ?? null, css = p?.css_s_100m ?? null
        setProfile({
          ...profile,
          ftp: p?.ftp_watts ?? profile.ftp, hrMax: p?.hr_max ?? profile.hrMax, hrRest: p?.hr_rest ?? profile.hrRest,
          lthr: p?.lthr_run ?? profile.lthr, vma: p?.vma_km_h ?? profile.vma, vo2max: p?.vo2max_ml_kg_min ?? profile.vo2max,
          age: p?.age_years ?? profile.age, weight: w || profile.weight,
          thresholdPace: pace ? fmtPace(pace) : profile.thresholdPace, css: css ? fmtPace(css) : profile.css,
        })
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ouvre la page du sport courant (ou une de ses sous-pages).
  const openSport = (section?: string) => open(section ? `sport:${sport}:${section}` : `sport:${sport}`)

  if (view) {
    const [, spId, section] = view.startsWith('sport:') ? view.split(':') as [string, RecordSport, string | undefined] : ['', null, undefined]
    const sportLabel = spId ? t(SPORTS.find(s => s.id === spId)?.key ?? '') : ''
    const label = view === 'profil' ? t('perf.m.myProfile') : view === 'year' ? t('perf.m.evolution') : view === 'tests' ? 'Tests'
      : section === 'compare' ? t('perf2.compareYears') : sportLabel
    // Lien retour : la page parente (le sport pour ses sous-pages, la courbe pour « Comparer »).
    const backLabel = !spId ? 'Performance' : section === 'compare' ? t('perf.m.powerCurve') : sportLabel
    const body = view === 'profil' ? profileNode : view === 'year' ? yearNode : view === 'tests' ? testsNode
      : spId ? renderSport(spId, section, (sec: string) => open(`sport:${spId}:${sec}`)) : null
    // Profil, Tests, pages sport & Évolution ont tous leur rendu mobile natif
    // en cartes (plus d'habillage .thw-mdetail des anciens onglets).
    return (
      <div style={{ padding: '14px 16px 24px', fontFamily: 'var(--font-body)' }}>
        <DetailSlide backLabel={backLabel} onBack={close}>
          <h2 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{label}</h2>
          {body}
        </DetailSlide>
      </div>
    )
  }

  const y = String(new Date().getFullYear()), py = String(new Date().getFullYear() - 1)
  const bySport = (s: string) => prs.filter(r => r.sport === s)
  const wkg = (w: number) => profile.weight > 0 ? `${(w / profile.weight).toFixed(1).replace('.', ',')} W/kg` : ''
  const prevOf = (rows: PR[], label: string, higher: boolean) => {
    const cur = best(rows, label, higher)
    if (!cur) return null
    const prev = best(rows.filter(r => r.achieved_at.slice(0, 4) < cur.achieved_at.slice(0, 4)), label, higher)
    return prev
  }
  const chips = (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
      {SPORTS.map(s => (
        <button key={s.id} type="button" onClick={() => setSport(s.id)}
          style={{ padding: '8px 14px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
            background: sport === s.id ? 'var(--text)' : 'var(--dash-card, var(--bg-card))', color: sport === s.id ? 'var(--bg)' : 'var(--text-mid)' }}>{t(s.key)}</button>
      ))}
    </div>
  )

  // ── Cartes par sport ───────────────────────────────────────────
  let sportCards: React.ReactNode = null
  const radarHint = { ftp: profile.ftp, weight: profile.weight, vma: profile.vma, vo2max: profile.vo2max, thresholdPace: profile.thresholdPace }
  if (sport === 'bike') {
    const bike = bySport('bike')
    const b20 = best(bike, '20min', true), b20y = best(bike, '20min', true, y), b20p = best(bike, '20min', true, py)
    const curve = ['10s', '30s', '1min', '3min', '5min', '10min', '20min', '30min', '1h', '2h'].map(l => watts(best(bike, l, true)?.performance ?? '0')).filter(v => v > 0)
    const rows = ['5min', '20min', '1h'].map(l => ({ l, b: best(bike, l, true), p: prevOf(bike, l, true) })).filter(r => r.b)
    const bestClimb = [...climbs].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]
    const bestRace = [...races].filter(r => r.wpkg_np).sort((a, b) => (b.wpkg_np ?? 0) - (a.wpkg_np ?? 0))[0]
    const d20 = b20y && b20p ? watts(b20y.performance) - watts(b20p.performance) : null
    sportCards = <>
      <CyclingRadar profile={radarHint} compact onOpen={() => openSport('radar')} />
      <DashCard icon={IC.power} title={t('perf.m.powerCurve')} meta={y} onOpen={() => openSport('power')}>
        {b20 ? <Metric label={t('perf.m.best20')} value={watts(b20.performance)} unit="W"
          {...(d20 != null && d20 !== 0 ? { chip: `${d20 > 0 ? '▲' : '▼'} ${Math.abs(d20)} W`, chipColor: d20 > 0 ? 'var(--success)' : 'var(--charge-hard)' } : {})}
          sub={[wkg(watts(b20.performance)), d20 != null ? t('perf.m.vsYear', { y: py }) : null].filter(Boolean).join(' · ')} right={<Spark values={curve} />} />
          : <p style={{ margin: 0, fontSize: 15, color: 'var(--text-mid)' }}>{t('perf.m.noPower')}</p>}
      </DashCard>
      <DashCard icon={IC.trophy} title={t('perf.m.records')} meta={t('perf.m.powerCount')} onOpen={() => openSport('power')}>
        {rows.length ? rows.map((r, i) => <RecRow key={r.l} first={i === 0} label={r.l} value={`${watts(r.b!.performance)} W`} right2={wkg(watts(r.b!.performance))}
          sub={`${shortDate(r.b!.achieved_at)}${r.p ? ` · ${t('perf.m.prev')} ${watts(r.p.performance)} W` : ''}`} pr={!!r.p && watts(r.b!.performance) > watts(r.p.performance)} />)
          : <p style={{ margin: 0, fontSize: 15, color: 'var(--text-mid)' }}>{t('perf.m.noRecord')}</p>}
      </DashCard>
      <DashCard icon={IC.mountain} title={t('perf.m.climbs')} meta={climbs.length ? String(climbs.length) : undefined} onOpen={() => openSport('climbs')}>
        {bestClimb ? <Metric label={t('perf.m.bestScore')} value={bestClimb.score ?? '—'} unit="/ 100" sub={`${bestClimb.name} · ${String(bestClimb.wpkg).replace('.', ',')} W/kg`} />
          : <p style={{ margin: 0, fontSize: 15, color: 'var(--text-mid)' }}>{t('perf.m.noClimb')}</p>}
      </DashCard>
      <DashCard icon={IC.trophy} title={t('perf.m.bikeRaces')} meta={races.length ? String(races.length) : undefined} onOpen={() => openSport('races')}>
        {bestRace ? <Metric label={t('perf.m.bestNp')} value={String(bestRace.wpkg_np).replace('.', ',')} unit="W/kg" sub={`${bestRace.name} · ${shortDate(bestRace.date)}`} />
          : <p style={{ margin: 0, fontSize: 15, color: 'var(--text-mid)' }}>{t('perf.m.noRace')}</p>}
      </DashCard>
    </>
  } else if (sport === 'run' || sport === 'swim' || sport === 'rowing') {
    const rows = bySport(sport)
    const labels = sport === 'run' ? ['5km', '10km', 'Semi', 'Marathon'] : sport === 'swim' ? ['100m', '400m', '1500m'] : ['500m', '2000m', '5000m']
    const list = labels.map(l => ({ l, b: best(rows, l, false), p: prevOf(rows, l, false) })).filter(r => r.b).slice(0, 4)
    const per = (l: string, sec: number) => {
      const m = sport === 'run' ? ({ '5km': 5, '10km': 10, Semi: 21.0975, Marathon: 42.195 } as Record<string, number>)[l] : null
      if (sport === 'run' && m) return `${fmtPace(sec / m)} /km`
      if (sport === 'swim') { const d = parseInt(l, 10); return d ? `${fmtPace(sec / (d / 100))} /100 m` : '' }
      const d = parseInt(l, 10); return d ? `${fmtPace(sec / (d / 500))} /500 m` : ''
    }
    sportCards = <>
      {sport === 'run' && <RunningRadar profile={radarHint} compact onOpen={() => openSport('radar')} />}
      <DashCard icon={IC.trophy} title={t('perf.m.records')} onOpen={() => openSport()}>
        {list.length ? list.map((r, i) => <RecRow key={r.l} first={i === 0} label={r.l} value={r.b!.performance} right2={per(r.l, toSec(r.b!.performance))}
          sub={`${shortDate(r.b!.achieved_at)}${r.p ? ` · ${t('perf.m.prev')} ${r.p.performance}` : ''}`} pr={!!r.p && toSec(r.b!.performance) < toSec(r.p.performance)} />)
          : <p style={{ margin: 0, fontSize: 15, color: 'var(--text-mid)' }}>{t('perf.m.noRecord')}</p>}
        {sport === 'run' && <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--text-dim)' }}>{t('perf.m.racesOnly')}</p>}
      </DashCard>
    </>
  } else if (sport === 'triathlon') {
    const tri = bySport('triathlon')
    sportCards = <>
      <TriathlonRadar profile={radarHint} format="703" compact onOpen={() => openSport()} />
      <DashCard icon={IC.trophy} title={t('perf.m.races')} meta={tri.length ? String(tri.length) : undefined} onOpen={() => openSport()}>
        {tri.length ? tri.slice().sort((a, b) => b.achieved_at.localeCompare(a.achieved_at)).slice(0, 3).map((r, i) => <RecRow key={i} first={i === 0} label={r.distance_label === '703' ? '70.3' : r.distance_label} value={r.performance} sub={shortDate(r.achieved_at)} />)
          : <p style={{ margin: 0, fontSize: 15, color: 'var(--text-mid)' }}>{t('perf.m.noRace')}</p>}
      </DashCard>
    </>
  } else if (sport === 'hyrox') {
    const bestH = [...hyrox].filter(h => toSec(h.temps_final) > 0).sort((a, b) => toSec(a.temps_final) - toSec(b.temps_final))[0]
    sportCards = <>
      <HyroxRadar compact onOpen={() => openSport()} />
      <DashCard icon={IC.trophy} title={t('perf.m.hyroxRaces')} meta={hyrox.length ? String(hyrox.length) : undefined} onOpen={() => openSport()}>
        {bestH ? <Metric label={t('perf.m.bestTime')} value={bestH.temps_final} sub={`${bestH.format} · ${shortDate(bestH.date)}`} />
          : <p style={{ margin: 0, fontSize: 15, color: 'var(--text-mid)' }}>{t('perf.m.noRace')}</p>}
      </DashCard>
      <DashCard icon={IC.test} title={t('perf.m.hyroxTests')} onOpen={() => openSport()}>
        <p style={{ margin: 0, fontSize: 15, color: 'var(--text-mid)' }}>{t('perf.m.hyroxTestsHint')}</p>
      </DashCard>
    </>
  } else {
    const gym = bySport('gym').filter(r => watts(r.performance) > 0)
    const top = [...new Map(gym.sort((a, b) => watts(b.performance) - watts(a.performance)).map(r => [r.distance_label, r])).values()].slice(0, 4)
    sportCards = (
      <DashCard icon={IC.trophy} title={t('perf.m.records')} meta={gym.length ? String(top.length) : undefined} onOpen={() => openSport()}>
        {top.length ? top.map((r, i) => <RecRow key={r.distance_label} first={i === 0} label={r.distance_label} value={r.performance} sub={shortDate(r.achieved_at)} />)
          : <p style={{ margin: 0, fontSize: 15, color: 'var(--text-mid)' }}>{t('perf.m.noRecord')}</p>}
      </DashCard>
    )
  }

  const years = Object.keys(yearHours).sort().slice(-4)
  const cur = yearHours[y] ?? 0, prev = yearHours[py] ?? 0
  const dY = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null
  const val = (v: number | string | null | undefined, u: string) => (v && v !== 0 ? <>{typeof v === 'number' ? v.toLocaleString(currentLocale(), { maximumFractionDigits: 1 }) : v}<small style={{ fontSize: 14, color: 'var(--text-mid)', fontWeight: 700 }}> {u}</small></> : '—')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px 24px', fontFamily: 'var(--font-body)' }}>
      <DashCard icon={IC.profil} title={t('perf.m.myProfile')} onOpen={() => open('profil')}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px 16px' }}>
          {([['FTP', val(profile.ftp, 'W')], ['VMA', val(profile.vma, 'km/h')], [t('performance.hrMax'), val(profile.hrMax, 'bpm')], [t('performance.thresholdPace'), val(profile.thresholdPace, '/km')]] as [string, React.ReactNode][]).map(([l, v]) => (
            <div key={l} style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-mid)' }}>{l}</p>
              <p style={{ ...NUM, margin: '2px 0 0', fontSize: 24, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap' }}>{v}</p>
            </div>
          ))}
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 14, color: 'var(--text-mid)' }}>{t('perf.m.profileHint')}</p>
      </DashCard>

      {chips}
      {sportCards}

      <DashCard icon={IC.trend} title={t('perf.m.evolution')} meta={t('perf.m.allYears')} onOpen={() => open('year')}>
        <Metric label={y} value={Math.round(cur)} unit="h"
          {...(dY != null && dY !== 0 ? { chip: `${dY > 0 ? '▲' : '▼'} ${Math.abs(dY)} %`, chipColor: dY > 0 ? 'var(--success)' : 'var(--charge-hard)' } : {})}
          sub={dY != null ? t('perf.m.vsYear', { y: py }) : undefined}
          right={years.length > 1 ? <MiniBars values={years.map(k => Math.round(yearHours[k]))} highlight={years.length - 1} /> : undefined} />
      </DashCard>

      <DashCard icon={IC.test} title="Tests" meta={t('perf.m.history')} onOpen={() => open('tests')}>
        {nextTest
          ? <>
              <p style={{ margin: '0 0 4px', fontSize: 15, color: 'var(--text-mid)' }}>{t('perf.m.nextTest')}</p>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>{nextTest.title}</p>
              <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-mid)' }}>{new Date(nextTest.date + 'T12:00:00').toLocaleDateString(currentLocale(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </>
          : <Metric label={t('perf.m.catalogue')} value={TESTS.running.length + TESTS.cycling.length + TESTS.natation.length + TESTS.aviron.length + TESTS.hyrox.length} unit="tests" sub={t('perf.m.catalogueHint')} />}
      </DashCard>
    </div>
  )
}
