'use client'

// ══════════════════════════════════════════════════════════════
// ActivityCard — vue Cards (style Strava épuré) sur la page
// d'historique des activités. Carte statique Mapbox Static Images
// + grille 4 stats + section records.
// ══════════════════════════════════════════════════════════════

import { useState } from 'react'
import { formatRecordDuration, durationRank } from '@/lib/records/format'

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
  tss:               number | null
  // Polyline encodée Google (Strava format) — déjà extraite côté page
  encodedPolyline:   string | null
  // Records auto associés à cette activité
  records: {
    allTime: { label: string; watts: number }[]
    year:    { label: string; watts: number; year: string }[]
  }
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

function fmtTss(v: number | null | undefined): string {
  if (v == null || v <= 0) return '—'
  return String(Math.round(v))
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
  // path-{w}+{color}-{opacity}({polyline}) — la polyline doit être URL-encodée
  const overlay = `path-2.5+${color}-1(${encodeURIComponent(encodedPolyline)})`
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
  const [hover, setHover] = useState(false)
  const [active, setActive] = useState(false)

  const allTime = [...data.records.allTime].sort((a, b) => durationRank(a.label) - durationRank(b.label))
  const year    = [...data.records.year].sort((a, b) => durationRank(a.label) - durationRank(b.label))
  const totalRecords = allTime.length + year.length

  // Map preview (640x180 cible ratio, mais auto sur Mapbox)
  const mapUrlMobile  = data.encodedPolyline ? mapboxStaticUrl(data.encodedPolyline, data.sportColor, 600, 160) : null
  const mapUrl        = data.encodedPolyline ? mapboxStaticUrl(data.encodedPolyline, data.sportColor, 700, 200) : null

  const yearLabel = year[0]?.year ?? String(new Date(data.startedAt).getFullYear())

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onTouchStart={() => setActive(true)}
      onTouchEnd={() => setActive(false)}
      onTouchCancel={() => setActive(false)}
      className="thw-activity-card"
      style={{
        background:    'var(--bg-card)',
        border:        `1px solid ${hover ? 'var(--border-mid)' : 'var(--border)'}`,
        borderRadius:  14,
        overflow:      'hidden',
        cursor:        'pointer',
        opacity:       active ? 0.85 : 1,
        transition:    'border-color 0.2s, opacity 0.15s',
        display:       'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Header ── */}
      <div style={{ padding: '14px 16px 10px' }}>
        <p style={{
          fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {data.title ?? 'Activité sans titre'}
        </p>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginTop: 4,
          fontSize: 10, color: 'var(--text-dim)',
        }}>
          <span style={{
            width:        6, height: 6, borderRadius: '50%',
            background:   data.sportColor, flexShrink: 0,
          }} />
          <span style={{
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {fmtSubline(data.sportLabel, data.startedAt)}
          </span>
        </div>
      </div>

      {/* ── Map preview ── */}
      {mapUrl && (
        <picture>
          <source media="(min-width: 640px)" srcSet={mapUrl} />
          <img
            src={mapUrlMobile ?? mapUrl}
            alt=""
            loading="lazy"
            style={{
              width:        '100%',
              height:       180,
              objectFit:    'cover',
              display:      'block',
              background:   'var(--bg-card2)',
            }}
            className="thw-card-map"
          />
        </picture>
      )}

      {/* ── Stats grid ── */}
      <div style={{
        padding: '12px 16px',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap:     8,
      }}>
        <Stat label="Distance" value={fmtDistKm(data.distance_m)} />
        <Stat label="Durée"    value={fmtDurCompact(data.moving_time_s)} />
        <Stat label="D+"       value={fmtElev(data.elevation_gain_m)} />
        <Stat label="TSS"      value={fmtTss(data.tss)} />
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
                <CountBlock accent={CYAN} count={year.length} label={`Record ${yearLabel}`} />
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
