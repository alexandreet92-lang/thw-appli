'use client'

// ══════════════════════════════════════════════════════════════
// VoiceOverlay — mode dictée vocale (style Claude).
//
// · Transcription fine et discrète, fondu en haut.
// · Mobile : barre ancrée en bas, léger flou. Desktop : barre centrée
//   au milieu de l'écran sur un fond adouci.
// · Waveform qui DÉFILE vraiment : un buffer d'amplitudes scrolle vers
//   la gauche à chaque frame (nouvelle valeur à droite). Haut quand on
//   parle, petits traits qui glissent au silence.
//
// On n'ouvre PAS getUserMedia : tenir le micro via Web Audio en parallèle
// de SpeechRecognition fait échouer la reco sur Safari/iOS.
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const SHURIKEN = '#3C90D5'
const NBARS = 32

export function VoiceOverlay({
  transcript,
  interim,
  onCancel,
  onConfirm,
  isDesktop = false,
}: {
  transcript: string
  interim: string
  onCancel: () => void
  onConfirm: () => void
  isDesktop?: boolean
}) {
  const [mounted, setMounted] = useState(false)
  const bufRef = useRef<number[]>(new Array(NBARS).fill(0.06))
  const barsRef = useRef<(HTMLSpanElement | null)[]>([])
  const energyRef = useRef(0)
  const lastLiveRef = useRef('')
  const interimRef = useRef(interim)
  const transcriptRef = useRef(transcript)
  interimRef.current = interim
  transcriptRef.current = transcript

  const hasText = (transcript + interim).trim().length > 0

  useEffect(() => { setMounted(true) }, [])

  // Buffer défilant : à CHAQUE frame on pousse une nouvelle amplitude à droite
  // et on décale tout vers la gauche → l'onde « défile » en continu.
  useEffect(() => {
    const id = window.setInterval(() => {
      const live = transcriptRef.current + interimRef.current
      if (live !== lastLiveRef.current) { energyRef.current = 1; lastLiveRef.current = live }
      else energyRef.current *= 0.9
      const e = energyRef.current
      // amplitude de la nouvelle barre : forte si on parle, minuscule au silence
      const newVal = e > 0.12
        ? Math.min(1, (0.35 + Math.random() * 0.65) * (0.5 + e * 0.5))
        : 0.05 + Math.random() * 0.05
      const buf = bufRef.current
      buf.push(newVal); buf.shift()
      for (let i = 0; i < NBARS; i++) {
        const el = barsRef.current[i]
        if (!el) continue
        const h = 0.16 + buf[i] * 0.84            // plancher visible → on voit toujours défiler
        el.style.transform = `scaleY(${h.toFixed(3)})`
        el.style.opacity = String(0.4 + buf[i] * 0.6)
      }
    }, 55)
    return () => window.clearInterval(id)
  }, [])

  if (!mounted) return null

  // Mobile : ancré en bas + flou. Desktop : centré au milieu de l'écran.
  const block = (
    <div style={{
      width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
      ...(isDesktop
        ? { maxWidth: 520, padding: '0 16px' }
        : {
            padding: 'clamp(24px,8vh,80px) 16px calc(16px + env(safe-area-inset-bottom, 0px))',
            background: 'linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--ai-bg) 55%, transparent) 38%, var(--ai-bg) 100%)',
            backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 56px)',
            maskImage: 'linear-gradient(to bottom, transparent 0, #000 56px)',
          }),
    }}>
      {/* Transcription — fine, fondu en haut */}
      {hasText && (
        <div style={{
          maxWidth: 520, width: '100%', textAlign: 'center',
          margin: '0 0 16px', maxHeight: '24vh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 34px)',
          maskImage: 'linear-gradient(to bottom, transparent 0, #000 34px)',
        }}>
          <p style={{
            margin: 0, fontFamily: 'var(--font-display, Fraunces), Georgia, serif',
            fontSize: 'clamp(15px, 3.7vw, 19px)', lineHeight: 1.4, fontWeight: 400, fontStyle: 'italic',
            letterSpacing: '0.01em',
          }}>
            <span style={{ color: 'var(--ai-text)' }}>{transcript}</span>
            <span style={{ color: 'var(--ai-dim)' }}>{interim}</span>
          </p>
        </div>
      )}

      {/* Barre de contrôle — ✕ · waveform · ✓ */}
      <div style={{
        pointerEvents: 'auto',
        width: '100%', maxWidth: 440, display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--ai-bg)', border: '1px solid var(--ai-border)', borderRadius: 999,
        padding: '7px 9px', boxShadow: '0 12px 38px rgba(0,0,0,0.20)',
        animation: 'vo_pill 0.26s cubic-bezier(0.32,0.72,0,1)',
      }}>
        <button
          onClick={onCancel}
          aria-label="Annuler"
          style={{
            width: 42, height: 42, borderRadius: '50%', border: 'none', flexShrink: 0,
            background: 'var(--ai-bg2, rgba(127,127,127,0.14))', color: 'var(--ai-text)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>

        {/* Waveform défilante */}
        <div style={{ flex: 1, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, overflow: 'hidden' }}>
          {Array.from({ length: NBARS }, (_, i) => (
            <span
              key={i}
              ref={el => { barsRef.current[i] = el }}
              style={{
                width: 3, height: '100%', borderRadius: 3, flexShrink: 0,
                background: 'var(--ai-text)', transformOrigin: 'center',
                transform: 'scaleY(0.16)', opacity: 0.45,
                transition: 'transform 0.07s linear, opacity 0.1s linear', willChange: 'transform',
              }}
            />
          ))}
        </div>

        <button
          onClick={onConfirm}
          aria-label="Valider"
          style={{
            width: 42, height: 42, borderRadius: '50%', border: 'none', flexShrink: 0,
            background: SHURIKEN, color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(60,144,213,0.42)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        </button>
      </div>
    </div>
  )

  return createPortal(
    <>
      <style>{`
        @keyframes vo_in   { from { opacity: 0 } to { opacity: 1 } }
        @keyframes vo_pill { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Dictée vocale"
        style={{
          position: 'fixed', inset: 0, zIndex: 1500,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: isDesktop ? 'center' : 'flex-end',
          animation: 'vo_in 0.2s ease',
          pointerEvents: 'none',
          ...(isDesktop
            ? {
                background: 'color-mix(in srgb, var(--ai-bg) 52%, rgba(0,0,0,0.22))',
                backdropFilter: 'blur(14px) saturate(1.05)', WebkitBackdropFilter: 'blur(14px) saturate(1.05)',
              }
            : {}),
        }}
      >
        {block}
      </div>
    </>,
    document.body,
  )
}
