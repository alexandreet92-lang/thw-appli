'use client'
import * as React from 'react'
import * as SheetPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

// shadcn/ui Sheet — feuille du bas (par défaut) ou latérale, avec poignée.
const Sheet = SheetPrimitive.Root
const SheetTrigger = SheetPrimitive.Trigger
const SheetClose = SheetPrimitive.Close

function SheetContent({ className, children, side = 'bottom', ...props }: React.ComponentProps<typeof SheetPrimitive.Content> & { side?: 'bottom' | 'right' | 'left' }) {
  const pos = {
    bottom: 'inset-x-0 bottom-0 max-h-[94dvh] rounded-t-[var(--r-lg)] data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
    right: 'inset-y-0 right-0 w-[min(92vw,420px)] data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
    left: 'inset-y-0 left-0 w-[min(92vw,420px)] data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
  }[side]
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-[14000] bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-300" />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn('fixed z-[14001] flex flex-col gap-4 overflow-y-auto bg-background p-5 text-foreground outline-none data-[state=open]:animate-in data-[state=closed]:animate-out duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]', pos, className)}
        {...props}
      >
        {side === 'bottom' && <div aria-hidden className="mx-auto -mt-2 h-1.5 w-10 shrink-0 rounded-full bg-[color-mix(in_srgb,var(--text)_25%,transparent)]" />}
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
}
function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-header" className={cn('flex flex-col gap-1.5', className)} {...props} />
}
function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn('text-xl leading-tight font-semibold', className)} style={{ fontFamily: 'var(--font-display)' }} {...props} />
}
function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description data-slot="sheet-description" className={cn('text-sm text-muted-foreground', className)} {...props} />
}
export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription }
