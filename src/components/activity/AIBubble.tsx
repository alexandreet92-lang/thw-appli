'use client'

import { useState } from 'react'
import type { AIStatus } from '@/hooks/useAIAnalysis'

interface Props {
  text:    string
  status:  AIStatus
  onRetry: () => void
}

function ShurikenSpinner({ size = 24 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size,
      animation: 'spinPause 2s ease-in-out infinite',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logos/logo_4bras.png" alt="" width={size} height={size}
        style={{ width: size, height: size, objectFit: 'contain' }} />
    </div>
  )
}

function ShurikenAvatar({ size = 32 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'rgba(6,182,212,0.12)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, marginTop: 4,
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logos/logo_4bras.png" alt="THW AI" width={size * 0.56} height={size * 0.56}
        style={{ width: size * 0.56, height: size * 0.56, objectFit: 'contain', opacity: 0.85 }} />
    </div>
  )
}

export function AIBubble({ text, status, onRetry }: Props) {
  const [copied, setCopied] = useState(false)

  if (status === 'idle') return null

  const sepIdx    = text.indexOf('---EN CLAIR---')
  const techPart  = sepIdx >= 0 ? text.slice(0, sepIdx).trim() : text.trim()
  const plainPart = sepIdx >= 0 ? text.slice(sepIdx + 14).trim() : ''

  const isLoading = status === 'loading' || (status === 'streaming' && !text)

  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => undefined)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <div style={{ marginTop: 16 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '4px 16px 16px 16px',
          maxWidth: '85%',
        }}>
          <ShurikenSpinner size={22} />
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            Analyse en cours…
          </span>
        </div>
      </div>
    )
  }

  /* ── Error state ── */
  if (status === 'error') {
    return (
      <div style={{ marginTop: 16 }}>
        <div style={{
          display: 'flex', gap: 12, alignItems: 'flex-start',
          maxWidth: '85%',
        }}>
          <ShurikenAvatar size={32} />
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '4px 16px 16px 16px',
            padding: '14px 18px',
            fontSize: 13,
            color: '#EF4444',
          }}>
            Une erreur est survenue.{' '}
            <button
              onClick={onRetry}
              style={{ color: '#06B6D4', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Streaming / Done state ── */
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{
        display: 'flex', gap: 12, alignItems: 'flex-start',
        maxWidth: '85%',
      }}>
        <ShurikenAvatar size={32} />

        {/* Bulle */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '4px 16px 16px 16px',
          padding: '14px 18px',
          fontSize: 13,
          lineHeight: 1.7,
          color: 'var(--text-body)',
          flex: 1,
          minWidth: 0,
        }}>

          {/* Analyse technique */}
          {techPart && (
            <div>
              <div style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '.08em',
                textTransform: 'uppercase', color: 'var(--text-dim)',
                marginBottom: 8,
              }}>
                Analyse technique
              </div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{techPart}</div>
            </div>
          )}

          {/* Séparateur + En clair */}
          {plainPart && (
            <>
              <div style={{ borderTop: '1px solid var(--border)', margin: '14px 0' }} />
              <div style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '.08em',
                textTransform: 'uppercase', color: 'var(--text-dim)',
                marginBottom: 8,
              }}>
                En clair
              </div>
              <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{plainPart}</div>
            </>
          )}

          {/* Boutons */}
          {(status === 'done' || status === 'streaming') && text && (
            <div style={{
              display: 'flex', gap: 8, marginTop: 14,
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={handleCopy}
                style={{
                  fontSize: 11, color: 'var(--text-dim)',
                  background: 'none', border: '1px solid var(--border)',
                  borderRadius: 5, padding: '3px 8px', cursor: 'pointer',
                }}
              >
                {copied ? '✓ Copié' : 'Copier'}
              </button>
              {status === 'done' && (
                <button
                  onClick={onRetry}
                  style={{
                    fontSize: 11, color: '#06B6D4',
                    background: 'none', border: '1px solid rgba(6,182,212,0.3)',
                    borderRadius: 5, padding: '3px 8px', cursor: 'pointer',
                  }}
                >
                  Relancer
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
