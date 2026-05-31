'use client'

import { useState } from 'react'
import type { AIStatus } from '@/hooks/useAIAnalysis'

interface Props {
  text:    string
  status:  AIStatus
  onRetry: () => void
}

export function AIBubble({ text, status, onRetry }: Props) {
  const [copied, setCopied] = useState(false)

  if (status === 'idle') return null

  const sepIdx   = text.indexOf('---EN CLAIR---')
  const techPart = sepIdx >= 0 ? text.slice(0, sepIdx).trim() : text.trim()
  const plainPart = sepIdx >= 0 ? text.slice(sepIdx + 14).trim() : ''

  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => undefined)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isStreaming = status === 'loading' || status === 'streaming'

  return (
    <div style={{
      marginTop: 16,
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        background: 'linear-gradient(135deg,rgba(6,182,212,.06) 0%,rgba(129,140,248,.06) 100%)',
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: 'linear-gradient(135deg,#06B6D4,#818CF8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4l2.5 2.5"/>
          </svg>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', flex: 1 }}>
          Analyse IA
        </span>
        {isStreaming && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#06B6D4',
                animation: `aiDot 1.2s ease-in-out ${i * 0.18}s infinite`,
              }} />
            ))}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      {status === 'error' ? (
        <div style={{ padding: '14px 16px', fontSize: 13, color: '#EF4444' }}>
          Une erreur est survenue.{' '}
          <button
            onClick={onRetry}
            style={{ color: '#06B6D4', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
          >
            Réessayer
          </button>
        </div>
      ) : text ? (
        <div>
          {/* Analyse technique */}
          {techPart && (
            <div style={{ padding: '14px 16px', borderBottom: plainPart ? '1px solid var(--border)' : 'none' }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: 'var(--text-dim)',
                textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8,
              }}>
                Analyse technique
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-body)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                {techPart}
              </div>
            </div>
          )}
          {/* En clair */}
          {plainPart && (
            <div style={{
              padding: '14px 16px',
              background: 'linear-gradient(135deg,rgba(6,182,212,.04) 0%,rgba(129,140,248,.04) 100%)',
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: 'var(--text-dim)',
                textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8,
              }}>
                En clair
              </div>
              <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                {plainPart}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '14px 16px', display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#06B6D4', opacity: 0.6 }} />
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Analyse en cours…</span>
        </div>
      )}

      {/* ── Footer ── */}
      {(status === 'done' || status === 'streaming') && text && (
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '8px 12px',
          borderTop: '1px solid var(--border)',
        }}>
          <button
            onClick={handleCopy}
            style={{
              fontSize: 11, color: 'var(--text-dim)', background: 'none',
              border: '1px solid var(--border)', borderRadius: 5,
              padding: '3px 8px', cursor: 'pointer',
            }}
          >
            {copied ? '✓ Copié' : 'Copier'}
          </button>
          {status === 'done' && (
            <button
              onClick={onRetry}
              style={{
                fontSize: 11, color: 'var(--text-dim)', background: 'none',
                border: '1px solid var(--border)', borderRadius: 5,
                padding: '3px 8px', cursor: 'pointer',
              }}
            >
              Relancer
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes aiDot {
          0%,80%,100% { opacity:.2; transform:scale(.8); }
          40%          { opacity:1;  transform:scale(1.1); }
        }
      `}</style>
    </div>
  )
}
