'use client'

export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════
// CALENDRIER COACH — le vrai calendrier de l'athlète (toutes ses courses,
// événements et séances), câblé sur l'athlète via le scope planning. Lecture
// + édition selon les policies RLS coach (lien accepté requis).
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import CalendarPage from '@/app/calendar/page'
import { setPlanningScopeUid, PlanningScopeContext } from '@/lib/planning/scope'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/shared/Sidebar'
import { useI18n } from '@/lib/i18n'

export default function CoachAthleteCalendarPage() {
  const { t } = useI18n()
  const params = useParams<{ id: string }>()
  const athleteId = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? '')

  if (athleteId && typeof window !== 'undefined') setPlanningScopeUid(athleteId)
  useEffect(() => {
    if (typeof window !== 'undefined') setPlanningScopeUid(athleteId || null)
    return () => setPlanningScopeUid(null)
  }, [athleteId])

  const [athlete, setAthlete] = useState<{ name: string; avatar: string | null } | null>(null)
  useEffect(() => {
    let alive = true
    void (async () => {
      const { data: p } = await createClient().from('profiles').select('full_name, first_name, avatar_url').eq('id', athleteId).single()
      if (alive) setAthlete({ name: (p?.full_name as string) || (p?.first_name as string) || t('w4b.athlete'), avatar: (p?.avatar_url as string | null) ?? null })
    })()
    return () => { alive = false }
  }, [athleteId])

  return (
    <PlanningScopeContext.Provider value={athleteId}>
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'color-mix(in srgb, var(--bg) 92%, transparent)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: '1px solid var(--border)', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 58px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 clamp(16px,4vw,40px) 12px', maxWidth: 1200, margin: '0 auto' }}>
          <Link href={`/coach/athlete/${athleteId}`} aria-label={t('w4b.back_to_profile')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, color: 'var(--text-mid)', flexShrink: 0, textDecoration: 'none', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </Link>
          <Avatar url={athlete?.avatar ?? null} name={athlete?.name ?? null} size={38} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16.5, fontWeight: 600, color: 'var(--text)', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{athlete?.name ?? t('w4b.athlete')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{t('w4b.calendar')}</div>
          </div>
          <Link href={`/coach/planning/${athleteId}`} style={{ flexShrink: 0, padding: '8px 13px', borderRadius: 10, border: '1px solid var(--border)', color: 'var(--text-mid)', fontSize: 12.5, fontWeight: 700, textDecoration: 'none', fontFamily: 'var(--font-body)' }}>{t('w4b.planning')}</Link>
        </div>
      </div>

      <CalendarPage key={athleteId} />
    </PlanningScopeContext.Provider>
  )
}
