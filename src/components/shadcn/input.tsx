import * as React from 'react'
import { cn } from '@/lib/utils'

// shadcn/ui Input — seul élément du design system autorisé à porter une bordure (focus).
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'w-full min-w-0 rounded-[var(--r-md)] bg-secondary px-4 py-3.5 text-[17px] text-foreground outline-none',
        'placeholder:text-muted-foreground transition-shadow duration-200',
        'focus-visible:shadow-[0_0_0_2px_var(--primary)] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
export { Input }
