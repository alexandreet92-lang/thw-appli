'use client'
export const dynamic = 'force-dynamic'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SplashScreen } from '@/components/auth/SplashScreen'

export default function RootPage() {
  const router = useRouter()

  const checkAndRedirect = useCallback(async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      router.replace('/auth')
      return
    }

    const lastAuth = localStorage.getItem('last_auth_date')
    const daysSince = lastAuth
      ? (Date.now() - parseInt(lastAuth)) / (1000 * 60 * 60 * 24)
      : 999

    if (daysSince > 30) {
      await supabase.auth.signOut()
      router.replace('/auth?expired=1')
      return
    }

    router.replace('/activities')
  }, [router])

  return <SplashScreen onDone={checkAndRedirect} />
}
