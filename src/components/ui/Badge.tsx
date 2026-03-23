import { cn } from '@/src/lib/utils'

type ColorVariant = 'brand' | 'blue' | 'red' | 'orange' | 'green' | 'default'

const styles: Record<ColorVariant, string> = {
  brand:   'bg-[rgba(0,200,224,0.10)] text-brand border-[rgba(0,200,224,0.20)]',
  blue:    'bg-[rgba(91,111,255,0.10)] text-[#5b6fff] border-[rgba(91,111,255,0.20)]',
  red:     'bg-[rgba(255,95,95,0.10)] text-[#ff5f5f] border-[rgba(255,95,95,0.20)]',
  orange:  'bg-[rgba(255,179,64,0.10)] text-[#ffb340] border-[rgba(255,179,64,0.20)]',
  green:   'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  default: 'bg-[var(--bg-card2)] text-[var(--text-mid)] border-[var(--border)]',
}

interface BadgeProps {
  variant?: ColorVariant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 border rounded-full',
      'text-[10px] font-semibold tracking-[0.06em] uppercase px-2 py-0.5',
      styles[variant],
      className
    )}>
      {children}
    </span>
  )
}
