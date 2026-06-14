'use client'

// ══════════════════════════════════════════════════════════════
// VoiceOverlay — mode dictée plein écran (style image 4).
//
// Transcription live en grand texte serif (Fraunces) au centre,
// barre de contrôle en pilule en bas : ✕ annuler · waveform ·
// ✓ valider. Portail sur document.body, au-dessus de tout.
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const ACCENT = '#06B6D4'

export function VoiceOverlay({
  transcript,
  interim,
  secs,
  onCancel,
  onConfirm,
}: {
  transcript: string
  interim: string
  secs: number
  onCancel: () => void
  onConfirm: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const active = interim.trim().length > 0
  const hasText = (transcript + interim).trim().length > 0

  useEffect(() => { setMounted(true) }, [])

  // Auto-scroll vers le bas au fil de la transcription
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [transcript, interim])

  if (!mounted) return null

  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')

  // Waveform : barres animées (plus amples quand l'utilisateur parle)
  const BARS = 28

  return createPortal(
    <>
      <style>{`
        @keyframes vo_fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes vo_bar  { 0%,100% { transform: scaleY(0.22) } 50% { transform: scaleY(1) } }
        @keyframes vo_dot  { 0%,100% { opacity: 0.35 } 50% { opacity: 1 } }
      `}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Dictée vocale"
        style={{
          position: 'fixed', inset: 0, zIndex: 1500,
          background: 'var(--ai-bg)', color: 'var(--ai-text)',
          display: 'flex', flexDirection: 'column',
          animation: 'vo_fade 0.22s ease',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'calc(18px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Timer + état */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '20px 0 6px' }}>
          <span style={{
            display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
            background: ACCENT, animation: 'vo_dot 1.1s ease-in-out infinite',
          }} />
          <span style={{ fontFamily: 'DM Mono, ui-monospace, monospace', fontSize: 13, color: 'var(--ai-mid)', letterSpacing: '0.04em' }}>
            {mm}:{ss}
          </span>
        </div>

        {/* Transcription live — gros texte serif */}
        <div
          ref={scrollRef}
          style={{
            flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
            display: 'flex', flexDirection: 'column', justifyContent: hasText ? 'flex-start' : 'center',
            padding: '14px 26px 24px',
          }}
        >
          {hasText ? (
            <p style={{
              margin: 0, fontFamily: 'var(--font-display, Fraunces), Georgia, serif',
              fontSize: 'clamp(26px, 6.4vw, 38px)', lineHeight: 1.32, fontWeight: 400,
              letterSpacing: '-0.01em',
            }}>
              <span style={{ color: 'var(--ai-text)' }}>{transcript}</span>
              <span style={{ color: 'var(--ai-dim)' }}>{interim}</span>
            </p>
          ) : (
            <p style={{
              margin: 0, textAlign: 'center', fontFamily: 'var(--font-display, Fraunces), Georgia, serif',
              fontSize: 'clamp(22px, 5.2vw, 30px)', color: 'var(--ai-dim)', fontStyle: 'italic', fontWeight: 400,
            }}>
              Je t&apos;écoute…
            </p>
          )}
        </div>

        {/* Barre de contrôle — pilule : ✕ · waveform · ✓ */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '8px 22px 0' }}>
          {/* Annuler */}
          <button
            onClick={onCancel}
            aria-label="Annuler"
            style={{
              width: 56, height: 56, borderRadius: '50%', border: 'none', flexShrink: 0,
              background: 'var(--ai-bg2, rgba(127,127,127,0.16))', color: 'var(--ai-text)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>

          {/* Waveform */}
          <div style={{ flex: 1, maxWidth: 240, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, overflow: 'hidden' }}>
            {Array.from({ length: BARS }, (_, i) => {
              const d = Math.abs(i - (BARS - 1) / 2) / (BARS / 2) // 0 au centre → 1 aux bords
              return (
                <span key={i} style={{
                  width: 3, height: '100%', borderRadius: 3, flexShrink: 0,
                  background: ACCENT,
                  opacity: active ? 0.55 + (1 - d) * 0.45 : 0.3,
                  transformOrigin: 'center',
                  transform: 'scaleY(0.22)',
                  animation: `vo_bar ${active ? 0.5 + (i % 6) * 0.08 : 1.4 + (i % 4) * 0.2}s ease-in-out ${(i * 0.045) % 0.9}s infinite`,
                }} />
              )
            })}
          </div>

          {/* Valider */}
          <button
            onClick={onConfirm}
            aria-label="Valider"
            style={{
              width: 56, height: 56, borderRadius: '50%', border: 'none', flexShrink: 0,
              background: ACCENT, color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 18px rgba(6,182,212,0.4)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}
