import { Skeleton, SkeletonCard, SkeletonPageHeader } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SkeletonPageHeader style={{ marginBottom: 4 }} />

      {/* Body diagram */}
      <Skeleton height={260} borderRadius={16} />

      {/* Active injuries */}
      <Skeleton height={14} width={120} borderRadius={4} />
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonCard key={i} titleWidth={130} valueWidth={90} rows={1} />
      ))}
    </div>
  )
}
