'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AuthInput } from '@/components/auth/AuthInput'
import { ErrorMessage } from '@/components/auth/ErrorMessage'
import { PasswordStrengthBar } from '@/components/auth/PasswordStrengthBar'
import { EmailVerification } from '@/components/auth/EmailVerification'
import { getAuthError } from '@/lib/auth/errors'

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

function Logo() {
  return (
    <div style={{ textAlign: 'center', marginBottom: 40 }}>
      <img src="/logos/logo_4bras.png" alt="Hybrid" style={{ width: 40, height: 40 }} />
      <h2 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: '10px 0 4px', letterSpacing: '-0.5px', fontFamily: 'Syne, sans-serif' }}>
        Hybrid
      </h2>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, textTransform: 'uppercase', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
        by The Hybrid Way
      </p>
    </div>
  )
}

function SocialButtons({ onError }: { onError: (msg: string) => void }) {
  const handleOAuth = async (provider: 'apple' | 'google') => {
    const sb = createClient()
    const { error } = await sb.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) onError(getAuthError(error))
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontFamily: 'DM Sans, sans-serif' }}>ou</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
      </div>

      <button onClick={() => handleOAuth('apple')} style={{ width: '100%', height: 50, borderRadius: 12, background: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', marginBottom: 10, transition: 'opacity 200ms' }}>
        <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
          <path d="M14.5 11.5c0-2.5 2-3.7 2.1-3.8-1.1-1.6-2.9-1.8-3.5-1.9-1.5-.1-2.9.9-3.6.9-.8 0-1.9-.9-3.2-.8-1.6.1-3.1 1-4 2.4-1.7 2.9-.4 7.3 1.2 9.7.8 1.2 1.8 2.5 3 2.4 1.2-.1 1.7-.8 3.1-.8 1.4 0 1.8.8 3.1.7 1.3-.1 2.1-1.2 2.9-2.4.9-1.3 1.3-2.7 1.3-2.7s-2.4-1.3-2.4-3.7z" fill="black"/>
          <path d="M12.5 3.5c.6-.8 1.1-1.9 1-3-.9.1-2.1.6-2.7 1.5-.6.7-1.1 1.8-1 2.9 1 .1 2-.5 2.7-1.4z" fill="black"/>
        </svg>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'black', fontFamily: 'DM Sans, sans-serif' }}>Continuer avec Apple</span>
      </button>

      <button onClick={() => handleOAuth('google')} style={{ width: '100%', height: 50, borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', transition: 'all 200ms' }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.705 17.64 9.2z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'white', fontFamily: 'DM Sans, sans-serif' }}>Continuer avec Google</span>
      </button>
    </>
  )
}

function AuthPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const expired = params.get('expired') === '1'

  const [activeTab,       setActiveTab]       = useState(0)
  const [view,            setView]            = useState<'auth' | 'forgot' | 'verify'>('auth')
  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptedTerms,   setAcceptedTerms]   = useState(false)
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState(expired ? 'Session expirée. Reconnecte-toi.' : '')
  const [resetSent,       setResetSent]       = useState(false)

  useEffect(() => {
    if (expired) setError('Session expirée. Reconnecte-toi.')
  }, [expired])

  const canSignup = acceptedTerms && password === confirmPassword && password.length >= 6

  async function handleLogin() {
    if (!email || !password) return
    setLoading(true); setError('')
    const sb = createClient()
    const { error: e } = await sb.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (e) { setError(getAuthError(e)); return }
    localStorage.setItem('last_auth_date', Date.now().toString())
    router.replace('/')
    router.refresh()
  }

  async function handleSignup() {
    if (!email || !canSignup) return
    setLoading(true); setError('')
    const sb = createClient()
    const { error: e } = await sb.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (e) { setError(getAuthError(e)); return }
    setView('verify')
  }

  async function handleForgotPassword() {
    if (!email) { setError('Entre ton email.'); return }
    setLoading(true); setError('')
    const sb = createClient()
    const { error: e } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    })
    setLoading(false)
    if (e) { setError(getAuthError(e)); return }
    setResetSent(true)
  }

  if (view === 'verify') {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}>
        <EmailVerification email={email} onBack={() => { setView('auth'); setActiveTab(0); setError('') }} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}>
      <div style={{ width: '100%', maxWidth: 380, padding: '0 24px' }}>

        <Logo />

        {view === 'forgot' ? (
          <>
            <button onClick={() => { setView('auth'); setError(''); setResetSent(false) }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer', padding: '0 0 20px', fontFamily: 'DM Sans, sans-serif' }}>
              ← Retour
            </button>
            <h3 style={{ color: 'white', fontSize: 20, fontWeight: 700, margin: '0 0 8px', fontFamily: 'Syne, sans-serif' }}>
              Réinitialiser le mot de passe
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '0 0 24px', fontFamily: 'DM Sans, sans-serif' }}>
              Entre ton email. Un lien de réinitialisation sera envoyé.
            </p>
            <AuthInput label="Email" type="email" placeholder="ton@email.com" value={email} onChange={setEmail} />
            <ErrorMessage error={error} />
            <div style={{ height: 12 }} />
            <button onClick={handleForgotPassword} disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Envoi…' : 'Envoyer le lien'}
            </button>
            {resetSent && (
              <div style={{ padding: '12px 16px', borderRadius: 12, marginTop: 16, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                <p style={{ color: '#10B981', fontSize: 13, margin: 0, fontFamily: 'DM Sans, sans-serif' }}>Email envoyé. Vérifie ta boîte mail.</p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Tabs */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 4, marginBottom: 28 }}>
              {['Connexion', 'Créer un compte'].map((tab, i) => (
                <button key={i} onClick={() => { setActiveTab(i); setError('') }} style={{
                  flex: 1, padding: '9px', borderRadius: 9,
                  background: activeTab === i ? 'rgba(255,255,255,0.12)' : 'transparent',
                  border: 'none',
                  color: activeTab === i ? 'white' : 'rgba(255,255,255,0.4)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 200ms', fontFamily: 'DM Sans, sans-serif',
                }}>
                  {tab}
                </button>
              ))}
            </div>

            <AuthInput label="Adresse email" type="email" placeholder="ton@email.com" value={email} onChange={setEmail} />
            <AuthInput label="Mot de passe" type="password" placeholder="••••••••" value={password} onChange={setPassword} showToggle />

            {activeTab === 1 && (
              <>
                <PasswordStrengthBar password={password} />
                <AuthInput label="Confirmer le mot de passe" type="password" placeholder="••••••••" value={confirmPassword} onChange={setConfirmPassword} showToggle />
                {confirmPassword && password !== confirmPassword && (
                  <p style={{ fontSize: 12, color: '#EF4444', margin: '4px 0 0', fontFamily: 'DM Sans, sans-serif' }}>
                    Les mots de passe ne correspondent pas.
                  </p>
                )}

                {/* CGU */}
                <div
                  onClick={() => setAcceptedTerms(t => !t)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 0 16px', cursor: 'pointer' }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                    background: acceptedTerms ? '#06B6D4' : 'transparent',
                    border: `2px solid ${acceptedTerms ? '#06B6D4' : 'rgba(255,255,255,0.3)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 200ms',
                  }}>
                    {acceptedTerms && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
                    J&apos;accepte les{' '}
                    <a href="/legal/cgu" target="_blank" style={{ color: '#06B6D4', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>
                      conditions d&apos;utilisation
                    </a>
                    {' '}et la{' '}
                    <a href="/legal/privacy" target="_blank" style={{ color: '#06B6D4', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>
                      politique de confidentialité
                    </a>
                  </p>
                </div>
              </>
            )}

            {activeTab === 0 && (
              <button onClick={() => { setView('forgot'); setError('') }} style={{
                background: 'none', border: 'none', color: 'rgba(6,182,212,0.7)', fontSize: 13,
                cursor: 'pointer', padding: '0 0 20px', textAlign: 'right', width: '100%',
                fontFamily: 'DM Sans, sans-serif',
              }}>
                Mot de passe oublié ?
              </button>
            )}

            <ErrorMessage error={error} />
            {error && <div style={{ height: 8 }} />}

            <button
              onClick={activeTab === 0 ? handleLogin : handleSignup}
              disabled={loading || (activeTab === 1 && !canSignup)}
              style={{ ...primaryBtn, opacity: loading || (activeTab === 1 && !canSignup) ? 0.4 : 1, cursor: loading || (activeTab === 1 && !canSignup) ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Chargement…' : activeTab === 0 ? 'Se connecter' : 'Créer mon compte'}
            </button>

            <SocialButtons onError={setError} />
          </>
        )}
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
