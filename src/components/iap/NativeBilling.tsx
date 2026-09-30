'use client'
// ══════════════════════════════════════════════════════════════════
// Facturation de l'app iOS (achats intégrés Apple).
// Même structure que « Facturation » d'Apple/Claude : une ligne Forfait, puis
// une liste d'actions à icône. Aucun lien vers le site (règle App Store 3.1.1).
// ══════════════════════════════════════════════════════════════════
import { useState, type CSSProperties, type ReactNode } from 'react'
import { ChevronRight, CircleDollarSign, RefreshCw, Sparkles, Zap } from 'lucide-react'
import { openExternalUrl } from '@/lib/native/platform'
import { restoreIap } from '@/lib/iap/purchases'
import { openIapStore } from '@/lib/iap/store-events'

const APPLE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions'

const rowStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-4)', width: '100%', textAlign: 'left',
  padding: 'var(--space-4) var(--space-5)', minHeight: 64, background: 'transparent', border: 'none', cursor: 'pointer',
  color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 17, fontWeight: 500,
}

export default function NativeBilling({ planName, isCoach, loading }: { planName: string; isCoach: boolean; loading: boolean }) {
  const [note, setNote] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)

  const restore = () => {
    if (restoring) return
    setRestoring(true); setNote(null)
    void restoreIap()
      .then(ok => setNote(ok ? 'Achats restaurés.' : 'Restauration impossible pour le moment.'))
      .finally(() => setRestoring(false))
  }

  const rows: { label: string; icon: ReactNode; onClick: () => void }[] = [
    { label: 'Changer d’offre', icon: <Sparkles size={22} strokeWidth={1.7} />, onClick: () => openIapStore(isCoach ? 'coach' : 'athlete') },
    { label: 'Acheter des tokens', icon: <Zap size={22} strokeWidth={1.7} />, onClick: () => openIapStore('tokens') },
    { label: 'Gérer l’abonnement', icon: <CircleDollarSign size={22} strokeWidth={1.7} />, onClick: () => void openExternalUrl(APPLE_SUBSCRIPTIONS_URL) },
    { label: restoring ? 'Restauration…' : 'Restaurer les achats', icon: <RefreshCw size={22} strokeWidth={1.7} />, onClick: restore },
  ]

  return (
    <div style={{ padding: 'var(--space-2) 0 var(--space-6)', maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', padding: 'var(--space-5)', borderRadius: 'var(--r-lg)', background: 'var(--bg-card2)' }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>Forfait</span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 18, color: 'var(--text-mid)' }}>
          {loading ? '…' : `THW ${planName}`}{isCoach && !loading ? ' · Coach' : ''}
        </span>
      </div>
      <div style={{ borderRadius: 'var(--r-lg)', background: 'var(--bg-card2)', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rows.map(r => (
          <button key={r.label} type="button" onClick={r.onClick} style={rowStyle}>
            <span style={{ display: 'flex', color: 'var(--text-mid)' }}>{r.icon}</span>
            <span style={{ flex: 1 }}>{r.label}</span>
            <ChevronRight size={18} color="var(--text-dim)" />
          </button>
        ))}
      </div>
      {note && <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--text-mid)' }}>{note}</p>}
    </div>
  )
}
