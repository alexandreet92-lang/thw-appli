'use client'
import { useEffect, useState } from 'react'
import { ALL_FIELDS, FIELD_CATEGORIES, type DataField, type FieldCategory } from '@/types/cycling'

interface ThemeColors { bg: string; text: string; dim: string; separator: string; cardBg: string }

interface Props {
  open: boolean
  excludeIds: string[]            // déjà présents dans la page
  onClose: () => void
  onSelect: (fieldId: string) => void
  theme: ThemeColors
}

export default function FieldPicker({ open, excludeIds, onClose, onSelect, theme }: Props) {
  const [closing, setClosing] = useState(false)
  const [search, setSearch] = useState('')
  useEffect(() => { if (open) { setClosing(false); setSearch('') } }, [open])
  if (!open) return null
  const handleClose = () => { setClosing(true); setTimeout(onClose, 210) }

  const categories = Object.entries(FIELD_CATEGORIES) as [FieldCategory, string][]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10006,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
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
          position: 'fixed', left: 0, right: 0, bottom: 0,
          height: '80vh',
          background: theme.bg, color: theme.text,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          fontFamily: 'DM Sans, sans-serif',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: theme.separator }}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 8px' }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: theme.text, margin: 0, fontFamily: 'Syne, sans-serif' }}>
            Choisir un champ
          </h2>
          <button onClick={handleClose} aria-label="Fermer"
            style={{ color: theme.dim, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '4px 8px' }}>×</button>
        </div>
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
              placeholder="Rechercher"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ background: 'none', border: 'none', outline: 'none', color: theme.text, fontSize: 15, flex: 1, fontFamily: 'DM Sans, sans-serif' }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {categories.map(([catId, catLabel]) => {
            const catFields = ALL_FIELDS.filter(f =>
              f.category === catId &&
              f.label.toLowerCase().includes(search.toLowerCase()) &&
              !excludeIds.includes(f.id)
            )
            if (catFields.length === 0) return null
            return (
              <div key={catId}>
                <p style={{
                  fontSize: 11, fontWeight: 700, color: theme.dim,
                  padding: '14px 20px 6px', margin: 0,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  {catLabel}
                </p>
                {catFields.map(f => (
                  <FieldRow key={f.id} field={f} theme={theme} onClick={() => onSelect(f.id)} />
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function FieldRow({ field, theme, onClick }: { field: DataField; theme: ThemeColors; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '13px 20px', background: 'none', border: 'none', cursor: 'pointer',
        borderBottom: `1px solid ${theme.separator}`, textAlign: 'left',
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 15, color: theme.text }}>{field.label}</span>
        {field.unit && <span style={{ fontSize: 12, color: theme.dim, marginLeft: 6 }}>{field.unit}</span>}
        {field.type === 'chart' && <TypePill color="#06B6D4">GRAPHIQUE</TypePill>}
        {field.type === 'climb_profile' && <TypePill color="#8B5CF6">VISUEL</TypePill>}
      </div>
      {field.requiresSensor && <Tag color="rgba(239,68,68,0.65)" border="rgba(239,68,68,0.30)">capteur</Tag>}
      {field.requiresRoute  && <Tag color="rgba(234,179,8,0.85)" border="rgba(234,179,8,0.35)">parcours</Tag>}
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M5 3l4 4-4 4" stroke={theme.dim} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

function TypePill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 9, color, marginLeft: 8,
      border: `1px solid ${color}`, borderRadius: 4, padding: '1px 5px',
      fontWeight: 700, letterSpacing: '0.04em',
    }}>{children}</span>
  )
}
function Tag({ color, border, children }: { color: string; border: string; children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 10, color, border: `1px solid ${border}`,
      borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}
