'use client'

import { useEffect, useState } from 'react'
import { formatRecordDuration, durationRank } from '@/lib/records/format'

interface BeatenAllTime { label: string; display: string; watts: number }
interface BeatenYear    { label: string; display: string; watts: number; year: string }
interface BeatenPayload {
  allTime: BeatenAllTime[]
  year:    BeatenYear[]
}

interface Props {
  activityId: string
  isBike:     boolean
}

// ── Couleurs sémantiques fixes ─────────────────────────────────────────
const GOLD = '#eab308'
const CYAN = '#06B6D4'

// ── Trophy icon (lucide-style) ─────────────────────────────────────────
function TrophyIcon({ color = GOLD, size = 16 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}

// ── Lignes unifiées (All Time + Année), triées ────────────────────────
interface RowData {
  key:        string
  label:      string
  watts:      number
  kind:       'allTime' | 'year'
  yearLabel?: string  // pour les rows 'year' uniquement
}

export function RecordsBeaten({ activityId, isBike }: Props) {
  const [data,    setData]    = useState<BeatenPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isBike) { setLoading(false); return }
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/activities/process-records', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ activity_id: activityId }),
        })
        if (!res.ok) { if (!cancelled) setData({ allTime: [], year: [] }); return }
        const json = await res.json() as BeatenPayload
        if (!cancelled) setData(json)
      } catch {
        if (!cancelled) setData({ allTime: [], year: [] })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [activityId, isBike])

  if (!isBike) return null
  if (loading) return null

  const allTime = (data?.allTime ?? []).slice().sort((a, b) => durationRank(a.label) - durationRank(b.label))
  const year    = (data?.year    ?? []).slice().sort((a, b) => durationRank(a.label) - durationRank(b.label))

  // Aucun record battu → composant invisible (pas de message « Aucun record »)
  if (allTime.length === 0 && year.length === 0) return null

  // Liste plate unifiée : All Time d'abord, puis Année
  const rows: RowData[] = [
    ...allTime.map(e => ({
      key:   `at-${e.label}`,
      label: e.label,
      watts: e.watts,
      kind:  'allTime' as const,
    })),
    ...year.map(e => ({
      key:       `yr-${e.label}`,
      label:     e.label,
      watts:     e.watts,
      kind:      'year' as const,
      yearLabel: e.year,
    })),
  ]

  return (
    <div
      style={{
        background:   'rgba(234, 179, 8, 0.04)',
        border:       '1px solid var(--border)',
        borderRadius: 12,
        margin:       '12px 0',
        overflow:     'hidden',
      }}
    >
      {/* ── Header : trophée + Félicitations · New PR ── */}
      <div style={{
        display:     'flex',
        alignItems:  'center',
        gap:         8,
        padding:     '12px 14px',
      }}>
        <TrophyIcon color={GOLD} size={16} />
        <span style={{
          fontSize:   13,
          fontWeight: 600,
          color:      'var(--text)',
        }}>
          Félicitations · New PR
        </span>
      </div>

      {/* ── Lignes (sans sous-headers) ── */}
      <div style={{ padding: '0 14px 8px' }}>
        {rows.map((r, i) => {
          const last   = i === rows.length - 1
          const accent = r.kind === 'allTime' ? GOLD : CYAN
          const tagLabel = r.kind === 'allTime' ? 'All Time' : `Record ${r.yearLabel}`
          return (
            <div
              key={r.key}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          16,
                padding:      '10px 0',
                borderBottom: last ? 'none' : '1px solid var(--border)',
              }}
            >
              {/* Barre verticale colorée */}
              <span style={{
                width:        3,
                height:       24,
                background:   accent,
                borderRadius: 2,
                flexShrink:   0,
              }} />

              {/* Durée */}
              <span style={{
                width:              50,
                flexShrink:         0,
                fontSize:           11,
                fontWeight:         600,
                color:              'var(--text-mid)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {formatRecordDuration(r.label)}
              </span>

              {/* Valeur watts */}
              <span style={{
                flex:               1,
                minWidth:           0,
                fontSize:           15,
                fontWeight:         700,
                color:              accent,
                fontVariantNumeric: 'tabular-nums',
                fontFamily:         'Barlow Condensed, sans-serif',
                letterSpacing:      '-0.01em',
              }}>
                {r.watts}
                <span style={{
                  fontSize:   11,
                  fontWeight: 500,
                  color:      accent,
                  opacity:    0.7,
                  marginLeft: 4,
                }}>W</span>
              </span>

              {/* Tag catégorie */}
              <span style={{
                fontSize:       9,
                fontWeight:     700,
                letterSpacing:  '0.08em',
                textTransform:  'uppercase',
                color:          accent,
                opacity:        r.kind === 'year' ? 0.7 : 1,
                flexShrink:     0,
                whiteSpace:     'nowrap',
              }}>
                {tagLabel}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
