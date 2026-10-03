'use client'
// ══════════════════════════════════════════════════════════════════════════
// Feuille « Capteurs » : ceinture cardio, capteur de puissance, cadence/vitesse.
//  · App native (iOS/Android) → BLE natif : scan automatique à l'ouverture,
//    appareils trouvés avec force du signal, toucher = connecter. L'appareil
//    est mémorisé et reconnecté automatiquement à la prochaine séance.
//  · Navigateur (Chrome/Edge) → Web Bluetooth : « Connecter » ouvre le
//    sélecteur du navigateur (comportement historique).
// Valeur live une fois connecté, « Oublier » pour retirer l'appareil.
// Langage RecordKit (feuille premium, listes groupées, point « live »).
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import {
  getSensorState, subscribeSensors, connectSensor, connectFoundSensor, forgetSensor,
  startSensorScan, stopSensorScan, openSensorSettings,
  type SensorKind, type SensorState, type FoundSensor,
} from '@/lib/sensors/bluetooth'
import { RkSheet, RkGroup, RkRow, RkTile, RkIco, RK_ICON, RK_DOT, RkSectionLabel, useSheetClose } from './kit/RecordKit'

type T = (k: string, v?: Record<string, string | number>) => string

const SECTIONS: { kind: SensorKind; titleKey: string; icon: ReactNode; color: string }[] = [
  { kind: 'hr', titleKey: 'record.sensorSecHr', icon: RK_ICON.heart, color: 'var(--danger)' },
  { kind: 'power', titleKey: 'record.sensorSecPower', icon: RK_ICON.bolt, color: 'var(--sport-gym)' },
  { kind: 'cadence', titleKey: 'record.sensorSecCadence', icon: RK_ICON.device, color: 'var(--sport-bike)' },
]

/** Barres de signal (RSSI dBm → 1..4). */
function SignalBars({ rssi }: { rssi: number }) {
  const level = rssi >= -60 ? 4 : rssi >= -70 ? 3 : rssi >= -82 ? 2 : 1
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden style={{ flexShrink: 0, display: 'block' }}>
      {[0, 1, 2, 3].map(i => (
        <rect key={i} x={i * 4.6} y={10 - i * 3.2} width="3.2" height={4 + i * 3.2} rx="1"
          fill={i < level ? 'var(--text)' : 'var(--text-dim)'} opacity={i < level ? 1 : 0.35} />
      ))}
    </svg>
  )
}

function signalLabel(rssi: number | null, t: T): string {
  if (rssi == null) return t('record.sensorSystemLinked')
  return rssi >= -65 ? t('record.sensorSignalStrong') : rssi >= -80 ? t('record.sensorSignalMedium') : t('record.sensorSignalWeak')
}

/** Valeur live d'un rôle (ex. « 142 bpm », « 230 W · 88 rpm »). */
function liveValue(kind: SensorKind, s: SensorState, t: T): string | null {
  if (kind === 'hr') return s.hr != null ? `${s.hr} ${t('record.sensorBpm')}` : null
  if (kind === 'power') {
    if (s.power == null) return null
    const cad = s.cadence != null && !s.cadenceDevice ? ` · ${s.cadence} ${t('record.sensorRpm')}` : ''
    return `${s.power} ${t('record.sensorWatts')}${cad}`
  }
  const parts: string[] = []
  if (s.cadence != null) parts.push(`${s.cadence} ${t('record.sensorRpm')}`)
  if (s.speed != null) parts.push(`${s.speed.toFixed(1)} ${t('record.sensorKmh')}`)
  return parts.length ? parts.join(' · ') : null
}

function pillStyle(primary: boolean): React.CSSProperties {
  return {
    minHeight: 36, padding: '0 14px', borderRadius: 'var(--r-pill)', border: 'none', flexShrink: 0, cursor: 'pointer',
    background: primary ? 'var(--primary)' : 'var(--surface-chip)', color: primary ? 'var(--on-primary)' : 'var(--text-mid)',
    fontSize: 14, fontWeight: primary ? 800 : 700,
  }
}

