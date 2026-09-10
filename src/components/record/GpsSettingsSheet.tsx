'use client'
// ══════════════════════════════════════════════════════════════════════════
// Feuille « Paramètres GPS & écran » (bas → haut) pour l'écran Démarrer.
// Précision GPS · fréquence · maintien de l'écran allumé. Réglages mémorisés
// (localStorage). Flow record → couleurs directes (hors design-system enforced).
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'

const ACCENT = '#06B6D4'

export default function GpsSettingsSheet({ onClose, isDark }: { onClose: () => void; isDark: boolean }) {
  const { t } = useI18n()
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)
  const [precision, setPrecision] = useState<'high' | 'eco'>('high')
  const [freq, setFreq] = useState<'auto' | '1' | '5'>('auto')
  const [keepAwake, setKeepAwake] = useState(true)

  useEffect(() => {
    try {
      const p = localStorage.getItem('thw-rec-gps-precision'); if (p === 'high' || p === 'eco') setPrecision(p)
      const f = localStorage.getItem('thw-rec-gps-freq'); if (f === 'auto' || f === '1' || f === '5') setFreq(f)
      setKeepAwake(localStorage.getItem('thw-rec-keep-awake') !== 'false')
    } catch { /* ignore */ }
    const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r)
  }, [])
  const requestClose = () => { setClosing(true); setShown(false); setTimeout(onClose, 260) }
  const save = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* ignore */ } }

  const bg = isDark ? '#101317' : '#FFFFFF'
  const text = isDark ? '#FFFFFF' : '#0A0A0A'
  const dim = isDark ? 'rgba(255,255,255,0.5)' : '#6B7280'
  const track = isDark ? 'rgba(255,255,255,0.14)' : '#E5E7EB'
  const surface = isDark ? 'rgba(255,255,255,0.05)' : '#F4F6F8'
  const border = isDark ? 'rgba(255,255,255,0.10)' : '#E5E7EB'

  const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: dim, margin: '0 0 8px 2px' }
  const seg = <T extends string>(value: T, current: T, set: (v: T) => void, txt: string, sub: string, persistKey: string) => {
    const on = current === value
    return (
      <button key={value} onClick={() => { set(value); save(persistKey, value) }} style={{ flex: 1, padding: '11px 8px', borderRadius: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', textAlign: 'center',
        background: on ? 'rgba(6,182,212,0.12)' : surface, border: `1.5px solid ${on ? ACCENT : 'transparent'}` }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: on ? ACCENT : text }}>{txt}</span>
        <span style={{ display: 'block', fontSize: 10.5, color: dim, marginTop: 2 }}>{sub}</span>
      </button>
    )
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 20008, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={requestClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', opacity: shown && !closing ? 1 : 0, transition: 'opacity 0.24s ease' }} />
      <div role="dialog" aria-modal="true" style={{ position: 'relative', width: '100%', maxWidth: 520, background: bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
        transform: shown && !closing ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.30s cubic-bezier(0.32,0.72,0,1)',
        padding: '10px 18px calc(20px + env(safe-area-inset-bottom, 0px))', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 12 }}><span style={{ width: 40, height: 4, borderRadius: 2, background: track }} /></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 21, fontWeight: 800, color: text, fontFamily: 'var(--font-display)' }}>{t('record.gpsSheetTitle')}</span>
          <button onClick={requestClose} aria-label={t('record.routeCreatorClose')} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: surface, color: text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <p style={label}>{t('record.gpsSheetPrecision')}</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {seg<'high' | 'eco'>('high', precision, setPrecision, t('record.gpsSheetHigh'), t('record.gpsSheetHighSub'), 'thw-rec-gps-precision')}
          {seg<'high' | 'eco'>('eco', precision, setPrecision, t('record.gpsSheetEco'), t('record.gpsSheetEcoSub'), 'thw-rec-gps-precision')}
        </div>

        <p style={label}>{t('record.gpsSheetFreq')}</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {seg<'auto' | '1' | '5'>('auto', freq, setFreq, t('record.gpsSheetFreqAuto'), '', 'thw-rec-gps-freq')}
          {seg<'auto' | '1' | '5'>('1', freq, setFreq, '1 s', t('record.gpsSheetFreqPrecise'), 'thw-rec-gps-freq')}
          {seg<'auto' | '1' | '5'>('5', freq, setFreq, '5 s', t('record.gpsSheetFreqBattery'), 'thw-rec-gps-freq')}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px', borderRadius: 14, background: surface, border: `1px solid ${border}` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: text, margin: 0 }}>{t('record.gpsSheetKeepAwake')}</p>
            <p style={{ fontSize: 11.5, color: dim, margin: '2px 0 0' }}>{t('record.gpsSheetKeepAwakeSub')}</p>
          </div>
          <button onClick={() => { const v = !keepAwake; setKeepAwake(v); save('thw-rec-keep-awake', String(v)) }} aria-label={t('record.gpsSheetKeepAwake')}
            style={{ width: 46, height: 28, borderRadius: 999, background: keepAwake ? ACCENT : track, border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: keepAwake ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
