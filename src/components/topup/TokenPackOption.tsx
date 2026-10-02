'use client'
// ══════════════════════════════════════════════════════════════════
// Ligne « pack de tokens » à cocher (nom + volume + prix), une seule
// sélection — même langage que la boutique in-app (IapStoreSheet).
// Partagée par la fenêtre d'achat web (TokenPurchaseHost) et la fenêtre
// « Tokens Studio ». Aucune bordure : fond --bg-card2, sélection teintée.
// ══════════════════════════════════════════════════════════════════
import type { CSSProperties } from 'react'
import { Check } from 'lucide-react'

const num: CSSProperties = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'zero' 0" }

export interface TokenPackOptionProps {
  title: string
  sub?: string
  price?: string | null
  badge?: string | null
  on: boolean
  onClick: () => void
  disabled?: boolean
  /** Accent de sélection (défaut : --primary). Le Studio passe son accent. */
  accent?: string
  accentDim?: string
}

export function TokenPackOption({ title, sub, price, badge, on, onClick, disabled, accent = 'var(--primary)', accentDim = 'var(--primary-dim)' }: TokenPackOptionProps) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={on}
      style={{
        width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)', minHeight: 64, borderRadius: 'var(--r-md)', border: 'none',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
        background: on ? accentDim : 'var(--bg-card2)',
      }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>{title}</span>
          {badge && (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: accent, lineHeight: 1.3 }}>{badge}</span>
          )}
        </span>
        {sub && (
          <span style={{ ...num, display: 'block', marginTop: 2, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.4 }}>{sub}</span>
        )}
      </span>
      {price && (
        <span style={{ ...num, fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--text)', flexShrink: 0 }}>{price}</span>
      )}
      <span aria-hidden style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: on ? accent : 'transparent', boxShadow: on ? 'none' : 'inset 0 0 0 2px var(--text-dim)',
      }}>
        {on && <Check size={14} strokeWidth={3} color="var(--on-primary)" />}
      </span>
    </button>
  )
}

/** Prix formaté dans la langue courante (montant en centimes). */
export function formatPrice(cents: number, currency: string, locale: string): string {
  const amount = cents / 100
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency', currency: currency.toUpperCase(),
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount} ${currency.toUpperCase()}`
  }
}
