import type { ThemeColors } from './types'

interface SectionProps {
  title: string
  children: React.ReactNode
  theme: ThemeColors
}
interface SubtitleProps {
  label: string
  badge?: string
  theme: ThemeColors
}

// Liste groupée façon iOS (maquette r1, feuille dépliée) : libellé de section
// en petites capitales grises + carte grise radius 20, sans bordure.
export function SettingsSection({ title, children, theme }: SectionProps) {
  return (
    <div style={{ margin: '16px 16px 6px' }}>
      <p style={{
        fontSize: 12, fontWeight: 700, color: theme.dim,
        letterSpacing: '0.06em', textTransform: 'uppercase',
        padding: '0 4px 8px', margin: 0,
      }}>{title}</p>
      <div style={{ borderRadius: 'var(--r-lg)', overflow: 'hidden', background: theme.cardBg }}>
        {children}
      </div>
    </div>
  )
}

export function SettingsSectionSubtitle({ label, badge, theme }: SubtitleProps) {
  return (
    <div style={{ padding: '12px 16px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: theme.dim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      {badge && (
        <span style={{
          fontSize: 11, color: 'var(--primary)', background: 'var(--primary-dim)',
          borderRadius: 'var(--r-pill)', padding: '2px 8px', fontWeight: 700,
        }}>{badge}</span>
      )}
    </div>
  )
}
