import { Skeleton, SkeletonPageHeader } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SkeletonPageHeader />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Skeleton height={46} width={46} borderRadius={23} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton height={15} width={'40%'} borderRadius={6} />
            <Skeleton height={13} width={'70%'} borderRadius={6} />
          </div>
        </div>
      ))}
    </div>
  )
}
