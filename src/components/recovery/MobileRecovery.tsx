'use client'
// ══════════════════════════════════════════════════════════════
// Récupération — version mobile façon Strava : une carte par sujet
// (forme du jour, check-in, sommeil, HRV, charge, sources). Tap sur une
// carte → vue détail qui glisse de la droite (retour = geste/bouton retour).
// Données : mêmes sources que la page bureau (useRecoveryData, useTrainingLoad)
// + sommeil health_data (data_type='sleep'), comme la carte Sommeil de l'Accueil.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useI18n, currentLocale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { resolvePlanningUid } from '@/lib/planning/scope'
import { parseSleepNight, type SleepNight, type SleepRow } from '@/lib/health/sleep'
import { computeReadiness, type CheckinScales, type ReadinessResult } from '@/lib/recovery/computeReadiness'
import type { TrainingLoad } from '@/hooks/useTrainingLoad'
import type { RecoveryData } from './useRecoveryData'
import { FIELDS, DEFAULT_CHECKIN, saveCheckin, type ReadinessInputsLite } from './CheckinTab'
import { DashCard, Metric, MiniBars, Ring, EmptyState } from '@/components/dashboard/primitives'
import { DetailSlide } from '@/components/ui/DetailSlide'
import { useDetailView } from '@/hooks/useDetailView'
import { usePushNav } from '@/hooks/usePushNav'

type View = 'forme' | 'checkin' | 'sleep' | 'hrv' | 'load'

const NUM: React.CSSProperties = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'zero' 0" }
const UP = 'var(--success)'
const DOWN = 'var(--charge-hard)'

const I = (d: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)
const IC = {
  forme: I('M22 12h-4l-3 9L9 3l-3 9H2'),
  check: I('M9 11l3 3 8-8M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'),
  sleep: I('M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z'),
  hrv: I('M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z'),
  load: I('m3 17 6-6 4 4 8-8M14 7h7v7'),
  plug: I('M12 22v-5M9 8V2M15 8V2M18 8v5a6 6 0 0 1-12 0V8z'),
  trend: I('M3 3v18h18M7 16v-4M12 16V8M17 16v-7'),
}

function scoreColor(s: number): string {
  if (s >= 75) return 'var(--charge-low)'
  if (s >= 50) return 'var(--charge-mid)'
  return 'var(--charge-hard)'
}
function fmtH(min: number): string {
  const h = Math.floor(min / 60), m = Math.round(min % 60)
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}
const signed = (n: number) => `${n > 0 ? '+' : ''}${Math.round(n)}`
function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function shortDay(date: string): string {
  const s = new Date(`${date}T12:00:00`).toLocaleDateString(currentLocale(), { weekday: 'short', day: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Courbe simple (valeurs → polyline) avec ligne de référence optionnelle. */
function Spark({ values, width = 96, height = 48, color = 'var(--primary)', base, stroke = 2.4 }: {
  values: number[]; width?: number; height?: number; color?: string; base?: number | null; stroke?: number
}) {
  if (values.length < 2) return null
  const all = base != null ? [...values, base] : values
  const mn = Math.min(...all), mx = Math.max(...all), rg = mx - mn || 1
  const y = (v: number) => height - 4 - ((v - mn) / rg) * (height - 8)
  const pts = values.map((v, i) => `${(3 + (i / (values.length - 1)) * (width - 6)).toFixed(1)},${y(v).toFixed(1)}`)
  const [lx, ly] = pts[pts.length - 1].split(',')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', maxWidth: '100%' }}>
      {base != null && <line x1={0} x2={width} y1={y(base)} y2={y(base)} stroke="var(--text-dim)" strokeDasharray="3 3" />}
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={3.5} fill={color} />
    </svg>
  )
}

function Card({ children, pad = '16px 18px' }: { children: React.ReactNode; pad?: string }) {
  return <div style={{ background: 'var(--dash-card, var(--bg-card2))', borderRadius: 'var(--r-lg)', padding: pad, minWidth: 0 }}>{children}</div>
}
function Head({ icon, title, meta }: { icon?: React.ReactNode; title: string; meta?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, minWidth: 0 }}>
      {icon && <span aria-hidden style={{ display: 'flex', color: 'var(--primary)', flexShrink: 0 }}>{icon}</span>}
      <h2 style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h2>
      {meta && <span style={{ fontSize: 14, color: 'var(--text-mid)', whiteSpace: 'nowrap', flexShrink: 0 }}>{meta}</span>}
    </div>
  )
}
function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card pad="14px 16px">
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-mid)' }}>{label}</p>
      <p style={{ ...NUM, margin: '2px 0 0', fontSize: 24, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap' }}>{value}</p>
    </Card>
  )
}

