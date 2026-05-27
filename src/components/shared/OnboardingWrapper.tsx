'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const OnboardingScreen = dynamic(() => import('@/components/onboarding/OnboardingScreen'), { ssr: false })

export default function OnboardingWrapper() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem('onboarding_completed')
    if (!done) setShow(true)
  }, [])

  const complete = () => {
    localStorage.setItem('onboarding_completed', 'true')
    setShow(false)
  }

  if (!show) return null
  return <OnboardingScreen onComplete={complete} />
}
