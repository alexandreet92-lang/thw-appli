'use client'
import { type ReactNode } from 'react'

const ZAP_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
)

interface Props {
  role: 'user' | 'assistant'
  isStreaming?: boolean
  accentColor?: string
  children: ReactNode
}

export default function AIMessageBubble({ role, isStreaming, accentColor = '#06B6D4', children }: Props) {
  if (role === 'user') {
    return (
      <div style={{
        maxWidth: '70%',
        background: accentColor,
        borderRadius: '18px 18px 4px 18px',
        padding: '10px 16px',
        fontSize: 14,
        lineHeight: 1.5,
        color: '#ffffff',
        fontFamily: 'DM Sans, sans-serif',
        alignSelf: 'flex-end',
        marginLeft: 'auto',
        marginBottom: 4,
        animation: 'ai_msg_in 0.25s ease-out both',
      }}>
        {children}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 4, alignItems: 'flex-start', animation: 'ai_msg_in 0.25s ease-out both', maxWidth: '80%' }}>
      {/* Avatar */}
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        background: 'var(--ai-accent-dim)',
        border: '1px solid var(--ai-accent-line)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 2,
        animation: isStreaming ? 'ai_pulse 1.4s ease-in-out infinite' : 'none',
      }}>
        {ZAP_ICON}
      </div>
      <div style={{
        minWidth: 0,
        background: 'var(--ai-bg2)',
        border: '1px solid var(--ai-border)',
        borderRadius: '4px 18px 18px 18px',
        padding: '12px 16px',
        fontSize: 14,
        lineHeight: 1.65,
        color: 'var(--ai-text)',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        {children}
      </div>
    </div>
  )
}
