import type { ThemeColors } from './types'
import { RkToggle } from '../kit/RecordKit'

interface Props {
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  theme: ThemeColors
  label?: string
}

// Interrupteur iOS (vert actif) — langage RecordKit.
export function Toggle({ value, onChange, disabled, label }: Props) {
  return (
    <span style={{ opacity: disabled ? 0.45 : 1, pointerEvents: disabled ? 'none' : undefined, display: 'inline-flex' }}>
      <RkToggle on={value} onChange={onChange} label={label ?? ''} />
    </span>
  )
}
