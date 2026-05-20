import { Skeleton, SkeletonStat, SkeletonActivityList, SkeletonPageHeader } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900, margin: '0 auto' }}>
      <SkeletonPageHeader style={{ marginBottom: 4 }} />

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
      </div>

      {/* Training load chart */}
      <Skeleton height={180} borderRadius={16} />

      {/* Recent activities */}
      <Skeleton height={14} width={140} borderRadius={4} />
      <SkeletonActivityList rows={3} />
    </div>
  )
}
