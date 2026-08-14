'use client'
// ══════════════════════════════════════════════════════════════════
// VitrineSection — la « vitrine » (profil public + activités) intégrée
// DIRECTEMENT dans le dashboard, pour les coachs ET les athlètes.
// Coach : profil coach complet + « Modifier ». Athlète : profil minimal
// (nom/photo depuis le compte) + ses activités.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getMyCoachProfile, getAccountDefaults, type CoachProfile } from '@/lib/coach/vitrine'
import { listMyPrograms, type CoachProgram } from '@/lib/coach/programs'
import { getSocialCounts, type SocialCounts } from '@/lib/social/follows'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import CoachShowcase from '@/components/coach/CoachShowcase'

const EMPTY: CoachProfile = { coach_id: '', slug: null, display_name: '', headline: '', bio: '', logo_url: '', avatar_url: '', website_url: '', socials: {}, sports: [], location: '', diplomas: [], palmares: [], gallery: [], intro_video_url: '', contact_email: '', phone: '', show_contact: false, visibility: 'public', accepting_requests: true, published: false }

export function VitrineSection() {
  const [p, setP] = useState<CoachProfile | null>(null)
  const [programs, setPrograms] = useState<CoachProgram[]>([])
  const [counts, setCounts] = useState<SocialCounts | undefined>(undefined)
  const [isCoach, setIsCoach] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void (async () => {
      const prof = await getMyCoachProfile().catch(() => null)
      let base = prof ?? EMPTY
      if (!base.display_name || !base.avatar_url) {
        const acc = await getAccountDefaults().catch(() => ({ full_name: null, avatar_url: null }))
        base = { ...base, display_name: base.display_name || acc.full_name || '', avatar_url: base.avatar_url || acc.avatar_url || '' }
      }
      setP(base)
      setIsCoach(!!prof && !!prof.coach_id)
      setPrograms((await listMyPrograms().catch(() => [])).filter(pr => pr.published))
      try {
        const user = await getCurrentUser()
        if (user) setCounts(await getSocialCounts(user.id))
      } catch { /* ignore */ }
      setReady(true)
    })()
  }, [])

  if (!ready || !p) return null
  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <CoachShowcase
        profile={p}
        programs={programs}
        counts={counts}
        isCoach={isCoach}
        isOwner
        actions={isCoach
          ? <Link href="/coach/vitrine" style={{ display: 'inline-flex', alignItems: 'center', height: 40, padding: '0 18px', borderRadius: 'var(--r-md)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 700, textDecoration: 'none' }}>Modifier ma vitrine</Link>
          : <Link href="/profile" style={{ display: 'inline-flex', alignItems: 'center', height: 40, padding: '0 18px', borderRadius: 'var(--r-md)', background: 'var(--bg-card2)', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 700, textDecoration: 'none' }}>Modifier mon profil</Link>}
      />
    </div>
  )
}
