import { Skeleton, SkeletonCard, SkeletonPageHeader } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SkeletonPageHeader style={{ marginBottom: 4 }} />

      {/* Summary card with macros */}
      <div style={{
        padding: '18px 16px', borderRadius: 16,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 20,
      }}>
        <Skeleton height={96} width={96} borderRadius={48} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Skeleton height={14} width={80} borderRadius={4} />
          <Skeleton height={28} width={120} borderRadius={6} />
          <div style={{ display: 'flex', gap: 8 }}>
            {[48, 48, 56].map((w, i) => <Skeleton key={i} height={8} width={w} borderRadius={4} />)}
          </div>
        </div>
      </div>

      {/* Macro breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={80} borderRadius={12} />
        ))}
      </div>

      {/* Meal list */}
      <Skeleton height={14} width={100} borderRadius={4} />
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonCard key={i} titleWidth={110} valueWidth={70} rows={1} />
      ))}
    </div>
  )
}
