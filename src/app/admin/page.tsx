// Cockpit admin — Server Component. Garde réelle côté serveur (section 1 du
// PROMPT_ADMIN_STATS.md) : non connecté → login ; connecté non-admin → refus.
// Les agrégats sont calculés serveur (service role) puis passés en props au
// composant client. NON ajouté à la navigation utilisateur.
import { redirect } from 'next/navigation'
import { checkAdmin } from '@/lib/admin/guard'
import { getAdminMetrics } from '@/lib/admin/metrics'
import { getUserFeedback } from '@/lib/admin/feedback'
import { AdminDashboard } from './AdminDashboard'

export const dynamic = 'force-dynamic'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

export default async function AdminPage() {
  const chk = await checkAdmin()
  if (chk.status === 401) redirect('/auth')
  if (!chk.ok) {
    // Défense en profondeur (le middleware renvoie déjà un 403 réel sur /admin).
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', padding: 'var(--space-6)' }}>
        <h1 style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: 0 }}>403 — Accès refusé</h1>
        <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 0 }}>Cette page est réservée à l&apos;administrateur.</p>
      </div>
    )
  }

  const [metrics, feedback] = await Promise.all([getAdminMetrics(), getUserFeedback()])
  return <AdminDashboard metrics={metrics} adminEmail={chk.email} feedback={feedback} />
}
