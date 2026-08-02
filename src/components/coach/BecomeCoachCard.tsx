'use client'
// ══════════════════════════════════════════════════════════════════
// Côté ATHLÈTE : entrée self-service vers l'espace coach.
//  • jamais coach → « Deviens coach — 14 jours d'essai gratuit » (démarre l'essai)
//  • essai terminé sans pack → pousse vers les packs coach
//  • déjà coach (essai en cours / payant) → rien (la bascule d'interface suffit)
// ══════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCoachAccess, refreshCoachAccess } from '@/hooks/useCoachAccess'
import { startCoachTrial } from '@/lib/coach/owner'

export function BecomeCoachCard() {
  const router = useRouter()
  const s = useCoachAccess()
  const [busy, setBusy] = useState(false)

  if (s.loading || s.access) return null

  const start = async () => {
    setBusy(true)
    try { await startCoachTrial(); refreshCoachAccess(); router.push('/coach') }
    catch { setBusy(false) }
  }

  const expired = s.expired
  return (
    <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
          {expired ? 'Ton essai coach est terminé' : 'Deviens coach'}
        </h3>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-mid)', margin: '4px 0 0', lineHeight: 1.5 }}>
          {expired
            ? 'Choisis un pack pour retrouver ton espace coach et tes athlètes.'
            : 'Entraîne des athlètes, crée leurs plans, ta vitrine publique — 14 jours d’essai gratuit.'}
        </p>
      </div>
      {expired ? (
        <button onClick={() => router.push('/coach/subscription')} style={cta}>Voir les packs</button>
      ) : (
        <button onClick={start} disabled={busy} style={{ ...cta, opacity: busy ? 0.6 : 1 }}>{busy ? '…' : 'Essayer 14 j'}</button>
      )}
    </div>
  )
}

const cta: React.CSSProperties = {
  height: 40, padding: '0 16px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary)',
  color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
}
