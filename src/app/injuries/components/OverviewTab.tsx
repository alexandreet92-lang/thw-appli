'use client'
// Onglet Aperçu : 3 stats (disponibilité, risque [indisponible V1], dispo 12 mois),
// liste « En cours », check-in du jour. Sévérité en touche (filet/point/tag).
import { useState } from 'react'
import Link from 'next/link'
import { AnimatedBar } from '@/components/ui/AnimatedBar'
import { SEV, PHASES, type Injury, type InjuryLog, type Phase } from '../types'
import { availability12mo, daysSince, phasePct, riskIndex, returnProgress, sortedLogs, painTrend, preventionAlerts, type RiskLevel, type TrendDir } from '../lib'
import { useI18n } from '@/lib/i18n'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const lbl: React.CSSProperties = { fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: 0 }

const phaseLabel = (p: Phase) => PHASES.find(x => x.id === p)?.label ?? p
const RISK_COLOR: Record<RiskLevel, string> = {
  none: 'var(--text)', low: 'var(--charge-low)', moderate: 'var(--charge-mid)', high: 'var(--charge-hard)',
}
const TREND_COLOR: Record<TrendDir, string> = { down: 'var(--charge-low)', flat: 'var(--text-mid)', up: 'var(--charge-hard)' }

// Sparkline « douleur à l'effort » — taille FIXE (aucun scaling), forme d'un coup d'œil.
function Sparkline({ pts, color }: { pts: number[]; color: string }) {
  if (pts.length < 2) return null
  const W = 66, H = 22, pad = 2
  const x = (i: number) => pad + (i / (pts.length - 1)) * (W - 2 * pad)
  const y = (v: number) => pad + (1 - Math.max(0, Math.min(10, v)) / 10) * (H - 2 * pad)
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: 'block', flexShrink: 0 }} aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
      <circle cx={x(pts.length - 1)} cy={y(pts[pts.length - 1])} r={2} fill={color} />
    </svg>
  )
}

function Stat({ label, value, sub, valueColor }: { label: string; value: string; sub: string; valueColor?: string }) {
  return (
    <div style={{ flex: 1, minWidth: 150 }}>
      <p style={lbl}>{label}</p>
      <p className="tnum" style={{ fontFamily: FB, fontSize: 22, fontWeight: 600, color: valueColor ?? 'var(--text)', margin: 'var(--space-1) 0 0' }}>{value}</p>
      <p style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-mid)', margin: 'var(--space-1) 0 0' }}>{sub}</p>
    </div>
  )
}

function Checkin({ inj, onLog }: { inj: Injury; onLog: (r: number, e: number) => void }) {
  const { t } = useI18n()
  const [r, setR] = useState(inj.intensity_rest ?? 0)
  const [e, setE] = useState(inj.intensity_effort ?? 0)
  const num: React.CSSProperties = { width: 52, background: 'var(--input-bg)', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-sm)', padding: '5px 7px', fontFamily: FB, fontSize: 12, color: 'var(--text)', outline: 'none' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', padding: 'var(--space-2) 0' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: SEV[inj.severity].varc, flexShrink: 0 }} />
      <span style={{ fontFamily: FB, fontSize: 13, color: 'var(--text)', flex: 1, minWidth: 100 }}>{inj.zone}</span>
      <label style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)' }}>{t('injuries.checkinRest')} <input type="number" min={0} max={10} value={r} onChange={ev => setR(Number(ev.target.value))} style={num} /></label>
      <label style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)' }}>{t('injuries.checkinEffort')} <input type="number" min={0} max={10} value={e} onChange={ev => setE(Number(ev.target.value))} style={num} /></label>
      <button onClick={() => onLog(r, e)} style={{ border: 'none', background: 'transparent', color: 'var(--primary)', fontFamily: FB, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t('injuries.checkinLog')}</button>
    </div>
  )
}

