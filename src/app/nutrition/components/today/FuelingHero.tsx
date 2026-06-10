'use client'

// Hero « Ton fueling du jour » : un seul anneau kcal (arc --primary, piste
// --border) + 3 barres de macros fines + note protéines g/kg + lien séance.
// Remplace les 4 MacroDonut. Tokens uniquement, aucune surface colorée.

import type { PlannedSession } from '@/hooks/usePlanning'
import { CHARGE_COLOR, CHARGE_LABEL, type DayType } from '../plan/planFormat'

interface Macro { proteines: number; glucides: number; lipides: number }

interface Props {
  todayType:    DayType
  consumedKcal: number
  targetKcal:   number
  consumed:     { prot: number; gluc: number; lip: number }
  target:       Macro
  weightKg:     number | null
  sessions:     PlannedSession[]
  isDesktop:    boolean
}

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const R = 54, STROKE = 9, CXY = 66, CIRC = 2 * Math.PI * R

function Ring({ consumed, target }: { consumed: number; target: number }) {
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0
  const dash = pct * CIRC
  return (
    <svg width={132} height={132} viewBox="0 0 132 132" style={{ flexShrink: 0 }}>
      <circle cx={CXY} cy={CXY} r={R} fill="none" stroke="var(--border)" strokeWidth={STROKE} />
      <circle cx={CXY} cy={CXY} r={R} fill="none" stroke="var(--primary)" strokeWidth={STROKE}
        strokeLinecap="round" strokeDasharray={`${dash} ${CIRC}`} transform={`rotate(-90 ${CXY} ${CXY})`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      <text x={CXY} y={CXY - 2} textAnchor="middle" className="tnum" fontFamily={FB} fontSize={26} fontWeight={600} fill="var(--text)">{Math.round(consumed)}</text>
      <text x={CXY} y={CXY + 16} textAnchor="middle" className="tnum" fontFamily={FB} fontSize={11} fill="var(--text-dim)">/ {Math.round(target)} kcal</text>
    </svg>
  )
}

function MacroBar({ label, c, t }: { label: string; c: number; t: number }) {
  const pct = t > 0 ? Math.min(c / t, 1) : 0
  return (
    <div style={{ marginBottom: 'var(--space-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
        <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)' }}>{label}</span>
        <span className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)' }}>{Math.round(c)} / {Math.round(t)} g</span>
      </div>
      <svg width="100%" height={6} style={{ display: 'block' }}>
        <rect x={0} y={0} width="100%" height={6} rx={3} fill="var(--border)" />
        <rect x={0} y={0} width={`${pct * 100}%`} height={6} rx={3} fill="var(--text-mid)" style={{ transition: 'width 0.5s ease' }} />
      </svg>
    </div>
  )
}

export function FuelingHero(p: Props) {
  const gkg = p.weightKg && p.weightKg > 0 ? (p.consumed.prot / p.weightKg).toFixed(1) : null
  const sessTitles = p.sessions.map(s => s.title).filter(Boolean).join(' · ')
  return (
    <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        <span style={{ fontFamily: FD, fontSize: 17, fontWeight: 500, color: 'var(--text)' }}>Ton fueling du jour</span>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: CHARGE_COLOR[p.todayType], flexShrink: 0 }} />
        <span style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)' }}>Jour {CHARGE_LABEL[p.todayType]}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: p.isDesktop ? 'row' : 'column', alignItems: p.isDesktop ? 'center' : 'stretch', gap: 'var(--space-6)' }}>
        <Ring consumed={p.consumedKcal} target={p.targetKcal} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <MacroBar label="Protéines" c={p.consumed.prot} t={p.target.proteines} />
          <MacroBar label="Glucides"  c={p.consumed.gluc} t={p.target.glucides} />
          <MacroBar label="Lipides"   c={p.consumed.lip}  t={p.target.lipides} />
        </div>
      </div>

      <div style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', marginTop: 'var(--space-2)' }}>
        {gkg ? <>Protéines <span className="tnum">{gkg}</span> g/kg</> : 'Renseigne ton poids pour le ratio g/kg'}
      </div>

      <div style={{ marginTop: 'var(--space-3)' }}>
        {sessTitles ? (
          <a href="/planning" style={{ fontFamily: FB, fontSize: 13, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>Calé sur {sessTitles} →</a>
        ) : (
          <span style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)' }}>Jour de repos — aucune séance calée</span>
        )}
      </div>
    </div>
  )
}
