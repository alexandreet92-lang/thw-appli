'use client'

export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════
// PLANNING COACH — fiche d'un athlète : rend EXACTEMENT la page Planning
// athlète (toutes les fonctionnalités), câblée sur les données de l'athlète
// via le scope planning. En-tête coach compact, placé SOUS les boutons
// flottants (Démarrer, cloche, IA) pour ne rien masquer : identité, objectif
// (J-x + semaines lisibles), séance du jour, et actions (analyse IA, message).
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import PlanningPage from '@/app/planning/page'
import { setPlanningScopeUid, PlanningScopeContext } from '@/lib/planning/scope'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/shared/Sidebar'
import { CoachMessageBubble, openCoachMessage } from '@/components/coach/CoachMessageBubble'
import { useI18n } from '@/lib/i18n'

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

function mondayOf(d: Date) { const dow = (d.getDay() + 6) % 7; const m = new Date(d); m.setDate(d.getDate() - dow); m.setHours(0, 0, 0, 0); return m }
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

interface TodaySession { sport: string; title: string; duration_min: number | null }

export default function CoachAthletePlanningPage() {
  const { t } = useI18n()
  const params = useParams<{ id: string }>()
  const athleteId = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? '')

  if (athleteId && typeof window !== 'undefined') setPlanningScopeUid(athleteId)
  useEffect(() => {
    if (typeof window !== 'undefined') setPlanningScopeUid(athleteId || null)
    return () => setPlanningScopeUid(null)
  }, [athleteId])

  const [athlete, setAthlete] = useState<{ name: string; avatar: string | null; email: string | null } | null>(null)
  const [today, setToday] = useState<TodaySession[] | null>(null)
  const [objective, setObjective] = useState<{ name: string; days: number } | null>(null)

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
        sb.from('planned_sessions').select('sport,title,duration_min').eq('user_id', athleteId).eq('week_start', weekStart).eq('day_index', todayIdx),
        sb.from('planned_races').select('name,date').eq('user_id', athleteId).gte('date', todayStr).order('date').limit(1),
      ])
      if (!alive) return
      const email = Array.isArray(emails) ? (emails.find((e: { athlete_id: string; email: string }) => e.athlete_id === athleteId)?.email ?? null) : null
      setAthlete({ name: (p?.full_name as string) || (p?.first_name as string) || t('w1h.athlete'), avatar: (p?.avatar_url as string | null) ?? null, email })
      setToday((sess ?? []) as TodaySession[])
      const r = Array.isArray(races) && races[0] ? races[0] as { name: string; date: string } : null
      setObjective(r ? { name: r.name, days: Math.max(0, Math.ceil((new Date(r.date + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime()) / 86400000)) } : null)
    })()
    return () => { alive = false }
  }, [athleteId])

  const cd = objective ? { d: objective.days, w: Math.floor(objective.days / 7), r: objective.days % 7 } : null
  const restDay = today !== null && today.length === 0

  const analyze = () => window.dispatchEvent(new CustomEvent('thw:open-coach', { detail: { prompt: t('w1h.analyze_athlete_prompt', { name: athlete?.name ?? t('w1h.this_athlete') }) } }))

  const iconBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-mid)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', textDecoration: 'none', flexShrink: 0 }

  return (
    <PlanningScopeContext.Provider value={athleteId}>
      {/* En-tête coach — placé sous la rangée de boutons flottants (paddingTop) */}
      <div style={{ position: 'sticky', top: 'calc(env(safe-area-inset-top, 0px) + 44px)', zIndex: 40, background: 'color-mix(in srgb, var(--bg) 88%, transparent)', backdropFilter: 'blur(18px) saturate(1.4)', WebkitBackdropFilter: 'blur(18px) saturate(1.4)', borderBottom: '1px solid var(--border)', paddingTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: '0 clamp(16px,4vw,40px) 12px', maxWidth: 1200, margin: '0 auto' }}>
          {/* Identité */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0, flex: '1 1 230px' }}>
            <Link href="/coach/planning" aria-label={t('w1h.aria_back_athletes')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, color: 'var(--text-mid)', flexShrink: 0, textDecoration: 'none', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </Link>
            <Avatar url={athlete?.avatar ?? null} name={athlete?.name ?? null} size={40} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{athlete?.name ?? t('w1h.athlete')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{athlete?.email ?? ' '}</div>
            </div>
          </div>

          {/* Objectif — J-x en gros, lisible, + semaines */}
          {cd && (
            <div style={{ flex: '0 1 190px', minWidth: 0, paddingLeft: 14, borderLeft: '1px solid var(--border)' }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 2 }}>{t('w1h.objective')}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 800, color: cd.d <= 14 ? '#ef4444' : 'var(--text)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{t('w1h.days_to', { n: cd.d })}</span>
                <span style={{ fontSize: 11.5, color: 'var(--text-mid)', fontWeight: 600 }}>{cd.w > 0 ? `${cd.w} ${t('w1h.wk_abbr')}${cd.r ? ` ${cd.r} ${t('w1h.day_abbr')}` : ''}` : `${cd.d} ${t('w1h.day_abbr')}`}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{objective!.name}</div>
            </div>
          )}

          {/* Séance du jour */}
          <div style={{ flex: '1 1 190px', minWidth: 0, paddingLeft: 14, borderLeft: '1px solid var(--border)' }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>{t('w1h.today')}</div>
            {today === null ? <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>…</span>
              : restDay ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-mid)' }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg><span style={{ fontSize: 13, fontWeight: 600 }}>{t('w1h.rest_recovery')}</span></div>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {today.slice(0, 2).map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, paddingLeft: 8, borderLeft: `3px solid ${sportColor(s.sport)}` }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{s.title}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>{[sportLabel(s.sport), s.duration_min ? `${s.duration_min}′` : ''].filter(Boolean).join(' · ')}</span>
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexShrink: 0 }}>
            <button onClick={analyze} style={{ ...iconBtn, color: 'var(--primary)', borderColor: 'color-mix(in srgb, var(--primary) 40%, var(--border))', background: 'color-mix(in srgb, var(--primary) 9%, transparent)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /></svg>
              {t('w1h.analyze_ai')}
            </button>
            <button onClick={() => athlete && openCoachMessage({ athleteId, name: athlete.name, avatar: athlete.avatar })} aria-label={t('w1h.aria_message')} style={{ ...iconBtn, padding: '0 10px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            </button>
            <Link href={`/coach/athlete?id=${athleteId}`} aria-label={t('w1h.aria_profile_360')} style={{ ...iconBtn, padding: '0 10px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            </Link>
          </div>
        </div>
      </div>

      <PlanningPage key={athleteId} />
      <CoachMessageBubble />
    </PlanningScopeContext.Provider>
  )
}
