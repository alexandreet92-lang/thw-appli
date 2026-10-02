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

// Ligne de liste groupée : libellé (+ description) · contrôle à droite.
// Filet séparateur inset, cible tactile ≥ 52 px.
export function SettingsRow({ label, description, right, onClick, disabled, theme, last }: Props) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        minHeight: 52, padding: '10px 16px',
        borderBottom: last ? 'none' : `1px solid ${theme.separator}`,
        cursor: onClick && !disabled ? 'pointer' : 'default',
        opacity: disabled ? 0.45 : 1,
        background: 'transparent',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: theme.text, margin: 0, lineHeight: 1.25 }}>{label}</p>
        {description && (
          <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: '2px 0 0', lineHeight: 1.35 }}>{description}</p>
        )}
      </div>
      {right}
    </div>
  )
}
