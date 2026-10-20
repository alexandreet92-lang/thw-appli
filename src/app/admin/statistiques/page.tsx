// Page Statistiques du site — Server Component. Garde réelle côté serveur :
// non connecté → login ; connecté non-admin → 403. Les données sont chargées
// ensuite par le client via /api/admin/stats (même garde, no-store).
import { redirect } from 'next/navigation'
import { checkAdmin } from '@/lib/admin/guard'
import { StatsClient } from './StatsClient'

export const dynamic = 'force-dynamic'

export default async function StatistiquesPage() {
  const chk = await checkAdmin()
  if (chk.status === 401) redirect('/auth')
  if (!chk.ok) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', padding: 'var(--space-6)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: 0 }}>403</h1>
      </div>
    )
  }
  return <StatsClient />
}
