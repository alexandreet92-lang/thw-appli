'use client'
// ══════════════════════════════════════════════════════════════════
// Changer / gérer l'abonnement — fenêtre unique, sans lien par email.
// Monté une fois dans le shell ; ouvert par openSubscriptionChange() /
// openSubscriptionManage() (src/lib/subscriptions/startSubscriptionChange).
//
//  • Web : choix de formule athlète (mensuel / annuel) → Stripe Checkout
//    direct, ou bascule de formule sur l'abonnement Stripe existant.
//  • Gérer : détecte la source (App Store / Stripe) puis ouvre les réglages
//    Apple ou le portail Stripe ; n'affiche la fenêtre que si un choix ou
//    une explication est utile. Dans l'app iOS : jamais de prix ni de
//    paiement web (règle App Store 3.1.1).
// Mobile : feuille du bas avec poignée, cartes blanches groupées sur fond
// gris chaud ; desktop : fenêtre centrée.
// ══════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/shadcn/sheet'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/shadcn/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn/tabs'
import { Button } from '@/components/shadcn/button'
import { MGroup, MLine, MRowText, MNavRow, PAGE_BG } from '@/components/profile/mobile/SettingsKit'
import { useIsMobile } from '@/components/ai/mobile/MobileKit'
import { formatPrice } from '@/components/topup/TokenPackOption'
import { useI18n, currentLocale } from '@/lib/i18n'
import { isNativeApp } from '@/lib/native/platform'
import { openIapStore } from '@/lib/iap/store-events'
import { refreshEntitlements } from '@/hooks/useEntitlements'
import type { BillingSources } from '@/lib/subscriptions/billing-source'
import type { BillingPeriod } from '@/lib/subscriptions/coach-packs'
import { ATHLETE_PLANS, DEFAULT_ATHLETE_PLAN, isAthletePlanTier, type AthletePlanTier } from '@/lib/subscriptions/athlete-plans'
import {
  SUBSCRIPTION_SHEET_EVENT, CheckoutError, PortalError,
  fetchBillingSource, openStripePortal, openAppleSubscriptions, startAthleteCheckout,
  type SubscriptionSheetDetail, type SubscriptionPlanKind,
} from '@/lib/subscriptions/startSubscriptionChange'

type View = 'plans' | 'loading' | 'choose-source' | 'apple-info' | 'no-sub' | 'updated'

const num: CSSProperties = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'zero' 0" }
const textP: CSSProperties = { margin: 0, fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.5 }
const noteP: CSSProperties = { margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }

interface SummaryLite { tier?: string; billing?: BillingSources }

async function fetchSummary(): Promise<SummaryLite | null> {
  try {
    const r = await fetch('/api/subscriptions/summary', { cache: 'no-store' })
    if (!r.ok) return null
    return await r.json() as SummaryLite
  } catch { return null }
}

