'use client'
import * as React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { cn } from '@/lib/utils'

// shadcn/ui Switch — format iOS (51×31), pouce qui glisse avec ressort.
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer items-center rounded-full outline-none transition-colors duration-300',
        'data-[state=checked]:bg-primary data-[state=unchecked]:bg-[color-mix(in_srgb,var(--text)_18%,var(--bg))]',
        'focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-[27px] rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.3)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-[2px] active:w-[31px] data-[state=checked]:active:translate-x-[18px]"
      />
    </SwitchPrimitive.Root>
  )
}
export { Switch }
