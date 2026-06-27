'use client'

// ══════════════════════════════════════════════════════════════
// VoiceOverlay — dictée vocale façon Claude (Whisper), fiable iOS.
//
// · Le micro est capté UNE SEULE FOIS (getUserMedia). On capture le son
//   en PCM brut via l'AudioContext (ScriptProcessor) → pas de MediaRecorder
//   (souvent défaillant sur iOS Safari : audio vide). Le même flux nourrit
//   la WAVEFORM qui réagit au vrai volume.
// · L'AudioContext est créé/réveillé DANS le geste du tap (côté AIPanel)
//   puis réutilisé ici → il est « running », donc la waveform bouge.
// · ✓ → on encode le PCM en WAV et on transcrit via /api/stt (Whisper).
// · Diagnostic visible : on voit exactement où ça casse.
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const SHURIKEN = '#3C90D5'
const NBARS = 32

function encodeWAV(chunks: Float32Array[], sampleRate: number): Blob {
  const length = chunks.reduce((a, c) => a + c.length, 0)
  const buffer = new ArrayBuffer(44 + length * 2)
  const view = new DataView(buffer)
  const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)) }
  writeStr(0, 'RIFF'); view.setUint32(4, 36 + length * 2, true); writeStr(8, 'WAVE')
  writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  writeStr(36, 'data'); view.setUint32(40, length * 2, true)
  let off = 44
  for (const ch of chunks) {
    for (let i = 0; i < ch.length; i++) {
      const s = Math.max(-1, Math.min(1, ch[i]))
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
      off += 2
    }
  }
  return new Blob([view], { type: 'audio/wav' })
}

