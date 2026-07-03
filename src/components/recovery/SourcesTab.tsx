'use client'

// ══════════════════════════════════════════════════════════════
// SourcesTab — statut honnête des sources Récupération.
// Polar EST connecté (HRV/recharge remontent) ; seul l'accès étendu
// au sommeil détaillé est en attente. Pas de "Sommeil KO".
// ══════════════════════════════════════════════════════════════

import { useI18n } from '@/lib/i18n'

export default function SourcesTab({ hrvActive }: { hrvActive: boolean }) {
  const { t } = useI18n()
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 20, boxShadow: 'var(--shadow-card)' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: 'var(--text)' }}>{t('recovery.sources.title')}</h2>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 14, background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--charge-low)', flexShrink: 0, marginTop: 5 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Polar</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: 'var(--charge-low)' }}>{t('recovery.status.connected')}</span>
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--text-mid)', margin: '4px 0 0', lineHeight: 1.5 }}>
            {t('recovery.sources.hrvRecharge')} {hrvActive ? t('recovery.sources.active') : t('recovery.sources.waitingFirstNight')}
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--text-dim)', margin: '2px 0 0', lineHeight: 1.5 }}>
            {t('recovery.sources.detailedSleep')}
          </p>
        </div>
      </div>
    </div>
  )
}
