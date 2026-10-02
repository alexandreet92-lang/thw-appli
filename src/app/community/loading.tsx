import { Skeleton } from '@/components/ui/Skeleton'

// Squelette de la Communauté : rangée des espaces, carte de l'espace, salons.
export default function Loading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px', maxWidth: 560, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', gap: 14, overflow: 'hidden' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <Skeleton height={58} width={58} borderRadius="var(--r-lg)" />
            <Skeleton height={10} width={44} borderRadius={6} />
          </div>
        ))}
      </div>
      <Skeleton height={190} borderRadius="var(--r-lg)" />
      <Skeleton height={12} width={70} borderRadius={6} />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <Skeleton height={22} width={22} borderRadius={6} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton height={14} width={'40%'} borderRadius={6} />
            <Skeleton height={12} width={'75%'} borderRadius={6} />
          </div>
        </div>
      ))}
    </div>
  )
}
