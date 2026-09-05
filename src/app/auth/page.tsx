'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ArrowRight, Loader2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { AuthInput } from '@/components/auth/AuthInput'
import { ErrorMessage } from '@/components/auth/ErrorMessage'
import { PasswordStrengthBar } from '@/components/auth/PasswordStrengthBar'
import { EmailVerification } from '@/components/auth/EmailVerification'
import { getAuthError, isRetryableAuthError, getAuthLinkError } from '@/lib/auth/errors'
import { authCallbackUrl } from '@/lib/auth/redirect'
import { useI18n } from '@/lib/i18n'
import { LanguageDropdown } from '@/components/i18n/LanguageDropdown'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const TERMS_VERSION = '2025-06'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Build natif (Capacitor) : bundle local, redirections adaptées.
const NATIVE_BUILD = !!process.env.NEXT_PUBLIC_API_BASE

// CTA principal — accent unique (--primary), plein et sobre. Halo discret
// (« raffiné » : on retire le gros glow ; la profondeur suffit à porter l'action).
function ctaStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '100%', height: 50, borderRadius: 'var(--r-md)', border: 'none',
    background: disabled ? 'var(--bg-card2)' : 'var(--primary)',
    color: disabled ? 'var(--text-dim)' : '#fff',
    fontFamily: FB, fontSize: 15, fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: disabled ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.18), 0 2px 10px rgba(6,182,212,0.16)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    transition: 'filter 160ms, box-shadow 160ms', position: 'relative',
  }
}

// ── Marque (centrée, sobre — inspiration Claude : une colonne calme) ──
function Brand() {
  const { t } = useI18n()
  return (
    <div className="hbl-brand">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logos/logo_app.png" alt="Hybrid" style={{ width: 54, height: 54, borderRadius: 15, objectFit: 'cover', boxShadow: 'var(--shadow-card)' }} />
      <div style={{ fontFamily: FD, fontSize: 22, fontWeight: 600, letterSpacing: '-0.4px', color: 'var(--text)', marginTop: 14, lineHeight: 1 }}>Hybrid</div>
      <div style={{ fontFamily: FB, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-dim)', marginTop: 7 }}>{t('auth.heroTagline')}</div>
    </div>
  )
}

// ── Segmented control (thumb glissant) ────────────────────────────
function Segmented({ value, onChange, labels }: { value: number; onChange: (i: number) => void; labels: [string, string] }) {
  return (
    <div role="tablist" style={{ position: 'relative', display: 'flex', padding: 5, borderRadius: 'var(--r-md)', background: 'var(--bg-card2)', border: '1px solid var(--border)', marginBottom: 24 }}>
      <div aria-hidden style={{
        position: 'absolute', top: 5, bottom: 5, left: 5, width: 'calc(50% - 5px)', borderRadius: 'var(--r-sm)',
        background: 'var(--bg-elev)', boxShadow: 'var(--shadow-card)',
        transform: value === 1 ? 'translateX(100%)' : 'translateX(0)',
        transition: 'transform 0.28s cubic-bezier(0.32,0.72,0,1)',
      }} />
      {labels.map((l, i) => (
        <button key={i} role="tab" aria-selected={value === i} onClick={() => onChange(i)} style={{
          position: 'relative', flex: 1, zIndex: 1, height: 40, border: 'none', background: 'transparent', cursor: 'pointer',
          fontFamily: FB, fontSize: 14, fontWeight: value === i ? 700 : 500, letterSpacing: '0.01em',
          color: value === i ? 'var(--text)' : 'var(--text-mid)', transition: 'color 0.2s',
        }}>{l}</button>
      ))}
    </div>
  )
}

function SocialButtons({ onError }: { onError: (msg: string) => void }) {
  const { t } = useI18n()
  const handleOAuth = async (provider: 'apple' | 'google') => {
    const sb = createClient()
    if (NATIVE_BUILD) {
      // Google refuse les webviews intégrées → on ouvre Safari natif, et on revient
      // dans l'app via le lien com.thehybridway.app://auth-callback (capté par
      // App.addListener côté ClientShell). skipBrowserRedirect : on gère l'ouverture.
      // On passe par l'URL Vercel /auth/callback?native=1 (déjà autorisée dans
      // Supabase pour le web) qui REBONDIT vers com.thehybridway.app://auth-callback.
      // Évite les soucis d'allowlist des schemes custom côté Supabase.
      const base = process.env.NEXT_PUBLIC_API_BASE || 'https://thw-appli.vercel.app'
      const { data, error } = await sb.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${base}/auth/callback?native=1`, skipBrowserRedirect: true },
      })
      if (error) { onError(getAuthError(error)); return }
      if (data?.url) {
        const { Browser } = await import('@capacitor/browser')
        await Browser.open({ url: data.url })
      }
      return
    }
    const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/auth/callback` } })
    if (error) onError(getAuthError(error))
  }
  const btn: React.CSSProperties = {
    width: '100%', height: 48, borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    cursor: 'pointer', marginBottom: 10, fontFamily: FB, fontSize: 14, fontWeight: 600, transition: 'filter 160ms',
  }
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: FB }}>{t('auth.or')}</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      {/* Apple retiré tant que le back-end Sign in with Apple n'est pas en place
          (Supabase provider + service id / clé). On ne garde que Google. */}
      <button onClick={() => handleOAuth('google')} style={{ ...btn, background: 'var(--bg-card2)', border: '1px solid var(--border-mid)', color: 'var(--text)' }}>
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.705 17.64 9.2z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
        {t('auth.google')}
      </button>
    </>
  )
}

