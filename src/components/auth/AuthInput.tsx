'use client'
import { useState } from 'react'

interface Props {
  label: string
  type: 'email' | 'password' | 'text'
  placeholder: string
  value: string
  onChange: (v: string) => void
  showToggle?: boolean
}

export function AuthInput({ label, type, placeholder, value, onChange, showToggle }: Props) {
  const [visible, setVisible] = useState(false)

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block', fontSize: 12, fontWeight: 600,
        color: 'rgba(255,255,255,0.5)',
        textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
        fontFamily: 'DM Sans, sans-serif',
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={showToggle ? (visible ? 'text' : 'password') : type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%', height: 50,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12, padding: '0 44px 0 16px',
            color: 'white', fontSize: 15, outline: 'none',
            boxSizing: 'border-box',
            fontFamily: 'DM Sans, sans-serif',
            transition: 'border-color 200ms',
          }}
          onFocus={e => { e.target.style.borderColor = 'rgba(6,182,212,0.5)' }}
          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)' }}
        />
        {showToggle && (
          <button
            type="button"
            onClick={() => setVisible(s => !s)}
            style={{
              position: 'absolute', right: 14, top: '50%',
              transform: 'translateY(-50%)',
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer', fontSize: 16, lineHeight: 1,
              padding: 0,
            }}
          >
            {visible ? '🙈' : '👁'}
          </button>
        )}
      </div>
    </div>
  )
}
