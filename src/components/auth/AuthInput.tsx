'use client'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface Props {
  label: string
  type: 'email' | 'password' | 'text'
  placeholder: string
  value: string
  onChange: (v: string) => void
  showToggle?: boolean
  error?: string
  autoComplete?: string
}

export function AuthInput({ label, type, placeholder, value, onChange, showToggle, error, autoComplete }: Props) {
  const [visible, setVisible] = useState(false)
  const [focus, setFocus] = useState(false)
  const borderColor = error ? 'var(--charge-hard)' : focus ? 'var(--primary)' : 'var(--border-mid)'

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 600,
        color: 'var(--text-dim)',
        textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7,
        fontFamily: 'var(--font-body)',
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={showToggle ? (visible ? 'text' : 'password') : type}
          placeholder={placeholder}
          value={value}
          autoComplete={autoComplete}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            width: '100%', height: 52,
            background: 'var(--input-bg)',
            border: `1px solid ${borderColor}`,
            borderRadius: 'var(--r-md)', padding: showToggle ? '0 46px 0 16px' : '0 16px',
            color: 'var(--text)', fontSize: 15, outline: 'none',
            boxSizing: 'border-box',
            fontFamily: 'var(--font-body)',
            boxShadow: focus && !error ? '0 0 0 3px var(--primary-dim)' : 'none',
            transition: 'border-color 160ms, box-shadow 160ms',
          }}
        />
        {showToggle && (
          <button
            type="button"
            aria-label={visible ? 'Masquer' : 'Afficher'}
            onClick={() => setVisible(s => !s)}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--text-dim)',
              cursor: 'pointer', padding: 4, display: 'flex', lineHeight: 0,
            }}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && (
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--charge-hard)', fontFamily: 'var(--font-body)' }}>{error}</p>
      )}
    </div>
  )
}
