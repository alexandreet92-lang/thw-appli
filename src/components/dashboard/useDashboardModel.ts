'use client'
// ══════════════════════════════════════════════════════════════
// Préférence de modèle de Dashboard. Persistance localStorage
// (thw:dashboard-model). ⚠ multi-appareils → migration user_settings
// plus tard (cf. PROMPT_DASHBOARD_MODELES.md).
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'

export type DashboardModel = 'classique' | 'data'

const KEY = 'thw:dashboard-model'

export function useDashboardModel(): [DashboardModel, (m: DashboardModel) => void, boolean] {
  const [model, setModel] = useState<DashboardModel>('classique')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY)
      if (saved === 'data' || saved === 'classique') setModel(saved)
    } catch { /* localStorage indispo : on garde le défaut */ }
    setReady(true)
  }, [])

  function update(m: DashboardModel) {
    setModel(m)
    try { localStorage.setItem(KEY, m) } catch { /* best-effort */ }
  }

  return [model, update, ready]
}
