import { Skeleton } from '@/components/ui/Skeleton'

// UI de chargement du segment racine « / » (Dashboard).
// Skeleton NEUTRE, pleine largeur, à la forme du Dashboard — surtout pas
// la mise en page Training (KPI / training-load / activities), qui donnait
// l'illusion d'atterrir sur Training. Voir PROMPT_DASHBOARD_FIX.md §1.
export default function Loading() {
  return (
    <div style={{ padding: '20px 20px 48px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Skeleton height={34} width={220} borderRadius={8} />
      <Skeleton height={200} borderRadius={20} />
      <Skeleton height={140} borderRadius={20} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Skeleton height={120} borderRadius={20} />
        <Skeleton height={120} borderRadius={20} />
      </div>
    </div>
  )
}
