import { Switch } from '@/components/shadcn/switch'
import type { ThemeColors } from './types'

interface Props {
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  theme: ThemeColors
}

export function Toggle({ value, onChange, disabled }: Props) {
  return <Switch checked={value} disabled={disabled} onCheckedChange={onChange} />
}
