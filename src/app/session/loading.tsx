import { Skeleton, SkeletonCard, SkeletonPageHeader } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SkeletonPageHeader style={{ marginBottom: 4 }} />

      {/* Date selector strip */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'hidden' }}>
        {[40, 40, 40, 40, 40, 40, 40].map((w, i) => (
          <Skeleton key={i} height={56} width={w} borderRadius={12} style={{ flexShrink: 0 }} />
        ))}
      </div>

      {/* Session cards */}
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} titleWidth={120} valueWidth={80} rows={2} />
      ))}
    </div>
  )
}
