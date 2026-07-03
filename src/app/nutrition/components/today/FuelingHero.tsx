'use client'

// Hero « Ton fueling du jour » : anneau kcal (arc --primary, piste --border) + « X kcal
// restantes » + note d'ajustement à la charge + 3 barres de macros COLORÉES (chiffres
// neutres). Tokens uniquement, aucune surface colorée. SVG/CSS brut.

import type { PlannedSession } from '@/hooks/usePlanning'
import { CHARGE_COLOR, CHARGE_LABEL, type DayType } from '../plan/planFormat'
import { MacroBar } from './MacroBar'
import { useI18n } from '@/lib/i18n'

interface Macro { proteines: number; glucides: number; lipides: number }

interface Props {
  todayType:    DayType
  consumedKcal: number
  targetKcal:   number
  baseKcal:     number | null
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
        style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.22,1,0.36,1)' }} />
      <text x={CXY} y={CXY - 2} textAnchor="middle" className="tnum" fontFamily={FB} fontSize={26} fontWeight={600} fill="var(--text)">{Math.round(consumed)}</text>
      <text x={CXY} y={CXY + 16} textAnchor="middle" className="tnum" fontFamily={FB} fontSize={11} fill="var(--text-dim)">/ {Math.round(target)} kcal</text>
    </svg>
  )
}

export function FuelingHero(p: Props) {
  const { t } = useI18n()
  const gkg = p.weightKg && p.weightKg > 0 ? (p.consumed.prot / p.weightKg).toFixed(1) : null
  const sessTitles = p.sessions.map(s => s.title).filter(Boolean).join(' · ')
  const remaining = Math.max(0, Math.round(p.targetKcal - p.consumedKcal))
  const chargeDelta = p.baseKcal != null && p.targetKcal > p.baseKcal ? Math.round(p.targetKcal - p.baseKcal) : 0

  return (
    <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-6)', boxSizing: 'border-box', width: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: FD, fontSize: 17, fontWeight: 500, color: 'var(--text)' }}>{t('nutrition.hero.title')}</span>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: CHARGE_COLOR[p.todayType], flexShrink: 0 }} />
        <span style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)' }}>{t('nutrition.hero.dayPrefix')} {CHARGE_LABEL[p.todayType]}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: p.isDesktop ? 'row' : 'column', alignItems: p.isDesktop ? 'center' : 'stretch', gap: 'var(--space-6)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)', flexShrink: 0 }}>
          <Ring consumed={p.consumedKcal} target={p.targetKcal} />
          <span className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)' }}>
            {p.targetKcal > 0 ? <><strong style={{ fontWeight: 600, color: 'var(--text)' }}>{remaining}</strong> {t('nutrition.hero.kcalRemaining')}</> : t('nutrition.hero.noTarget')}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <MacroBar label={t('nutrition.macro.proteins')} consumed={p.consumed.prot} target={p.target.proteines} color="var(--macro-prot)" />
          <MacroBar label={t('nutrition.macro.carbs')}  consumed={p.consumed.gluc} target={p.target.glucides} color="var(--macro-gluc)" />
          <MacroBar label={t('nutrition.macro.fats')}   consumed={p.consumed.lip}  target={p.target.lipides}  color="var(--macro-lip)" />
        </div>
      </div>

      {/* Note d'ajustement à la charge — différenciateur charge-aware */}
      {chargeDelta > 0 && (
        <div style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', marginTop: 'var(--space-2)', lineHeight: 1.5 }}>
          {t('nutrition.hero.objective')} <span className="tnum" style={{ color: 'var(--text)', fontWeight: 600 }}>+{chargeDelta}</span> {t('nutrition.hero.chargeNote', { label: CHARGE_LABEL[p.todayType] })}
        </div>
      )}

      <div style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', marginTop: 'var(--space-2)' }}>
        {gkg ? <>{t('nutrition.macro.proteins')} <span className="tnum">{gkg}</span> g/kg</> : t('nutrition.hero.enterWeight')}
      </div>

      <div style={{ marginTop: 'var(--space-3)' }}>
        {sessTitles ? (
          <a href="/planning" title={sessTitles} style={{ display: 'block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: FB, fontSize: 13, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>{t('nutrition.hero.tunedOn', { titles: sessTitles })} →</a>
        ) : (
          <span style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)' }}>{t('nutrition.hero.restDay')}</span>
        )}
      </div>
    </div>
  )
}