function Card({ inj, logs, onOpen }: { inj: Injury; logs: InjuryLog[]; onOpen: () => void }) {
  const { t } = useI18n()
  const side = inj.side && inj.side !== 'central' ? ` · ${inj.side}` : ''
  const sevC = SEV[inj.severity].varc
  const ret = returnProgress(inj)
  const spark = sortedLogs(logs, inj.id).filter(l => l.intensity_effort != null).map(l => l.intensity_effort as number).slice(-8)
  const trend = painTrend(logs, inj.id)
  return (
    <div className="card-interactive" onClick={onOpen} style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
      <span style={{ width: 3, alignSelf: 'stretch', borderRadius: 999, background: sevC, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{inj.zone}{side}</span>
          <span style={{ fontFamily: FB, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: sevC, background: `color-mix(in srgb, ${sevC} 14%, transparent)`, padding: '2px 7px', borderRadius: 999 }}>{SEV[inj.severity].label}</span>
          {inj.structure && <span style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)' }}>· {inj.structure}</span>}
          {spark.length >= 2 && (
            <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {trend && <span style={{ width: 6, height: 6, borderRadius: '50%', background: TREND_COLOR[trend.dir], flexShrink: 0 }} />}
              <Sparkline pts={spark} color={SEV[inj.severity].varc} />
            </span>
          )}
        </div>
        <p className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', margin: 'var(--space-1) 0' }}>
          {t('injuries.cardMetrics', { rest: inj.intensity_rest ?? '—', effort: inj.intensity_effort ?? '—', days: daysSince(inj.onset_date) })}
          {inj.activity && <> · <Link href="/activities" onClick={e => e.stopPropagation()} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>{inj.activity}</Link></>}
        </p>
        {/* Phase (barre colorée par sévérité) + libellé propre */}
        <AnimatedBar pct={phasePct(inj.phase) * 100} color={sevC} height={6} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: 'var(--space-1) 0 0' }}>
          <span style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)' }}>{t('injuries.phaseLabel')} {phaseLabel(inj.phase)}</span>
          {ret && (
            <span style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, color: ret.overdue ? 'var(--charge-hard)' : 'var(--primary)' }}>
              {ret.overdue ? `Retour dépassé de ${ret.daysLeft} j` : `Retour dans ${ret.daysLeft} j`}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function OverviewTab({ injuries, logs, onOpen, onCheckin }: {
  injuries: Injury[]; logs: InjuryLog[]; onOpen: (inj: Injury) => void; onCheckin: (inj: Injury, r: number, e: number) => void
}) {
  const { t } = useI18n()
  const active = injuries.filter(i => i.status === 'active')
  const hasBlessure = active.some(i => i.severity === 'blessure')
  const avoid = [...new Set(active.flatMap(i => i.impact.avoid))]
  const avail = availability12mo(injuries)
  const risk = riskIndex(injuries)
  const alerts = preventionAlerts(injuries, logs)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      <div data-guide="inj-stats" style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
        <Stat label={t('injuries.statAvailability')} value={hasBlessure ? t('injuries.availRestAdvised') : active.length ? t('injuries.availAdapted') : t('injuries.availAvailable')} sub={avoid.length ? t('injuries.availAvoid', { list: avoid.join(', ') }) : t('injuries.availNoLimit')} />
        <Stat label={t('injuries.statRisk')} value={risk.label} valueColor={RISK_COLOR[risk.level]} sub={risk.drivers.length ? risk.drivers.join(' · ') : (risk.level === 'none' ? 'Aucun épisode actif' : 'Basé sur tes épisodes actifs')} />
        <Stat label={t('injuries.statAvailability12mo')} value={`${avail}%`} sub={t('injuries.statAvailability12moSub')} />
      </div>

      {/* Prévention & alertes — récidives chroniques + douleur qui remonte */}
      {alerts.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid color-mix(in srgb, var(--charge-mid) 32%, var(--border))', borderRadius: 'var(--r-md)', padding: 'var(--space-4) var(--space-5)' }}>
          <p style={{ ...lbl, color: 'var(--charge-mid)', marginBottom: 'var(--space-3)' }}>{t('injuries.preventionTitle')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-3) var(--space-6)' }}>
            {alerts.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: a.level === 'high' ? 'var(--charge-hard)' : 'var(--charge-mid)', marginTop: 5, flexShrink: 0 }} />
                <span style={{ fontFamily: FB, fontSize: 13, color: 'var(--text)', lineHeight: 1.45 }}>{a.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p style={{ ...lbl, marginBottom: 'var(--space-3)' }}>{t('injuries.ongoing')}</p>
        {active.length === 0
          ? <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 0 }}>{t('injuries.noActive')}</p>
          : active.map(i => <Card key={i.id} inj={i} logs={logs} onOpen={() => onOpen(i)} />)}
      </div>

      {active.length > 0 && (
        <div>
          <p style={{ ...lbl, marginBottom: 'var(--space-2)' }}>{t('injuries.checkinTitle')}</p>
          {active.map(i => <Checkin key={i.id} inj={i} onLog={(r, e) => onCheckin(i, r, e)} />)}
        </div>
      )}
    </div>
  )
}
