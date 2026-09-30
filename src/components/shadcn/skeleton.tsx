import * as React from 'react'
import { cn } from '@/lib/utils'

// shadcn/ui Skeleton — forme du contenu, pulsation douce (DESIGN_SYSTEM §6 : skeleton, jamais de spinner).
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="skeleton" className={cn('animate-pulse rounded-[var(--r-md)] bg-secondary', className)} {...props} />
}
export { Skeleton }
