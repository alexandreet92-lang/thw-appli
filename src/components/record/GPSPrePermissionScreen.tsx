'use client'
import { useI18n } from '@/lib/i18n'

interface Props {
  onAuthorize: () => void
  onDismiss: () => void
}

const FEATURE_KEYS = [
  'record.gpsPrePermFeature1',
  'record.gpsPrePermFeature2',
  'record.gpsPrePermFeature3',
]

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="8" cy="8" r="8" fill="rgba(6,182,212,0.15)"/>
      <path d="M5 8l2 2 4-4" stroke="#06B6D4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function GPSPrePermissionScreen({ onAuthorize, onDismiss }: Props) {
  const { t } = useI18n()
  const FEATURES = FEATURE_KEYS.map(k => t(k))
  const handleAuthorize = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 1 })
    }
    onAuthorize()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10010,
      background: '#FFFFFF', color: '#0A0A0A',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px', textAlign: 'center',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      {/* Icon */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'rgba(6,182,212,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24,
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>
          <path d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" strokeWidth="0" fill="rgba(6,182,212,0.2)"/>
        </svg>
      </div>

      {/* Title */}
      <h2 style={{
        margin: '0 0 12px', fontSize: 24, fontWeight: 700,
        fontFamily: 'Syne, sans-serif', color: '#0A0A0A',
      }}>
        {t('record.gpsPrePermTitle')}
      </h2>

      {/* Description */}
      <p style={{
        margin: '0 0 28px', fontSize: 14, color: '#666',
        lineHeight: 1.6, maxWidth: 320,
      }}>
        {t('record.gpsPrePermDesc')}
      </p>

      {/* Feature list */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 12,
        marginBottom: 36, width: '100%', maxWidth: 300, textAlign: 'left',
      }}>
        {FEATURES.map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <CheckIcon />
            <span style={{ fontSize: 14, color: '#333', lineHeight: 1.4 }}>{f}</span>
          </div>
        ))}
      </div>

      {/* Primary button */}
      <button
        onClick={handleAuthorize}
        style={{
          width: '100%', maxWidth: 340, height: 52, borderRadius: 16, border: 'none',
          background: 'linear-gradient(135deg, #06B6D4, #2563EB)',
          color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif',
          boxShadow: '0 4px 20px rgba(6,182,212,0.35)',
          transition: 'transform 0.12s',
        }}
        onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)' }}
        onMouseUp={e   => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
      >
        {t('record.gpsPrePermTitle')}
      </button>

      {/* Secondary button */}
      <button
        onClick={onDismiss}
        style={{
          marginTop: 14, background: 'none', border: 'none',
          fontSize: 14, color: '#8C8C8C', cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif', padding: '6px 16px',
        }}
      >
        {t('record.gpsPrePermNotNow')}
      </button>
    </div>
  )
}
