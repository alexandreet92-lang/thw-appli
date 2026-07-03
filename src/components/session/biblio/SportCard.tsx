'use client'
// Carte sport de la grille Bibliothèque. `live` = cliquable ; `soon` = grisée,
// non cliquable / non focusable (aria-disabled, tabIndex -1).
import { IconChevronRight } from '@tabler/icons-react'
import { useI18n } from '@/lib/i18n'
import type { SportTheme } from './sportTheme'

const FD = 'var(--font-display)', FB = 'var(--font-body)'

export function SportCard({ theme, onSelect }: { theme: SportTheme; onSelect: (id: SportTheme['id']) => void }) {
  const { t } = useI18n()
  const Ic = theme.icon
  const soon = theme.status === 'soon'

  const chip = (
    <div style={{ width: 48, height: 48, borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: soon ? 'var(--bg-elev)' : theme.soft, color: soon ? 'var(--text-dim)' : theme.accent, flexShrink: 0 }}>
      <Ic size={24} />
    </div>
  )
  const title = (
    <h3 style={{ fontFamily: FD, fontSize: 16, fontWeight: 600, color: soon ? 'var(--text-mid)' : 'var(--text)', margin: '12px 0 2px' }}>{theme.label}</h3>
  )
  const tagline = (
    <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>{theme.tagline}</p>
  )

  if (soon) {
    return (
      <div className="lib-card lib-card--soon" aria-disabled="true" tabIndex={-1}
        style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: 'var(--space-5)',
          minHeight: 150, borderRadius: 'var(--r-lg)', background: 'var(--bg-card2)', border: '1px solid var(--border)', opacity: 0.6 }}>
        <span style={{ position: 'absolute', top: 'var(--space-4)', right: 'var(--space-4)', padding: '3px 9px', borderRadius: 999,
          background: 'var(--bg-elev)', color: 'var(--text-dim)', fontFamily: FB, fontSize: 10, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('session.bientot')}</span>
        {chip}{title}{tagline}
      </div>
    )
  }

  return (
    <button className="lib-card" onClick={() => onSelect(theme.id)}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left',
        padding: 'var(--space-5)', minHeight: 150, borderRadius: 'var(--r-lg)', cursor: 'pointer',
        background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {chip}{title}{tagline}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 'auto', paddingTop: 'var(--space-4)',
        fontFamily: FB, fontSize: 12.5, fontWeight: 600, color: theme.accent }}>
        {t('session.explorer')} <IconChevronRight size={15} className="lib-chevron" />
      </span>
    </button>
  )
}
