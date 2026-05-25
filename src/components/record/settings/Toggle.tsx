import type { ThemeColors } from './types'

interface Props {
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  theme: ThemeColors
}

export function Toggle({ value, onChange, disabled }: Props) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      style={{
        width: 46, height: 28, borderRadius: 14,
        background: value
          ? 'linear-gradient(135deg, #06B6D4, #2563EB)'
          : 'rgba(120,120,128,0.32)',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        position: 'relative',
        transition: 'background 250ms ease',
        flexShrink: 0,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: '50%',
        background: 'white',
        position: 'absolute', top: 3,
        left: value ? 21 : 3,
        transition: 'left 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
      }} />
    </button>
  )
}
