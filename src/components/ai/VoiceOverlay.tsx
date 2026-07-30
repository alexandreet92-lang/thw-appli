'use client'

// ══════════════════════════════════════════════════════════════
// VoiceOverlay — dictée vocale façon Claude : petite BARRE flottante en
// bas (X · waveform · ✓), JAMAIS un overlay plein écran qui masque tout.
//
// · Transcription EN DIRECT via l'API navigateur (SpeechRecognition) :
//   les mots s'écrivent au fur et à mesure dans le champ (onLiveText),
//   sans latence, sans round-trip serveur.
// · Reconnaissance CONTINUE + redémarrage auto sur `onend` → plus de
//   coupure au bout de quelques lignes.
// · ✓ = on valide IMMÉDIATEMENT le texte déjà transcrit (aucune attente).
//   Whisper (/api/stt) n'est qu'un FILET quand le navigateur n'a rien pu
//   transcrire (ex. Safari capricieux) — sinon on ne l'appelle même pas.
// · La waveform réagit au vrai volume (getUserMedia + AnalyserNode).
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'

const NBARS = 34

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
  onLiveText,
  isDesktop = false,
  language = 'fr',
  getAudioCtx,
}: {
  onConfirm: (text: string) => void
  onCancel: () => void
  /** Appelé en continu avec le texte transcrit (final + interim) → champ live. */
  onLiveText?: (text: string) => void
  isDesktop?: boolean
  language?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAudioCtx?: () => any
}) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [phase, setPhase] = useState<'rec' | 'transcribing' | 'error'>('rec')
  const [errorMsg, setErrorMsg] = useState('')
  const [liveText, setLiveText] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const srRef = useRef<any>(null)
  const srFinalRef = useRef('')
  const onLiveRef = useRef(onLiveText)
  onLiveRef.current = onLiveText

  const bufRef = useRef<number[]>(new Array(NBARS).fill(0))
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

  const pushLive = (txt: string) => { setLiveText(txt); try { onLiveRef.current?.(txt) } catch { /* ignore */ } }

  // ── Reconnaissance vocale navigateur EN DIRECT (source principale) ──
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const lang = language.includes('-') ? language
      : language === 'fr' ? 'fr-FR' : language === 'en' ? 'en-US' : language === 'es' ? 'es-ES'
      : `${language}-${language.toUpperCase()}`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rec: any
    try {
      rec = new SR()
      rec.lang = lang
      rec.continuous = true
      rec.interimResults = true
      rec.maxAlternatives = 1
      srRef.current = rec
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (e: any) => {
        if (confirmedRef.current || closedRef.current) return
        let interim = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) srFinalRef.current += e.results[i][0].transcript + ' '
          else interim += e.results[i][0].transcript
        }
        pushLive((srFinalRef.current + interim).trim())
      }
      // Redémarrage auto : la reco s'arrête toute seule après un silence / une
      // durée max (surtout Safari) → on relance tant qu'on enregistre. Sans ça,
      // « il coupe au bout de trois lignes ».
      rec.onend = () => {
        if (!confirmedRef.current && !closedRef.current) { try { rec.start() } catch { /* déjà démarrée */ } }
      }
      rec.onerror = () => { /* no-speech / not-allowed… : filet Whisper à la ✓ */ }
      rec.start()
    } catch { /* ignore */ }
    return () => { try { rec?.stop() } catch { /* ignore */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])

  // ── Capture audio (waveform + filet Whisper) ──
  useEffect(() => {
    let analyser: AnalyserNode | null = null
    let data: Uint8Array | null = null

    ;(async () => {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        })
      } catch (e) {
        // Micro refusé : la reco navigateur peut quand même marcher — pas d'erreur bloquante.
        const err = e as { name?: string }
        if (!srRef.current) { setPhase('error'); setErrorMsg(t('ai.micDenied', { reason: err?.name || t('ai.unknown') })) }
        return
      }
      if (closedRef.current) { stream.getTracks().forEach(t => t.stop()); return }
      streamRef.current = stream

      try {
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
        source.connect(an)
        an.connect(processor)
        processor.connect(gain)
        gain.connect(ctx.destination)
        nodesRef.current = { source, processor, gain, analyser: analyser ?? undefined }
      } catch { /* waveform indisponible → reco navigateur suffit */ }
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
        v = Math.min(1, Math.sqrt(sum / dt.length) * 9)
        if (v < 0.035) v = 0
      }
      const buf = bufRef.current
      buf.push(v); buf.shift()
      for (let i = 0; i < NBARS; i++) {
        const el = barsRef.current[i]
        if (!el) continue
        const h = 0.14 + buf[i] * 0.86
        el.style.transform = `scaleY(${h.toFixed(3)})`
        el.style.opacity = String(0.35 + buf[i] * 0.65)
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

  // Filet Whisper : SEULEMENT si le navigateur n'a rien transcrit.
  async function whisperFallback(): Promise<string> {
    const total = pcmRef.current.reduce((a, c) => a + c.length, 0)
    if (total < sampleRateRef.current * 0.25) return ''
    try {
      const wav = encodeWAV(pcmRef.current, sampleRateRef.current)
      const form = new FormData()
      form.append('file', wav, 'audio.wav')
      form.append('language', language)
      const res = await fetch('/api/stt', { method: 'POST', body: form })
      if (!res.ok) return ''
      const { text } = await res.json() as { text?: string }
      return (text ?? '').trim()
    } catch { return '' }
  }

  const confirm = () => {
    if (phase !== 'rec') return
    confirmedRef.current = true
    try { srRef.current?.stop() } catch { /* ignore */ }
    const live = (srFinalRef.current || liveText).trim()
    // Texte déjà transcrit → validation INSTANTANÉE (zéro attente serveur).
    if (live) { onConfirm(live); return }
    // Rien côté navigateur → on tente Whisper une seule fois.
    setPhase('transcribing')
    void (async () => {
      const w = await whisperFallback()
      if (w) { onConfirm(w); return }
      setPhase('error'); setErrorMsg(t('ai.transcriptionEmpty'))
    })()
  }
  const cancel = () => {
    confirmedRef.current = true
    try { srRef.current?.stop() } catch { /* ignore */ }
    onCancel()
  }

  if (!mounted) return null

  const bar = (
    <div style={{
      pointerEvents: 'auto',
      width: '100%', maxWidth: 620, display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16,
      padding: '8px 10px', boxShadow: '0 10px 34px color-mix(in srgb, var(--text) 16%, transparent)',
      animation: 'vo_pill 0.24s cubic-bezier(0.32,0.72,0,1)',
    }}>
      {/* X — annuler */}
      <button onClick={cancel} aria-label={t('ai.cancel')} style={{
        width: 40, height: 40, borderRadius: '50%', border: 'none', flexShrink: 0,
        background: 'var(--bg-card2)', color: 'var(--text)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>

      {/* Waveform */}
      <div style={{ flex: 1, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, overflow: 'hidden', opacity: phase === 'rec' ? 1 : 0.4 }}>
        {Array.from({ length: NBARS }, (_, i) => (
          <span key={i} ref={el => { barsRef.current[i] = el }} style={{
            width: 3, height: '100%', borderRadius: 4, flexShrink: 0,
            background: 'var(--text)', transformOrigin: 'center',
            transform: 'scaleY(0.14)', opacity: 0.35,
            transition: 'transform 0.06s linear, opacity 0.1s linear', willChange: 'transform',
          }} />
        ))}
      </div>

      {/* ✓ — valider (bleu, façon Claude) */}
      <button onClick={confirm} aria-label={t('ai.validate')} disabled={phase !== 'rec'} style={{
        width: 40, height: 40, borderRadius: '50%', border: 'none', flexShrink: 0,
        background: 'var(--primary)', color: 'var(--on-primary)', cursor: phase === 'rec' ? 'pointer' : 'default',
        opacity: phase === 'rec' ? 1 : 0.6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {phase === 'transcribing'
          ? <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" style={{ animation: 'vo_spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.2-8.5" /></svg>
          : <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
      </button>
    </div>
  )

  return createPortal(
    <>
      <style>{`
        @keyframes vo_pill { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes vo_spin { to { transform: rotate(360deg) } }
      `}</style>
      {/* Barre flottante en BAS — ne masque pas l'écran (pas de scrim, pointerEvents none autour). */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 14500,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: `0 ${isDesktop ? 24 : 12}px calc(${isDesktop ? 20 : 14}px + env(safe-area-inset-bottom, 0px))`,
        pointerEvents: 'none',
      }}>
        {/* Aperçu live SEULEMENT si le champ ne reçoit pas déjà la transcription. */}
        {phase !== 'error' && liveText && !onLiveText && (
          <div style={{
            pointerEvents: 'none', maxWidth: 620, width: '100%',
            background: 'color-mix(in srgb, var(--bg-card) 92%, transparent)',
            border: '1px solid var(--border)', borderRadius: 12, padding: '8px 12px',
            maxHeight: '4.5em', overflow: 'hidden',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 14px)',
            maskImage: 'linear-gradient(to bottom, transparent 0, #000 14px)',
          }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>{liveText}</p>
          </div>
        )}
        {phase === 'error' && (
          <div style={{ pointerEvents: 'none', maxWidth: 420, textAlign: 'center', fontSize: 13, lineHeight: 1.4, color: 'var(--text-mid)', fontFamily: 'var(--font-body)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 12px' }}>
            {errorMsg}
          </div>
        )}
        {bar}
      </div>
    </>,
    document.body,
  )
}