const STYLES = `
.hbl-root{min-height:100dvh;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:40px 20px}
.hbl-col{width:100%;max-width:400px;margin:0 auto}
.hbl-brand{display:flex;flex-direction:column;align-items:center;text-align:center;margin-bottom:26px}
.hbl-head{text-align:center;margin-bottom:24px}
@media(min-width:860px){.hbl-root{padding:56px 24px}}
@media(prefers-reduced-motion:reduce){.hbl-root *{transition:none!important}}
`

function AuthPageInner() {
  const router = useRouter()
  const { t, lang } = useI18n()
  const params = useSearchParams()
  const expired = params.get('expired') === '1'
  // Erreur remontée par /auth/callback (lien d'email expiré, déjà utilisé,
  // verifier PKCE absent…). Avant, ce paramètre était posé mais JAMAIS lu :
  // l'utilisateur revenait sur l'écran de connexion sans la moindre explication.
  const linkError = params.get('error')
  // Redirection post-connexion : quand on arrive ici depuis l'app (lien vers
  // abonnement / recharge / facturation), on affiche la connexion PUIS on
  // renvoie l'utilisateur sur SA page (il voit ses propres données). On valide
  // le chemin (relatif au site, jamais une URL externe → pas d'open-redirect).
  const redirectRaw = params.get('redirect')
  const dest = redirectRaw && /^\/(?!\/)/.test(redirectRaw) ? redirectRaw : '/'

  const [activeTab, setActiveTab] = useState(0) // 0 login, 1 signup
  const [view, setView] = useState<'auth' | 'forgot' | 'verify'>('auth')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(expired ? t('auth.expired') : linkError ? getAuthLinkError(linkError) : '')
  const [resetSent, setResetSent] = useState(false)
  const [remember, setRemember] = useState(true)

  useEffect(() => {
    if (expired) setError(t('auth.expired'))
    else if (linkError) setError(getAuthLinkError(linkError))
  }, [expired, linkError, t])

  // App native : retour d'OAuth (Google/Apple). Le webview revient sur
  // capacitor://…/auth?code=… ; le client natif échange le code (PKCE) → dès
  // qu'une session existe, on entre dans l'app.
  useEffect(() => {
    if (!NATIVE_BUILD) return
    const sb = createClient()
    void sb.auth.getSession().then((res: { data: { session: Session | null } }) => { if (res.data.session) window.location.href = dest })
    const { data: sub } = sb.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) window.location.href = dest
    })
    return () => sub.subscription.unsubscribe()
  }, [dest])

  // Web : si on arrive sur /auth avec un ?redirect=… et qu'une session existe
  // déjà (utilisateur connecté sur le navigateur), on le renvoie directement sur
  // sa page — inutile de lui redemander le mot de passe. Sans paramètre, le
  // comportement de /auth reste inchangé.
  useEffect(() => {
    if (NATIVE_BUILD || !redirectRaw) return
    const sb = createClient()
    void sb.auth.getSession().then((res: { data: { session: Session | null } }) => { if (res.data.session) window.location.replace(dest) })
  }, [redirectRaw, dest])

  const emailValid = EMAIL_RE.test(email)
  const pwMatch = password === confirmPassword
  const canLogin = emailValid && password.length > 0
  const canSignup = emailValid && acceptedTerms && pwMatch && password.length >= 8
  const confirmErr = activeTab === 1 && confirmPassword.length > 0 && !pwMatch ? t('auth.pwMismatch') : undefined

  async function handleLogin() {
    if (!canLogin) return
    setLoading(true); setError('')
    const sb = createClient()
    // Une indisponibilité passagère (base lente → 504/timeout) ne doit pas bloquer
    // la connexion : on retente une fois en silence avant d'afficher une erreur.
    let e = (await sb.auth.signInWithPassword({ email, password })).error
    if (e && isRetryableAuthError(e)) {
      await new Promise(r => setTimeout(r, 1200))
      e = (await sb.auth.signInWithPassword({ email, password })).error
    }
    setLoading(false)
    if (e) { setError(getAuthError(e)); return }
    const now = Date.now().toString()
    localStorage.setItem('last_auth_date', now)
    localStorage.setItem('thw_last_pw_auth', now)
    localStorage.setItem('thw_remember', remember ? '1' : '0')
    // App native : rechargement dur → le dashboard se monte à neuf avec la session
    // fraîchement stockée en localStorage (router.refresh() n'a pas de serveur en
    // export statique). Web : navigation SPA classique.
    if (NATIVE_BUILD) { window.location.href = dest }
    else { router.replace(dest); router.refresh() }
  }

  async function handleSignup() {
    if (!canSignup) return
    setLoading(true); setError('')
    const { error: e } = await createClient().auth.signUp({
      email, password,
      options: {
        emailRedirectTo: authCallbackUrl('/'),
        // RGPD : trace de l'acceptation CGU + confidentialité (date + version).
        // `lang` : les templates d'email Supabase ne peuvent lire QUE les
        // métadonnées du compte ({{ .Data }}) — jamais la table profiles. C'est
        // donc ici que se joue la langue des mails d'authentification.
        data: { terms_accepted_at: new Date().toISOString(), terms_version: TERMS_VERSION, lang },
      },
    })
    setLoading(false)
    if (e) { setError(getAuthError(e)); return }
    setView('verify')
  }

  async function handleForgotPassword() {
    if (!emailValid) { setError(t('auth.forgotDesc')); return }
    setLoading(true); setError('')
    const { error: e } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: authCallbackUrl('/auth/reset-password'),
    })
    setLoading(false)
    if (e) { setError(getAuthError(e)); return }
    setResetSent(true)
  }

  // ── Écran vérification email ──
  if (view === 'verify') {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <LanguageDropdown />
        <div style={{ width: '100%', maxWidth: 420 }}>
          <EmailVerification email={email} onBack={() => { setView('auth'); setActiveTab(0); setError('') }} />
        </div>
      </div>
    )
  }

  // ── Écran mot de passe oublié ──
  if (view === 'forgot') {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <LanguageDropdown />
        <div style={{ width: '100%', maxWidth: 380 }}>
          <button onClick={() => { setView('auth'); setError(''); setResetSent(false) }} style={{ background: 'none', border: 'none', color: 'var(--text-mid)', fontSize: 14, cursor: 'pointer', padding: '0 0 20px', fontFamily: FB }}>← {t('auth.tabLogin')}</button>
          <h3 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 600, margin: '0 0 8px', fontFamily: FD }}>{t('auth.forgotTitle')}</h3>
          <p style={{ color: 'var(--text-mid)', fontSize: 14, margin: '0 0 24px', fontFamily: FB, lineHeight: 1.5 }}>{t('auth.forgotDesc')}</p>
          <AuthInput label={t('auth.email')} type="email" placeholder="ton@email.com" value={email} onChange={setEmail} autoComplete="email" />
          <ErrorMessage error={error} />
          <div style={{ height: 12 }} />
          <button onClick={handleForgotPassword} disabled={loading} style={ctaStyle(loading)}>
            {loading ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
            {loading ? t('auth.forgotSending') : t('auth.forgotSend')}
          </button>
          {resetSent && (
            <div style={{ padding: '12px 16px', borderRadius: 'var(--r-md)', marginTop: 16, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)' }}>
              <p style={{ color: '#22c55e', fontSize: 13, margin: 0, fontFamily: FB }}>{t('auth.forgotSent')}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const isLogin = activeTab === 0
  const cta = isLogin ? canLogin : canSignup
  const onSubmit = isLogin ? handleLogin : handleSignup

  return (
    <div className="hbl-root">
      <style>{STYLES}</style>
      <LanguageDropdown />

      <div className="hbl-col">
        <Brand />
        <div className="hbl-head">
          <h2 style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
            {isLogin ? t('auth.welcomeBack') : t('auth.createAccount')}
          </h2>
          <p style={{ fontFamily: FB, fontSize: 13.5, color: 'var(--text-mid)', margin: 0, lineHeight: 1.5 }}>
            {`${t('auth.heroHeadline')} ${t('auth.heroAccent')}`}
          </p>
        </div>

        <div>
          <Segmented value={activeTab} onChange={i => { setActiveTab(i); setError('') }} labels={[t('auth.tabLogin'), t('auth.tabSignup')]} />

          <AuthInput label={t('auth.email')} type="email" placeholder="ton@email.com" value={email} onChange={setEmail} autoComplete="email" />
          <AuthInput label={t('auth.password')} type="password" placeholder="••••••••" value={password} onChange={setPassword} showToggle autoComplete={isLogin ? 'current-password' : 'new-password'} />

          {!isLogin && (
            <>
              <PasswordStrengthBar password={password} />
              <AuthInput label={t('auth.confirm')} type="password" placeholder="••••••••" value={confirmPassword} onChange={setConfirmPassword} showToggle error={confirmErr} autoComplete="new-password" />

              <label onClick={() => setAcceptedTerms(v => !v)} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '4px 0 18px', cursor: 'pointer' }}>
                <span style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                  background: acceptedTerms ? 'var(--primary)' : 'transparent',
                  border: `2px solid ${acceptedTerms ? 'var(--primary)' : 'var(--border-mid)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms',
                }}>{acceptedTerms && <Check size={13} color="#fff" strokeWidth={3} />}</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.5, fontFamily: FB }}>
                  {t('auth.termsAccept')}{' '}
                  <a href="/legal/cgu" target="_blank" rel="noopener" style={{ color: 'var(--primary)', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>{t('auth.termsCgu')}</a>{' '}
                  {t('auth.termsAnd')}{' '}
                  <a href="/legal/privacy" target="_blank" rel="noopener" style={{ color: 'var(--primary)', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>{t('auth.termsPrivacy')}</a>
                </span>
              </label>
            </>
          )}

          {isLogin && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '2px 0 20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: FB, fontSize: 13, color: 'var(--text-mid)' }}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }} />
                {t('auth.remember')}
              </label>
              <button onClick={() => { setView('forgot'); setError('') }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: FB }}>{t('auth.forgot')}</button>
            </div>
          )}

          <ErrorMessage error={error} />
          {error && <div style={{ height: 10 }} />}

          <button onClick={onSubmit} disabled={loading || !cta} style={{ ...ctaStyle(loading || !cta), filter: 'none' }}
            onMouseEnter={e => { if (cta && !loading) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.06)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none' }}>
            {loading ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> : <>{isLogin ? t('auth.login') : t('auth.signup')}<ArrowRight size={17} /></>}
          </button>

          <p style={{ textAlign: 'center', marginTop: 18, fontFamily: FB, fontSize: 13, color: 'var(--text-mid)' }}>
            {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
            <button onClick={() => { setActiveTab(isLogin ? 1 : 0); setError('') }} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--primary)', fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {isLogin ? t('auth.tabSignup') : t('auth.tabLogin')}
            </button>
          </p>

          <SocialButtons onError={setError} />
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageInner />
    </Suspense>
  )
}
