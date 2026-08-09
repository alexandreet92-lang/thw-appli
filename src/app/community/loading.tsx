import { Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      <div style={{ width: 60, flexShrink: 0, padding: '14px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={44} width={44} borderRadius={16} />)}
      </div>
      <div style={{ flex: 1, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Skeleton height={22} width={180} borderRadius={6} />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 10 }}>
            <Skeleton height={36} width={36} borderRadius={18} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton height={13} width={'30%'} borderRadius={6} />
              <Skeleton height={14} width={'85%'} borderRadius={6} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
