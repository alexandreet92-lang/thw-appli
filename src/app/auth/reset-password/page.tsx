'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [success,         setSuccess]         = useState(false)

  async function handleSubmit() {
    if (!password || !confirmPassword) return
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return }
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSuccess(true)
    setTimeout(() => router.replace('/activities'), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}>
      <div style={{ width: '100%', maxWidth: 380, padding: '0 24px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img src="/logos/logo_4bras.png" alt="Hybrid" style={{ width: 40, height: 40 }} />
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: '10px 0 4px', letterSpacing: '-0.5px', fontFamily: 'Syne, sans-serif' }}>
            Hybrid
          </h2>
        </div>

        <h3 style={{ color: 'white', fontSize: 20, fontWeight: 700, margin: '0 0 8px', fontFamily: 'Syne, sans-serif' }}>
          Nouveau mot de passe
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '0 0 24px', fontFamily: 'DM Sans, sans-serif' }}>
          Choisis un nouveau mot de passe pour ton compte.
        </p>

        {success ? (
          <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', textAlign: 'center' }}>
            <p style={{ color: '#10B981', fontSize: 15, fontWeight: 600, margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
              Mot de passe mis à jour ! Redirection…
            </p>
          </div>
        ) : (
          <>
            <AuthInput label="Nouveau mot de passe" type="password" placeholder="••••••••" value={password} onChange={setPassword} showToggle />
            <AuthInput label="Confirmer le mot de passe" type="password" placeholder="••••••••" value={confirmPassword} onChange={setConfirmPassword} showToggle />

            {error && (
              <p style={{ textAlign: 'center', color: '#EF4444', fontSize: 13, margin: '0 0 12px', fontFamily: 'DM Sans, sans-serif' }}>
                {error}
              </p>
            )}

            <button onClick={handleSubmit} disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
