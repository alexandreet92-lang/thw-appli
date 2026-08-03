'use client'
export const dynamic = 'force-dynamic'
// Page Communauté « type Discord » — couche distincte de la messagerie privée
// (/messages, /coach/messages). Auth gérée par le middleware global.
import { CommunityView } from '@/components/community/CommunityView'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

export default function CommunityPage() {
  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', padding: 'var(--space-5) clamp(var(--space-5), 4vw, var(--space-8)) var(--space-6)', fontFamily: FB }}>
      <header style={{ flexShrink: 0, marginBottom: 'var(--space-4)' }}>
        <h1 style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: 0 }}>La communauté THW</h1>
        <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 'var(--space-1) 0 0' }}>
          Échange avec les autres athlètes — par sport et par thème.
        </p>
      </header>
      <div style={{ flex: 1, minHeight: 0 }}>
        <CommunityView />
      </div>
    </div>
  )
}
