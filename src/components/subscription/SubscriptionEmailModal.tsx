'use client'

// ══════════════════════════════════════════════════════════════
// SubscriptionEmailModal — pour changer ou résilier son abonnement.
// Sécurité : on ne redirige PAS directement vers la page de paiement ;
// on envoie un lien sécurisé par email après confirmation de l'adresse.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { Mail, Check } from 'lucide-react'

interface Props {
  action: 'change' | 'cancel'
  onClose: () => void
}

const COPY = {
  change: {
    title: "Changer d'abonnement",
    desc: "Pour ta sécurité, on t'envoie un lien par email vers la page des formules. Confirme ton adresse ci-dessous.",
    cta: 'Recevoir le lien',
  },
  cancel: {
    title: "Résilier l'abonnement",
    desc: "Pour ta sécurité, on t'envoie un lien par email vers la page de résiliation. Confirme ton adresse ci-dessous.",
    cta: 'Recevoir le lien',
  },
} as const

export default function SubscriptionEmailModal({ action, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const c = COPY[action]

  useEffect(() => {
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const { data: { user } } = await createClient().auth.getUser()
        if (user?.email) setEmail(user.email)
      } catch { /* silencieux */ }
    })()
  }, [])

  const submit = async () => {
    if (!email || loading) return
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/subscription/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action }),
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
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 440, maxWidth: '100%', background: 'var(--bg-card)', borderRadius: 18, padding: 30, boxShadow: '0 24px 70px rgba(0,0,0,0.4)', border: '1px solid var(--border-mid)' }}>
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Check size={26} color="#22C55E" />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: '0 0 8px' }}>Lien envoyé à {email}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6, margin: '0 0 24px' }}>
              Ouvre ta boîte mail et clique sur le lien pour continuer. Il est valable 24 heures.
            </p>
            <button onClick={onClose} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid var(--border-mid)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              Fermer
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <Mail size={30} color="var(--primary)" />
            </div>
            <h2 style={{ fontSize: 19, fontWeight: 600, color: 'var(--text)', textAlign: 'center', margin: '0 0 10px' }}>{c.title}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-mid)', textAlign: 'center', lineHeight: 1.6, margin: '0 0 20px' }}>{c.desc}</p>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void submit() }}
              placeholder="ton@email.com"
              style={{ width: '100%', background: 'var(--bg-alt)', border: '1px solid var(--border-mid)', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: 'var(--text)', outline: 'none', marginBottom: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}
            />
            {error && <p style={{ fontSize: 12, color: '#EF4444', margin: '0 0 12px', textAlign: 'center' }}>{error}</p>}
            <button
              onClick={() => void submit()}
              disabled={loading || !email}
              style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', background: action === 'cancel' ? '#ef4444' : 'var(--primary)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading || !email ? 'not-allowed' : 'pointer', opacity: loading || !email ? 0.6 : 1 }}
            >
              {loading ? 'Envoi…' : c.cta}
            </button>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.5, margin: '14px 0 0' }}>
              🔒 Le lien est envoyé uniquement à ton adresse enregistrée. Valable 24 h.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
