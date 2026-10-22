// Prospection par email — Server Component. Garde réelle côté serveur :
// non connecté → login ; connecté non-admin → refus. Les données viennent de
// /api/admin/prospection (elle-même gardée par checkAdmin).
import { redirect } from 'next/navigation'
import { checkAdmin } from '@/lib/admin/guard'
import { ProspectionClient } from './ProspectionClient'

export const dynamic = 'force-dynamic'

export default async function ProspectionPage() {
  const chk = await checkAdmin()
  if (chk.status === 401) redirect('/auth')
  if (!chk.ok) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', padding: 'var(--space-6)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: 0 }}>403</h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mid)', margin: 0 }}>Accès réservé à l&apos;administrateur.</p>
      </div>
    )
  }
  return <ProspectionClient />
}
