'use client'
// ══════════════════════════════════════════════════════════════
// RECORDS RÉCENTS → tap /performance.
// personal_records (useRecords), 1-2 plus récents. Chiffres neutres,
// liseré cyan fin. Bloc masqué si aucun record.
// ══════════════════════════════════════════════════════════════

import { useMemo } from 'react'
import { useRecords } from '@/hooks/useRecords'
import { sportColor } from '@/components/recovery/helpers'
import { Card, SectionTitle, SportDot, Skeleton } from './primitives'
import { FD, FB, NUM, formatShortDate } from './lib'

export function RecentRecords() {
  const { records, loading } = useRecords()

  const recent = useMemo(() => {
    return [...records]
      .sort((a, b) => (b.achieved_at ?? '').localeCompare(a.achieved_at ?? ''))
      .slice(0, 2)
  }, [records])

  if (loading) return <Skeleton height={110} />
  if (recent.length === 0) return null // bloc masqué

  return (
    <Card href="/performance">
      <SectionTitle action={<span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)' }}>→</span>}>Records récents</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {recent.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', paddingLeft: 'var(--space-3)', borderLeft: '2px solid var(--primary)' }}>
            <SportDot color={sportColor(r.sport)} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontFamily: FD, fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>
                <span style={NUM}>{r.performance}</span>
                <span style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', fontWeight: 400 }}> — {r.distance_label}</span>
              </p>
            </div>
            <span style={{ ...NUM, fontSize: 12, color: 'var(--text-dim)', flexShrink: 0 }}>{formatShortDate(r.achieved_at)}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
