'use client'

// ══════════════════════════════════════════════════════════════
// VoiceOverlay — mode dictée vocale (style Claude).
//
// · Fond translucide + blur : la conversation et le champ d'écriture
//   restent visibles, floutés en arrière-plan.
// · Orbe « écoute » centrée qui respire et réagit au volume réel du
//   micro (Web Audio API), avec anneaux concentriques pulsés.
// · Transcription serif sous l'orbe.
// · Pilule compacte : ✕ · waveform · ✓ (bleu shuriken #3C90D5).
// · Repli automatique « piloté par la parole » si le micro est
//   indisponible (conflit iOS, autorisation partielle…).
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
  const orbRef = useRef<HTMLDivElement>(null)
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

  // ── Analyse du volume micro + animation orbe/waveform ───────
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
      // Waveform : barres animées en continu, amplifiées par le volume.
      const cont = waveRef.current
      if (cont) {
        const amp = 0.55 + Math.min(1, v) * 1.2
        cont.style.transform = `scaleY(${amp})`
        cont.style.opacity = String(0.6 + Math.min(1, v) * 0.4)
      }
      // Orbe : respire au repos, gonfle à la voix.
      const orb = orbRef.current
      if (orb) {
        const s = 1 + Math.min(1, v) * 0.22
        orb.style.transform = `scale(${s.toFixed(3)})`
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
        @keyframes vo_in    { from { opacity: 0 } to { opacity: 1 } }
        @keyframes vo_pill  { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes vo_wave  { 0%,100% { transform: scaleY(0.25) } 50% { transform: scaleY(0.9) } }
        @keyframes vo_orb   { 0%,100% { transform: scale(1) } 50% { transform: scale(1.06) } }
        @keyframes vo_ring  { 0% { transform: scale(0.85); opacity: 0.5 } 100% { transform: scale(1.7); opacity: 0 } }
        @keyframes vo_spin  { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Dictée vocale"
        style={{
          position: 'fixed', inset: 0, zIndex: 1500,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 26,
          background: 'color-mix(in srgb, var(--ai-bg) 62%, transparent)',
          backdropFilter: 'blur(22px) saturate(1.05)',
          WebkitBackdropFilter: 'blur(22px) saturate(1.05)',
          animation: 'vo_in 0.22s ease',
          padding: 'calc(24px + env(safe-area-inset-top, 0px)) 24px calc(20px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* ── Orbe « écoute » + anneaux pulsés ─────────────────── */}
        <div style={{ position: 'relative', width: 132, height: 132, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          {/* Anneaux concentriques qui s'évanouissent vers l'extérieur */}
          {[0, 1].map(i => (
            <span
              key={i}
              style={{
                position: 'absolute', width: 96, height: 96, borderRadius: '50%',
                border: `1.5px solid ${SHURIKEN}`,
                animation: `vo_ring 2.6s ease-out ${i * 1.3}s infinite`,
              }}
            />
          ))}
          {/* Halo dégradé rotatif */}
          <span
            style={{
              position: 'absolute', width: 120, height: 120, borderRadius: '50%',
              background: `conic-gradient(from 0deg, ${SHURIKEN}, color-mix(in srgb, ${SHURIKEN} 30%, transparent), ${SHURIKEN})`,
              filter: 'blur(10px)', opacity: 0.55,
              animation: 'vo_spin 7s linear infinite',
            }}
          />
          {/* Cœur de l'orbe (scale piloté par le volume) */}
          <div
            ref={orbRef}
            style={{
              position: 'relative', width: 92, height: 92, borderRadius: '50%',
              background: `radial-gradient(circle at 32% 28%, color-mix(in srgb, ${SHURIKEN} 18%, var(--ai-bg)) 0%, var(--ai-bg) 70%)`,
              border: `1px solid color-mix(in srgb, ${SHURIKEN} 45%, transparent)`,
              boxShadow: `0 8px 32px rgba(60,144,213,0.30), inset 0 0 22px rgba(60,144,213,0.18)`,
              animation: 'vo_orb 3.4s ease-in-out infinite',
              transition: 'transform 0.09s linear', willChange: 'transform',
              display: 'grid', placeItems: 'center',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={SHURIKEN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </div>
        </div>

        {/* ── Transcription ─────────────────────────────────────── */}
        <div
          ref={scrollRef}
          style={{
            flexShrink: 0, maxHeight: '30vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
            width: '100%', maxWidth: 560, padding: '0 8px', textAlign: 'center',
          }}
        >
          <p style={{
            margin: 0, fontFamily: 'var(--font-display, Fraunces), Georgia, serif',
            fontSize: 'clamp(20px, 4.6vw, 28px)', lineHeight: 1.34, fontWeight: 400, fontStyle: 'italic',
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

        {/* ── Pilule de contrôle — ✕ · waveform · ✓ ─────────────── */}
        <div style={{
          flexShrink: 0, width: '100%', maxWidth: 420, display: 'flex', alignItems: 'center', gap: 10,
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}
