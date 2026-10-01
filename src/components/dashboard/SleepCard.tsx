'use client'
// ══════════════════════════════════════════════════════════════
// SOMMEIL — durée de la dernière nuit, écart à la moyenne des 6 nuits
// précédentes, barres des 7 dernières nuits. Source : health_data (sleep).
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { resolvePlanningUid } from '@/lib/planning/scope'
import { parseSleepNight, type SleepNight, type SleepRow } from '@/lib/health/sleep'
import { DashCard, DASH_ICONS, Metric, MiniBars, Skeleton, EmptyState } from './primitives'

function fmtH(min: number): string {
  const h = Math.floor(min / 60), m = Math.round(min % 60)
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}

export function SleepCard() {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [nights, setNights] = useState<SleepNight[]>([])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const uid = await resolvePlanningUid(supabase)   // scope-aware : cohérent avec l'en-tête
      if (!uid) { if (!cancelled) setLoading(false); return }
      const { data } = await supabase
        .from('health_data')
        .select('date, sleep_duration_min, deep_duration_min, rem_duration_min, light_duration_min, awake_duration_min')
        .eq('user_id', uid)
        .eq('data_type', 'sleep')
        .order('date', { ascending: false })
        .limit(7)
      if (cancelled) return
      const rows = ((data as SleepRow[] | null) ?? [])
      setNights(rows.map(r => parseSleepNight(r)).filter((n): n is SleepNight => !!n).reverse())
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) return <Skeleton height={130} />
  const last = nights[nights.length - 1]
  const prev = nights.slice(0, -1)
  const avg = prev.length ? prev.reduce((s, n) => s + n.totalMin, 0) / prev.length : null
  const delta = last && avg != null ? Math.round(last.totalMin - avg) : null

  return (
    <DashCard icon={DASH_ICONS.sleep} title={t('dashboard.sleep')} meta={nights.length > 1 ? t('dashboard.nNights', { n: nights.length }) : undefined} href="/recovery">
      {!last ? (
        <EmptyState title={t('dashboard.sleepEmptyTitle')} hint={t('dashboard.sleepEmptyHint')} href="/connections" cta={t('dashboard.connect')} />
      ) : (
        <Metric
          label={t('dashboard.lastNight')}
          value={fmtH(last.totalMin)}
          chip={delta != null && Math.abs(delta) >= 5 ? `${delta > 0 ? '▲' : '▼'} ${fmtH(Math.abs(delta))}` : undefined}
          right={nights.length > 1 ? <MiniBars values={nights.map(n => n.totalMin)} highlight={nights.length - 1} /> : undefined}
        />
      )}
    </DashCard>
  )
}
