'use client'

import { useEffect, useState } from 'react'

interface BeatenEntry { label: string; display: string; watts: number }
interface BeatenPayload {
  allTime: BeatenEntry[]
  year:    BeatenEntry[]
}

interface Props {
  activityId: string
  isBike:     boolean
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

  const allTime = data?.allTime ?? []
  const year    = data?.year    ?? []
  const total   = allTime.length + year.length

  // Aucun record battu → ligne très discrète
  if (total === 0) {
    return (
      <div style={{
        padding:      '10px 14px',
        marginBottom: 16,
        borderRadius: 10,
        background:   'var(--bg-card2)',
        border:       '1px solid var(--border)',
        fontSize:     11,
        color:        'var(--text-dim)',
        textAlign:    'center',
      }}>
        Aucun record battu cette séance
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontSize:       10,
        fontWeight:     700,
        color:          'var(--text-dim)',
        letterSpacing:  0.9,
        textTransform:  'uppercase',
        marginBottom:   10,
        borderBottom:   '1px solid var(--border)',
        paddingBottom:  5,
        display:        'flex',
        alignItems:     'center',
        gap:            8,
      }}>
        <span>Records battus</span>
        <span style={{ color: '#F59E0B', fontSize: 12 }}>★</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {/* Badges All Time — doré */}
        {allTime.map((e) => (
          <div key={`at-${e.label}`} style={{
            display:        'inline-flex',
            alignItems:     'center',
            gap:            8,
            padding:        '7px 12px',
            borderRadius:   999,
            background:     'rgba(245,158,11,0.10)',
            border:         '1px solid rgba(184,134,11,0.55)',
          }}>
            <span style={{
              fontSize:           12,
              fontWeight:         700,
              color:              '#B8860B',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {e.display} — {e.watts}&nbsp;W
            </span>
            <span style={{
              fontSize:       10,
              fontWeight:     700,
              letterSpacing:  0.4,
              textTransform:  'uppercase',
              color:          '#FBBF24',
              background:     'rgba(251,191,36,0.18)',
              padding:        '2px 7px',
              borderRadius:   999,
              border:         '1px solid rgba(251,191,36,0.45)',
            }}>
              All&nbsp;Time
            </span>
          </div>
        ))}

        {/* Badges Année — cyan */}
        {year.map((e) => (
          <div key={`yr-${e.label}`} style={{
            display:        'inline-flex',
            alignItems:     'center',
            gap:            8,
            padding:        '7px 12px',
            borderRadius:   999,
            background:     'rgba(6,182,212,0.08)',
            border:         '1px solid rgba(6,182,212,0.45)',
          }}>
            <span style={{
              fontSize:           12,
              fontWeight:         700,
              color:              '#06B6D4',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {e.display} — {e.watts}&nbsp;W
            </span>
            <span style={{
              fontSize:       10,
              fontWeight:     700,
              letterSpacing:  0.4,
              textTransform:  'uppercase',
              color:          '#0891B2',
              background:     'rgba(8,145,178,0.14)',
              padding:        '2px 7px',
              borderRadius:   999,
              border:         '1px solid rgba(8,145,178,0.40)',
            }}>
              Année
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
