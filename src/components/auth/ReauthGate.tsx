'use client'

// ══════════════════════════════════════════════════════════════════
// Garde de re-authentification périodique. Sans déconnecter, redemande email +
// mot de passe si la dernière saisie réelle date de plus de 14 jours (ou 90 j si
// « Rester connecté » était coché). Ignorée pour les comptes OAuth (sans mot de
// passe) et sur les pages d'entrée plein écran. Monté dans ClientShell.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isFullscreenRoute } from '@/lib/layout/fullscreenRoutes'
import { useI18n } from '@/lib/i18n'

const DAY = 86_400_000
const FB = 'var(--font-body)', FD = 'var(--font-display)'
const field: React.CSSProperties = {
  width: '100%', height: 48, boxSizing: 'border-box', background: 'var(--input-bg)',
  border: '1px solid var(--border-mid)', borderRadius: 12, padding: '0 14px',
  color: 'var(--text)', fontFamily: FB, fontSize: 15, outline: 'none',
}

export function ReauthGate() {
  const { t } = useI18n()
  const pathname = usePathname()
  const [need, setNeed] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const check = useCallback(async () => {
    if (isFullscreenRoute(pathname)) { setNeed(false); return }
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { setNeed(false); return }
    // Comptes OAuth (sans mot de passe) : pas de re-saisie possible → on ignore.
    const hasPassword = (user.identities ?? []).some(i => i.provider === 'email')
    if (!hasPassword) { setNeed(false); return }
    const last = Number(localStorage.getItem('thw_last_pw_auth') || '0')
    if (!last) { localStorage.setItem('thw_last_pw_auth', String(Date.now())); setNeed(false); return }
    const remember = localStorage.getItem('thw_remember') === '1'
    const threshold = (remember ? 90 : 14) * DAY
    if (Date.now() - last > threshold) { setEmail(user.email ?? ''); setNeed(true) }
    else setNeed(false)
  }, [pathname])

  useEffect(() => { void check() }, [check])

  async function confirm() {
    if (!email || !password) return
    setLoading(true); setError('')
    const sb = createClient()
    const { error: e } = await sb.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (e) { setError(t('authpage.wrongCredentials')); return }
    localStorage.setItem('thw_last_pw_auth', String(Date.now()))
    setPassword(''); setNeed(false)
  }

  async function logout() {
    const sb = createClient()
    await sb.auth.signOut()
    localStorage.removeItem('thw_last_pw_auth')
    window.location.href = '/auth'
  }

  if (!need) return null
  const disabled = loading || !email || !password

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '28px 24px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/logo_4bras.png" alt="" style={{ width: 40, height: 40, objectFit: 'contain', display: 'block', margin: '0 auto 14px' }} />
        <h2 style={{ fontFamily: FD, fontSize: 19, fontWeight: 600, color: 'var(--text)', textAlign: 'center', margin: '0 0 6px' }}>{t('authpage.reauthTitle')}</h2>
        <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', textAlign: 'center', margin: '0 0 20px', lineHeight: 1.5 }}>
          {t('authpage.reauthDesc')}
        </p>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder={t('authpage.emailPlaceholder')} type="email" style={field} />
        <div style={{ height: 10 }} />
        <input value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void confirm() }} placeholder={t('auth.password')} type="password" autoFocus style={field} />
        {error && <p style={{ color: '#EF4444', fontFamily: FB, fontSize: 12, margin: '10px 0 0' }}>{error}</p>}
        <button onClick={() => void confirm()} disabled={disabled} style={{ width: '100%', height: 48, marginTop: 16, borderRadius: 12, border: 'none', background: disabled ? 'var(--bg-card2)' : 'var(--primary-gradient)', color: disabled ? 'var(--text-dim)' : '#fff', fontFamily: FB, fontSize: 15, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer' }}>
          {loading ? t('authpage.verifying') : t('authpage.confirmBtn')}
        </button>
        <button onClick={() => void logout()} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: 'var(--text-dim)', fontFamily: FB, fontSize: 13, cursor: 'pointer' }}>{t('authpage.logout')}</button>
      </div>
    </div>
  )
}
