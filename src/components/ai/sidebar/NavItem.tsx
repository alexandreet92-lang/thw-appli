'use client'
import type { ReactNode } from 'react'

interface Props {
  icon: ReactNode
  label: string
  onClick: () => void
  active?: boolean
}

export function NavItem({ icon, label, onClick, active = false }: Props) {
  const base =
    'w-full flex items-center gap-3 px-3 py-2.5 ' +
    'rounded-xl text-[15px] font-medium font-[DM_Sans] ' +
    'transition-colors duration-100 text-left'
  const state = active
    ? 'bg-black/[0.08] dark:bg-white/10 text-[#0A0A0A] dark:text-white'
    : 'text-[#4A4A4A] dark:text-[#A0A0A0] hover:text-[#0A0A0A] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.06]'

  return (
    <button onClick={onClick} className={`${base} ${state}`}>
      <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
        {icon}
      </span>
      {label}
    </button>
  )
}

export default NavItem
