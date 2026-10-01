'use client'
// ══════════════════════════════════════════════════════════════
// Blessures mobile — vue détail « Analyse ». Mêmes calculs que l'onglet
// desktop (lib.ts), présentés en cartes : 4 KPIs, disponibilité 12 mois,
// douleur type, saisonnalité, zones à risque (récidive + fragilité),
// guérison par type, mécanisme, précision du retour, rééduc → guérison.
// Graphes en SVG brut à la largeur réelle (pas de lib). Les cartes
// secondaires n'apparaissent que si les données existent.
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { useI18n, currentLocale } from '@/lib/i18n'
import { DashCard, Metric } from '@/components/dashboard/primitives'
import { AnimatedBar } from '@/components/ui/AnimatedBar'
import { SEV, type Injury, type InjuryLog, type Severity } from '../types'
import {
  stats12mo, availabilityByMonth, aggregatePainCurve, seasonality, chronicZones, fragilityProfile,
  healingByStructure, healingBySeverity, mechanismSplit, returnAccuracy, durationDays, type ChronicStatus,
} from '../lib'
import { SEV_KEY, sideLabel } from './MobileInjuryHistory'

const DAY = 86400000
const NUM: React.CSSProperties = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'zero' 0" }
const ts = (d: string) => new Date(d + (d.length === 10 ? 'T12:00:00' : '')).getTime()
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const I = (d: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)
const IC = {
  chart: I('M3 3v18h18M7 16v-4M12 16V8M17 16v-7'),
  pulse: I('M22 12h-4l-3 9L9 3l-3 9H2'),
  calendar: I('M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM16 2v4M8 2v4M3 10h18'),
  alert: I('M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01'),
  clock: I('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2'),
  split: I('M16 3h5v5M8 3H3v5M21 3l-7 7M3 3l7 7M12 22v-8'),
  target: I('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'),
  check: I('M9 11l3 3 8-8M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'),
}
const CHRONIC_COLOR: Record<ChronicStatus, string> = { chronic: 'var(--charge-hard)', watch: 'var(--charge-mid)', ok: 'var(--charge-low)' }
const LINE = '1px solid var(--dash-line, var(--border))'

