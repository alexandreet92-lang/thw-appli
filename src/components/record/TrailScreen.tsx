'use client'
// ══════════════════════════════════════════════════════════════════
// TrailScreen — trail / course nature. Depuis l'alignement sur le vélo v2,
// cet écran est un fin orchestrateur (comme CyclingScreen) : il garde les
// hooks propres au trail (GPS via useGPSTracking, réglages useTrailSettings,
// config des pages useTrailConfig, pré-permission GPS, feuille de réglages)
// et délègue TOUT le rendu au LiveShell live-v2 — même carte plein écran en
// couleur, même feuille de données glissable, même navigation virage par
// virage, mêmes contrôles Démarrer / pause / Terminer. On passe sport='trail'
// (titre « Trail », allure au lieu de la vitesse, carte outdoors) et la trace
// est enregistrée en tant qu'activité trail. Les autres sports (hiking, ski…)
// ne sont pas concernés : ils ont leurs propres écrans.
// ══════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import type { NavRouteInput } from './RouteNavScreen'
import { useGPSTracking, GPSStatus } from '@/hooks/useGPSTracking'
import { useTrailSettings } from '@/hooks/useTrailSettings'
import { useTrailConfig } from '@/hooks/useTrailConfig'
import type { CyclingSettings } from '@/hooks/useCyclingSettings'
import GPSPermissionScreen from './GPSPermissionScreen'
import GPSPrePermissionScreen from './GPSPrePermissionScreen'
import TrailSettings from './TrailSettings'

const LiveShell = dynamic(() => import('./live-v2/LiveShell'), { ssr: false })

interface Props { onExit: () => void; onFinished: () => void; route?: NavRouteInput | null }

export default function TrailScreen({ onExit, onFinished, route }: Props) {
  const [mounted, setMounted] = useState(false)
  const [gpsEnabled, setGpsEnabled] = useState(false)
  const [showPrePermission, setShowPrePermission] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (localStorage.getItem('gps_permission_explained')) setGpsEnabled(true)
    else setShowPrePermission(true)
  }, [])

  const { settings, updateSetting } = useTrailSettings()
  // Réglage recording.gpsFrequency : throttling des positions dans le hook GPS.
  const { gps, resetTracking, restoreTracking } = useGPSTracking(gpsEnabled, settings.recording.gpsFrequency)
  // Config des pages de données trail (allure, dénivelé, laps) — pilote le carrousel live.
  const { pages } = useTrailConfig('trail')

  const handleGpsAuthorize = () => {
    localStorage.setItem('gps_permission_explained', 'true')
    setShowPrePermission(false)
    setGpsEnabled(true)
  }

  if (!mounted) return null

  // Réglage display.theme : auto = thème système, sinon forçage clair/sombre.
  const systemDark = document.documentElement.classList.contains('dark')
  const isDark = settings.display.theme === 'dark' ? true
    : settings.display.theme === 'light' ? false
    : systemDark

  // Adaptateur réglages trail → forme CyclingSettings attendue par LiveShell.
  // Le trail n'a ni puissance ni permutation pause/lap : valeurs neutres, sans
  // impact (aucun capteur de puissance, swap/longPress désactivés par défaut).
  const liveSettings: CyclingSettings = {
    navigation: settings.navigation,
    alerts: {
      gpsLost: settings.alerts.gpsLost,
      hrZone: settings.alerts.hrZone,
      hrMaxThreshold: settings.alerts.hrMaxThreshold,
      powerHighThreshold: 0,
      powerLowThreshold: 0,
      hydrationInterval: settings.alerts.hydrationInterval,
      nutritionInterval: settings.alerts.nutritionInterval,
      vibration: settings.alerts.vibration,
      sound: settings.alerts.sound,
    },
    display: {
      keepAwake: settings.display.keepAwake,
      theme: settings.display.theme,
      dataSize: settings.display.dataSize,
      dataFont: settings.display.dataFont,
    },
    athlete: { ftp: 200, maxHr: settings.athlete.maxHr, restHr: settings.athlete.restHr },
    recording: {
      gpsFrequency: settings.recording.gpsFrequency,
      autoPause: settings.recording.autoPause,
      autoPauseThreshold: settings.recording.autoPauseThreshold,
      autoLap: settings.recording.autoLap,
      swapPauseLap: false,
      longPressLap: false,
    },
    units: { distance: settings.units.distance, altitude: settings.units.altitude, temperature: 'c', weight: 'kg' },
    postRide: settings.postRun,
  }

  return createPortal(
    <>
      <LiveShell
        sportTitle="Trail"
        sport="trail"
        gps={gps}
        resetTracking={resetTracking}
        restoreTracking={restoreTracking}
        settings={liveSettings}
        pages={pages}
        route={route ?? null}
        isDark={isDark}
        onExit={onExit}
        onFinished={onFinished}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <TrailSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        isDark={isDark}
        settings={settings}
        updateSetting={updateSetting}
      />

      {gps.status === GPSStatus.denied && (
        <GPSPermissionScreen isDark={isDark} />
      )}

      {showPrePermission && (
        <GPSPrePermissionScreen
          onAuthorize={handleGpsAuthorize}
          onDismiss={() => setShowPrePermission(false)}
        />
      )}
    </>,
    document.body
  )
}
