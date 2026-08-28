'use client'
// ══════════════════════════════════════════════════════════════
// ACTIONS RAPIDES — pills du dashboard.
//  • Check-in    → navigation vers la page Récupération.
//  • Créer un plan → ouvre le coach IA sur le flow « plan d'entraînement »
//    (sessionStorage['coach_action'] consommé par AIPanel à l'ouverture).
// ══════════════════════════════════════════════════════════════

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { FB } from './lib'

const PILL: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', minHeight: 36, padding: '0 14px',
  borderRadius: 999, background: 'var(--bg-card2)', color: 'var(--text)',
  fontFamily: FB, fontSize: 13, fontWeight: 500, textDecoration: 'none',
  border: 'none', cursor: 'pointer',
}

export function QuickActions() {
  const { t } = useI18n()

  // Déclenche l'action rapide « Créer un plan d'entraînement » dans le coach.
  const createPlan = () => {
    try { sessionStorage.setItem('coach_action', 'training_plan') } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('thw:open-coach'))
  }

  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
      <Link href="/recovery" style={PILL}>{t('dashboard.actionCheckin')}</Link>
      <button type="button" onClick={createPlan} style={PILL}>{t('dashboard.actionCreatePlan')}</button>
    </div>
  )
}