/** Largeur réelle du conteneur (SVG dessiné en px, sans déformation). */
function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth)
    const ro = new ResizeObserver(entries => { for (const e of entries) setW(Math.round(e.contentRect.width)) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

interface Series { values: number[]; color: string; dashed?: boolean }
function LineChart({ series, max, height, labels }: { series: Series[]; max: number; height: number; labels?: { i: number; text: string }[] }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const n = series[0]?.values.length ?? 0
  const padX = 4, labH = labels?.length ? 20 : 0
  const x = (i: number) => (n <= 1 ? padX : padX + (i / (n - 1)) * (w - padX * 2))
  const y = (v: number) => 4 + (1 - Math.max(0, Math.min(max, v)) / max) * (height - 8)
  const head = series[0]
  return (
    <div ref={ref} style={{ width: '100%', minHeight: height + labH }}>
      {w > 0 && n > 0 && (
        <svg width={w} height={height + labH} viewBox={`0 0 ${w} ${height + labH}`} style={{ display: 'block' }} aria-hidden>
          <line x1={0} x2={w} y1={y(0)} y2={y(0)} stroke="var(--dash-line, var(--border))" strokeWidth={1} />
          {series.map((s, k) => (
            <polyline key={k} points={s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}
              fill="none" stroke={s.color} strokeWidth={s.dashed ? 1.8 : 2.4} strokeDasharray={s.dashed ? '4 4' : undefined}
              strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {head && <circle cx={x(n - 1)} cy={y(head.values[n - 1])} r={3.5} fill={head.color} />}
          {labels?.map(l => (
            <text key={l.i} x={x(l.i)} y={height + 15} textAnchor={l.i === 0 ? 'start' : l.i === n - 1 ? 'end' : 'middle'}
              style={{ fontFamily: 'var(--font-body)', fontSize: 11, fill: 'var(--text-dim)' }}>{l.text}</text>
          ))}
        </svg>
      )}
    </div>
  )
}

function Kpi({ label, value, unit, sub }: { label: string; value: string | number; unit?: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--dash-card, var(--bg-card2))', borderRadius: 'var(--r-lg)', padding: '14px 16px', minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</p>
      <p style={{ ...NUM, margin: '2px 0 0', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)', whiteSpace: 'nowrap' }}>
        {value}{unit && <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-mid)', marginLeft: 4 }}>{unit}</span>}
      </p>
      {sub && <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</p>}
    </div>
  )
}

const Empty = ({ text }: { text: string }) => <p style={{ margin: 0, fontSize: 15, color: 'var(--text-mid)' }}>{text}</p>
const Caption = ({ children }: { children: React.ReactNode }) => <p style={{ ...NUM, margin: '0 0 12px', fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.4 }}>{children}</p>
const Dot = ({ c }: { c: string }) => <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0, display: 'inline-block' }} />

/** Ligne tappable vers la fiche de l'épisode (interconnexion obligatoire). */
function TapRow({ first, onClick, children }: { first: boolean; onClick?: () => void; children: React.ReactNode }) {
  const style: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'left', border: 'none', borderTop: first ? 'none' : LINE, background: 'none', padding: first ? '0 0 10px' : '10px 0', fontFamily: 'inherit', color: 'inherit' }
  return onClick
    ? <button type="button" onClick={onClick} style={{ ...style, minHeight: 44, cursor: 'pointer' }}>{children}</button>
    : <div style={style}>{children}</div>
}

export function MobileInjuryAnalysis({ injuries, logs, onOpen }: {
  injuries: Injury[]
  logs: InjuryLog[]
  onOpen: (inj: Injury) => void
}) {
  const { t } = useI18n()
  const loc = currentLocale()
  const d = t('injuries.dayUnit')
  const noData = t('injm.noData')
  const s = stats12mo(injuries)
  const activeN = injuries.filter(i => i.status === 'active').length

  // Disponibilité 12 mois
  const avail = availabilityByMonth(injuries, 12)
  const monthName = (ym: string, style: 'short' | 'narrow') => new Date(`${ym}-01T12:00:00`).toLocaleDateString(loc, { month: style })
  const availLabels = avail.months.map((m, i) => ({ i, text: monthName(m.ym, 'short') })).filter(l => l.i % 3 === 2)

  // Douleur type
  const curve = aggregatePainCurve(injuries, logs)

  // Saisonnalité (tous épisodes, par mois d'apparition)
  const season = seasonality(injuries, 3)
  const seasonMax = Math.max(...season.byMonth, 1)
  const seasonTotal = season.byMonth.reduce((a, b) => a + b, 0)
  const peak = season.byMonth.indexOf(seasonMax)
  const peakUnique = seasonTotal >= 2 && season.byMonth.filter(v => v === seasonMax).length === 1
  const monthLetters = Array.from({ length: 12 }, (_, m) => new Date(2024, m, 15).toLocaleDateString(loc, { month: 'narrow' }))

  // Zones à risque : récidive (chronicZones) + barre = indice de fragilité
  const chronic = chronicZones(injuries).slice(0, 6)
  const frag = new Map(fragilityProfile(injuries, 99).map(a => [a.region, a.score]))

  // Guérison par type
  const struct = healingByStructure(injuries)
  const sev = healingBySeverity(injuries)

  // Mécanisme
  const mech = mechanismSplit(injuries)
  const progPct = mech.total ? Math.round((mech.progressive / mech.total) * 100) : 0

  // Précision du retour (mêmes règles que returnAccuracy, + l'épisode pour le lien)
  const ret = returnAccuracy(injuries)
  const retRows = injuries
    .filter(i => i.status === 'resolved' && i.return_estimate_date && i.resolved_date)
    .map(i => {
      const est = Math.round((ts(i.return_estimate_date as string) - ts(i.onset_date)) / DAY)
      const real = Math.round((ts(i.resolved_date as string) - ts(i.onset_date)) / DAY)
      return { inj: i, est, real, delta: real - est }
    })
    .filter(r => r.est > 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3)

  // Adhérence rééduc → guérison (même calcul qu'adherenceVsHealing, + l'épisode)
  const adh = injuries
    .filter(i => i.rehab.length > 0)
    .map(i => ({ inj: i, adherence: Math.round((i.rehab.filter(x => x.done).length / i.rehab.length) * 100), days: durationDays(i) }))
    .sort((a, b) => b.adherence - a.adherence)

  return (
    <>
      <div data-guide="inj-analytics" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <Kpi label={t('injuries.statInjuries12mo')} value={s.count} sub={t('injm.activeN', { n: activeN })} />
        <Kpi label={t('injuries.m.avgHealing')} value={s.avgDuration ?? '—'} unit={s.avgDuration != null ? d : undefined} sub={t('injuries.statAvgDurationSub')} />
        <Kpi label={t('injuries.statRecidiveRate')} value={s.recidiveRate ?? '—'} unit={s.recidiveRate != null ? '%' : undefined} sub={t('injuries.statRecidiveRateSub')} />
        <Kpi label={t('injuries.statAvgReturn')} value={s.avgReturn ?? '—'} unit={s.avgReturn != null ? d : undefined} sub={t('injuries.statAvgReturnSub')} />
      </div>

      <DashCard icon={IC.chart} title={t('injuries.statAvailability')} meta={t('injuries.m.last12')}>
        <Caption>{t('injm.daysLost', { n: avail.daysLost })}</Caption>
        <LineChart series={[{ values: avail.months.map(m => m.pct), color: 'var(--primary)' }]} max={100} height={110} labels={availLabels} />
      </DashCard>

      <DashCard icon={IC.pulse} title={t('injm.painCurve')}>
        {!curve ? <Empty text={noData} /> : (
          <>
            <LineChart height={100} max={10}
              series={[{ values: curve.effort, color: 'var(--charge-hard)' }, { values: curve.rest, color: 'var(--text-dim)', dashed: true }]}
              labels={[{ i: 0, text: t('injm.day0') }, { i: curve.buckets - 1, text: t('w1f.resolved') }]} />
            <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-mid)' }}><Dot c="var(--charge-hard)" />{t('injuries.m.painEffort')}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-mid)' }}><Dot c="var(--text-dim)" />{t('injuries.m.painRest')}</span>
            </div>
          </>
        )}
      </DashCard>

      <DashCard icon={IC.calendar} title={t('injm.season')}>
        {seasonTotal === 0 ? <Empty text={noData} /> : (
          <>
            {peakUnique && <Caption>{t('injm.peakMonth', { m: new Date(2024, peak, 15).toLocaleDateString(loc, { month: 'long' }) })}</Caption>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: 4 }}>
              {season.byMonth.map((v, m) => (
                <i key={m} title={String(v)} style={{ display: 'block', height: 22, borderRadius: 4, background: v === 0 ? 'var(--bg-hover)' : `color-mix(in srgb, var(--charge-hard) ${Math.round(35 + 65 * (v / seasonMax))}%, transparent)` }} />
              ))}
              {monthLetters.map((l, m) => <span key={m} style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', marginTop: 2 }}>{l}</span>)}
            </div>
          </>
        )}
      </DashCard>

      {chronic.length > 0 && (
        <DashCard icon={IC.alert} title={t('injm.riskZones')}>
          <Caption>{t('injm.riskZonesCap')}</Caption>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {chronic.map(z => (
              <div key={z.zone}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, fontSize: 14, marginBottom: 5 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{z.zone}</span>
                  <span style={{ ...NUM, color: 'var(--text-mid)', flexShrink: 0 }}>{z.count} {z.count > 1 ? t('w1f.episodes') : t('w1f.episode')}</span>
                </div>
                <AnimatedBar pct={frag.get(z.zone) ?? 0} color="var(--charge-hard)" height={8} />
                {z.status !== 'ok' && (
                  <p style={{ ...NUM, display: 'flex', alignItems: 'center', gap: 6, margin: '6px 0 0', fontSize: 13, color: 'var(--text-mid)' }}>
                    <Dot c={CHRONIC_COLOR[z.status]} />
                    <span style={{ fontWeight: 700, color: CHRONIC_COLOR[z.status] }}>{z.status === 'chronic' ? t('injm.tagChronic') : t('injm.tagWatch')}</span>
                    {z.avgIntervalDays != null && <span>· {t('injm.everyMonths', { n: Math.max(1, Math.round(z.avgIntervalDays / 30)) })}</span>}
                  </p>
                )}
              </div>
            ))}
          </div>
        </DashCard>
      )}

      {(struct.length > 0 || sev.length > 0) && (
        <DashCard icon={IC.clock} title={t('injm.healingByType')}>
          {struct.map((r, k) => (
            <TapRow key={r.key} first={k === 0}>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <b style={{ flex: 1, minWidth: 0, fontSize: 15, color: 'var(--text)' }}>{cap(r.key)}</b>
                <span style={{ ...NUM, fontSize: 13, color: 'var(--text-dim)' }}>{r.count} {r.count > 1 ? t('w1f.episodes') : t('w1f.episode')}</span>
                <b style={{ ...NUM, fontSize: 16, color: 'var(--text)', minWidth: 48, textAlign: 'right' }}>{r.avgDays} {d}</b>
              </span>
            </TapRow>
          ))}
          {sev.length > 0 && (
            <div style={{ marginTop: struct.length ? 4 : 0 }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--text-dim)' }}>{t('injm.bySeverity')}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {sev.map(r => (
                  <span key={r.key} style={{ ...NUM, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 'var(--r-pill)', background: 'var(--dash-chip, var(--bg-hover))', fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>
                    <Dot c={SEV[r.key as Severity].varc} />{t(SEV_KEY[r.key as Severity])}<b style={{ color: 'var(--text)' }}>{r.avgDays} {d}</b>
                  </span>
                ))}
              </div>
            </div>
          )}
        </DashCard>
      )}

      {mech.total > 0 && (
        <DashCard icon={IC.split} title={t('injuries.fieldMechanism')}>
          <Metric label={t('injuries.mechProgressive')} value={progPct} unit="%" />
          <div style={{ display: 'flex', gap: 3, height: 10, marginTop: 12, borderRadius: 'var(--r-pill)', overflow: 'hidden' }}>
            {mech.progressive > 0 && <i style={{ display: 'block', flex: mech.progressive, background: 'var(--charge-hard)' }} />}
            {mech.soudaine > 0 && <i style={{ display: 'block', flex: mech.soudaine, background: 'var(--charge-mid)' }} />}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ ...NUM, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-mid)' }}><Dot c="var(--charge-hard)" />{t('injuries.mechProgressive')} {mech.progressive}</span>
            <span style={{ ...NUM, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-mid)' }}><Dot c="var(--charge-mid)" />{t('injuries.mechSudden')} {mech.soudaine}</span>
          </div>
        </DashCard>
      )}

      {retRows.length > 0 && (
        <DashCard icon={IC.target} title={t('injm.returnAcc')}>
          {ret.meanBias != null && ret.meanBias !== 0 && (
            <Caption>{t(ret.meanBias > 0 ? 'injm.underBy' : 'injm.overBy', { n: Math.abs(ret.meanBias) })}</Caption>
          )}
          {retRows.map((r, k) => {
            const m = Math.max(r.est, r.real, 1)
            const late = r.delta > 0
            return (
              <TapRow key={r.inj.id} first={k === 0} onClick={() => onOpen(r.inj)}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--text)', textTransform: 'capitalize', marginBottom: 6 }}>{r.inj.zone}{sideLabel(r.inj)}</span>
                {[{ v: r.est, label: t('injm.est'), c: 'var(--text-dim)' }, { v: r.real, label: t('injm.real'), c: late ? 'var(--charge-hard)' : 'var(--charge-low)' }].map((b, j) => (
                  <span key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: j ? 4 : 0 }}>
                    <span style={{ flex: 1 }}><AnimatedBar pct={(b.v / m) * 100} color={b.c} height={6} /></span>
                    <span style={{ ...NUM, width: 72, textAlign: 'right', fontSize: 13, color: 'var(--text-mid)' }}>{b.label} {b.v} {d}</span>
                  </span>
                ))}
              </TapRow>
            )
          })}
        </DashCard>
      )}

      {adh.length > 0 && (
        <DashCard icon={IC.check} title={t('injm.adherence')}>
          <Caption>{t('injm.adherenceCap')}</Caption>
          {adh.map((a, k) => (
            <TapRow key={a.inj.id} first={k === 0} onClick={() => onOpen(a.inj)}>
              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                <b style={{ fontSize: 15, color: 'var(--text)', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.inj.zone}{sideLabel(a.inj)}</b>
                <span style={{ ...NUM, fontSize: 13, color: 'var(--text-mid)', flexShrink: 0 }}>{a.adherence} % · {a.days} {d}</span>
              </span>
              <AnimatedBar pct={a.adherence} color={SEV[a.inj.severity].varc} height={6} />
            </TapRow>
          ))}
        </DashCard>
      )}
    </>
  )
}
