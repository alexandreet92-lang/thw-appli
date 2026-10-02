'use client'
// ══════════════════════════════════════════════════════════════════════════
// Feuille « Paramètres GPS & écran » (écran Démarrer). Précision GPS ·
// fréquence · maintien de l'écran allumé. Réglages mémorisés (localStorage).
// Langage RecordKit : segments iOS + liste groupée avec interrupteur.
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { RkSheet, RkSectionLabel, RkGroup, RkRow, RkToggle, useSheetClose } from './kit/RecordKit'

export default function GpsSettingsSheet({ onClose, isDark }: { onClose: () => void; isDark: boolean }) {
  const { t } = useI18n()
  const [open, close] = useSheetClose(onClose)
  const [precision, setPrecision] = useState<'high' | 'eco'>('high')
  const [freq, setFreq] = useState<'auto' | '1' | '5'>('auto')
  const [keepAwake, setKeepAwake] = useState(true)

  useEffect(() => {
    try {
      const p = localStorage.getItem('thw-rec-gps-precision'); if (p === 'high' || p === 'eco') setPrecision(p)
      const f = localStorage.getItem('thw-rec-gps-freq'); if (f === 'auto' || f === '1' || f === '5') setFreq(f)
      setKeepAwake(localStorage.getItem('thw-rec-keep-awake') !== 'false')
    } catch { /* ignore */ }
  }, [])
  const save = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* ignore */ } }

  const seg = <T extends string>(value: T, current: T, set: (v: T) => void, txt: string, sub: string, persistKey: string) => {
    const on = current === value
    return (
      <button key={value} type="button" onClick={() => { haptic('light'); set(value); save(persistKey, value) }}
        style={{ flex: 1, minHeight: 56, padding: '8px 6px', borderRadius: 'var(--r-pill)', cursor: 'pointer', textAlign: 'center', border: 'none',
          background: on ? 'var(--surface-card)' : 'transparent', boxShadow: on ? 'var(--shadow-capsule)' : 'none', transition: 'background-color 200ms ease' }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: on ? 800 : 600, color: on ? 'var(--text)' : 'var(--text-mid)' }}>{txt}</span>
        {sub && <span style={{ display: 'block', fontSize: 12, color: 'var(--text-mid)', marginTop: 1 }}>{sub}</span>}
      </button>
    )
  }
  const track = (children: React.ReactNode) => (
    <div style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 'var(--r-pill)', background: 'var(--surface-chip)' }}>{children}</div>
  )

  return (
    <RkSheet open={open} onClose={close} title={t('record.gpsSheetTitle')} isDark={isDark} zIndex={20008}>
      <RkSectionLabel>{t('record.gpsSheetPrecision')}</RkSectionLabel>
      {track(<>
        {seg<'high' | 'eco'>('high', precision, setPrecision, t('record.gpsSheetHigh'), t('record.gpsSheetHighSub'), 'thw-rec-gps-precision')}
        {seg<'high' | 'eco'>('eco', precision, setPrecision, t('record.gpsSheetEco'), t('record.gpsSheetEcoSub'), 'thw-rec-gps-precision')}
      </>)}

      <RkSectionLabel>{t('record.gpsSheetFreq')}</RkSectionLabel>
      {track(<>
        {seg<'auto' | '1' | '5'>('auto', freq, setFreq, t('record.gpsSheetFreqAuto'), '', 'thw-rec-gps-freq')}
        {seg<'auto' | '1' | '5'>('1', freq, setFreq, '1 s', t('record.gpsSheetFreqPrecise'), 'thw-rec-gps-freq')}
        {seg<'auto' | '1' | '5'>('5', freq, setFreq, '5 s', t('record.gpsSheetFreqBattery'), 'thw-rec-gps-freq')}
      </>)}

      <div style={{ height: 16 }} />
      <RkGroup>
        <RkRow label={t('record.gpsSheetKeepAwake')} sub={t('record.gpsSheetKeepAwakeSub')}
          right={<RkToggle on={keepAwake} label={t('record.gpsSheetKeepAwake')} onChange={v => { setKeepAwake(v); save('thw-rec-keep-awake', String(v)) }} />} />
      </RkGroup>
    </RkSheet>
  )
}
