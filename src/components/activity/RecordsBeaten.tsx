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

  // Tri canonique par durée
  const allTime = [...(data?.allTime ?? [])].sort((a, b) => durationRank(a.label) - durationRank(b.label))
  const year    = [...(data?.year    ?? [])].sort((a, b) => durationRank(a.label) - durationRank(b.label))
  const total   = allTime.length + year.length

  // Aucun record → masquer entièrement la section
  if (total === 0) return null

  const yearLabel = year[0]?.year ?? String(new Date().getFullYear())

  return (
    <div
      className="rb-card"
      style={{
        marginBottom:  18,
        background:    'var(--bg-card2)',
        border:        '1px solid var(--border)',
        borderRadius:  12,
        padding:       16,
      }}
    >
      {/* Header global */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   14,
        gap:            12,
      }}>
        <span style={{
          fontSize:       11,
          fontWeight:     700,
          letterSpacing:  '0.12em',
          textTransform:  'uppercase',
          color:          'var(--text-dim)',
        }}>
          Records battus
        </span>
        <span style={{
          fontSize:       11,
          letterSpacing:  '0.05em',
          color:          'var(--text-dim)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {total} record{total > 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Section All Time ── */}
      {allTime.length > 0 && (
        <RecordSection
          title={`All Time · ${allTime.length} record${allTime.length > 1 ? 's' : ''}`}
          rightLabel="All Time"
          accent={GOLD}
          items={allTime.map(e => ({ key: `at-${e.label}`, label: e.label, watts: e.watts }))}
        />
      )}

      {/* ── Section Record <année> ── */}
      {year.length > 0 && (
        <div style={{ marginTop: allTime.length > 0 ? 16 : 0 }}>
          <RecordSection
            title={`Record ${yearLabel} · ${year.length} record${year.length > 1 ? 's' : ''}`}
            rightLabel={yearLabel}
            accent={CYAN}
            items={year.map(e => ({ key: `yr-${e.label}`, label: e.label, watts: e.watts }))}
          />
        </div>
      )}

      {/* Responsive */}
      <style>{`
        .rb-row { gap: 16px; }
        @media (max-width: 640px) {
          .rb-row { gap: 12px; }
        }
      `}</style>
    </div>
  )
}

// ── Section interne ────────────────────────────────────────────────────
interface SectionProps {
  title:       string
  rightLabel:  string
  accent:      string
  items:       { key: string; label: string; watts: number }[]
}

function RecordSection({ title, rightLabel, accent, items }: SectionProps) {
  return (
    <div>
      {/* Sous-header */}
      <div style={{
        fontSize:       9,
        fontWeight:     700,
        letterSpacing:  '0.12em',
        textTransform:  'uppercase',
        color:          accent,
        paddingBottom:  6,
        borderBottom:   '1px solid var(--border)',
        marginBottom:   2,
      }}>
        {title}
      </div>

      {/* Lignes */}
      {items.map((it, i) => {
        const last = i === items.length - 1
        return (
          <div
            key={it.key}
            className="rb-row"
            style={{
              display:      'flex',
              alignItems:   'center',
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
              width:               50,
              flexShrink:          0,
              fontSize:            11,
              color:               'var(--text-mid)',
              fontVariantNumeric:  'tabular-nums',
              fontWeight:          600,
            }}>
              {formatRecordDuration(it.label)}
            </span>
            {/* Valeur (watts) */}
            <span style={{
              flex:                1,
              minWidth:            0,
              fontSize:            15,
              fontWeight:          700,
              color:               accent,
              fontVariantNumeric:  'tabular-nums',
              fontFamily:          'Barlow Condensed, sans-serif',
              letterSpacing:       '-0.01em',
            }}>
              {it.watts ?? '—'}
              <span style={{
                fontSize:    11,
                fontWeight:  500,
                color:       accent,
                opacity:     0.7,
                marginLeft:  4,
              }}>W</span>
            </span>
            {/* Label catégorie */}
            <span style={{
              fontSize:       9,
              fontWeight:     700,
              letterSpacing:  '0.12em',
              textTransform:  'uppercase',
              color:          accent,
              opacity:        0.7,
              flexShrink:     0,
            }}>
              {rightLabel}
            </span>
          </div>
        )
      })}
    </div>
  )
}
