'use client'
// Écran « Vérifie ta boîte mail » (après inscription) — même grammaire que
// les autres écrans d'entrée : pictogramme rond, grand titre, adresse en
// pastille, renvoi (pilule blanche) avec compte à rebours, retour.
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getAuthError } from '@/lib/auth/errors'
import { authCallbackUrl } from '@/lib/auth/redirect'
import { useI18n } from '@/lib/i18n'
import { SheetPill } from '@/components/ui/BottomSheet'
import { ErrorMessage } from './ErrorMessage'
import { Dots } from './AuthKit'

interface Props {
  email: string
  onBack: () => void
}

export function EmailVerification({ email, onBack }: Props) {
  const { t } = useI18n()
  const [resent,     setResent]     = useState(false)
  const [resending,  setResending]  = useState(false)
  const [countdown,  setCountdown]  = useState(0)
  const [error,      setError]      = useState('')

  useEffect(() => {
    if (countdown <= 0) return
    const id = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(id)
  }, [countdown])

  // L'échec d'envoi (quota SMTP atteint, expéditeur refusé…) n'est jamais
  // avalé : sans ça l'écran afficherait « ✓ Email renvoyé » pour rien.
  const handleResend = async () => {
    setResending(true); setError('')
    const sb = createClient()
    const { error: e } = await sb.auth.resend({
      type: 'signup', email,
      options: { emailRedirectTo: authCallbackUrl('/') },
    })
    setResending(false)
    if (e) { setError(getAuthError(e)); return }
    setResent(true)
    setCountdown(60)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, textAlign: 'center', paddingTop: 36 }}>
        <div className="au-logo" style={{
          width: 96, height: 96, margin: '0 auto 24px', borderRadius: '50%', background: 'var(--primary-dim)', color: 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg aria-hidden width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <path d="M4 7l8 6 8-6" />
          </svg>
        </div>
        <h1 className="au-h1">{t('verify.title')}</h1>
        <p className="au-sub" style={{ marginTop: 10 }}>{t('verify.sentTo')}</p>
        <p style={{ display: 'inline-block', maxWidth: '100%', overflowWrap: 'anywhere', margin: '10px 0 0', padding: '8px 14px', borderRadius: 'var(--r-pill)', background: 'var(--surface-card)', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
          {email}
        </p>
        <p className="au-sub" style={{ margin: '18px auto 0', maxWidth: 320, fontSize: 14 }}>{t('verify.activate')}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 20 }}>
        <ErrorMessage error={error} />
        <SheetPill variant="white" onClick={handleResend} disabled={resending || countdown > 0} style={{ minHeight: 56, fontSize: 17 }}>
          {resending ? <Dots /> : resent && countdown > 0 ? `${t('verify.resent')} · ${countdown}s` : t('verify.resend')}
        </SheetPill>
        <SheetPill variant="ghost" onClick={onBack}>{t('verify.back')}</SheetPill>
      </div>
    </div>
  )
}
