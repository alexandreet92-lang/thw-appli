'use client'
import { type ReactNode } from 'react'

const SHURIKEN = (
  <svg width="13" height="13" viewBox="0 0 32 32" fill="white">
    <path d="M16 2 L20 12 L30 8 L22 16 L30 24 L20 20 L16 30 L12 20 L2 24 L10 16 L2 8 L12 12 Z"/>
  </svg>
)

interface Props {
  role: 'user' | 'assistant'
  isStreaming?: boolean
  children: ReactNode
}

export default function AIMessageBubble({ role, isStreaming, children }: Props) {
  if (role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <div style={{
          maxWidth: '80%',
          background: 'var(--ai-bg2)',
          borderRadius: '18px 18px 4px 18px',
          padding: '9px 14px',
          fontSize: 13.5,
          lineHeight: 1.55,
          color: 'var(--ai-text)',
        }}>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 4, alignItems: 'flex-start' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #00c8e0, #3B82F6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 2,
        animation: isStreaming ? 'ai_pulse 1.4s ease-in-out infinite' : 'none',
      }}>
        {SHURIKEN}
      </div>
      <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, lineHeight: 1.6, color: 'var(--ai-text)', paddingTop: 4 }}>
        {children}
      </div>
    </div>
  )
}
