'use client'
// ══════════════════════════════════════════════════════════════
// Blessures — version mobile façon Strava : bouton Signaler, puis une carte
// par sujet (disponibilité + risque, prévention, en cours, check-in de
// douleur, historique, analyse). Historique / Analyse s'ouvrent en vue détail
// qui glisse de la droite et réutilisent les onglets existants.
// ══════════════════════════════════════════════════════════════

import { useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { DashCard, Metric, Ring } from '@/components/dashboard/primitives'
import { DetailSlide } from '@/components/ui/DetailSlide'
import { useDetailView } from '@/hooks/useDetailView'
import { SEV, PHASES, type Injury, type InjuryLog } from '../types'
import { availability12mo, daysSince, phasePct, riskIndex, returnProgress, preventionAlerts, stats12mo, zonesRanking } from '../lib'
import { HistoryTab } from './HistoryTab'
import { AnalysisTab } from './AnalysisTab'

type View = 'history' | 'analysis'
const NUM: React.CSSProperties = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'zero' 0" }
const I = (d: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)
const IC = {
  dispo: I('M22 12h-4l-3 9L9 3l-3 9H2'),
  alert: I('M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01'),
  active: I('M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z'),
  check: I('M9 11l3 3 8-8M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'),
  trend: I('M3 3v18h18M7 16v-4M12 16V8M17 16v-7'),
}
const RISK_COLOR = { none: 'var(--text-mid)', low: 'var(--charge-low)', moderate: 'var(--charge-mid)', high: 'var(--charge-hard)' } as const

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const btn: React.CSSProperties = { width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--dash-chip, var(--bg-hover))', color: 'var(--text)', fontSize: 20, fontWeight: 700, cursor: 'pointer', display: 'grid', placeItems: 'center', fontFamily: 'inherit' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 0' }}>
      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button type="button" aria-label="−" className="thw-press" style={btn} onClick={() => onChange(Math.max(0, value - 1))}>−</button>
        <b style={{ ...NUM, width: 30, textAlign: 'center', fontSize: 20, color: 'var(--text)' }}>{value}</b>
        <button type="button" aria-label="+" className="thw-press" style={btn} onClick={() => onChange(Math.min(10, value + 1))}>+</button>
      </span>
    </div>
  )
}

function CheckinBlock({ inj, onLog }: { inj: Injury; onLog: (r: number, e: number) => Promise<void> | void }) {
  const { t } = useI18n()
  const [r, setR] = useState(inj.intensity_rest ?? 0)
  const [e, setE] = useState(inj.intensity_effort ?? 0)
  const [state, setState] = useState<'idle' | 'saving' | 'done'>('idle')
  const side = inj.side && inj.side !== 'central' ? ` · ${inj.side}` : ''
  return (
    <div style={{ padding: '4px 0 8px' }}>
      <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 700, color: 'var(--text)', textTransform: 'capitalize' }}>{inj.zone}{side}</p>
      <Stepper label={t('injuries.m.painRest')} value={r} onChange={v => { setR(v); setState('idle') }} />
      <Stepper label={t('injuries.m.painEffort')} value={e} onChange={v => { setE(v); setState('idle') }} />
      <button type="button" disabled={state === 'saving'} className="thw-press"
        onClick={async () => { setState('saving'); await onLog(r, e); setState('done') }}
        style={{ width: '100%', minHeight: 46, marginTop: 6, borderRadius: 'var(--r-pill)', border: 'none', background: state === 'done' ? 'var(--dash-chip, var(--bg-hover))' : 'var(--primary)', color: state === 'done' ? 'var(--success)' : 'var(--on-primary)', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        {state === 'done' ? `✓ ${t('injuries.m.saved')}` : state === 'saving' ? '…' : t('injuries.m.save')}
      </button>
    </div>
  )
}

