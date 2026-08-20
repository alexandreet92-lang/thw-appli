'use client'

// ══════════════════════════════════════════════════════════════
// CoachSubscribeEmailModal — souscrire un pack coach.
// Sécurité : on n'ouvre pas la page de paiement directement, on envoie le
// lien Stripe par email après confirmation de l'adresse enregistrée.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { getCurrentUser } from "@/lib/auth/currentUser"
import { Mail, Check } from 'lucide-react'

interface Props {
  packKey: string
  packName: string
  packLabel: string
  price: number
  billingPeriod: 'monthly' | 'yearly'
  onClose: () => void
}

export default function CoachSubscribeEmailModal({ packKey, packName, packLabel, price, billingPeriod, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const per = billingPeriod === 'yearly' ? 'an' : 'mois'

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
        body: JSON.stringify({ email, coachPack: packKey, billingPeriod }),
      })
      const json = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Une erreur est survenue.')
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
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
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: '0 0 8px' }}>Lien envoyé</h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.6, margin: '0 0 22px' }}>
              Ouvre le mail envoyé à <strong style={{ color: 'var(--text)' }}>{email}</strong> et clique sur le lien pour activer le pack <strong style={{ color: 'var(--text)' }}>{packName}</strong>. Valable 24 h.
            </p>
            <button onClick={onClose} style={{ width: '100%', padding: 13, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--bg-card2)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Fermer
            </button>
          </div>
        ) : (
          <>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <Mail size={21} color="var(--text-mid)" strokeWidth={1.9} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, color: 'var(--text)', textAlign: 'center', margin: '0 0 6px' }}>Pack {packName}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', margin: '0 0 14px' }}>{packLabel}</p>
            <div style={{ textAlign: 'center', margin: '0 0 18px' }}>
              <span className="tnum" style={{ fontSize: 30, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{price}</span>
              <span style={{ fontSize: 14, color: 'var(--text-dim)' }}> € / {per}</span>
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--text-mid)', textAlign: 'center', lineHeight: 1.6, margin: '0 0 20px' }}>
              On t&apos;envoie le lien de paiement sécurisé par email. Confirme ton adresse enregistrée.
            </p>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void submit() }}
              placeholder="ton@email.com"
              style={{ width: '100%', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '13px 15px', fontSize: 14, color: 'var(--text)', outline: 'none', marginBottom: 12, fontFamily: 'var(--font-body)', boxSizing: 'border-box', textAlign: 'center' }}
            />
            {error && <p style={{ fontSize: 12, color: 'var(--danger, #ef4444)', margin: '0 0 12px', textAlign: 'center' }}>{error}</p>}
            <button
              onClick={() => void submit()}
              disabled={loading || !email}
              style={{ width: '100%', padding: 14, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 14.5, fontWeight: 700, cursor: loading || !email ? 'not-allowed' : 'pointer', opacity: loading || !email ? 0.55 : 1 }}
            >
              {loading ? 'Envoi…' : 'Recevoir le lien'}
            </button>
            <p style={{ fontSize: 11.5, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.5, margin: '14px 0 0' }}>
              Envoyé uniquement à ton adresse enregistrée · valable 24 h
            </p>
          </>
        )}
      </div>
    </div>
  )
}
