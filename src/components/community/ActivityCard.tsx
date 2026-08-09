'use client'
// ══════════════════════════════════════════════════════════════════════════
// Carte d'activité partagée (snapshot). Montre le tracé + le profil altimétrique
// s'ils sont disponibles. Clic → surpage coulissante (détail read-only depuis le
// snapshot) — JAMAIS de navigation vers la page training d'un autre athlète.
// ══════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { sportColor, sportLabel } from '@/components/recovery/helpers'
import { RouteSvg, ElevationSvg } from './activityViz'
import { ActivityDetailPanel } from './ActivityDetailPanel'
import { CommunityActivityAnalysis } from './CommunityActivityAnalysis'
import type { ActivityRef } from '@/types/community'

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
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) } catch { return '' }
}

// `me` conservé pour compat d'appel. Avec `channelId`, le clic ouvre l'analyse
// complète (mêmes fonctionnalités que la page training, lecture seule) via la
// RPC réservée aux membres ; sinon, la surpage snapshot.
export function ActivityCard({ activity, channelId }: { activity: ActivityRef; me?: string | null; channelId?: string }) {
  const [open, setOpen] = useState(false)
  const col = sportColor(activity.sport)
  const stats = [
    fmtDistance(activity.distanceM),
    fmtDuration(activity.durationS),
    fmtPace(activity.avgPaceSKm),
    activity.avgHr ? `${Math.round(activity.avgHr)} bpm` : null,
    activity.elevGainM && activity.elevGainM > 0 ? `${Math.round(activity.elevGainM)} m D+` : null,
  ].filter(Boolean) as string[]

  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{ display: 'block', width: '100%', maxWidth: 340, textAlign: 'left', border: 'none', cursor: 'pointer', background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 0, overflow: 'hidden', fontFamily: FB }}>
        {activity.polyline && <RouteSvg polyline={activity.polyline} height={120} />}
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'stretch', padding: 'var(--space-3) var(--space-4)' }}>
          <span style={{ width: 3, borderRadius: 3, background: col, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 3 }}>
              <span style={{ fontFamily: FB, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-mid)' }}>{sportLabel(activity.sport)}{activity.isRace ? ' · Course' : ''}</span>
              <span className="tnum" style={{ fontFamily: FB, fontSize: 10.5, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>{fmtDate(activity.startedAt)}</span>
            </div>
            <p style={{ fontFamily: FD, fontSize: 14.5, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activity.title || sportLabel(activity.sport)}</p>
            {stats.length > 0 && (
              <div className="tnum" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', fontFamily: FB, fontSize: 12.5, color: 'var(--text-mid)', fontVariantNumeric: 'tabular-nums' }}>
                {stats.map((s, i) => <span key={i}>{s}</span>)}
              </div>
            )}
            {activity.elevation && activity.elevation.length > 1 && (
              <div style={{ marginTop: 6 }}><ElevationSvg elevation={activity.elevation} height={38} /></div>
            )}
            <span style={{ display: 'block', marginTop: 6, fontFamily: FB, fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>Voir le détail →</span>
          </div>
        </div>
      </button>
      {open && (channelId
        ? <CommunityActivityAnalysis activity={activity} channelId={channelId} onClose={() => setOpen(false)} />
        : <ActivityDetailPanel activity={activity} onClose={() => setOpen(false)} />)}
    </>
  )
}
