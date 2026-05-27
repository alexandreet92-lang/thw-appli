'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AuthInput } from '@/components/auth/AuthInput'

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

function AuthPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const expired = params.get('expired') === '1'

  const [activeTab,       setActiveTab]       = useState(0) // 0=login, 1=signup
  const [view,            setView]            = useState<'auth' | 'forgot'>('auth')
  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState<string | null>(expired ? 'Session expirée. Reconnecte-toi.' : null)
  const [resetSent,       setResetSent]       = useState(false)

  useEffect(() => {
    if (expired) setError('Session expirée. Reconnecte-toi.')
  }, [expired])

  async function handleLogin() {
    if (!email || !password) return
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError('Email ou mot de passe incorrect.'); return }
    localStorage.setItem('last_auth_date', Date.now().toString())
    router.replace('/activities')
    router.refresh()
  }

  async function handleSignup() {
    if (!email || !password) return
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return }
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/activities` },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    localStorage.setItem('last_auth_date', Date.now().toString())
    setError(null)
    router.replace('/activities')
    router.refresh()
  }

  async function handleForgotPassword() {
    if (!email) { setError('Entre ton email.'); return }
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setResetSent(true)
  }

  const Logo = () => (
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

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}>
      <div style={{ width: '100%', maxWidth: 380, padding: '0 24px' }}>

        <Logo />

        {view === 'forgot' ? (
          <>
            <button
              onClick={() => { setView('auth'); setError(null); setResetSent(false) }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer', padding: '0 0 20px', fontFamily: 'DM Sans, sans-serif' }}
            >
              ← Retour
            </button>
            <h3 style={{ color: 'white', fontSize: 20, fontWeight: 700, margin: '0 0 8px', fontFamily: 'Syne, sans-serif' }}>
              Réinitialiser le mot de passe
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '0 0 24px', fontFamily: 'DM Sans, sans-serif' }}>
              Entre ton email. Un lien de réinitialisation sera envoyé.
            </p>
            <AuthInput label="Email" type="email" placeholder="ton@email.com" value={email} onChange={setEmail} />
            {error && <p style={{ textAlign: 'center', color: '#EF4444', fontSize: 13, margin: '0 0 12px', fontFamily: 'DM Sans, sans-serif' }}>{error}</p>}
            <button onClick={handleForgotPassword} disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
            {resetSent && (
              <div style={{ padding: '12px 16px', borderRadius: 12, marginTop: 16, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                <p style={{ color: '#10B981', fontSize: 13, margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
                  Email envoyé. Vérifie ta boîte mail.
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Onglets */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 4, marginBottom: 28 }}>
              {['Connexion', 'Créer un compte'].map((tab, i) => (
                <button key={i} onClick={() => { setActiveTab(i); setError(null) }} style={{
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
              <AuthInput label="Confirmer le mot de passe" type="password" placeholder="••••••••" value={confirmPassword} onChange={setConfirmPassword} showToggle />
            )}

            {activeTab === 0 && (
              <button onClick={() => { setView('forgot'); setError(null) }} style={{
                background: 'none', border: 'none', color: 'rgba(6,182,212,0.7)', fontSize: 13,
                cursor: 'pointer', padding: '0 0 20px', textAlign: 'right', width: '100%',
                fontFamily: 'DM Sans, sans-serif',
              }}>
                Mot de passe oublié ?
              </button>
            )}

            {activeTab === 1 && <div style={{ height: 20 }} />}

            {error && <p style={{ textAlign: 'center', color: '#EF4444', fontSize: 13, margin: '0 0 12px', fontFamily: 'DM Sans, sans-serif' }}>{error}</p>}

            <button
              onClick={activeTab === 0 ? handleLogin : handleSignup}
              disabled={loading}
              style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Chargement...' : activeTab === 0 ? 'Se connecter' : 'Créer mon compte'}
            </button>
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
