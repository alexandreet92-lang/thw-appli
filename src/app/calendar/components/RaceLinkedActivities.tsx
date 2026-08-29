'use client'
// ══════════════════════════════════════════════════════════════════
// Section « Réalisé » de la fiche objectif (course) : liste les activités
// LIÉES à cette course (activities.linked_race_id), avec le tracé du parcours,
// les données clés, et la comparaison PRÉVU (objectif) vs RÉALISÉ.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX ?? ''
function mapboxStaticUrl(poly: string, color: string, w: number, h: number): string | null {
  if (!MAPBOX_TOKEN || !poly) return null
  const overlay = `path-4+${color.replace('#', '')}-0.9(${encodeURIComponent(poly)})`
  return `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/${overlay}/auto/${w}x${h}@2x?access_token=${MAPBOX_TOKEN}`
}
function fmtDur(s: number | null | undefined): string {
  if (!s) return '—'
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.round(s % 60)
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}
function fmtKm(m: number | null | undefined): string { return m ? `${(m / 1000).toFixed(1)} km` : '—' }
function fmtPace(s: number | null | undefined): string {
  if (!s || s <= 0) return '—'
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}/km`
}
// « 4h05 » / « 1:23:45 » → secondes, pour comparer un objectif de temps saisi à la main.
function parseGoalTime(v: unknown): number | null {
  if (typeof v !== 'string' || !v.trim()) return null
  const m = v.trim().match(/^(?:(\d+)\s*h\s*)?(\d{1,2})?(?::(\d{2}))?(?:min)?$/i) || v.match(/(\d+):(\d{2}):(\d{2})/)
  if (v.includes(':')) {
    const p = v.split(':').map(n => parseInt(n, 10))
    if (p.length === 3 && p.every(n => !isNaN(n))) return p[0] * 3600 + p[1] * 60 + p[2]
    if (p.length === 2 && p.every(n => !isNaN(n))) return p[0] * 60 + p[1]
  }
  if (m) { const h = parseInt(m[1] ?? '0', 10) || 0; const mm = parseInt(m[2] ?? '0', 10) || 0; return h * 3600 + mm * 60 }
  return null
}

interface Act {
  id: string; sport_type: string | null; title: string | null; distance_m: number | null
  moving_time_s: number | null; elapsed_time_s: number | null; avg_pace_s_km: number | null
  avg_watts: number | null; avg_hr: number | null; summary_polyline: string | null; started_at: string | null
  linked_race_date: string | null
}

const SPORT_COL: Record<string, string> = { run: '#22c55e', trail: '#84cc16', bike: '#3b82f6', swim: '#38bdf8', hyrox: '#ef4444', rowing: '#14b8a6', triathlon: '#a855f7' }

export function RaceLinkedActivities({ raceId, goalTime }: { raceId: string; goalTime?: string | null }) {
  const { t } = useI18n()
  const [acts, setActs] = useState<Act[] | null>(null)

  useEffect(() => {
    let cancel = false
    void (async () => {
      try {
        const { data } = await createClient().from('activities')
          .select('id,sport_type,title,distance_m,moving_time_s,elapsed_time_s,avg_pace_s_km,avg_watts,avg_hr,summary_polyline,started_at,linked_race_date')
          .eq('linked_race_id', raceId).order('started_at', { ascending: true })
        if (!cancel) setActs((data as Act[]) ?? [])
      } catch { if (!cancel) setActs([]) }
    })()
    return () => { cancel = true }
  }, [raceId])

  if (!acts || acts.length === 0) return null
  const goalS = parseGoalTime(goalTime)

  return (
    <div>
      <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 8px' }}>{t('calendar.realizedSection')}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {acts.map(a => {
          const col = SPORT_COL[(a.sport_type ?? 'run').toLowerCase()] ?? '#3b82f6'
          const map = a.summary_polyline ? mapboxStaticUrl(a.summary_polyline, col, 720, 260) : null
          const realizedS = a.moving_time_s ?? a.elapsed_time_s ?? null
          const delta = goalS != null && realizedS != null ? realizedS - goalS : null
          return (
            <a key={a.id} href={`/activities?id=${a.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              {map && <img src={map} alt="" style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} loading="lazy" />}
              <div style={{ padding: '11px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0 }} />
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title || t('calendar.realizedActivity')}</span>
                  {a.linked_race_date && <span style={{ fontSize: 10.5, fontWeight: 700, color: col, background: `${col}1f`, padding: '2px 7px', borderRadius: 999, flexShrink: 0, textTransform: 'capitalize' }}>{new Date(a.linked_race_date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>}
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--primary)', fontWeight: 600, flexShrink: 0 }}>{t('calendar.openAnalysis')} →</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[
                    { l: t('calendar.mDistance'), v: fmtKm(a.distance_m) },
                    { l: t('calendar.mTime'), v: fmtDur(realizedS) },
                    a.avg_watts ? { l: t('calendar.mPower'), v: `${Math.round(a.avg_watts)} W` } : { l: t('calendar.mPace'), v: fmtPace(a.avg_pace_s_km) },
                    { l: t('calendar.mHr'), v: a.avg_hr ? `${Math.round(a.avg_hr)} bpm` : '—' },
                  ].map((m, i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '6px 4px', borderRadius: 9, background: 'var(--bg-card2)' }}>
                      <p style={{ margin: 0, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-dim)' }}>{m.l}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'DM Mono, monospace' }}>{m.v}</p>
                    </div>
                  ))}
                </div>
                {/* Comparaison prévu / réalisé (temps) */}
                {goalS != null && realizedS != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, padding: '8px 11px', borderRadius: 10, background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t('calendar.planned')} <strong style={{ color: 'var(--text-mid)', fontFamily: 'DM Mono, monospace' }}>{fmtDur(goalS)}</strong></span>
                    <span style={{ color: 'var(--text-dim)' }}>→</span>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t('calendar.realized')} <strong style={{ color: 'var(--text)', fontFamily: 'DM Mono, monospace' }}>{fmtDur(realizedS)}</strong></span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: delta != null && delta <= 0 ? '#22c55e' : '#ef4444' }}>
                      {delta != null ? (delta <= 0 ? '−' : '+') + fmtDur(Math.abs(delta)) : ''}
                    </span>
                  </div>
                )}
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
