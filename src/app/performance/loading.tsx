import { Skeleton, SkeletonCard, SkeletonPageHeader } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SkeletonPageHeader style={{ marginBottom: 4 }} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[64, 80, 96, 72].map((w, i) => (
          <Skeleton key={i} height={34} width={w} borderRadius={8} />
        ))}
      </div>

      {/* Main chart */}
      <Skeleton height={220} borderRadius={16} />

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <SkeletonCard titleWidth={100} valueWidth={64} rows={1} />
        <SkeletonCard titleWidth={80}  valueWidth={52} rows={1} />
        <SkeletonCard titleWidth={110} valueWidth={72} rows={1} />
        <SkeletonCard titleWidth={90}  valueWidth={60} rows={1} />
      </div>
    </div>
  )
}
