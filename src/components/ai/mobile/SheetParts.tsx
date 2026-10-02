'use client'
// ══════════════════════════════════════════════════════════════
// Interface IA MOBILE — briques des feuilles (en-tête, groupes, lignes).
// ══════════════════════════════════════════════════════════════

import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

/** En-tête de feuille : titre (ou lien retour « ‹ Ajouter ») + ✕. */
export function AimSheetHeader({ title, back, onClose }: {
  title?: string
  back?: { label: string; onBack: () => void }
  onClose: () => void
}) {
  const { t } = useI18n()
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '2px 8px 6px 16px', minHeight: 48 }}>
      {back ? (
        <button
          type="button"
          onPointerDown={e => e.stopPropagation()}
          onClick={back.onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 44, padding: '0 8px 0 0', border: 'none', background: 'transparent', color: 'var(--primary)', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
        >
          <ChevronLeft size={20} strokeWidth={2.2} />
          {back.label}
        </button>
      ) : (
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>{title}</span>
      )}
      <button
        type="button"
        onPointerDown={e => e.stopPropagation()}
        onClick={onClose}
        aria-label={t('aip.ui.close')}
        className="aim-press"
        style={{ width: 44, height: 44, border: 'none', background: 'transparent', padding: 0, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}
      >
        <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-chip)', color: 'var(--text-mid)', display: 'grid', placeItems: 'center' }}>
          <X size={16} strokeWidth={2.2} />
        </span>
      </button>
    </div>
  )
}

/** Grand titre de sous-écran (« Actions rapides », « Connecteurs »…). */
export function AimSubTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ padding: '0 6px 12px' }}>
      <h2 style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>{title}</h2>
      {sub && <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.4 }}>{sub}</p>}
    </div>
  )
}

export function AimGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '18px 8px 8px' }}>
      {children}
    </div>
  )
}

/** Tuile d'icône teintée (classe .aim-tint-*). */
export function AimTile({ tint, children }: { tint: string; children: React.ReactNode }) {
  return <span className={`aim-tile aim-tint-${tint}`} aria-hidden>{children}</span>
}

/** Ligne d'un groupe : icône · titre/sous-titre · élément droit ou chevron. */
export function AimRow({ icon, title, sub, right, chevron = false, onClick, disabled = false }: {
  icon?: React.ReactNode
  title: React.ReactNode
  sub?: React.ReactNode
  right?: React.ReactNode
  chevron?: boolean
  onClick?: () => void
  disabled?: boolean
}) {
  const content = (
    <>
      {icon}
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>{title}</span>
        {sub && <span style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>}
      </span>
      {right}
      {chevron && <ChevronRight size={18} color="var(--text-dim)" style={{ flexShrink: 0 }} />}
    </>
  )
  if (!onClick) return <div className="aim-row" style={{ cursor: 'default' }}>{content}</div>
  return (
    <button type="button" className="aim-row" onClick={onClick} disabled={disabled} style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
      {content}
    </button>
  )
}

export function AimSep({ flush = false }: { flush?: boolean }) {
  return <div className={flush ? 'aim-sep flush' : 'aim-sep'} />
}
