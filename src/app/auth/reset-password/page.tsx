'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { AuthChangeEvent, EmailOtpType, Session } from '@supabase/supabase-js'
import { AuthInput } from '@/components/auth/AuthInput'
import { ErrorMessage } from '@/components/auth/ErrorMessage'
import { PasswordStrengthBar } from '@/components/auth/PasswordStrengthBar'
import { getAuthError, getAuthLinkError } from '@/lib/auth/errors'
import { useI18n } from '@/lib/i18n'

const BG = 'linear-gradient(160deg, #060614 0%, #0A0F1E 50%, #050B1A 100%)'

const primaryBtn: React.CSSProperties = {
  width: '100%', height: 52, borderRadius: 14,
  background: 'linear-gradient(135deg, #06B6D4, #2563EB)',
  border: 'none', color: 'white',
  fontSize: 16, fontWeight: 700, cursor: 'pointer',
  boxShadow: '0 4px 20px rgba(6,182,212,0.35)',
  fontFamily: 'DM Sans, sans-serif',
  transition: 'opacity 200ms',
}

// État du lien de récupération : tant qu'on n'a pas de session « recovery »,
// afficher le formulaire ne sert à rien (updateUser échouerait avec un message
// obscur). On distingue donc explicitement les trois cas.
type LinkState = 'checking' | 'ready' | 'invalid'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)
  const [linkState, setLinkState] = useState<LinkState>('checking')
  const [linkError, setLinkError] = useState('')

  // ── Validation du lien reçu par email ──────────────────────────────
  // Trois formes possibles selon le template et la plateforme :
  //  a) session déjà posée par /auth/callback (web, flux PKCE côté serveur) ;
  //  b) `?token_hash=…&type=recovery` — indispensable au build NATIF, qui n'a
  //     pas de route serveur pour consommer le jeton ;
  //  c) `#access_token=…` (flux implicite) — consommé automatiquement par
  //     supabase-js (detectSessionInUrl), on attend juste l'événement.
  // Et l'échec : `#error_code=otp_expired` — jamais visible côté serveur,
  // c'est ICI qu'il faut le lire, sinon l'utilisateur voit un formulaire muet.
  useEffect(() => {
    const sb = createClient()
    let done = false
    const finish = (state: LinkState, msg = '') => {
      if (done) return
      done = true
      setLinkState(state)
      setLinkError(msg)
    }

    const { data: { subscription } } = sb.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        finish('ready')
      }
    })

    void (async () => {
      const url = new URL(window.location.href)
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const errCode = hash.get('error_code') || hash.get('error')
        || url.searchParams.get('error_code') || url.searchParams.get('error')
      if (errCode) { finish('invalid', getAuthLinkError(errCode)); return }

      const tokenHash = url.searchParams.get('token_hash')
      if (tokenHash) {
        const type = (url.searchParams.get('type') ?? 'recovery') as EmailOtpType
        const { error: e } = await sb.auth.verifyOtp({ token_hash: tokenHash, type })
        // Le jeton ne doit pas rester dans la barre d'adresse : il finirait dans
        // l'historique et dans l'en-tête Referer des requêtes suivantes.
        window.history.replaceState(null, '', '/auth/reset-password')
        finish(e ? 'invalid' : 'ready', e ? getAuthError(e) : '')
        return
      }

      const { data } = await sb.auth.getSession()
      if (data.session) { finish('ready'); return }

      // Flux implicite : laisser à supabase-js le temps de consommer le
      // fragment avant de déclarer le lien invalide.
      if (hash.get('access_token')) {
        setTimeout(() => finish('invalid', getAuthLinkError('otp_expired')), 4000)
        return
      }
      finish('invalid', getAuthLinkError('missing_token'))
    })()

    return () => subscription.unsubscribe()
  }, [])

  const isDisabled = password !== confirm || password.length < 6

  async function handleReset() {
    if (isDisabled) return
    setLoading(true); setError('')
    const sb = createClient()
    const { error: e } = await sb.auth.updateUser({ password })
    setLoading(false)
    if (e) { setError(getAuthError(e)); return }
    const now = Date.now().toString()
    localStorage.setItem('last_auth_date', now)
    localStorage.setItem('thw_last_pw_auth', now)
    setSuccess(true)
    setTimeout(() => { window.location.href = '/' }, 1800)
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}>
      <style>{`@keyframes scale-in{from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
      <div style={{ width: '100%', maxWidth: 380, padding: '0 24px' }}>

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/logo_4bras.png" alt="Hybrid" style={{ width: 40, height: 40 }} />
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: '10px 0 4px', letterSpacing: '-0.5px', fontFamily: 'Syne, sans-serif' }}>
            Hybrid
          </h2>
        </div>

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, margin: '0 auto 24px', borderRadius: '50%',
              background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'scale-in 0.5s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <path d="M8 18l7 7 13-14" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: 'white', margin: '0 0 12px', fontFamily: 'Syne, sans-serif' }}>
              {t('authpage.passwordChanged')}
            </h3>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 28px', fontFamily: 'DM Sans, sans-serif' }}>
              {t('authpage.signedInRedirect')}
            </p>
            <button onClick={() => { window.location.href = '/' }} style={primaryBtn}>
              {t('authpage.enterApp')}
            </button>
          </div>
        ) : linkState === 'checking' ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14, fontFamily: 'DM Sans, sans-serif' }}>
            {t('authpage.resetChecking')}
          </p>
        ) : linkState === 'invalid' ? (
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: 'white', fontSize: 22, fontWeight: 700, margin: '0 0 12px', fontFamily: 'Syne, sans-serif' }}>
              {t('authpage.resetLinkInvalid')}
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, margin: '0 0 28px', lineHeight: 1.5, fontFamily: 'DM Sans, sans-serif' }}>
              {linkError}
            </p>
            <button onClick={() => router.replace('/auth')} style={primaryBtn}>
              {t('authpage.resetAskNewLink')}
            </button>
          </div>
        ) : (
          <>
            <h3 style={{ color: 'white', fontSize: 22, fontWeight: 700, margin: '0 0 8px', textAlign: 'center', fontFamily: 'Syne, sans-serif' }}>
              {t('authpage.newPassword')}
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: '0 0 28px', textAlign: 'center', lineHeight: 1.5, fontFamily: 'DM Sans, sans-serif' }}>
              {t('authpage.chooseSecurePassword')}
            </p>

            <AuthInput label={t('authpage.newPassword')} type="password" placeholder="••••••••" value={password} onChange={setPassword} showToggle />
            <PasswordStrengthBar password={password} />
            <div style={{ height: 16 }} />
            <AuthInput label={t('auth.confirm')} type="password" placeholder="••••••••" value={confirm} onChange={setConfirm} showToggle />

            {confirm && password !== confirm && (
              <p style={{ fontSize: 12, color: '#EF4444', margin: '4px 0 0', fontFamily: 'DM Sans, sans-serif' }}>
                {t('auth.pwMismatch')}
              </p>
            )}

            <ErrorMessage error={error} />
            <div style={{ height: 24 }} />

            <button
              onClick={handleReset}
              disabled={loading || isDisabled}
              style={{ ...primaryBtn, opacity: loading || isDisabled ? 0.5 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
            >
              {loading ? t('authpage.updating') : t('authpage.changePasswordBtn')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
