'use client'
// Écran d'explication AVANT la demande d'autorisation GPS (iOS / web).
// Langage RecordKit : page gris chaud, carte blanche, gros bouton cyan.
import { useI18n } from '@/lib/i18n'
import { getCurrentPosition } from '@/lib/native/geo'
import { haptic } from '@/lib/haptics'
import { rkScope, useAppDark, RkScreenIn, RkCta, RkIco, RK_ICON } from './kit/RecordKit'

interface Props {
  onAuthorize: () => void
  onDismiss: () => void
}

const FEATURE_KEYS = [
  'record.gpsPrePermFeature1',
  'record.gpsPrePermFeature2',
  'record.gpsPrePermFeature3',
]

export default function GPSPrePermissionScreen({ onAuthorize, onDismiss }: Props) {
  const { t } = useI18n()
  const dark = useAppDark()
  const FEATURES = FEATURE_KEYS.map(k => t(k))
  const handleAuthorize = () => {
    haptic('medium')
    // Déclenche la demande d'autorisation iOS (plugin natif) ou le prompt web.
    try { getCurrentPosition(() => {}, () => {}, { timeout: 5000 }) } catch { /* ignore */ }
    onAuthorize()
  }

  return (
    <RkScreenIn className={rkScope(dark)} style={{
      position: 'fixed', inset: 0, zIndex: 10010,
      background: 'var(--surface-page)', color: 'var(--text)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px calc(env(safe-area-inset-bottom) + 24px)', textAlign: 'center', overflowY: 'auto',
    }}>
      {/* Pictogramme GPS avec halo */}
      <div style={{ position: 'relative', width: 96, height: 96, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="rk-start" aria-hidden style={{ position: 'absolute', inset: 8, cursor: 'default', boxShadow: 'none', background: 'var(--primary-dim)' }} />
        <span style={{ position: 'relative', color: 'var(--primary)', display: 'flex' }}><RkIco d={RK_ICON.gps} size={38} sw={1.8} /></span>
      </div>

      <h2 style={{ margin: '0 0 10px', fontSize: 26, fontWeight: 800, letterSpacing: '-0.01em' }}>{t('record.gpsPrePermTitle')}</h2>
      <p style={{ margin: '0 0 24px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.6, maxWidth: 340 }}>{t('record.gpsPrePermDesc')}</p>

      {/* Ce que le GPS permet */}
      <div style={{ width: '100%', maxWidth: 380, background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', padding: '6px 16px', textAlign: 'left', marginBottom: 28 }}>
        {FEATURES.map((f, i) => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <RkIco d={RK_ICON.check} size={15} sw={2.6} />
            </span>
            <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>{f}</span>
          </div>
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <RkCta variant="primary" onClick={handleAuthorize}>{t('record.gpsPrePermTitle')}</RkCta>
        <RkCta variant="text" onClick={onDismiss}>{t('record.gpsPrePermNotNow')}</RkCta>
      </div>
    </RkScreenIn>
  )
}
