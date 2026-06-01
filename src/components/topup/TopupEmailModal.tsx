'use client'

// ══════════════════════════════════════════════════════════════
// TopupEmailModal — demande l'email puis envoie un lien d'achat
// sécurisé (Resend). Le paiement se fait hors-app (frais Apple).
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { Mail, Check } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function TopupEmailModal({ isOpen, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setSent(false); setError(null)
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const { data: { user } } = await createClient().auth.getUser()
        if (user?.email) setEmail(user.email)
      } catch { /* silencieux */ }
    })()
  }, [isOpen])

  if (!isOpen) return null

  const submit = async () => {
    if (!email || loading) return
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/topup/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Erreur')
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: 440, maxWidth: '100%', background: 'var(--bg-card)', borderRadius: 16, padding: 32, boxShadow: '0 24px 70px rgba(0,0,0,0.5)', border: '0.5px solid var(--border-mid)' }}
      >
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Check size={26} color="#22C55E" />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: '0 0 8px' }}>Lien envoyé à {email}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6, margin: '0 0 24px' }}>
              Vérifie ta boîte mail et clique sur le lien pour acheter tes tokens.
            </p>
            <button onClick={onClose} style={{ width: '100%', padding: 12, borderRadius: 10, border: '0.5px solid var(--border-mid)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              Fermer
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <Mail size={32} color="var(--primary)" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', textAlign: 'center', margin: '0 0 10px' }}>Recharger en tokens</h2>
            <p style={{ fontSize: 13, color: 'var(--text-mid)', textAlign: 'center', lineHeight: 1.6, margin: '0 0 20px' }}>
              Saisis ton email — tu recevras un lien sécurisé pour acheter ton pack via Stripe. Le paiement se fait en dehors de l&apos;app pour éviter les frais Apple.
            </p>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void submit() }}
              placeholder="ton@email.com"
              className="topup-email-input"
              style={{ width: '100%', background: 'var(--bg-alt)', border: '1px solid var(--border-mid)', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: 'var(--text)', outline: 'none', marginBottom: 14, fontFamily: 'DM Sans, sans-serif' }}
            />
            {error && <p style={{ fontSize: 12, color: '#EF4444', margin: '0 0 12px', textAlign: 'center' }}>{error}</p>}
            <button
              onClick={() => void submit()}
              disabled={loading || !email}
              style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: '#06B6D4', color: '#fff', fontSize: 14, fontWeight: 500, cursor: loading || !email ? 'not-allowed' : 'pointer', opacity: loading || !email ? 0.6 : 1 }}
            >
              {loading ? 'Envoi…' : 'Envoyer le lien'}
            </button>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.5, margin: '14px 0 0' }}>
              Le lien est valide 24h. Aucun paiement ne se fait depuis l&apos;app.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
