'use client'
// Feuille « Suivi » — refonte : relevé du jour par sliders (repos/effort), courbe
// de douleur agrandie avec SURVOL (date · repos · effort) + badge de TENDANCE,
// stepper de phases, impact, rééducation (adhérence), journal. Tokens uniquement.
import { useRef, useState } from 'react'
import { Sheet, primaryBtn } from './Sheet'
import { AnimatedBar } from '@/components/ui/AnimatedBar'
import { PHASES, type Injury, type InjuryLog } from '../types'
import { returnProgress, painTrend, rehabAdherence, sortedLogs, type TrendDir } from '../lib'
import { useI18n } from '@/lib/i18n'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const sec: React.CSSProperties = { fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-2)' }

const C_REST = 'var(--text-mid)'       // douleur au repos
const C_EFFORT = 'var(--charge-hard)'  // douleur à l'effort (plus critique)
const TREND_COLOR: Record<TrendDir, string> = { down: 'var(--charge-low)', flat: 'var(--text-mid)', up: 'var(--charge-hard)' }
const TREND_KEY: Record<TrendDir, string> = { down: 'injuries.trendDown', flat: 'injuries.trendFlat', up: 'injuries.trendUp' }

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 9, height: 3, borderRadius: 2, background: color, display: 'inline-block' }} />
      <span style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-mid)' }}>{label}</span>
    </span>
  )
}

function fmtDay(d: string): string { const p2 = d.slice(5); return `${p2.slice(3)}/${p2.slice(0, 2)}` }

