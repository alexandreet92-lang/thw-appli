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
      // getSession() est LOCAL (localStorage) → instantané, aucune attente réseau.
      // C'est ce qui supprime les 3-4 s d'écran vide à l'ouverture de l'app native.
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { router.replace('/auth'); return }
      if (cancelled) return

      // On affiche le dashboard TOUT DE SUITE ; la garde (abonnement / onboarding)
      // se fait en arrière-plan et ne redirige qu'en cas de besoin réel.
      setReady(true)

      const [{ data: sub }, { data: profile }] = await Promise.all([
        supabase.from('user_subscriptions').select('status').eq('user_id', user.id).maybeSingle(),
        supabase.from('profiles').select('profile_setup_done').eq('id', user.id).maybeSingle(),
      ])
      if (cancelled) return

      if (sub && BLOCKED.includes((sub as { status: string }).status)) { router.replace('/access-expired'); return }
      // Mini-questionnaire one-shot tant que le profil n'est pas configuré.
      if (profile && (profile as { profile_setup_done: boolean }).profile_setup_done === false) { router.replace('/bienvenue'); return }
    })()
    return () => { cancelled = true }
  }, [router])

  // Squelette instantané (jamais d'écran blanc vide) — reprend la forme du dashboard.
  if (!ready) return (
    <div aria-busy="true" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="dash-skel" style={{ height: 34, width: '55%', borderRadius: 10, background: 'var(--bg-card2)' }} />
      <div className="dash-skel" style={{ height: 18, width: '35%', borderRadius: 8, background: 'var(--bg-card2)' }} />
      <div className="dash-skel" style={{ height: 190, borderRadius: 18, background: 'var(--bg-card2)', marginTop: 'var(--space-2)' }} />
      <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
        <div className="dash-skel" style={{ flex: 1, height: 110, borderRadius: 16, background: 'var(--bg-card2)' }} />
        <div className="dash-skel" style={{ flex: 1, height: 110, borderRadius: 16, background: 'var(--bg-card2)' }} />
      </div>
      <div className="dash-skel" style={{ height: 150, borderRadius: 18, background: 'var(--bg-card2)' }} />
    </div>
  )

  return <DashboardContent />
}
