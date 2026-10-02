'use client'

// Changement de mot de passe (utilisateur connecté) — même grammaire que les
// écrans d'entrée Hybrid. Minimum aligné sur l'inscription (8 caractères).
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AuthInput } from '@/components/auth/AuthInput'
import { ErrorMessage } from '@/components/auth/ErrorMessage'
import { PasswordStrengthBar } from '@/components/auth/PasswordStrengthBar'
import { AUTH_CSS, FS, AuthHeading, AuthScreen, BackButton, BrandMark, PrimaryPill, SuccessNote } from '@/components/auth/AuthKit'
import { getAuthError } from '@/lib/auth/errors'
import { useI18n } from '@/lib/i18n'

const PW_MIN = 8

export default function UpdatePasswordPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit() {
    if (loading) return
    if (password !== confirm) { setError(t('auth.pwMismatch')); return }
    if (password.length < PW_MIN) { setError(t('au.pwMin')); return }
    setLoading(true)
    setError('')
    const { error: e } = await createClient().auth.updateUser({ password })
    setLoading(false)
    if (e) { setError(getAuthError(e)); return }
    try {
      const now = Date.now().toString()
      localStorage.setItem('last_auth_date', now)
      localStorage.setItem('thw_last_pw_auth', now)
    } catch { /* ignore */ }
    setSuccess(t('authpage.pwUpdatedRedirect'))
    setTimeout(() => router.push('/profile'), 2000)
  }

  return (
    <AuthScreen>
      <style>{AUTH_CSS}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackButton onClick={() => router.back()} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginRight: 4 }}>
          <BrandMark size={26} />
          <span style={{ fontFamily: FS, fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--text)' }}>Hybrid</span>
        </span>
      </div>
      <AuthHeading title={t('authpage.newPassword')} sub={t('authpage.chooseNewPassword')} />
      <form noValidate onSubmit={e => { e.preventDefault(); void handleSubmit() }}>
        <AuthInput label={t('authpage.newPassword')} type="password" placeholder="••••••••" value={password} onChange={setPassword}
          showToggle autoComplete="new-password" hint={password.length < PW_MIN ? t('au.pwMin') : undefined} />
        <PasswordStrengthBar password={password} />
        <AuthInput label={t('auth.confirm')} type="password" placeholder="••••••••" value={confirm} onChange={setConfirm}
          showToggle autoComplete="new-password" error={confirm && password !== confirm ? t('auth.pwMismatch') : undefined} />
        <ErrorMessage error={error} />
        <div style={{ height: 8 }} />
        <PrimaryPill type="submit" loading={loading} disabled={!password || !confirm || !!success}>
          {t('authpage.updatePasswordBtn')}
        </PrimaryPill>
      </form>
      {success && <SuccessNote>{success}</SuccessNote>}
    </AuthScreen>
  )
}
