'use client'
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { setNavDirection } from '@/lib/nav/direction'
import { haptic } from '@/lib/haptics'

/** Ouvre une page « détail » : elle glisse de la droite vers la gauche (cf. PageTransition). */
export function usePushNav() {
  const router = useRouter()
  return useCallback((href: string) => {
    haptic('light')
    setNavDirection('push')
    router.push(href)
  }, [router])
}
