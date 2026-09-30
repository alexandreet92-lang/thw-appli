import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// shadcn/ui Button — thémé sur le design system THW (pilule, pas de bordure,
// tokens uniquement) + micro-animations : léger soulèvement au survol,
// compression au clic, ressort court.
const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold",
    "transition-[transform,background-color,filter,box-shadow,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
    "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
    "disabled:pointer-events-none disabled:opacity-50",
    "[@media(hover:hover)]:hover:-translate-y-px [@media(hover:hover)]:hover:brightness-110",
    "active:translate-y-0",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  ],
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        ghost: 'bg-transparent text-foreground hover:bg-accent',
        destructive: 'bg-destructive text-destructive-foreground',
        inverse: 'bg-foreground text-background',
        link: 'h-auto rounded-none bg-transparent p-0 text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'min-h-12 px-6 text-[15px]',
        sm: 'min-h-10 px-4 text-sm',
        lg: 'min-h-14 px-8 text-[17px]',
        icon: 'size-11 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

function Button({
  className, variant, size, asChild = false, ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button'
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
