'use client'
import { useState } from 'react'
import type { ThemeColors } from './types'

interface Option { value: string | number; label: string }

interface Props {
  value: string | number
  options: Option[]
  onChange: (v: string) => void
  disabled?: boolean
  theme: ThemeColors
}

export function Select({ value, options, onChange, disabled, theme }: Props) {
  const [justChanged, setJustChanged] = useState(false)

  const handleChange = (v: string) => {
    onChange(v)
    setJustChanged(true)
    setTimeout(() => setJustChanged(false), 600)
  }

  return (
    <div style={{
      borderRadius: 'var(--r-pill)',
      background: 'var(--surface-chip)',
      boxShadow: justChanged ? '0 0 0 2px var(--success)' : 'none',
      transition: 'box-shadow 300ms ease',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      <select
        value={value}
        onChange={e => handleChange(e.target.value)}
        disabled={disabled}
        style={{
          background: 'transparent',
          border: 'none',
          minHeight: 36,
          padding: '0 14px',
          fontSize: 14, fontWeight: 700, color: theme.text,
          cursor: disabled ? 'default' : 'pointer',
          outline: 'none',
          opacity: disabled ? 0.45 : 1,
          fontFamily: 'var(--font-body)',
        }}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
