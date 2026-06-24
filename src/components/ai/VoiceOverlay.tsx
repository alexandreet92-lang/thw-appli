'use client'

// ══════════════════════════════════════════════════════════════
// VoiceOverlay — mode dictée vocale (style Claude, image 2).
//
// Barre compacte ancrée en bas : ✕ · waveform · ✓.
// · La waveform reflète le VRAI volume du micro (Web Audio API) :
//   barres plates au silence, qui montent à la voix (historique
//   défilant, pilotage par barre).
// · Transcription discrète au-dessus de la barre.
// · Repli « piloté par la parole » si le micro est indisponible.
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const SHURIKEN = '#3C90D5'        // bleu du logo shuriken
const NBARS = 40                  // barres de la waveform (historique défilant)

export function VoiceOverlay({
  transcript,
  interim,
  onCancel,
  onConfirm,
}: {
  transcript: string
  interim: string
  onCancel: () => void
  onConfirm: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const bufRef = useRef<number[]>(new Array(NBARS).fill(0))
  const barsRef = useRef<(HTMLSpanElement | null)[]>([])
  const energyRef = useRef(0)
  const lastInterimRef = useRef('')
  const lastChangeRef = useRef(0)
  const tickRef = useRef(0)
  const interimRef = useRef(interim)
  const transcriptRef = useRef(transcript)
  interimRef.current = interim
  transcriptRef.current = transcript

  const hasText = (transcript + interim).trim().length > 0

  useEffect(() => { setMounted(true) }, [])

  // ── Animation de la waveform pilotée par l'ACTIVITÉ DE RECONNAISSANCE ──
  // On n'ouvre volontairement PAS getUserMedia ici : sur Safari/iOS, tenir le
  // micro via Web Audio en parallèle de SpeechRecognition fait échouer la
  // reconnaissance (« ça ne capte pas »). La waveform suit donc l'arrivée des
  // mots reconnus : barres qui montent quand tu parles, qui retombent au silence.
  useEffect(() => {
    const id = window.setInterval(() => {
      tickRef.current += 1
      const live = (transcriptRef.current + interimRef.current)
      if (live !== lastInterimRef.current) {
        energyRef.current = 1
        lastChangeRef.current = tickRef.current
        lastInterimRef.current = live
      } else {
        // décroissance douce dès qu'il n'y a plus de nouveaux mots
        energyRef.current *= 0.86
      }
      const e = energyRef.current
      const speaking = e > 0.06
      // Volume « simulé » lissé + variation par tick pour un rendu vivant.
      const v = speaking ? e * (0.55 + 0.45 * Math.abs(Math.sin(tickRef.current * 0.6))) : 0

      const buf = bufRef.current
      buf.push(v); buf.shift()
      for (let i = 0; i < NBARS; i++) {
        const el = barsRef.current[i]
        if (!el) continue
        const val = buf[i]
        // Ondulation au repos pour que la barre « respire » même au silence.
        const idle = 0.12 + 0.05 * Math.abs(Math.sin(i * 0.5 + tickRef.current * 0.18))
        const h = val > 0 ? 0.2 + val * 0.8 : idle
        el.style.transform = `scaleY(${h.toFixed(3)})`
        el.style.opacity = String(val > 0 ? 1 : 0.5)
      }
    }, 60)

    return () => window.clearInterval(id)
  }, [])

  if (!mounted) return null

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
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center',
          // Léger voile pour focaliser, sans masquer la conversation (cf. image 2).
          background: 'linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--ai-bg) 30%, transparent) 78%, color-mix(in srgb, var(--ai-bg) 62%, transparent) 100%)',
          animation: 'vo_in 0.2s ease',
          padding: 'calc(16px + env(safe-area-inset-bottom, 0px)) 14px',
          pointerEvents: 'none',
        }}
      >
        {/* Transcription discrète au-dessus de la barre */}
        {hasText && (
          <div style={{
            pointerEvents: 'none', maxWidth: 520, width: '100%', textAlign: 'center',
            margin: '0 0 12px', maxHeight: '26vh', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          }}>
            <p style={{
              margin: 0, fontFamily: 'var(--font-display, Fraunces), Georgia, serif',
              fontSize: 'clamp(18px, 4.4vw, 24px)', lineHeight: 1.34, fontWeight: 400, fontStyle: 'italic',
            }}>
              <span style={{ color: 'var(--ai-text)' }}>{transcript}</span>
              <span style={{ color: 'var(--ai-dim)' }}>{interim}</span>
            </p>
          </div>
        )}

        {/* Barre de contrôle compacte — ✕ · waveform · ✓ (style image 2) */}
        <div style={{
          pointerEvents: 'auto',
          width: '100%', maxWidth: 460, display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--ai-bg)', border: '1px solid var(--ai-border)', borderRadius: 999,
          padding: '7px 9px', boxShadow: '0 10px 34px rgba(0,0,0,0.18)',
          animation: 'vo_pill 0.26s cubic-bezier(0.32,0.72,0,1)',
        }}>
          {/* Annuler */}
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

          {/* Waveform — barres pilotées par le volume réel du micro */}
          <div style={{ flex: 1, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2.5, overflow: 'hidden' }}>
            {Array.from({ length: NBARS }, (_, i) => (
              <span
                key={i}
                ref={el => { barsRef.current[i] = el }}
                style={{
                  width: 3, height: '70%', borderRadius: 3, flexShrink: 0,
                  background: 'var(--ai-text)', transformOrigin: 'center',
                  transform: 'scaleY(0.12)', opacity: 0.5,
                  transition: 'transform 0.08s linear, opacity 0.12s linear', willChange: 'transform',
                }}
              />
            ))}
          </div>

          {/* Valider */}
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
    </>,
    document.body,
  )
}
