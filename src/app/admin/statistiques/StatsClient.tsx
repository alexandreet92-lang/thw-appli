'use client'

// Page Statistiques (admin). SVG brut, aucune lib de charts. Données : /api/admin/stats.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import type { StatsPayload, Kpi, Share, Step } from '@/lib/stats/types'
import { lng, makeT, type Lng } from './labels'

type T = ReturnType<typeof makeT>
type Tab = 'overview' | 'traffic' | 'tests' | 'retention' | 'qr'
const TABS: Tab[] = ['overview', 'traffic', 'tests', 'retention', 'qr']
const RANGES = [7, 30, 90, 0]
const COL = { brand: 'var(--primary)', indigo: 'var(--ai-accent)', gold: 'var(--charge-mid)' }
const LOCALE: Record<Lng, string> = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES', it: 'it-IT', de: 'de-DE' }

// ── Primitives ────────────────────────────────────────────────────
function Tag({ live, t }: { live: boolean; t: T }) {
  return <span className={'st-tag ' + (live ? 'live' : 'meas')}>{t(live ? 'live' : 'meas')}</span>
}
function Card({ title, hint, live, t, children, span }: { title: string; hint?: string; live?: boolean; t: T; children: React.ReactNode; span?: boolean }) {
  return (
    <div className="st-card" style={span ? { gridColumn: '1 / -1' } : undefined}>
      <div className="st-hd">
        <div><h3>{title}</h3>{hint && <p className="st-hint">{hint}</p>}</div>
        {live !== undefined && <Tag live={live} t={t} />}
      </div>
      {children}
    </div>
  )
}
function Empty({ t, text }: { t: T; text?: string }) { return <p className="st-empty">{text ?? t('nodata')}</p> }

function Spark({ v, color }: { v: number[]; color: string }) {
  if (v.length < 2) return null
  const W = 200, H = 34, mx = Math.max(...v), mn = Math.min(...v)
  const pts = v.map((x, i) => `${(i / (v.length - 1)) * W},${H - 3 - ((x - mn) / (mx - mn || 1)) * (H - 8)}`).join(' ')
  return <svg viewBox={`0 0 ${W} ${H}`} className="st-spark" preserveAspectRatio="none"><polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" /></svg>
}

function fmtVal(k: Kpi, loc: string): string {
  const n = (x: number, d = 0) => x.toLocaleString(loc, { maximumFractionDigits: d, minimumFractionDigits: d })
  if (k.format === 'pct') return `${n(k.value, 0)} %`
  if (k.format === 'pct1') return `${n(k.value, 1)} %`
  return n(k.value)
}
function KpiCard({ k, t, loc, color }: { k: Kpi; t: T; loc: string; color?: string }) {
  let delta: React.ReactNode = null
  if (k.prev != null) {
    const isPct = k.format !== 'int'
    const diff = isPct ? k.value - k.prev : k.prev === 0 ? (k.value === 0 ? 0 : 100) : ((k.value - k.prev) / k.prev) * 100
    const cls = Math.abs(diff) < 0.05 ? 'fl' : diff > 0 ? 'up' : 'dn'
    const sign = diff > 0 ? '+' : diff < 0 ? '−' : ''
    const txt = isPct ? `${sign}${Math.abs(diff).toLocaleString(loc, { maximumFractionDigits: 1 })} ${t('pts')}` : `${sign}${Math.abs(diff).toLocaleString(loc, { maximumFractionDigits: 0 })} %`
    delta = <span className={'st-d ' + cls}>{txt} {t('vsprev')}</span>
  }
  return (
    <div className="st-card st-kpi">
      <small>{t(k.key)}</small>
      <b>{fmtVal(k, loc)}</b>
      {delta ?? (k.key === 'visitors' ? <span className="st-d fl">{t('visitors_h')}</span> : <span className="st-d fl">&nbsp;</span>)}
      {k.series && <Spark v={k.series} color={color ?? COL.brand} />}
    </div>
  )
}

