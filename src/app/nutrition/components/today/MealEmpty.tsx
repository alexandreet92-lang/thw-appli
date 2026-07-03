'use client'
// Carte d'un repas VIDE : compacte. Label + « Aucun aliment » + rangée d'actions compactes
// (Photo IA / Recherche / Manuel) pour ajouter le 1er aliment. Tokens uniquement.
import { MealActions } from './MealActions'
import { useI18n } from '@/lib/i18n'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

export function MealEmpty({ slotLabel, onPhoto, onSearch, onAdd }: {
  slotLabel: string
  onPhoto: () => void
  onSearch: () => void
  onAdd: () => void
}) {
  const { t } = useI18n()
  return (
    <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-3) var(--space-4)', boxSizing: 'border-box', width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
        <span style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slotLabel}</span>
        <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', flexShrink: 0 }}>{t('nutrition.today.noFood')}</span>
      </div>
      <MealActions onPhoto={onPhoto} onSearch={onSearch} onManual={onAdd} />
    </div>
  )
}