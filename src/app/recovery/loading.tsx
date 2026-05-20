import { Skeleton, SkeletonStat, SkeletonCard, SkeletonPageHeader } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SkeletonPageHeader style={{ marginBottom: 4 }} />

      {/* Banner */}
      <Skeleton height={80} borderRadius={16} />

      {/* Score + weekly */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Skeleton height={140} borderRadius={16} />
        <Skeleton height={140} borderRadius={16} />
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
      </div>

      {/* Sections */}
      <SkeletonCard titleWidth={100} valueWidth={60} rows={3} />
      <SkeletonCard titleWidth={120} valueWidth={80} rows={2} />
    </div>
  )
}
