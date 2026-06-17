'use client'

// ══════════════════════════════════════════════════════════════
// VoiceConversation — mode discussion vocale (v1, 100 % navigateur).
//
// Boucle : écoute (STT) → silence = fin de tour → coach (Claude) →
// lecture de la réponse (TTS) → réécoute. Barge-in : si l'utilisateur
// parle pendant que l'IA lit, on coupe la voix et on réécoute.
// Aucune API payante : Web Speech API (reconnaissance + synthèse).
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const ACCENT = '#3C90D5'
const SILENCE_MS = 2500   // silence = fin du tour de parole
const NBARS = 28

type Phase = 'listening' | 'thinking' | 'speaking'

function stripForSpeech(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*_`>]/g, '')
    .replace(/^\s*[-•→]\s*/gm, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function VoiceConversation({ onTurn, onClose }: {
  onTurn: (text: string) => Promise<string>
  onClose: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [phase, setPhase] = useState<Phase>('listening')
  const [live, setLive] = useState('')       // transcription en cours (utilisateur)
  const [spoken, setSpoken] = useState('')    // texte lu par l'IA
  const [supported, setSupported] = useState(true)

  const phaseRef = useRef<Phase>('listening')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null)
  const finalRef = useRef('')
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const endedRef = useRef(false)

  const setPhaseBoth = (p: Phase) => { phaseRef.current = p; setPhase(p) }

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR || typeof window.speechSynthesis === 'undefined') { setSupported(false); return }

    // précharge les voix (certaines plateformes les chargent en asynchrone)
    window.speechSynthesis.getVoices()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR()
    rec.lang = 'fr-FR'; rec.continuous = true; rec.interimResults = true
    recRef.current = rec

    const armSilence = () => {
      if (silenceRef.current) clearTimeout(silenceRef.current)
      silenceRef.current = setTimeout(() => {
        if (phaseRef.current === 'listening' && finalRef.current.trim()) void finalizeTurn()
      }, SILENCE_MS)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      if (endedRef.current) return
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalRef.current += t + ' '
        else interim += t
      }
      const txt = (finalRef.current + interim).trim()
      // Barge-in : l'IA parle et on dit quelque chose → on la coupe
      if (phaseRef.current === 'speaking' && txt.length > 2) {
        window.speechSynthesis.cancel()
        setSpoken('')
        setPhaseBoth('listening')
      }
      if (phaseRef.current === 'listening') { setLive(txt); armSilence() }
    }
    rec.onend = () => { if (!endedRef.current) { try { rec.start() } catch { /* déjà démarrée */ } } }
    rec.onerror = () => { /* ignore (no-speech, aborted…) */ }
    try { rec.start() } catch { /* ignore */ }
    setPhaseBoth('listening')

    return () => {
      endedRef.current = true
      if (silenceRef.current) clearTimeout(silenceRef.current)
      try { rec.stop() } catch { /* ignore */ }
      window.speechSynthesis.cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  async function finalizeTurn() {
    const userText = finalRef.current.trim()
    finalRef.current = ''
    setLive('')
    if (!userText) { setPhaseBoth('listening'); return }
    setPhaseBoth('thinking')
    let resp = ''
    try { resp = await onTurn(userText) } catch { resp = '' }
    if (endedRef.current) return
    speak(resp)
  }

  function speak(text: string) {
    const clean = stripForSpeech(text)
    const synth = window.speechSynthesis
    if (!clean || !synth) { setPhaseBoth('listening'); return }
    setSpoken(clean)
    setPhaseBoth('speaking')
    synth.cancel()
    const u = new SpeechSynthesisUtterance(clean)
    u.lang = 'fr-FR'; u.rate = 1.03
    const fr = synth.getVoices().find(v => v.lang?.toLowerCase().startsWith('fr'))
    if (fr) u.voice = fr
    u.onend = () => { if (!endedRef.current) { setSpoken(''); setPhaseBoth('listening') } }
    u.onerror = () => { if (!endedRef.current) { setSpoken(''); setPhaseBoth('listening') } }
    synth.speak(u)
  }

  if (!mounted) return null

  const status = !supported ? 'Vocal non supporté sur ce navigateur'
    : phase === 'listening' ? 'Je t’écoute…'
    : phase === 'thinking' ? 'Je réfléchis…'
    : 'Je réponds…'
  const centerText = phase === 'speaking' ? spoken : (live || (phase === 'thinking' ? '…' : 'Parle, je t’écoute…'))

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Conversation vocale" style={{
      position: 'fixed', inset: 0, zIndex: 1500,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      background: 'color-mix(in srgb, var(--ai-bg) 60%, transparent)',
      backdropFilter: 'blur(20px) saturate(1.05)', WebkitBackdropFilter: 'blur(20px) saturate(1.05)',
      paddingTop: 'calc(30px + env(safe-area-inset-top, 0px))',
      paddingBottom: 'calc(28px + env(safe-area-inset-bottom, 0px))',
      animation: 'vc_in 0.22s ease',
    }}>
      {/* Statut */}
      <div style={{ textAlign: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--ai-mid)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: phase === 'speaking' ? ACCENT : '#22c55e', animation: 'vc_dot 1.1s ease-in-out infinite' }} />
          {status}
        </span>
      </div>

      {/* Texte central */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 26px', overflowY: 'auto' }}>
        <p style={{
          margin: 0, textAlign: 'center', fontFamily: 'var(--font-display, Fraunces), Georgia, serif',
          fontSize: 'clamp(20px, 5vw, 30px)', lineHeight: 1.4, color: 'var(--ai-text)',
          fontStyle: phase === 'listening' && !live ? 'italic' : 'normal',
        }}>{centerText}</p>
      </div>

      {/* Waveform + raccrocher */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ height: 30, display: 'flex', alignItems: 'center', gap: 3 }}>
          {Array.from({ length: NBARS }, (_, i) => (
            <span key={i} style={{
              width: 3, height: '100%', borderRadius: 3, transformOrigin: 'center',
              background: phase === 'speaking' ? ACCENT : 'var(--ai-text)',
              opacity: phase === 'thinking' ? 0.3 : 0.85,
              animation: `vc_wave ${0.7 + (i % 5) * 0.13}s ease-in-out ${((i * 0.07) % 0.9).toFixed(2)}s infinite`,
              animationPlayState: phase === 'thinking' ? 'paused' : 'running',
            }} />
          ))}
        </div>
        <button onClick={onClose} aria-label="Terminer la conversation" style={{
          width: 60, height: 60, borderRadius: '50%', border: 'none', background: '#ef4444', color: '#fff',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 18px rgba(239,68,68,0.4)',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <span style={{ fontSize: 11, color: 'var(--ai-dim)' }}>Coupe-moi la parole quand tu veux · rouge = terminer</span>
      </div>

      <style>{`
        @keyframes vc_in   { from { opacity: 0 } to { opacity: 1 } }
        @keyframes vc_dot  { 0%,100% { opacity: .4 } 50% { opacity: 1 } }
        @keyframes vc_wave { 0%,100% { transform: scaleY(.25) } 50% { transform: scaleY(.9) } }
      `}</style>
    </div>,
    document.body,
  )
}
