'use client'

// ══════════════════════════════════════════════════════════════
// VoiceConversation — mode discussion vocale (v1, 100 % navigateur).
//
// Boucle : écoute (STT) → silence = fin de tour → coach (Claude) →
// l'IA PARLE la version orale (TTS) ET affiche la version ÉCRITE
// schématisée dans l'overlay. Barge-in : parler coupe la voix.
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MobileSheet } from './MobileSheet'

const ACCENT = '#3C90D5'
const SILENCE_MS = 2500
const NBARS = 28

type Phase = 'listening' | 'thinking' | 'speaking'

function stripForSpeech(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*\|?[-: |]+\|?\s*$/gm, ' ')
    .replace(/\|/g, ' ')
    .replace(/[#*_`>]/g, '')
    .replace(/^\s*[-•→]\s*/gm, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseBold(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} style={{ fontWeight: 700 }}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>)
}

// Rendu schématisé de la version écrite (titres, tirets, gras, espaces)
function RichEcrit({ text }: { text: string }) {
  return (
    <div style={{ width: '100%', maxWidth: 460 }}>
      {text.split('\n').map((ln, i) => {
        const t = ln.trim()
        if (!t) return <div key={i} style={{ height: 8 }} />
        if (/^[-*•]\s+/.test(t)) {
          return (
            <div key={i} style={{ display: 'flex', gap: 9, margin: '4px 0', fontSize: 15, lineHeight: 1.5, color: 'var(--ai-text)' }}>
              <span style={{ color: ACCENT, flexShrink: 0, fontWeight: 700 }}>•</span>
              <span>{parseBold(t.replace(/^[-*•]\s+/, ''))}</span>
            </div>
          )
        }
        if (t.startsWith('#') || (t.length <= 42 && /[:：]$/.test(t))) {
          return <p key={i} style={{ margin: '12px 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--ai-text)', fontFamily: 'Syne,sans-serif' }}>{parseBold(t.replace(/^#+\s*/, ''))}</p>
        }
        return <p key={i} style={{ margin: '0 0 6px', fontSize: 15, lineHeight: 1.55, color: 'var(--ai-text)' }}>{parseBold(t)}</p>
      })}
    </div>
  )
}

export function VoiceConversation({ onTurn, onClose }: {
  onTurn: (text: string) => Promise<{ speak: string; show: string }>
  onClose: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [phase, setPhase] = useState<Phase>('listening')
  const [live, setLive] = useState('')        // transcription utilisateur en cours
  const [show, setShow] = useState('')         // version écrite affichée (IA)
  const [supported, setSupported] = useState(true)
  const [lastUser, setLastUser] = useState('')
  const [showThink, setShowThink] = useState(false)

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
      if (phaseRef.current === 'speaking' && txt.length > 2) {   // barge-in
        window.speechSynthesis.cancel()
        setShow('')
        setPhaseBoth('listening')
      }
      if (phaseRef.current === 'listening') { setLive(txt); armSilence() }
    }
    rec.onend = () => { if (!endedRef.current) { try { rec.start() } catch { /* déjà démarrée */ } } }
    rec.onerror = () => { /* no-speech / aborted… */ }
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
    setLastUser(userText)
    setPhaseBoth('thinking')
    let res = { speak: '', show: '' }
    try { res = await onTurn(userText) } catch { /* erreur réseau */ }
    if (endedRef.current) return
    speak(res.speak, res.show)
  }

  function speak(oral: string, ecrit: string) {
    setShow(ecrit || oral)
    const synth = window.speechSynthesis
    const clean = stripForSpeech(oral || ecrit)
    if (!clean || !synth) { setPhaseBoth('speaking'); return }   // au moins on affiche l'écrit
    setPhaseBoth('speaking')
    synth.cancel()
    const u = new SpeechSynthesisUtterance(clean)
    u.lang = 'fr-FR'; u.rate = 1.03
    const fr = synth.getVoices().find(v => v.lang?.toLowerCase().startsWith('fr'))
    if (fr) u.voice = fr
    const finish = () => { if (!endedRef.current) setPhaseBoth('listening') }
    u.onend = finish
    u.onerror = finish
    synth.speak(u)
  }

  if (!mounted) return null

  const status = !supported ? 'Vocal non supporté sur ce navigateur'
    : phase === 'listening' ? 'Je t’écoute…'
    : phase === 'thinking' ? '' : 'Réponse'

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Conversation vocale" style={{
      position: 'fixed', inset: 0, zIndex: 1500,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      background: 'color-mix(in srgb, var(--ai-bg) 62%, transparent)',
      backdropFilter: 'blur(22px) saturate(1.05)', WebkitBackdropFilter: 'blur(22px) saturate(1.05)',
      paddingTop: 'calc(30px + env(safe-area-inset-top, 0px))',
      paddingBottom: 'calc(28px + env(safe-area-inset-bottom, 0px))',
      animation: 'vc_in 0.22s ease',
    }}>
      {/* Statut */}
      <div style={{ textAlign: 'center', minHeight: 20 }}>
        {status && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--ai-mid)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: phase === 'speaking' ? ACCENT : '#22c55e', animation: 'vc_dot 1.1s ease-in-out infinite' }} />
            {status}
          </span>
        )}
      </div>

      {/* Centre */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 24px', overflowY: 'auto' }}>
        {phase === 'thinking' ? (
          <button onClick={() => setShowThink(true)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, background: 'none', border: 'none', cursor: 'pointer' }}>
            {/* Animation : anneau dégradé qui tourne + cœur qui respire */}
            <span style={{ position: 'relative', width: 64, height: 64, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `conic-gradient(from 0deg, transparent 0deg, ${ACCENT} 300deg, transparent 360deg)`, animation: 'vc_spin 1s linear infinite', WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))', mask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))' }} />
              <span style={{ width: 30, height: 30, borderRadius: '50%', background: ACCENT, opacity: 0.9, animation: 'vc_breathe 1.4s ease-in-out infinite' }} />
            </span>
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--ai-text)', fontFamily: 'Syne,sans-serif', animation: 'vc_dim 1.6s ease-in-out infinite' }}>Je réfléchis…</span>
            {lastUser && (
              <span style={{ fontSize: 12.5, color: 'var(--ai-dim)', maxWidth: 300, textAlign: 'center', lineHeight: 1.4 }}>
                « {lastUser.length > 64 ? lastUser.slice(0, 64) + '…' : lastUser} »<br />
                <span style={{ color: ACCENT, fontWeight: 600 }}>voir le détail ▾</span>
              </span>
            )}
          </button>
        ) : phase === 'speaking' && show ? (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', animation: 'vc_in 0.25s ease' }}>
            <RichEcrit text={show} />
          </div>
        ) : (
          <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-display, Fraunces), Georgia, serif', fontSize: 'clamp(20px, 5vw, 30px)', lineHeight: 1.4, color: 'var(--ai-text)', fontStyle: !live ? 'italic' : 'normal' }}>
            {live || 'Parle, je t’écoute…'}
          </p>
        )}
      </div>

      {/* Détail réflexion (surpage) */}
      {showThink && (
        <MobileSheet title="Réflexion en cours" onClose={() => setShowThink(false)}>
          <div style={{ padding: '4px 8px 14px' }}>
            <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Ta question</p>
            <p style={{ fontSize: 14, color: 'var(--text)', margin: '0 0 16px', lineHeight: 1.45 }}>{lastUser || '—'}</p>
            <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Ce que je fais</p>
            {['J’analyse ta demande et le contexte', 'Je croise tes données (zones, historique, objectif)', 'Je prépare une réponse adaptée'].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, margin: '6px 0', fontSize: 13.5, color: 'var(--text)' }}>
                <span style={{ color: ACCENT, flexShrink: 0 }}>•</span><span>{s}</span>
              </div>
            ))}
          </div>
        </MobileSheet>
      )}

      {/* Waveform + raccrocher */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ height: 28, display: 'flex', alignItems: 'center', gap: 3 }}>
          {Array.from({ length: NBARS }, (_, i) => (
            <span key={i} style={{
              width: 3, height: '100%', borderRadius: 3, transformOrigin: 'center',
              background: phase === 'speaking' ? ACCENT : 'var(--ai-text)',
              opacity: phase === 'thinking' ? 0.25 : 0.8,
              animation: `vc_wave ${0.7 + (i % 5) * 0.13}s ease-in-out ${((i * 0.07) % 0.9).toFixed(2)}s infinite`,
              animationPlayState: phase === 'thinking' ? 'paused' : 'running',
            }} />
          ))}
        </div>
        <button onClick={onClose} aria-label="Terminer la conversation" style={{
          width: 44, height: 44, borderRadius: '50%', border: 'none', background: '#ef4444', color: '#fff',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 14px rgba(239,68,68,0.38)',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <span style={{ fontSize: 11, color: 'var(--ai-dim)' }}>Coupe-moi la parole quand tu veux · rouge = terminer</span>
      </div>

      <style>{`
        @keyframes vc_in   { from { opacity: 0 } to { opacity: 1 } }
        @keyframes vc_dot  { 0%,100% { opacity: .4 } 50% { opacity: 1 } }
        @keyframes vc_wave { 0%,100% { transform: scaleY(.25) } 50% { transform: scaleY(.9) } }
        @keyframes vc_spin { to { transform: rotate(360deg) } }
        @keyframes vc_breathe { 0%,100% { transform: scale(0.7); opacity: .6 } 50% { transform: scale(1); opacity: 1 } }
        @keyframes vc_dim  { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
      `}</style>
    </div>,
    document.body,
  )
}
