'use client'
// ──────────────────────────────────────────────────────────────────────────
// ExitConfirmOverlay — confirmation avant de quitter un écran d'enregistrement
// live pendant qu'une séance est en cours ou en pause. Feuille du bas premium
// (RecordKit) : « Rester » (cyan) / « Quitter » (rouge, texte). Glisser vers le
// bas ou toucher le voile = rester. Pas de confirm() natif.
// ──────────────────────────────────────────────────────────────────────────
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { RkSheet, RkCta } from './kit/RecordKit'

interface Props {
  open: boolean
  isDark: boolean
  onQuit: () => void
  onStay: () => void
}

export default function ExitConfirmOverlay({ open, isDark, onQuit, onStay }: Props) {
  const { t } = useI18n()
  return (
    <RkSheet open={open} onClose={onStay} isDark={isDark} zIndex={10020} label={t('record.exitConfirmTitle')}>
      <div style={{ textAlign: 'center', padding: '6px 4px 4px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>{t('record.exitConfirmTitle')}</h2>
        <p style={{ fontSize: 15, color: 'var(--text-mid)', margin: '8px 0 22px', lineHeight: 1.5 }}>{t('record.exitConfirmBody')}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <RkCta variant="primary" onClick={onStay}>{t('record.exitConfirmStay')}</RkCta>
          <RkCta variant="text-danger" onClick={() => { haptic('heavy'); onQuit() }}>{t('record.exitConfirmQuit')}</RkCta>
        </div>
      </div>
    </RkSheet>
  )
}
