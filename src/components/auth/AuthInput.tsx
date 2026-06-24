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
        display: 'block', fontSize: 11, fontWeight: 600,
        color: 'var(--text-dim)',
        textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
        fontFamily: 'var(--font-body)',
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
            background: 'var(--input-bg)',
            border: '1px solid var(--border-mid)',
            borderRadius: 12, padding: '0 44px 0 16px',
            color: 'var(--text)', fontSize: 15, outline: 'none',
            boxSizing: 'border-box',
            fontFamily: 'var(--font-body)',
            transition: 'border-color 200ms, box-shadow 200ms',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-dim)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border-mid)'; e.target.style.boxShadow = 'none' }}
        />
        {showToggle && (
          <button
            type="button"
            onClick={() => setVisible(s => !s)}
            style={{
              position: 'absolute', right: 14, top: '50%',
              transform: 'translateY(-50%)',
              background: 'none', border: 'none',
              color: 'var(--text-dim)',
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
