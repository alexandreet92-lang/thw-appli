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

export function SettingsSection({ title, children, theme }: SectionProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{
        fontSize: 11, fontWeight: 700, color: theme.dim,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        padding: '0 0 8px', margin: 0,
      }}>{title}</p>
      <div style={{
        borderRadius: 14, overflow: 'hidden',
        border: `1px solid ${theme.separator}`,
      }}>
        {children}
      </div>
    </div>
  )
}

export function SettingsSectionSubtitle({ label, badge, theme }: SubtitleProps) {
  return (
    <div style={{
      padding: '10px 16px 4px',
      display: 'flex', alignItems: 'center', gap: 8,
      background: theme.cardBg,
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: theme.dim, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
      </span>
      {badge && (
        <span style={{
          fontSize: 9, color: '#06B6D4',
          border: '1px solid rgba(6,182,212,0.4)',
          borderRadius: 4, padding: '1px 6px', fontWeight: 700,
        }}>{badge}</span>
      )}
    </div>
  )
}
