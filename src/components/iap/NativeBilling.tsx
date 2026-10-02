'use client'
// ══════════════════════════════════════════════════════════════════
// Facturation de l'app iOS (achats intégrés Apple).
// Même structure que « Facturation » d'Apple/Claude : une ligne Forfait, puis
// une liste d'actions à icône. Aucun lien vers le site (règle App Store 3.1.1).
// « Gérer l'abonnement » : réglages Apple, ou portail Stripe si l'abonnement
// actif a été souscrit sur le web (lien de gestion, pas d'achat).
// ══════════════════════════════════════════════════════════════════
import { useState, type ReactNode } from 'react'
import { Card } from '@/components/shadcn/card'
import { Button } from '@/components/shadcn/button'
import { ChevronRight, CircleDollarSign, RefreshCw, Sparkles, Zap } from 'lucide-react'
import { restoreIap } from '@/lib/iap/purchases'
import { openIapStore } from '@/lib/iap/store-events'
import { openSubscriptionManage } from '@/lib/subscriptions/startSubscriptionChange'

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
    { label: 'Gérer l’abonnement', icon: <CircleDollarSign size={22} strokeWidth={1.7} />, onClick: () => openSubscriptionManage(isCoach ? 'coach' : 'athlete') },
    { label: restoring ? 'Restauration…' : 'Restaurer les achats', icon: <RefreshCw size={22} strokeWidth={1.7} />, onClick: restore },
  ]

  return (
    <div className="mx-auto flex max-w-[560px] flex-col gap-4 pt-2 pb-6">
      <Card className="flex-row items-center justify-between gap-3 p-5">
        <span className="text-xl font-semibold">Forfait</span>
        <span className="text-lg text-muted-foreground">
          {loading ? '…' : `THW ${planName}`}{isCoach && !loading ? ' · Coach' : ''}
        </span>
      </Card>
      <Card className="gap-0.5 overflow-hidden p-0">
        {rows.map(r => (
          <Button key={r.label} type="button" variant="ghost" onClick={r.onClick}
            className="min-h-16 w-full justify-start gap-4 rounded-none px-5 text-[17px] font-medium">
            <span className="flex text-muted-foreground">{r.icon}</span>
            <span className="flex-1 text-left">{r.label}</span>
            <ChevronRight size={18} className="text-[var(--text-dim)]" />
          </Button>
        ))}
      </Card>
      {note && <p className="m-0 text-center text-[13.5px] text-muted-foreground">{note}</p>}
    </div>
  )
}
