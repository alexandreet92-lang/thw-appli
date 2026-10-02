'use client'
// ══════════════════════════════════════════════════════════════════
// Upsell — modale « Passe à une offre », déclenchable de n'importe où via
// openUpgrade(reason). Un seul hôte monté dans le shell écoute l'événement.
// Sert : mur de quota atteint (429), fonctionnalité verrouillée (Gratuit).
// Neutre + un accent primary ; « Voir les offres » ouvre l'achat direct
// (boutique Apple dans l'app iOS, choix de formule + Stripe sur le web).
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { hidePricing } from '@/lib/native/platform'
import { openSubscriptionChange } from '@/lib/subscriptions/startSubscriptionChange'
import { MobileSheet, SheetCard, SheetPill, useMobileSafe } from '@/components/ui/BottomSheet'

const EVT = 'thw:upgrade'

/** Ouvre la modale d'upsell. `reason` = message contextuel (ex. la limite atteinte). */
export function openUpgrade(reason?: string): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EVT, { detail: { reason } }))
}

export function UpgradeModalHost() {
  const { t } = useI18n()
  const [reason, setReason] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)
  const hidePrice = hidePricing()
  const mobile = useMobileSafe()

  useEffect(() => {
    const on = (e: Event) => {
      setReason((e as CustomEvent<{ reason?: string }>).detail?.reason ?? null)
      setOpen(true)
    }
    window.addEventListener(EVT, on)
    return () => window.removeEventListener(EVT, on)
  }, [])

  useEffect(() => {
    if (open) { setClosing(false); const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r) }
    setShown(false)
  }, [open])

  const requestClose = () => { setClosing(true); setShown(false); setTimeout(() => setOpen(false), 280) }

  // Mobile (≤ 767 px) : feuille du bas — titre, raison, avantages en carte
  // blanche à filets, bouton pilule cyan + action secondaire en texte.
  if (mobile) {
    const mPerks = [t('w3c.upgrade_perk_1'), t('w3c.upgrade_perk_2'), t('w3c.upgrade_perk_3'), t('w3c.upgrade_perk_4')]
    return (
      <MobileSheet open={open} onClose={() => setOpen(false)} label={t('w3c.upgrade_title')} zIndex={14500}
        footer={<>
          <SheetPill onClick={() => { setOpen(false); openSubscriptionChange('athlete') }}>{t('w3c.upgrade_see_offers')}</SheetPill>
          <SheetPill variant="ghost" onClick={() => setOpen(false)}>{hidePrice ? t('w3c.close') : t('w3c.later')}</SheetPill>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', fontFamily: 'var(--font-body)' }}>
          <div style={{ textAlign: 'center', padding: '0 var(--space-2)' }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text)', lineHeight: 1.2, textWrap: 'balance' as const }}>{t('w3c.upgrade_title')}</h2>
            <p style={{ margin: '8px 0 0', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.5 }}>{reason ?? t('w3c.upgrade_default_reason')}</p>
          </div>
          <SheetCard>
            {mPerks.map((p, i) => (
              <div key={p} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, minHeight: 52, padding: '12px 16px' }}>
                {i > 0 && <span aria-hidden style={{ position: 'absolute', top: 0, left: 16, right: 16, height: 1, background: 'var(--border)' }} />}
                <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 6 9 17l-5-5" /></svg>
                <span style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.4 }}>{p}</span>
              </div>
            ))}
          </SheetCard>
        </div>
      </MobileSheet>
    )
  }

  if (!open) return null

  const perks = [
    t('w3c.upgrade_perk_1'),
    t('w3c.upgrade_perk_2'),
    t('w3c.upgrade_perk_3'),
    t('w3c.upgrade_perk_4'),
  ]

  return (
    <div onClick={requestClose} style={{ position: 'fixed', inset: 0, zIndex: 12000, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, opacity: shown && !closing ? 1 : 0, transition: 'opacity 0.28s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(440px, 100%)', background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', padding: 24, boxShadow: '0 24px 70px rgba(0,0,0,0.35)', transform: shown && !closing ? 'translateY(0)' : 'translateY(100%)', opacity: shown && !closing ? 1 : 0, transition: 'transform 0.28s cubic-bezier(0.32,0.72,0,1), opacity 0.28s ease' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{t('w3c.upgrade_title')}</h2>
          <button onClick={requestClose} aria-label={t('w3c.close')} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', padding: 2 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--text-mid)', margin: '8px 0 16px', lineHeight: 1.5 }}>
          {reason ?? t('w3c.upgrade_default_reason')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {perks.map(p => (
            <div key={p} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', marginTop: 6, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--text)', lineHeight: 1.45 }}>{p}</span>
            </div>
          ))}
        </div>
        {hidePrice ? (
          <>
            <button onClick={() => { setOpen(false); openSubscriptionChange('athlete') }}
              style={{ width: '100%', marginTop: 14, height: 46, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>
              {t('w3c.upgrade_see_offers')}
            </button>
            <button onClick={requestClose} style={{ width: '100%', marginTop: 10, height: 42, borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
              {t('w3c.close')}
            </button>
          </>
        ) : (
          <>
            <button onClick={() => { setOpen(false); openSubscriptionChange('athlete') }}
              style={{ width: '100%', height: 46, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>
              {t('w3c.upgrade_see_offers')}
            </button>
            <button onClick={requestClose} style={{ width: '100%', marginTop: 8, height: 38, border: 'none', background: 'transparent', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer' }}>
              {t('w3c.later')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
