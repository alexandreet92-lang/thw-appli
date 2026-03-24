import { cn } from '@/lib/utils'

type ColorVariant = 'brand' | 'blue' | 'red' | 'orange' | 'green' | 'default'

const topBarColors: Record<ColorVariant, string> = {
  brand:   'from-brand to-transparent',
  blue:    'from-[#5b6fff] to-transparent',
  red:     'from-[#ff5f5f] to-transparent',
  orange:  'from-[#ffb340] to-transparent',
  green:   'from-emerald-400 to-transparent',
  default: '',
}

const valueColors: Record<ColorVariant, string> = {
  brand:   'text-brand',
  blue:    'text-[#5b6fff]',
  red:     'text-[#ff5f5f]',
  orange:  'text-[#ffb340]',
  green:   'text-emerald-400',
  default: 'text-[var(--text)]',
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: ColorVariant
  noPadding?: boolean
  children: React.ReactNode
}

export function Card({ variant, noPadding, children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-card border transition-all duration-200',
        'bg-[var(--bg-card)] border-[var(--border)] shadow-card',
        'hover:border-[var(--border-mid)] hover:shadow-panel',
        !noPadding && 'p-5',
        className
      )}
      {...props}
    >
      {variant && variant !== 'default' && (
        <div className={cn(
          'absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r rounded-t-card',
          topBarColors[variant]
        )} />
      )}
      {children}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  unit?: string
  sub?: React.ReactNode
  variant?: ColorVariant
  className?: string
}

export function StatCard({ label, value, unit, sub, variant = 'default', className }: StatCardProps) {
  return (
    <Card variant={variant} className={className}>
      <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--text-dim)] mb-2.5">
        {label}
      </p>
      <p className={cn('font-display text-[30px] font-bold tracking-[-0.04em] leading-none', valueColors[variant])}>
        {value}
        {unit && (
          <span className="text-[13px] font-normal text-[var(--text-dim)] ml-1 tracking-normal">
            {unit}
          </span>
        )}
      </p>
      {sub && (
        <div className="text-[12px] text-[var(--text-dim)] mt-2 flex items-center gap-1">
          {sub}
        </div>
      )}
    </Card>
  )
}