// Courbe(s) avec infobulle au survol.
function Lines({ days, series, h = 170, loc }: { days: string[]; series: { v: number[]; c: string; name: string }[]; h?: number; loc: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 760, L = 40, R = 14, T0 = 14, B = 26, n = days.length
  const mx = Math.max(4, Math.ceil((Math.max(1, ...series.flatMap(s => s.v)) * 1.1) / 4) * 4)
  const X = (i: number) => L + (n > 1 ? (i / (n - 1)) * (W - L - R) : 0)
  const Y = (v: number) => T0 + (1 - v / mx) * (h - T0 - B)
  const step = Math.max(1, Math.ceil(n / 8))
  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${h}`} className="st-svg" onMouseLeave={() => setHover(null)}
        onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); const x = ((e.clientX - r.left) / r.width) * W; setHover(Math.max(0, Math.min(n - 1, Math.round(((x - L) / (W - L - R)) * (n - 1))))) }}>
        {[0, 1, 2, 3, 4].map(k => { const v = (mx * k) / 4; return <g key={k}><line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} className="st-gl" /><text x={L - 8} y={Y(v) + 4} textAnchor="end">{Math.round(v)}</text></g> })}
        {days.map((d, i) => (i % step === 0 ? <text key={d} x={X(i)} y={h - 6} textAnchor="middle">{d.slice(5).replace('-', '/')}</text> : null))}
        {series.map(s => <polyline key={s.name} fill="none" stroke={s.c} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" points={s.v.map((v, i) => `${X(i)},${Y(v)}`).join(' ')} />)}
        {hover != null && <g><line x1={X(hover)} x2={X(hover)} y1={T0} y2={h - B} className="st-cross" />{series.map(s => <circle key={s.name} cx={X(hover)} cy={Y(s.v[hover] ?? 0)} r={4} fill={s.c} />)}</g>}
      </svg>
      {hover != null && (
        <div className="st-tip" style={{ left: `${(X(hover) / W) * 100}%` }}>
          <b>{new Date(days[hover] + 'T12:00:00').toLocaleDateString(loc, { day: 'numeric', month: 'short' })}</b>
          {series.map(s => <span key={s.name}><i style={{ background: s.c }} />{s.name} : {(s.v[hover] ?? 0).toLocaleString(loc)}</span>)}
        </div>
      )}
    </div>
  )
}
function Legend({ items }: { items: { c: string; name: string }[] }) {
  return <div className="st-legend">{items.map(i => <span key={i.name}><i style={{ background: i.c }} />{i.name}</span>)}</div>
}

function Funnel({ steps, label, loc, t, prefix }: { steps: Step[]; label: (k: string) => { name: string; desc: string }; loc: string; t: T; prefix: string }) {
  const top = steps[0]?.count ?? 0
  if (!top) return <Empty t={t} text={t('none')} />
  return (
    <div className="st-fun">
      {steps.map((s, i) => {
        const l = label(prefix + s.key)
        const p = i ? (steps[i - 1].count ? Math.round((s.count / steps[i - 1].count) * 100) : 0) : 100
        return (
          <div className="st-frow" key={s.key}>
            <div className="st-flab"><b>{l.name}</b><span>{l.desc}</span></div>
            <div className="st-track"><i style={{ width: `${Math.max((s.count / top) * 100, 2)}%` }} /></div>
            <div className="st-fval">{s.count.toLocaleString(loc)}<em>{i ? `${p} % ${t('of_prev')}` : '100 %'}</em></div>
          </div>
        )
      })}
    </div>
  )
}

function Split({ rows, name, colors }: { rows: Share[]; name: (k: string) => string; colors?: string[] }) {
  const tot = rows.reduce((s, r) => s + r.value, 0)
  const pal = colors ?? [COL.brand, COL.indigo, COL.gold, 'var(--charge-low)', 'var(--text-dim)', 'var(--charge-hard)']
  if (!tot) return null
  return (
    <>
      <div className="st-split">{rows.map((r, i) => <i key={r.key} style={{ width: `${(r.value / tot) * 100}%`, background: pal[i % pal.length] }} />)}</div>
      <div className="st-legend">{rows.map((r, i) => <span key={r.key}><i style={{ background: pal[i % pal.length] }} />{name(r.key)} · {Math.round((r.value / tot) * 100)} %</span>)}</div>
    </>
  )
}
function Bars({ rows, name, unit = '', color = COL.brand, max }: { rows: { key: string; value: number }[]; name: (k: string) => string; unit?: string; color?: string; max?: number }) {
  const m = max ?? Math.max(1, ...rows.map(r => r.value))
  return (
    <div className="st-bars">
      {rows.map(r => (
        <div key={r.key}>
          <div className="st-brow"><span>{name(r.key)}</span><b>{r.value.toLocaleString()}{unit}</b></div>
          <div className="st-bar"><i style={{ width: `${(r.value / m) * 100}%`, background: color }} /></div>
        </div>
      ))}
    </div>
  )
}

function Table({ head, rows, num, sortable }: { head: string[]; rows: (string | number)[][]; num?: number[]; sortable?: boolean }) {
  const [sort, setSort] = useState<{ i: number; dir: 1 | -1 } | null>(null)
  const data = useMemo(() => {
    if (!sort) return rows
    return [...rows].sort((a, b) => { const x = a[sort.i], y = b[sort.i]; return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * sort.dir })
  }, [rows, sort])
  return (
    <div className="st-tw">
      <table>
        <thead><tr>{head.map((h, i) => <th key={h + i} className={num?.includes(i) ? 'num' : ''} onClick={sortable ? () => setSort(s => ({ i, dir: s && s.i === i ? (s.dir === 1 ? -1 : 1) : -1 })) : undefined} style={sortable ? { cursor: 'pointer' } : undefined}>{h}</th>)}</tr></thead>
        <tbody>{data.map((r, ri) => <tr key={ri}>{r.map((c, i) => <td key={i} className={num?.includes(i) ? 'num' : ''}>{typeof c === 'number' ? c.toLocaleString() : c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

function Heat({ grid, t, loc }: { grid: number[][]; t: T; loc: string }) {
  const mx = Math.max(1, ...grid.flat())
  return (
    <div className="st-heatw">
      <div className="st-heat">
        <span />
        {Array.from({ length: 24 }, (_, h) => <em key={h}>{h % 3 === 0 ? h : ''}</em>)}
        {grid.map((row, d) => (
          <div key={d} style={{ display: 'contents' }}>
            <em className="st-wd">{t('wd' + d)}</em>
            {row.map((v, h) => <i key={h} title={`${t('wd' + d)} ${h} h · ${v.toLocaleString(loc)}`} style={{ background: v ? `color-mix(in srgb, var(--primary) ${Math.round(12 + (v / mx) * 78)}%, transparent)` : 'var(--border)' }} />)}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────
export function StatsClient() {
  const { lang } = useI18n()
  const [l, setL] = useState<Lng>('fr')
  useEffect(() => { setL(lng(lang)) }, [lang])
  const t = useMemo(() => makeT(l), [l])
  const loc = LOCALE[l]

  const [tab, setTab] = useState<Tab>('overview')
  const [range, setRange] = useState(30)
  const [data, setData] = useState<StatsPayload | null>(null)
  const [err, setErr] = useState(false)
  const [cmp, setCmp] = useState(true)
  const [excluded, setExcluded] = useState(false)

  useEffect(() => { try { setExcluded(window.localStorage.getItem('thw_no_track') === '1') } catch { /* ignore */ } }, [])
  const load = useCallback(async (r: number) => {
    setErr(false)
    try {
      const rep = await fetch(`/api/admin/stats?range=${r}`)
      if (!rep.ok) throw new Error('http')
      setData((await rep.json()) as StatsPayload)
    } catch { setErr(true) }
  }, [])
  useEffect(() => { setData(null); void load(range) }, [range, load])

  const toggleTrack = () => {
    try { if (excluded) window.localStorage.removeItem('thw_no_track'); else window.localStorage.setItem('thw_no_track', '1') } catch { /* ignore */ }
    setExcluded(!excluded)
  }

  const kp = (ks: Kpi[]) => ks.map(k => ({ ...k, prev: cmp ? k.prev : null }))
  const srcName = (k: string) => (t('s_' + k) === 's_' + k ? k : t('s_' + k))
  const stepLabel = (k: string) => ({ name: t(k), desc: t(k + '_d') })
  const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric' }) : '')
  const noHits = !!data && data.tracking.hits === 0

  const exportCsv = () => {
    if (!data) return
    const rows: (string | number)[][] = []
    const add = (title: string, head: string[], body: (string | number)[][]) => { rows.push([title], head, ...body, []) }
    const o = data.overview
    add(t('title') + ' · ' + t('t_overview'), ['KPI', 'value', 'previous'], o.kpis.map(k => [t(k.key), k.value, k.prev ?? '']))
    add(t('c_src'), [t('col_source'), t('col_sessions'), t('col_signups')], o.sources.map(s => [srcName(s.source), s.sessions, s.signups]))
    add(t('c_pages'), [t('col_page'), t('col_views'), t('col_visitors')], data.traffic.pages.map(p => [p.path, p.views, p.visitors]))
    add(t('c_ttab'), [t('col_test'), t('col_started'), t('col_completed'), t('col_inprogress'), t('col_abandoned')], data.tests.table.map(r => [r.test, r.started, r.completed, r.inProgress, r.abandoned]))
    add(t('c_cohort'), [t('col_week'), t('col_size'), 'W0', 'W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7'], data.retention.cohorts.map(c => [c.week, c.size, ...c.cells.map(x => x ?? '')]))
    add(t('c_qr'), [t('col_venue'), t('col_opens'), t('col_finished'), t('col_accounts')], data.qr.rows.map(r => [r.name, r.opens, r.finished, r.accounts]))
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `thw-stats-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="st-root">
      <style>{CSS}</style>
      <div className="st-wrap">
        <header className="st-top">
          <div>
            <div className="st-eye">{t('eye')}</div>
            <h1>{t('title')}</h1>
            <p className="st-sub">{t('sub')}</p>
          </div>
          <div className="st-ctl">
            <div className="st-seg" role="group" aria-label={t('range')}>
              {RANGES.map(r => <button key={r} aria-pressed={range === r} onClick={() => setRange(r)}>{t(r === 0 ? 'rAll' : 'r' + r)}</button>)}
            </div>
            <button className="st-btn" aria-pressed={cmp} onClick={() => setCmp(!cmp)} data-on={cmp}>{t('compare')}</button>
            <button className="st-btn" onClick={exportCsv} disabled={!data}>{t('csv')}</button>
            <button className="st-btn" onClick={toggleTrack} title={excluded ? t('excluded') : t('tracked')}>{excluded ? t('excluded') : t('notrack')}</button>
          </div>
        </header>

        <div className="st-tabs" role="tablist">
          {TABS.map(k => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{t('t_' + k)}</button>)}
        </div>

        {err && <p className="st-empty">{t('error')}</p>}
        {!data && !err && <p className="st-empty">{t('loading')}</p>}
        {data && (
          <>
            <p className="st-note">{noHits ? t('none') : t('waiting', { d: fmtDate(data.tracking.since) })}</p>

            {tab === 'overview' && (
              <section>
                <div className="st-grid st-g4">{kp(data.overview.kpis).map((k, i) => <KpiCard key={k.key} k={k} t={t} loc={loc} color={k.key === 'accounts' ? COL.indigo : k.key === 'testsDone' ? COL.gold : COL.brand} />)}</div>
                <div className="st-grid st-g21" style={{ marginTop: 16 }}>
                  <Card title={t('c_daily')} hint={t('c_daily_h')} t={t}>
                    <Legend items={[{ c: COL.brand, name: t('l_visitors') }]} />
                    <Lines days={data.days} loc={loc} series={[{ v: data.overview.visitorsByDay, c: COL.brand, name: t('l_visitors') }]} />
                    <Legend items={[{ c: COL.indigo, name: t('l_accounts') }, { c: COL.gold, name: t('l_tests') }]} />
                    <Lines days={data.days} loc={loc} h={150} series={[{ v: data.overview.signupsByDay, c: COL.indigo, name: t('l_accounts') }, { v: data.overview.testsByDay, c: COL.gold, name: t('l_tests') }]} />
                  </Card>
                  <Card title={t('c_src')} hint={t('c_src_h')} live={false} t={t}>
                    {data.overview.sources.length === 0 ? <Empty t={t} text={t('none')} /> : (
                      <Table head={[t('col_source'), t('col_sessions'), t('col_signups')]} num={[1, 2]}
                        rows={data.overview.sources.map(s => [srcName(s.source), s.sessions, `${s.signups} · ${s.rate.toLocaleString(loc)} %`])} />
                    )}
                  </Card>
                </div>
                <div className="st-sec">{t('sec_site_app')}</div>
                <div className="st-grid st-g2">
                  <Card title={t('f_signup')} hint={t('f_signup_h')} live={false} t={t}><Funnel steps={data.overview.funnelSignup} label={stepLabel} loc={loc} t={t} prefix="fs_" /></Card>
                  <Card title={t('f_test')} hint={t('f_test_h')} live={false} t={t}><Funnel steps={data.overview.funnelTest} label={stepLabel} loc={loc} t={t} prefix="ft_" /></Card>
                </div>
              </section>
            )}

            {tab === 'traffic' && (
              <section>
                <div className="st-grid st-g21">
                  <Card title={t('c_pages')} hint={t('c_pages_h')} live={false} t={t}>
                    {data.traffic.pages.length === 0 ? <Empty t={t} text={t('none')} /> : (
                      <Table sortable num={[1, 2, 3, 4]} head={[t('col_page'), t('col_views'), t('col_visitors'), t('col_time'), t('col_exit')]}
                        rows={data.traffic.pages.map(p => [p.path, p.views, p.visitors, p.avgSec == null ? '—' : `${Math.floor(p.avgSec / 60)}:${String(Math.round(p.avgSec % 60)).padStart(2, '0')}`, `${p.exitPct.toLocaleString(loc)} %`])} />
                    )}
                  </Card>
                  <div className="st-grid" style={{ alignContent: 'start' }}>
                    <Card title={t('c_dev')} live={false} t={t}>{data.traffic.devices.length ? <Split rows={data.traffic.devices} name={k => (t('d_' + k) === 'd_' + k ? k : t('d_' + k))} /> : <Empty t={t} text={t('none')} />}</Card>
                    <Card title={t('c_lang')} live={false} t={t}>{data.traffic.langs.length ? <Bars rows={data.traffic.langs} name={k => k.toUpperCase()} /> : <Empty t={t} text={t('none')} />}</Card>
                    <Card title={t('c_brow')} hint={t('c_brow_h')} live={false} t={t}>{data.traffic.browsers.length ? <Bars rows={data.traffic.browsers} name={k => k} /> : <Empty t={t} text={t('none')} />}</Card>
                  </div>
                </div>
                <Card title={t('c_heat')} hint={t('c_heat_h')} live={false} t={t} span><Heat grid={data.traffic.heat} t={t} loc={loc} /></Card>
              </section>
            )}

            {tab === 'tests' && (
              <section>
                <div className="st-grid st-g4">{kp(data.tests.kpis).map(k => <KpiCard key={k.key} k={k} t={t} loc={loc} color={COL.gold} />)}</div>
                <div className="st-grid st-g2" style={{ marginTop: 16 }}>
                  <Card title={t('c_ttab')} hint={t('c_ttab_h')} live t={t}>
                    {data.tests.table.length === 0 ? <Empty t={t} /> : <Table num={[1, 2, 3, 4]} head={[t('col_test'), t('col_started'), t('col_completed'), t('col_inprogress'), t('col_abandoned')]} rows={data.tests.table.map(r => [t('n_' + r.test) === 'n_' + r.test ? r.test : t('n_' + r.test), r.started, r.completed, r.inProgress, r.abandoned])} />}
                  </Card>
                  <Card title={t('c_drop')} hint={t('c_drop_h')} live={false} t={t}>
                    {data.tests.drop.length === 0 ? <Empty t={t} text={t('none')} /> : <Bars rows={data.tests.drop.map(d => ({ key: d.key, value: d.count }))} name={k => t('st_' + k)} color={COL.gold} />}
                  </Card>
                </div>
                <div className="st-grid st-g3" style={{ marginTop: 16 }}>
                  <Card title={t('c_scores')} hint={t('c_scores_h')} live t={t}>{data.tests.scores.some(s => s.value) ? <Bars rows={data.tests.scores} name={k => k} /> : <Empty t={t} />}</Card>
                  <Card title={t('c_age')} hint={t('c_age_h')} live t={t}>{data.tests.ageBars.length ? <Bars rows={data.tests.ageBars.map(a => ({ key: `${a.band} (${a.n})`, value: a.avg }))} name={k => k} max={100} color={COL.indigo} /> : <Empty t={t} />}</Card>
                  <Card title={t('c_who')} hint={t('c_who_h')} live t={t}>
                    {data.tests.who.length ? <Split rows={data.tests.who} name={k => k} /> : <Empty t={t} />}
                    {data.tests.avgAge != null && <p className="st-hint" style={{ marginTop: 14 }}>{t('who_avg', { a: data.tests.avgAge, w: data.tests.avgWeight ?? '—', f: Math.round(data.tests.pctWomen ?? 0) })}</p>}
                  </Card>
                </div>
                <Card title={t('c_skip')} hint={t('c_skip_h')} live t={t} span>
                  {data.tests.skipped.length === 0 ? <Empty t={t} /> : <Table num={[1, 2, 3]} head={[t('col_event'), t('col_total'), t('col_skipped'), t('col_pct')]} rows={data.tests.skipped.map(s => [s.slug, s.total, s.skipped, `${s.pct.toLocaleString(loc)} %`])} />}
                </Card>
              </section>
            )}

            {tab === 'retention' && (
              <section>
                <div className="st-grid st-g4">{kp(data.retention.kpis).map(k => <KpiCard key={k.key} k={k} t={t} loc={loc} />)}</div>
                <Card title={t('c_cohort')} hint={t('c_cohort_h')} live t={t} span>
                  <div className="st-tw">
                    <table className="st-cohort">
                      <thead><tr><th>{t('col_week')}</th><th className="num">{t('col_size')}</th>{Array.from({ length: 8 }, (_, i) => <th key={i} className="num">S{i}</th>)}</tr></thead>
                      <tbody>
                        {data.retention.cohorts.map(c => (
                          <tr key={c.week}>
                            <td>{new Date(c.week + 'T12:00:00').toLocaleDateString(loc, { day: 'numeric', month: 'short' })}</td>
                            <td className="num">{c.size}</td>
                            {c.cells.map((v, i) => <td key={i} className="num st-cell" style={v == null ? undefined : { background: `color-mix(in srgb, var(--primary) ${Math.round(8 + (v / 100) * 70)}%, transparent)` }}>{v == null ? '' : `${Math.round(v)} %`}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
                <div className="st-grid st-g2" style={{ marginTop: 16 }}>
                  <Card title={t('c_active')} hint={t('c_active_h')} live={false} t={t}>
                    <Lines days={data.days} loc={loc} series={[{ v: data.retention.active.m, c: COL.brand, name: t('l_m') }, { v: data.retention.active.w, c: COL.indigo, name: t('l_w') }, { v: data.retention.active.d, c: COL.gold, name: t('l_d') }]} />
                    <Legend items={[{ c: COL.brand, name: t('l_m') }, { c: COL.indigo, name: t('l_w') }, { c: COL.gold, name: t('l_d') }]} />
                  </Card>
                  <Card title={t('c_first')} hint={t('c_first_h')} live t={t}>
                    <Bars rows={data.retention.firstWeek} name={k => t('a_' + k)} unit=" %" max={100} />
                  </Card>
                </div>
                <Card title={t('c_srcret')} hint={t('c_srcret_h')} live={false} t={t} span>
                  {data.retention.bySource.length === 0 ? <Empty t={t} text={t('none')} /> : (
                    <Table num={[1, 2, 3, 4]} head={[t('col_source'), t('col_signups'), t('col_eligible'), t('col_active7'), t('col_pct')]}
                      rows={data.retention.bySource.map(s => [srcName(s.source), s.signups, s.eligible, s.active7, s.pct == null ? '—' : `${s.pct.toLocaleString(loc)} %`])} />
                  )}
                </Card>
              </section>
            )}

            {tab === 'qr' && (
              <section>
                <div className="st-grid st-g4">{kp(data.qr.kpis).map(k => <KpiCard key={k.key} k={k} t={t} loc={loc} />)}</div>
                <Card title={t('c_qr')} hint={t('c_qr_h')} live t={t} span>
                  {data.qr.rows.length === 0 ? <Empty t={t} /> : (
                    <Table sortable num={[1, 2, 3, 4, 5]} head={[t('col_venue'), t('col_opens'), t('col_started'), t('col_finished'), t('col_accounts'), t('col_rate')]}
                      rows={data.qr.rows.map(r => [r.city ? `${r.name} · ${r.city}` : r.name, r.opens, r.started, r.finished, r.accounts, `${r.rate.toLocaleString(loc)} %`])} />
                  )}
                </Card>
                <div className="st-grid st-g2" style={{ marginTop: 16 }}>
                  <Card title={t('c_comm')} hint={t('c_comm_h')} live t={t}>
                    {data.qr.comments.length === 0 ? <Empty t={t} /> : (
                      <div className="st-comm">{data.qr.comments.map((c, i) => <blockquote key={i}>{c.text}<cite>{c.place} · {new Date(c.date).toLocaleDateString(loc, { day: 'numeric', month: 'short' })}</cite></blockquote>)}</div>
                    )}
                  </Card>
                  <Card title={t('c_qrday')} live t={t}>
                    <Lines days={data.days} loc={loc} series={[{ v: data.qr.byDay, c: COL.brand, name: t('c_qrday') }]} />
                  </Card>
                </div>
              </section>
            )}
          </>
        )}
        <p className="st-note" style={{ marginTop: 34 }}>{t('note_leg')}</p>
      </div>
    </div>
  )
}

const CSS = `
.st-root{height:100%;overflow-y:auto;background:var(--bg);color:var(--text);font-family:var(--font-body)}
.st-wrap{max-width:1280px;margin:0 auto;padding:0 28px 80px}
.st-top{display:flex;flex-wrap:wrap;gap:14px 24px;align-items:flex-end;justify-content:space-between;padding:30px 0 18px}
.st-eye{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--text-dim)}
.st-top h1{font-family:var(--font-display);font-weight:600;font-size:clamp(28px,3.6vw,38px);line-height:1.1;letter-spacing:-.02em;margin:8px 0 4px}
.st-sub{color:var(--text-mid);margin:0;max-width:62ch;font-size:14px;line-height:1.5}
.st-ctl{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.st-seg{display:inline-flex;border:1px solid var(--border);border-radius:var(--r-pill);overflow:hidden;background:var(--bg-card)}
.st-seg button{border:0;background:transparent;color:var(--text-mid);font:600 13px var(--font-body);padding:8px 14px;cursor:pointer}
.st-seg button[aria-pressed=true]{background:var(--text);color:var(--bg)}
.st-btn{border:1px solid var(--border);background:var(--bg-card);color:var(--text);font:600 13px var(--font-body);border-radius:var(--r-sm);padding:8px 14px;cursor:pointer}
.st-btn[data-on=true]{border-color:var(--primary);color:var(--primary)}
.st-btn:disabled{opacity:.5;cursor:default}
.st-tabs{display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:18px;overflow-x:auto}
.st-tabs button{border:0;background:none;color:var(--text-mid);font:600 14px var(--font-body);padding:12px 16px;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;margin-bottom:-1px}
.st-tabs button[aria-selected=true]{color:var(--text);border-bottom-color:var(--primary)}
.st-grid{display:grid;gap:16px}
.st-g4{grid-template-columns:repeat(4,minmax(0,1fr))}.st-g3{grid-template-columns:repeat(3,minmax(0,1fr))}.st-g2{grid-template-columns:repeat(2,minmax(0,1fr))}.st-g21{grid-template-columns:minmax(0,2fr) minmax(0,1fr)}
@media(max-width:980px){.st-g4{grid-template-columns:repeat(2,minmax(0,1fr))}.st-g3,.st-g2,.st-g21{grid-template-columns:minmax(0,1fr)}}
@media(max-width:560px){.st-wrap{padding:0 16px 60px}.st-g4{grid-template-columns:minmax(0,1fr)}}
section > .st-card{margin-top:16px}
.st-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-md);padding:20px;min-width:0}
.st-card h3{font:600 15px var(--font-body);margin:0}
.st-hd{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:14px}
.st-hint{color:var(--text-dim);font-size:12px;margin:2px 0 0;line-height:1.45}
.st-tag{font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;border:1px solid var(--border);border-radius:var(--r-pill);padding:3px 9px;white-space:nowrap;color:var(--text-mid)}
.st-tag.live{color:var(--charge-low);border-color:var(--charge-low)}.st-tag.meas{color:var(--primary);border-color:var(--primary)}
.st-kpi small{display:block;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--text-dim)}
.st-kpi b{display:block;font:600 32px/1.1 var(--font-display);margin:8px 0 6px;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.st-d{font-size:12px;font-weight:600}.st-d.up{color:var(--charge-low)}.st-d.dn{color:var(--charge-hard)}.st-d.fl{color:var(--text-dim);font-weight:500}
.st-spark{display:block;margin-top:10px;width:100%;height:34px}
.st-note{border:1px dashed var(--border);border-radius:var(--r-sm);padding:12px 14px;color:var(--text-mid);font-size:13px;line-height:1.5;margin:0 0 16px;background:var(--bg-card2)}
.st-empty{color:var(--text-dim);font-size:13px;line-height:1.5;margin:0}
.st-sec{font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--text-dim);margin:30px 0 12px}
.st-svg{display:block;width:100%;height:auto}
.st-svg text{font-family:var(--font-body);fill:var(--text-dim);font-size:11px}
.st-svg .st-gl{stroke:var(--border)}
.st-cross{stroke:var(--text-dim);stroke-dasharray:3 3}
.st-tip{position:absolute;top:0;transform:translateX(-50%);background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-sm);padding:8px 10px;font-size:12px;display:grid;gap:3px;pointer-events:none;white-space:nowrap;z-index:2}
.st-tip i,.st-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px}
.st-legend{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12px;color:var(--text-mid);margin:8px 0 4px}
.st-tw{overflow-x:auto}
.st-card table{width:100%;border-collapse:collapse;font-size:13px}
.st-card th{font-size:10.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--text-dim);text-align:left;padding:8px 10px;border-bottom:1px solid var(--border);white-space:nowrap;user-select:none}
.st-card td{padding:10px;border-bottom:1px solid var(--border)}
.st-card tr:last-child td{border-bottom:0}
.st-card .num{text-align:right;font-variant-numeric:tabular-nums}
.st-fun{display:grid;gap:10px}
.st-frow{display:grid;grid-template-columns:150px minmax(0,1fr) 148px;gap:14px;align-items:center}
@media(max-width:700px){.st-frow{grid-template-columns:1fr;gap:4px}}
.st-flab b{display:block;font-weight:600;font-size:13px}.st-flab span{color:var(--text-dim);font-size:12px}
.st-track{height:30px;border-radius:var(--r-sm);background:var(--border);position:relative;overflow:hidden}
.st-track i{position:absolute;left:0;top:0;bottom:0;background:var(--primary);opacity:.85;border-radius:var(--r-sm)}
.st-fval{font:600 15px var(--font-display);font-variant-numeric:tabular-nums}.st-fval em{display:block;font:500 12px var(--font-body);font-style:normal;color:var(--text-dim)}
.st-split{display:flex;height:12px;border-radius:var(--r-pill);overflow:hidden;gap:2px}.st-split i{display:block;height:100%}
.st-bars{display:grid;gap:12px}.st-brow{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;margin-bottom:4px}.st-brow b{font-weight:600;font-variant-numeric:tabular-nums}
.st-bar{height:6px;border-radius:3px;background:var(--border);overflow:hidden}.st-bar i{display:block;height:100%;border-radius:3px}
.st-heatw{overflow-x:auto}
.st-heat{display:grid;grid-template-columns:34px repeat(24,minmax(14px,1fr));gap:3px;align-items:center;min-width:520px}
.st-heat i{height:26px;border-radius:4px}.st-heat em{font-style:normal;font-size:10.5px;color:var(--text-dim);text-align:center}.st-heat .st-wd{text-align:left}
.st-cohort .st-cell{min-width:54px}
.st-comm{display:grid;gap:12px}
.st-comm blockquote{margin:0;padding:10px 12px;border-left:2px solid var(--primary);background:var(--bg-card2);border-radius:0 var(--r-sm) var(--r-sm) 0;font-size:13px;line-height:1.5}
.st-comm cite{display:block;font-style:normal;font-size:12px;color:var(--text-dim);margin-top:4px}
`
