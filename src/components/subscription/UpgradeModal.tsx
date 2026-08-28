'use client'
// ══════════════════════════════════════════════════════════════════
// Upsell — modale « Passe à une offre », déclenchable de n'importe où via
// openUpgrade(reason). Un seul hôte monté dans le shell écoute l'événement.
// Sert : mur de quota atteint (429), fonctionnalité verrouillée (Gratuit).
// Neutre + un accent primary ; renvoie vers /settings/subscription.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'

const EVT = 'thw:upgrade'

/** Ouvre la modale d'upsell. `reason` = message contextuel (ex. la limite atteinte). */
export function openUpgrade(reason?: string): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EVT, { detail: { reason } }))
}

export function UpgradeModalHost() {
  const router = useRouter()
  const { t } = useI18n()
  const [reason, setReason] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const on = (e: Event) => {
      setReason((e as CustomEvent<{ reason?: string }>).detail?.reason ?? null)
      setOpen(true)
    }
    window.addEventListener(EVT, on)
    return () => window.removeEventListener(EVT, on)
  }, [])

  if (!open) return null

  const perks = [
    t('w3c.upgrade_perk_1'),
    t('w3c.upgrade_perk_2'),
    t('w3c.upgrade_perk_3'),
    t('w3c.upgrade_perk_4'),
  ]

  return (
    <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 12000, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(440px, 100%)', background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', padding: 24, boxShadow: '0 24px 70px rgba(0,0,0,0.35)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{t('w3c.upgrade_title')}</h2>
          <button onClick={() => setOpen(false)} aria-label={t('w3c.close')} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', padding: 2 }}>
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
        <button onClick={() => { setOpen(false); router.push('/settings/subscription') }}
          style={{ width: '100%', height: 46, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>
          {t('w3c.upgrade_see_offers')}
        </button>
        <button onClick={() => setOpen(false)} style={{ width: '100%', marginTop: 8, height: 38, border: 'none', background: 'transparent', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer' }}>
          {t('w3c.later')}
        </button>
      </div>
    </div>
  )
}