export function VoiceOverlay({
  onConfirm,
  onCancel,
  isDesktop = false,
  language = 'fr',
  getAudioCtx,
}: {
  onConfirm: (text: string) => void
  onCancel: () => void
  isDesktop?: boolean
  language?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAudioCtx?: () => any
}) {
  const [mounted, setMounted] = useState(false)
  const [phase, setPhase] = useState<'rec' | 'transcribing' | 'error'>('rec')
  const [debug, setDebug] = useState('Démarrage…')

  const bufRef = useRef<number[]>(new Array(NBARS).fill(0.06))
  const barsRef = useRef<(HTMLSpanElement | null)[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctxRef = useRef<any>(null)
  const ownsCtxRef = useRef(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodesRef = useRef<{ source?: any; processor?: any; gain?: any; analyser?: AnalyserNode }>({})
  const pcmRef = useRef<Float32Array[]>([])
  const sampleRateRef = useRef(44100)
  const confirmedRef = useRef(false)
  const closedRef = useRef(false)
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  useEffect(() => { setMounted(true) }, [])

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
        const err = e as { name?: string; message?: string }
        setPhase('error')
        setDebug(`Micro refusé (${err?.name || err?.message || 'inconnu'}). Autorise le micro pour ce site.`)
        return
      }
      if (closedRef.current) { stream.getTracks().forEach(t => t.stop()); return }
      streamRef.current = stream

      try {
        // Contexte fourni par AIPanel (déjà « running » car réveillé dans le geste).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let ctx = getAudioCtx?.()
        if (!ctx || ctx.state === 'closed') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const Ctx = window.AudioContext || (window as any).webkitAudioContext
          ctx = new Ctx(); ownsCtxRef.current = true
        }
        await ctx.resume?.()
        ctxRef.current = ctx
        sampleRateRef.current = ctx.sampleRate

        const source = ctx.createMediaStreamSource(stream)
        const an: AnalyserNode = ctx.createAnalyser()
        an.fftSize = 256
        analyser = an
        data = new Uint8Array(an.fftSize)

        // Capture PCM (ScriptProcessor → fiable iOS). Sortie vers un gain à 0
        // (obligatoire pour que onaudioprocess se déclenche, sans écho).
        const processor = ctx.createScriptProcessor(4096, 1, 1)
        const gain = ctx.createGain(); gain.gain.value = 0
        pcmRef.current = []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        processor.onaudioprocess = (e: any) => {
          if (!confirmedRef.current && phaseRef.current === 'rec') {
            const ch = e.inputBuffer.getChannelData(0)
            pcmRef.current.push(new Float32Array(ch))
          }
        }
        // CHAÎNE COMPLÈTE jusqu'à la sortie : l'analyser doit être « tiré »
        // par le graphe pour traiter le son (sinon getByteTimeDomainData
        // renvoie du silence → waveform figée). Le gain à 0 coupe le retour son.
        source.connect(an)
        an.connect(processor)
        processor.connect(gain)
        gain.connect(ctx.destination)
        nodesRef.current = { source, processor, gain, analyser: analyser ?? undefined }
        setDebug(`Micro OK · enregistrement (${Math.round(ctx.sampleRate / 1000)} kHz, ${ctx.state})`)
      } catch (e) {
        const err = e as { name?: string; message?: string }
        setPhase('error')
        setDebug(`Audio impossible (${err?.name || err?.message || 'AudioContext'})`)
      }
    })()

    const id = window.setInterval(() => {
      const ctx = ctxRef.current
      if (ctx?.state === 'suspended') ctx.resume?.()
      let v = 0
      const an = analyser
      const dt = data
      if (an && dt) {
        an.getByteTimeDomainData(dt)
        let sum = 0
        for (let i = 0; i < dt.length; i++) { const d = (dt[i] - 128) / 128; sum += d * d }
        v = Math.min(1, Math.sqrt(sum / dt.length) * 7.5)
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
      const n = nodesRef.current
      try { n.processor && (n.processor.onaudioprocess = null) } catch { /* ignore */ }
      try { n.source?.disconnect() } catch { /* ignore */ }
      try { n.processor?.disconnect() } catch { /* ignore */ }
      try { n.gain?.disconnect() } catch { /* ignore */ }
      try { streamRef.current?.getTracks().forEach(t => t.stop()) } catch { /* ignore */ }
      if (ownsCtxRef.current) { try { ctxRef.current?.close?.() } catch { /* ignore */ } }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function transcribe() {
    const n = nodesRef.current
    try { n.processor?.disconnect() } catch { /* ignore */ }
    try { streamRef.current?.getTracks().forEach(t => t.stop()) } catch { /* ignore */ }

    const total = pcmRef.current.reduce((a, c) => a + c.length, 0)
    const secs = total / sampleRateRef.current
    if (total < sampleRateRef.current * 0.25) {   // < 0,25 s
      setPhase('error'); setDebug(`Rien capté (${secs.toFixed(2)} s). Parle un peu plus longtemps.`)
      return
    }
    const wav = encodeWAV(pcmRef.current, sampleRateRef.current)
    setDebug(`Audio ${Math.round(wav.size / 1024)} Ko · ${secs.toFixed(1)} s · transcription…`)
    try {
      const form = new FormData()
      form.append('file', wav, 'audio.wav')
      form.append('language', language)
      const res = await fetch('/api/stt', { method: 'POST', body: form })
      if (!res.ok) {
        let detail = ''
        try { detail = ((await res.json()) as { error?: string }).error ?? '' } catch { /* ignore */ }
        setPhase('error'); setDebug(`Transcription : erreur ${res.status}${detail ? ' — ' + detail : ''}`)
        return
      }
      const { text } = await res.json() as { text?: string }
      const clean = (text ?? '').trim()
      if (!clean) { setPhase('error'); setDebug('Transcription vide (rien compris).'); return }
      onConfirm(clean)
    } catch (e) {
      const err = e as { message?: string }
      setPhase('error'); setDebug(`Transcription : échec réseau (${err?.message || 'fetch'})`)
    }
  }

  const confirm = () => {
    if (phase !== 'rec') return
    confirmedRef.current = true
    setPhase('transcribing')
    void transcribe()
  }
  const cancel = () => { confirmedRef.current = false; onCancel() }

  if (!mounted) return null

  const status = phase === 'transcribing' ? 'Transcription…'
    : phase === 'error' ? 'Problème' : 'Je t’écoute…'

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
      <div style={{ margin: '0 0 8px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: phase === 'error' ? '#ef4444' : SHURIKEN, animation: phase === 'transcribing' ? 'vo_dot 1.1s ease-in-out infinite' : 'none' }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ai-mid)', fontFamily: 'DM Sans,sans-serif' }}>{status}</span>
      </div>
      <div style={{ margin: '0 0 14px', maxWidth: 360, textAlign: 'center', fontSize: 11.5, lineHeight: 1.4, color: phase === 'error' ? '#ef4444' : 'var(--ai-dim)', fontFamily: 'DM Sans,sans-serif', padding: '0 8px' }}>
        {debug}
      </div>

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
