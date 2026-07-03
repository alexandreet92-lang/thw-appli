'use client'
// Écran grille des sports. Eyebrow + titre serif + sous-texte, puis grille
// responsive 2→4 colonnes de SportCard. Styles hover/focus + reduced-motion
// via une feuille scopée (focus clavier visible, respect des préférences).
import { useI18n } from '@/lib/i18n'
import { SportCard } from './SportCard'
import { SPORT_THEME, SPORT_ORDER, type SportId } from './sportTheme'

const FD = 'var(--font-display)', FB = 'var(--font-body)'

const STYLE = `
.lib-card { transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease; }
.lib-card:hover { border-color: var(--border-mid); box-shadow: var(--shadow-card); transform: translateY(-2px); }
.lib-card:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.lib-chevron { transition: transform .15s ease; }
.lib-card:hover .lib-chevron { transform: translateX(3px); }
@media (prefers-reduced-motion: reduce) {
  .lib-card, .lib-chevron { transition: none; }
  .lib-card:hover { transform: none; }
}
`

export function SportGrid({ onSelect }: { onSelect: (id: SportId) => void }) {
  const { t } = useI18n()
  return (
    <div>
      <style>{STYLE}</style>
      <p style={{ fontFamily: FB, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-dim)', margin: '0 0 6px' }}>
        {t('session.biblioEyebrow')}
      </p>
      <h2 style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px', lineHeight: 1.2 }}>
        {t('session.biblioTitle')}
      </h2>
      <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-dim)', margin: '0 0 24px', maxWidth: 560, lineHeight: 1.5 }}>
        {t('session.biblioSubtitle')}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: 'var(--space-4)' }}>
        {SPORT_ORDER.map(id => (
          <SportCard key={id} theme={SPORT_THEME[id]} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}
