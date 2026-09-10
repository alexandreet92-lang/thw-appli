'use client'
// ══════════════════════════════════════════════════════════════════════════
// Feuille « Ajouter un capteur » (bas → haut) : appairage Web Bluetooth d'un
// capteur cardio et/ou puissance. Affiche la valeur en direct une fois connecté.
// Non supporté sur Safari iOS → message d'info. Flow record → couleurs directes.
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import { getSensorState, subscribeSensors, connectSensor, disconnectSensor } from '@/lib/sensors/bluetooth'

const ACCENT = '#06B6D4'

export default function SensorSheet({ onClose, isDark }: { onClose: () => void; isDark: boolean }) {
  const { t } = useI18n()
  const s = useSyncExternalStore(subscribeSensors, getSensorState, getSensorState)
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)
  useEffect(() => { const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r) }, [])
  const requestClose = () => { setClosing(true); setShown(false); setTimeout(onClose, 260) }

  const bg = isDark ? '#101317' : '#FFFFFF'
  const text = isDark ? '#FFFFFF' : '#0A0A0A'
  const dim = isDark ? 'rgba(255,255,255,0.5)' : '#6B7280'
  const track = isDark ? 'rgba(255,255,255,0.14)' : '#E5E7EB'
  const surface = isDark ? 'rgba(255,255,255,0.05)' : '#F4F6F8'
  const border = isDark ? 'rgba(255,255,255,0.10)' : '#E5E7EB'

  const row = (kind: 'hr' | 'power', title: string, icon: React.ReactNode, value: number | null, unit: string, device: string | null) => {
    const connected = device != null
    const connecting = s.connecting === kind
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px', borderRadius: 14, background: surface, border: `1px solid ${connected ? ACCENT : border}`, marginBottom: 10 }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: connected ? ACCENT : (isDark ? 'rgba(255,255,255,0.08)' : '#EDF0F3'), color: connected ? '#fff' : dim }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14.5, fontWeight: 700, color: text, margin: 0 }}>{title}</p>
          <p style={{ fontSize: 12, color: dim, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {connected ? (value != null ? `${value} ${unit} · ${device}` : device) : t('record.sensorNotConnected')}
          </p>
        </div>
        {connected ? (
          <button onClick={() => disconnectSensor(kind)} style={{ height: 34, padding: '0 14px', borderRadius: 999, border: `1px solid ${border}`, background: 'transparent', color: dim, fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontFamily: 'DM Sans, sans-serif' }}>{t('record.sensorDisconnect')}</button>
        ) : (
          <button onClick={() => void connectSensor(kind)} disabled={connecting} style={{ height: 34, padding: '0 16px', borderRadius: 999, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', flexShrink: 0, opacity: connecting ? 0.6 : 1, fontFamily: 'DM Sans, sans-serif' }}>{connecting ? t('record.sensorConnecting') : t('record.sensorConnect')}</button>
        )}
      </div>
    )
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 20008, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={requestClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', opacity: shown && !closing ? 1 : 0, transition: 'opacity 0.24s ease' }} />
      <div role="dialog" aria-modal="true" style={{ position: 'relative', width: '100%', maxWidth: 520, background: bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
        transform: shown && !closing ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.30s cubic-bezier(0.32,0.72,0,1)',
        padding: '10px 18px calc(20px + env(safe-area-inset-bottom, 0px))', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 12 }}><span style={{ width: 40, height: 4, borderRadius: 2, background: track }} /></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={{ fontSize: 21, fontWeight: 800, color: text, fontFamily: 'var(--font-display)' }}>{t('record.sensorTitle')}</span>
          <button onClick={requestClose} aria-label={t('record.routeCreatorClose')} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: surface, color: text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {!s.supported ? (
          <div style={{ padding: '18px 16px', borderRadius: 14, background: surface, border: `1px solid ${border}` }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: text, margin: '0 0 6px' }}>{t('record.sensorUnsupportedTitle')}</p>
            <p style={{ fontSize: 12.5, color: dim, margin: 0, lineHeight: 1.5 }}>{t('record.sensorUnsupportedBody')}</p>
          </div>
        ) : (
          <>
            {row('hr', t('record.sensorHr'),
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>,
              s.hr, t('record.sensorBpm'), s.hrDevice)}
            {row('power', t('record.sensorPower'),
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
              s.power, t('record.sensorWatts'), s.powerDevice)}
            {s.error && <p style={{ fontSize: 12.5, color: '#EF4444', margin: '4px 2px 0' }}>{t('record.sensorError')}</p>}
            <p style={{ fontSize: 11.5, color: dim, margin: '10px 2px 0', lineHeight: 1.5 }}>{t('record.sensorHint')}</p>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
