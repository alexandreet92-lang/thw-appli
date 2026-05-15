import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Accès suspendu — THW Coaching',
}

const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_SITE_URL ?? 'https://thw-coaching.com'

export default function AccessExpiredPage() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg, #0c0e14)',
      padding: '24px',
    }}>
      <div style={{
        maxWidth: 440,
        width: '100%',
        background: 'var(--bg-card, #12151e)',
        border: '1px solid var(--border, rgba(255,255,255,0.08))',
        borderRadius: 20,
        padding: '40px 36px',
        textAlign: 'center',
      }}>
        {/* Icône */}
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.4)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        {/* Titre */}
        <h1 style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--text, #f0f0f0)',
          margin: '0 0 12px',
        }}>
          Ton accès est suspendu
        </h1>

        {/* Message */}
        <p style={{
          fontSize: 13,
          lineHeight: 1.65,
          color: 'var(--text-dim, #8a8fa8)',
          margin: '0 0 8px',
        }}>
          Ton période d'essai ou ton abonnement n'est plus actif.
        </p>
        <p style={{
          fontSize: 13,
          lineHeight: 1.65,
          color: 'var(--text-dim, #8a8fa8)',
          margin: '0 0 32px',
        }}>
          Pour réactiver ton accès, consulte tes emails ou visite notre site.
        </p>

        {/* CTA */}
        <a
          href={MARKETING_URL}
          style={{
            display: 'inline-block',
            padding: '13px 28px',
            borderRadius: 10,
            background: 'linear-gradient(135deg, #00c8e0, #5b6fff)',
            color: '#fff',
            fontFamily: 'Syne, sans-serif',
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'opacity 0.15s',
          }}
        >
          Visiter notre site
        </a>
      </div>
    </main>
  )
}
