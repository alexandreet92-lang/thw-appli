'use client'
import { ALL_FIELDS, FONT_OPTIONS, type DataPage } from '@/types/cycling'
import { useRef } from 'react'
import { useCyclingSettings } from '@/hooks/useCyclingSettings'
import { useI18n } from '@/lib/i18n'

interface ThemeColors { bg: string; text: string; dim: string; separator: string; cardBg: string }

interface Props {
  page: DataPage
  theme: ThemeColors
  selectedField: string | null
  onFieldClick:        (fieldId: string) => void
  onFieldDoubleClick?: (fieldId: string) => void
  dataFontFamily?: string
}

const getMockValue = (fieldId: string): string => {
  const mocks: Record<string, string> = {
    duration: '01:24:18', moving_time: '01:20:05',
    distance: '42.2', lap_distance: '5.1',
    speed: '28.4', avg_speed: '26.1', max_speed: '54.2',
    elevation_gain: '680', altitude: '312', gradient: '4.2',
    power: '215', avg_power: '198', norm_power: '204',
    hr: '152', avg_hr: '144', hr_zone: '3',
    cadence: '88', avg_cadence: '85',
    calories: '1240', lap_duration: '12:34',
    lap_power: '223', lap_hr: '156',
  }
  return mocks[fieldId] ?? '--'
}

export default function PagePreview({ page, theme, selectedField, onFieldClick, onFieldDoubleClick, dataFontFamily }: Props) {
  const { t } = useI18n()
  const { settings } = useCyclingSettings()
  const settingsFont = (FONT_OPTIONS.find(f => f.id === (settings.display.dataFont ?? 'system')) ?? FONT_OPTIONS[0]).fontFamily
  const fontFamily = dataFontFamily ?? settingsFont
  const lastTap = useRef<Record<string, number>>({})

  const handleCellTap = (id: string) => {
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
          🗺  {t('record.pagePreviewMap')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: `1px solid ${theme.separator}` }}>
          {page.fields.slice(0, 2).map((id, i, arr) => (
            <div
              key={id}
              onClick={() => handleCellTap(id)}
              style={{
                padding: '12px 8px', cursor: 'pointer', textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                background: selectedField === id ? 'rgba(6,182,212,0.08)' : 'transparent',
                border: selectedField === id ? '2px solid #06B6D4' : 'none',
                borderRight: i < arr.length - 1 ? `1px solid ${theme.separator}` : undefined,
              }}
            >
              <p style={{ fontSize: 9, color: theme.dim, textTransform: 'uppercase', letterSpacing: '1.2px', margin: 0 }}>
                {(() => { const f = ALL_FIELDS.find(f => f.id === id); return f?.labelKey ? t(f.labelKey) : f?.label })()}
              </p>
              <p style={{ fontSize: 28, fontWeight: 700, color: theme.text, margin: 0, lineHeight: 1, fontFamily }}>
                {getMockValue(id)}
              </p>
              {ALL_FIELDS.find(f => f.id === id)?.unit && (
                <p style={{ fontSize: 11, color: theme.dim, margin: 0 }}>
                  {ALL_FIELDS.find(f => f.id === id)?.unit}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const bigFieldId = page.bigFieldId ?? page.fields[0]
  const otherFields = page.fields.filter(f => f !== bigFieldId)
  const bigOnTop = page.bigFieldPosition !== 'middle'
  const midIndex = Math.floor(otherFields.length / 2)

  const renderBigCell = (fieldId: string) => {
    const field = ALL_FIELDS.find(f => f.id === fieldId)
    return (
      <div
        key={fieldId}
        onClick={() => handleCellTap(fieldId)}
        style={{
          gridColumn: '1 / -1',
          padding: '16px 12px',
          borderBottom: `1px solid ${theme.separator}`,
          cursor: 'pointer',
          background: selectedField === fieldId ? 'rgba(6,182,212,0.08)' : 'transparent',
          border: selectedField === fieldId ? `2px solid #06B6D4` : `1px solid ${theme.separator}`,
          borderRadius: selectedField === fieldId ? 8 : 0,
          textAlign: 'center',
          minHeight: 80,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 4,
        }}
      >
        <p style={{ fontSize: 10, color: theme.dim, textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0 }}>
          {field?.labelKey ? t(field.labelKey) : field?.label}
        </p>
        <p style={{ fontSize: 48, fontWeight: 700, color: theme.text, margin: 0, lineHeight: 1, fontFamily }}>
          {getMockValue(fieldId)}
        </p>
        {field?.unit && (
          <p style={{ fontSize: 13, color: theme.dim, margin: 0 }}>{field.unit}</p>
        )}
      </div>
    )
  }

  const renderSmallCell = (fieldId: string) => {
    const field = ALL_FIELDS.find(f => f.id === fieldId)
    return (
      <div
        key={fieldId}
        onClick={() => handleCellTap(fieldId)}
        style={{
          padding: '12px 8px',
          cursor: 'pointer',
          background: selectedField === fieldId ? 'rgba(6,182,212,0.08)' : 'transparent',
          border: selectedField === fieldId ? `2px solid #06B6D4` : `1px solid ${theme.separator}`,
          textAlign: 'center',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 3,
          minHeight: 70,
        }}
      >
        <p style={{ fontSize: 9, color: theme.dim, textTransform: 'uppercase', letterSpacing: '1.2px', margin: 0 }}>
          {field?.labelKey ? t(field.labelKey) : field?.label}
        </p>
        <p style={{ fontSize: 28, fontWeight: 700, color: theme.text, margin: 0, lineHeight: 1, fontFamily }}>
          {getMockValue(fieldId)}
        </p>
        {field?.unit && (
          <p style={{ fontSize: 11, color: theme.dim, margin: 0 }}>{field.unit}</p>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridAutoRows: 'minmax(70px, auto)', overflow: 'hidden' }}>
      {bigOnTop && renderBigCell(bigFieldId)}
      {bigOnTop && otherFields.map(renderSmallCell)}
      {!bigOnTop && otherFields.slice(0, midIndex).map(renderSmallCell)}
      {!bigOnTop && renderBigCell(bigFieldId)}
      {!bigOnTop && otherFields.slice(midIndex).map(renderSmallCell)}
    </div>
  )
}
