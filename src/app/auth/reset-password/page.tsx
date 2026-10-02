'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { AuthChangeEvent, EmailOtpType, Session } from '@supabase/supabase-js'
import { AuthInput } from '@/components/auth/AuthInput'
import { ErrorMessage } from '@/components/auth/ErrorMessage'
import { PasswordStrengthBar } from '@/components/auth/PasswordStrengthBar'
import { AUTH_CSS, AuthHeading, AuthScreen, BackButton, PrimaryPill } from '@/components/auth/AuthKit'
import { Skeleton } from '@/components/ui/Skeleton'
import { getAuthError, getAuthLinkError } from '@/lib/auth/errors'
import { useI18n } from '@/lib/i18n'

// Même minimum que l'inscription.
const PW_MIN = 8

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

  const isDisabled = password !== confirm || password.length < PW_MIN

  async function handleReset() {
    if (isDisabled || loading) return
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
    <AuthScreen>
      <style>{AUTH_CSS}</style>
      {!success && <div><BackButton onClick={() => router.replace('/auth')} /></div>}

      {success ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
          <div className="au-logo" style={{
            width: 96, height: 96, margin: '0 auto 22px', borderRadius: '50%',
            background: 'color-mix(in srgb, var(--success) 16%, transparent)', color: 'var(--success)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg aria-hidden width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          </div>
          <h1 className="au-h1">{t('authpage.passwordChanged')}</h1>
          <p className="au-sub" style={{ marginBottom: 28 }}>{t('authpage.signedInRedirect')}</p>
          <PrimaryPill onClick={() => { window.location.href = '/' }}>{t('authpage.enterApp')}</PrimaryPill>
        </div>
      ) : linkState === 'checking' ? (
        <div aria-busy="true" style={{ marginTop: 18 }}>
          <Skeleton width="70%" height={32} />
          <div style={{ height: 12 }} />
          <Skeleton width="90%" height={16} />
          <div style={{ height: 28 }} />
          <Skeleton height={56} />
          <div style={{ height: 14 }} />
          <Skeleton height={56} />
          <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{t('authpage.resetChecking')}</span>
        </div>
      ) : linkState === 'invalid' ? (
        <>
          <AuthHeading title={t('authpage.resetLinkInvalid')} sub={linkError} />
          <PrimaryPill onClick={() => router.replace('/auth')}>{t('authpage.resetAskNewLink')}</PrimaryPill>
        </>
      ) : (
        <>
          <AuthHeading title={t('authpage.newPassword')} sub={t('authpage.chooseSecurePassword')} />
          <form noValidate onSubmit={e => { e.preventDefault(); void handleReset() }}>
            <AuthInput label={t('authpage.newPassword')} type="password" placeholder="••••••••" value={password} onChange={setPassword}
              showToggle autoComplete="new-password" hint={password.length < PW_MIN ? t('au.pwMin') : undefined} />
            <PasswordStrengthBar password={password} />
            <AuthInput label={t('auth.confirm')} type="password" placeholder="••••••••" value={confirm} onChange={setConfirm}
              showToggle autoComplete="new-password" error={confirm && password !== confirm ? t('auth.pwMismatch') : undefined} />
            <ErrorMessage error={error} />
            <div style={{ height: 8 }} />
            <PrimaryPill type="submit" loading={loading} disabled={isDisabled}>{t('authpage.changePasswordBtn')}</PrimaryPill>
          </form>
        </>
      )}
    </AuthScreen>
  )
}
