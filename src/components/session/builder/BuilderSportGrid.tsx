'use client'
// Grille des sports du Builder « Mes séances en réserve ».
// Esthétique Bibliothèque : eyebrow + titre serif + sous-texte, puis grille
// responsive de cartes sport (puce-icône, titre serif, tagline, compteur).
// Une seule action principale (cyan) : + Nouvelle séance.
import { IconChevronRight } from '@tabler/icons-react'
import { useI18n } from '@/lib/i18n'
import { BUILDER_THEME, BUILDER_ORDER, type BuilderSportId, type BuilderSportTheme } from './builderTheme'

const FD = 'var(--font-display)', FB = 'var(--font-body)'

const STYLE = `
.bld-card { transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease; }
.bld-card:hover { border-color: var(--border-mid); box-shadow: var(--shadow-card); transform: translateY(-2px); }
.bld-card:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.bld-chevron { transition: transform .15s ease; }
.bld-card:hover .bld-chevron { transform: translateX(3px); }
@media (prefers-reduced-motion: reduce) {
  .bld-card, .bld-chevron { transition: none; }
  .bld-card:hover { transform: none; }
}
`

function Card({ theme, count, onSelect }: { theme: BuilderSportTheme; count: number; onSelect: (id: BuilderSportId) => void }) {
  const { t } = useI18n()
  const Ic = theme.icon
  return (
    <button className="bld-card" onClick={() => onSelect(theme.id)}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left',
        padding: 'var(--space-5)', minHeight: 150, borderRadius: 'var(--r-lg)', cursor: 'pointer',
        background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div style={{ width: 48, height: 48, borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: theme.soft, color: theme.accent, flexShrink: 0 }}>
        <Ic size={24} />
      </div>
      <h3 style={{ fontFamily: FD, fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: '12px 0 2px' }}>{t(theme.labelKey)}</h3>
      <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>{t(theme.taglineKey)}</p>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 'auto', paddingTop: 'var(--space-4)',
        fontFamily: FB, fontSize: 12.5, fontWeight: 600, color: count > 0 ? theme.accent : 'var(--text-dim)' }}>
        {count > 0 ? t('session.nSeances', { n: count, s: count > 1 ? 's' : '' }) : t('session.aucuneSeance')}
        <IconChevronRight size={15} className="bld-chevron" />
      </span>
    </button>
  )
}

export function BuilderSportGrid({ counts, onSelect }: {
  counts: Record<BuilderSportId, number>
  onSelect: (id: BuilderSportId) => void
}) {
  const { t } = useI18n()
  return (
    <div>
      <style>{STYLE}</style>
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <p style={{ fontFamily: FB, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-dim)', margin: '0 0 6px' }}>
          Builder
        </p>
        <h2 style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px', lineHeight: 1.2 }}>
          {t('session.builderTitle')}
        </h2>
        <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-dim)', margin: 0, maxWidth: 520, lineHeight: 1.5 }}>
          {t('session.builderSubtitle')}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: 'var(--space-4)' }}>
        {BUILDER_ORDER.map(id => (
          <Card key={id} theme={BUILDER_THEME[id]} count={counts[id] ?? 0} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}
