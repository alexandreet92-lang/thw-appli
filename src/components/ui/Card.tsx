import { cn } from '@/lib/utils'

type ColorVariant = 'brand' | 'blue' | 'red' | 'orange' | 'green' | 'default'

const topBarColors: Record<ColorVariant, string> = {
  brand:   'from-[#00c8e0] to-transparent',
  blue:    'from-[#5b6fff] to-transparent',
  red:     'from-[#ff5f5f] to-transparent',
  orange:  'from-[#ffb340] to-transparent',
  green:   'from-emerald-400 to-transparent',
  default: '',
}

const valueColors: Record<ColorVariant, string> = {
  brand:   'text-[#00c8e0]',
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
        'relative overflow-hidden rounded-[16px] transition-all duration-200',
        !noPadding && 'p-5',
        className
      )}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
      }}
      {...props}
    >
      {variant && variant !== 'default' && (
        <div className={cn(
          'absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r',
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
      <p
        className="text-[11px] font-medium mb-2.5"
        style={{
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-dim)',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        {label}
      </p>
      <p
        className={cn('text-[30px] font-bold leading-none', valueColors[variant])}
        style={{
          fontFamily: 'Syne, sans-serif',
          letterSpacing: '-0.04em',
        }}
      >
        {value}
        {unit && (
          <span
            className="text-[13px] font-normal ml-1"
            style={{ color: 'var(--text-dim)', letterSpacing: 'normal' }}
          >
            {unit}
          </span>
        )}
      </p>
      {sub && (
        <div
          className="text-[12px] mt-2 flex items-center gap-1"
          style={{ color: 'var(--text-dim)' }}
        >
          {sub}
        </div>
      )}
    </Card>
  )
}
