'use client'
import { useState } from 'react'
import type { ThemeColors } from './types'

interface Props {
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (v: number) => void
  disabled?: boolean
  theme: ThemeColors
}

export function NumberInput({ value, min, max, step, unit, onChange, disabled, theme }: Props) {
  const [bouncing, setBouncing] = useState(false)
  const canDec = !disabled && value > min
  const canInc = !disabled && value < max

  const handleChange = (newVal: number) => {
    onChange(newVal)
    setBouncing(true)
    setTimeout(() => setBouncing(false), 200)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button
        onClick={() => canDec && handleChange(Math.max(min, value - step))}
        style={{
          width: 28, height: 28, borderRadius: 8,
          background: theme.separator, border: 'none',
          color: theme.text, cursor: canDec ? 'pointer' : 'default',
          opacity: canDec ? 1 : 0.3, fontSize: 18, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >−</button>
      <span style={{
        fontSize: 14, fontWeight: 600, color: theme.text,
        minWidth: 52, textAlign: 'center',
        display: 'inline-block',
        transform: bouncing ? 'scale(1.15)' : 'scale(1)',
        transition: 'transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        {value} <span style={{ fontSize: 11, color: '#8C8C8C' }}>{unit}</span>
      </span>
      <button
        onClick={() => canInc && handleChange(Math.min(max, value + step))}
        style={{
          width: 28, height: 28, borderRadius: 8,
          background: theme.separator, border: 'none',
          color: theme.text, cursor: canInc ? 'pointer' : 'default',
          opacity: canInc ? 1 : 0.3, fontSize: 18, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >+</button>
    </div>
  )
}
