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
