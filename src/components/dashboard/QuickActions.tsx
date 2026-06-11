'use client'
// ══════════════════════════════════════════════════════════════
// ACTIONS RAPIDES — pills neutres, navigation pure.
// ══════════════════════════════════════════════════════════════

import Link from 'next/link'
import { FB } from './lib'

const ACTIONS: { label: string; href: string }[] = [
  { label: 'Faire mon check-in', href: '/recovery' },
  { label: 'Créer un plan', href: '/planning' },
]

export function QuickActions() {
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
          {a.label}
        </Link>
      ))}
    </div>
  )
}
