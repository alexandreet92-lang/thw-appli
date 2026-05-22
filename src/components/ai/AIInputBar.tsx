'use client'
import { type RefObject, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react'

interface Props {
  input:         string
  onChange:      (e: ChangeEvent<HTMLTextAreaElement>) => void
  onKeyDown:     (e: KeyboardEvent<HTMLTextAreaElement>) => void
  onSend:        () => void
  loading:       boolean
  disabled?:     boolean
  onPlusClick:   () => void
  plusOpen:      boolean
  quotedText?:   string | null
  onCancelQuote?: () => void
  /** Slot for model picker */
  children?:     ReactNode
  textareaRef?:  RefObject<HTMLTextAreaElement>
}

export default function AIInputBar({
  input, onChange, onKeyDown, onSend,
  loading, disabled,
  onPlusClick, plusOpen,
  quotedText, onCancelQuote,
  children, textareaRef,
}: Props) {
  const canSend = input.trim().length > 0 && !loading && !disabled

  return (
    <div className="aip-input-footer" style={{ padding: '0 16px 16px', background: 'transparent', flexShrink: 0 }}>
      <div className="aip-input-wrap" style={{
        borderRadius: 24, background: 'var(--ai-bg2)',
        border: '1px solid transparent', display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Quoted text preview */}
        {quotedText && (
          <div style={{
            padding: '8px 14px 0', display: 'flex', alignItems: 'flex-start', gap: 8,
            borderBottom: '1px solid var(--ai-border)',
          }}>
            <div style={{ flex: 1, borderLeft: '2px solid var(--ai-accent)', paddingLeft: 8 }}>
              <p style={{ fontSize: 11, color: 'var(--ai-dim)', margin: 0, lineHeight: 1.5, fontStyle: 'italic',
                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                {quotedText}
              </p>
            </div>
            {onCancelQuote && (
              <button onClick={onCancelQuote} style={{ color: 'var(--ai-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', lineHeight: 1, flexShrink: 0 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>
        )}

        {/* Input row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', padding: '4px 8px 4px 4px', gap: 4 }}>
          {/* Plus button */}
          <button
            onClick={onPlusClick}
            title="Actions rapides"
            style={{
              width: 34, height: 34, borderRadius: 20, border: 'none',
              background: plusOpen ? 'var(--ai-accent-dim)' : 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: plusOpen ? 'var(--ai-accent)' : 'var(--ai-dim)',
              flexShrink: 0, transition: 'background 0.12s, color 0.12s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef ?? null}
            value={input}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder="Message..."
            rows={1}
            style={{
              flex: 1, border: 'none', outline: 'none', resize: 'none',
              background: 'transparent', fontFamily: 'DM Sans,sans-serif',
              fontSize: 15, lineHeight: 1.55, color: 'var(--ai-text)',
              padding: '8px 4px', maxHeight: 200, overflowY: 'auto',
            }}
          />

          {/* Model picker slot */}
          {children && <div style={{ flexShrink: 0, alignSelf: 'flex-end', paddingBottom: 4 }}>{children}</div>}

          {/* Send button */}
          <button
            onClick={onSend}
            disabled={!canSend}
            style={{
              width: 34, height: 34, borderRadius: 20, border: 'none',
              background: canSend ? 'var(--ai-accent)' : 'var(--ai-bg)',
              cursor: canSend ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 0.15s',
            }}
          >
            {loading ? (
              <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', animation: 'ai_spin 0.8s linear infinite' }} />
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={canSend ? 'white' : 'var(--ai-border)'} strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
