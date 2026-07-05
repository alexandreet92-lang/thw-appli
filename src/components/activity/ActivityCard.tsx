'use client'

// ══════════════════════════════════════════════════════════════
// ActivityCard — vue Cards (style Strava épuré) sur la page
// d'historique des activités. Carte statique Mapbox Static Images
// + grille 4 stats + section records.
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { formatRecordDuration, durationRank } from '@/lib/records/format'
import { SmSnStat } from '@/components/metrics/SmSnStat'
import { workoutTypeDefs } from '@/components/activity/WorkoutTypeBadges'
import { useI18n } from '@/lib/i18n'
import { reverseGeocode } from '@/lib/geo/reverseGeocode'

// ── Couleurs sémantiques fixes ─────────────────────────────────────────
const GOLD = '#eab308'
const CYAN = '#06B6D4'

// ── Types ──────────────────────────────────────────────────────────────
export interface ActivityCardData {
  id:                string
  title:             string | null
  sportType:         string
  sportLabel:        string
  sportColor:        string  // ex: '#06B6D4'
  startedAt:         string  // ISO
  distance_m:        number | null
  moving_time_s:     number | null
  elevation_gain_m:  number | null
  sm:                number | null  // Score Métabolique
  sn:                number | null  // Score Neuromusculaire
  // Polyline encodée Google (Strava format) — déjà extraite côté page
  encodedPolyline:   string | null
  // Records auto associés à cette activité
  records: {
    allTime: { label: string; watts: number }[]
    year:    { label: string; watts: number; year: string }[]
  }
  trainingTypes?: string[]        // ids de type d'entraînement (Force, PMA…)
  nbExercises?:   number | null   // muscu : nb d'exercices
  nbCircuits?:    number | null   // muscu : nb de circuits
  deviceName?:    string | null   // ex: « Garmin Edge 830 »
  startLat?:      number | null
  startLng?:      number | null
  locationName?:  string | null   // « Ville, Région » (si déjà géocodé)
  media?:         Array<{ url: string; type: 'image' | 'video'; path: string }> | null
  comment?:       string | null
}

interface Props {
  data:    ActivityCardData
  onClick: () => void
}

// ── Formatters dédiés à la card ────────────────────────────────────────
function fmtDistKm(m: number | null | undefined): string {
  if (!m || m <= 0) return '—'
  const km = m / 1000
  if (km >= 100) return `${Math.round(km)} km`
  return `${km.toFixed(1)} km`
}

function fmtDurCompact(s: number | null | undefined): string {
  if (!s || s <= 0) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
  return `${m} min`
}

function fmtElev(m: number | null | undefined): string {
  if (m == null || m <= 0) return '—'
  return `${Math.round(m)} m`
}

