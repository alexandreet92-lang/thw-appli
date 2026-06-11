'use client'
export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════
// /notifications — cible de la cloche du header. ENTRÉE SEULEMENT :
// état vide, aucun système de notifications n'est construit ici.
// ══════════════════════════════════════════════════════════════

export default function NotificationsPage() {
  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: 'var(--space-8) var(--space-5)' }}>
      <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: 'var(--text)' }}>
        Notifications
      </h1>
      <div style={{ marginTop: 'var(--space-8)', textAlign: 'center', padding: 'var(--space-12) var(--space-5)' }}>
        <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, color: 'var(--text)' }}>
          Rien de neuf pour l&apos;instant
        </p>
        <p style={{ margin: 'var(--space-2) 0 0', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.6 }}>
          Tes alertes (séances, objectifs, rappels) apparaîtront ici.
        </p>
      </div>
    </div>
  )
}
