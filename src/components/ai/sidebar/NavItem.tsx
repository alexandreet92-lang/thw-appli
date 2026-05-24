'use client'
import type { ReactNode } from 'react'

interface Props {
  icon: ReactNode
  label: string
  onClick: () => void
  active?: boolean
}

export function NavItem({ icon, label, onClick, active = false }: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 12,
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 15,
        fontWeight: 500,
        textAlign: 'left',
        background: active ? 'rgba(255,255,255,0.10)' : 'transparent',
        color: active ? '#FFFFFF' : 'rgba(255,255,255,0.72)',
        transition: 'background-color 100ms, color 100ms',
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'
          ;(e.currentTarget as HTMLButtonElement).style.color = '#FFFFFF'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.72)'
        }
      }}
    >
      <span style={{
        width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: active ? 1 : 0.75, flexShrink: 0,
      }}>
        {icon}
      </span>
      {label}
    </button>
  )
}

export default NavItem
