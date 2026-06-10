'use client'
// Onglet Aperçu : 3 stats (disponibilité, risque [indisponible V1], dispo 12 mois),
// liste « En cours », check-in du jour. Sévérité en touche (filet/point/tag).
import { useState } from 'react'
import { AnimatedBar } from '@/components/ui/AnimatedBar'
import { SEV, type Injury } from '../types'
import { availability12mo, daysSince, phasePct } from '../lib'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const lbl: React.CSSProperties = { fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: 0 }

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ flex: 1, minWidth: 150 }}>
      <p style={lbl}>{label}</p>
      <p className="tnum" style={{ fontFamily: FB, fontSize: 22, fontWeight: 600, color: 'var(--text)', margin: 'var(--space-1) 0 0' }}>{value}</p>
      <p style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-mid)', margin: 'var(--space-1) 0 0' }}>{sub}</p>
    </div>
  )
}

function Checkin({ inj, onLog }: { inj: Injury; onLog: (r: number, e: number) => void }) {
  const [r, setR] = useState(inj.intensity_rest ?? 0)
  const [e, setE] = useState(inj.intensity_effort ?? 0)
  const num: React.CSSProperties = { width: 52, background: 'var(--input-bg)', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-sm)', padding: '5px 7px', fontFamily: FB, fontSize: 12, color: 'var(--text)', outline: 'none' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', padding: 'var(--space-2) 0' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: SEV[inj.severity].varc, flexShrink: 0 }} />
      <span style={{ fontFamily: FB, fontSize: 13, color: 'var(--text)', flex: 1, minWidth: 100 }}>{inj.zone}</span>
      <label style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)' }}>Repos <input type="number" min={0} max={10} value={r} onChange={ev => setR(Number(ev.target.value))} style={num} /></label>
      <label style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)' }}>Effort <input type="number" min={0} max={10} value={e} onChange={ev => setE(Number(ev.target.value))} style={num} /></label>
      <button onClick={() => onLog(r, e)} style={{ border: 'none', background: 'transparent', color: 'var(--primary)', fontFamily: FB, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Logger</button>
    </div>
  )
}

function Card({ inj, onOpen }: { inj: Injury; onOpen: () => void }) {
  const side = inj.side && inj.side !== 'central' ? ` · ${inj.side}` : ''
  return (
    <div className="card-interactive" onClick={onOpen} style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
      <span style={{ width: 3, alignSelf: 'stretch', borderRadius: 999, background: SEV[inj.severity].varc, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{inj.zone}{side}</span>
          <span style={{ fontFamily: FB, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: SEV[inj.severity].varc }}>{SEV[inj.severity].label}</span>
          {inj.structure && <span style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)' }}>· {inj.structure}</span>}
        </div>
        <p className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', margin: 'var(--space-1) 0' }}>
          repos {inj.intensity_rest ?? '—'}/10 · effort {inj.intensity_effort ?? '—'}/10 · depuis {daysSince(inj.onset_date)} j{inj.activity ? ` · ${inj.activity}` : ''}
        </p>
        <AnimatedBar pct={phasePct(inj.phase) * 100} color="var(--text-mid)" height={5} />
        <p style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)', margin: 'var(--space-1) 0 0' }}>
          Phase {inj.phase}{inj.return_estimate_date ? ` · retour estimé ${inj.return_estimate_date}` : ''}
        </p>
      </div>
    </div>
  )
}

export function OverviewTab({ injuries, onOpen, onCheckin }: {
  injuries: Injury[]; onOpen: (inj: Injury) => void; onCheckin: (inj: Injury, r: number, e: number) => void
}) {
  const active = injuries.filter(i => i.status === 'active')
  const hasBlessure = active.some(i => i.severity === 'blessure')
  const avoid = [...new Set(active.flatMap(i => i.impact.avoid))]
  const avail = availability12mo(injuries)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
        <Stat label="Disponibilité" value={hasBlessure ? 'Repos conseillé' : active.length ? 'Adapté' : 'Disponible'} sub={avoid.length ? `À éviter : ${avoid.join(', ')}` : 'Aucune limite'} />
        <Stat label="Indice de risque" value="—" sub="Indisponible (nécessite la charge, à venir)" />
        <Stat label="Disponibilité 12 mois" value={`${avail}%`} sub="jours sans blessure active" />
      </div>

      <div>
        <p style={{ ...lbl, marginBottom: 'var(--space-3)' }}>En cours</p>
        {active.length === 0
          ? <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 0 }}>Aucun signalement actif.</p>
          : active.map(i => <Card key={i.id} inj={i} onOpen={() => onOpen(i)} />)}
      </div>

      {active.length > 0 && (
        <div>
          <p style={{ ...lbl, marginBottom: 'var(--space-2)' }}>Check-in du jour</p>
          {active.map(i => <Checkin key={i.id} inj={i} onLog={(r, e) => onCheckin(i, r, e)} />)}
        </div>
      )}
    </div>
  )
}
