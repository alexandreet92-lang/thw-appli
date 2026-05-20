import { Skeleton, SkeletonProfileHeader, SkeletonCard } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SkeletonProfileHeader />

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={72} borderRadius={14} />
        ))}
      </div>

      {/* Info sections */}
      <SkeletonCard titleWidth={110} valueWidth={160} rows={3} />
      <SkeletonCard titleWidth={90}  valueWidth={120} rows={2} />
    </div>
  )
}
