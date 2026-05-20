import { Skeleton, SkeletonPageHeader } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SkeletonPageHeader style={{ marginBottom: 4 }} />

      {/* Featured article */}
      <Skeleton height={180} borderRadius={16} />

      {/* Article cards */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{
          padding: '14px 16px', borderRadius: 14,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          display: 'flex', gap: 14, alignItems: 'flex-start',
        }}>
          <Skeleton height={64} width={64} borderRadius={10} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton height={13} width="90%" borderRadius={4} />
            <Skeleton height={13} width="70%" borderRadius={4} />
            <Skeleton height={11} width={80} borderRadius={4} />
          </div>
        </div>
      ))}
    </div>
  )
}
