'use client'
// ══════════════════════════════════════════════════════════════
// Sélecteur de modèle (segmented control discret).
// Fond --bg-card2, segment actif --bg-elev. Bascule en direct.
// ══════════════════════════════════════════════════════════════

import { FB } from './lib'
import type { DashboardModel } from './useDashboardModel'

const SEGMENTS: { key: DashboardModel; label: string }[] = [
  { key: 'classique', label: 'Classique' },
  { key: 'data', label: 'Datas' },
]

export function DashboardModelSwitch({ value, onChange }: { value: DashboardModel; onChange: (m: DashboardModel) => void }) {
  return (
    <div role="tablist" aria-label="Modèle de tableau de bord"
      style={{ display: 'inline-flex', gap: 2, padding: 3, borderRadius: 999, background: 'var(--bg-card2)' }}>
      {SEGMENTS.map(s => {
        const active = s.key === value
        return (
          <button
            key={s.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(s.key)}
            style={{
              border: 'none', cursor: 'pointer', borderRadius: 999, padding: '6px 14px',
              fontFamily: FB, fontSize: 12, fontWeight: 600,
              background: active ? 'var(--bg-elev)' : 'transparent',
              color: active ? 'var(--text)' : 'var(--text-mid)',
              transition: 'background 0.18s, color 0.18s',
            }}
          >
            {s.label}
          </button>
        )
      })}
    </div>
  )
}
