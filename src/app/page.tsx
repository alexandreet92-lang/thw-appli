'use client'
export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════
// / — Dashboard (page d'accueil). Modèle « Plan & progression ».
// La racine est exemptée du middleware (cf. middleware.ts) → on
// reproduit ici la garde minimale (session / abonnement / onboarding),
// puis on rend le contenu dans le layout existant (sidebar/header/tab).
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DashboardContent } from '@/components/dashboard/DashboardContent'

const BLOCKED = ['trial_expired', 'cancelled', 'canceled']

export default function DashboardPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth'); return }

      const [{ data: sub }, { data: profile }] = await Promise.all([
        supabase.from('user_subscriptions').select('status').eq('user_id', user.id).maybeSingle(),
        supabase.from('profiles').select('onboarding_completed').eq('id', user.id).maybeSingle(),
      ])
      if (cancelled) return

      if (sub && BLOCKED.includes((sub as { status: string }).status)) { router.replace('/access-expired'); return }
      if (profile && (profile as { onboarding_completed: boolean }).onboarding_completed === false) { router.replace('/onboarding'); return }

      setReady(true)
    })()
    return () => { cancelled = true }
  }, [router])

  if (!ready) return <div aria-busy="true" style={{ minHeight: '60vh' }} />

  return <DashboardContent />
}
