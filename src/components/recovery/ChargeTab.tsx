'use client'

// ══════════════════════════════════════════════════════════════
// ChargeTab — onglet "Charge & forme" (Récupération).
// Réutilise LoadKpis (cartes CTL/ATL/TSB dual SM/SN + verdict, déjà
// branché sur useTrainingLoad) + PmcDualChart (PMC double). Aucun recalcul.
// ══════════════════════════════════════════════════════════════

import { LoadKpis } from '@/components/dashboard/LoadKpis'
import PmcDualChart from './PmcDualChart'
import { useI18n } from '@/lib/i18n'

export default function ChargeTab() {
  const { t } = useI18n()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 20, boxShadow: 'var(--shadow-card)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: 'var(--text)' }}>{t('recovery.tab.load')}</h2>
        <LoadKpis />
      </div>
      <PmcDualChart />
    </div>
  )
}
