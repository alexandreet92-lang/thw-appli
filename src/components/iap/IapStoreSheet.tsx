'use client'
// ══════════════════════════════════════════════════════════════════
// Boutique d'achat in-app — présentation PURE (aucune logique d'achat).
// Même langage que l'écran « Abonnements disponibles » d'Apple/Claude :
// cartes larges à cocher (nom + prix), une seule sélection, un bouton.
// La logique (prix Apple, achat, restauration) vit dans IapStoreHost.
// Mobile (≤ 767 px) : feuille gris chaud radius 24, poignée, bouton rond ×,
// pistes segmentées grises à pouce blanc, cartes blanches à cocher (anneau
// cyan), pilule cyan pleine largeur. iPad / large : rendu historique.
// ══════════════════════════════════════════════════════════════════
import type { CSSProperties, ReactNode } from 'react'
import { Check, X } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn/tabs'
import { Button } from '@/components/shadcn/button'
import { useSwipeBack, useSwipeDown } from '@/hooks/useSwipeBack'
import type { AthleteTier } from '@/lib/iap/products'
import type { BillingPeriod, CoachPackKey } from '@/lib/subscriptions/coach-packs'
import { SegTrack } from '@/components/ai/mobile/MobileKit'
import { SheetCloseBtn, SheetPill, SHEET_RADIUS, SHEET_CARD_SHADOW, useMobileSafe } from '@/components/ui/BottomSheet'

export type StoreTab = 'athlete' | 'coach' | 'tokens'

export interface StoreLabels {
  close: string
  monthly: string
  yearly: string
}

export interface CoachPackView { key: CoachPackKey; name: string; label: string }
export interface TokenView { id: string; amount: number }
export interface Msg { kind: 'ok' | 'err'; text: string }

export interface IapStoreSheetProps {
  shown: boolean
  tab: StoreTab
  onTab: (t: StoreTab) => void
  labels: StoreLabels
  prices: Record<string, string>
  loading: boolean
  busy: string | null
  msg: Msg | null
  onClose: () => void
  // Athlète
  athleteTiers: { tier: AthleteTier; name: string; subtitle: string }[]
  athleteId: (tier: AthleteTier, period: BillingPeriod) => string
  period: BillingPeriod
  onPeriod: (p: BillingPeriod) => void
  selectedTier: AthleteTier
  onSelectTier: (t: AthleteTier) => void
  // Coach
  coachPacks: CoachPackView[]
  coachPack: CoachPackKey
  onCoachPack: (k: CoachPackKey) => void
  coachTier: AthleteTier
  onCoachTier: (t: AthleteTier) => void
  coachId: (pack: CoachPackKey, tier: AthleteTier) => string | null
  // Tokens
  tokens: TokenView[]
  selectedToken: string
  onSelectToken: (id: string) => void
  // Actions
  onBuy: (productId: string, kind: 'sub' | 'tokens') => void
  onRestore: () => void
  onManage: () => void
  onTerms: () => void
  onPrivacy: () => void
  onContact: () => void
}

const num: CSSProperties = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'zero' 0" }

function Radio({ on }: { on: boolean }) {
  return (
    <span aria-hidden style={{
      width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: on ? 'var(--primary)' : 'transparent',
      boxShadow: on ? 'none' : 'inset 0 0 0 2px var(--text-dim)',
    }}>
      {on && <Check size={16} strokeWidth={3} color="var(--on-primary)" />}
    </span>
  )
}

function OptionCard({ title, subs, on, onClick, disabled, m }: { title: string; subs: string[]; on: boolean; onClick: () => void; disabled?: boolean; m?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={on} style={{
      width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
      padding: m ? 'var(--space-4)' : 'var(--space-5)', minHeight: m ? 76 : 88, borderRadius: 'var(--r-lg)', border: 'none', cursor: disabled ? 'default' : 'pointer',
      background: m ? 'var(--surface-card)' : on ? 'var(--primary-dim)' : 'var(--bg-card2)', opacity: disabled ? 0.5 : 1,
      ...(m ? { boxShadow: on ? 'inset 0 0 0 2px var(--primary)' : SHEET_CARD_SHADOW, transition: 'box-shadow 0.2s ease' } : null),
    }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: m ? 800 : 600, color: 'var(--text)', lineHeight: 1.25 }}>{title}</span>
        {subs.map((line, i) => (
          <span key={i} style={{ ...num, display: 'block', marginTop: i === 0 ? 4 : 2, fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-mid)' }}>{line}</span>
        ))}
      </span>
      <Radio on={on} />
    </button>
  )
}

