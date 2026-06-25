'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'

interface Props {
  email: string
  onBack: () => void
}

export function EmailVerification({ email, onBack }: Props) {
  const { t } = useI18n()
  const [resent,     setResent]     = useState(false)
  const [resending,  setResending]  = useState(false)
  const [countdown,  setCountdown]  = useState(0)

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleResend = async () => {
    setResending(true)
    const sb = createClient()
    await sb.auth.resend({ type: 'signup', email })
    setResending(false)
    setResent(true)
    setCountdown(60)
  }

  return (
    <div style={{ width: '100%', maxWidth: 380, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
      <style>{`
        @keyframes ev-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        @keyframes ev-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
      `}</style>

      <div style={{
        width: 100, height: 100, margin: '0 auto 32px',
        background: 'rgba(6,182,212,0.1)', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'ev-pulse 3s ease-in-out infinite',
      }}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="4" y="10" width="40" height="28" rx="3" stroke="#06B6D4" strokeWidth="2"/>
          <path d="M4 14l20 14 20-14" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="36" cy="12" r="5" fill="#10B981" style={{ animation: 'ev-bounce 1s ease-in-out infinite' }}/>
        </svg>
      </div>

      <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: '0 0 12px', fontFamily: 'var(--font-display)' }}>
        {t('verify.title')}
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.6, margin: '0 0 8px', fontFamily: 'var(--font-body)' }}>
        {t('verify.sentTo')}
      </p>
      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--primary)', margin: '0 0 32px', padding: '8px 16px', borderRadius: 8, background: 'var(--primary-dim)', display: 'inline-block', fontFamily: 'var(--font-body)' }}>
        {email}
      </p>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 24px', lineHeight: 1.5, fontFamily: 'var(--font-body)' }}>
        {t('verify.activate')}
      </p>

      <button
        onClick={handleResend}
        disabled={resending || countdown > 0}
        style={{
          width: '100%', height: 48, borderRadius: 12, marginBottom: 12,
          background: resent ? 'rgba(16,185,129,0.15)' : 'var(--bg-card2)',
          border: `1px solid ${resent ? 'rgba(16,185,129,0.4)' : 'var(--border-mid)'}`,
          color: resent ? '#10B981' : countdown > 0 ? 'var(--text-dim)' : 'var(--text)',
          fontSize: 14, cursor: countdown > 0 ? 'not-allowed' : 'pointer',
          transition: 'all 200ms', fontFamily: 'var(--font-body)',
        }}
      >
        {resending ? t('verify.resending') : resent ? t('verify.resent') : countdown > 0 ? t('verify.resendIn', { s: countdown }) : t('verify.resend')}
      </button>

      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
        {t('verify.back')}
      </button>
    </div>
  )
}
