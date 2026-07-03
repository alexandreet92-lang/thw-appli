'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import type { AIStatus } from '@/hooks/useAIAnalysis'
import { useI18n } from '@/lib/i18n'

interface Props {
  text:    string
  status:  AIStatus
  onRetry: () => void
}

const markdownComponents: Components = {
  h1: ({ children }) => <h1 style={{
    fontSize: 15, fontWeight: 600, color: 'var(--text)',
    margin: '14px 0 6px 0',
  }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{
    fontSize: 14, fontWeight: 600, color: 'var(--text)',
    margin: '12px 0 5px 0',
  }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{
    fontSize: 13, fontWeight: 600, color: 'var(--text)',
    margin: '10px 0 4px 0',
  }}>{children}</h3>,
  p: ({ children }) => <p style={{
    fontSize: 13, color: 'var(--text)', lineHeight: 1.65,
    margin: '0 0 8px 0',
  }}>{children}</p>,
  strong: ({ children }) => <strong style={{
    color: 'var(--text)', fontWeight: 600,
  }}>{children}</strong>,
  ul: ({ children }) => <ul style={{
    paddingLeft: 18, margin: '4px 0 8px',
  }}>{children}</ul>,
  li: ({ children }) => <li style={{
    fontSize: 13, color: 'var(--text)', lineHeight: 1.6,
    marginBottom: 3,
  }}>{children}</li>,
  table: ({ children }) => <div style={{ overflowX: 'auto', margin: '8px 0' }}>
    <table style={{
      width: '100%', borderCollapse: 'collapse', fontSize: 12,
    }}>{children}</table>
  </div>,
  thead: ({ children }) => <thead>{children}</thead>,
  tr: ({ children }) => <tr style={{
    borderBottom: '1px solid var(--border)',
  }}>{children}</tr>,
  th: ({ children }) => <th style={{
    textAlign: 'left', padding: '6px 10px',
    fontSize: 11, fontWeight: 600,
    color: 'var(--text-dim)',
    background: 'var(--bg-card2)',
    textTransform: 'uppercase', letterSpacing: '.05em',
  }}>{children}</th>,
  td: ({ children }) => <td style={{
    padding: '6px 10px',
    fontSize: 12, color: 'var(--text)',
    borderBottom: '1px solid var(--border)',
  }}>{children}</td>,
  hr: () => <hr style={{
    border: 'none', borderTop: '1px solid var(--border)',
    margin: '14px 0',
  }} />,
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

function ShurikenAvatar() {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%',
      background: 'rgba(6,182,212,0.1)',
      border: '1px solid rgba(6,182,212,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, marginTop: 2,
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logos/logo_4bras.png" alt="THW AI" width={20} height={20}
        style={{ width: 20, height: 20, objectFit: 'contain', opacity: 0.85 }} />
    </div>
  )
}

export function AIBubble({ text, status, onRetry }: Props) {
  const { t } = useI18n()
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
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: '4px 16px 16px 16px',
          maxWidth: '90%',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <ShurikenSpinner size={22} />
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            {t('activities.analysisInProgress')}
          </span>
        </div>
      </div>
    )
  }

  /* ── Error state ── */
  if (status === 'error') {
    return (
      <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'flex-start', maxWidth: '90%' }}>
        <ShurikenAvatar />
        <div style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: '4px 16px 16px 16px',
          padding: '14px 18px',
          fontSize: 13,
          color: '#EF4444',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          {t('activities.errorOccurred')}{' '}
          <button
            onClick={onRetry}
            style={{ color: '#06B6D4', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
          >
            {t('activities.retry')}
          </button>
        </div>
      </div>
    )
  }

  /* ── Streaming / Done state ── */
  return (
    <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'flex-start', maxWidth: '90%' }}>
      <ShurikenAvatar />

      {/* Bulle */}
      <div style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: '4px 16px 16px 16px',
        padding: '20px 24px',
        flex: 1,
        minWidth: 0,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>

        {/* Analyse technique */}
        {techPart && (
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
              textTransform: 'uppercase', color: 'var(--text-dim)',
              marginBottom: 12, paddingBottom: 8,
              borderBottom: '1px solid var(--border)',
            }}>
              {t('activities.technicalAnalysis')}
            </div>
            <ReactMarkdown components={markdownComponents}>{techPart}</ReactMarkdown>
          </div>
        )}

        {/* Séparateur + En clair */}
        {plainPart && (
          <>
            <div style={{ margin: '20px 0', borderTop: '1px solid var(--border)' }} />
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
              textTransform: 'uppercase', color: 'var(--text-dim)',
              marginBottom: 12, paddingBottom: 8,
              borderBottom: '1px solid var(--border)',
            }}>
              {t('activities.inPlainWords')}
            </div>
            <ReactMarkdown components={markdownComponents}>{plainPart}</ReactMarkdown>
          </>
        )}

        {/* Boutons */}
        {(status === 'done' || status === 'streaming') && text && (
          <div style={{
            marginTop: 16, paddingTop: 12,
            borderTop: '1px solid var(--border)',
            display: 'flex', justifyContent: 'flex-end', gap: 12,
          }}>
            <button
              onClick={handleCopy}
              style={{
                fontSize: 12, color: 'var(--text-dim)',
                background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              {copied ? t('activities.copied') : t('activities.copy')}
            </button>
            {status === 'done' && (
              <button
                onClick={onRetry}
                style={{
                  fontSize: 12, color: '#06B6D4',
                  background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                {t('activities.rerun')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
