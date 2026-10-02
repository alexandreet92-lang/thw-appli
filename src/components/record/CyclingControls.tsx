'use client'
// ════════════════════════════════════════════════════════════════════
// CyclingControls — contrôles du direct des écrans GPS historiques
// (Running, Trail, Randonnée, VTT, Ski, Eau libre). Même langage que le live
// Vélo (maquettes mock8 r2) :
//   prêt      → pilule GPS + gros bouton Démarrer (ondulation + haptique)
//   en cours  → verrou · gros bouton pause sombre · Lap
//   en pause  → « Reprendre » (cyan) + « Terminer » (blanche)
//   verrouillé→ voile anti-toucher + double tap pour déverrouiller
// Transitions ressort entre états. Les callbacks restent ceux de l'écran.
// ════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { GPSStatus } from '@/hooks/useGPSTracking'
import { useI18n } from '@/lib/i18n'
import {
  RkControlDock, RkControlRow, RkBigButton, RkFab, RkIco, RK_ICON, RkPausePills, RkUnlock, RkStartButton, RkBanner,
  PauseGlyph,
} from './kit/RecordKit'
import { gpsInfo } from './kit/LiveFrame'

export type CyclingPhase = 'ready' | 'running' | 'paused' | 'confirming_stop'

interface Props {
  phase: CyclingPhase
  gpsStatus: GPSStatus
  gpsAccuracy: number | null
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onLap: () => void
  /** Historique : passage en confirmation d'arrêt (la pause propose désormais
   *  « Terminer » directement → onConfirmFinish). */
  onFinish: () => void
  onConfirmFinish: () => void
  isDark?: boolean
  /** Masque le bouton Lap (sports sans tours : ski, eau libre). */
  noLap?: boolean
}

export default function CyclingControls({
  phase, gpsStatus, gpsAccuracy, onStart, onPause, onResume, onLap, onConfirmFinish, noLap,
}: Props) {
  const { t } = useI18n()
  const [locked, setLocked] = useState(false)
  // Le verrou ne survit pas à une sortie de l'état « en cours ».
  useEffect(() => { if (phase !== 'running') setLocked(false) }, [phase])

  const canStart = gpsStatus === GPSStatus.good || gpsStatus === GPSStatus.approximate
  const g = gpsInfo(gpsStatus, gpsAccuracy, t)
  const stateKey = phase === 'ready' ? 'ready' : phase === 'running' ? (locked ? 'locked' : 'running') : 'paused'

  return (
    <>
      {/* Voile anti-toucher (écran verrouillé) : seul le bouton de
          déverrouillage reste actif. */}
      {locked && (
        <div aria-hidden onPointerDown={e => e.stopPropagation()}
          style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'color-mix(in srgb, var(--surface-page) 18%, transparent)', touchAction: 'none' }} />
      )}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, height: 0, zIndex: 9999 }}>
        <RkControlDock stateKey={stateKey}>
          {stateKey === 'ready' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <RkBanner dot={g.dot} live={g.searching} style={{ animation: 'none' }}>
                <span className="rk-num" style={{ letterSpacing: 0 }}>{canStart || g.searching ? g.text : t('record.cyclingControlsGpsRequired')}</span>
              </RkBanner>
              <RkStartButton label={t('record.commonStart')} onClick={onStart} disabled={!canStart} size={96} />
            </div>
          )}
          {stateKey === 'running' && (
            <RkControlRow
              left={<RkFab label={t('w2c.lockAction')} onClick={() => setLocked(true)} size={56}><RkIco d={RK_ICON.lock} size={22} /></RkFab>}
              center={<RkBigButton label={t('record.commonPause')} onClick={onPause}><PauseGlyph /></RkBigButton>}
              right={noLap ? undefined : (
                <RkFab label={t('record.cyclingControlsLap')} onClick={onLap} size={56}>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{t('record.cyclingControlsLap')}</span>
                </RkFab>
              )}
            />
          )}
          {stateKey === 'paused' && (
            <RkPausePills resumeLabel={t('record.commonResume')} finishLabel={t('rec.finish')} onResume={onResume} onFinish={onConfirmFinish} />
          )}
          {stateKey === 'locked' && (
            <RkUnlock hint={t('w2c.doubleTapUnlock')} label={t('w2c.unlockAction')} onUnlock={() => setLocked(false)} />
          )}
        </RkControlDock>
      </div>
    </>
  )
}
