'use client'
// État « en préparation » réutilisable (séances, exercices Hyrox…).
// Style aligné sur l'app : surface --bg-card2, accent unique --primary.
import { IconTool } from '@tabler/icons-react'

export function EnPreparation({ titre, texte }: { titre: string; texte: string }) {
  return (
    <div style={{
      marginTop: 'var(--space-6)', padding: '56px 24px', borderRadius: 'var(--r-lg)',
      background: 'var(--bg-card2)', textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--primary-dim)', color: 'var(--primary)',
      }}>
        <IconTool size={24} />
      </div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
        {titre}
      </h3>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-dim)', margin: 0, maxWidth: 420, lineHeight: 1.5 }}>
        {texte}
      </p>
    </div>
  )
}
