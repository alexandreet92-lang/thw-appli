'use client'

// ══════════════════════════════════════════════════════════════
// ReadinessCard — score readiness du jour + détail des composantes
// (check-in / HRV / TSB). Composantes inactives affichées "n/a".
// Sans check-in du jour → "—" + invite à compléter le check-in.
// Tokens DS uniquement.
// ══════════════════════════════════════════════════════════════

import type { ReadinessResult, ReadinessKey } from '@/lib/recovery/computeReadiness'
import { useI18n } from '@/lib/i18n'

const NUM = { fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums' as const, fontFeatureSettings: "'zero' 0" }
const LABELS: Record<ReadinessKey, string> = { checkin: 'check-in', hrv: 'HRV', tsb: 'TSB' }

function scoreColor(s: number): string {
  if (s >= 75) return 'var(--charge-low)'
  if (s >= 50) return 'var(--charge-mid)'
  return 'var(--charge-hard)'
}

export default function ReadinessCard({ result }: { result: ReadinessResult | null }) {
  const { t } = useI18n()
  const has = result != null && result.score != null

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 20, boxShadow: 'var(--shadow-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ width: 7, height: 7, borderRadius: 2, background: 'var(--rec-readiness)', flexShrink: 0 }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text)' }}>{t('recovery.readiness.title')}</h2>
      </div>

      {has ? (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <span style={{ ...NUM, fontSize: 40, fontWeight: 600, color: scoreColor(result!.score as number), lineHeight: 1 }}>
              {result!.score}<span style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 400 }}> /100</span>
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {result!.components.map(c => (
              <span key={c.key} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5, padding: '5px 10px', borderRadius: 999,
                background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-mid)', fontWeight: 600 }}>{LABELS[c.key]}</span>
                <span style={{ ...NUM, fontSize: 12, fontWeight: 600, color: c.active ? 'var(--text)' : 'var(--text-dim)' }}>
                  {c.active ? c.value : 'n/a'}
                </span>
              </span>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{ ...NUM, fontSize: 40, fontWeight: 600, color: 'var(--text-dim)', lineHeight: 1, marginBottom: 8 }}>—</div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-mid)', margin: 0 }}>
            {t('recovery.readiness.empty')}
          </p>
        </>
      )}
    </div>
  )
}