function Segmented<T extends string>({ value, options, onChange, m }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; m?: boolean }) {
  if (m) return <SegTrack<T> value={value} onChange={onChange} options={options.map(o => ({ v: o.id, l: o.label }))} />
  return (
    <Tabs value={value} onValueChange={v => onChange(v as T)}>
      <TabsList>
        {options.map(o => <TabsTrigger key={o.id} value={o.id}>{o.label}</TabsTrigger>)}
      </TabsList>
    </Tabs>
  )
}

function Label({ children, m }: { children: ReactNode; m?: boolean }) {
  if (m) return <p style={{ margin: 'var(--space-6) var(--space-4) var(--space-2)', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500, color: 'var(--text-mid)' }}>{children}</p>
  return <p style={{ margin: 'var(--space-5) 0 var(--space-3)', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)' }}>{children}</p>
}

const linkBtn: CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', minHeight: 44, padding: '0 var(--space-3)',
  color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 12.5, textDecoration: 'underline',
}

export function IapStoreSheet(p: IapStoreSheetProps) {
  const L = p.labels
  const m = useMobileSafe()
  // Gestes : glisser du bord gauche vers la droite, ou tirer vers le bas → ferme la feuille.
  const back = useSwipeBack(p.onClose)
  const down = useSwipeDown(p.onClose)
  const dragging = back.dragX > 0 || down.dragY > 0
  const perLabel = p.period === 'yearly' ? 'par an' : 'par mois'
  const priceOf = (id: string | null) => (id ? p.prices[id] : undefined)
  const noPrices = !p.loading && Object.keys(p.prices).length === 0

  // Produit sélectionné + intitulé du bouton selon l'onglet.
  let productId: string | null = null
  let kind: 'sub' | 'tokens' = 'sub'
  if (p.tab === 'athlete') productId = p.athleteId(p.selectedTier, p.period)
  else if (p.tab === 'coach') productId = p.coachId(p.coachPack, p.coachTier)
  else { productId = p.selectedToken; kind = 'tokens' }
  const selectedPrice = priceOf(productId)
  const canBuy = !!productId && !!selectedPrice && p.busy === null
  const cta = p.busy && p.busy === productId ? 'Validation…' : p.tab === 'tokens' ? 'Acheter' : 'S’abonner'

  const skeleton = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {[0, 1, 2].map(i => <div key={i} style={{ height: m ? 76 : 88, borderRadius: 'var(--r-lg)', background: m ? 'var(--surface-chip)' : 'var(--bg-card2)' }} />)}
    </div>
  )

  return (
    <div onClick={p.onClose} style={{
      position: 'fixed', inset: 0, zIndex: 14000, background: 'var(--scrim)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      opacity: p.shown ? 1 : 0, transition: 'opacity 0.26s ease',
    }}>
      <div onClick={e => e.stopPropagation()} {...back.handlers} style={{
        width: 'min(560px, 100%)', height: '94dvh', display: 'flex', flexDirection: 'column', background: m ? 'var(--surface-page)' : 'var(--bg)',
        borderRadius: m ? SHEET_RADIUS : 'var(--r-lg) var(--r-lg) 0 0', touchAction: 'pan-y', overflow: m ? 'hidden' : undefined, fontFamily: m ? 'var(--font-body)' : undefined,
        transform: p.shown ? `translate(${back.dragX}px, ${down.dragY}px)` : 'translateY(100%)',
        transition: dragging ? 'none' : 'transform 0.28s cubic-bezier(0.32,0.72,0,1)',
      }}>
        {/* En-tête */}
        {m ? (
          <div {...down.handlers} style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', position: 'relative', padding: 'var(--space-5) var(--space-4) 0', minHeight: 64 }}>
            <span aria-hidden style={{ position: 'absolute', top: 8, left: '50%', width: 38, height: 5, marginLeft: -19, borderRadius: 'var(--r-pill)', background: 'var(--surface-bar)' }} />
            <SheetCloseBtn onClick={p.onClose} label={L.close} />
          </div>
        ) : (
        <div {...down.handlers} style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', position: 'relative', padding: 'var(--space-4) var(--space-4) 0', minHeight: 60 }}>
          <span aria-hidden style={{ position: 'absolute', top: 'var(--space-2)', left: '50%', width: 36, height: 5, marginLeft: -18, borderRadius: 3, background: 'var(--text-dim)', opacity: 0.5 }} />
          <Button type="button" variant="secondary" size="icon" onClick={p.onClose} aria-label={L.close}><X size={20} strokeWidth={2.4} /></Button>
        </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: m ? '0 var(--space-4) var(--space-5)' : '0 var(--space-5) var(--space-5)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" width={72} height={72} style={{ display: 'block', margin: 'var(--space-2) auto var(--space-5)', borderRadius: 'var(--r-lg)' }} />
          <h2 style={{ margin: '0 0 var(--space-5)', textAlign: 'center', fontFamily: m ? 'var(--font-body)' : 'var(--font-display)', fontSize: 26, fontWeight: m ? 800 : 600, letterSpacing: m ? '-0.02em' : undefined, color: 'var(--text)', lineHeight: 1.2 }}>
            {p.tab === 'tokens' ? 'Recharger des tokens' : 'Abonnements disponibles'}
          </h2>

          <Segmented<StoreTab> m={m} value={p.tab} onChange={p.onTab} options={[
            { id: 'athlete', label: 'Athlète' }, { id: 'coach', label: 'Coach' }, { id: 'tokens', label: 'Tokens' },
          ]} />

          {p.msg && (
            <p style={{ margin: 'var(--space-4) 0 0', fontFamily: 'var(--font-body)', fontSize: 13.5, color: p.msg.kind === 'ok' ? 'var(--text)' : 'var(--danger)' }}>{p.msg.text}</p>
          )}
          {noPrices && (
            <p style={{ margin: 'var(--space-4) 0 0', fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--text-mid)' }}>
              Les offres ne sont pas disponibles pour le moment. Réessaie dans quelques instants.
            </p>
          )}

          {/* ── Athlète ───────────────────────────────────────── */}
          {p.tab === 'athlete' && (
            <>
              <div style={{ height: 'var(--space-4)' }} />
              <Segmented<BillingPeriod> m={m} value={p.period} onChange={p.onPeriod} options={[{ id: 'monthly', label: L.monthly }, { id: 'yearly', label: L.yearly }]} />
              <div style={{ height: 'var(--space-4)' }} />
              {p.loading ? skeleton : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {p.athleteTiers.map(t => {
                    const price = priceOf(p.athleteId(t.tier, p.period))
                    return <OptionCard m={m} key={t.tier} title={`Athlète ${t.name}`} subs={[price ? `${price} ${perLabel}` : t.subtitle]}
                      on={p.selectedTier === t.tier} onClick={() => p.onSelectTier(t.tier)} disabled={!price} />
                  })}
                </div>
              )}
            </>
          )}

          {/* ── Coach (option athlète intégrée) ───────────────── */}
          {p.tab === 'coach' && (
            <>
              <Label m={m}>Capacité d’athlètes</Label>
              {p.loading ? skeleton : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {p.coachPacks.map(k => {
                    const price = priceOf(p.coachId(k.key, p.coachTier))
                    return <OptionCard m={m} key={k.key} title={`Coach ${k.name}`} subs={[k.label, price ? `${price} ${perLabel}` : '—']}
                      on={p.coachPack === k.key} onClick={() => p.onCoachPack(k.key)} disabled={!price} />
                  })}
                </div>
              )}
              <Label m={m}>Option athlète incluse</Label>
              <Segmented<AthleteTier> m={m} value={p.coachTier} onChange={p.onCoachTier} options={[
                { id: 'premium', label: 'Sans option' }, { id: 'pro', label: 'Pro' }, { id: 'expert', label: 'Expert' },
              ]} />
              <div style={{ height: 'var(--space-3)' }} />
              <Segmented<BillingPeriod> m={m} value={p.period} onChange={p.onPeriod} options={[{ id: 'monthly', label: L.monthly }, { id: 'yearly', label: L.yearly }]} />
              {!p.loading && !noPrices && !selectedPrice && (
                <p style={{ margin: 'var(--space-4) 0 0', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-dim)' }}>Cette formule n’est pas disponible à l’achat dans l’app.</p>
              )}
              <p style={{ margin: 'var(--space-5) 0 0', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                Packs Académie, Élite et Fédération : offres sur mesure.{' '}
                <button type="button" onClick={p.onContact} style={{ ...linkBtn, padding: 0, minHeight: 0, fontSize: 13 }}>Nous contacter</button>
              </p>
            </>
          )}

          {/* ── Tokens ─────────────────────────────────────────── */}
          {p.tab === 'tokens' && (
            <>
              <div style={{ height: 'var(--space-4)' }} />
              {p.loading ? skeleton : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {p.tokens.map(t => {
                    const price = priceOf(t.id)
                    return <OptionCard m={m} key={t.id} title={`${t.amount.toLocaleString('fr-FR')} tokens`} subs={[price ?? '—']}
                      on={p.selectedToken === t.id} onClick={() => p.onSelectToken(t.id)} disabled={!price} />
                  })}
                </div>
              )}
              <p style={{ margin: 'var(--space-4) 0 0', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                Les tokens achetés s’ajoutent à ton solde.
              </p>
            </>
          )}

          {/* Mentions Apple */}
          <p style={{ margin: 'var(--space-6) 0 var(--space-2)', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.55 }}>
            Le paiement est débité sur ton compte Apple à la confirmation. Les abonnements se renouvellent automatiquement,
            sauf annulation au moins 24 h avant la fin de la période en cours. Gère ou résilie à tout moment dans les réglages
            de ton compte Apple.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button type="button" style={linkBtn} disabled={p.busy !== null} onClick={p.onRestore}>{p.busy === 'restore' ? 'Restauration…' : 'Restaurer les achats'}</button>
            <button type="button" style={linkBtn} onClick={p.onManage}>Gérer l’abonnement</button>
            <button type="button" style={linkBtn} onClick={p.onTerms}>Conditions d’utilisation</button>
            <button type="button" style={linkBtn} onClick={p.onPrivacy}>Confidentialité</button>
          </div>
        </div>

        {/* Bouton d'achat fixe */}
        {m ? (
          <div style={{ padding: 'var(--space-3) var(--space-4)', paddingBottom: 'calc(var(--space-3) + env(safe-area-inset-bottom))', background: 'var(--surface-page)' }}>
            <SheetPill disabled={!canBuy} onClick={() => { if (productId) p.onBuy(productId, kind) }}>
              {cta}{selectedPrice && p.tab !== 'tokens' ? ` · ${selectedPrice} ${perLabel}` : selectedPrice ? ` · ${selectedPrice}` : ''}
            </SheetPill>
          </div>
        ) : (
        <div style={{ padding: 'var(--space-3) var(--space-5)', paddingBottom: 'calc(var(--space-4) + env(safe-area-inset-bottom))', background: 'var(--bg)' }}>
          <Button type="button" size="lg" className="w-full" disabled={!canBuy} onClick={() => productId && p.onBuy(productId, kind)}>
            {cta}{selectedPrice && p.tab !== 'tokens' ? ` · ${selectedPrice} ${perLabel}` : selectedPrice ? ` · ${selectedPrice}` : ''}
          </Button>
        </div>
        )}
      </div>
    </div>
  )
}
