'use client'
// Segmented control (DESIGN_SYSTEM.md §2/§3) — rendu shadcn/ui Tabs : piste
// arrondie, segment actif élevé. API inchangée. Défile si la liste est longue.
// Mobile (≤ 767 px, globals.css [data-seg]) : piste grise --surface-chip,
// segment actif blanc --surface-card ombré, cibles 44 px.
import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn/tabs'

export interface SegmentedOption<T extends string> {
  id: T
  label: string
}

interface Props<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (id: T) => void
  size?: 'sm' | 'md'
  ariaLabel?: string
}

export function Segmented<T extends string>({ options, value, onChange, size = 'md', ariaLabel }: Props<T>) {
  const small = size === 'sm'
  return (
    <Tabs value={value} onValueChange={v => onChange(v as T)} className="max-w-full">
      <TabsList data-seg={small ? 'sm' : 'md'} aria-label={ariaLabel} className="w-auto max-w-full overflow-x-auto [scrollbar-width:none]">
        {options.map(o => (
          <TabsTrigger key={o.id} value={o.id} className={small ? 'min-h-8 flex-none px-3 text-xs' : 'min-h-9 flex-none px-4 text-[13px]'}>
            {o.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
