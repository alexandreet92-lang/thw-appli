import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap', {
  variants: {
    variant: {
      default: 'bg-[var(--primary-dim)] text-primary',
      secondary: 'bg-secondary text-muted-foreground',
      destructive: 'bg-[var(--danger-soft)] text-destructive',
    },
  },
  defaultVariants: { variant: 'default' },
})

function Badge({ className, variant, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}
export { Badge, badgeVariants }
