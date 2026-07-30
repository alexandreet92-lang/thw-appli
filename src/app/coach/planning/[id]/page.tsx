'use client'

export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════
// PLANNING COACH — fiche d'un athlète : rend EXACTEMENT la page Planning
// athlète (toutes les fonctionnalités), mais câblée sur les données de
// l'athlète via le scope planning. Le coach peut lire ET éditer (séances,
// tâches, courses, intensités) grâce aux policies RLS coach (lien accepté).
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import PlanningPage from '@/app/planning/page'
import { setPlanningScopeUid, PlanningScopeContext } from '@/lib/planning/scope'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/shared/Sidebar'

export default function CoachAthletePlanningPage() {
  const params = useParams<{ id: string }>()
  const athleteId = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? '')

  // Défini AVANT que l'effet de chargement de usePlanning (dans PlanningPage)
  // ne lise le scope : le corps du parent s'exécute avant les effets enfants.
  // Client uniquement (le SSR ne fait aucune requête planning).
  if (athleteId && typeof window !== 'undefined') setPlanningScopeUid(athleteId)
  useEffect(() => {
    if (typeof window !== 'undefined') setPlanningScopeUid(athleteId || null)
    return () => setPlanningScopeUid(null)
  }, [athleteId])

  const [athlete, setAthlete] = useState<{ name: string; avatar: string | null; email: string | null } | null>(null)
  useEffect(() => {
    let alive = true
    void (async () => {
      const sb = createClient()
      const [{ data: p }, { data: emails }] = await Promise.all([
        sb.from('profiles').select('full_name, first_name, avatar_url').eq('id', athleteId).single(),
        sb.rpc('my_athlete_emails'),
      ])
      if (!alive) return
      const email = Array.isArray(emails) ? (emails.find((e: { athlete_id: string; email: string }) => e.athlete_id === athleteId)?.email ?? null) : null
      setAthlete({
        name: (p?.full_name as string) || (p?.first_name as string) || 'Athlète',
        avatar: (p?.avatar_url as string | null) ?? null,
        email,
      })
    })()
    return () => { alive = false }
  }, [athleteId])

  return (
    <PlanningScopeContext.Provider value={athleteId}>
      {/* Bandeau d'identité coach — qui je programme + retour au roster */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, display: 'flex', alignItems: 'center', gap: 12, padding: '12px clamp(16px,4vw,40px)', background: 'color-mix(in srgb, var(--bg) 88%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/coach/planning" aria-label="Retour aux athlètes" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', flexShrink: 0, textDecoration: 'none' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
        </Link>
        <Avatar url={athlete?.avatar ?? null} name={athlete?.name ?? null} size={38} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{athlete?.name ?? 'Athlète'}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{athlete?.email ?? 'Planning de l’athlète'}</div>
        </div>
        <Link href={`/coach/athlete/${athleteId}`} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-mid)', fontSize: 12.5, fontWeight: 700, textDecoration: 'none', fontFamily: 'var(--font-body)' }}>Fiche complète</Link>
      </div>

      {/* La vraie page Planning athlète — remontée à chaque changement d'athlète */}
      <PlanningPage key={athleteId} />
    </PlanningScopeContext.Provider>
  )
}
