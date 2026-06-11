'use client'
// ══════════════════════════════════════════════════════════════
// AUJOURD'HUI (héros) — séance du jour + tâches du jour.
// Sources : planned_sessions / week_tasks (filtrés semaine + jour).
// Cocher une tâche persiste via update — AUCUNE migration.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sportColor, sportLabel } from '@/components/recovery/helpers'
import { Card, SectionTitle, SportDot, Skeleton, EmptyState, useReducedMotion } from './primitives'
import { FD, FB, NUM, formatDuration, weekStartIso, currentDayIndex } from './lib'

interface Session { id: string; sport: string; title: string; duration_min: number | null; tss: number | null; intensity: string | null; notes: string | null }
interface Task { id: string; title: string; completed: boolean }

const ZONE_LABEL: Record<string, string> = { low: 'Facile', recovery: 'Récup', moderate: 'Modéré', mid: 'Modéré', high: 'Intense', hard: 'Intense', max: 'Max' }

export function TodayCard() {
  const router = useRouter()
  const reduce = useReducedMotion()
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) setLoading(false); return }
      const ws = weekStartIso(); const di = currentDayIndex()
      const [s, t] = await Promise.all([
        supabase.from('planned_sessions').select('id, sport, title, duration_min, tss, intensity, notes')
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

  const zone = session?.intensity ? (ZONE_LABEL[session.intensity] ?? session.intensity) : null
  const meta = session
    ? [formatDuration(session.duration_min), zone, session.tss != null ? `TSS ${session.tss}` : null].filter(Boolean).join(' · ')
    : ''

  return (
    <Card style={{ background: 'var(--bg-elev)' }}>
      <SectionTitle>Aujourd&apos;hui</SectionTitle>

      {!session ? (
        <EmptyState title="Rien de prévu aujourd'hui" hint="Planifie ta semaine pour garder le cap." href="/planning" cta="Planifier" />
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
            <SportDot color={sportColor(session.sport)} />
            <span style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-mid)' }}>
              {sportLabel(session.sport)}
            </span>
          </div>
          <p style={{ margin: 0, fontFamily: FD, fontSize: 17, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3 }}>{session.title}</p>
          {meta && <p style={{ margin: 'var(--space-2) 0 0', ...NUM, fontSize: 13, color: 'var(--text-mid)' }}>{meta}</p>}
          {session.notes && (
            <p style={{ margin: 'var(--space-3) 0 0', fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.55 }}>{session.notes}</p>
          )}
          <button
            onClick={() => router.push('/session')}
            style={{
              marginTop: 'var(--space-4)', height: 40, padding: '0 18px', borderRadius: 'var(--r-sm)',
              border: 'none', background: 'var(--primary)', color: 'var(--on-primary)',
              fontFamily: FB, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              transition: reduce ? 'none' : 'opacity 0.15s',
            }}
          >
            Démarrer
          </button>
        </div>
      )}

      {tasks.length > 0 && (
        <div style={{ marginTop: 'var(--space-5)' }}>
          <p style={{ margin: '0 0 var(--space-2)', fontFamily: FB, fontSize: 12, fontWeight: 600, color: 'var(--text-mid)' }}>Tâches du jour</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tasks.map(t => (
              <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '8px 0', cursor: 'pointer', minHeight: 44 }}>
                <input type="checkbox" checked={t.completed} onChange={e => void toggle(t.id, e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer', flexShrink: 0 }} />
                <span style={{
                  fontFamily: FB, fontSize: 14, lineHeight: 1.4,
                  color: t.completed ? 'var(--text-dim)' : 'var(--text)',
                  textDecoration: t.completed ? 'line-through' : 'none',
                }}>{t.title}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
