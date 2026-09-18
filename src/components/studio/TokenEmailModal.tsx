'use client'

// ══════════════════════════════════════════════════════════════
// TokenEmailModal — acheter des packs de tokens.
// Sécurité (comme la gestion d'abonnement) : on n'ouvre pas la page de
// paiement directement, on envoie un lien sécurisé par email après
// confirmation de l'adresse. Le lien mène à la page de recharge à jour du site,
// avec l'uid → crédit instantané au retour de paiement.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { Mail, Check } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

export default function TokenEmailModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try { const user = await getCurrentUser(); if (user?.email) setEmail(user.email) } catch { /* silencieux */ }
    })()
  }, [])

  const submit = async () => {
    if (!email || loading) return
    setLoading(true); setError(null)
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15000)
    try {
      const res = await fetch('/api/tokens/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        signal: ctrl.signal,
      })
      const json = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !json.success) throw new Error(json.error ?? t('w3c.error_generic'))
      setSent(true)
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t('w3c.error_generic'))
    } finally {
      clearTimeout(timer)
      setLoading(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 13900, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 400, maxWidth: '100%', background: 'var(--bg-card)', borderRadius: 22, padding: 28, boxShadow: '0 30px 80px rgba(0,0,0,0.35)', border: '1px solid var(--border)' }}>
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'color-mix(in srgb, #22c55e 14%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <Check size={24} color="#22C55E" strokeWidth={2.2} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>{t('w3c.link_sent')}</h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.6, margin: '0 0 22px' }}>
              Ton lien d&apos;achat a été envoyé à <strong style={{ color: 'var(--text)' }}>{email}</strong>. Clique dessus pour choisir ton pack et payer en sécurité.
            </p>
            <button onClick={onClose} style={{ width: '100%', padding: 13, borderRadius: 14, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              {t('w3c.close')}
            </button>
          </div>
        ) : (
          <>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <Mail size={21} color="var(--text-mid)" strokeWidth={1.9} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 19, fontWeight: 700, color: 'var(--text)', textAlign: 'center', margin: '0 0 8px' }}>Acheter des packs de tokens</h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-mid)', textAlign: 'center', lineHeight: 1.6, margin: '0 0 22px' }}>
              On t&apos;envoie un lien sécurisé par email pour choisir ton pack et payer. Tes tokens sont crédités automatiquement.
            </p>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void submit() }}
              placeholder={t('w3c.email_placeholder')}
              style={{ width: '100%', background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 14, padding: '13px 15px', fontSize: 14, color: 'var(--text)', outline: 'none', marginBottom: 12, fontFamily: 'var(--font-body)', boxSizing: 'border-box', textAlign: 'center' }}
            />
            {error && <p style={{ fontSize: 12, color: '#EF4444', margin: '0 0 12px', textAlign: 'center' }}>{error}</p>}
            <button
              onClick={() => void submit()}
              disabled={loading || !email}
              style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: 'var(--studio-accent)', color: '#fff', fontSize: 14.5, fontWeight: 600, cursor: loading || !email ? 'not-allowed' : 'pointer', opacity: loading || !email ? 0.55 : 1 }}
            >
              {loading ? t('w3c.sending') : t('w3c.receive_link')}
            </button>
            <p style={{ fontSize: 11.5, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.5, margin: '14px 0 0' }}>
              {t('w3c.sent_only_note')}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
