'use client'
// Onglet Analyse — tableau de bord blessures (pleine largeur desktop). Tout est
// dérivé des épisodes et logs réels (lib.ts) ; aucun chiffre inventé. Chaque bloc
// gère proprement l'état « pas assez de données ». DS : tokens uniquement,
// Syne (titres) + DM Sans (corps), chiffres tabulaires.
import type { Injury, InjuryLog, Severity } from '../types'
import { SEV } from '../types'
import {
  stats12mo, healingByStructure, healingBySeverity, chronicZones, availabilityByMonth,
  returnAccuracy, fragilityProfile, seasonality, mechanismSplit, aggregatePainCurve, adherenceVsHealing,
  type ChronicStatus,
} from '../lib'
import { currentLocale, useI18n } from '@/lib/i18n'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const EN = currentLocale() === 'en'
const L = {
  availOverTime: EN ? 'Availability over time' : 'Disponibilité dans le temps',
  availCap:      EN ? '% of injury-free days per month' : '% de jours dispo par mois',
  daysLost:      EN ? 'days lost' : 'jours perdus',
  healing:       EN ? 'Healing time by type' : 'Temps de guérison par type',
  healingCap:    EN ? 'Average time to resolution — to set a realistic return' : 'Durée moyenne de résolution — pour estimer un retour réaliste',
  structure:     EN ? 'Structure' : 'Structure',
  episodes:      EN ? 'Ep.' : 'Épis.',
  healingCol:    EN ? 'Avg. healing' : 'Guérison moy.',
  bySeverity:    EN ? 'By severity' : 'Par sévérité',
  chronic:       EN ? 'Chronic zones / recurrence' : 'Zones chroniques / récidive',
  chronicCap:    EN ? 'Zones that come back + interval between episodes' : 'Zones qui reviennent + intervalle entre épisodes',
  tagChronic:    EN ? 'Chronic' : 'Chronique',
  tagWatch:      EN ? 'Watch' : 'À surveiller',
  noRecidive:    EN ? 'No recurrence' : 'Pas de récidive',
  everyMonths:   (n: number) => EN ? `recurs every ~${n} mo` : `récidive tous les ~${n} mois`,
  fragility:     EN ? 'Fragility profile' : 'Profil de fragilité',
  fragilityCap:  EN ? 'Your at-risk zones' : 'Tes zones à risque',
  mechanism:     EN ? 'Mechanism' : 'Mécanisme',
  mechanismCap:  EN ? 'Sudden vs gradual (overuse)' : 'Soudaine vs progressive (surmenage)',
  progressive:   EN ? 'Gradual' : 'Progressive',
  soudaine:      EN ? 'Sudden' : 'Soudaine',
  returnAcc:     EN ? 'Return accuracy' : 'Précision du retour',
  returnAccCap:  EN ? 'Estimated vs actual — to calibrate' : 'Estimé vs réel — pour calibrer',
  est:           EN ? 'est.' : 'est.',
  real:          EN ? 'actual' : 'réel',
  under:         EN ? 'You underestimate your returns by' : 'Tu sous-estimes tes retours de',
  over:          EN ? 'You overestimate your returns by' : 'Tu surestimes tes retours de',
  onAvg:         EN ? 'on average.' : 'en moyenne.',
  season:        EN ? 'Seasonality' : 'Saisonnalité',
  seasonCap:     EN ? 'When your injuries happen (by month)' : 'Quand surviennent tes blessures (par mois)',
  painCurve:     EN ? 'Typical pain curve' : 'Courbe de douleur type',
  painCurveCap:  EN ? 'Average rest / effort path across episodes' : 'Trajectoire moyenne repos / effort (tous épisodes)',
  atEffort:      EN ? 'At effort' : "À l'effort",
  atRest:        EN ? 'At rest' : 'Au repos',
  adherence:     EN ? 'Rehab adherence → healing' : 'Adhérence rééduc → guérison',
  adherenceCap:  EN ? '% of exercises done vs speed of resolution' : "% d'exos cochés vs vitesse de résolution",
  alerts:        EN ? 'Prevention & alerts' : 'Prévention & alertes',
  noData:        EN ? 'Not enough data yet.' : 'Pas encore assez de données.',
  stInjuries:    EN ? 'Injuries (12 mo)' : 'Blessures (12 mois)',
  stDuration:    EN ? 'Avg. duration' : 'Durée moyenne',
  stRecidive:    EN ? 'Recurrence rate' : 'Taux de récidive',
  stReturn:      EN ? 'Avg. return' : 'Retour moyen',
  day:           EN ? 'd' : 'j',
  months:        EN ? ['J','F','M','A','M','J','J','A','S','O','N','D'] : ['J','F','M','A','M','J','J','A','S','O','N','D'],
  structLabels:  { muscle: EN ? 'Muscle' : 'Muscle', tendon: EN ? 'Tendon' : 'Tendon', articulation: EN ? 'Joint' : 'Articulation', ligament: EN ? 'Ligament' : 'Ligament', os: EN ? 'Bone' : 'Os', nerf: EN ? 'Nerve' : 'Nerf', inconnu: EN ? 'Unknown' : 'Inconnu' } as Record<string, string>,
}

