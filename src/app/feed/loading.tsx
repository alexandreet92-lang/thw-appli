import { Skeleton, SkeletonPageHeader } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SkeletonPageHeader />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <Skeleton height={38} width={38} borderRadius={19} />
            <Skeleton height={16} width={140} borderRadius={6} />
          </div>
          <Skeleton height={200} borderRadius={16} />
          <Skeleton height={16} width={220} borderRadius={6} />
        </div>
      ))}
    </div>
  )
}