function useSleepNights(): { loading: boolean; nights: SleepNight[] } {
  const [st, setSt] = useState<{ loading: boolean; nights: SleepNight[] }>({ loading: true, nights: [] })
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const sb = createClient()
      const uid = await resolvePlanningUid(sb)
      if (!uid) { if (!cancelled) setSt({ loading: false, nights: [] }); return }
      const { data } = await sb.from('health_data')
        .select('date, sleep_duration_min, deep_duration_min, rem_duration_min, light_duration_min, awake_duration_min')
        .eq('user_id', uid).eq('data_type', 'sleep')
        .order('date', { ascending: false }).limit(7)
      if (cancelled) return
      const nights = ((data as SleepRow[] | null) ?? []).map(r => parseSleepNight(r)).filter((n): n is SleepNight => !!n).reverse()
      setSt({ loading: false, nights })
    })()
    return () => { cancelled = true }
  }, [])
  return st
}

const PROVIDER_NAME: Record<string, string> = { strava: 'Strava', polar: 'Polar', wahoo: 'Wahoo', withings: 'Withings', garmin: 'Garmin', oura: 'Oura', whoop: 'Whoop' }
function useSources(): { name: string; at: string | null }[] | null {
  const [list, setList] = useState<{ name: string; at: string | null }[] | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch('/api/oauth/status')
      .then(r => (r.ok ? r.json() : null))
      .then((d: { connected?: { provider: string; updated_at?: string | null; last_used_at?: string | null }[] } | null) => {
        if (cancelled) return
        setList((d?.connected ?? []).map(c => ({ name: PROVIDER_NAME[c.provider] ?? c.provider, at: c.last_used_at ?? c.updated_at ?? null })))
      })
      .catch(() => { if (!cancelled) setList([]) })
    return () => { cancelled = true }
  }, [])
  return list
}

