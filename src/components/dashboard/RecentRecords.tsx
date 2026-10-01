'use client'
// ══════════════════════════════════════════════════════════════
// RECORDS RÉCENTS → tap /performance.
// personal_records (useRecords), 1-2 plus récents. Chiffres neutres,
// liseré cyan fin. Bloc masqué si aucun record.
// ══════════════════════════════════════════════════════════════

import { useMemo } from 'react'
import { useRecords } from '@/hooks/useRecords'
import { useI18n } from '@/lib/i18n'
import { DashCard, DASH_ICONS, Skeleton } from './primitives'
import { FB, NUM, formatShortDate } from './lib'

export function RecentRecords() {
  const { t } = useI18n()
  const { records, loading } = useRecords()

  const recent = useMemo(() => {
    return [...records]
      .sort((a, b) => (b.achieved_at ?? '').localeCompare(a.achieved_at ?? ''))
      .slice(0, 3)
  }, [records])

  if (loading) return <Skeleton height={110} />
  if (recent.length === 0) return null // bloc masqué

  return (
    <DashCard icon={DASH_ICONS.records} title={t('dashboard.recentRecords')} href="/performance">
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${recent.length}, minmax(0, 1fr))`, gap: 8, textAlign: 'center' }}>
        {recent.map(r => (
          <div key={r.id} style={{ minWidth: 0 }}>
            <div aria-hidden style={{ width: 34, height: 34, borderRadius: '50%', margin: '0 auto 8px', display: 'grid', placeItems: 'center', background: 'var(--primary-dim)', color: 'var(--primary)', fontFamily: FB, fontSize: 11, fontWeight: 800 }}>PR</div>
            <p style={{ margin: 0, ...NUM, fontSize: 20, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.performance}</p>
            <p style={{ margin: '2px 0 0', fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.distance_label}</p>
            <p style={{ margin: '1px 0 0', ...NUM, fontSize: 12, color: 'var(--text-dim)' }}>{formatShortDate(r.achieved_at)}</p>
          </div>
        ))}
      </div>
    </DashCard>
  )
}
