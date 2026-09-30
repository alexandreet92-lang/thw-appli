import { Badge as ShadBadge } from '@/components/shadcn/badge'

type ColorVariant = 'brand' | 'blue' | 'red' | 'orange' | 'green' | 'default'

interface BadgeProps {
  variant?: ColorVariant
  children: React.ReactNode
  className?: string
}

// Enveloppe historique → shadcn Badge (la sémantique passe par le point/texte teinté, jamais une surface saturée).
export function Badge({ variant = 'default', children, className }: BadgeProps) {
  const v = variant === 'brand' ? 'default' : variant === 'red' ? 'destructive' : 'secondary'
  return <ShadBadge variant={v} className={className}>{children}</ShadBadge>
}
