'use client'
// ══════════════════════════════════════════════════════════════
// ACTIONS RAPIDES — pills neutres, navigation pure.
// ══════════════════════════════════════════════════════════════

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { FB } from './lib'

const ACTIONS: { labelKey: string; href: string }[] = [
  { labelKey: 'dashboard.actionCheckin', href: '/recovery' },
  { labelKey: 'dashboard.actionCreatePlan', href: '/planning' },
]

export function QuickActions() {
  const { t } = useI18n()
  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
      {ACTIONS.map(a => (
        <Link
          key={a.href}
          href={a.href}
          style={{
            display: 'inline-flex', alignItems: 'center', minHeight: 36, padding: '0 14px',
            borderRadius: 999, background: 'var(--bg-card2)', color: 'var(--text)',
            fontFamily: FB, fontSize: 13, fontWeight: 500, textDecoration: 'none',
          }}
        >
          {t(a.labelKey)}
        </Link>
      ))}
    </div>
  )
}
