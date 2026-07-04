'use client'
// ══════════════════════════════════════════════════════════════
// CETTE SEMAINE → tap /planning.
// planned_sessions (prévu/fait) + activities (volume réalisé) +
// day_intensity (jours d'intensité). Bande 7 jours L→D.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { sportColor } from '@/components/recovery/helpers'
import { Card, SectionTitle, Gauge, Skeleton, EmptyState } from './primitives'
import { FB, NUM, formatDuration, weekStartIso, iso, DAY_LETTERS } from './lib'

interface PSession { day_index: number; sport: string; status: string; duration_min: number | null }
interface Intensity { day_index: number; intensity: string }

interface State { sessions: PSession[]; intensities: Intensity[]; doneMin: number }

export function WeekSummary() {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [s, setS] = useState<State>({ sessions: [], intensities: [], doneMin: 0 })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) setLoading(false); return }
      const ws = weekStartIso()
      const start = new Date(ws + 'T00:00:00')
      const end = new Date(start); end.setDate(start.getDate() + 7)
      const [sess, inten, act] = await Promise.all([
        supabase.from('planned_sessions').select('day_index, sport, status, duration_min').eq('user_id', user.id).eq('week_start', ws),
        supabase.from('day_intensity').select('day_index, intensity').eq('user_id', user.id).eq('week_start', ws),
        supabase.from('activities').select('moving_time_s').eq('user_id', user.id).gte('started_at', start.toISOString()).lt('started_at', end.toISOString()),
      ])
      if (cancelled) return
      const acts = (act.data as { moving_time_s: number | null }[] | null) ?? []
      const doneMin = acts.reduce((sum, a) => sum + (a.moving_time_s ?? 0) / 60, 0)
      setS({ sessions: (sess.data as PSession[] | null) ?? [], intensities: (inten.data as Intensity[] | null) ?? [], doneMin })
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) return <Skeleton height={150} />

  const total = s.sessions.length
  const done = s.sessions.filter(x => x.status === 'done').length
  const objMin = s.sessions.reduce((sum, x) => sum + (x.duration_min ?? 0), 0)
  const intensityDays = s.intensities.filter(i => i.intensity === 'mid' || i.intensity === 'hard').length

  return (
    <Card href="/planning">
      <SectionTitle action={<span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)' }}>→</span>}>{t('dashboard.thisWeek')}</SectionTitle>

      {total === 0 ? (
        <EmptyState title={t('dashboard.weekEmptyTitle')} hint={t('dashboard.weekEmptyHint')} />
      ) : (
        <>
          <p style={{ margin: '0 0 var(--space-4)', ...NUM, fontSize: 13, color: 'var(--text-mid)' }}>
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{done} / {total}</span> {t('dashboard.sessionsLabel')}
            {objMin > 0 && <> · {formatDuration(Math.round(s.doneMin))}</>}
            {intensityDays > 0 && <> · {t('dashboard.intensityDays', { n: intensityDays })}</>}
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: objMin > 0 ? 'var(--space-4)' : 0 }}>
            {DAY_LETTERS.map((letter, di) => {
              const sess = s.sessions.find(x => x.day_index === di)
              const color = sess ? sportColor(sess.sport) : 'var(--text-dim)'
              const opacity = !sess ? 0.25 : sess.status === 'done' ? 1 : 0.5
              return (
                <div key={di} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)' }}>{letter}</span>
                  <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: sess ? color : 'var(--border-mid)', opacity }} />
                </div>
              )
            })}
          </div>

          {objMin > 0 && (
            <div>
              <Gauge value={Math.round(s.doneMin)} max={objMin} />
              <p style={{ margin: 'var(--space-2) 0 0', ...NUM, fontSize: 12, color: 'var(--text-dim)' }}>
                {formatDuration(Math.round(s.doneMin))} / {formatDuration(objMin)}
              </p>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
