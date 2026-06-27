'use client'

// ══════════════════════════════════════════════════════════════
// VoiceOverlay — dictée vocale façon Claude (Whisper).
//
// · Le micro est capté UNE SEULE FOIS (getUserMedia) → on l'enregistre
//   (MediaRecorder) ET on l'analyse (Web Audio) pour la waveform qui
//   réagit VRAIMENT à la voix. Pas de reconnaissance navigateur en
//   parallèle → plus de conflit micro sur iPhone.
// · ✓ → on stoppe l'enregistrement et on transcrit via /api/stt (OpenAI
//   Whisper) ; le texte est renvoyé via onConfirm(text).
// · ✕ → on annule, rien n'est transcrit.
// · Mobile : barre en bas + léger flou. Desktop : barre centrée.
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const SHURIKEN = '#3C90D5'
const NBARS = 32

function pickMime(): string {
  const MR = typeof window !== 'undefined' ? (window as unknown as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder : undefined
  if (!MR || !MR.isTypeSupported) return ''
  for (const m of ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg']) {
    if (MR.isTypeSupported(m)) return m
  }
  return ''
}

export function VoiceOverlay({
  onConfirm,
  onCancel,
  isDesktop = false,
  language = 'fr',
}: {
  onConfirm: (text: string) => void
  onCancel: () => void
  isDesktop?: boolean
  language?: string
}) {
  const [mounted, setMounted] = useState(false)
  const [phase, setPhase] = useState<'rec' | 'transcribing' | 'error'>('rec')
  const [debug, setDebug] = useState('Démarrage…')

  const bufRef = useRef<number[]>(new Array(NBARS).fill(0.06))
  const barsRef = useRef<(HTMLSpanElement | null)[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctxRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recorderRef = useRef<any>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const confirmedRef = useRef(false)
  const closedRef = useRef(false)

  useEffect(() => { setMounted(true) }, [])

  // ── Démarre l'enregistrement + l'analyse de la waveform ──────
  useEffect(() => {
    let analyser: AnalyserNode | null = null
    let data: Uint8Array | null = null

    ;(async () => {
      let stream: MediaStream
      try {
        setDebug('Demande micro…')
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        })
      } catch (e) {
        // micro refusé / indisponible → on AFFICHE l'erreur (plus de fermeture muette)
        const err = e as { name?: string; message?: string }
        setPhase('error')
        setDebug(`Micro refusé (${err?.name || err?.message || 'inconnu'}). Autorise le micro dans Réglages Safari.`)
        return
      }
      if (closedRef.current) { stream.getTracks().forEach(t => t.stop()); return }
      streamRef.current = stream

      // Analyse pour la waveform (NON reliée à la sortie) — non bloquant
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Ctx = window.AudioContext || (window as any).webkitAudioContext
        const ctx = new Ctx()
        const a: AnalyserNode = ctx.createAnalyser()
        a.fftSize = 256
        ctx.createMediaStreamSource(stream).connect(a)
        await ctx.resume?.()
        ctxRef.current = ctx
        analyser = a
        data = new Uint8Array(a.fftSize)
      } catch { /* waveform indisponible, on continue l'enregistrement */ }

      // Enregistrement
      try {
        const mime = pickMime()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const MR = (window as any).MediaRecorder
        const recorder = mime ? new MR(stream, { mimeType: mime }) : new MR(stream)
        chunksRef.current = []
        recorder.ondataavailable = (e: BlobEvent) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data) }
        recorder.onstop = () => { void onRecorderStop(recorder.mimeType || mime || 'audio/webm') }
        recorder.start()
        recorderRef.current = recorder
        setDebug(`Micro OK · enregistrement (${mime || 'format auto'})`)
      } catch (e) {
        const err = e as { name?: string; message?: string }
        setPhase('error')
        setDebug(`Enregistrement impossible (${err?.name || err?.message || 'MediaRecorder'})`)
      }
    })()

    const id = window.setInterval(() => {
      let v = 0
      if (analyser && data) {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) { const d = (data[i] - 128) / 128; sum += d * d }
        v = Math.min(1, Math.sqrt(sum / data.length) * 7.5)
        if (v < 0.04) v = 0
      }
      const buf = bufRef.current
      buf.push(v); buf.shift()
      for (let i = 0; i < NBARS; i++) {
        const el = barsRef.current[i]
        if (!el) continue
        const h = 0.14 + buf[i] * 0.86
        el.style.transform = `scaleY(${h.toFixed(3)})`
        el.style.opacity = String(0.5 + buf[i] * 0.5)
      }
    }, 55)

    return () => {
      closedRef.current = true
      window.clearInterval(id)
      try { recorderRef.current?.state !== 'inactive' && recorderRef.current?.stop() } catch { /* ignore */ }
      try { streamRef.current?.getTracks().forEach(t => t.stop()) } catch { /* ignore */ }
      try { ctxRef.current?.close?.() } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onRecorderStop(mime: string) {
    // Annulé → on ne transcrit pas
    if (!confirmedRef.current) return
    try { streamRef.current?.getTracks().forEach(t => t.stop()) } catch { /* ignore */ }
    const blob = new Blob(chunksRef.current, { type: mime })
    const ko = Math.round(blob.size / 1024)
    setDebug(`Audio ${ko} Ko · transcription…`)
    if (blob.size < 1200) {
      setPhase('error')
      setDebug(`Audio trop court/vide (${blob.size} octets). L'enregistrement iOS n'a rien capté.`)
      return
    }
    try {
      const form = new FormData()
      form.append('file', blob, 'audio')
      form.append('language', language)
      const res = await fetch('/api/stt', { method: 'POST', body: form })
      if (!res.ok) {
        let detail = ''
        try { detail = ((await res.json()) as { error?: string }).error ?? '' } catch { /* ignore */ }
        setPhase('error')
        setDebug(`Transcription : erreur ${res.status}${detail ? ' — ' + detail : ''}`)
        return
      }
      const { text } = await res.json() as { text?: string }
      const clean = (text ?? '').trim()
      if (!clean) { setPhase('error'); setDebug('Transcription vide (rien compris).'); return }
      onConfirm(clean)
    } catch (e) {
      const err = e as { message?: string }
      setPhase('error')
      setDebug(`Transcription : échec réseau (${err?.message || 'fetch'})`)
    }
  }

  const confirm = () => {
    if (phase !== 'rec') return
    confirmedRef.current = true
    setPhase('transcribing')
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
      else onConfirm('')
    } catch { onConfirm('') }
  }
  const cancel = () => { confirmedRef.current = false; onCancel() }

  if (!mounted) return null

  const status = phase === 'transcribing' ? 'Transcription…'
    : phase === 'error' ? 'Transcription impossible, réessaie'
    : 'Je t’écoute…'

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
      {/* Statut */}
      <div style={{ margin: '0 0 8px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: phase === 'error' ? '#ef4444' : SHURIKEN, animation: phase === 'transcribing' ? 'vo_dot 1.1s ease-in-out infinite' : 'none' }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ai-mid)', fontFamily: 'DM Sans,sans-serif' }}>{status}</span>
      </div>
      {/* Diagnostic — temporaire, pour comprendre où ça casse */}
      <div style={{ margin: '0 0 14px', maxWidth: 360, textAlign: 'center', fontSize: 11.5, lineHeight: 1.4, color: phase === 'error' ? '#ef4444' : 'var(--ai-dim)', fontFamily: 'DM Sans,sans-serif', padding: '0 8px' }}>
        {debug}
      </div>

      {/* Barre — ✕ · waveform · ✓ */}
      <div style={{
        pointerEvents: 'auto',
        width: '100%', maxWidth: 440, display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--ai-bg)', border: '1px solid var(--ai-border)', borderRadius: 999,
        padding: '7px 9px', boxShadow: '0 12px 38px rgba(0,0,0,0.20)',
        animation: 'vo_pill 0.26s cubic-bezier(0.32,0.72,0,1)',
      }}>
        <button
          onClick={cancel}
          aria-label="Annuler"
          style={{
            width: 42, height: 42, borderRadius: '50%', border: 'none', flexShrink: 0,
            background: 'var(--ai-bg2, rgba(127,127,127,0.14))', color: 'var(--ai-text)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>

        {/* Waveform défilante (vrai volume micro) */}
        <div style={{ flex: 1, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, overflow: 'hidden', opacity: phase === 'rec' ? 1 : 0.4 }}>
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
          onClick={confirm}
          aria-label="Valider"
          disabled={phase !== 'rec'}
          style={{
            width: 42, height: 42, borderRadius: '50%', border: 'none', flexShrink: 0,
            background: SHURIKEN, color: '#fff', cursor: phase === 'rec' ? 'pointer' : 'default',
            opacity: phase === 'rec' ? 1 : 0.55,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(60,144,213,0.42)',
          }}
        >
          {phase === 'transcribing'
            ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" style={{ animation: 'vo_spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.2-8.5" /></svg>
            : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
        </button>
      </div>
    </div>
  )

  return createPortal(
    <>
      <style>{`
        @keyframes vo_in   { from { opacity: 0 } to { opacity: 1 } }
        @keyframes vo_pill { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes vo_dot  { 0%,100% { opacity: .4 } 50% { opacity: 1 } }
        @keyframes vo_spin { to { transform: rotate(360deg) } }
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
