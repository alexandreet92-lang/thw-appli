'use client'
// ══════════════════════════════════════════════════════════════
// DERNIÈRE ACTIVITÉ → tap /activities?id={id} (pattern réel du repo).
// activities, dernière ligne (started_at desc).
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
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
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [act, setAct] = useState<Act | null>(null)
  const { compute } = useSmSn()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const user = await getCurrentUser()
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
    <Card>
      <SectionTitle>{t('dashboard.lastActivity')}</SectionTitle>

      {!act ? (
        <EmptyState title={t('dashboard.lastActivityEmptyTitle')} hint={t('dashboard.lastActivityEmptyHint')} href="/session" cta={t('dashboard.record')} />
      ) : (
        <>
          <Link href={`/activities?id=${act.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }} className="dash-tap">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
              <SportDot color={sportColor(sport)} />
              <span style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-mid)' }}>{sportLabel(sport)}</span>
              <span style={{ marginLeft: 'auto', ...NUM, fontSize: 12, color: 'var(--text-dim)' }}>{formatShortDate(act.started_at)}</span>
            </div>
            <p style={{ margin: 0, fontFamily: FD, fontSize: 15, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {act.title ?? sportLabel(sport)}
            </p>
            {meta && <p style={{ margin: 'var(--space-2) 0 0', ...NUM, fontSize: 13, color: 'var(--text-mid)' }}>{meta}</p>}
          </Link>
          {/* Action rapide « Analyser une activité » → ouvre le détail + lance l'analyse IA */}
          <Link href={`/activities?id=${act.id}&analyze=1`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 'var(--space-3)', padding: '6px 12px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--primary)', fontFamily: FB, fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/></svg>
            {t('dashboard.analyzeWithAI')}
          </Link>
        </>
      )}
    </Card>
  )
}
