'use client'
// ══════════════════════════════════════════════════════════════════════════
// Carte d'activité partagée (snapshot) — carte blanche façon Strava (maquette
// mock8 c2) : aperçu carte du tracé, titre, ligne « Sport · distance · durée ·
// allure », métriques secondaires et mini profil altimétrique.
// Clic → analyse complète lecture seule (RPC réservée aux membres) ou surpage
// snapshot — JAMAIS de navigation vers la page training d'un autre athlète.
// ══════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { sportColor, sportLabel } from '@/components/recovery/helpers'
import { RouteMap, ElevationSvg } from './activityViz'
import { ActivityDetailPanel } from './ActivityDetailPanel'
import { CommunityActivityAnalysis } from './CommunityActivityAnalysis'
import { CARD_BG, SOFT_SHADOW, TNUM, FB, fmtKm, fmtHms, fmtPaceKm } from './kit'
import type { ActivityRef } from '@/types/community'

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) } catch { return '' }
}

// `me` conservé pour compat d'appel. Avec `channelId`, le clic ouvre l'analyse
// complète (mêmes fonctionnalités que la page training, lecture seule).
export function ActivityCard({ activity, channelId }: { activity: ActivityRef; me?: string | null; channelId?: string }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const col = sportColor(activity.sport)
  const isBike = /bike|ride|cycl|v[ée]lo|velo/i.test(activity.sport)
  const kmh = activity.avgSpeedMs && activity.avgSpeedMs > 0 ? `${(activity.avgSpeedMs * 3.6).toFixed(1).replace('.', ',')} km/h` : null
  const main = [
    sportLabel(activity.sport) + (activity.isRace ? ` · ${t('w2g.race')}` : ''),
    fmtKm(activity.distanceM),
    fmtHms(activity.durationS),
    !isBike ? fmtPaceKm(activity.avgPaceSKm) : kmh,
  ].filter(Boolean) as string[]
  const extra = [
    activity.avgWatts ? `${Math.round(activity.avgWatts)} W${activity.npWatts ? ` · NP ${Math.round(activity.npWatts)}` : ''}` : null,
    activity.avgHr ? `${Math.round(activity.avgHr)} bpm${activity.maxHr ? ` · max ${Math.round(activity.maxHr)}` : ''}` : null,
    activity.elevGainM && activity.elevGainM > 0 ? `${Math.round(activity.elevGainM)} m D+` : null,
    activity.kj ? `${Math.round(activity.kj)} kJ` : null,
    activity.calories ? `${Math.round(activity.calories)} kcal` : null,
    activity.avgTempC != null ? `${Math.round(activity.avgTempC)}°C` : null,
    activity.tss ? `TSS ${Math.round(activity.tss)}` : null,
  ].filter(Boolean) as string[]

  return (
    <>
      <button type="button" onClick={() => { haptic('light'); setOpen(true) }} className="cm-btn cm-press"
        style={{ display: 'block', width: '100%', maxWidth: 360, textAlign: 'left', background: CARD_BG, borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: SOFT_SHADOW, fontFamily: FB }}>
        {activity.polyline && (
          <div style={{ position: 'relative', lineHeight: 0 }}>
            <RouteMap polyline={activity.polyline} height={128} />
            <span style={{ position: 'absolute', top: 10, left: 10, padding: '4px 9px', borderRadius: 'var(--r-pill)', background: 'var(--surface-card)', boxShadow: SOFT_SHADOW, fontSize: 12, fontWeight: 750, color: 'var(--text)', lineHeight: 1.2, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: col }} />{fmtDate(activity.startedAt)}
            </span>
          </div>
        )}
        <div style={{ padding: '11px 14px 13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!activity.polyline && <span style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0 }} />}
            <span style={{ flex: 1, minWidth: 0, fontSize: 15.5, fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activity.title || sportLabel(activity.sport)}</span>
            {!activity.polyline && <span style={{ ...TNUM, fontSize: 12, color: 'var(--text-dim)', flexShrink: 0 }}>{fmtDate(activity.startedAt)}</span>}
          </div>
          <div style={{ ...TNUM, marginTop: 3, fontSize: 13.5, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{main.join(' · ')}</div>
          {extra.length > 0 && <div style={{ ...TNUM, marginTop: 3, fontSize: 12.5, color: 'var(--text-dim)', display: 'flex', flexWrap: 'wrap', columnGap: 10 }}>{extra.map((s, i) => <span key={i}>{s}</span>)}</div>}
          {activity.elevation && activity.elevation.length > 1 && (
            <div style={{ marginTop: 8 }}><ElevationSvg elevation={activity.elevation} height={30} /></div>
          )}
        </div>
      </button>
      {open && (channelId
        ? <CommunityActivityAnalysis activity={activity} channelId={channelId} onClose={() => setOpen(false)} />
        : <ActivityDetailPanel activity={activity} onClose={() => setOpen(false)} />)}
    </>
  )
}
