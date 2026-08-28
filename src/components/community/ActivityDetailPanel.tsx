'use client'
// ══════════════════════════════════════════════════════════════════════════
// Surpage coulissante (droite → gauche) affichant le détail d'une activité
// PARTAGÉE, uniquement depuis le snapshot (aucune lecture de l'activité d'autrui,
// aucune navigation vers la page training d'un autre athlète).
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { sportColor, sportLabel } from '@/components/recovery/helpers'
import { ActivityMapCard } from '@/components/activity/ActivityMapCard'
import { ElevationSvg } from './activityViz'
import type { ActivityRef } from '@/types/community'
import { useI18n } from '@/lib/i18n'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

function fmtDistance(m: number | null): string | null {
  if (!m || m <= 0) return null
  return m >= 1000 ? `${(m / 1000).toFixed(m >= 10000 ? 0 : 1).replace('.', ',')} km` : `${Math.round(m)} m`
}
function fmtDuration(s: number | null): string | null {
  if (!s || s <= 0) return null
  const h = Math.floor(s / 3600), min = Math.round((s % 3600) / 60)
  return h > 0 ? `${h}h${String(min).padStart(2, '0')}` : `${min} min`
}
function fmtPace(sPerKm: number | null): string | null {
  if (!sPerKm || sPerKm <= 0) return null
  const m = Math.floor(sPerKm / 60), sec = Math.round(sPerKm % 60)
  return `${m}:${String(sec).padStart(2, '0')} /km`
}
function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) } catch { return '' }
}

export function ActivityDetailPanel({ activity, onClose }: { activity: ActivityRef; onClose: () => void }) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  if (!mounted) return null

  const col = sportColor(activity.sport)
  const stats: { label: string; value: string }[] = []
  const d = fmtDistance(activity.distanceM); if (d) stats.push({ label: t('w3e.stat_distance'), value: d })
  const du = fmtDuration(activity.durationS); if (du) stats.push({ label: t('w3e.stat_duration'), value: du })
  const p = fmtPace(activity.avgPaceSKm); if (p) stats.push({ label: t('w3e.stat_avg_pace'), value: p })
  if (activity.elevGainM && activity.elevGainM > 0) stats.push({ label: t('w3e.stat_elev_gain'), value: `${Math.round(activity.elevGainM)} m` })
  if (activity.avgHr) stats.push({ label: t('w3e.stat_avg_hr'), value: `${Math.round(activity.avgHr)} bpm` })
  if (activity.tss) stats.push({ label: 'TSS', value: `${Math.round(activity.tss)}` })
  if (activity.difficulty != null) stats.push({ label: t('w3e.stat_difficulty'), value: `${activity.difficulty}/10` })
  if (activity.feeling != null) stats.push({ label: t('w3e.stat_feeling'), value: `${activity.feeling}/5` })

  const panel = (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'color-mix(in srgb, var(--bg) 45%, transparent)', backdropFilter: 'blur(2px)', zIndex: 1100, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" className="comm-drawer-in"
        style={{ width: 'min(96vw, 880px)', height: '100%', overflowY: 'auto', background: 'var(--bg-card)', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column' }}>
        {/* En-tête */}
        <div style={{ flexShrink: 0, padding: 'var(--space-5) var(--space-5) var(--space-3)', display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
          <span style={{ width: 3, alignSelf: 'stretch', borderRadius: 3, background: col, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 2 }}>
              <span style={{ fontFamily: FB, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-mid)' }}>{sportLabel(activity.sport)}{activity.isRace ? ` · ${t('w3e.race')}` : ''}</span>
            </div>
            <h2 style={{ fontFamily: FD, fontSize: 19, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{activity.title || sportLabel(activity.sport)}</h2>
            <p style={{ margin: '2px 0 0', fontFamily: FB, fontSize: 12, color: 'var(--text-dim)' }}>{fmtDate(activity.startedAt)}</p>
          </div>
          <button onClick={onClose} aria-label={t('w3e.close')} style={{ width: 30, height: 30, flexShrink: 0, border: 'none', borderRadius: '50%', background: 'var(--surface-neutral)', color: 'var(--text-mid)', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>

        <div style={{ padding: '0 var(--space-5) var(--space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {activity.polyline && (
            <div style={{ height: 260, borderRadius: 'var(--r-md)', overflow: 'hidden', position: 'relative' }}>
              <ActivityMapCard activity={{ summary_polyline: activity.polyline }} expanded />
            </div>
          )}
          {activity.elevation && activity.elevation.length > 1 && (
            <div>
              <div style={{ fontFamily: FB, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 4 }}>{t('w3e.elevation_profile')}</div>
              <ElevationSvg elevation={activity.elevation} height={72} />
            </div>
          )}
          {stats.length > 0 && (
            <div className="tnum" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)', fontVariantNumeric: 'tabular-nums' }}>
              {stats.map((s, i) => (
                <div key={i} style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-sm)', padding: 'var(--space-3)' }}>
                  <div style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)' }}>{s.label}</div>
                  <div style={{ fontFamily: FD, fontSize: 18, fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}
          {!activity.polyline && !activity.elevation && stats.length === 0 && (
            <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)' }}>{t('w3e.no_detailed_data')}</p>
          )}
        </div>
      </div>
    </div>
  )
  return createPortal(panel, document.body)
}
