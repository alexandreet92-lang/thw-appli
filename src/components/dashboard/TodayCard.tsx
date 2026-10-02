'use client'
// ══════════════════════════════════════════════════════════════
// AUJOURD'HUI (héros) — séance du jour + tâches du jour.
// Sources : planned_sessions / week_tasks (filtrés semaine + jour).
// Cocher une tâche persiste via update — AUCUNE migration.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { sportColor, sportLabel } from '@/components/recovery/helpers'
import { DashCard, DASH_ICONS, SportDot, Skeleton, EmptyState } from './primitives'
import { FB, NUM, formatDuration, weekStartIso, currentDayIndex } from './lib'
import { currentLocale } from '@/lib/i18n/locale'

interface Session { id: string; sport: string; title: string; duration_min: number | null; intensity: string | null; notes: string | null }
interface Task { id: string; title: string; completed: boolean }

const ZONE_KEY: Record<string, string> = { low: 'dashboard.zoneEasy', recovery: 'dashboard.zoneRecovery', moderate: 'dashboard.zoneModerate', mid: 'dashboard.zoneModerate', high: 'dashboard.zoneIntense', hard: 'dashboard.zoneIntense', max: 'dashboard.zoneMax' }

export function TodayCard() {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const user = await getCurrentUser()
      if (!user) { if (!cancelled) setLoading(false); return }
      const ws = weekStartIso(); const di = currentDayIndex()
      const [s, t] = await Promise.all([
        supabase.from('planned_sessions').select('id, sport, title, duration_min, intensity, notes')
          .eq('user_id', user.id).eq('week_start', ws).eq('day_index', di).eq('status', 'planned')
          .order('time', { ascending: true, nullsFirst: false }).limit(1).maybeSingle(),
        supabase.from('week_tasks').select('id, title, completed')
          .eq('user_id', user.id).eq('week_start', ws).eq('day_index', di)
          .order('start_hour', { ascending: true }),
      ])
      if (cancelled) return
      setSession((s.data as Session | null) ?? null)
      setTasks(((t.data as Task[] | null) ?? []))
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  async function toggle(id: string, next: boolean) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: next } : t))
    const supabase = createClient()
    const { error } = await supabase.from('week_tasks').update({ completed: next }).eq('id', id)
    if (error) setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !next } : t))
  }

  if (loading) return <Skeleton height={200} />

  const zone = session?.intensity ? (ZONE_KEY[session.intensity] ? t(ZONE_KEY[session.intensity]) : session.intensity) : null
  const meta = session
    ? [formatDuration(session.duration_min), zone].filter(Boolean).join(' · ')
    : ''

  return (
    <DashCard hero icon={DASH_ICONS.today} title={t('dashboard.todayTitle')} meta={todayShort()} href={`/planning?week=${weekStartIso()}`}>
      {!session ? (
        <EmptyState title={t('dashboard.todayEmptyTitle')} hint={t('dashboard.todayEmptyHint')} />
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <SportDot color={sportColor(session.sport)} size={8} />
            <span style={{ fontFamily: FB, fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-mid)' }}>{sportLabel(session.sport)}</span>
          </div>
          <p style={{ margin: '6px 0 0', fontFamily: FB, fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1.25, overflowWrap: 'anywhere' }}>{session.title}</p>
          {meta && <p style={{ margin: '6px 0 0', ...NUM, fontSize: 14, color: 'var(--text-mid)' }}>{meta}</p>}
        </div>
      )}

      {tasks.length > 0 && (
        <div style={{ marginTop: 'var(--space-4)' }} onClick={e => e.stopPropagation()}>
          <p style={{ margin: '0 0 var(--space-1)', fontFamily: FB, fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>{t('dashboard.todayTasks')}</p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {tasks.map(t => (
              <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '8px 0', cursor: 'pointer', minHeight: 44 }}>
                <input type="checkbox" checked={t.completed} onChange={e => void toggle(t.id, e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer', flexShrink: 0 }} />
                <span style={{ fontFamily: FB, fontSize: 15, lineHeight: 1.4, color: t.completed ? 'var(--text-dim)' : 'var(--text)', textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </DashCard>
  )
}

function todayShort(): string {
  const s = new Date().toLocaleDateString(currentLocale(), { weekday: 'short', day: 'numeric', month: 'short' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