export function SubscriptionChangeHost() {
  const { t } = useI18n()
  const router = useRouter()
  const mobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('loading')
  const [period, setPeriod] = useState<BillingPeriod>('monthly')
  const [selected, setSelected] = useState<AthletePlanTier>(DEFAULT_ATHLETE_PLAN)
  const [currentTier, setCurrentTier] = useState<AthletePlanTier | null>(null)
  const [hasWebBilling, setHasWebBilling] = useState(false)
  const [plansLoading, setPlansLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const close = useCallback(() => { if (!busy) setOpen(false) }, [busy])

  // ── Formules (web) ────────────────────────────────────────────
  const openPlans = useCallback((wanted?: AthletePlanTier) => {
    setView('plans'); setError(null); setBusy(false); setOpen(true); setPlansLoading(true)
    setCurrentTier(null); setHasWebBilling(false)
    if (wanted) setSelected(wanted)
    void fetchSummary().then(s => {
      if (s?.billing?.athlete === 'app_store') { setView('apple-info'); return }
      const tier = isAthletePlanTier(s?.tier) ? s.tier : null
      setCurrentTier(tier)
      setHasWebBilling(s?.billing?.athlete === 'stripe')
      if (tier && (!wanted || wanted === tier)) setSelected(ATHLETE_PLANS.find(p => p.tier !== tier && p.tier === DEFAULT_ATHLETE_PLAN)?.tier
        ?? ATHLETE_PLANS.find(p => p.tier !== tier)?.tier ?? DEFAULT_ATHLETE_PLAN)
    }).finally(() => setPlansLoading(false))
  }, [])

  // ── Gérer / résilier ──────────────────────────────────────────
  const goPortal = useCallback(async (): Promise<boolean> => {
    try {
      await openStripePortal()
      return true
    } catch (e) {
      if (e instanceof PortalError && e.noSubscription) { setView('no-sub'); setOpen(true); return false }
      setError(e instanceof Error && e.message ? e.message : t('w3c.portal_unavailable'))
      return false
    }
  }, [t])

  const manage = useCallback(async (plan: SubscriptionPlanKind) => {
    const native = isNativeApp()
    setError(null); setBusy(true); setView('loading'); setOpen(true)
    const source = await fetchBillingSource(plan)
    setBusy(false)
    if (source === 'app_store') {
      if (native) { setOpen(false); await openAppleSubscriptions() } else setView('apple-info')
      return
    }
    if (source === 'stripe') {
      setBusy(true)
      const ok = await goPortal()
      setBusy(false)
      if (ok && native) setOpen(false)
      else if (!ok) setView(v => (v === 'loading' ? 'choose-source' : v))
      return
    }
    if (source === 'none') {
      // Aucun abonnement payant : natif → réglages Apple (seul canal d'achat) ;
      // web → invitation à choisir une formule.
      if (native) { setOpen(false); await openAppleSubscriptions() } else setView('no-sub')
      return
    }
    // Source inconnue (résumé injoignable) → on laisse choisir.
    setView('choose-source')
  }, [goPortal])

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<SubscriptionSheetDetail>).detail
      if (!d) return
      if (d.view === 'coach-plans') { router.push('/coach/subscription'); return }
      if (d.view === 'plans') {
        if (isNativeApp()) { openIapStore('athlete'); return }
        openPlans(d.tier); return
      }
      void manage(d.plan)
    }
    window.addEventListener(SUBSCRIPTION_SHEET_EVENT, on)
    return () => window.removeEventListener(SUBSCRIPTION_SHEET_EVENT, on)
  }, [manage, openPlans, router])

  const locale = currentLocale()
  const priceOf = (tier: AthletePlanTier) => {
    const p = ATHLETE_PLANS.find(x => x.tier === tier) ?? ATHLETE_PLANS[0]
    return formatPrice((period === 'yearly' ? p.yearlyEur : p.monthlyEur) * 100, 'eur', locale)
  }
  const per = period === 'yearly' ? t('w3c.per_year') : t('w3c.per_month')
  const plan = ATHLETE_PLANS.find(p => p.tier === selected) ?? ATHLETE_PLANS[0]

  const buy = async () => {
    if (busy || selected === currentTier) return
    setBusy(true); setError(null)
    try {
      const r = await startAthleteCheckout(selected, period)
      if (r === 'updated') { refreshEntitlements(); setView('updated'); setBusy(false) }
      if (r === 'store') { setBusy(false); setOpen(false) }
      // 'redirect' : redirection Stripe en cours → on garde l'état « busy ».
    } catch (e) {
      if (e instanceof CheckoutError && e.code === 'app_store_managed') setView('apple-info')
      else if (e instanceof CheckoutError && e.code === 'same_plan') setError(t('sub.samePlan'))
      else setError(e instanceof Error && e.message ? e.message : t('w3c.checkout_error'))
      setBusy(false)
    }
  }

  // ── Contenu ───────────────────────────────────────────────────
  let title = t('misc.manageSubscription')
  let description = ''
  let body: ReactNode = null

  if (view === 'loading') {
    body = (
      <MGroup>
        {[0, 1].map(i => <MLine key={i} first={i === 0}><div aria-hidden style={{ height: 24, flex: 1, borderRadius: 'var(--r-sm)', background: 'var(--surface-chip)', opacity: 0.6 }} /></MLine>)}
      </MGroup>
    )
  } else if (view === 'plans') {
    title = t('w3c.pp_title')
    description = t('w3c.pp_subtitle')
    const selectedPrice = priceOf(selected)
    body = (
      <>
        <Tabs value={period} onValueChange={v => setPeriod(v === 'yearly' ? 'yearly' : 'monthly')}>
          <TabsList>
            <TabsTrigger value="monthly" disabled={busy}>{t('w3c.monthly')}</TabsTrigger>
            <TabsTrigger value="yearly" disabled={busy}>{t('w3c.annual_discount')}</TabsTrigger>
          </TabsList>
        </Tabs>
        <MGroup>
          {ATHLETE_PLANS.map((p, i) => {
            const on = selected === p.tier
            const isCurrent = currentTier === p.tier
            return (
              <MLine key={p.tier} first={i === 0} onClick={() => setSelected(p.tier)} disabled={busy || plansLoading || isCurrent}>
                <MRowText title={p.name} sub={isCurrent ? t('misc.currentPlan') : t(p.subtitleKey)} />
                <span style={{ ...num, flexShrink: 0, textAlign: 'right', fontFamily: 'var(--font-body)' }}>
                  <span style={{ display: 'block', fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>{priceOf(p.tier)}</span>
                  <span style={{ display: 'block', fontSize: 13, color: 'var(--text-dim)' }}>/ {per}</span>
                </span>
                <span aria-hidden style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: on ? 'var(--primary)' : 'transparent', boxShadow: on ? 'none' : 'inset 0 0 0 2px var(--text-dim)',
                }}>
                  {on && <Check size={15} strokeWidth={3} color="var(--on-primary)" />}
                </span>
              </MLine>
            )
          })}
        </MGroup>
        {error && <p style={{ ...textP, fontSize: 13, color: 'var(--danger)' }}>{error}</p>}
        <Button type="button" className="w-full" disabled={busy || plansLoading || selected === currentTier} onClick={() => void buy()}>
          {busy ? t('misc.redirecting') : `${t('misc.choosePlan', { name: plan.name })} · ${selectedPrice}`}
        </Button>
        {hasWebBilling && (
          <Button type="button" variant="link" className="self-center" disabled={busy}
            onClick={() => { setBusy(true); void goPortal().then(ok => { if (!ok) setBusy(false) }) }}>
            {t('misc.manageSubscription')}
          </Button>
        )}
      </>
    )
  } else if (view === 'choose-source') {
    description = t('sub.chooseSource')
    body = (
      <>
        <MGroup>
          <MNavRow first label={t('sub.sourceAppStore')} sub={t('sub.sourceAppStoreSub')}
            onClick={() => { setOpen(false); void openAppleSubscriptions() }} disabled={busy} />
          <MNavRow label={t('sub.sourceWeb')} sub={t('sub.sourceWebSub')} disabled={busy}
            onClick={() => {
              setBusy(true); setError(null)
              void goPortal().then(ok => { setBusy(false); if (ok && isNativeApp()) setOpen(false) })
            }} />
        </MGroup>
        {error && <p style={{ ...textP, fontSize: 13, color: 'var(--danger)' }}>{error}</p>}
      </>
    )
  } else if (view === 'apple-info') {
    body = (
      <>
        <p style={textP}>{t('sub.appStoreManaged')}</p>
        <Button type="button" className="w-full" onClick={() => { setOpen(false); void openAppleSubscriptions() }}>
          {t('sub.openAppleSettings')}
        </Button>
      </>
    )
  } else if (view === 'no-sub') {
    body = (
      <>
        <p style={textP}>{t('sub.noActiveSubscription')}</p>
        {error && <p style={{ ...textP, fontSize: 13, color: 'var(--danger)' }}>{error}</p>}
        <Button type="button" className="w-full" onClick={() => { if (isNativeApp()) { setOpen(false); openIapStore('athlete') } else openPlans() }}>
          {t('w3c.upgrade_see_offers')}
        </Button>
      </>
    )
  } else if (view === 'updated') {
    title = t('sub.planUpdated')
    body = (
      <>
        <p style={textP}>{t('sub.planUpdatedDesc', { name: plan.name })}</p>
        <Button type="button" className="w-full" onClick={() => setOpen(false)}>{t('w3c.close')}</Button>
      </>
    )
  }

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', fontFamily: 'var(--font-body)' }}>
      {view === 'plans' && <p style={noteP}>{t('w3c.pp_subtitle')}</p>}
      {body}
    </div>
  )
  const headStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }

  if (mobile) {
    return (
      <Sheet open={open} onOpenChange={v => { if (!v) close() }}>
        <SheetContent side="bottom" style={{ background: PAGE_BG, paddingBottom: 'calc(var(--space-5) + env(safe-area-inset-bottom))' }}>
          <div style={headStyle}>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription className={description && view !== 'plans' ? undefined : 'sr-only'}>{description || title}</SheetDescription>
          </div>
          {content}
        </SheetContent>
      </Sheet>
    )
  }
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) close() }}>
      <DialogContent style={{ background: PAGE_BG }}>
        <div style={{ ...headStyle, paddingRight: 'var(--space-8)' }}>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className={description && view !== 'plans' ? undefined : 'sr-only'}>{description || title}</DialogDescription>
        </div>
        {content}
      </DialogContent>
    </Dialog>
  )
}
