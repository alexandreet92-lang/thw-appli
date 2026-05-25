import type { ThemeColors } from './types'

interface Option { value: string | number; label: string }

interface Props {
  value: string | number
  options: Option[]
  onChange: (v: string) => void
  disabled?: boolean
  theme: ThemeColors
}

export function Select({ value, options, onChange, disabled, theme }: Props) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      style={{
        background: theme.bg,
        border: `1px solid ${theme.separator}`,
        borderRadius: 8, padding: '6px 10px',
        fontSize: 13, color: theme.text,
        cursor: disabled ? 'default' : 'pointer',
        outline: 'none',
        opacity: disabled ? 0.4 : 1,
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}
