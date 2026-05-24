'use client'
import { fieldById, type DataPage } from '@/types/cycling'
import { useRef } from 'react'

interface ThemeColors { bg: string; text: string; dim: string; separator: string; cardBg: string }

interface Props {
  page: DataPage
  theme: ThemeColors
  selectedField: string | null
  onFieldClick:        (fieldId: string) => void
  onFieldDoubleClick?: (fieldId: string) => void
}

function valueForField(id: string): { value: string; unit: string } {
  const f = fieldById(id)
  if (!f) return { value: '--', unit: '' }
  // Valeurs de démo dans l'aperçu (pas de live data ici)
  const demo: Record<string, string> = {
    duration: '00:24:18', moving_time: '23:01', distance: '12.4', speed: '28.4',
    avg_speed: '24.6', max_speed: '46.2', elevation_gain: '142', altitude: '212',
    gradient: '4.2', avg_gradient: '2.1', power: '215', avg_power: '198', cadence: '88',
    hr: '152', avg_hr: '148', calories: '462', lap_duration: '04:32',
  }
  return { value: demo[id] ?? '--', unit: f.unit ?? '' }
}

export default function PagePreview({ page, theme, selectedField, onFieldClick, onFieldDoubleClick }: Props) {
  const lastTap = useRef<Record<string, number>>({})
  const handleTap = (id: string) => {
    const now = Date.now()
    const prev = lastTap.current[id] ?? 0
    if (now - prev < 300 && onFieldDoubleClick) {
      onFieldDoubleClick(id)
      lastTap.current[id] = 0
    } else {
      onFieldClick(id)
      lastTap.current[id] = now
    }
  }

  // Pour le mode map, on rend un placeholder + 2 cells
  if (page.type === 'map') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{
          flex: 1, margin: '12px 12px 6px',
          borderRadius: 12, border: `1px solid ${theme.separator}`,
          background: `linear-gradient(135deg, ${theme.cardBg}, ${theme.bg})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: theme.dim, fontSize: 12,
        }}>
          🗺  Carte
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: `1px solid ${theme.separator}` }}>
          {page.fields.slice(0, 2).map((id, i, arr) => (
            <Cell
              key={id} fieldId={id} theme={theme}
              selected={selectedField === id} onTap={handleTap}
              size="md" style={i < arr.length - 1 ? { borderRight: `1px solid ${theme.separator}` } : undefined}
            />
          ))}
        </div>
      </div>
    )
  }

  const bigFieldId = page.bigFieldId ?? page.fields[0]
  const otherFields = page.fields.filter(id => id !== bigFieldId)
  const pos = page.bigFieldPosition ?? 'top'

  const renderGrid = (ids: string[]) => {
    if (ids.length === 0) return null
    const cols = ids.length >= 4 ? 3 : ids.length >= 2 ? 2 : 1
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 0, flex: 1, minHeight: 0 }}>
        {ids.map((id, i) => {
          const isRightEdge = (i + 1) % cols === 0
          const isLastRow = Math.floor(i / cols) === Math.floor((ids.length - 1) / cols)
          return (
            <Cell
              key={id} fieldId={id} theme={theme}
              selected={selectedField === id} onTap={handleTap}
              size="sm"
              style={{
                borderRight: isRightEdge ? undefined : `1px solid ${theme.separator}`,
                borderBottom: isLastRow ? undefined : `1px solid ${theme.separator}`,
              }}
            />
          )
        })}
      </div>
    )
  }

  if (pos === 'middle') {
    const half = Math.ceil(otherFields.length / 2)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {renderGrid(otherFields.slice(0, half))}
        <div style={{ flexBasis: '32%', flexShrink: 0, borderTop: `1px solid ${theme.separator}`, borderBottom: `1px solid ${theme.separator}` }}>
          <Cell fieldId={bigFieldId} theme={theme} selected={selectedField === bigFieldId} onTap={handleTap} size="lg" />
        </div>
        {renderGrid(otherFields.slice(half))}
      </div>
    )
  }
  // pos === 'top'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flexBasis: '40%', flexShrink: 0, borderBottom: `1px solid ${theme.separator}` }}>
        <Cell fieldId={bigFieldId} theme={theme} selected={selectedField === bigFieldId} onTap={handleTap} size="lg" />
      </div>
      {renderGrid(otherFields)}
    </div>
  )
}

function Cell({ fieldId, theme, selected, onTap, size, style }: {
  fieldId: string; theme: ThemeColors; selected: boolean;
  onTap: (id: string) => void; size: 'sm' | 'md' | 'lg'
  style?: React.CSSProperties
}) {
  const f = fieldById(fieldId)
  const { value, unit } = valueForField(fieldId)
  const fontSize = size === 'lg' ? 36 : size === 'md' ? 24 : 18
  const labelSize = size === 'lg' ? 10 : 9
  return (
    <button
      onClick={() => onTap(fieldId)}
      style={{
        width: '100%', height: '100%', minHeight: 0,
        padding: 10, border: 'none', cursor: 'pointer',
        background: selected ? 'rgba(6,182,212,0.10)' : theme.cardBg,
        boxShadow: selected ? 'inset 0 0 0 2px #06B6D4' : 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: theme.text, transition: 'background 100ms, box-shadow 100ms',
        ...style,
      }}
    >
      <span style={{
        fontSize: labelSize, fontWeight: 700, color: theme.dim,
        textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 2,
      }}>{f?.label ?? fieldId}</span>
      <span style={{
        fontSize, fontWeight: 700, lineHeight: 1,
        color: theme.text, fontFamily: 'DM Mono, monospace',
      }}>{value}</span>
      {unit && <span style={{ fontSize: 10, color: theme.dim, marginTop: 2 }}>{unit}</span>}
    </button>
  )
}
