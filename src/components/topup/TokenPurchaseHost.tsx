'use client'
// ══════════════════════════════════════════════════════════════════
// Achat de tokens — fenêtre WEB (paiement Stripe direct, sans email).
// Monté une fois dans le shell ; ouvert par openTokenPurchase() depuis
// n'importe quel écran. Dans l'app iOS, openTokenPurchase() ouvre la
// boutique Apple (IapStoreHost) : ce composant ne s'affiche jamais.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/shadcn/dialog'
import { Button } from '@/components/shadcn/button'
import { useI18n, currentLocale } from '@/lib/i18n'
import { isNativeApp } from '@/lib/native/platform'
import { TOKEN_PACKS, DEFAULT_TOKEN_PACK, type TokenPackId } from '@/lib/topup/packs'
import { TOKEN_PURCHASE_EVENT, startTokenPurchase } from '@/lib/topup/startTokenPurchase'
import { TokenPackOption, formatPrice } from './TokenPackOption'

const PACK_NAME_KEY: Record<TokenPackId, string> = {
  discovery: 'misc.packDiscovery', performance: 'misc.packPerformance', elite: 'misc.packElite',
}
const PACK_DESC_KEY: Record<TokenPackId, string> = {
  discovery: 'misc.packDiscoveryDesc', performance: 'misc.packPerformanceDesc', elite: 'misc.packEliteDesc',
}

export function TokenPurchaseHost() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<TokenPackId>(DEFAULT_TOKEN_PACK)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNativeApp()) return
    const on = () => { setError(null); setBusy(false); setOpen(true) }
    window.addEventListener(TOKEN_PURCHASE_EVENT, on)
    return () => window.removeEventListener(TOKEN_PURCHASE_EVENT, on)
  }, [])

  const locale = currentLocale()
  const pack = TOKEN_PACKS.find(p => p.id === selected) ?? TOKEN_PACKS[0]
  const selectedPrice = formatPrice(pack.priceCents, 'eur', locale)

  const buy = async () => {
    if (busy) return
    setBusy(true); setError(null)
    try {
      await startTokenPurchase(pack.id)
      // Redirection vers Stripe en cours : on garde l'état « busy ».
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t('misc.error'))
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!busy) setOpen(v) }}>
      <DialogContent>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', paddingRight: 'var(--space-8)' }}>
          <DialogTitle>{t('shared.topUpTokens')}</DialogTitle>
          <DialogDescription>{t('tok.direct_desc')}</DialogDescription>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {TOKEN_PACKS.map(p => (
            <TokenPackOption key={p.id}
              title={t(PACK_NAME_KEY[p.id])}
              badge={p.id === DEFAULT_TOKEN_PACK ? t('misc.recommended') : null}
              sub={`${p.tokens.toLocaleString(locale)} tokens · ${t(PACK_DESC_KEY[p.id])}`}
              price={formatPrice(p.priceCents, 'eur', locale)}
              on={selected === p.id} disabled={busy}
              onClick={() => setSelected(p.id)} />
          ))}
        </div>

        {error && <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--danger)' }}>{error}</p>}

        <Button type="button" className="w-full" disabled={busy} onClick={() => void buy()}>
          {busy ? t('misc.redirecting') : `${t('tok.buy')} · ${selectedPrice}`}
        </Button>
        <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>
          {t('misc.securePaymentTokens')}
        </p>
      </DialogContent>
    </Dialog>
  )
}
