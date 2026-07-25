'use client'
// ──────────────────────────────────────────────────────────────────────────
// ExitConfirmOverlay — confirmation avant de quitter un écran d'enregistrement
// live pendant qu'une séance est en cours ou en pause. Mini-overlay maison
// (pas de confirm() natif), cohérent avec les sheets des écrans record.
// ──────────────────────────────────────────────────────────────────────────
import { useI18n } from '@/lib/i18n'

interface Props {
  open: boolean
  isDark: boolean
  onQuit: () => void
  onStay: () => void
}

export default function ExitConfirmOverlay({ open, isDark, onQuit, onStay }: Props) {
  const { t } = useI18n()
  if (!open) return null

  const bg        = isDark ? '#161616' : '#FFFFFF' // design-allow-color
  const text      = isDark ? '#FFFFFF' : '#0A0A0A' // design-allow-color
  const dim       = isDark ? 'rgba(255,255,255,0.55)' : '#666666' // design-allow-color
  const separator = isDark ? 'rgba(255,255,255,0.10)' : '#E8E8E8' // design-allow-color

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10020, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div
        onClick={onStay}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} // design-allow-color
      />
      <div
        role="alertdialog"
        aria-modal="true"
        style={{
          position: 'relative', width: '100%', maxWidth: 320,
          borderRadius: 20, background: bg, color: text,
          padding: '24px 20px 12px', textAlign: 'center',
          boxShadow: '0 12px 40px rgba(0,0,0,0.35)', // design-allow-color
          fontFamily: 'var(--font-body)',
        }}
      >
        <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{t('record.exitConfirmTitle')}</p>
        <p style={{ fontSize: 13, color: dim, margin: '8px 0 20px', lineHeight: 1.5 }}>{t('record.exitConfirmBody')}</p>
        <button
          onClick={onStay}
          style={{
            width: '100%', padding: '13px 16px', borderRadius: 12, border: 'none',
            background: '#06B6D4', color: '#FFFFFF', // design-allow-color
            fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          {t('record.exitConfirmStay')}
        </button>
        <button
          onClick={onQuit}
          style={{
            width: '100%', padding: '13px 16px', marginTop: 6,
            background: 'none', border: 'none', borderTop: `1px solid ${separator}`,
            color: '#EF4444', // design-allow-color
            fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          {t('record.exitConfirmQuit')}
        </button>
      </div>
    </div>
  )
}
