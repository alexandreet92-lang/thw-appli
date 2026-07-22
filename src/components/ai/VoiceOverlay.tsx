'use client'

// ══════════════════════════════════════════════════════════════
// VoiceOverlay — dictée vocale façon Claude (Whisper), fiable iOS.
//
// · Le micro est capté UNE SEULE FOIS (getUserMedia). On capture le son
//   en PCM brut via l'AudioContext (ScriptProcessor) → pas de MediaRecorder
//   (souvent défaillant sur iOS Safari : audio vide). Le même flux nourrit
//   la WAVEFORM qui réagit au vrai volume et défile.
// · L'AudioContext est créé/réveillé DANS le geste du tap (côté AIPanel)
//   puis réutilisé ici → il est « running », donc la waveform bouge.
// · Pendant qu'on parle : SEULEMENT la waveform (comme Claude). Pas de texte
//   en direct (évite tout décalage). Le texte transcrit n'apparaît qu'à ✓.
// · ✓ → on encode le PCM en WAV et on transcrit via /api/stt (Whisper).
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'

const NBARS = 38

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
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [phase, setPhase] = useState<'rec' | 'transcribing' | 'error'>('rec')
  const [errorMsg, setErrorMsg] = useState('')
  const [liveText, setLiveText] = useState('')   // transcription navigateur EN DIRECT
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const srRef = useRef<any>(null)
  const srFinalRef = useRef('')                  // texte figé par la reco navigateur

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

  // ── Transcription navigateur EN DIRECT (instantanée, sans serveur) ──
  // Tourne en parallèle de la capture audio : affiche les mots au fur et à
  // mesure. Whisper reste la transcription finale (plus précise) à la ✓ ;
  // si Whisper échoue, on retombe sur ce texte. Best-effort : si le navigateur
  // ne supporte pas la reco (ou la refuse pendant getUserMedia), pas grave.
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
        setLiveText((srFinalRef.current + interim).trim())
      }
      rec.onend = () => {
        if (!confirmedRef.current && !closedRef.current) { try { rec.start() } catch { /* déjà démarrée */ } }
      }
      rec.onerror = () => { /* no-speech / not-allowed… on garde Whisper */ }
      rec.start()
    } catch { /* ignore */ }
    return () => { try { rec?.stop() } catch { /* ignore */ } }
  }, [language])

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
        const err = e as { name?: string; message?: string }
        setPhase('error')
        setErrorMsg(t('ai.micDenied', { reason: err?.name || err?.message || t('ai.unknown') }))
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
      } catch (e) {
        const err = e as { name?: string; message?: string }
        setPhase('error')
        setErrorMsg(t('ai.audioFailed', { reason: err?.name || err?.message || 'AudioContext' }))
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
        v = Math.min(1, Math.sqrt(sum / dt.length) * 9)
        if (v < 0.035) v = 0
      }
      const buf = bufRef.current
      buf.push(v); buf.shift()
      for (let i = 0; i < NBARS; i++) {
        const el = barsRef.current[i]
        if (!el) continue
        const h = 0.12 + buf[i] * 0.88
        el.style.transform = `scaleY(${h.toFixed(3)})`
        el.style.opacity = String(0.4 + buf[i] * 0.6)
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
    const srFallback = (srFinalRef.current || liveText).trim()

    const total = pcmRef.current.reduce((a, c) => a + c.length, 0)
    const secs = total / sampleRateRef.current
    if (total < sampleRateRef.current * 0.25) {   // < 0,25 s d'audio capté
      if (srFallback) { onConfirm(srFallback); return }
      setPhase('error'); setErrorMsg(t('ai.nothingCaptured', { secs: secs.toFixed(2) }))
      return
    }
    const wav = encodeWAV(pcmRef.current, sampleRateRef.current)
    try {
      const form = new FormData()
      form.append('file', wav, 'audio.wav')
      form.append('language', language)
      const res = await fetch('/api/stt', { method: 'POST', body: form })
      if (!res.ok) {
        if (srFallback) { onConfirm(srFallback); return }   // repli sur la reco navigateur
        let detail = ''
        try { detail = ((await res.json()) as { error?: string }).error ?? '' } catch { /* ignore */ }
        setPhase('error'); setErrorMsg(t('ai.transcriptionError', { status: res.status, detail: detail ? ' — ' + detail : '' }))
        return
      }
      const { text } = await res.json() as { text?: string }
      const clean = (text ?? '').trim() || srFallback
      if (!clean) { setPhase('error'); setErrorMsg(t('ai.transcriptionEmpty')); return }
      onConfirm(clean)
    } catch (e) {
      if (srFallback) { onConfirm(srFallback); return }
      const err = e as { message?: string }
      setPhase('error'); setErrorMsg(t('ai.transcriptionNetworkError', { reason: err?.message || 'fetch' }))
    }
  }

  const confirm = () => {
    if (phase !== 'rec') return
    confirmedRef.current = true
    try { srRef.current?.stop() } catch { /* ignore */ }
    setPhase('transcribing')
    void transcribe()
  }
  const cancel = () => { confirmedRef.current = false; try { srRef.current?.stop() } catch { /* ignore */ } onCancel() }

  if (!mounted) return null

  const block = (
    <div style={{
      width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
      ...(isDesktop
        ? { maxWidth: 520, padding: '0 16px' }
        : {
            padding: 'clamp(24px,8vh,80px) 16px calc(16px + env(safe-area-inset-bottom, 0px))',
            background: 'linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--bg-card) 55%, transparent) 38%, var(--bg-card) 100%)',
            backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 56px)',
            maskImage: 'linear-gradient(to bottom, transparent 0, #000 56px)',
          }),
    }}>
      {/* Texte EN DIRECT (ce que je dis, au fur et à mesure) */}
      {phase !== 'error' && liveText && (
        <div style={{
          maxWidth: 520, width: '100%', textAlign: 'center', margin: '0 0 14px',
          maxHeight: '5em', overflow: 'hidden', padding: '4px 0 0',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          // Fondu très léger en haut (les lettres de la 1re ligne restent lisibles).
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 10px)',
          maskImage: 'linear-gradient(to bottom, transparent 0, #000 10px)',
        }}>
          <p style={{
            margin: 0, fontFamily: 'var(--font-display)',
            fontSize: 'clamp(16px, 4vw, 20px)', lineHeight: 1.5, fontWeight: 500,
            color: 'var(--text)',
          }}>{liveText}</p>
        </div>
      )}

      {/* Message d'erreur */}
      {phase === 'error' && (
        <div style={{ margin: '0 0 14px', maxWidth: 360, textAlign: 'center', fontSize: 13, lineHeight: 1.4, color: 'var(--text-mid)', fontFamily: 'var(--font-body)', padding: '0 8px' }}>
          {errorMsg}
        </div>
      )}

      <div style={{
        pointerEvents: 'auto',
        width: '100%', maxWidth: 440, display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 999,
        padding: '8px 10px', boxShadow: '0 12px 38px color-mix(in srgb, var(--text) 18%, transparent)',
        animation: 'vo_pill 0.26s cubic-bezier(0.32,0.72,0,1)',
      }}>
        <button
          onClick={cancel}
          aria-label={t('ai.cancel')}
          style={{
            width: 42, height: 42, borderRadius: '50%', border: 'none', flexShrink: 0,
            background: 'var(--bg-card2)', color: 'var(--text)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>

        {/* Waveform : barres fines qui réagissent au volume et défilent */}
        <div style={{ flex: 1, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, overflow: 'hidden', opacity: phase === 'rec' ? 1 : 0.4 }}>
          {Array.from({ length: NBARS }, (_, i) => (
            <span
              key={i}
              ref={el => { barsRef.current[i] = el }}
              style={{
                width: 3, height: '100%', borderRadius: 4, flexShrink: 0,
                background: 'var(--text)', transformOrigin: 'center',
                transform: 'scaleY(0.12)', opacity: 0.4,
                transition: 'transform 0.06s linear, opacity 0.1s linear', willChange: 'transform',
              }}
            />
          ))}
        </div>

        <button
          onClick={confirm}
          aria-label={t('ai.validate')}
          disabled={phase !== 'rec'}
          style={{
            width: 42, height: 42, borderRadius: '50%', border: 'none', flexShrink: 0,
            background: 'var(--text)', color: 'var(--bg)', cursor: phase === 'rec' ? 'pointer' : 'default',
            opacity: phase === 'rec' ? 1 : 0.55,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
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
        @keyframes vo_spin { to { transform: rotate(360deg) } }
      `}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('ai.voiceDictation')}
        style={{
          // zIndex 14500 : la dictée doit passer AU-DESSUS des sur-pages
          // (Routines 13500, Studio 13600) — elle était à 1500.
          position: 'fixed', inset: 0, zIndex: 14500,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: isDesktop ? 'center' : 'flex-end',
          animation: 'vo_in 0.2s ease',
          pointerEvents: 'none',
          ...(isDesktop
            ? {
                background: 'color-mix(in srgb, var(--bg) 52%, transparent)',
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
