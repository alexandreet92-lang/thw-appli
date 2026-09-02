'use client'

// ══════════════════════════════════════════════════════════════
// CoachSubscribeEmailModal — souscrire un pack coach.
// Sécurité : on n'ouvre pas la page de paiement directement, on envoie le
// lien Stripe par email après confirmation de l'adresse enregistrée.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { getCurrentUser } from "@/lib/auth/currentUser"
import { Mail, Check } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { hidePricing, openWebsite } from '@/lib/native/platform'

interface Props {
  packKey: string
  packName: string
  packLabel: string
  price: number
  billingPeriod: 'monthly' | 'yearly'
  tier?: 'premium' | 'pro' | 'expert'
  onClose: () => void
}

export default function CoachSubscribeEmailModal({ packKey, packName, packLabel, price, billingPeriod, tier, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useI18n()
  const per = billingPeriod === 'yearly' ? t('w3c.per_year') : t('w3c.per_month')
  const hidePrice = hidePricing()

  useEffect(() => {
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const user = await getCurrentUser()
        if (user?.email) setEmail(user.email)
      } catch { /* silencieux */ }
    })()
  }, [])

  const submit = async () => {
    if (!email || loading) return
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/coach/subscription/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, coachPack: packKey, billingPeriod, tier }),
      })
      const json = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !json.success) throw new Error(json.error ?? t('w3c.error_generic'))
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('w3c.error_generic'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 13000, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'var(--font-body)' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 400, maxWidth: '100%', background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', padding: 28, boxShadow: '0 30px 80px rgba(0,0,0,0.35)' }}>
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <Check size={24} color="var(--primary)" strokeWidth={2.2} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: '0 0 8px' }}>{t('w3c.link_sent')}</h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.6, margin: '0 0 22px' }}>
              {t('w3c.subemail_sent_pre')}<strong style={{ color: 'var(--text)' }}>{email}</strong>{t('w3c.coachsub_sent_mid')}<strong style={{ color: 'var(--text)' }}>{packName}</strong>{t('w3c.coachsub_sent_post')}
            </p>
            <button onClick={onClose} style={{ width: '100%', padding: 13, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--bg-card2)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              {t('w3c.close')}
            </button>
          </div>
        ) : (
          <>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <Mail size={21} color="var(--text-mid)" strokeWidth={1.9} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, color: 'var(--text)', textAlign: 'center', margin: '0 0 6px' }}>{t('w3c.coachsub_pack', { name: packName })}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', margin: '0 0 14px' }}>{packLabel}</p>
            {hidePrice ? (
              <>
                <button
                  onClick={() => { onClose(); void openWebsite('/coach/subscription') }}
                  style={{ width: '100%', padding: 14, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', marginTop: 6 }}
                >
                  {t('native.manageSubOnWeb')} ↗
                </button>
                <button
                  onClick={onClose}
                  style={{ width: '100%', padding: 12, borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', marginTop: 10 }}
                >
                  {t('w3c.close')}
                </button>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', margin: '0 0 18px' }}>
                  <span className="tnum" style={{ fontSize: 30, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{price}</span>
                  <span style={{ fontSize: 14, color: 'var(--text-dim)' }}> € / {per}</span>
                </div>
                <p style={{ fontSize: 13.5, color: 'var(--text-mid)', textAlign: 'center', lineHeight: 1.6, margin: '0 0 20px' }}>
                  {t('w3c.coachsub_confirm')}
                </p>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void submit() }}
                  placeholder={t('w3c.email_placeholder')}
                  style={{ width: '100%', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '13px 15px', fontSize: 14, color: 'var(--text)', outline: 'none', marginBottom: 12, fontFamily: 'var(--font-body)', boxSizing: 'border-box', textAlign: 'center' }}
                />
                {error && <p style={{ fontSize: 12, color: 'var(--danger, #ef4444)', margin: '0 0 12px', textAlign: 'center' }}>{error}</p>}
                <button
                  onClick={() => void submit()}
                  disabled={loading || !email}
                  style={{ width: '100%', padding: 14, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 14.5, fontWeight: 700, cursor: loading || !email ? 'not-allowed' : 'pointer', opacity: loading || !email ? 0.55 : 1 }}
                >
                  {loading ? t('w3c.sending') : t('w3c.receive_link')}
                </button>
                <p style={{ fontSize: 11.5, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.5, margin: '14px 0 0' }}>
                  {t('w3c.sent_only_note')}
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