export default function SensorSheet({ onClose, isDark }: { onClose: () => void; isDark: boolean }) {
  const { t } = useI18n()
  const s = useSyncExternalStore(subscribeSensors, getSensorState, getSensorState)
  const [open, close] = useSheetClose(onClose)

  // Natif : scan dès l'ouverture, arrêté à la fermeture (économie batterie).
  useEffect(() => {
    if (!s.native) return
    void startSensorScan()
    return () => { void stopSensorScan() }
  }, [s.native])

  const deviceName = (k: SensorKind): string | null => (k === 'hr' ? s.hrDevice : k === 'power' ? s.powerDevice : s.cadenceDevice)

  const forgetBtn = (kind: SensorKind) => (
    <button type="button" className="rk-press" style={pillStyle(false)}
      onClick={e => { e.stopPropagation(); haptic('light'); forgetSensor(kind) }}>{t('record.sensorForget')}</button>
  )

  const section = (kind: SensorKind, title: string, icon: ReactNode, color: string) => {
    const link = s.links[kind]
    const connectedName = deviceName(kind)
    const paired = s.paired.find(p => p.kind === kind) ?? null
    const value = liveValue(kind, s, t)
    const rows: ReactNode[] = []

    // 1) Appareil connecté ou mémorisé (en reconnexion / hors de portée).
    if (connectedName || (s.native && paired)) {
      const name = connectedName ?? paired?.name ?? ''
      const sub = link === 'connected'
        ? `${t('record.sensorConnected')}${value ? ` · ${value}` : ''}`
        : link === 'connecting' || link === 'reconnecting' ? t('record.sensorReconnecting') : t('record.sensorOutOfRange')
      rows.push(
        <RkRow key="cur" icon={<RkTile color={link === 'connected' ? color : 'var(--text-mid)'}><RkIco d={icon} size={20} /></RkTile>}
          label={name}
          sub={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className="rk-dot" data-live={link === 'reconnecting' || link === 'connecting' ? '1' : undefined}
              style={{ background: link === 'connected' ? RK_DOT.ok : link === 'idle' ? RK_DOT.idle : RK_DOT.info }} />
            <span className="rk-num" style={{ letterSpacing: 0 }}>{sub}</span>
          </span>}
          right={link === 'idle' && paired
            ? <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button type="button" className="rk-press" style={pillStyle(true)}
                  onClick={() => { haptic('light'); void connectFoundSensor(paired.id, paired.name, kind) }}>{t('record.sensorConnect')}</button>
                {forgetBtn(kind)}
              </span>
            : forgetBtn(kind)} />,
      )
    }

    if (s.native) {
      // 2) Appareils détectés pour ce rôle (hors appareil déjà affiché).
      const shownId = paired?.id
      const found: FoundSensor[] = s.found.filter(f => f.kinds.includes(kind) && f.id !== shownId)
      for (const f of found) {
        const busy = s.connecting === kind && link === 'connecting'
        rows.push(
          <RkRow key={f.id}
            icon={<RkTile color="var(--text-mid)"><RkIco d={icon} size={20} /></RkTile>}
            label={f.name}
            sub={signalLabel(f.rssi, t)}
            right={f.rssi != null ? <SignalBars rssi={f.rssi} /> : undefined}
            disabled={busy}
            onClick={() => { void connectFoundSensor(f.id, f.name, kind) }} />,
        )
      }
      // 3) Rien de connecté ni trouvé : état de recherche.
      if (!rows.length) {
        rows.push(
          <RkRow key="empty" icon={<RkTile color="var(--text-mid)"><RkIco d={icon} size={20} /></RkTile>}
            label={s.scanning ? t('record.sensorScanning') : t('record.sensorNotConnected')}
            sub={s.scanning ? undefined : t('record.sensorNoneFound')}
            right={s.scanning ? <span className="rk-dot" data-live="1" style={{ background: RK_DOT.info }} /> : undefined} />,
        )
      }
    } else if (!connectedName) {
      // Web : sélecteur du navigateur.
      const connecting = s.connecting === kind
      rows.push(
        <RkRow key="web" icon={<RkTile color="var(--text-mid)"><RkIco d={icon} size={20} /></RkTile>}
          label={t('record.sensorNotConnected')}
          right={<button type="button" className="rk-press" disabled={connecting}
            onClick={() => { haptic('light'); void connectSensor(kind) }}
            style={{ ...pillStyle(true), opacity: connecting ? 0.6 : 1 }}>{connecting ? t('record.sensorConnecting') : t('record.sensorConnect')}</button>} />,
      )
    }

    return (
      <div key={kind}>
        <RkSectionLabel>{title}</RkSectionLabel>
        <RkGroup>{rows}</RkGroup>
      </div>
    )
  }

  const blocked = s.error === 'bt-off' || s.error === 'unauthorized'

  return (
    <RkSheet open={open} onClose={close} title={t('record.sensorTitle')} isDark={isDark} zIndex={20008}>
      {!s.supported || s.error === 'unsupported' ? (
        <div style={{ padding: '18px 16px', borderRadius: 'var(--r-lg)', background: 'var(--surface-card)' }}>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>{t('record.sensorUnsupportedTitle')}</p>
          <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: 0, lineHeight: 1.5 }}>{t('record.sensorUnsupportedBody')}</p>
        </div>
      ) : (
        <>
          {/* Bluetooth coupé / refusé */}
          {blocked && (
            <RkGroup>
              <RkRow icon={<RkTile color="var(--danger)"><RkIco d={RK_ICON.device} size={20} /></RkTile>}
                label={s.error === 'bt-off' ? t('record.sensorBtOff') : t('record.sensorUnauthorized')}
                right={s.error === 'unauthorized'
                  ? <button type="button" className="rk-press" style={pillStyle(true)} onClick={() => { void openSensorSettings() }}>{t('record.sensorOpenSettings')}</button>
                  : undefined} />
            </RkGroup>
          )}

          {/* Natif : état du scan */}
          {s.native && !blocked && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 36, padding: '0 4px', marginTop: 2 }}>
              {s.scanning
                ? <>
                    <span className="rk-dot" data-live="1" style={{ background: RK_DOT.info }} />
                    <span style={{ flex: 1, fontSize: 14, color: 'var(--text-mid)' }}>{t('record.sensorScanning')}</span>
                  </>
                : <>
                    <span style={{ flex: 1, fontSize: 14, color: 'var(--text-mid)' }}>{s.found.length ? '' : t('record.sensorNoneFound')}</span>
                    <button type="button" className="rk-press" style={pillStyle(false)} onClick={() => { haptic('light'); void startSensorScan() }}>{t('record.sensorRescan')}</button>
                  </>}
            </div>
          )}

          {SECTIONS.map(sec => section(sec.kind, t(sec.titleKey), sec.icon, sec.color))}

          {(s.error === 'connect-failed' || s.error === 'scan-failed' || s.error === 'error') && (
            <p style={{ fontSize: 14, color: 'var(--danger)', margin: '10px 4px 0' }}>{t('record.sensorError')}</p>
          )}
          <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: '12px 4px 0', lineHeight: 1.5 }}>{t('record.sensorHint')}</p>
        </>
      )}
    </RkSheet>
  )
}