export default function MobileRecovery({ data, tl, readiness, inputs, onSaved }: {
  data: RecoveryData
  tl: TrainingLoad
  readiness: ReadinessResult | null
  inputs: ReadinessInputsLite
  onSaved: () => void
}) {
  const { t } = useI18n()
  const push = usePushNav()
  const [view, open, close] = useDetailView<View>()
  const sleep = useSleepNights()
  const sources = useSources()

  const score = readiness?.score ?? null
  const yesterday = data.readinessByDate.get(isoDay(new Date(Date.now() - 86400000))) ?? null
  const scoreDelta = score != null && yesterday != null ? score - yesterday : null
  const scoreSub = score == null ? t('recovery.m.missingCheckin')
    : score >= 75 ? t('recovery.m.good') : score >= 50 ? t('recovery.m.ok') : t('recovery.m.low')

  const hrvLast = data.hrvRows[data.hrvRows.length - 1] ?? null
  const hrv7 = data.hrvRows.slice(-7)
  const hrvAvg7 = hrv7.length ? hrv7.reduce((s, r) => s + r.hrv, 0) / hrv7.length : null
  const hrvDelta = hrvLast && hrvAvg7 != null ? Math.round(hrvLast.hrv - hrvAvg7) : null

  const lastNight = sleep.nights[sleep.nights.length - 1] ?? null
  const prevNights = sleep.nights.slice(0, -1)
  const sleepAvg = prevNights.length ? prevNights.reduce((s, n) => s + n.totalMin, 0) / prevNights.length : null
  const sleepDelta = lastNight && sleepAvg != null ? Math.round(lastNight.totalMin - sleepAvg) : null
  const stageMin = (n: SleepNight, key: string) => n.stages.find(s => s.key === key)?.min ?? 0

  const tsb = tl.series.length ? Math.round((tl.TSB_SM + tl.TSB_SN) / 2) : null
  const toneKey = tl.verdict ? `recovery.m.tone.${tl.verdict.tone}` : null
  const last42 = tl.series.slice(-42)

  const chip = (d: number | null, fmt: (n: number) => string, min = 1) =>
    d != null && Math.abs(d) >= min ? { chip: `${d > 0 ? '▲' : '▼'} ${fmt(Math.abs(d))}`, chipColor: d > 0 ? UP : DOWN } : {}

  // ── Vues détail ────────────────────────────────────────────────
  if (view) {
    const back = t('recovery.title')
    let body: React.ReactNode = null
    if (view === 'checkin') {
      body = <CheckinDetail initial={data.todayCheckin} inputs={inputs} onSaved={() => { onSaved(); close() }} />
    } else if (view === 'forme') {
      // Moyenne readiness des 4 dernières semaines (lundi → dimanche).
      const weeks = Array.from({ length: 4 }, (_, i) => {
        const end = new Date(); end.setHours(12, 0, 0, 0)
        const dow = (end.getDay() + 6) % 7
        const mon = new Date(end); mon.setDate(end.getDate() - dow - (3 - i) * 7)
        const vals: number[] = []
        for (let k = 0; k < 7; k++) { const d = new Date(mon); d.setDate(mon.getDate() + k); const v = data.readinessByDate.get(isoDay(d)); if (v != null) vals.push(v) }
        return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
      })
      const done = weeks.filter(v => v > 0)
      const names: Record<string, string> = { checkin: t('recovery.m.compCheckin'), hrv: 'HRV', tsb: t('recovery.m.compTsb') }
      body = <>
        <DashCard icon={IC.forme} title={t('recovery.m.forme')}>
          <Metric label="Readiness" value={score ?? '—'} unit="/ 100" {...chip(scoreDelta, n => String(Math.round(n)))} sub={scoreSub}
            right={<Ring value={(score ?? 0) / 100} color={score != null ? scoreColor(score) : undefined} />} />
        </DashCard>
        <Card>
          <Head icon={IC.trend} title={t('recovery.m.whyScore')} />
          {(readiness?.components ?? []).map(c => (
            <div key={c.key} style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14, marginBottom: 5 }}>
                <b style={{ color: 'var(--text)' }}>{names[c.key]}</b>
                <span style={{ ...NUM, color: 'var(--text-mid)' }}>{c.active ? c.value : t('recovery.m.noData')} · {t('recovery.m.weight', { n: Math.round(c.weight * 100) })}</span>
              </div>
              <div style={{ height: 8, borderRadius: 'var(--r-pill)', background: 'var(--bg-hover)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${c.active ? c.value : 0}%`, borderRadius: 'var(--r-pill)', background: 'var(--primary)' }} />
              </div>
            </div>
          ))}
          {!readiness && <p style={{ margin: 0, fontSize: 15, color: 'var(--text-dim)' }}>{t('recovery.m.missingCheckin')}</p>}
          <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.4 }}>{t('recovery.m.whyNote')}</p>
        </Card>
        <Card>
          <Head icon={IC.trend} title={t('recovery.m.fourWeeks')} meta={done.length ? t('recovery.m.avg', { v: Math.round(done.reduce((s, v) => s + v, 0) / done.length) }) : undefined} />
          {done.length ? <>
            <MiniBars values={weeks.map(Math.round)} highlight={3} width={320} height={110} />
            <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>
              {[3, 2, 1, 0].map(k => <span key={k}>{k === 0 ? t('recovery.m.thisWeek') : t('recovery.m.weeksAgo', { n: k })}</span>)}
            </div>
          </> : <p style={{ margin: 0, fontSize: 15, color: 'var(--text-dim)' }}>{t('recovery.m.noHistory')}</p>}
        </Card>
      </>
    } else if (view === 'sleep') {
      const avgAll = sleep.nights.length ? sleep.nights.reduce((s, n) => s + n.totalMin, 0) / sleep.nights.length : null
      const legend = [...new Map(sleep.nights.flatMap(n => n.stages).map(s => [s.key, s])).values()]
      body = <>
        <DashCard icon={IC.sleep} title={t('dashboard.sleep')} meta={sleep.nights.length > 1 ? t('dashboard.nNights', { n: sleep.nights.length }) : undefined}>
          {lastNight ? <Metric label={t('dashboard.lastNight')} value={fmtH(lastNight.totalMin)} {...chip(sleepDelta, fmtH, 5)}
            sub={[stageMin(lastNight, 'deep_duration_min') ? `${t('recovery.m.deep')} ${fmtH(stageMin(lastNight, 'deep_duration_min'))}` : '', stageMin(lastNight, 'rem_duration_min') ? `REM ${fmtH(stageMin(lastNight, 'rem_duration_min'))}` : ''].filter(Boolean).join(' · ') || undefined}
            right={sleep.nights.length > 1 ? <MiniBars values={sleep.nights.map(n => n.totalMin)} highlight={sleep.nights.length - 1} /> : undefined} />
            : <EmptyState title={t('dashboard.sleepEmptyTitle')} hint={t('dashboard.sleepEmptyHint')} href="/connections" cta={t('dashboard.connect')} />}
        </DashCard>
        {sleep.nights.length > 0 && (
          <Card>
            <Head icon={IC.sleep} title={t('recovery.m.lastNights', { n: sleep.nights.length })} meta={avgAll != null ? t('recovery.m.avg', { v: fmtH(avgAll) }) : undefined} />
            {[...sleep.nights].reverse().map((n, i) => {
              const parts = [...n.stages.map(s => ({ c: s.color, v: s.min })), ...(n.awakeMin ? [{ c: 'var(--charge-mid)', v: n.awakeMin }] : [])]
              const sum = parts.reduce((s, p) => s + p.v, 0) || 1
              return (
                <div key={n.date} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: i ? '1px solid var(--dash-line, var(--border))' : 'none' }}>
                  <span style={{ width: 72, flexShrink: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>{shortDay(n.date)}</span>
                  <span style={{ flex: 1, display: 'flex', height: 12, borderRadius: 'var(--r-pill)', overflow: 'hidden', background: 'var(--bg-hover)' }}>
                    {parts.map((p, k) => <i key={k} style={{ display: 'block', width: `${(p.v / sum) * 100}%`, background: p.c }} />)}
                  </span>
                  <span style={{ ...NUM, width: 62, textAlign: 'right', fontSize: 15, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>{fmtH(n.totalMin)}</span>
                </div>
              )
            })}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-mid)', marginTop: 12 }}>
              {legend.map(s => <span key={s.key}><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: s.color, marginRight: 4 }} />{s.label}</span>)}
              <span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--charge-mid)', marginRight: 4 }} />{t('recovery.m.awake')}</span>
            </div>
          </Card>
        )}
      </>
    } else if (view === 'hrv') {
      const last30 = data.hrvRows.slice(-30)
      const vals = last30.map(r => r.hrv)
      const avg30 = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
      body = <>
        <DashCard icon={IC.hrv} title="HRV">
          {hrvLast ? <Metric label={t('recovery.m.thisMorning')} value={Math.round(hrvLast.hrv)} unit="ms" {...chip(hrvDelta, n => String(Math.round(n)))}
            sub={hrvDelta == null ? undefined : hrvDelta >= 0 ? t('recovery.m.hrvAbove') : t('recovery.m.hrvBelow')} />
            : <EmptyState title={t('recovery.m.hrvEmpty')} hint={t('recovery.hrv.waiting')} href="/connections" cta={t('dashboard.connect')} />}
        </DashCard>
        {vals.length > 1 && <>
          <Card>
            <Head icon={IC.trend} title={t('recovery.m.days', { n: vals.length })} meta={t('recovery.m.dashedAvg')} />
            <Spark values={vals} width={320} height={130} base={avg30} />
          </Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <Tile label={t('recovery.m.avg7')} value={`${Math.round(hrvAvg7 ?? 0)} ms`} />
            <Tile label={t('recovery.m.avg30')} value={`${Math.round(avg30 ?? 0)} ms`} />
            <Tile label={t('recovery.m.highest')} value={`${Math.round(Math.max(...vals))} ms`} />
            <Tile label={t('recovery.m.lowest')} value={`${Math.round(Math.min(...vals))} ms`} />
          </div>
          {hrvLast && <p style={{ margin: '0 4px', fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.4 }}>{t('recovery.hrv.source', { date: new Date(`${hrvLast.date}T12:00:00`).toLocaleDateString(currentLocale(), { day: 'numeric', month: 'long' }) })}</p>}
        </>}
      </>
    } else {
      body = <LoadDetail tl={tl} tsb={tsb} toneKey={toneKey} />
    }
    return (
      <div style={{ padding: '14px 16px 24px', fontFamily: 'var(--font-body)' }}>
        <DetailSlide backLabel={back} onBack={close}>{body}</DetailSlide>
      </div>
    )
  }

  // ── Page principale ────────────────────────────────────────────
  const ck = data.todayCheckin
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px 24px', fontFamily: 'var(--font-body)' }}>
      <DashCard icon={IC.forme} title={t('recovery.m.forme')} onOpen={() => open('forme')}>
        <Metric label="Readiness" value={score ?? '—'} unit="/ 100" {...chip(scoreDelta, n => String(Math.round(n)))} sub={scoreSub}
          right={<Ring value={(score ?? 0) / 100} color={score != null ? scoreColor(score) : undefined} />} />
      </DashCard>

      {ck ? (
        <DashCard icon={IC.check} title={t('recovery.checkin.title')} meta={t('recovery.m.edit')} onOpen={() => open('checkin')}>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--text-mid)' }}>{t('recovery.m.doneToday')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {FIELDS.map(f => (
              <span key={f.key} style={{ padding: '6px 10px', borderRadius: 'var(--r-pill)', background: 'var(--dash-chip, var(--bg-hover))', fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>
                {t(f.labelKey)} <b style={{ ...NUM, color: 'var(--text)' }}>{ck[f.key as keyof CheckinScales]}/5</b>
              </span>
            ))}
          </div>
        </DashCard>
      ) : (
        <DashCard icon={IC.check} title={t('recovery.checkin.title')}>
          <p style={{ margin: '0 0 12px', fontSize: 15, color: 'var(--text-mid)' }}>{t('recovery.m.checkinHint')}</p>
          <button type="button" onClick={() => open('checkin')} className="thw-press"
            style={{ width: '100%', minHeight: 50, borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {t('recovery.m.doCheckin')}
          </button>
        </DashCard>
      )}

      <DashCard icon={IC.sleep} title={t('dashboard.sleep')} meta={sleep.nights.length > 1 ? t('dashboard.nNights', { n: sleep.nights.length }) : undefined} onOpen={() => open('sleep')}>
        {lastNight ? (
          <Metric label={t('dashboard.lastNight')} value={fmtH(lastNight.totalMin)} {...chip(sleepDelta, fmtH, 5)}
            sub={stageMin(lastNight, 'deep_duration_min') ? `${t('recovery.m.deep')} ${fmtH(stageMin(lastNight, 'deep_duration_min'))}${stageMin(lastNight, 'rem_duration_min') ? ` · REM ${fmtH(stageMin(lastNight, 'rem_duration_min'))}` : ''}` : undefined}
            right={sleep.nights.length > 1 ? <MiniBars values={sleep.nights.map(n => n.totalMin)} highlight={sleep.nights.length - 1} /> : undefined} />
        ) : sleep.loading ? <div style={{ height: 70 }} /> : (
          <EmptyState title={t('dashboard.sleepEmptyTitle')} hint={t('dashboard.sleepEmptyHint')} href="/connections" cta={t('dashboard.connect')} />
        )}
      </DashCard>

      <DashCard icon={IC.hrv} title="HRV" meta={data.hrvRows.length > 1 ? t('recovery.m.days', { n: Math.min(30, data.hrvRows.length) }) : undefined} onOpen={() => open('hrv')}>
        {hrvLast ? (
          <Metric label={t('recovery.m.thisMorning')} value={Math.round(hrvLast.hrv)} unit="ms" {...chip(hrvDelta, n => String(Math.round(n)))}
            sub={hrvAvg7 != null ? t('recovery.m.avg7Value', { v: Math.round(hrvAvg7) }) : undefined}
            right={<Spark values={data.hrvRows.slice(-14).map(r => r.hrv)} base={hrvAvg7} />} />
        ) : data.loading ? <div style={{ height: 70 }} /> : (
          <EmptyState title={t('recovery.m.hrvEmpty')} hint={t('recovery.hrv.waiting')} href="/connections" cta={t('dashboard.connect')} />
        )}
      </DashCard>

      <DashCard icon={IC.load} title={t('recovery.tab.load')} meta={last42.length > 1 ? t('recovery.m.days', { n: last42.length }) : undefined} onOpen={() => open('load')}>
        {tsb != null ? (
          <Metric label={t('recovery.m.freshness')} value={signed(tsb)} sub={toneKey ? t(toneKey) : undefined}
            right={<Spark values={last42.map(p => (p.ctlSm + p.ctlSn) / 2)} color="var(--charge-low)" />} />
        ) : tl.loading ? <div style={{ height: 70 }} /> : (
          <EmptyState title={t('recovery.m.loadEmpty')} hint={t('recovery.m.loadEmptyHint')} />
        )}
      </DashCard>

      <DashCard icon={IC.plug} title={t('recovery.sources.title')} onOpen={() => push('/connections')}>
        {sources == null ? <div style={{ height: 22 }} /> : sources.length ? sources.map((s, i) => (
          <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i ? '1px solid var(--dash-line, var(--border))' : 'none' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <b style={{ display: 'block', fontSize: 15, color: 'var(--text)' }}>{s.name}</b>
              {s.at && <span style={{ display: 'block', fontSize: 13, color: 'var(--text-mid)' }}>{t('connections.syncedAgo', { when: relTime(s.at) })}</span>}
            </span>
          </div>
        )) : <p style={{ margin: 0, fontSize: 15, color: 'var(--text-mid)' }}>{t('recovery.m.noSource')}</p>}
      </DashCard>
    </div>
  )
}

