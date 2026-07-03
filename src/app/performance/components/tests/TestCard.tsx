'use client'
// Carte de test — patron unique (DESIGN_SYSTEM.md). Fond --bg-card2, aucune bordure
// colorée, ombre douce au survol (.card-interactive). Tag d'intensité = point + label
// (fonctionnel, support minimal). Chiffres neutres tabulaires. Tokens uniquement.
import { useI18n } from '@/lib/i18n'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const INTENSITY: Record<string, string> = {
  'Modéré': 'var(--charge-low)', 'Intense': 'var(--charge-mid)', 'Maximal': 'var(--charge-hard)',
}
const inten = (d: string) => INTENSITY[d] ?? 'var(--text-mid)'

interface TestLike { name: string; desc: string; duration: string; difficulty: string }

export function TestCard({ test, onOpen }: { test: TestLike; onOpen: () => void }) {
  const { t } = useI18n()
  const c = inten(test.difficulty)
  return (
    <div className="card-interactive" role="button" tabIndex={0} onClick={onOpen}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onOpen() }}
      style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-1)' }}>
          <h3 style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--text)' }}>{test.name}</h3>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: FB, fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: c }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />{test.difficulty}
          </span>
        </div>
        <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', margin: 0, lineHeight: 1.6, display: '-webkit-box', WebkitBoxOrient: 'vertical' as const, WebkitLineClamp: 2, overflow: 'hidden' }}>{test.desc}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
          <span className="tnum" style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)' }}>{test.duration}</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: FB, fontSize: 11, fontWeight: 600, color: 'var(--primary)' }}>
          {t('performance.viewProtocol')}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M9 18l6-6-6-6" /></svg>
        </span>
      </div>
    </div>
  )
}
