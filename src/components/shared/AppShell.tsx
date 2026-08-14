'use client'
// Un SEUL shell monté à la fois, selon le viewport. Avant : layout.tsx rendait
// DesktopShell ET MobileShell simultanément, chacun montant {children} → chaque
// page et chaque carte se chargeait DEUX fois (double des requêtes réseau).
// Ici, on ne monte que le shell visible → montage unique.
//
// Défaut = mobile (l'app native est mobile ; l'export statique prérend mobile,
// donc pas de re-montage sur l'appareil). Le web desktop bascule au 1er rendu client.
import { useState, useEffect } from 'react'
import { DesktopShell } from '@/components/shared/DesktopShell'
import { MobileShell } from '@/components/shared/MobileShell'
import MobileTabBar from '@/components/MobileTabBar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const f = () => setIsDesktop(mq.matches)
    f()
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])

  if (isDesktop) return <DesktopShell>{children}</DesktopShell>
  return (
    <>
      <MobileShell>{children}</MobileShell>
      <MobileTabBar />
    </>
  )
}
