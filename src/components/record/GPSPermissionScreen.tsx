'use client'
// Écran affiché quand l'accès GPS a été REFUSÉ : étapes pour le réactiver
// (iOS), puis « J'ai activé » recharge l'écran. Langage RecordKit.
// App native : bouton « Ouvrir les réglages » (page Réglages de l'app iOS).
import { useI18n } from '@/lib/i18n'
import { isNativeApp } from '@/lib/native/platform'
import { openAppSettings } from '@/lib/native/appSettings'
import { rkScope, RkScreenIn, RkCta } from './kit/RecordKit'

interface Props {
  isDark?: boolean
}

const IOS_STEP_KEYS = [
  'record.gpsPermStep1',
  'record.gpsPermStep2',
  'record.gpsPermStep3',
  'record.gpsPermStep4',
  'record.gpsPermStep5',
]

// App iOS native : Réglages › Hybrid › Position › « Lorsque l'app est active ».
const NATIVE_STEP_KEYS = [
  'record.gpsPermNativeStep1',
  'record.gpsPermNativeStep2',
  'record.gpsPermNativeStep3',
]

export default function GPSPermissionScreen({ isDark = false }: Props) {
  const { t } = useI18n()
  // App native : les réglages de position sont ceux de l'app (pas de Safari).
  const native = isNativeApp()
  const IOS_STEPS = (native ? NATIVE_STEP_KEYS : IOS_STEP_KEYS).map(k => t(k))

  return (
    <RkScreenIn className={rkScope(isDark)} style={{
      position: 'fixed', inset: 0, zIndex: 10010,
      background: 'var(--surface-page)', color: 'var(--text)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px calc(env(safe-area-inset-bottom) + 24px)', textAlign: 'center', overflowY: 'auto',
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%', background: 'var(--danger-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22, flexShrink: 0,
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="1" y1="1" x2="23" y2="23"/>
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>
        </svg>
      </div>

      <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800, letterSpacing: '-0.01em' }}>{t('record.gpsPermTitle')}</h2>
      <p style={{ margin: '0 0 22px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.5, maxWidth: 340 }}>{t('record.gpsPermIntro')}</p>

      <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', padding: '6px 16px', marginBottom: 26, maxWidth: 380, width: '100%', textAlign: 'left' }}>
        {IOS_STEPS.map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
            <span className="rk-num" style={{
              width: 26, height: 26, borderRadius: '50%', background: 'var(--surface-chip)',
              fontSize: 13, fontWeight: 800, letterSpacing: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {i + 1}
            </span>
            <span style={{ fontSize: 15, lineHeight: 1.45 }}>{step}</span>
          </div>
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {native && (
          <RkCta variant="primary" onClick={() => { void openAppSettings() }}>{t('record.gpsPermOpenSettings')}</RkCta>
        )}
        <RkCta variant={native ? 'text' : 'primary'} onClick={() => window.location.reload()}>{t('record.gpsPermActivated')}</RkCta>
      </div>

      {!native && <p style={{ marginTop: 14, fontSize: 13, color: 'var(--text-mid)', maxWidth: 320, lineHeight: 1.5 }}>{t('record.gpsPermAndroid')}</p>}
    </RkScreenIn>
  )
}
