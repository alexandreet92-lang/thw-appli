'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ArrowRight, Loader2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AuthInput } from '@/components/auth/AuthInput'
import { ErrorMessage } from '@/components/auth/ErrorMessage'
import { PasswordStrengthBar } from '@/components/auth/PasswordStrengthBar'
import { EmailVerification } from '@/components/auth/EmailVerification'
import { getAuthError } from '@/lib/auth/errors'
import { useI18n } from '@/lib/i18n'
import { LanguageDropdown } from '@/components/i18n/LanguageDropdown'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const TERMS_VERSION = '2025-06'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// CTA principal — dégradé cyan→indigo + reflet interne, proportionné (50px).
function ctaStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '100%', height: 50, borderRadius: 'var(--r-md)', border: 'none',
    background: disabled ? 'var(--bg-card2)' : 'var(--primary-gradient)',
    color: disabled ? 'var(--text-dim)' : '#fff',
    fontFamily: FB, fontSize: 15, fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: disabled ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.22), 0 6px 18px rgba(6,182,212,0.28)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    transition: 'filter 160ms, box-shadow 160ms', position: 'relative',
  }
}

// ── Hero (colonne gauche desktop / bandeau haut mobile) ───────────
function Hero() {
  const { t } = useI18n()
  const metric = (v: string, s: string) => (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontFamily: FD, fontSize: 20, fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>{v}</div>
      <div style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{s}</div>
    </div>
  )
  return (
    <div className="hbl-hero">
      {/* Motif linework en fond (anneaux + tracé), discret */}
      <svg className="hbl-rings" viewBox="0 0 400 400" fill="none" aria-hidden>
        <circle cx="300" cy="120" r="150" stroke="var(--primary)" strokeOpacity="0.12" />
        <circle cx="300" cy="120" r="110" stroke="var(--primary)" strokeOpacity="0.10" />
        <circle cx="300" cy="120" r="70" stroke="var(--border)" />
        <path d="M-20 320 C 80 280, 160 340, 240 290 S 400 250, 460 300" stroke="var(--primary)" strokeOpacity="0.14" strokeWidth="1.5" />
      </svg>

      <div className="hbl-hero-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--bg-card2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/logo_4bras.png" alt="Hybrid" style={{ width: 30, height: 30, objectFit: 'contain' }} />
          </span>
          <div>
            <div style={{ fontFamily: FD, fontSize: 26, fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--text)', lineHeight: 1 }}>Hybrid</div>
            <div style={{ fontFamily: FB, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-dim)', marginTop: 4 }}>{t('auth.heroTagline')}</div>
          </div>
        </div>
        <h1 className="hbl-headline" style={{ fontFamily: FD, fontWeight: 600, color: 'var(--text)', margin: '24px 0 0', lineHeight: 1.12, letterSpacing: '-0.01em' }}>
          {t('auth.heroHeadline')} <span style={{ color: 'var(--primary)' }}>{t('auth.heroAccent')}</span>
        </h1>
        <div className="hbl-metrics" style={{ display: 'flex', gap: 26, marginTop: 28, paddingTop: 22, borderTop: '1px solid var(--border)' }}>
          {metric(t('auth.mScores'), t('auth.mScoresSub'))}
          {metric(t('auth.mSports'), t('auth.mSportsSub'))}
          {metric(t('auth.mPlan'), t('auth.mPlanSub'))}
        </div>
      </div>
    </div>
  )
}

// ── Segmented control (thumb glissant) ────────────────────────────
function Segmented({ value, onChange, labels }: { value: number; onChange: (i: number) => void; labels: [string, string] }) {
  return (
    <div role="tablist" style={{ position: 'relative', display: 'flex', padding: 4, borderRadius: 'var(--r-md)', background: 'var(--bg-card2)', border: '1px solid var(--border)', marginBottom: 24 }}>
      <div aria-hidden style={{
        position: 'absolute', top: 4, bottom: 4, left: 4, width: 'calc(50% - 4px)', borderRadius: 'var(--r-sm)',
        background: 'var(--bg-elev)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border)',
        transform: value === 1 ? 'translateX(calc(100% + 0px))' : 'translateX(0)',
        transition: 'transform 0.26s cubic-bezier(0.32,0.72,0,1)',
      }} />
      {labels.map((l, i) => (
        <button key={i} role="tab" aria-selected={value === i} onClick={() => onChange(i)} style={{
          position: 'relative', flex: 1, zIndex: 1, height: 38, border: 'none', background: 'transparent', cursor: 'pointer',
          fontFamily: FB, fontSize: 13.5, fontWeight: value === i ? 700 : 500,
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
      <button onClick={() => handleOAuth('apple')} style={{ ...btn, background: '#fff', border: 'none', color: '#000' }}>
        <svg width="16" height="20" viewBox="0 0 18 22" fill="none"><path d="M14.5 11.5c0-2.5 2-3.7 2.1-3.8-1.1-1.6-2.9-1.8-3.5-1.9-1.5-.1-2.9.9-3.6.9-.8 0-1.9-.9-3.2-.8-1.6.1-3.1 1-4 2.4-1.7 2.9-.4 7.3 1.2 9.7.8 1.2 1.8 2.5 3 2.4 1.2-.1 1.7-.8 3.1-.8 1.4 0 1.8.8 3.1.7 1.3-.1 2.1-1.2 2.9-2.4.9-1.3 1.3-2.7 1.3-2.7s-2.4-1.3-2.4-3.7z" fill="#000"/><path d="M12.5 3.5c.6-.8 1.1-1.9 1-3-.9.1-2.1.6-2.7 1.5-.6.7-1.1 1.8-1 2.9 1 .1 2-.5 2.7-1.4z" fill="#000"/></svg>
        {t('auth.apple')}
      </button>
      <button onClick={() => handleOAuth('google')} style={{ ...btn, background: 'var(--bg-card2)', border: '1px solid var(--border-mid)', color: 'var(--text)' }}>
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.705 17.64 9.2z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
        {t('auth.google')}
      </button>
    </>
  )
}

const STYLES = `
.hbl-root{display:flex;flex-direction:column;min-height:100dvh;background:var(--bg)}
.hbl-hero{position:relative;overflow:hidden;padding:48px 28px 28px}
.hbl-hero-inner{position:relative;z-index:1;max-width:420px;margin:0 auto}
.hbl-rings{position:absolute;top:-40px;right:-60px;width:420px;height:420px;pointer-events:none}
.hbl-headline{font-size:26px;max-width:340px}
.hbl-form{flex:1;display:flex;align-items:flex-start;justify-content:center;padding:8px 24px 48px}
.hbl-form-inner{width:100%;max-width:380px}
@media(min-width:860px){
  .hbl-root{flex-direction:row}
  .hbl-hero{flex:1;min-height:100dvh;display:flex;align-items:center;border-right:1px solid var(--border);padding:48px}
  .hbl-headline{font-size:34px}
  .hbl-form{flex:0 0 480px;align-items:center;padding:48px}
}
@media(prefers-reduced-motion:reduce){.hbl-root *{transition:none!important}}
`

function AuthPageInner() {
  const router = useRouter()
  const { t } = useI18n()
  const params = useSearchParams()
  const expired = params.get('expired') === '1'

  const [activeTab, setActiveTab] = useState(0) // 0 login, 1 signup
  const [view, setView] = useState<'auth' | 'forgot' | 'verify'>('auth')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(expired ? t('auth.expired') : '')
  const [resetSent, setResetSent] = useState(false)
  const [remember, setRemember] = useState(true)

  useEffect(() => { if (expired) setError(t('auth.expired')) }, [expired, t])

  const emailValid = EMAIL_RE.test(email)
  const pwMatch = password === confirmPassword
  const canLogin = emailValid && password.length > 0
  const canSignup = emailValid && acceptedTerms && pwMatch && password.length >= 8
  const confirmErr = activeTab === 1 && confirmPassword.length > 0 && !pwMatch ? t('auth.pwMismatch') : undefined

  async function handleLogin() {
    if (!canLogin) return
    setLoading(true); setError('')
    const { error: e } = await createClient().auth.signInWithPassword({ email, password })
    setLoading(false)
    if (e) { setError(getAuthError(e)); return }
    const now = Date.now().toString()
    localStorage.setItem('last_auth_date', now)
    localStorage.setItem('thw_last_pw_auth', now)
    localStorage.setItem('thw_remember', remember ? '1' : '0')
    router.replace('/'); router.refresh()
  }

  async function handleSignup() {
    if (!canSignup) return
    setLoading(true); setError('')
    const { error: e } = await createClient().auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        // RGPD : trace de l'acceptation CGU + confidentialité (date + version).
        data: { terms_accepted_at: new Date().toISOString(), terms_version: TERMS_VERSION },
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
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
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
      <Hero />

      <div className="hbl-form">
        <div className="hbl-form-inner">
          <h2 style={{ fontFamily: FD, fontSize: 22, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>
            {isLogin ? t('auth.welcomeBack') : t('auth.createAccount')}
          </h2>
          <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: '0 0 24px' }}>
            {isLogin ? t('auth.heroHeadline') : t('auth.heroTagline')}
          </p>

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
