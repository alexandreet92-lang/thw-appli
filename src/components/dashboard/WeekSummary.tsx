'use client'
// ══════════════════════════════════════════════════════════════
// CETTE SEMAINE — volume réalisé / prévu, séances faites, barres par jour
// (minutes réalisées ; aujourd'hui en accent). Sources : planned_sessions,
// activities (semaine courante).
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { DashCard, DASH_ICONS, Metric, MiniBars, Skeleton, EmptyState } from './primitives'
import { formatDuration, weekStartIso, currentDayIndex } from './lib'

interface PSession { status: string; duration_min: number | null }
interface State { sessions: PSession[]; perDay: number[] }

function isoWeek(ws: string): number {
  const d = new Date(ws + 'T00:00:00')
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7))
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return Math.ceil(((t.getTime() - y.getTime()) / 86400000 + 1) / 7)
}

export function WeekSummary() {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [s, setS] = useState<State>({ sessions: [], perDay: [0, 0, 0, 0, 0, 0, 0] })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const user = await getCurrentUser()
      if (!user) { if (!cancelled) setLoading(false); return }
      const ws = weekStartIso()
      const start = new Date(ws + 'T00:00:00')
      const end = new Date(start); end.setDate(start.getDate() + 7)
      const [sess, act] = await Promise.all([
        supabase.from('planned_sessions').select('status, duration_min').eq('user_id', user.id).eq('week_start', ws),
        supabase.from('activities').select('started_at, moving_time_s').eq('user_id', user.id).gte('started_at', start.toISOString()).lt('started_at', end.toISOString()),
      ])
      if (cancelled) return
      const perDay = [0, 0, 0, 0, 0, 0, 0]
      for (const a of ((act.data as { started_at: string; moving_time_s: number | null }[] | null) ?? [])) {
        const di = (new Date(a.started_at).getDay() + 6) % 7
        perDay[di] += (a.moving_time_s ?? 0) / 60
      }
      setS({ sessions: (sess.data as PSession[] | null) ?? [], perDay })
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) return <Skeleton height={130} />

  const total = s.sessions.length
  const done = s.sessions.filter(x => x.status === 'done').length
  const objMin = s.sessions.reduce((sum, x) => sum + (x.duration_min ?? 0), 0)
  const doneMin = Math.round(s.perDay.reduce((a, b) => a + b, 0))

  return (
    <DashCard icon={DASH_ICONS.week} title={t('dashboard.thisWeek')} meta={`S${isoWeek(weekStartIso())}`} href="/planning">
      {total === 0 && doneMin === 0 ? (
        <EmptyState title={t('dashboard.weekEmptyTitle')} hint={t('dashboard.weekEmptyHint')} />
      ) : (
        <Metric
          label={t('dashboard.volumeDone')}
          value={doneMin > 0 ? formatDuration(doneMin) : '0 min'}
          unit={objMin > 0 ? `/ ${formatDuration(objMin)}` : undefined}
          sub={total > 0 ? `${done} / ${total} ${t('dashboard.sessionsLabel')}` : undefined}
          right={<MiniBars values={s.perDay} highlight={currentDayIndex()} />}
        />
      )}
    </DashCard>
  )
}
