'use client'
// ──────────────────────────────────────────────────────────────────────────
// AutoPauseBadge — indicateur discret « En pause » affiché en haut de l'écran
// live quand l'auto-pause est active, quelle que soit la page affichée.
// (L'ancien indicateur vivait sur la page carte supprimée.)
// ──────────────────────────────────────────────────────────────────────────
import { useI18n } from '@/lib/i18n'

interface Props {
  active: boolean
  isDark: boolean
}

export default function AutoPauseBadge({ active, isDark }: Props) {
  const { t } = useI18n()
  if (!active) return null
  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(52px + env(safe-area-inset-top))',
        left: '50%', transform: 'translateX(-50%)',
        zIndex: 1500, pointerEvents: 'none',
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 12px', borderRadius: 999,
        background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)', // design-allow-color
        color: isDark ? '#FFFFFF' : '#0A0A0A', // design-allow-color
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#EAB308' }} /> {/* design-allow-color */}
      <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.02em' }}>{t('record.cyclingPage2Paused')}</span>
    </div>
  )
}
