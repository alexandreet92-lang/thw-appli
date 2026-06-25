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

  // Buffer défilant piloté par le VRAI volume du micro (Web Audio) → les barres
  // réagissent réellement à la voix, comme Claude. L'analyse N'EST PAS reliée à
  // la sortie (aucun retour audio). Repli sur l'activité de reconnaissance si le
  // micro est indisponible.
  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any = null
    let analyser: AnalyserNode | null = null
    let data: Uint8Array | null = null
    let stream: MediaStream | null = null

    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Ctx = window.AudioContext || (window as any).webkitAudioContext
        ctx = new Ctx()
        const src = ctx.createMediaStreamSource(stream)
        const a: AnalyserNode = ctx.createAnalyser()
        a.fftSize = 256
        src.connect(a)                   // PAS de connexion à destination (pas de larsen)
        await ctx.resume?.()
        analyser = a
        data = new Uint8Array(a.fftSize)
      } catch { /* pas de micro → repli reconnaissance */ }
    })()

    const id = window.setInterval(() => {
      let v = 0
      const an = analyser
      const dt = data
      if (an && dt) {
        if (ctx?.state === 'suspended') ctx.resume?.()
        an.getByteTimeDomainData(dt)
        let sum = 0
        for (let i = 0; i < dt.length; i++) { const d = (dt[i] - 128) / 128; sum += d * d }
        v = Math.min(1, Math.sqrt(sum / dt.length) * 7.5)   // RMS + gain
        if (v < 0.04) v = 0                                  // noise gate
      } else {
        // Repli : enveloppe pilotée par l'arrivée des mots reconnus
        const live = transcriptRef.current + interimRef.current
        if (live !== lastLiveRef.current) { energyRef.current = 1; lastLiveRef.current = live }
        else energyRef.current *= 0.9
        const e = energyRef.current
        v = e > 0.12 ? (0.35 + Math.random() * 0.65) * (0.5 + e * 0.5) : 0
      }
      const buf = bufRef.current
      buf.push(v); buf.shift()
      for (let i = 0; i < NBARS; i++) {
        const el = barsRef.current[i]
        if (!el) continue
        const h = 0.14 + buf[i] * 0.86            // plancher visible → on voit toujours défiler
        el.style.transform = `scaleY(${h.toFixed(3)})`
        el.style.opacity = String(0.5 + buf[i] * 0.5)
      }
    }, 55)

    return () => {
      cancelled = true
      window.clearInterval(id)
      try { stream?.getTracks().forEach(t => t.stop()) } catch { /* ignore */ }
      try { ctx?.close?.() } catch { /* ignore */ }
    }
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
        <div style={{ flex: 1, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, overflow: 'hidden' }}>
          {Array.from({ length: NBARS }, (_, i) => (
            <span
              key={i}
              ref={el => { barsRef.current[i] = el }}
              style={{
                width: 3.5, height: '100%', borderRadius: 4, flexShrink: 0,
                background: 'var(--ai-text)', transformOrigin: 'center',
                transform: 'scaleY(0.14)', opacity: 0.5,
                transition: 'transform 0.06s linear, opacity 0.1s linear', willChange: 'transform',
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
