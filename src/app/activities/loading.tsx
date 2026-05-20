import { Skeleton, SkeletonActivityList, SkeletonPageHeader } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SkeletonPageHeader style={{ marginBottom: 4 }} />

      {/* Sport tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[80, 72, 88, 64].map((w, i) => (
          <Skeleton key={i} height={34} width={w} borderRadius={8} />
        ))}
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={64} borderRadius={12} />
        ))}
      </div>

      {/* Activity list */}
      <SkeletonActivityList rows={5} />
    </div>
  )
}
