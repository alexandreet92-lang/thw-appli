'use client'
import { useState, useEffect } from 'react'
import { SplashScreen } from '@/components/ui/SplashScreen'
import GlobalSaveToast from '@/components/ui/GlobalSaveToast'

interface ClientShellProps {
  children: React.ReactNode
}

export function ClientShell({ children }: ClientShellProps) {
  const [showSplash, setShowSplash] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
    const alreadySeen = sessionStorage.getItem('splash_v1')
    if (!alreadySeen) {
      setShowSplash(true)
    }
  }, [])

  const handleSplashDone = () => {
    sessionStorage.setItem('splash_v1', '1')
    setShowSplash(false)
  }

  if (!hydrated) return <>{children}</>

  return (
    <>
      {showSplash && (
        <SplashScreen onDone={handleSplashDone} />
      )}
      {children}
      <GlobalSaveToast />
    </>
  )
}
