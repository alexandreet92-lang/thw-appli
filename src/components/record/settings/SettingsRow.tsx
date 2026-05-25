import type { ThemeColors } from './types'

interface Props {
  label: string
  description?: string
  right?: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  theme: ThemeColors
  last?: boolean
}

export function SettingsRow({ label, description, right, onClick, disabled, theme, last }: Props) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 16px',
        borderBottom: last ? 'none' : `1px solid ${theme.separator}`,
        cursor: onClick && !disabled ? 'pointer' : 'default',
        opacity: disabled ? 0.4 : 1,
        background: theme.bg,
      }}
    >
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 15, color: theme.text, margin: 0 }}>{label}</p>
        {description && (
          <p style={{ fontSize: 12, color: '#8C8C8C', margin: '2px 0 0' }}>{description}</p>
        )}
      </div>
      {right}
    </div>
  )
}
