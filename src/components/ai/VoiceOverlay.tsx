'use client'

// ══════════════════════════════════════════════════════════════
// VoiceOverlay — dictée vocale façon Claude.
//
// Trois rendus :
//  · inline + onSendNow (composeur IA mobile) : la ligne d'actions devient
//      ×  ·  onde centrée (barres noires arrondies / points au silence)  ·  ■  ·  ↑
//    Le texte transcrit s'écrit EN DIRECT dans le champ (onLiveText).
//  · inline (Studio) : × · onde · ✓ dans le champ.
//  · flottant (bureau / builder) : petite barre en bas (× · onde · ✓).
//
// Transcription :
//  · SpeechRecognition (Safari iOS / Chrome) en continu. Le texte est
//    RECONSTRUIT à chaque événement à partir de TOUS les résultats de la
//    session (finaux + intermédiaires) → plus de « une seule lettre » quand
//    Safari renvoie des intermédiaires partiels. Les sessions coupées
//    (silence, Safari qui s'arrête tout seul) sont « commitées » puis la
//    reconnaissance redémarre : rien n'est perdu.
//  · Repli Whisper (/api/stt) progressif : quand SpeechRecognition est
//    absente (app native), échoue (audio-capture, refus…), ou reste muette
//    alors que le micro capte de la voix. Toutes les ~1,3 s on transcrit
//    l'audio capté → le texte apparaît au fur et à mesure.
//  · L'onde suit le VRAI niveau du micro (getUserMedia + AnalyserNode,
//    requestAnimationFrame 60 fps, attributs SVG pilotés en direct — aucun
//    re-render React par frame).
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import { isNativeApp } from '@/lib/native/platform'
import { haptic } from '@/lib/haptics'

const NBARS = 34

/**
 * Micro dans l'app native (Capacitor iOS) : nécessite la clé
 * NSMicrophoneUsageDescription dans Info.plist (sinon iOS tue l'app au
 * premier accès). Activé par le build natif via NEXT_PUBLIC_NATIVE_MIC=1.
 * Sur natif on n'utilise PAS SpeechRecognition (WKWebView : permission
 * vocale distincte, peu fiable) → getUserMedia + Whisper progressif.
 */
export function nativeMicEnabled(): boolean {
  return process.env.NEXT_PUBLIC_NATIVE_MIC === '1'
}

// ── Types minimaux de l'API Web Speech (absente des typings DOM) ──────────
interface SRAlternative { transcript: string }
interface SRResult { readonly length: number; readonly isFinal: boolean; [i: number]: SRAlternative }
interface SRResultList { readonly length: number; [i: number]: SRResult }
interface SREvent { readonly resultIndex: number; readonly results: SRResultList }
interface SRErrorEvent { readonly error?: string }
interface SRInstance {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number
  onresult: ((e: SREvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: SRErrorEvent) => void) | null
  start: () => void; stop: () => void; abort: () => void
}
type SRCtor = new () => SRInstance
type AudioCtxCtor = new () => AudioContext

function getSR(): SRCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** Joint des morceaux de transcription en normalisant les espaces. */
function joinText(...parts: string[]): string {
  return parts.map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ')
}

/**
 * Texte d'une session SR à partir de TOUS ses résultats. Gère le bug Android
 * où chaque résultat répète le précédent en le prolongeant (cumulatif).
 */
function sessionText(results: SRResultList): string {
  const parts: string[] = []
  for (let i = 0; i < results.length; i++) {
    const tr = (results[i]?.[0]?.transcript ?? '').trim()
    if (!tr) continue
    const last = parts[parts.length - 1]
    if (last && tr.toLowerCase().startsWith(last.toLowerCase())) parts[parts.length - 1] = tr
    else parts.push(tr)
  }
  return joinText(...parts)
}

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