function Curve({ pts }: { pts: InjuryLog[] }) {
  const { t } = useI18n()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hi, setHi] = useState<number | null>(null)
  if (pts.length < 1) return <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>{t('injuries.curveNotEnough')}</p>

  // viewBox ≈ largeur de rendu (feuille 600 − 2×24) → aucun scaling grotesque.
  const W = 552, H = 172, pl = 26, pr = 12, pt = 12, pb = 26, n = pts.length
  const x = (i: number) => pl + (n === 1 ? (W - pl - pr) / 2 : (i / (n - 1)) * (W - pl - pr))
  const y = (v: number) => pt + (1 - v / 10) * (H - pt - pb)
  const line = (key: 'intensity_rest' | 'intensity_effort') =>
    pts.map((l, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(l[key] ?? 0).toFixed(1)}`).join(' ')
  const areaEffort = `M${x(0).toFixed(1)},${(H - pb).toFixed(1)} ` +
    pts.map((l, i) => `L${x(i).toFixed(1)},${y(l.intensity_effort ?? 0).toFixed(1)}`).join(' ') +
    ` L${x(n - 1).toFixed(1)},${(H - pb).toFixed(1)} Z`

  function onMove(e: React.MouseEvent) {
    const r = wrapRef.current?.getBoundingClientRect()
    if (!r) return
    const frac = (e.clientX - r.left) / r.width
    const plotFrac = (frac - pl / W) / ((W - pl - pr) / W)
    const i = Math.max(0, Math.min(n - 1, Math.round(plotFrac * (n - 1))))
    setHi(i)
  }
  const cur = hi != null ? pts[hi] : null

  return (
    <div ref={wrapRef} style={{ position: 'relative' }} onMouseMove={onMove} onMouseLeave={() => setHi(null)}>
      <div style={{ display: 'flex', gap: 14, marginBottom: 6 }}>
        <LegendDot color={C_EFFORT} label="À l'effort" />
        <LegendDot color={C_REST} label="Au repos" />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {[0, 5, 10].map(v => (
          <g key={v}>
            <line x1={pl} y1={y(v)} x2={W - pr} y2={y(v)} stroke="var(--border)" strokeWidth={1} opacity={0.6} />
            <text x={pl - 5} y={y(v) + 3.5} fontFamily={FB} fontSize={9} fill="var(--text-dim)" textAnchor="end">{v}</text>
          </g>
        ))}
        {n > 1 && <path d={areaEffort} fill={C_EFFORT} opacity={0.1} />}
        {n > 1 && <path d={line('intensity_rest')} fill="none" stroke={C_REST} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
        {n > 1 && <path d={line('intensity_effort')} fill="none" stroke={C_EFFORT} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
        {/* Repère de survol */}
        {cur && <line x1={x(hi as number)} y1={pt} x2={x(hi as number)} y2={H - pb} stroke="var(--primary)" strokeWidth={1} strokeDasharray="2 3" opacity={0.7} />}
        {pts.map((l, i) => (
          <g key={l.id}>
            {l.intensity_rest != null && <circle cx={x(i)} cy={y(l.intensity_rest)} r={hi === i ? 3.5 : 2.5} fill={C_REST} />}
            {l.intensity_effort != null && <circle cx={x(i)} cy={y(l.intensity_effort)} r={hi === i ? 3.5 : 2.5} fill={C_EFFORT} />}
          </g>
        ))}
        <text x={pl} y={H - 7} fontFamily={FB} fontSize={9} fill="var(--text-dim)" textAnchor="start">{fmtDay(pts[0].log_date)}</text>
        {n > 1 && <text x={W - pr} y={H - 7} fontFamily={FB} fontSize={9} fill="var(--text-dim)" textAnchor="end">{fmtDay(pts[n - 1].log_date)}</text>}
      </svg>
      {/* Bulle de survol */}
      {cur && (
        <div style={{ position: 'absolute', top: 22, left: `${(x(hi as number) / W) * 100}%`, transform: 'translateX(-50%)', pointerEvents: 'none', background: 'var(--bg-card2)', borderRadius: 'var(--r-sm)', padding: '6px 9px', whiteSpace: 'nowrap', boxShadow: 'var(--shadow-card)' }}>
          <p className="tnum" style={{ margin: 0, fontFamily: FB, fontSize: 10.5, fontWeight: 600, color: 'var(--text)' }}>{cur.log_date}</p>
          <p className="tnum" style={{ margin: '2px 0 0', fontFamily: FB, fontSize: 10.5, color: 'var(--text-mid)' }}>
            <span style={{ color: C_EFFORT }}>●</span> {t('injuries.effort')} {cur.intensity_effort ?? '—'} · <span style={{ color: C_REST }}>●</span> {t('injuries.rest')} {cur.intensity_rest ?? '—'}
          </p>
        </div>
      )}
    </div>
  )
}

// Relevé rapide du jour : deux sliders 0-10 (repos / effort) + enregistrer.
function QuickCheckin({ inj, onAddLog }: { inj: Injury; onAddLog: (l: Omit<InjuryLog, 'id'>) => void }) {
  const { t } = useI18n()
  const [r, setR] = useState(inj.intensity_rest ?? 0)
  const [e, setE] = useState(inj.intensity_effort ?? 0)
  const Row = ({ label, val, set, color }: { label: string; val: number; set: (n: number) => void; color: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
      <span style={{ width: 48, flexShrink: 0, fontFamily: FB, fontSize: 12, color: 'var(--text-mid)' }}>{label}</span>
      <input type="range" min={0} max={10} value={val} onChange={ev => set(Number(ev.target.value))} style={{ flex: 1, accentColor: color }} />
      <span className="tnum" style={{ width: 20, flexShrink: 0, textAlign: 'right', fontFamily: FB, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{val}</span>
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <Row label={t('injuries.rest')} val={r} set={setR} color={C_REST} />
      <Row label={t('injuries.effort')} val={e} set={setE} color={C_EFFORT} />
      <button onClick={() => onAddLog({ injury_id: inj.id, log_date: new Date().toISOString().slice(0, 10), note: null, intensity_rest: r, intensity_effort: e })}
        style={{ alignSelf: 'flex-start', marginTop: 4, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 12, fontWeight: 600, cursor: 'pointer', height: 34, padding: '0 16px', borderRadius: 'var(--r-sm)' }}>
        {t('injuries.save')}
      </button>
    </div>
  )
}

export function TrackSheet({ injury, logs, onClose, onUpdate, onAddLog, onResolve }: {
  injury: Injury; logs: InjuryLog[]
  onClose: () => void
  onUpdate: (id: string, patch: Partial<Injury>) => void
  onAddLog: (log: Omit<InjuryLog, 'id'>) => void
  onResolve: (id: string) => void
}) {
  const { t } = useI18n()
  const [note, setNote] = useState('')
  const mine = logs.filter(l => l.injury_id === injury.id)
  const curvePts = sortedLogs(logs, injury.id)
  const curIdx = PHASES.findIndex(p => p.id === injury.phase)
  const trend = painTrend(logs, injury.id)
  const adh = rehabAdherence(injury)
  const toggleExo = (idx: number) => onUpdate(injury.id, { rehab: injury.rehab.map((x, i) => i === idx ? { ...x, done: !x.done } : x) })

  return (
    <Sheet title={injury.zone} onClose={onClose}
      footer={<button onClick={() => { onResolve(injury.id); onClose() }} style={{ ...primaryBtn, background: 'var(--bg-card2)', color: 'var(--text)' }}>{t('injuries.markResolved')}</button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* Relevé du jour */}
        <div>
          <p style={sec}>{t('injuries.quickCheckin')}</p>
          <QuickCheckin inj={injury} onAddLog={onAddLog} />
        </div>

        {/* Phase */}
        <div>
          <p style={sec}>{t('injuries.phaseLabel')}</p>
          <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
            {PHASES.map((p, i) => (
              <button key={p.id} onClick={() => onUpdate(injury.id, { phase: p.id })} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px 10px', borderRadius: 'var(--r-sm)', fontFamily: FB, fontSize: 12, fontWeight: i === curIdx ? 600 : 500, color: i === curIdx ? 'var(--text)' : 'var(--text-dim)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: i <= curIdx ? 'var(--primary)' : 'var(--border)' }} />{p.label}
              </button>
            ))}
          </div>
          {(() => {
            const ret = returnProgress(injury)
            if (!ret) return null
            return (
              <div style={{ marginTop: 'var(--space-3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)' }}>Retour au sport</span>
                  <span style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, color: ret.overdue ? 'var(--charge-hard)' : 'var(--primary)' }}>{ret.overdue ? `dépassé de ${ret.daysLeft} j` : `dans ${ret.daysLeft} j`}</span>
                </div>
                <AnimatedBar pct={ret.pct * 100} color={ret.overdue ? 'var(--charge-hard)' : 'var(--primary)'} height={6} />
              </div>
            )
          })()}
        </div>

        {/* Courbe de douleur + tendance */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '0 0 var(--space-2)' }}>
            <p style={{ ...sec, margin: 0 }}>{t('injuries.painCurve')}</p>
            {trend && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: FB, fontSize: 11, fontWeight: 600, color: TREND_COLOR[trend.dir] }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: TREND_COLOR[trend.dir] }} />
                {t(TREND_KEY[trend.dir])}{trend.delta !== 0 && <span className="tnum" style={{ color: 'var(--text-dim)', fontWeight: 500 }}>{trend.delta > 0 ? `+${trend.delta}` : trend.delta}</span>}
              </span>
            )}
          </div>
          <Curve pts={curvePts} />
        </div>

        {(injury.impact.avoid.length > 0 || injury.impact.ok.length > 0) && (
          <div>
            <p style={sec}>{t('injuries.impactTitle')}</p>
            {injury.impact.avoid.length > 0 && <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', margin: 0 }}>{t('injuries.availAvoid', { list: injury.impact.avoid.join(', ') })}</p>}
            {injury.impact.ok.length > 0 && <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', margin: 'var(--space-1) 0 0' }}>{t('injuries.impactOk', { list: injury.impact.ok.join(', ') })}</p>}
          </div>
        )}

        {injury.rehab.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '0 0 var(--space-2)' }}>
              <p style={{ ...sec, margin: 0 }}>{t('injuries.rehabTitle')}</p>
              {adh && <span className="tnum" style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, color: adh.done === adh.total ? 'var(--charge-low)' : 'var(--text-mid)' }}>{t('injuries.rehabAdherence', { done: adh.done, total: adh.total })}</span>}
            </div>
            {adh && <div style={{ marginBottom: 'var(--space-2)' }}><AnimatedBar pct={(adh.done / adh.total) * 100} color={adh.done === adh.total ? 'var(--charge-low)' : 'var(--primary)'} height={5} /></div>}
            {injury.rehab.map((x, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-1) 0', cursor: 'pointer' }}>
                <input type="checkbox" checked={x.done} onChange={() => toggleExo(i)} style={{ accentColor: 'var(--primary)' }} />
                <span style={{ fontFamily: FB, fontSize: 13, color: x.done ? 'var(--text-dim)' : 'var(--text)' }}>{x.nom}{x.detail ? ` — ${x.detail}` : ''}</span>
              </label>
            ))}
          </div>
        )}

        {(injury.practitioner || injury.next_appointment) && (
          <div>
            <p style={sec}>{t('injuries.medicalTitle')}</p>
            {injury.practitioner && <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', margin: 0 }}>{t('injuries.practitioner', { name: injury.practitioner })}</p>}
            {injury.next_appointment && <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', margin: 'var(--space-1) 0 0' }}>{t('injuries.nextAppointment', { date: injury.next_appointment })}</p>}
          </div>
        )}

        <div>
          <p style={sec}>{t('injuries.journalTitle')}</p>
          {mine.length === 0 && <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', margin: '0 0 var(--space-2)' }}>{t('injuries.journalEmpty')}</p>}
          {mine.slice().reverse().map(l => (
            <div key={l.id} style={{ padding: 'var(--space-1) 0' }}>
              <span className="tnum" style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)' }}>{l.log_date}</span>
              <span style={{ fontFamily: FB, fontSize: 13, color: 'var(--text)', marginLeft: 'var(--space-2)' }}>{l.note ?? t('injuries.logFallback', { rest: l.intensity_rest ?? '—', effort: l.intensity_effort ?? '—' })}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder={t('injuries.addNotePlaceholder')} style={{ flex: 1, background: 'var(--input-bg)', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-sm)', padding: '8px 10px', fontFamily: FB, fontSize: 13, color: 'var(--text)', outline: 'none' }} />
            <button onClick={() => { if (note.trim()) { onAddLog({ injury_id: injury.id, log_date: new Date().toISOString().slice(0, 10), note: note.trim(), intensity_rest: null, intensity_effort: null }); setNote('') } }} style={{ border: 'none', background: 'transparent', color: 'var(--primary)', fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t('injuries.addBtn')}</button>
          </div>
        </div>
      </div>
    </Sheet>
  )
}
