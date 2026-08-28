'use client'
// Surcouche pause : gèle chronos + enregistrement. Reprendre / Terminer.
import { useI18n } from '@/lib/i18n'

export default function RidePause({ onResume, onFinish }: { onResume: () => void; onFinish: () => void }) {
  const { t } = useI18n()
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20, background: 'var(--ride-scrim)',
      backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', gap: 14, padding: 30,
    }}>
      <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text)' }}>{t('w4a.paused')}</div>
      <div style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 700, marginBottom: 10 }}>{t('w4a.rec_paused_sub')}</div>
      <button onClick={onResume} style={{ width: '100%', maxWidth: 240, height: 48, borderRadius: 'var(--r-md)', fontSize: 15, fontWeight: 800, cursor: 'pointer', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)' }}>{t('w4a.resume')}</button>
      <button onClick={onFinish} style={{ width: '100%', maxWidth: 240, height: 48, borderRadius: 'var(--r-md)', fontSize: 15, fontWeight: 800, cursor: 'pointer', background: 'transparent', border: '1px solid var(--border-mid)', color: 'var(--charge-hard)' }}>{t('w4a.end_session')}</button>
    </div>
  )
}
