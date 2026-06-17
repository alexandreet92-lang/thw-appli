'use client'

// ══════════════════════════════════════════════════════════════
// VoiceOverlay — mode dictée (style Claude mobile).
//
// · Fond translucide + blur : la conversation et le champ d'écriture
//   restent visibles, floutés en arrière-plan.
// · Transcription serif ancrée juste au-dessus de la barre de contrôle.
// · Waveform réactive au VRAI volume du micro (Web Audio API) :
//   points plats au silence, barres qui montent à la voix. Repli
//   automatique « piloté par la parole » si le micro est indisponible.
// · Pilule compacte : ✕ · waveform · ✓ (bleu shuriken #3C90D5).
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const SHURIKEN = '#3C90D5'        // bleu du logo shuriken
const NBARS = 34                  // barres de la waveform (historique défilant)

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
  const scrollRef = useRef<HTMLDivElement>(null)
  const bufRef = useRef<number[]>(new Array(NBARS).fill(0))
  const waveRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audioRef = useRef<{ ctx: any; stream: MediaStream; analyser: AnalyserNode; data: Uint8Array } | null>(null)
  const fallbackRef = useRef(false)
  const fbEnergyRef = useRef(0)
  const silentTicksRef = useRef(0)
  const interimRef = useRef(interim)
  const lastInterimRef = useRef('')
  interimRef.current = interim

  const hasText = (transcript + interim).trim().length > 0

  useEffect(() => { setMounted(true) }, [])

  // Auto-scroll de la transcription
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [transcript, interim])

  // ── Analyse du volume micro + animation de la waveform ──────
  useEffect(() => {
    let cancelled = false

    async function setup() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Ctx = window.AudioContext || (window as any).webkitAudioContext
        const ctx = new Ctx()
        const src = ctx.createMediaStreamSource(stream)
        const analyser: AnalyserNode = ctx.createAnalyser()
        analyser.fftSize = 256
        src.connect(analyser)
        await ctx.resume?.()   // iOS : le contexte démarre souvent « suspended »
        audioRef.current = { ctx, stream, analyser, data: new Uint8Array(analyser.fftSize) }
      } catch {
        fallbackRef.current = true   // pas d'accès micro → repli sur la parole
      }
    }
    void setup()

    const id = window.setInterval(() => {
      let v = 0
      const a = audioRef.current
      if (a) {
        if (a.ctx.state === 'suspended') a.ctx.resume?.()
        a.analyser.getByteTimeDomainData(a.data)
        let sum = 0
        for (let i = 0; i < a.data.length; i++) { const d = (a.data[i] - 128) / 128; sum += d * d }
        v = Math.min(1, Math.sqrt(sum / a.data.length) * 6.0)   // RMS + gain (plus sensible)
        if (v < 0.035) v = 0                                    // noise gate → silence = plat
        // Auto-bascule : si le micro réel ne capte rien pendant que la parole EST reconnue
        // (conflit micro iOS), on passe sur l'enveloppe pilotée par la parole.
        if (v > 0.04) silentTicksRef.current = 0
        else if (interimRef.current.trim()) {
          silentTicksRef.current += 1
          if (silentTicksRef.current > 12) {
            try { a.stream.getTracks().forEach(t => t.stop()); a.ctx.close?.() } catch { /* ignore */ }
            audioRef.current = null
            fallbackRef.current = true
          }
        }
      } else if (fallbackRef.current) {
        // Repli : enveloppe pilotée par l'activité de reconnaissance
        const cur = interimRef.current
        if (cur && cur !== lastInterimRef.current) fbEnergyRef.current = 1
        else fbEnergyRef.current *= 0.82
        lastInterimRef.current = cur
        v = fbEnergyRef.current > 0.05 ? fbEnergyRef.current * (0.4 + Math.random() * 0.45) : 0
      }
      const buf = bufRef.current
      buf.push(v); buf.shift()
      // Les barres bougent en continu (animation CSS). Le volume amplifie
      // l'ensemble : silence → idle, fort → barres plus hautes.
      const cont = waveRef.current
      if (cont) {
        const amp = 0.55 + Math.min(1, v) * 1.2
        cont.style.transform = `scaleY(${amp})`
        cont.style.opacity = String(0.6 + Math.min(1, v) * 0.4)
      }
    }, 65)

    return () => {
      cancelled = true
      window.clearInterval(id)
      const a = audioRef.current
      if (a) {
        a.stream.getTracks().forEach(t => t.stop())
        a.ctx.close?.()
        audioRef.current = null
      }
    }
  }, [])

  if (!mounted) return null

  return createPortal(
    <>
      <style>{`
        @keyframes vo_in   { from { opacity: 0 } to { opacity: 1 } }
        @keyframes vo_pill { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes vo_wave { 0%,100% { transform: scaleY(0.25) } 50% { transform: scaleY(0.9) } }
      `}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Dictée vocale"
        style={{
          position: 'fixed', inset: 0, zIndex: 1500,
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          background: 'color-mix(in srgb, var(--ai-bg) 58%, transparent)',
          backdropFilter: 'blur(18px) saturate(1.05)',
          WebkitBackdropFilter: 'blur(18px) saturate(1.05)',
          animation: 'vo_in 0.22s ease',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Transcription — juste au-dessus de la pilule */}
        <div
          ref={scrollRef}
          style={{
            flexShrink: 0, maxHeight: '36vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            padding: '0 24px 14px',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 42px)',
            maskImage: 'linear-gradient(to bottom, transparent 0, #000 42px)',
          }}
        >
          <p style={{
            margin: 0, fontFamily: 'var(--font-display, Fraunces), Georgia, serif',
            fontSize: 'clamp(22px, 5.4vw, 30px)', lineHeight: 1.32, fontWeight: 400, fontStyle: 'italic',
            letterSpacing: '-0.01em',
          }}>
            {hasText ? (
              <>
                <span style={{ color: 'var(--ai-text)' }}>{transcript}</span>
                <span style={{ color: 'var(--ai-dim)' }}>{interim}</span>
              </>
            ) : (
              <span style={{ color: 'var(--ai-dim)' }}>Je t&apos;écoute…</span>
            )}
          </p>
        </div>

        {/* Pilule de contrôle — ✕ · waveform · ✓ */}
        <div style={{
          flexShrink: 0, margin: '0 14px', display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--ai-bg)', border: '1px solid var(--ai-border)', borderRadius: 999,
          padding: '7px 9px', boxShadow: '0 8px 28px rgba(0,0,0,0.16)',
          animation: 'vo_pill 0.26s cubic-bezier(0.32,0.72,0,1)',
        }}>
          {/* Annuler */}
          <button
            onClick={onCancel}
            aria-label="Annuler"
            style={{
              width: 44, height: 44, borderRadius: '50%', border: 'none', flexShrink: 0,
              background: 'var(--ai-bg2, rgba(127,127,127,0.14))', color: 'var(--ai-text)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>

          {/* Waveform — barres animées en continu, amplifiées par le volume */}
          <div ref={waveRef} style={{ flex: 1, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, overflow: 'hidden', transformOrigin: 'center', transition: 'transform 0.09s linear, opacity 0.12s linear', willChange: 'transform' }}>
            {Array.from({ length: NBARS }, (_, i) => (
              <span
                key={i}
                style={{
                  width: 3, height: '100%', borderRadius: 3, flexShrink: 0,
                  background: 'var(--ai-text)', transformOrigin: 'center',
                  animation: `vo_wave ${0.7 + (i % 5) * 0.13}s ease-in-out ${((i * 0.07) % 0.9).toFixed(2)}s infinite`,
                }}
              />
            ))}
          </div>

          {/* Valider */}
          <button
            onClick={onConfirm}
            aria-label="Valider"
            style={{
              width: 44, height: 44, borderRadius: '50%', border: 'none', flexShrink: 0,
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
