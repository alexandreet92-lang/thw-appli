'use client'
// ══════════════════════════════════════════════════════════════
// PROCHAINES SÉANCES → tap /planning.
// planned_sessions après aujourd'hui. Pas de colonne date absolue :
// date = week_start + day_index jours. On garde les 3 prochaines.
// Bloc masqué si rien à venir.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { sportColor } from '@/components/recovery/helpers'
import { Card, SectionTitle, SportDot, Skeleton } from './primitives'
import { FD, FB, NUM, iso, todayIso, weekStartIso, formatDuration } from './lib'
import { currentLocale } from '@/lib/i18n'

interface Row { week_start: string; day_index: number; sport: string; title: string; duration_min: number | null; intensity: string | null; status: string }
interface Next { key: string; date: string; sport: string; title: string; duration_min: number | null; intensity: string | null }

const ZONE_KEY: Record<string, string> = { low: 'dashboard.zoneEasy', recovery: 'dashboard.zoneRecovery', moderate: 'dashboard.zoneModerate', mid: 'dashboard.zoneModerate', high: 'dashboard.zoneIntense', hard: 'dashboard.zoneIntense', max: 'dashboard.zoneMax' }

function sessionDate(weekStart: string, dayIndex: number): string {
  const d = new Date(weekStart + 'T00:00:00')
  d.setDate(d.getDate() + dayIndex)
  return iso(d)
}

function dayShort(isoDate: string): string {
  const s = new Date(isoDate + 'T00:00:00').toLocaleDateString(currentLocale(), { weekday: 'short', day: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function NextSessionsCard() {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Next[]>([])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) setLoading(false); return }
      const { data } = await supabase
        .from('planned_sessions')
        .select('week_start, day_index, sport, title, duration_min, intensity, status')
        .eq('user_id', user.id)
        .eq('status', 'planned')
        .gte('week_start', weekStartIso())
      if (cancelled) return
      const today = todayIso()
      const next = ((data as Row[] | null) ?? [])
        .map(r => ({ ...r, date: sessionDate(r.week_start, r.day_index) }))
        .filter(r => r.date > today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 3)
        .map(r => ({ key: `${r.week_start}-${r.day_index}-${r.title}`, date: r.date, sport: r.sport, title: r.title, duration_min: r.duration_min, intensity: r.intensity }))
      setItems(next)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) return <Skeleton height={120} />
  if (items.length === 0) return null // rien à venir → masqué

  return (
    <Card href="/planning">
      <SectionTitle action={<span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)' }}>→</span>}>{t('dashboard.nextSessions')}</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {items.map(s => {
          const zone = s.intensity ? (ZONE_KEY[s.intensity] ? t(ZONE_KEY[s.intensity]) : s.intensity) : null
          const meta = [formatDuration(s.duration_min), zone].filter(v => v && v !== '—').join(' · ')
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{ ...NUM, fontSize: 12, color: 'var(--text-dim)', width: 56, flexShrink: 0 }}>{dayShort(s.date)}</span>
              <SportDot color={sportColor(s.sport)} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontFamily: FD, fontSize: 14, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</p>
                {meta && <p style={{ margin: '2px 0 0', ...NUM, fontSize: 12, color: 'var(--text-mid)' }}>{meta}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
