'use client'

export const dynamic = 'force-dynamic'

// L'accueil planning global a été retiré : le parcours est désormais
// Athlètes → un athlète → sa fiche → drawer Planning. On redirige.
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CoachPlanningRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/coach/athletes') }, [router])
  return null
}
