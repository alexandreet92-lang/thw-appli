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
      borderRadius: 8,
      border: `1px solid ${justChanged ? '#10B981' : theme.separator}`,
      transition: 'border-color 300ms',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      <select
        value={value}
        onChange={e => handleChange(e.target.value)}
        disabled={disabled}
        style={{
          background: theme.bg,
          border: 'none',
          padding: '6px 10px',
          fontSize: 13, color: theme.text,
          cursor: disabled ? 'default' : 'pointer',
          outline: 'none',
          opacity: disabled ? 0.4 : 1,
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
