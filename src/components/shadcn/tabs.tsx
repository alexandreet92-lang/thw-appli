'use client'
import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

// shadcn/ui Tabs — segmenté en pilule (comme Claude / iOS).
function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col gap-4', className)} {...props} />
}
function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List data-slot="tabs-list" className={cn('inline-flex w-full items-center gap-1 rounded-full bg-secondary p-1', className)} {...props} />
}
function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-[15px] font-semibold whitespace-nowrap text-muted-foreground',
        'transition-[background-color,color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        'data-[state=active]:bg-background data-[state=active]:text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
        className,
      )}
      {...props}
    />
  )
}
function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn('outline-none data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-1 duration-250', className)} {...props} />
}
export { Tabs, TabsList, TabsTrigger, TabsContent }
