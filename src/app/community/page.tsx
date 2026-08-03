'use client'
export const dynamic = 'force-dynamic'
// Page Communauté « type Discord » — couche distincte de la messagerie privée
// (/messages, /coach/messages). Auth gérée par le middleware global.
// En-tête volontairement absent : la nav indique déjà « Communauté » (DS §4) et
// le rail/les colonnes portent le contexte. Le fil récupère toute la hauteur.
import { CommunityView } from '@/components/community/CommunityView'

export default function CommunityPage() {
  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', padding: 'var(--space-4) clamp(var(--space-3), 3vw, var(--space-6)) var(--space-5)' }}>
      <CommunityView />
    </div>
  )
}
