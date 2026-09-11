'use client'
// ══════════════════════════════════════════════════════════════════
// CyclingScreen — vélo extérieur. Depuis la refonte live v2, cet écran est
// un fin orchestrateur : il garde les hooks existants (GPS via
// useGPSTracking, réglages via useCyclingSettings, pré-permission GPS,
// sheet de réglages) et délègue TOUT le rendu au LiveShell
// (src/components/record/live-v2/) qui applique la spec PROMPT_LIVE_VELO.
// Les autres sports ne sont pas concernés.
// ══════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import type { NavRouteInput } from './RouteNavScreen'
import { useGPSTracking, GPSStatus } from '@/hooks/useGPSTracking'
import { useCyclingSettings } from '@/hooks/useCyclingSettings'
import { useCyclingConfig } from '@/hooks/useCyclingConfig'
import GPSPermissionScreen from './GPSPermissionScreen'
import GPSPrePermissionScreen from './GPSPrePermissionScreen'
import CyclingSettings from './CyclingSettings'
import { useI18n } from '@/lib/i18n'

const LiveShell = dynamic(() => import('./live-v2/LiveShell'), { ssr: false })

interface Props {
  onExit: () => void
  onFinished: () => void
  route?: NavRouteInput | null
}

export default function CyclingScreen({ onExit, onFinished, route }: Props) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [gpsEnabled, setGpsEnabled] = useState(false)
  const [showPrePermission, setShowPrePermission] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (localStorage.getItem('gps_permission_explained')) {
      setGpsEnabled(true)
    } else {
      setShowPrePermission(true)
    }
  }, [])

  const { settings, updateSetting } = useCyclingSettings()
  // Réglage recording.gpsFrequency : throttling des positions dans le hook GPS.
  const { gps, resetTracking, restoreTracking } = useGPSTracking(gpsEnabled, settings.recording.gpsFrequency)
  // Config des pages LEVÉE ici : partagée par le carrousel live ET l'éditeur de
  // réglages, pour que l'ajout/modif d'une page s'applique en direct.
  const { pages, setPages, savePages } = useCyclingConfig('cycling')

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

  return createPortal(
    <>
      <LiveShell
        sportTitle={t('record.cyclingScreenTitle')}
        gps={gps}
        resetTracking={resetTracking}
        restoreTracking={restoreTracking}
        settings={settings}
        pages={pages}
        route={route ?? null}
        isDark={isDark}
        onExit={onExit}
        onFinished={onFinished}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <CyclingSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        isDark={isDark}
        settings={settings}
        updateSetting={updateSetting}
        pages={pages}
        setPages={setPages}
        savePages={savePages}
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
