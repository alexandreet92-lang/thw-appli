import { Skeleton, SkeletonPageHeader } from '@/components/ui/Skeleton'

// Squelette du Fil : cartes auteur · titre · statistiques · carte.
export default function Loading() {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SkeletonPageHeader />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Skeleton height={44} width={44} borderRadius={22} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton height={14} width={140} borderRadius={6} />
              <Skeleton height={12} width={190} borderRadius={6} />
            </div>
          </div>
          <Skeleton height={18} width={220} borderRadius={6} />
          <Skeleton height={36} width={260} borderRadius={6} />
          <Skeleton height={190} borderRadius="var(--r-lg)" />
        </div>
      ))}
    </div>
  )
}