function fmtSubline(sportLabel: string, iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${sportLabel} · ${date} · ${time}`
}

// ── Mapbox Static Images URL builder ───────────────────────────────────
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX ?? ''

function mapboxStaticUrl(encodedPolyline: string, sportColor: string, width: number, height: number): string | null {
  if (!MAPBOX_TOKEN || !encodedPolyline) return null
  const color = sportColor.replace('#', '')
  // Liseré blanc dessous + trait couleur du sport dessus → bien lisible (façon Strava).
  const enc = encodeURIComponent(encodedPolyline)
  const overlay = `path-8+ffffff-1(${enc}),path-5+${color}-1(${enc})`
  return `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/${overlay}/auto/${width}x${height}@2x?access_token=${MAPBOX_TOKEN}`
}

// ── Trophy icon (lucide-style) ─────────────────────────────────────────
function TrophyIcon({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"
         strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}

// ── Main component ─────────────────────────────────────────────────────
export function ActivityCard({ data, onClick }: Props) {
  const { t } = useI18n()
  const [active, setActive] = useState(false)
  const [place, setPlace] = useState<string | null>(data.locationName ?? null)

  // Géocode le lieu de départ (Ville, Région) si pas déjà connu.
  useEffect(() => {
    if (place || data.startLat == null || data.startLng == null) return
    let cancelled = false
    void reverseGeocode(data.startLat, data.startLng).then(n => { if (!cancelled && n) setPlace(n) })
    return () => { cancelled = true }
  }, [place, data.startLat, data.startLng])

  const allTime = [...data.records.allTime].sort((a, b) => durationRank(a.label) - durationRank(b.label))
  const year    = [...data.records.year].sort((a, b) => durationRank(a.label) - durationRank(b.label))
  const totalRecords = allTime.length + year.length

  const mapUrl = data.encodedPolyline ? mapboxStaticUrl(data.encodedPolyline, data.sportColor, 720, 300) : null
  const media  = data.media ?? []
  const slides = [...(mapUrl ? [{ kind: 'map' as const, url: mapUrl }] : []), ...media.map(m => ({ kind: m.type, url: m.url }))]

  const yearLabel = year[0]?.year ?? String(new Date(data.startedAt).getFullYear())

  return (
    <div
      onClick={onClick}
      onTouchStart={() => setActive(true)}
      onTouchEnd={() => setActive(false)}
      onTouchCancel={() => setActive(false)}
      className="thw-activity-card"
      style={{
        background:    'transparent',
        borderBottom:  '1px solid var(--border)',
        cursor:        'pointer',
        opacity:       active ? 0.7 : 1,
        transition:    'opacity 0.15s',
        display:       'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Header ── */}
      <div style={{ padding: '16px 16px 10px' }}>
        <p style={{
          fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {data.title ?? t('activities.untitledActivity')}
        </p>
        {/* Sport · date · heure [· appareil] */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11.5, color: 'var(--text-dim)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: data.sportColor, flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fmtSubline(data.sportLabel, data.startedAt)}{data.deviceName ? ` · ${data.deviceName}` : ''}
          </span>
        </div>
        {/* Lieu de départ */}
        {place && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, fontSize: 11.5, color: 'var(--text-dim)' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place}</span>
          </div>
        )}
      </div>

      {/* ── Commentaire de l'athlète ── */}
      {data.comment && data.comment.trim() && (
        <p style={{ margin: '0 16px 12px', fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-mid)' }}>{data.comment}</p>
      )}

      {/* ── Carte + médias (défilement horizontal, façon Strava) ── */}
      {slides.length > 0 && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ display: 'flex', gap: 3, overflowX: 'auto', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'], marginBottom: 2 }}
          className="thw-card-carousel"
        >
          {slides.map((s, i) => (
            <div key={i} style={{ flex: slides.length > 1 ? '0 0 92%' : '0 0 100%', scrollSnapAlign: 'start', height: 210, background: 'var(--bg-card2)' }}>
              {s.kind === 'video'
                ? <video src={s.url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} muted playsInline preload="metadata" />
                : <img src={s.url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} className={s.kind === 'map' ? 'thw-card-map' : undefined} />}
            </div>
          ))}
        </div>
      )}

      {/* ── Type d'entraînement (Force, PMA, EF…) ── */}
      {(data.trainingTypes?.length ?? 0) > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '0 16px 2px' }}>
          {workoutTypeDefs(data.sportType, data.trainingTypes ?? []).map(t => (
            <span key={t.id} style={{
              fontSize: 9.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
              color: t.color, background: `${t.color}1a`, border: `1px solid ${t.color}55`,
            }}>{t.label}</span>
          ))}
        </div>
      )}

      {/* ── Stats grid (sport-aware : muscu/hyrox → exos/circuits, pas de distance/D+) ── */}
      <div style={{
        padding: '12px 16px 8px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap:     8,
      }}>
        {(data.sportType === 'gym' || data.sportType === 'hyrox') ? (
          <>
            <Stat label={t('activities.exercises')} value={data.nbExercises != null ? String(data.nbExercises) : '—'} />
            <Stat label={t('activities.duration')}  value={fmtDurCompact(data.moving_time_s)} />
            <Stat label={t('activities.circuits')}  value={data.nbCircuits != null ? String(data.nbCircuits) : '—'} />
          </>
        ) : (
          <>
            <Stat label={t('activities.distance')} value={fmtDistKm(data.distance_m)} />
            <Stat label={t('activities.duration')} value={fmtDurCompact(data.moving_time_s)} />
            <Stat label="D+"       value={fmtElev(data.elevation_gain_m)} />
          </>
        )}
      </div>
      {/* Charge — SM (métabolique) · SN (neuromusculaire), chiffres neutres */}
      <div style={{ padding: '0 16px 12px' }}>
        <SmSnStat sm={data.sm} sn={data.sn} size={13} />
      </div>

      {/* ── Records ── */}
      {totalRecords > 0 && (
        <div style={{ padding: '0 16px 14px' }}>
          {totalRecords === 1 ? (
            (() => {
              const isAllTime = allTime.length === 1
              const rec = isAllTime ? allTime[0] : year[0]
              const accent = isAllTime ? GOLD : CYAN
              const rightLabel = isAllTime ? 'All Time' : yearLabel
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IconBubble accent={accent} />
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      color: 'var(--text-dim)',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {formatRecordDuration(rec.label)}
                    </span>
                    <span style={{
                      fontSize: 13, fontWeight: 700, color: accent,
                      fontVariantNumeric: 'tabular-nums',
                      fontFamily: 'Barlow Condensed, sans-serif',
                    }}>
                      {rec.watts}<span style={{ opacity: 0.7, marginLeft: 3, fontSize: 10 }}>W</span>
                    </span>
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: accent,
                    opacity: isAllTime ? 1 : 0.7,
                    flexShrink: 0,
                  }}>
                    {rightLabel}
                  </span>
                </div>
              )
            })()
          ) : (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {allTime.length > 0 && (
                <CountBlock accent={GOLD} count={allTime.length} label="All Time" />
              )}
              {year.length > 0 && (
                <CountBlock accent={CYAN} count={year.length} label={t('activities.recordYear', { year: yearLabel })} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Sous-composants ────────────────────────────────────────────────────
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{
        fontSize: 9, fontWeight: 600, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--text-dim)',
        marginBottom: 4,
      }}>{label}</div>
      <div style={{
        fontSize: 16, fontWeight: 700, color: 'var(--text)',
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
    </div>
  )
}

function IconBubble({ accent }: { accent: string }) {
  return (
    <span style={{
      width: 22, height: 22, borderRadius: '50%',
      background: accent === GOLD ? 'rgba(234,179,8,0.15)' : 'rgba(6,182,212,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <TrophyIcon color={accent} size={12} />
    </span>
  )
}

function CountBlock({ accent, count, label }: { accent: string; count: number; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <IconBubble accent={accent} />
      <div>
        <div style={{
          fontSize: 13, fontWeight: 700, color: accent,
          fontVariantNumeric: 'tabular-nums', lineHeight: 1.1,
        }}>
          {count}
        </div>
        <div style={{
          fontSize: 8.5, fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--text-dim)',
        }}>
          {label}
        </div>
      </div>
    </div>
  )
}
