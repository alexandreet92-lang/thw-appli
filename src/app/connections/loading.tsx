import { Skeleton, SkeletonPageHeader } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SkeletonPageHeader style={{ marginBottom: 4 }} />

      {/* Provider cards */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{
          padding: '16px', borderRadius: 16,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <Skeleton height={48} width={48} borderRadius={12} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton height={14} width={100} borderRadius={4} />
            <Skeleton height={12} width={160} borderRadius={4} />
          </div>
          <Skeleton height={32} width={72} borderRadius={8} />
        </div>
      ))}
    </div>
  )
}
