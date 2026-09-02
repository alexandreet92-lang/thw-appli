'use client'

// ══════════════════════════════════════════════════════════════
// SubscriptionEmailModal — changer / résilier son abonnement.
// Sécurité : on n'ouvre pas la page de paiement directement, on envoie
// un lien sécurisé par email après confirmation de l'adresse.
// Style minimal & raffiné (façon Claude).
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { getCurrentUser } from "@/lib/auth/currentUser"
import { Mail, Check } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { openWebsite } from '@/lib/native/platform'

interface Props {
  action: 'change' | 'cancel'
  /** Type d'abonnement concerné : dirige le lien email vers la bonne page
   *  (athlète → grille tarifaire ; coach → espace coach). Défaut : athlète. */
  plan?: 'athlete' | 'coach'
  onClose: () => void
}

export default function SubscriptionEmailModal({ action, plan = 'athlete', onClose }: Props) {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [fallback, setFallback] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    // Coupe-circuit : l'appel réseau natif peut échouer/rester bloqué
    // (préflight CORS, cold start…). On borne à 15 s.
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15000)
    try {
      const res = await fetch('/api/subscription/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action, plan }),
        signal: ctrl.signal,
      })
      const json = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !json.success) throw new Error(json.error ?? t('w3c.error_generic'))
      setSent(true)
    } catch {
      // Échec d'envoi (réseau) → on n'abandonne pas : on ouvre directement
      // l'espace compte du site (connexion d'abord) où gérer/résilier.
      setFallback(true)
    } finally {
      clearTimeout(timer)
      setLoading(false)
    }
  }

  const btnBg = action === 'cancel' ? '#ef4444' : 'var(--text)'
  const btnColor = action === 'cancel' ? '#fff' : 'var(--bg)'

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 13000, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 400, maxWidth: '100%', background: 'var(--bg-card)', borderRadius: 22, padding: 28, boxShadow: '0 30px 80px rgba(0,0,0,0.35)', border: '1px solid var(--border)' }}>
        {fallback ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <Mail size={21} color="var(--text-mid)" strokeWidth={1.9} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>{t('w3c.subemail_title_' + action) as string}</h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.6, margin: '0 0 22px' }}>
              Ouvre ton espace compte pour {action === 'cancel' ? 'résilier' : 'changer d’abonnement'}. Tu te connectes, puis tu gères tout depuis ton compte.
            </p>
            <button onClick={() => { onClose(); void openWebsite('/site/compte.html') }} style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: btnBg, color: btnColor, fontSize: 14.5, fontWeight: 600, cursor: 'pointer' }}>
              Ouvrir mon compte →
            </button>
            <button onClick={onClose} style={{ width: '100%', padding: 12, marginTop: 10, borderRadius: 14, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mid)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
              {t('w3c.close')}
            </button>
          </div>
        ) : sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'color-mix(in srgb, #22c55e 14%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <Check size={24} color="#22C55E" strokeWidth={2.2} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>{t('w3c.link_sent')}</h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.6, margin: '0 0 22px' }}>
              {t('w3c.subemail_sent_pre')}<strong style={{ color: 'var(--text)' }}>{email}</strong>{t('w3c.subemail_sent_post')}
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
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'var(--text)', textAlign: 'center', margin: '0 0 8px' }}>{t(`w3c.subemail_title_${action}`)}</h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-mid)', textAlign: 'center', lineHeight: 1.6, margin: '0 0 22px' }}>{t(`w3c.subemail_desc_${action}`)}</p>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void submit() }}
              placeholder={t('w3c.email_placeholder')}
              style={{ width: '100%', background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 14, padding: '13px 15px', fontSize: 14, color: 'var(--text)', outline: 'none', marginBottom: 12, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', textAlign: 'center' }}
            />
            {error && <p style={{ fontSize: 12, color: '#EF4444', margin: '0 0 12px', textAlign: 'center' }}>{error}</p>}
            <button
              onClick={() => void submit()}
              disabled={loading || !email}
              style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: btnBg, color: btnColor, fontSize: 14.5, fontWeight: 600, cursor: loading || !email ? 'not-allowed' : 'pointer', opacity: loading || !email ? 0.55 : 1 }}
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
