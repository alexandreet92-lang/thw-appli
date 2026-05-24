'use client'
import { useEffect } from 'react'

interface Props {
  message: string
  onDismiss: () => void
  duration?: number
}

export default function Toast({ message, onDismiss, duration = 2400 }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration)
    return () => clearTimeout(t)
  }, [onDismiss, duration])
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(96px + env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        padding: '10px 16px',
        borderRadius: 12,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-mid)',
        color: 'var(--text)',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 13, fontWeight: 500,
        boxShadow: 'var(--shadow-card)',
        animation: 'record-toast-in 180ms ease-out',
      }}
      role="status"
    >
      {message}
      <style>{`
        @keyframes record-toast-in {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  )
}