// ══════════════════════════════════════════════════════════════
// Onde façon Claude : historique qui défile de droite à gauche ; chaque
// échantillon = barre noire arrondie qui grandit depuis le centre, ou petit
// point au silence. Rendu SVG piloté en direct (rAF), défilement sub-pixel.
// ══════════════════════════════════════════════════════════════
const W_STEP = 6        // pas entre deux barres (px)
const W_BAR = 3         // largeur d'une barre (px)
const W_H = 28          // hauteur de l'onde (px)
const W_DOT = 3         // diamètre d'un point de silence
const SAMPLE_MS = 75    // un nouvel échantillon toutes les 75 ms

function DictationWave({ levelRef, active, slots = 40 }: {
  /** Niveau courant 0..1 (lu à chaque frame). */
  levelRef: React.MutableRefObject<number>
  active: boolean
  slots?: number
}) {
  const gRef = useRef<SVGGElement>(null)
  const rectsRef = useRef<(SVGRectElement | null)[]>([])
  const activeRef = useRef(active)
  activeRef.current = active
  const n = slots + 1
  const width = slots * W_STEP

  useEffect(() => {
    const hist = new Array<number>(n).fill(0)
    const shown = new Array<number>(n).fill(0)
    let last = performance.now()
    let acc = 0
    let raf = 0
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const frame = (now: number) => {
      const dt = Math.min(100, now - last)
      last = now
      if (activeRef.current) acc += dt
      while (acc >= SAMPLE_MS) {
        acc -= SAMPLE_MS
        hist.shift()
        hist.push(Math.max(0, Math.min(1, levelRef.current)))
      }
      const phase = reduce ? 0 : acc / SAMPLE_MS
      gRef.current?.setAttribute('transform', `translate(${(-phase * W_STEP).toFixed(2)} 0)`)
      for (let i = 0; i < n; i++) {
        // Lissage par barre → la hauteur « pousse » au lieu de sauter.
        shown[i] += (hist[i] - shown[i]) * (reduce ? 1 : 0.35)
        const v = shown[i]
        const el = rectsRef.current[i]
        if (!el) continue
        const h = v < 0.06 ? W_DOT : Math.max(W_DOT, W_DOT + Math.pow(v, 0.8) * (W_H - W_DOT))
        el.setAttribute('y', ((W_H - h) / 2).toFixed(2))
        el.setAttribute('height', h.toFixed(2))
        el.setAttribute('opacity', v < 0.06 ? '0.45' : '1')
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [n, levelRef])

  return (
    <svg
      width={width} height={W_H} viewBox={`0 0 ${width} ${W_H}`} aria-hidden
      style={{
        display: 'block', maxWidth: '100%', overflow: 'hidden',
        // Fondu doux aux extrémités (l'onde « naît » à droite, « meurt » à gauche).
        WebkitMaskImage: 'linear-gradient(90deg, transparent 0, #000 14%, #000 92%, transparent 100%)', // design-allow-color — masque alpha (pas une couleur visible)
        maskImage: 'linear-gradient(90deg, transparent 0, #000 14%, #000 92%, transparent 100%)', // design-allow-color — masque alpha (pas une couleur visible)
      }}
    >
      <g ref={gRef}>
        {Array.from({ length: n }, (_, i) => (
          <rect
            key={i}
            ref={el => { rectsRef.current[i] = el }}
            x={i * W_STEP + (W_STEP - W_BAR) / 2}
            y={(W_H - W_DOT) / 2}
            width={W_BAR}
            height={W_DOT}
            rx={W_BAR / 2}
            fill="var(--text)"
            opacity={0.45}
          />
        ))}
      </g>
    </svg>
  )
}

export function VoiceOverlay({
  onConfirm,
  onCancel,
  onLiveText,
  isDesktop = false,
  language,
  getAudioCtx,
  inline = false,
  onSendNow,
}: {
  onConfirm: (text: string) => void
  /** Inline mobile (façon Claude) : ↑ = valide la dictée ET envoie le message. */
  onSendNow?: (text: string) => void
  onCancel: () => void
  /** Appelé en continu avec le texte transcrit (final + interim) → champ live. */
  onLiveText?: (text: string) => void
  isDesktop?: boolean
  /** Langue de reconnaissance ; défaut = langue de l'app. */
  language?: string
  getAudioCtx?: () => AudioContext | null | undefined
  /** inline = rendu DANS le champ de saisie (pas de barre flottante en bas) :
   *  la waveform occupe la ligne d'actions, le bouton ✓ remplace « envoyer ». */
  inline?: boolean
}) {
  const { t, lang: appLang } = useI18n()
  const language_ = language ?? appLang ?? 'fr'
  const [mounted, setMounted] = useState(false)
  const [phase, setPhase] = useState<'rec' | 'transcribing' | 'error'>('rec')
  const [errorMsg, setErrorMsg] = useState('')
  const onLiveRef = useRef(onLiveText)
  onLiveRef.current = onLiveText

  // Transcription
  const srRef = useRef<SRInstance | null>(null)
  const srCommittedRef = useRef('')      // texte des sessions SR terminées
  const srSessionRef = useRef('')        // texte de la session SR en cours
  const srHeardRef = useRef(false)       // la reco a déjà renvoyé quelque chose
  const whisperModeRef = useRef(false)   // repli Whisper progressif actif
  const liveRef = useRef('')             // dernier texte affiché (source de vérité)

  // Audio
  const levelRef = useRef(0)             // niveau micro lissé 0..1 (onde)
  const barsRef = useRef<(HTMLSpanElement | null)[]>([])   // onde « barre flottante »
  const bufRef = useRef<number[]>(new Array(NBARS).fill(0))
  const streamRef = useRef<MediaStream | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const ownsCtxRef = useRef(false)
  const nodesRef = useRef<{ source?: MediaStreamAudioSourceNode; processor?: ScriptProcessorNode; gain?: GainNode; analyser?: AnalyserNode }>({})
  const pcmRef = useRef<Float32Array[]>([])
  const sampleRateRef = useRef(44100)
  const voiceMsRef = useRef(0)           // durée de voix détectée (ms)
  const voiceSinceResultRef = useRef(0)  // voix captée depuis le dernier résultat de la reco (ms)
  const lastResultAtRef = useRef(0)

  const confirmedRef = useRef(false)
  const closedRef = useRef(false)
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  useEffect(() => { setMounted(true) }, [])

  const pushLive = (txt: string) => {
    liveRef.current = txt
    try { onLiveRef.current?.(txt) } catch { /* ignore */ }
  }
  const pushFromSR = () => pushLive(joinText(srCommittedRef.current, srSessionRef.current))

  const native = isNativeApp()

  const switchToWhisper = () => {
    if (whisperModeRef.current) return
    whisperModeRef.current = true
    const r = srRef.current
    srRef.current = null
    try { r?.abort() } catch { /* ignore */ }
  }

  // ── Reconnaissance vocale navigateur EN DIRECT (source principale web) ──
  useEffect(() => {
    if (native) { whisperModeRef.current = true; return }   // WKWebView : Whisper uniquement
    const SR = getSR()
    if (!SR) { whisperModeRef.current = true; return }
    const lang = language_.includes('-') ? language_
      : language_ === 'fr' ? 'fr-FR' : language_ === 'en' ? 'en-US' : language_ === 'es' ? 'es-ES'
      : `${language_}-${language_.toUpperCase()}`
    let rec: SRInstance
    try {
      rec = new SR()
      rec.lang = lang
      rec.continuous = true
      rec.interimResults = true
      rec.maxAlternatives = 1
      srRef.current = rec
      rec.onresult = (e: SREvent) => {
        if (confirmedRef.current || closedRef.current || srRef.current !== rec) return
        srSessionRef.current = sessionText(e.results)
        srHeardRef.current = true
        voiceSinceResultRef.current = 0
        lastResultAtRef.current = performance.now()
        pushFromSR()
      }
      // Fin de session (silence / limite Safari) : on COMMITE la session (même
      // les intermédiaires non finalisés) puis on relance tant qu'on enregistre.
      rec.onend = () => {
        if (srRef.current !== rec) return
        srCommittedRef.current = joinText(srCommittedRef.current, srSessionRef.current)
        srSessionRef.current = ''
        if (confirmedRef.current || closedRef.current) return
        window.setTimeout(() => {
          if (confirmedRef.current || closedRef.current || srRef.current !== rec) return
          try { rec.start() } catch { /* déjà démarrée */ }
        }, 60)
      }
      rec.onerror = (e: SRErrorEvent) => {
        // Micro/service indisponible pour la reco → Whisper prend le relais.
        const code = e?.error ?? ''
        if (code === 'audio-capture' || code === 'not-allowed' || code === 'service-not-allowed' || code === 'language-not-supported') switchToWhisper()
      }
      rec.start()
    } catch { switchToWhisper() }
    return () => { const r = srRef.current; srRef.current = null; try { r?.stop() } catch { /* ignore */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language_])

  // ── Capture audio (onde + PCM pour Whisper) ──
  useEffect(() => {
    let analyser: AnalyserNode | null = null
    let data: Uint8Array<ArrayBuffer> | null = null
    let chunkTimer: ReturnType<typeof setInterval> | null = null
    let raf = 0
    closedRef.current = false   // (re)montage — StrictMode remonte les effets en dev

    ;(async () => {
      if (native && !nativeMicEnabled()) { setPhase('error'); setErrorMsg(t('ai.micDenied', { reason: t('ai.unknown') })); return }
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!srRef.current) { setPhase('error'); setErrorMsg(t('ai.micDenied', { reason: t('ai.unknown') })) }
        return
      }
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        })
      } catch (e) {
        // Micro refusé : la reco navigateur peut quand même marcher.
        const err = e as { name?: string }
        if (!srRef.current) { setPhase('error'); setErrorMsg(t('ai.micDenied', { reason: err?.name || t('ai.unknown') })) }
        return
      }
      if (closedRef.current) { stream.getTracks().forEach(tr => tr.stop()); return }
      streamRef.current = stream

      try {
        let ctx = getAudioCtx?.() ?? null
        if (!ctx || ctx.state === 'closed') {
          const w = window as unknown as { AudioContext?: AudioCtxCtor; webkitAudioContext?: AudioCtxCtor }
          const Ctx = w.AudioContext ?? w.webkitAudioContext
          if (!Ctx) return
          ctx = new Ctx(); ownsCtxRef.current = true
        }
        await ctx.resume?.()
        ctxRef.current = ctx
        sampleRateRef.current = ctx.sampleRate

        const source = ctx.createMediaStreamSource(stream)
        const an = ctx.createAnalyser()
        an.fftSize = 512
        an.smoothingTimeConstant = 0.5
        analyser = an
        data = new Uint8Array(new ArrayBuffer(an.fftSize))

        const processor = ctx.createScriptProcessor(4096, 1, 1)
        const gain = ctx.createGain(); gain.gain.value = 0
        pcmRef.current = []
        processor.onaudioprocess = (e: AudioProcessingEvent) => {
          if (!confirmedRef.current && phaseRef.current === 'rec') {
            pcmRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)))
          }
        }
        source.connect(an)
        an.connect(processor)
        processor.connect(gain)
        gain.connect(ctx.destination)
        nodesRef.current = { source, processor, gain, analyser: an }
      } catch { /* onde indisponible → la reco navigateur suffit */ }
    })()

    // Transcription PROGRESSIVE Whisper (natif, pas de reco, ou reco muette).
    let busy = false
    chunkTimer = setInterval(() => {
      if (busy || confirmedRef.current || closedRef.current || phaseRef.current !== 'rec') return
      // Reco navigateur muette (ou figée — ex. Safari iOS qui perd le micro après
      // la 1re lettre) alors que le micro capte de la voix depuis ~4 s → repli
      // Whisper, qui retranscrit TOUT l'audio depuis le début.
      if (!whisperModeRef.current && srRef.current && voiceSinceResultRef.current > 4000) switchToWhisper()
      if (!whisperModeRef.current) return
      const total = pcmRef.current.reduce((a, c) => a + c.length, 0)
      const sr = sampleRateRef.current
      if (total < sr * 0.5 || total > sr * 45) return   // < 0,5 s : on attend ; > 45 s : final à ■ / ↑
      busy = true
      void (async () => {
        try { const txt = await whisperFallback(); if (txt && !confirmedRef.current && !closedRef.current) pushLive(txt) }
        finally { busy = false }
      })()
    }, 1300)

    // Niveau micro → onde (60 fps).
    let last = performance.now()
    let idle = 0
    const tick = (now: number) => {
      const dt = Math.min(100, now - last)
      last = now
      const ctx = ctxRef.current
      if (ctx?.state === 'suspended') void ctx.resume?.()
      let v = 0
      if (analyser && data) {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) { const d = (data[i] - 128) / 128; sum += d * d }
        v = Math.min(1, Math.sqrt(sum / data.length) * 7)
        if (v < 0.045) v = 0
      }
      // Voix réellement captée par le micro (sert au repli Whisper).
      if (v > 0 && phaseRef.current === 'rec') {
        voiceMsRef.current += dt
        voiceSinceResultRef.current += dt
      }
      // iOS : si l'onde est muette (session audio prise par la reco) mais que des
      // mots arrivent, on anime d'après l'activité de la reconnaissance.
      if (v === 0 && now - lastResultAtRef.current < 450) v = 0.3 + Math.random() * 0.45
      // Attaque rapide, relâche douce.
      const cur = levelRef.current
      levelRef.current = v > cur ? cur + (v - cur) * 0.6 : cur + (v - cur) * 0.18

      // Onde de la barre flottante (rendu historique bureau / builder).
      if (!inline || !onSendNow) {
        idle += dt / 200
        const buf = bufRef.current
        buf.push(levelRef.current); buf.shift()
        const quiet = phaseRef.current === 'rec'
        for (let i = 0; i < NBARS; i++) {
          const el = barsRef.current[i]
          if (!el) continue
          const wave = quiet ? (Math.sin(idle - i * 0.45) * 0.5 + 0.5) * 0.14 : 0
          const amp = Math.max(buf[i], wave)
          el.style.transform = `scaleY(${(0.16 + amp * 0.84).toFixed(3)})`
          el.style.opacity = String(0.45 + amp * 0.55)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      closedRef.current = true
      cancelAnimationFrame(raf)
      if (chunkTimer) clearInterval(chunkTimer)
      const nd = nodesRef.current
      try { if (nd.processor) nd.processor.onaudioprocess = null } catch { /* ignore */ }
      try { nd.source?.disconnect() } catch { /* ignore */ }
      try { nd.processor?.disconnect() } catch { /* ignore */ }
      try { nd.gain?.disconnect() } catch { /* ignore */ }
      try { streamRef.current?.getTracks().forEach(tr => tr.stop()) } catch { /* ignore */ }
      if (ownsCtxRef.current) { try { void ctxRef.current?.close?.() } catch { /* ignore */ } }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Transcription Whisper de tout l'audio capté.
  async function whisperFallback(): Promise<string> {
    const total = pcmRef.current.reduce((a, c) => a + c.length, 0)
    if (total < sampleRateRef.current * 0.25) return ''
    try {
      const wav = encodeWAV(pcmRef.current, sampleRateRef.current)
      const form = new FormData()
      form.append('file', wav, 'audio.wav')
      form.append('language', language_.split('-')[0])
      const res = await fetch('/api/stt', { method: 'POST', body: form })
      if (!res.ok) return ''
      const { text } = await res.json() as { text?: string }
      return (text ?? '').trim()
    } catch { return '' }
  }

  const finish = (done: (text: string) => void) => {
    if (phaseRef.current !== 'rec') return
    confirmedRef.current = true
    const r = srRef.current
    try { r?.stop() } catch { /* ignore */ }
    const live = (liveRef.current || joinText(srCommittedRef.current, srSessionRef.current)).trim()
    // Mode Whisper : on fait une dernière passe complète (plus précise) si possible.
    if (whisperModeRef.current) {
      setPhase('transcribing')
      void (async () => {
        const w = await whisperFallback()
        const out = w || live
        if (out) { done(out); return }
        setPhase('error'); setErrorMsg(t('ai.transcriptionEmpty'))
      })()
      return
    }
    // Texte déjà transcrit → validation INSTANTANÉE.
    if (live) { done(live); return }
    setPhase('transcribing')
    void (async () => {
      const w = await whisperFallback()
      if (w) { done(w); return }
      setPhase('error'); setErrorMsg(t('ai.transcriptionEmpty'))
    })()
  }
  const confirm = () => { haptic('light'); finish(onConfirm) }
  const sendNow = () => { haptic('medium'); finish(onSendNow ?? onConfirm) }
  const cancel = () => {
    haptic('light')
    confirmedRef.current = true
    try { srRef.current?.stop() } catch { /* ignore */ }
    onCancel()
  }

  if (!mounted) return null

  const keyframes = (
    <style>{`
      @keyframes vo_pill { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
      @keyframes vo_in { from { opacity: 0; transform: scale(0.85) } to { opacity: 1; transform: scale(1) } }
      @keyframes vo_wave_in { from { opacity: 0; transform: scaleX(0.6) } to { opacity: 1; transform: scaleX(1) } }
      @keyframes vo_pulse { 0%,100% { opacity: .45 } 50% { opacity: 1 } }
      .vo-press { -webkit-tap-highlight-color: transparent; touch-action: manipulation; transition: transform 0.18s cubic-bezier(0.32,0.72,0,1), opacity 0.18s ease; }
      .vo-press:active { transform: scale(0.92); opacity: 0.85; }
      .vo-btn-in { animation: vo_in 0.32s cubic-bezier(0.32,0.72,0,1) both; }
      .vo-wave-in { animation: vo_wave_in 0.4s cubic-bezier(0.32,0.72,0,1) both; }
      @media (prefers-reduced-motion: reduce) { .vo-press, .vo-press:active { transition: none; transform: none; } .vo-btn-in, .vo-wave-in { animation: none; } }
    `}</style>
  )

  // ── Rendu INTÉGRÉ façon Claude (composeur mobile) ──
  if (inline && onSendNow) {
    const round = (bg: string, fg: string): React.CSSProperties => ({
      width: 40, height: 40, borderRadius: '50%', border: 'none', flexShrink: 0, padding: 0,
      background: bg, color: fg, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    })
    const busy = phase !== 'rec'
    return (
      <>
        {keyframes}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '4px 10px 10px', boxSizing: 'border-box' }}>
          <button type="button" onClick={cancel} aria-label={t('ai.cancel')} className="vo-press vo-btn-in" style={round('var(--surface-chip)', 'var(--text)')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <div style={{ flex: 1, minWidth: 0, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {phase === 'error'
              ? <span role="status" style={{ fontSize: 13, color: 'var(--text-mid)', fontFamily: 'var(--font-body)', textAlign: 'center', lineHeight: 1.3 }}>{errorMsg}</span>
              : phase === 'transcribing'
                ? <span role="status" className="ai-shimmer" style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)' }}>{t('ai2.voice.transcribing')}</span>
                : <div className="vo-wave-in" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}><DictationWave levelRef={levelRef} active={!busy} /></div>}
          </div>
          <button type="button" onClick={confirm} disabled={busy} aria-label={t('ai2.voice.stop')} className="vo-press vo-btn-in" style={{ ...round('var(--surface-chip)', 'var(--text)'), opacity: busy ? 0.5 : 1, animationDelay: '40ms' }}>
            <span aria-hidden style={{ width: 12, height: 12, borderRadius: 3, background: 'currentColor', display: 'block' }} />
          </button>
          <button type="button" onClick={sendNow} disabled={busy} aria-label={t('aim.composer.send')} className="vo-press vo-btn-in" style={{ ...round('var(--primary)', 'var(--on-primary)'), opacity: busy ? 0.6 : 1, animationDelay: '80ms' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 19V5M5 12l7-7 7 7" /></svg>
          </button>
        </div>
      </>
    )
  }

  // ── Barre historique (bureau / builder / Studio) : × · onde · ✓ ──
  const bar = (
    <div style={inline ? {
      pointerEvents: 'auto', width: '100%', display: 'flex', alignItems: 'center', gap: 10,
      background: 'transparent', border: 'none', borderRadius: 0, padding: 0, boxShadow: 'none',
    } : {
      pointerEvents: 'auto',
      width: '100%', maxWidth: 620, display: 'flex', alignItems: 'center', gap: 12,
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
      padding: '9px 12px', boxShadow: '0 14px 44px color-mix(in srgb, var(--text) 15%, transparent)',
      animation: 'vo_pill 0.26s cubic-bezier(0.32,0.72,0,1)',
    }}>
      <button onClick={cancel} aria-label={t('ai.cancel')} className="vo-press" style={{
        width: 40, height: 40, borderRadius: '50%', border: 'none', flexShrink: 0,
        background: 'var(--bg-card2)', color: 'var(--text-mid)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>

      <div style={{ flex: 1, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3.5, overflow: 'hidden', opacity: phase === 'rec' ? 1 : 0.4 }}>
        {Array.from({ length: NBARS }, (_, i) => (
          <span key={i} ref={el => { barsRef.current[i] = el }} style={{
            width: 3, height: '100%', borderRadius: 'var(--r-pill)', flexShrink: 0,
            background: 'var(--text)', transformOrigin: 'center',
            transform: 'scaleY(0.16)', opacity: 0.45, willChange: 'transform, opacity',
          }} />
        ))}
      </div>

      <button onClick={confirm} aria-label={t('ai.validate')} disabled={phase !== 'rec'} className="vo-press" style={{
        width: 42, height: 42, borderRadius: '50%', border: 'none', flexShrink: 0,
        background: 'var(--primary)', color: 'var(--on-primary)', cursor: phase === 'rec' ? 'pointer' : 'default',
        opacity: phase === 'rec' ? 1 : 0.6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {phase === 'transcribing'
          ? <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor', animation: 'vo_pulse 1s ease-in-out infinite' }} />
          : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
      </button>
    </div>
  )

  if (inline) {
    return (
      <>
        {keyframes}
        {phase === 'error' && (
          <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text-mid)', fontFamily: 'var(--font-body)' }}>{errorMsg}</span>
        )}
        {phase !== 'error' && bar}
      </>
    )
  }

  return createPortal(
    <>
      {keyframes}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 14500,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: `0 ${isDesktop ? 24 : 12}px calc(${isDesktop ? 20 : 14}px + env(safe-area-inset-bottom, 0px))`,
        pointerEvents: 'none',
      }}>
        {phase !== 'error' && !onLiveText && <LivePreview textRef={liveRef} />}
        {phase === 'error' && (
          <div style={{ pointerEvents: 'none', maxWidth: 420, textAlign: 'center', fontSize: 13, lineHeight: 1.4, color: 'var(--text-mid)', fontFamily: 'var(--font-body)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '8px 12px' }}>
            {errorMsg}
          </div>
        )}
        {bar}
      </div>
    </>,
    document.body,
  )
}

/** Aperçu live (barre flottante sans champ relié) — relit la ref à 8 Hz. */
function LivePreview({ textRef }: { textRef: React.MutableRefObject<string> }) {
  const [txt, setTxt] = useState('')
  useEffect(() => {
    const id = window.setInterval(() => setTxt(prev => (prev === textRef.current ? prev : textRef.current)), 120)
    return () => window.clearInterval(id)
  }, [textRef])
  if (!txt) return null
  return (
    <div style={{
      pointerEvents: 'none', maxWidth: 620, width: '100%',
      background: 'color-mix(in srgb, var(--bg-card) 92%, transparent)',
      border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '8px 12px',
      maxHeight: '4.5em', overflow: 'hidden',
    }}>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>{txt}</p>
    </div>
  )
}
