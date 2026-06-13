'use client'
// ══════════════════════════════════════════════════════════════
// DERNIÈRE ACTIVITÉ → tap /activities?id={id} (pattern réel du repo).
// activities, dernière ligne (started_at desc).
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sportColor, sportLabel } from '@/components/recovery/helpers'
import { Card, SectionTitle, SportDot, Skeleton, EmptyState } from './primitives'
import { FD, FB, NUM, formatShortDate, formatDuration, formatDistance } from './lib'
import { useSmSn } from '@/hooks/useSmSn'

interface Act {
  id: string; sport_type: string | null; title: string | null; started_at: string
  moving_time_s: number | null; elapsed_time_s: number | null; distance_m: number | null
  normalized_watts: number | null; ftp_at_time: number | null; avg_hr: number | null
  avg_temp_c: number | null; elevation_gain_m: number | null; total_descent_m: number | null; elevation_loss_m: number | null
}
const SELECT = 'id, sport_type, title, started_at, moving_time_s, elapsed_time_s, distance_m, normalized_watts, ftp_at_time, avg_hr, avg_temp_c, elevation_gain_m, total_descent_m, elevation_loss_m'

export function LastActivityCard() {
  const [loading, setLoading] = useState(true)
  const [act, setAct] = useState<Act | null>(null)
  const { compute } = useSmSn()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) setLoading(false); return }
      const { data } = await supabase
        .from('activities')
        .select(SELECT)
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (cancelled) return
      setAct((data as Act | null) ?? null)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) return <Skeleton height={120} />

  const sport = act?.sport_type ?? 'workout'
  const smsn = act ? compute(act) : null
  const meta = act
    ? [formatDistance(act.distance_m), formatDuration(act.moving_time_s ? Math.round(act.moving_time_s / 60) : null), smsn ? `SM ${smsn.sm} · SN ${smsn.sn}` : null]
        .filter(v => v && v !== '—').join(' · ')
    : ''

  return (
    <Card href={act ? `/activities?id=${act.id}` : undefined}>
      <SectionTitle>Dernière activité</SectionTitle>

      {!act ? (
        <EmptyState title="Aucune activité enregistrée" hint="Lance ta première séance." href="/session" cta="Enregistrer" />
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
            <SportDot color={sportColor(sport)} />
            <span style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-mid)' }}>{sportLabel(sport)}</span>
            <span style={{ marginLeft: 'auto', ...NUM, fontSize: 12, color: 'var(--text-dim)' }}>{formatShortDate(act.started_at)}</span>
          </div>
          <p style={{ margin: 0, fontFamily: FD, fontSize: 15, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {act.title ?? sportLabel(sport)}
          </p>
          {meta && <p style={{ margin: 'var(--space-2) 0 0', ...NUM, fontSize: 13, color: 'var(--text-mid)' }}>{meta}</p>}
        </div>
      )}
    </Card>
  )
}
