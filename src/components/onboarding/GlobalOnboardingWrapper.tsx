'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const GlobalOnboarding = dynamic(
  () => import('./GlobalOnboarding').then(m => ({ default: m.GlobalOnboarding })),
  { ssr: false }
)

export default function GlobalOnboardingWrapper() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Ne jamais afficher sur la landing page ou les pages auth — elles ont leur propre splash
    const path = window.location.pathname
    if (path === '/' || path.startsWith('/auth')) return

    const done   = localStorage.getItem('onboarding_global_done')
    const legacy = localStorage.getItem('onboarding_completed')

    if (done === 'true') return

    // Anciens utilisateurs qui ont déjà vu l'ancien onboarding → skip silencieux
    if (legacy === 'true') {
      localStorage.setItem('onboarding_global_done', 'true')
      return
    }

    setShow(true)
  }, [])

  const handleDone = () => {
    localStorage.setItem('onboarding_global_done', 'true')
    localStorage.setItem('onboarding_completed', 'true')
    setShow(false)
  }

  if (!show) return null
  return <GlobalOnboarding onDone={handleDone} />
}
