'use client'
// ══════════════════════════════════════════════════════════════════
// Surpage de FIN D'ESSAI (athlète). À la 1re arrivée après les 14 jours,
// on explique : l'essai premium est terminé, l'app reste utilisable en
// gratuit (fonctions limitées), et pour garder le premium il faut s'abonner.
// Le bouton ouvre l'abonnement DIRECT (boutique Apple dans l'app iOS, choix
// de formule + Stripe sur le web) — plus aucun lien par email.
// Affichée une seule fois (flag localStorage) ; ensuite le bandeau prend le relais.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEntitlements } from '@/hooks/useEntitlements'
import { useI18n } from '@/lib/i18n'
import { isNativeApp } from '@/lib/native/platform'
import { openSubscriptionChange } from '@/lib/subscriptions/startSubscriptionChange'
import { MobileSheet, SheetPill, useMobileSafe } from '@/components/ui/BottomSheet'

const SEEN_KEY = 'thw_trial_ended_seen'

export function TrialEndedModal() {
  const router = useRouter()
  const { t } = useI18n()
  const { loading, isFree } = useEntitlements()
  const [show, setShow] = useState(false)
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)
  const [mOpen, setMOpen] = useState(true)
  const mobile = useMobileSafe()

  useEffect(() => {
    if (!show) return
    const r = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(r)
  }, [show])

  useEffect(() => {
    if (loading || !isFree) return
    let seen = false
    try { seen = localStorage.getItem(SEEN_KEY) === '1' } catch { /* ignore */ }
    if (seen) return
    setShow(true)
  }, [loading, isFree])

  if (!show) return null

  const dismiss = () => {
    try { localStorage.setItem(SEEN_KEY, '1') } catch { /* ignore */ }
    setClosing(true); setShown(false)
    setTimeout(() => setShow(false), 280)
  }

  const subscribe = () => { dismiss(); openSubscriptionChange('athlete') }

  // Mobile (≤ 767 px) : feuille du bas sans fermeture implicite (un choix est
  // demandé) — pastille horloge, titre gras, pilule cyan + pilule blanche.
  if (mobile) {
    const mDismiss = () => { setMOpen(false); dismiss() }
    return (
      <MobileSheet open={mOpen && !closing} onClose={mDismiss} locked hideClose zIndex={14500} label={t('w3c.trial_ended_title')}
        footer={<>
          <SheetPill onClick={() => { setMOpen(false); subscribe() }}>{t('profile.chooseSubscription')}</SheetPill>
          <SheetPill variant="white" onClick={() => { setMOpen(false); dismiss(); router.push('/settings/subscription') }}>{t('w3c.trial_see_plans')}</SheetPill>
          <SheetPill variant="ghost" onClick={mDismiss}>{t('w3c.trial_continue_free')}</SheetPill>
        </>}>
        <div style={{ textAlign: 'center', padding: 'var(--space-3) var(--space-2) 0', fontFamily: 'var(--font-body)' }}>
          <span aria-hidden style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px', background: 'var(--surface-card)', boxShadow: 'var(--shadow-capsule)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          </span>
          <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text)', margin: 0, lineHeight: 1.2, textWrap: 'balance' as const }}>{t('w3c.trial_ended_title')}</h2>
          <p style={{ fontSize: 15, color: 'var(--text-mid)', margin: '10px 0 0', lineHeight: 1.55 }}>
            {t('w3c.trial_ended_p1')}<strong style={{ color: 'var(--text)' }}>{t('w3c.trial_ended_free')}</strong>{t('w3c.trial_ended_p2')}<strong style={{ color: 'var(--text)' }}>{t('w3c.trial_ended_plans')}</strong>.
          </p>
          {!isNativeApp() && <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '12px 0 0' }}>{t('w3c.pp_subtitle')}</p>}
        </div>
      </MobileSheet>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 13000, background: 'rgba(8,12,18,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, opacity: shown && !closing ? 1 : 0, transition: 'opacity 0.28s ease' }}>
      <div style={{ width: 'min(460px, 100%)', background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', padding: 'clamp(26px, 5vw, 38px)', boxShadow: '0 30px 80px rgba(0,0,0,0.45)', textAlign: 'center', transform: shown && !closing ? 'translateY(0)' : 'translateY(100%)', opacity: shown && !closing ? 1 : 0, transition: 'transform 0.28s cubic-bezier(0.32,0.72,0,1), opacity 0.28s ease' }}>
        <div style={{ width: 60, height: 60, borderRadius: 'var(--r-lg)', margin: '0 auto 18px', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 26px rgba(6,182,212,0.3)' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(21px, 5vw, 25px)', fontWeight: 600, color: 'var(--text)', margin: 0, lineHeight: 1.2, textWrap: 'balance' as const }}>{t('w3c.trial_ended_title')}</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14.5, color: 'var(--text-mid)', margin: '12px 0 0', lineHeight: 1.6 }}>
          {t('w3c.trial_ended_p1')}<strong style={{ color: 'var(--text)' }}>{t('w3c.trial_ended_free')}</strong>{t('w3c.trial_ended_p2')}<strong style={{ color: 'var(--text)' }}>{t('w3c.trial_ended_plans')}</strong>.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
          <button onClick={subscribe} style={primaryBtn}>{t('profile.chooseSubscription')}</button>
          <button onClick={() => { dismiss(); router.push('/settings/subscription') }} style={ghostBtn}>{t('w3c.trial_see_plans')}</button>
          <button onClick={dismiss} style={{ ...ghostBtn, background: 'transparent', color: 'var(--text-dim)' }}>{t('w3c.trial_continue_free')}</button>
        </div>
        {!isNativeApp() && <p style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--text-dim)', margin: '14px 0 0' }}>{t('w3c.pp_subtitle')}</p>}
      </div>
    </div>
  )
}

const primaryBtn: React.CSSProperties = { height: 48, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }
const ghostBtn: React.CSSProperties = { height: 44, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--bg-card2)', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%' }
