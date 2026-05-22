'use client'
import type { ReactNode } from 'react'

function logoSrc(modelId?: string): string {
  if (modelId === 'hermes') return '/logos/logo_3bras.png'
  if (modelId === 'zeus')   return '/logos/logo_6bras.png'
  return '/logos/logo_4bras.png'
}

interface Props {
  role:          'user' | 'assistant'
  modelId?:      string
  userInitials?: string
  isStreaming?:  boolean
  children:      ReactNode
}

export default function AIMessageBubble({ role, modelId, userInitials, isStreaming, children }: Props) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: role === 'user' ? 'flex-end' : 'flex-start',
      alignItems: 'flex-start',
      gap: 12,
    }}>
      {/* Avatar IA */}
      {role === 'assistant' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoSrc(modelId)}
          alt={modelId ?? 'ai'}
          className={isStreaming ? 'ai-logo-spinning' : undefined}
          style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0, marginTop: 0 }}
        />
      )}

      {/* Contenu */}
      {role === 'user' ? (
        <>
          <div style={{
            maxWidth: '78%',
            padding: '10px 16px',
            borderRadius: 18,
            background: '#3B8FD4',
            color: '#fff',
          }}>
            <span style={{ fontSize: 16, lineHeight: 1.6, fontWeight: 400, display: 'block' }}>
              {children}
            </span>
          </div>
          {/* Avatar user */}
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {userInitials ? (
              <span style={{ fontSize: 11, fontWeight: 500, color: '#374151', fontFamily: 'DM Sans,sans-serif', userSelect: 'none' }}>
                {userInitials}
              </span>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>
              </svg>
            )}
          </div>
        </>
      ) : (
        <div style={{
          flex: 1, minWidth: 0,
          padding: '4px 0',
          animation: 'ai_msg_in 0.15s ease both',
        }}>
          {children}
        </div>
      )}
    </div>
  )
}
