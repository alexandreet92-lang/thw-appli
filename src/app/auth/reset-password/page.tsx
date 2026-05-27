'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AuthInput } from '@/components/auth/AuthInput'
import { ErrorMessage } from '@/components/auth/ErrorMessage'
import { PasswordStrengthBar } from '@/components/auth/PasswordStrengthBar'
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

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)

  useEffect(() => {
    const sb = createClient()
    const { data: { subscription } } = sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Token valide — l'utilisateur peut maintenant changer son mot de passe
      }
    })
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
    localStorage.setItem('last_auth_date', Date.now().toString())
    setSuccess(true)
    setTimeout(() => router.replace('/'), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}>
      <style>{`@keyframes scale-in{from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
      <div style={{ width: '100%', maxWidth: 380, padding: '0 24px' }}>

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
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
              Mot de passe modifié
            </h3>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
              Redirection en cours…
            </p>
          </div>
        ) : (
          <>
            <h3 style={{ color: 'white', fontSize: 22, fontWeight: 700, margin: '0 0 8px', textAlign: 'center', fontFamily: 'Syne, sans-serif' }}>
              Nouveau mot de passe
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: '0 0 28px', textAlign: 'center', lineHeight: 1.5, fontFamily: 'DM Sans, sans-serif' }}>
              Choisis un mot de passe sécurisé d&apos;au moins 6 caractères.
            </p>

            <AuthInput label="Nouveau mot de passe" type="password" placeholder="••••••••" value={password} onChange={setPassword} showToggle />
            <PasswordStrengthBar password={password} />
            <div style={{ height: 16 }} />
            <AuthInput label="Confirmer le mot de passe" type="password" placeholder="••••••••" value={confirm} onChange={setConfirm} showToggle />

            {confirm && password !== confirm && (
              <p style={{ fontSize: 12, color: '#EF4444', margin: '4px 0 0', fontFamily: 'DM Sans, sans-serif' }}>
                Les mots de passe ne correspondent pas.
              </p>
            )}

            <ErrorMessage error={error} />
            <div style={{ height: 24 }} />

            <button
              onClick={handleReset}
              disabled={loading || isDisabled}
              style={{ ...primaryBtn, opacity: loading || isDisabled ? 0.5 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Modification…' : 'Modifier le mot de passe'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
