'use client'
// ══════════════════════════════════════════════════════════════════════════
// Feuille « Ajouter un capteur » : appairage Web Bluetooth d'un capteur cardio
// et/ou puissance. Valeur en direct une fois connecté. Non supporté sur Safari
// iOS → message d'info. Langage RecordKit (feuille premium, listes groupées).
// ══════════════════════════════════════════════════════════════════════════
import { useSyncExternalStore } from 'react'
import { useI18n } from '@/lib/i18n'
import { getSensorState, subscribeSensors, connectSensor, disconnectSensor } from '@/lib/sensors/bluetooth'
import { RkSheet, RkGroup, RkRow, RkTile, RkIco, RK_ICON, useSheetClose } from './kit/RecordKit'

export default function SensorSheet({ onClose, isDark }: { onClose: () => void; isDark: boolean }) {
  const { t } = useI18n()
  const s = useSyncExternalStore(subscribeSensors, getSensorState, getSensorState)
  const [open, close] = useSheetClose(onClose)

  const row = (kind: 'hr' | 'power', title: string, icon: React.ReactNode, color: string, value: number | null, unit: string, device: string | null) => {
    const connected = device != null
    const connecting = s.connecting === kind
    return (
      <RkRow key={kind}
        icon={<RkTile color={connected ? color : 'var(--text-mid)'}>{icon}</RkTile>}
        label={title}
        sub={connected ? (value != null ? `${value} ${unit} · ${device}` : device ?? '') : t('record.sensorNotConnected')}
        right={connected ? (
          <button type="button" onClick={() => disconnectSensor(kind)} className="rk-press"
            style={{ minHeight: 36, padding: '0 14px', borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--surface-chip)', color: 'var(--text-mid)', fontSize: 14, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>{t('record.sensorDisconnect')}</button>
        ) : (
          <button type="button" onClick={() => void connectSensor(kind)} disabled={connecting} className="rk-press"
            style={{ minHeight: 36, padding: '0 16px', borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 14, fontWeight: 800, cursor: 'pointer', flexShrink: 0, opacity: connecting ? 0.6 : 1 }}>{connecting ? t('record.sensorConnecting') : t('record.sensorConnect')}</button>
        )} />
    )
  }

  return (
    <RkSheet open={open} onClose={close} title={t('record.sensorTitle')} isDark={isDark} zIndex={20008}>
      {!s.supported ? (
        <div style={{ padding: '18px 16px', borderRadius: 'var(--r-lg)', background: 'var(--surface-card)' }}>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>{t('record.sensorUnsupportedTitle')}</p>
          <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: 0, lineHeight: 1.5 }}>{t('record.sensorUnsupportedBody')}</p>
        </div>
      ) : (
        <>
          <RkGroup>
            {row('hr', t('record.sensorHr'), <RkIco d={RK_ICON.heart} size={20} />, 'var(--danger)', s.hr, t('record.sensorBpm'), s.hrDevice)}
            {row('power', t('record.sensorPower'), <RkIco d={RK_ICON.bolt} size={20} />, 'var(--sport-gym)', s.power, t('record.sensorWatts'), s.powerDevice)}
          </RkGroup>
          {s.error && <p style={{ fontSize: 14, color: 'var(--danger)', margin: '10px 4px 0' }}>{t('record.sensorError')}</p>}
          <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: '12px 4px 0', lineHeight: 1.5 }}>{t('record.sensorHint')}</p>
        </>
      )}
    </RkSheet>
  )
}