function relTime(at: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 60000))
  const rtf = new Intl.RelativeTimeFormat(currentLocale(), { numeric: 'auto' })
  if (min < 60) return rtf.format(-min, 'minute')
  if (min < 60 * 24) return rtf.format(-Math.round(min / 60), 'hour')
  return rtf.format(-Math.round(min / 1440), 'day')
}

function CheckinDetail({ initial, inputs, onSaved }: { initial: CheckinScales | null; inputs: ReadinessInputsLite; onSaved: () => void }) {
  const { t } = useI18n()
  const [v, setV] = useState<CheckinScales>(initial ?? DEFAULT_CHECKIN)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const preview = computeReadiness({ checkin: v, ...inputs }).score
  async function save() {
    setSaving(true); setErr(null)
    const e = await saveCheckin(v, inputs)
    setSaving(false)
    if (e) { setErr(e === 'session' ? t('recovery.checkin.err.session') : e || t('recovery.checkin.err.save')); return }
    onSaved()
  }
  return <>
    <Card>
      <Head icon={IC.check} title={t('recovery.checkin.title')} meta={new Date().toLocaleDateString(currentLocale(), { weekday: 'short', day: 'numeric', month: 'short' })} />
      <p style={{ margin: 0, fontSize: 14, color: 'var(--text-mid)' }}>{t('recovery.m.checkinIntro')}</p>
      {FIELDS.map(f => (
        <div key={f.key} style={{ marginTop: 16 }}>
          <p style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{t(f.labelKey)}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3, 4, 5].map(n => {
              const on = v[f.key] === n
              return (
                <button key={n} type="button" aria-pressed={on} onClick={() => setV(p => ({ ...p, [f.key]: n }))} className="thw-press"
                  style={{ ...NUM, flex: 1, height: 46, borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 17, fontWeight: 700,
                    background: on ? 'var(--primary)' : 'var(--dash-chip, var(--bg-hover))', color: on ? 'var(--on-primary)' : 'var(--text-mid)' }}>{n}</button>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-dim)', marginTop: 5 }}>
            <span>{t(f.loKey)}</span><span>{t(f.hiKey)}</span>
          </div>
        </div>
      ))}
    </Card>
    <Card>
      <Metric label={t('recovery.m.estimated')} value={preview ?? '—'} unit="/ 100" right={<Ring value={(preview ?? 0) / 100} color={preview != null ? scoreColor(preview) : undefined} />} />
    </Card>
    {err && <p style={{ margin: '0 4px', fontSize: 14, color: 'var(--charge-hard)' }}>{err}</p>}
    <button type="button" onClick={save} disabled={saving} className="thw-press"
      style={{ width: '100%', minHeight: 50, borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 16, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'inherit' }}>
      {saving ? t('recovery.checkin.saving') : t('recovery.m.save')}
    </button>
  </>
}

function LoadDetail({ tl, tsb, toneKey }: { tl: TrainingLoad; tsb: number | null; toneKey: string | null }) {
  const { t } = useI18n()
  const [axis, setAxis] = useState<'sm' | 'sn'>('sm')
  const s = tl.series.slice(-42)
  const axisCard = (title: string, dot: string, c: number, a: number, b: number) => (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {([[t('recovery.m.ctl'), Math.round(c), 'CTL', 'var(--text)'], [t('recovery.m.atl'), Math.round(a), 'ATL', 'var(--text)'], [t('recovery.m.tsb'), signed(b), 'TSB', b > 5 ? 'var(--success)' : b < -10 ? 'var(--charge-hard)' : 'var(--text)']] as const).map(([l, v, k, col]) => (
          <div key={k}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-mid)' }}>{l}</p>
            <p style={{ ...NUM, margin: '2px 0 0', fontSize: 26, fontWeight: 800, color: col }}>{v}</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)' }}>{k}</p>
          </div>
        ))}
      </div>
    </Card>
  )
  const ctl = s.map(p => (axis === 'sm' ? p.ctlSm : p.ctlSn))
  const atl = s.map(p => (axis === 'sm' ? p.atlSm : p.atlSn))
  const W = 320, H = 130
  // Échelle serrée sur la plage réelle (sinon les courbes se tassent en haut).
  const lo = Math.min(...ctl, ...atl), hi = Math.max(...ctl, ...atl)
  const pad = Math.max(2, (hi - lo) * 0.12)
  const mn = lo - pad, rg = Math.max(1, hi + pad - mn)
  const line = (vals: number[]) => vals.map((v, i) => `${((i / Math.max(1, vals.length - 1)) * W).toFixed(1)},${(H - 6 - ((v - mn) / rg) * (H - 14)).toFixed(1)}`).join(' ')
  return <>
    <DashCard icon={IC.load} title={t('recovery.tab.load')}>
      <Metric label={t('recovery.m.freshness')} value={tsb != null ? signed(tsb) : '—'} sub={toneKey ? t(toneKey) : undefined} />
    </DashCard>
    {axisCard(t('recovery.m.metabolic'), 'var(--primary)', tl.CTL_SM, tl.ATL_SM, tl.TSB_SM)}
    {axisCard(t('recovery.m.neuro'), 'var(--rec-sommeil)', tl.CTL_SN, tl.ATL_SN, tl.TSB_SN)}
    {s.length > 1 && (
      <Card>
        <Head icon={IC.trend} title={t('recovery.m.days', { n: s.length })} />
        <div role="tablist" style={{ display: 'flex', background: 'var(--dash-chip, var(--bg-hover))', borderRadius: 'var(--r-pill)', padding: 3, marginBottom: 12 }}>
          {(['sm', 'sn'] as const).map(k => (
            <button key={k} role="tab" aria-selected={axis === k} type="button" onClick={() => setAxis(k)}
              style={{ flex: 1, border: 'none', cursor: 'pointer', borderRadius: 'var(--r-pill)', padding: '7px 0', fontSize: 14, fontWeight: axis === k ? 700 : 600, fontFamily: 'inherit',
                background: axis === k ? 'var(--dash-card, var(--bg-elev))' : 'transparent', color: axis === k ? 'var(--text)' : 'var(--text-mid)' }}>
              {k === 'sm' ? t('recovery.m.cardio') : t('recovery.m.force')}
            </button>
          ))}
        </div>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
          <line x1={0} x2={W} y1={H - 6} y2={H - 6} stroke="var(--dash-line, var(--border))" />
          <polyline points={line(ctl)} fill="none" stroke="var(--primary)" strokeWidth={2.4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <polyline points={line(atl)} fill="none" stroke="var(--charge-mid)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-mid)', marginTop: 8 }}>
          <span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', marginRight: 4 }} />{t('recovery.m.ctl')}</span>
          <span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--charge-mid)', marginRight: 4 }} />{t('recovery.m.atl')}</span>
        </div>
      </Card>
    )}
  </>
}
