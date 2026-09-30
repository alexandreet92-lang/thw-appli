import { cn } from '@/lib/utils'
import { Card as ShadCard } from '@/components/shadcn/card'

type ColorVariant = 'brand' | 'blue' | 'red' | 'orange' | 'green' | 'default'

const topBarColors: Record<ColorVariant, string> = {
  brand:   'from-[#06B6D4] to-transparent',
  blue:    'from-[#5b6fff] to-transparent',
  red:     'from-[#ff5f5f] to-transparent',
  orange:  'from-[#ffb340] to-transparent',
  green:   'from-emerald-400 to-transparent',
  default: '',
}

const valueColors: Record<ColorVariant, string> = {
  brand:   'text-[#06B6D4]',
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

// Enveloppe historique → shadcn Card (bulle sans bordure). `variant` ne sert plus
// qu'à teinter la valeur d'un StatCard (plus de barre colorée : surface neutre).
export function Card({ noPadding, children, className, ...props }: CardProps) {
  return (
    <ShadCard className={cn('relative overflow-hidden', noPadding && 'p-0', className)} {...props}>
      {children}
    </ShadCard>
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
