'use client'
// Surcouche pause : gèle chronos + enregistrement. « Reprendre » (cyan) /
// « Terminer » (blanche) — même langage que les autres écrans live.
import { motion, useReducedMotion } from 'motion/react'
import { useI18n } from '@/lib/i18n'
import { RkPausePills, RkBanner, RK_DOT } from '../kit/RecordKit'

export default function RidePause({ onResume, onFinish }: { onResume: () => void; onFinish: () => void }) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? 0.1 : 0.25 }}
      style={{
        position: 'absolute', inset: 0, zIndex: 20, background: 'color-mix(in srgb, var(--surface-page) 72%, transparent)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-end', alignItems: 'center', gap: 16, padding: '0 0 calc(env(safe-area-inset-bottom) + 28px)',
      }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '0 24px', textAlign: 'center' }}>
        <RkBanner dot={RK_DOT.warn}>{t('w4a.paused')}</RkBanner>
        <div style={{ fontSize: 15, color: 'var(--text-mid)', fontWeight: 600 }}>{t('w4a.rec_paused_sub')}</div>
      </div>
      <RkPausePills resumeLabel={t('w4a.resume')} finishLabel={t('w4a.end_session')} onResume={onResume} onFinish={onFinish} />
    </motion.div>
  )
}
