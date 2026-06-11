'use client'
// ══════════════════════════════════════════════════════════════
// Trio CTL / ATL / TSB (Modèle Datas). Valeurs colorées + filet
// coloré (convention Training). Surfaces sans bordure (espace +
// élévation). CTL/ATL/TSB = SEULS chiffres colorés autorisés.
// ══════════════════════════════════════════════════════════════

import { latestPmc, tsbColor, LOAD_COLORS, type ActivityRow } from '@/lib/training/pmc'
import { Skeleton } from './primitives'
import { FB, NUM } from './lib'

function Kpi({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0, borderLeft: `3px solid ${color}`, background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-3)' }}>
      <p style={{ margin: 0, fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-mid)' }}>{label}</p>
      <p style={{ margin: '4px 0 0', ...NUM, fontSize: 23, fontWeight: 600, color }}>
        {value == null ? '—' : `${value > 0 && label === 'TSB' ? '+' : ''}${Math.round(value)}`}
      </p>
    </div>
  )
}

export function LoadKpis({ activities, loading }: { activities: ActivityRow[]; loading: boolean }) {
  if (loading) return <Skeleton height={90} />
  const pmc = latestPmc(activities)
  if (!pmc) return null // pas de charge → masqué (FormeArc porte déjà l'état vide)

  return (
    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
      <Kpi label="CTL" value={pmc.ctl} color={LOAD_COLORS.ctl} />
      <Kpi label="ATL" value={pmc.atl} color={LOAD_COLORS.atl} />
      <Kpi label="TSB" value={pmc.tsb} color={tsbColor(pmc.tsb)} />
    </div>
  )
}
