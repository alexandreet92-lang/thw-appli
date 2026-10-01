'use client'
// ══════════════════════════════════════════════════════════════
// DERNIÈRE ACTIVITÉ → tap /activities?id={id} (pattern réel du repo).
// activities, dernière ligne (started_at desc).
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { sportColor, sportLabel } from '@/components/recovery/helpers'
import { DashCard, DASH_ICONS, SportDot, Skeleton, EmptyState } from './primitives'
import { usePushNav } from '@/hooks/usePushNav'
import { FB, NUM, formatShortDate, formatDuration, formatDistance } from './lib'
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
  const push = usePushNav()

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
    ? [formatDistance(act.distance_m), formatDuration(act.moving_time_s ? Math.round(act.moving_time_s / 60) : null), smsn ? `${t('dashboard.loadShort')} ${smsn.sm} · ${t('dashboard.neuroShort')} ${smsn.sn}` : null]
        .filter(v => v && v !== '—').join(' · ')
    : ''

  return (
    <DashCard icon={DASH_ICONS.last} title={t('dashboard.lastActivity')} meta={act ? formatShortDate(act.started_at) : undefined} href={act ? `/activities?id=${act.id}` : '/activities'}>
      {!act ? (
        <EmptyState title={t('dashboard.lastActivityEmptyTitle')} hint={t('dashboard.lastActivityEmptyHint')} />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <SportDot color={sportColor(sport)} size={8} />
            <span style={{ fontFamily: FB, fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-mid)' }}>{sportLabel(sport)}</span>
          </div>
          <p style={{ margin: '6px 0 0', fontFamily: FB, fontSize: 18, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {act.title ?? sportLabel(sport)}
          </p>
          {meta && <p style={{ margin: '6px 0 0', ...NUM, fontSize: 14, color: 'var(--text-mid)' }}>{meta}</p>}
          {/* Action rapide « Analyser une activité » → ouvre le détail + lance l'analyse IA */}
          <button type="button" onClick={e => { e.stopPropagation(); push(`/activities?id=${act.id}&analyze=1`) }} className="thw-press"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 'var(--space-4)', padding: '8px 14px', borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--ai-accent-dim)', color: 'var(--ai-accent)', fontFamily: FB, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/></svg>
            {t('dashboard.analyzeWithAI')}
          </button>
        </>
      )}
    </DashCard>
  )
}
