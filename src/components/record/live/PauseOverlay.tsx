'use client'
// Surcouche pause plein écran — gèle les chronos (géré par l'engine). Reprendre
// ou terminer la séance.
import { useI18n } from '@/lib/i18n'

interface Props { onResume: () => void; onEnd: () => void }

export default function PauseOverlay({ onResume, onEnd }: Props) {
  const { t } = useI18n()
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'rgba(4,7,12,0.88)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 14, padding: 30, color: 'var(--text)', fontFamily: 'DM Sans, sans-serif' }}>
      <p style={{ fontSize: 34, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>{t('w4a.paused')}</p>
      <p style={{ fontSize: 14, color: 'var(--text-mid)', fontWeight: 700, margin: '0 0 12px' }}>{t('w4a.paused_sub')}</p>
      <button onClick={onResume} style={{ width: '100%', maxWidth: 250, height: 50, borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: 'pointer', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)' }}>{t('w4a.resume')}</button>
      <button onClick={onEnd} style={{ width: '100%', maxWidth: 250, height: 50, borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: 'pointer', background: 'transparent', border: '1px solid var(--border-mid)', color: 'var(--charge-hard)' }}>{t('w4a.end_session')}</button>
    </div>
  )
}
