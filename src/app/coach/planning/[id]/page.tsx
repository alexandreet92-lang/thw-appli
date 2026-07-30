'use client'

export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════
// PLANNING COACH — fiche d'un athlète : rend EXACTEMENT la page Planning
// athlète (toutes les fonctionnalités), câblée sur les données de l'athlète
// via le scope planning. En-tête coach épuré : identité, compte à rebours
// précis vers l'objectif (jours + semaines), et la séance du jour.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import PlanningPage from '@/app/planning/page'
import { setPlanningScopeUid, PlanningScopeContext } from '@/lib/planning/scope'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/shared/Sidebar'

// Couleurs sport (micro-accents only — pas d'aplats criards)
const SPORT_COLOR: Record<string, string> = {
  run: '#22c55e', running: '#22c55e', bike: '#3b82f6', cycling: '#3b82f6', swim: '#06b6d4',
  hyrox: '#ef4444', gym: '#f97316', trail: '#f97316', trail_run: '#f97316', rowing: '#14b8a6',
}
const SPORT_LABEL: Record<string, string> = {
  run: 'Course', running: 'Course', bike: 'Vélo', cycling: 'Vélo', swim: 'Natation',
  hyrox: 'Hyrox', gym: 'Muscu', trail: 'Trail', trail_run: 'Trail', rowing: 'Aviron',
}
const sportColor = (s: string) => SPORT_COLOR[s] ?? 'var(--text-mid)'
const sportLabel = (s: string) => SPORT_LABEL[s] ?? (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

function mondayOf(d: Date) {
  const dow = (d.getDay() + 6) % 7
  const m = new Date(d); m.setDate(d.getDate() - dow); m.setHours(0, 0, 0, 0)
  return m
}
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

interface TodaySession { sport: string; title: string; duration_min: number | null; intensity: string | null }
interface Objective { name: string; days: number }

export default function CoachAthletePlanningPage() {
  const params = useParams<{ id: string }>()
  const athleteId = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? '')

  // Défini AVANT que l'effet de chargement de usePlanning ne lise le scope.
  if (athleteId && typeof window !== 'undefined') setPlanningScopeUid(athleteId)
  useEffect(() => {
    if (typeof window !== 'undefined') setPlanningScopeUid(athleteId || null)
    return () => setPlanningScopeUid(null)
  }, [athleteId])

  const [athlete, setAthlete] = useState<{ name: string; avatar: string | null; email: string | null } | null>(null)
  const [today, setToday] = useState<TodaySession[] | null>(null)
  const [objective, setObjective] = useState<Objective | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      const sb = createClient()
      const now = new Date()
      const weekStart = iso(mondayOf(now))
      const todayIdx = (now.getDay() + 6) % 7
      const todayStr = iso(now)
      const [{ data: p }, { data: emails }, { data: sess }, { data: races }] = await Promise.all([
        sb.from('profiles').select('full_name, first_name, avatar_url').eq('id', athleteId).single(),
        sb.rpc('my_athlete_emails'),
        sb.from('planned_sessions').select('sport,title,duration_min,intensity').eq('user_id', athleteId).eq('week_start', weekStart).eq('day_index', todayIdx),
        sb.from('planned_races').select('name,date').eq('user_id', athleteId).gte('date', todayStr).order('date').limit(1),
      ])
      if (!alive) return
      const email = Array.isArray(emails) ? (emails.find((e: { athlete_id: string; email: string }) => e.athlete_id === athleteId)?.email ?? null) : null
      setAthlete({ name: (p?.full_name as string) || (p?.first_name as string) || 'Athlète', avatar: (p?.avatar_url as string | null) ?? null, email })
      setToday((sess ?? []) as TodaySession[])
      const r = Array.isArray(races) && races[0] ? races[0] as { name: string; date: string } : null
      if (r) {
        const days = Math.max(0, Math.ceil((new Date(r.date + 'T00:00:00').getTime() - now.setHours(0, 0, 0, 0)) / 86400000))
        setObjective({ name: r.name, days })
      } else setObjective(null)
    })()
    return () => { alive = false }
  }, [athleteId])

  // Compte à rebours objectif : jours précis + conversion en semaines.
  const cd = objective ? { d: objective.days, w: Math.floor(objective.days / 7), r: objective.days % 7 } : null
  const restDay = today !== null && today.length === 0

  return (
    <PlanningScopeContext.Provider value={athleteId}>
      {/* ── En-tête coach : sobre, une seule bande, accents sport discrets ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'color-mix(in srgb, var(--bg) 90%, transparent)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: '11px clamp(16px,4vw,40px)', maxWidth: 1200, margin: '0 auto' }}>
          {/* Retour + identité */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: '1 1 240px' }}>
            <Link href="/coach/planning" aria-label="Retour aux athlètes" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, color: 'var(--text-mid)', flexShrink: 0, textDecoration: 'none', transition: 'background .14s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-card2)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </Link>
            <Avatar url={athlete?.avatar ?? null} name={athlete?.name ?? null} size={42} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text)', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{athlete?.name ?? 'Athlète'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{athlete?.email ?? ' '}</div>
            </div>
          </div>

          {/* Objectif : jours précis + semaines */}
          {cd && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexShrink: 0, padding: '6px 4px' }}>
              <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="44" height="44" viewBox="0 0 44 44" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                  <circle cx="22" cy="22" r="19" fill="none" stroke="var(--border)" strokeWidth="3" />
                  <circle cx="22" cy="22" r="19" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 19} strokeDashoffset={2 * Math.PI * 19 * Math.min(1, cd.d / 84)} />
                </svg>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>J-{cd.d}</span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 1 }}>Objectif</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.15, maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{objective!.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-mid)' }}>{cd.w > 0 ? `${cd.w} sem${cd.r ? ` ${cd.r} j` : ''}` : `${cd.d} jour${cd.d > 1 ? 's' : ''}`}</div>
              </div>
            </div>
          )}

          {/* Séance du jour */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, padding: '6px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)', maxWidth: 320 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.07em', writingMode: 'vertical-rl', transform: 'rotate(180deg)', lineHeight: 1 }}>Auj.</div>
            {today === null ? (
              <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>…</span>
            ) : restDay ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>🌿</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>Repos / récup</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                {today.slice(0, 2).map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: sportColor(s.sport), flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }}>{s.title}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-dim)', flexShrink: 0, whiteSpace: 'nowrap' }}>{[sportLabel(s.sport), s.duration_min ? `${s.duration_min}′` : ''].filter(Boolean).join(' · ')}</span>
                  </div>
                ))}
                {today.length > 2 && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>+{today.length - 2} autre{today.length - 2 > 1 ? 's' : ''}</span>}
              </div>
            )}
          </div>

          <Link href={`/coach/athlete/${athleteId}`} style={{ marginLeft: 'auto', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 10, border: '1px solid var(--border)', color: 'var(--text-mid)', fontSize: 12.5, fontWeight: 700, textDecoration: 'none', fontFamily: 'var(--font-body)', transition: 'background .14s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-card2)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
            Fiche 360°
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </Link>
        </div>
      </div>

      {/* La vraie page Planning athlète — remontée à chaque changement d'athlète */}
      <PlanningPage key={athleteId} />
    </PlanningScopeContext.Provider>
  )
}
