'use client'
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { ALL_FIELDS, FIELD_CATEGORIES, type DataField, type FieldCategory } from '@/types/cycling'

interface ThemeColors { bg: string; text: string; dim: string; separator: string; cardBg: string }

interface Props {
  open: boolean
  excludeIds: string[]
  onClose: () => void
  onSelect: (fieldId: string) => void
  theme: ThemeColors
}

export default function FieldPicker({ open, excludeIds, onClose, onSelect, theme }: Props) {
  const { t } = useI18n()
  const [closing, setClosing] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<FieldCategory | null>(null)

  useEffect(() => {
    if (open) { setClosing(false); setSearch(''); setSelectedCategory(null) }
  }, [open])
  if (!open) return null

  const handleClose = () => { setClosing(true); setTimeout(onClose, 230) }
  const selectField = (id: string) => { onSelect(id); handleClose() }

  const CategoryList = () => (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {(Object.entries(FIELD_CATEGORIES) as [FieldCategory, string][]).map(([catId, catLabel]) => {
        const available = ALL_FIELDS.filter(f => f.category === catId && !excludeIds.includes(f.id))
        if (available.length === 0) return null
        return (
          <button
            key={catId}
            onClick={() => setSelectedCategory(catId)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              padding: '16px 20px', background: 'none', border: 'none',
              cursor: 'pointer', borderBottom: `1px solid ${theme.separator}`,
              textAlign: 'left', fontFamily: 'DM Sans, sans-serif',
            }}
          >
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 16, color: theme.text, margin: 0, fontWeight: 500 }}>
                {catLabel}
              </p>
              <p style={{ fontSize: 12, color: '#8C8C8C', margin: '3px 0 0' }}>
                {t('record.fieldPickerAvailable', { n: available.length })}
              </p>
            </div>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 3l4 4-4 4" stroke="#8C8C8C" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        )
      })}
    </div>
  )

  const FieldList = ({ catId }: { catId: FieldCategory }) => {
    const fields = ALL_FIELDS.filter(f => f.category === catId && !excludeIds.includes(f.id))
    return (
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {fields.map(field => (
          <FieldRow key={field.id} field={field} theme={theme} onClick={() => selectField(field.id)} />
        ))}
      </div>
    )
  }

  const SearchResults = ({ query }: { query: string }) => {
    const q = query.toLowerCase()
    const matched = ALL_FIELDS.filter(f =>
      f.label.toLowerCase().includes(q) && !excludeIds.includes(f.id)
    )
    return (
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {matched.map(field => (
          <FieldRow
            key={field.id} field={field} theme={theme}
            onClick={() => selectField(field.id)}
            categoryLabel={FIELD_CATEGORIES[field.category as FieldCategory]}
          />
        ))}
        {matched.length === 0 && (
          <p style={{ textAlign: 'center', color: theme.dim, fontSize: 14, padding: '32px 20px' }}>
            {t('record.fieldPickerNoMatch')}
          </p>
        )}
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10006 }}>
      <div
        onClick={handleClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
          opacity: closing ? 0 : 1, transition: 'opacity 200ms',
        }}
      />
      <div
        className={closing ? 'sheet-close' : 'sheet-open'}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: '80vh',
          background: theme.bg,
          borderRadius: '24px 24px 0 0',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'DM Sans, sans-serif',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: theme.separator }}/>
        </div>

        {/* Header dynamique */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px 8px', gap: 12 }}>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                       color: theme.text, padding: '4px 8px 4px 0', flexShrink: 0 }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          )}
          <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.text, margin: 0, flex: 1, fontFamily: 'Syne, sans-serif' }}>
            {selectedCategory ? FIELD_CATEGORIES[selectedCategory] : t('record.fieldPickerTitle')}
          </h2>
          <button onClick={handleClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8C8C8C', fontSize: 22, lineHeight: 1, padding: '4px 8px' }}>
            ×
          </button>
        </div>

        {/* Barre de recherche */}
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{
            background: theme.cardBg, borderRadius: 12, border: `1px solid ${theme.separator}`,
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke={theme.dim} strokeWidth="1.5"/>
              <path d="M11 11l3 3" stroke={theme.dim} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              placeholder={t('record.fieldPickerSearch')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ background: 'none', border: 'none', outline: 'none', color: theme.text, fontSize: 15, flex: 1, fontFamily: 'DM Sans, sans-serif' }}
            />
          </div>
        </div>

        {/* Contenu selon état */}
        {search.trim()
          ? <SearchResults query={search} />
          : selectedCategory
            ? <FieldList catId={selectedCategory} />
            : <CategoryList />
        }
      </div>
    </div>
  )
}

function FieldRow({ field, theme, onClick, categoryLabel }: {
  field: DataField; theme: ThemeColors; onClick: () => void; categoryLabel?: string
}) {
  const { t } = useI18n()
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '15px 20px', background: 'none', border: 'none',
        cursor: 'pointer', borderBottom: `1px solid ${theme.separator}`,
        textAlign: 'left', fontFamily: 'DM Sans, sans-serif',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {categoryLabel && (
          <p style={{ fontSize: 10, color: '#8C8C8C', margin: '0 0 2px',
                      textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {categoryLabel}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15, color: theme.text, fontWeight: 400 }}>
            {field.label}
          </span>
          {field.unit && <span style={{ fontSize: 12, color: '#8C8C8C' }}>{field.unit}</span>}
          {field.type === 'chart' && (
            <span style={{ fontSize: 10, color: '#06B6D4',
                           border: '1px solid rgba(6,182,212,0.4)',
                           borderRadius: 4, padding: '1px 5px' }}>{t('record.fieldPickerBadgeChart')}</span>
          )}
          {field.type === 'climb_profile' && (
            <span style={{ fontSize: 10, color: '#06B6D4',
                           border: '1px solid rgba(139,92,246,0.4)',
                           borderRadius: 4, padding: '1px 5px' }}>{t('record.fieldPickerBadgeVisual')}</span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {field.requiresSensor && (
          <span style={{ fontSize: 10, color: 'rgba(239,68,68,0.7)',
                         border: '1px solid rgba(239,68,68,0.3)',
                         borderRadius: 4, padding: '2px 6px' }}>{t('record.fieldPickerBadgeSensor')}</span>
        )}
        {field.requiresRoute && (
          <span style={{ fontSize: 10, color: 'rgba(234,179,8,0.8)',
                         border: '1px solid rgba(234,179,8,0.3)',
                         borderRadius: 4, padding: '2px 6px' }}>{t('record.fieldPickerBadgeRoute')}</span>
        )}
      </div>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M5 3l4 4-4 4" stroke="#8C8C8C" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    </button>
  )
}
