'use client'

export const dynamic = 'force-dynamic'

import { useTheme } from '@/hooks/useTheme'
import { useI18n } from '@/lib/i18n'
import { Header, Footer, TopupStyles, ArrowRight, Receipt, APP_URL } from '../shared'

export default function TopupSuccessPage() {
  useTheme()
  const { t } = useI18n()

  return (
    <div className="topup-root" style={{ display: 'flex', flexDirection: 'column' }}>
      <TopupStyles />
      <Header />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '56px 24px', minHeight: '60vh' }}>
        <div style={{ maxWidth: 470, width: '100%', textAlign: 'center', animation: 'topupPop 0.55s cubic-bezier(0.34,1.3,0.6,1) both' }}>
          {/* Check animé */}
          <svg width="84" height="84" viewBox="0 0 84 84" style={{ marginBottom: 22 }}>
            <circle cx="42" cy="42" r="38" fill="rgba(34,197,94,0.06)" stroke="none" />
            <circle cx="42" cy="42" r="38" fill="none" stroke="#22c55e" strokeWidth="4" strokeLinecap="round"
              strokeDasharray="239" strokeDashoffset="239" transform="rotate(-90 42 42)"
              style={{ animation: 'topupDrawCircle 0.6s 0.1s cubic-bezier(0.4,0,0.2,1) forwards' }} />
            <path d="M27 43 l11 11 l20 -22" fill="none" stroke="#22c55e" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="58" strokeDashoffset="58" style={{ animation: 'topupDrawCheck 0.4s 0.66s cubic-bezier(0.4,0,0.2,1) forwards' }} />
          </svg>

          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text)', marginBottom: 12 }}>{t('misc.paymentConfirmed')}</h1>
          <p style={{ fontSize: 16, color: 'var(--text-mid)', marginBottom: 28, lineHeight: 1.5 }}>
            {t('misc.tokensAddedBody')}
          </p>

          <div className="topup-card" style={{ padding: '18px 22px', textAlign: 'left', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
              {t('misc.creditInstantNote')}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <a href={APP_URL} className="btn-primary-lg" style={{ justifyContent: 'center', width: '100%' }}>{t('misc.returnToApp')} <ArrowRight size={15} /></a>
            <a href="mailto:support@thwcoaching.com" className="btn-ghost-lg" style={{ justifyContent: 'center', width: '100%' }}><Receipt size={15} /> {t('misc.needReceipt')}</a>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 18 }}>{t('misc.receiptSentNote')}</p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