export function MobileInjuries({ injuries, logs, onReport, onOpen, onCheckin }: {
  injuries: Injury[]
  logs: InjuryLog[]
  onReport: () => void
  onOpen: (inj: Injury) => void
  onCheckin: (inj: Injury, r: number, e: number) => Promise<void> | void
}) {
  const { t } = useI18n()
  const [view, open, close] = useDetailView<View>()

  if (view) {
    return (
      <div style={{ padding: '14px 16px 24px', fontFamily: 'var(--font-body)' }}>
        <DetailSlide backLabel={t('injuries.pageTitle')} onBack={close}>
          <div className="thw-mdetail">
            {view === 'history' ? <HistoryTab injuries={injuries} onOpen={onOpen} /> : <AnalysisTab injuries={injuries} logs={logs} />}
          </div>
        </DetailSlide>
      </div>
    )
  }

  const active = injuries.filter(i => i.status === 'active')
  const hasBlessure = active.some(i => i.severity === 'blessure')
  const avoid = [...new Set(active.flatMap(i => i.impact.avoid))]
  const okList = [...new Set(active.flatMap(i => i.impact.ok))]
  const avail = availability12mo(injuries)
  const risk = riskIndex(injuries)
  const alerts = preventionAlerts(injuries, logs)
  const s12 = stats12mo(injuries)
  const topZone = zonesRanking(injuries)[0]
  const dispoLabel = hasBlessure ? t('injuries.availRestAdvised') : active.length ? t('injuries.availAdapted') : t('injuries.availAvailable')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px 24px', fontFamily: 'var(--font-body)' }}>
      <button type="button" onClick={onReport} className="thw-press" data-guide="inj-declare"
        style={{ width: '100%', minHeight: 50, borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        + {t('injuries.m.report')}
      </button>

      <DashCard icon={IC.dispo} title={t('injuries.statAvailability')} meta={t('injuries.m.avail12', { n: avail })}>
        <Metric label={t('dashboard.today')} value={dispoLabel}
          sub={avoid.length ? t('injuries.m.avoid', { list: avoid.slice(0, 3).join(', ') }) : t('injuries.availNoLimit')}
          right={<Ring value={avail / 100} color="var(--success)" />} />
        {okList.length > 0 && <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-mid)' }}>{t('injuries.m.ok', { list: okList.slice(0, 3).join(', ') })}</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <span style={{ fontSize: 14, color: 'var(--text-mid)' }}>{t('injuries.statRisk')}</span>
          <span style={{ padding: '4px 10px', borderRadius: 'var(--r-pill)', fontSize: 13, fontWeight: 800, color: RISK_COLOR[risk.level], background: `color-mix(in srgb, ${RISK_COLOR[risk.level]} 14%, transparent)` }}>{risk.label}</span>
          {risk.drivers[0] && <span style={{ fontSize: 13, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{risk.drivers[0]}</span>}
        </div>
      </DashCard>

      {alerts.length > 0 && (
        <DashCard icon={IC.alert} title={t('injuries.preventionTitle')}>
          {alerts.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 0' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0, background: a.level === 'high' ? 'var(--charge-hard)' : 'var(--charge-mid)' }} />
              <span style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.4 }}>{a.text}</span>
            </div>
          ))}
        </DashCard>
      )}

      <DashCard icon={IC.active} title={t('injuries.ongoing')} meta={active.length ? String(active.length) : undefined}>
        {active.length === 0 ? <p style={{ margin: 0, fontSize: 15, color: 'var(--text-mid)' }}>{t('injuries.noActive')}</p> : active.map((inj, i) => {
          const c = SEV[inj.severity].varc
          const ret = returnProgress(inj)
          const side = inj.side && inj.side !== 'central' ? ` · ${inj.side}` : ''
          const phase = PHASES.find(p => p.id === inj.phase)?.label ?? inj.phase
          return (
            <button key={inj.id} type="button" onClick={() => onOpen(inj)}
              style={{ display: 'flex', gap: 12, width: '100%', textAlign: 'left', border: 'none', borderTop: i ? '1px solid var(--dash-line, var(--border))' : 'none', background: 'none', padding: i ? '12px 0 0' : 0, cursor: 'pointer', fontFamily: 'inherit' }}>
              <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, background: c, flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <b style={{ fontSize: 15, color: 'var(--text)', textTransform: 'capitalize' }}>{inj.zone}{side}</b>
                  <span style={{ fontSize: 12, fontWeight: 800, color: c }}>{SEV[inj.severity].label}</span>
                </span>
                <span style={{ display: 'block', fontSize: 13, color: 'var(--text-mid)', marginTop: 1 }}>
                  {[inj.structure && inj.structure !== 'inconnu' ? inj.structure : null, t('injuries.m.since', { n: daysSince(inj.onset_date) })].filter(Boolean).join(' · ')}
                </span>
                <span style={{ display: 'block', height: 6, borderRadius: 'var(--r-pill)', background: 'var(--bg-hover)', overflow: 'hidden', marginTop: 8 }}>
                  <i style={{ display: 'block', height: '100%', width: `${phasePct(inj.phase) * 100}%`, background: c, borderRadius: 'var(--r-pill)' }} />
                </span>
                <span style={{ display: 'block', fontSize: 13, color: 'var(--text-mid)', marginTop: 4 }}>
                  {phase}{ret ? ` · ${ret.overdue ? t('injuries.m.overdue', { n: ret.daysLeft }) : t('injuries.m.returnIn', { n: ret.daysLeft })}` : ''}
                </span>
              </span>
            </button>
          )
        })}
      </DashCard>

      {active.length > 0 && (
        <DashCard icon={IC.check} title={t('injuries.checkinTitle')}>
          {active.map((inj, i) => (
            <div key={inj.id} style={{ borderTop: i ? '1px solid var(--dash-line, var(--border))' : 'none', paddingTop: i ? 10 : 0 }}>
              <CheckinBlock inj={inj} onLog={(r, e) => onCheckin(inj, r, e)} />
            </div>
          ))}
        </DashCard>
      )}

      <DashCard icon={IC.trend} title={t('injuries.tabHistory')} onOpen={() => open('history')}>
        <Metric label={t('injuries.m.last12')} value={s12.count} unit={t('injuries.m.episodes', { n: s12.count })}
          sub={topZone ? t('injuries.m.topZone', { zone: topZone.key }) : t('injuries.m.noEpisode')} />
      </DashCard>

      <DashCard icon={IC.trend} title={t('injuries.tabAnalysis')} onOpen={() => open('analysis')}>
        <Metric label={t('injuries.m.avgHealing')} value={s12.avgDuration ?? '—'} unit={s12.avgDuration != null ? t('injuries.m.days') : undefined}
          sub={[s12.recidiveRate != null ? t('injuries.m.recid', { n: s12.recidiveRate }) : null, s12.avgReturn != null ? t('injuries.m.avgReturn', { n: s12.avgReturn }) : null].filter(Boolean).join(' · ') || undefined} />
      </DashCard>
    </div>
  )
}
