'use client'
import { useState, useEffect } from 'react'

export function usePageOnboarding(pageId: string, version: number) {
  const key = `onboarding_${pageId}_v${version}`
  const [show, setShow] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem(key)
    if (!seen) setShow(true)
  }, [key])

  const dismiss = () => {
    localStorage.setItem(key, 'true')
    setShow(false)
  }

  const reopen = () => setShow(true)

  return { show, dismiss, reopen }
}
