'use client'
// ══════════════════════════════════════════════════════════════
// Carte « Ta semaine » (MOBILE) — maquette « a3-actions » (bas) :
// titre + tag de risque teinté · 4 tuiles (séances, durée, TSS, TSB) ·
// forme / fatigue en sous-texte · analyse du coach (children).
// ══════════════════════════════════════════════════════════════

import type { ReactNode } from 'react'
import { useI18n } from '@/lib/i18n'
import { AimCard, AimStat, AimStatGrid, AimTag } from './kit'

export interface WeekCardData {
  totalActivities: number
  totalKm: number
  totalHours: number
  tssCumul: number
  ctlFinal: number
  atlFinal: number
  tsbFinal: number
  riskScore: number
}

export function fmtHoursShort(h: number): string {
  if (!isFinite(h) || h <= 0) return '0 h'
  const total = Math.round(h * 60)
  const hh = Math.floor(total / 60), mm = total % 60
  if (hh === 0) return `${mm} min`
  return mm ? `${hh} h ${String(mm).padStart(2, '0')}` : `${hh} h`
}

export function riskTint(score: number): string {
  return score > 60 ? 'var(--danger)' : score > 35 ? 'var(--zone-4)' : 'var(--success)'
}

export function WeekCard({ d, children }: { d: WeekCardData; children?: ReactNode }) {
  const { t } = useI18n()
  const tsbTone = d.tsbFinal < -10 ? 'var(--zone-4)' : d.tsbFinal > 5 ? 'var(--success)' : undefined
  return (
    <AimCard>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 16, fontWeight: 800 }}>{t('ai2.week.title')}</span>
        <AimTag tint={riskTint(d.riskScore)}>{t('ai2.week.risk', { n: d.riskScore })}</AimTag>
      </div>
      <AimStatGrid cols={4}>
        <AimStat label={t('ai2.week.sessions')} value={String(d.totalActivities)} />
        <AimStat label={t('ai2.week.duration')} value={fmtHoursShort(d.totalHours)} />
        <AimStat label="TSS" value={String(Math.round(d.tssCumul))} />
        <AimStat label="TSB" value={String(Math.round(d.tsbFinal))} tone={tsbTone} />
      </AimStatGrid>
      <div className="aimc-num" style={{ marginTop: 8, fontSize: 13, color: 'var(--text-mid)' }}>
        {t('ai2.week.fitness', { ctl: Math.round(d.ctlFinal), atl: Math.round(d.atlFinal), km: Math.round(d.totalKm) })}
      </div>
      {children && <div style={{ marginTop: 12, fontSize: 15, lineHeight: 1.5 }}>{children}</div>}
    </AimCard>
  )
}
