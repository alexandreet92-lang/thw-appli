import type { ThemeColors } from './types'

interface Props {
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  theme: ThemeColors
}

export function Toggle({ value, onChange, disabled, theme }: Props) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      style={{
        width: 44, height: 26, borderRadius: 13,
        background: value ? '#06B6D4' : theme.separator,
        border: 'none', cursor: disabled ? 'default' : 'pointer',
        position: 'relative', transition: 'background 200ms',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        background: 'white',
        position: 'absolute', top: 3,
        left: value ? 21 : 3,
        transition: 'left 200ms',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}