const SEV_LABEL: Record<Severity, string> = { gene: EN ? 'Niggle' : 'Gêne', douleur: EN ? 'Pain' : 'Douleur', blessure: EN ? 'Injury' : 'Blessure' }
const CHRONIC_COLOR: Record<ChronicStatus, string> = { chronic: 'var(--charge-hard)', watch: 'var(--charge-mid)', ok: 'var(--charge-low)' }

// ── Primitives ────────────────────────────────────────────────────
const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '18px 20px' }
const eyebrow: React.CSSProperties = { fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: 0 }
const h3: React.CSSProperties = { fontFamily: FD, fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }
const capStyle: React.CSSProperties = { fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', margin: '3px 0 14px', lineHeight: 1.45 }
const muted: React.CSSProperties = { fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', margin: 0 }

function Card({ title, cap, children, wide }: { title: string; cap?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div style={{ ...card, gridColumn: wide ? '1 / -1' : undefined, display: 'flex', flexDirection: 'column' }}>
      <h3 style={h3}>{title}</h3>
      {cap && <p style={capStyle}>{cap}</p>}
      {!cap && <div style={{ height: 14 }} />}
      {children}
    </div>
  )
}
function Empty() { return <p style={{ ...muted, padding: '8px 0' }}>{L.noData}</p> }

// ── D. Aire disponibilité ─────────────────────────────────────────
function AvailabilityChart({ inj }: { inj: Injury[] }) {
  const { months, daysLost } = availabilityByMonth(inj, 12)
  const W = 1000, H = 150, padB = 22
  const n = months.length
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * W)
  const y = (p: number) => 8 + (1 - p / 100) * (H - padB - 8)
  const pts = months.map((m, i) => [x(i), y(m.pct)] as const)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${W},${H - padB} L0,${H - padB} Z`
  return (
    <>
      <p style={{ ...muted, margin: '-8px 0 12px' }}>{daysLost} {L.daysLost}</p>
      <div style={{ width: '100%', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
          <defs><linearGradient id="injAvail" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity="0.24" /><stop offset="100%" stopColor="var(--primary)" stopOpacity="0" /></linearGradient></defs>
          {[0, 50, 100].map(v => <line key={v} x1={0} y1={y(v)} x2={W} y2={y(v)} stroke="var(--border)" strokeWidth={1} strokeDasharray={v === 0 ? undefined : '3 6'} />)}
          <path d={area} fill="url(#injAvail)" />
          <path d={line} fill="none" stroke="var(--primary)" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {months.filter((_, i) => i % 2 === 0).map(m => <span key={m.ym} style={{ ...muted, fontSize: 10 }}>{L.months[m.monthIdx]}</span>)}
      </div>
    </>
  )
}

// ── F. Radar fragilité ────────────────────────────────────────────
function FragilityRadar({ inj }: { inj: Injury[] }) {
  const axes = fragilityProfile(inj, 6)
  if (axes.length < 3) return <Empty />
  const cx = 100, cy = 96, R = 66, n = axes.length
  const ang = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const pt = (i: number, r: number) => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r] as const
  const ring = (f: number) => axes.map((_, i) => pt(i, R * f).join(',')).join(' ')
  const poly = axes.map((a, i) => pt(i, R * (a.score / 100)).join(',')).join(' ')
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <svg viewBox="0 0 200 192" width="100%" height={188} style={{ maxWidth: 260 }}>
        {[0.33, 0.66, 1].map(f => <polygon key={f} points={ring(f)} fill="none" stroke="var(--border)" strokeWidth={1} />)}
        {axes.map((_, i) => { const [ex, ey] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey} stroke="var(--border)" strokeWidth={1} /> })}
        <polygon points={poly} fill="color-mix(in srgb, var(--charge-hard) 20%, transparent)" stroke="var(--charge-hard)" strokeWidth={1.8} strokeLinejoin="round" />
        {axes.map((a, i) => { const [lx, ly] = pt(i, R + 15); return <text key={a.region} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: FB, fontSize: 9, fill: 'var(--text-dim)' }}>{a.region}</text> })}
      </svg>
    </div>
  )
}

// ── I. Donut mécanisme ────────────────────────────────────────────
function MechanismDonut({ inj }: { inj: Injury[] }) {
  const m = mechanismSplit(inj)
  if (m.total === 0) return <Empty />
  const progPct = Math.round((m.progressive / m.total) * 100)
  const C = 2 * Math.PI * 15.9
  const dash = (C * m.progressive) / m.total
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '2px 0 6px' }}>
        <svg viewBox="0 0 42 42" width={128} height={128}>
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--charge-mid)" strokeWidth="6" />
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--charge-hard)" strokeWidth="6" strokeDasharray={`${dash} ${C - dash}`} transform="rotate(-90 21 21)" strokeLinecap="round" />
          <text x="21" y="20.5" textAnchor="middle" style={{ fontFamily: FB, fontSize: 7, fontWeight: 700, fill: 'var(--text)' }}>{progPct}%</text>
          <text x="21" y="27" textAnchor="middle" style={{ fontFamily: FB, fontSize: 3.4, fill: 'var(--text-dim)' }}>{L.progressive.toLowerCase()}</text>
        </svg>
      </div>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Legend c="var(--charge-hard)" label={`${L.progressive} ${m.progressive}`} />
        <Legend c="var(--charge-mid)" label={`${L.soudaine} ${m.soudaine}`} />
      </div>
    </>
  )
}
function Legend({ c, label }: { c: string; label: string }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: FB, fontSize: 11, color: 'var(--text-dim)' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />{label}</span>
}

// ── G. Heatmap saisonnalité ───────────────────────────────────────
function SeasonHeatmap({ inj }: { inj: Injury[] }) {
  const { years, matrix, byMonth } = seasonality(inj, 3)
  const max = Math.max(...matrix.flat(), 1)
  if (byMonth.every(v => v === 0)) return <Empty />
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: `28px repeat(12, 1fr)`, gap: 5, alignItems: 'center' }}>
        {years.map((yr, ri) => (
          <div key={yr} style={{ display: 'contents' }}>
            <span style={{ ...muted, fontSize: 10, textAlign: 'right' }}>{String(yr).slice(2)}</span>
            {matrix[ri].map((v, mi) => {
              const op = v === 0 ? 0.07 : 0.28 + 0.72 * (v / max)
              return <div key={mi} title={`${v}`} style={{ height: 16, borderRadius: 4, background: `color-mix(in srgb, var(--charge-hard) ${Math.round(op * 100)}%, transparent)` }} />
            })}
          </div>
        ))}
        <span />
        {L.months.map((mo, i) => <span key={i} style={{ ...muted, fontSize: 9, textAlign: 'center' }}>{mo}</span>)}
      </div>
    </>
  )
}

// ── J. Courbe de douleur type ─────────────────────────────────────
function PainCurveChart({ inj, logs }: { inj: Injury[]; logs: InjuryLog[] }) {
  const { t } = useI18n()
  const curve = aggregatePainCurve(inj, logs)
  if (!curve) return <Empty />
  const W = 460, H = 150, padB = 22
  const x = (i: number) => (i / (curve.buckets - 1)) * W
  const y = (v: number) => 8 + (1 - v / 10) * (H - padB - 8)
  const path = (arr: number[]) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  return (
    <>
      <div style={{ width: '100%', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
          <line x1={0} y1={y(0)} x2={W} y2={y(0)} stroke="var(--border)" strokeWidth={1} />
          <line x1={0} y1={y(5)} x2={W} y2={y(5)} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 6" />
          <path d={path(curve.rest)} fill="none" stroke="var(--text-dim)" strokeWidth={1.8} strokeDasharray="4 4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <path d={path(curve.effort)} fill="none" stroke="var(--charge-hard)" strokeWidth={2.4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ ...muted, fontSize: 10 }}>J0</span>
        <span style={{ ...muted, fontSize: 10 }}>{t('w1f.resolved')}</span>
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
        <Legend c="var(--charge-hard)" label={L.atEffort} />
        <Legend c="var(--text-dim)" label={L.atRest} />
      </div>
    </>
  )
}

// ── Composant principal ───────────────────────────────────────────
export function AnalysisTab({ injuries, logs }: { injuries: Injury[]; logs: InjuryLog[] }) {
  const { t } = useI18n()
  const s = stats12mo(injuries)
  const struct = healingByStructure(injuries)
  const sev = healingBySeverity(injuries)
  const chronic = chronicZones(injuries).filter(z => z.count >= 1)
  const ret = returnAccuracy(injuries)
  const adh = adherenceVsHealing(injuries)
  const maxAdhDays = Math.max(...adh.map(a => a.days), 1)

  const kpi = (label: string, value: string, sub: string, color?: string) => (
    <div style={card}>
      <p style={eyebrow}>{label}</p>
      <p className="tnum" style={{ fontFamily: FB, fontSize: 26, fontWeight: 700, color: color ?? 'var(--text)', margin: '4px 0 0' }}>{value}</p>
      <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', margin: '3px 0 0' }}>{sub}</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* KPIs */}
      <div data-guide="inj-analytics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 'var(--space-4)' }}>
        {kpi(L.stInjuries, `${s.count}`, `${injuries.filter(i => i.status === 'active').length} ${t('w1f.active')} · ${injuries.filter(i => i.status === 'resolved').length} ${t('w1f.resolvedPlural')}`)}
        {kpi(L.stDuration, s.avgDuration == null ? '—' : `${s.avgDuration} ${L.day}`, t('w1f.onsetResolution'))}
        {kpi(L.stRecidive, s.recidiveRate == null ? '—' : `${s.recidiveRate}%`, t('w1f.alreadyHitZone'), s.recidiveRate != null && s.recidiveRate >= 33 ? 'var(--charge-mid)' : undefined)}
        {kpi(L.stReturn, s.avgReturn == null ? '—' : `${s.avgReturn} ${L.day}`, t('w1f.effectiveReturn'))}
      </div>

      {/* D — disponibilité pleine largeur */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr' }}>
        <Card title={L.availOverTime} cap={L.availCap}><AvailabilityChart inj={injuries} /></Card>
      </div>

      {/* B + C */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
        <Card title={L.healing} cap={L.healingCap}>
          {struct.length === 0 ? <Empty /> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FB, fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)', padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>{L.structure}</th>
                    <th style={{ textAlign: 'right', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)', padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>{L.episodes}</th>
                    <th style={{ textAlign: 'right', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)', padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>{L.healingCol}</th>
                  </tr>
                </thead>
                <tbody>
                  {struct.map(r => (
                    <tr key={r.key}>
                      <td style={{ padding: '8px', borderBottom: '1px solid var(--border)', color: 'var(--text-mid)', fontWeight: 600 }}>{L.structLabels[r.key] ?? r.key}</td>
                      <td className="tnum" style={{ padding: '8px', borderBottom: '1px solid var(--border)', textAlign: 'right', color: 'var(--text-dim)' }}>{r.count}</td>
                      <td className="tnum" style={{ padding: '8px', borderBottom: '1px solid var(--border)', textAlign: 'right', color: 'var(--text)', fontWeight: 600 }}>{r.avgDays} {L.day}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {sev.length > 0 && (
            <p style={{ ...muted, marginTop: 12 }}>
              {L.bySeverity} — {sev.map((r, i) => <span key={r.key}>{i > 0 ? ' · ' : ''}{SEV_LABEL[r.key as Severity]} <b className="tnum" style={{ color: 'var(--text)' }}>{r.avgDays} {L.day}</b></span>)}
            </p>
          )}
        </Card>

        <Card title={L.chronic} cap={L.chronicCap}>
          {chronic.length === 0 ? <Empty /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {chronic.map(z => (
                <div key={z.zone} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: CHRONIC_COLOR[z.status], marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontFamily: FB, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{z.zone}</span>
                      {z.status !== 'ok'
                        ? <span style={{ fontFamily: FB, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: CHRONIC_COLOR[z.status], background: `color-mix(in srgb, ${CHRONIC_COLOR[z.status]} 14%, transparent)`, padding: '2px 8px', borderRadius: 999 }}>{z.status === 'chronic' ? L.tagChronic : L.tagWatch}</span>
                        : <span style={{ ...muted, fontSize: 11 }}>{L.noRecidive}</span>}
                    </div>
                    <span className="tnum" style={{ ...muted }}>{z.count} {z.count > 1 ? t('w1f.episodes') : t('w1f.episode')}{z.avgIntervalDays != null ? ` · ${L.everyMonths(Math.max(1, Math.round(z.avgIntervalDays / 30)))}` : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* F + I + E */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-4)' }}>
        <Card title={L.fragility} cap={L.fragilityCap}><FragilityRadar inj={injuries} /></Card>
        <Card title={L.mechanism} cap={L.mechanismCap}><MechanismDonut inj={injuries} /></Card>
        <Card title={L.returnAcc} cap={L.returnAccCap}>
          {ret.rows.length === 0 ? <Empty /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ret.rows.slice(0, 3).map((r, i) => {
                const m = Math.max(r.estDays, r.realDays, 1)
                return (
                  <div key={i}>
                    <span style={muted}>{r.zone}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--bg-card2)', overflow: 'hidden' }}><i style={{ display: 'block', height: '100%', width: `${(r.estDays / m) * 100}%`, background: 'var(--text-dim)', borderRadius: 999 }} /></div>
                      <span className="tnum" style={{ ...muted, fontSize: 11, width: 52, textAlign: 'right' }}>{L.est} {r.estDays}{L.day}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--bg-card2)', overflow: 'hidden' }}><i style={{ display: 'block', height: '100%', width: `${(r.realDays / m) * 100}%`, background: r.delta > 0 ? 'var(--charge-hard)' : 'var(--charge-low)', borderRadius: 999 }} /></div>
                      <span className="tnum" style={{ fontSize: 11, width: 52, textAlign: 'right', color: r.delta > 0 ? 'var(--charge-hard)' : 'var(--charge-low)' }}>{L.real} {r.realDays}{L.day}</span>
                    </div>
                  </div>
                )
              })}
              {ret.meanBias != null && ret.meanBias !== 0 && (
                <p style={{ ...muted, marginTop: 2 }}>{ret.meanBias > 0 ? L.under : L.over} <b style={{ color: ret.meanBias > 0 ? 'var(--charge-hard)' : 'var(--charge-low)' }}>{Math.abs(ret.meanBias)} {L.day}</b> {L.onAvg}</p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* G + J */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
        <Card title={L.season} cap={L.seasonCap}><SeasonHeatmap inj={injuries} /></Card>
        <Card title={L.painCurve} cap={L.painCurveCap}><PainCurveChart inj={injuries} logs={logs} /></Card>
      </div>

      {/* K — pleine largeur */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr' }}>
        <Card title={L.adherence} cap={L.adherenceCap}>
          {adh.length === 0 ? <Empty /> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-5)' }}>
              {adh.map((a, i) => (
                <div key={i}>
                  <span style={muted}>{a.zone}</span>
                  <div style={{ height: 6, borderRadius: 999, background: 'var(--bg-card2)', overflow: 'hidden', margin: '6px 0' }}>
                    <i style={{ display: 'block', height: '100%', width: `${a.adherence}%`, background: SEV[a.severity].varc, borderRadius: 999 }} />
                  </div>
                  <span className="tnum" style={{ ...muted }}>{a.adherence}% · {a.days} {L.day}<span style={{ opacity: 0.5 }}> · {Math.round((a.days / maxAdhDays) * 100)}%{t('w1f.ofLongest')}</span></span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
