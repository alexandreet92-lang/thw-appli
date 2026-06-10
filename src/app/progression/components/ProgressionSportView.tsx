'use client'

// ══════════════════════════════════════════════════════════════════
// ProgressionSportView — vue sport (rendue INLINE dans la section
// Progression de /activities, et via la route /progression/[sport]).
// Onglet « Général » (données réelles via GeneralView) + onglets
// familles (empty state contextuel). Sports sans données → empty state.
// ══════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { SPORT_CONFIGS } from '@/lib/progression/sportConfig'
import { GeneralView } from './GeneralView'
import { FamilyEmptyState } from './FamilyEmptyState'
import { SportEmptyState } from './SportEmptyState'

export function ProgressionSportView({ sport, onBack }: { sport: string; onBack: () => void }) {
  const config = SPORT_CONFIGS[sport]
  const [active, setActive] = useState(config?.families[0]?.id ?? 'general')

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [])

  const header = (
    <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <button onClick={onBack} aria-label="Retour"
        style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>‹</button>
      <div>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 22, color: 'var(--text)', margin: 0 }}>Progression {config?.label ?? sport}</h1>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '2px 0 0' }}>Évolution de tes performances</p>
      </div>
    </header>
  )

  if (!config || !config.hasData || config.families.length === 0) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '4px 0 40px' }}>
        {header}
        <SportEmptyState sport={sport} label={config?.label ?? sport} color={config?.color ?? '#06B6D4'} />
      </div>
    )
  }

  const activeFamily = config.families.find(f => f.id === active) ?? config.families[0]

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '4px 0 40px' }}>
      {header}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
        {config.families.map(f => (
          <button key={f.id} onClick={() => setActive(f.id)} style={{
            padding: '7px 14px', borderRadius: 999, border: '1px solid var(--border)', cursor: 'pointer',
            whiteSpace: 'nowrap', fontSize: 12, fontWeight: active === f.id ? 700 : 500, fontFamily: 'DM Sans,sans-serif',
            background: active === f.id ? `${config.color}1f` : 'var(--bg-card2)',
            color: active === f.id ? config.color : 'var(--text-dim)',
          }}>{f.label}</button>
        ))}
      </div>

      {activeFamily.isGeneral
        ? <GeneralView sport={sport} />
        : <FamilyEmptyState family={activeFamily.id} label={activeFamily.label} />}
    </div>
  )
}
