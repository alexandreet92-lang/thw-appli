'use client'
import { useState, useEffect } from 'react'
import { SplashScreen } from '@/components/ui/SplashScreen'
import GlobalSaveToast from '@/components/ui/GlobalSaveToast'
import { ReauthGate } from '@/components/auth/ReauthGate'
import { I18nProvider } from '@/lib/i18n'
import { CallProvider } from '@/components/community/call/CallProvider'
import { CallBubble } from '@/components/community/call/CallBubble'
import { installNativeApiFetch } from '@/lib/native/apiFetch'

interface ClientShellProps {
  children: React.ReactNode
}

export function ClientShell({ children }: ClientShellProps) {
  const [showSplash, setShowSplash] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // App native : redirige les appels /api vers Vercel + ajoute le token (no-op en web).
    installNativeApiFetch()
    setHydrated(true)
    const alreadySeen = sessionStorage.getItem('splash_v1')
    if (!alreadySeen) {
      setShowSplash(true)
    }
    // Enregistre le service worker (cache des bundles JS/CSS) → démarrage à
    // froid plus rapide. Idempotent, sans effet sur les données.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* ignore */ })
    }
  }, [])

  const handleSplashDone = () => {
    sessionStorage.setItem('splash_v1', '1')
    setShowSplash(false)
  }

  if (!hydrated) return <I18nProvider><CallProvider>{children}</CallProvider></I18nProvider>

  return (
    <I18nProvider>
      <CallProvider>
        {showSplash && (
          <SplashScreen onDone={handleSplashDone} />
        )}
        {children}
        <CallBubble />
        <GlobalSaveToast />
        <ReauthGate />
      </CallProvider>
    </I18nProvider>
  )
}
