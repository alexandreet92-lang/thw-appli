'use client'

export const dynamic = 'force-dynamic'

import { useTheme } from '@/hooks/useTheme'
import { AlertCircle } from 'lucide-react'
import { Header, Footer, TopupStyles, ArrowRight, APP_URL } from '../shared'

export default function TopupExpiredPage() {
  useTheme()

  return (
    <div className="topup-root" style={{ display: 'flex', flexDirection: 'column' }}>
      <TopupStyles />
      <Header />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '56px 24px', minHeight: '60vh' }}>
        <div style={{ maxWidth: 430, width: '100%', textAlign: 'center', animation: 'topupRise 0.5s cubic-bezier(0.4,0,0.2,1) both' }}>
          <div style={{ width: 74, height: 74, borderRadius: '50%', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245,158,11,0.10)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', boxShadow: '0 0 28px rgba(245,158,11,0.18)' }}>
            <AlertCircle size={36} />
          </div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(26px, 4vw, 32px)', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text)', marginBottom: 12 }}>Lien expiré</h1>
          <p style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.6, marginBottom: 28 }}>
            Ce lien d&apos;achat a expiré ou a déjà été utilisé. Retourne dans l&apos;app et demande un nouveau lien pour recharger en tokens.
          </p>
          <a href={APP_URL} className="btn-primary-lg" style={{ justifyContent: 'center' }}>Retour à l&apos;app <ArrowRight size={15} /></a>
        </div>
      </main>
      <Footer />
    </div>
  )
}
