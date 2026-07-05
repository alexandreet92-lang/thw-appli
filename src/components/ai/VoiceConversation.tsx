'use client'

// ══════════════════════════════════════════════════════════════
// VoiceConversation — mode discussion vocale (style Claude, images 1-5).
//
// Boucle : écoute (STT navigateur) → silence = fin de tour → coach (Claude)
// → l'IA PARLE (TTS serveur OpenAI, repli synthèse navigateur) et le texte
// s'affiche en grande typo serif avec effet « karaoké » (mots lus en plein,
// suite en gris), synchronisé sur la lecture audio.
//
// PAS d'orbe, PAS de bouton central. Fond clair + halo ambiant qui change de
// teinte selon l'état. Barre du bas : ⚙️ Réglages · 🎤 Micro · ✕ Fermer.
// Réglages = bottom sheet opaque : Voix · Langue · Vitesse · Mode.
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'

const SILENCE_MS = 1200
const SPEECH_RMS = 0.014   // seuil VAD : au-dessus = on parle

// Encode des blocs PCM Float32 en WAV 16 bits mono (pour /api/stt Whisper).
function encodeWAV(chunks: Float32Array[], sampleRate: number): Blob {
  const len = chunks.reduce((a, c) => a + c.length, 0)
  const buffer = new ArrayBuffer(44 + len * 2)
  const view = new DataView(buffer)
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)) }
  w(0, 'RIFF'); view.setUint32(4, 36 + len * 2, true); w(8, 'WAVE')
  w(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  w(36, 'data'); view.setUint32(40, len * 2, true)
  let off = 44
  for (const c of chunks) for (let i = 0; i < c.length; i++) { const s = Math.max(-1, Math.min(1, c[i])); view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true); off += 2 }
  return new Blob([view], { type: 'audio/wav' })
}
// WAV silencieux minimal — sert à déverrouiller la lecture audio sur iOS.
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA='

// Halos ambiants façon Claude (chaud quand l'IA répond, froid à l'écoute,
// rosé micro coupé). Couleurs décoratives volontairement en dur pour coller à
// l'esthétique Claude — annotées design-allow-color (hors gate enforce).
const AMBIENT_COOL = 'radial-gradient(125% 80% at 50% 118%, rgba(96,140,225,0.42) 0%, rgba(96,140,225,0) 62%)' // design-allow-color — bleu (écoute)
const AMBIENT_WARM = 'radial-gradient(125% 82% at 50% 118%, rgba(232,176,142,0.40) 0%, rgba(232,176,142,0) 64%)' // design-allow-color
const AMBIENT_MUTE = 'radial-gradient(125% 80% at 50% 118%, rgba(232,84,80,0.42) 0%, rgba(232,84,80,0) 60%)'    // design-allow-color — rouge (micro coupé)
const AMBIENT_SENT = 'radial-gradient(125% 80% at 50% 118%, rgba(52,199,120,0.46) 0%, rgba(52,199,120,0) 62%)'  // design-allow-color — vert (message envoyé)
const MUTE_RED = '#E0654F' // design-allow-color

type Phase = 'listening' | 'thinking' | 'speaking'
type StyleKey = 'douce' | 'neutre' | 'energique'
type LangKey = 'fr-FR' | 'en-US' | 'es-ES'
type SpeedKey = 'lent' | 'normal' | 'rapide'
type ModeKey = 'hands' | 'push'

interface VoiceSettings { style: StyleKey; lang: LangKey; speed: SpeedKey; mode: ModeKey }
const DEFAULT_SETTINGS: VoiceSettings = { style: 'douce', lang: 'fr-FR', speed: 'normal', mode: 'hands' }
const SETTINGS_KEY = 'thw_voice_settings'

const STYLE_ORDER: StyleKey[] = ['douce', 'neutre', 'energique']
const LANG_ORDER: LangKey[] = ['fr-FR', 'en-US', 'es-ES']
const LANG_LABEL: Record<LangKey, string> = { 'fr-FR': 'French', 'en-US': 'English', 'es-ES': 'Español' }
const SPEED_ORDER: SpeedKey[] = ['lent', 'normal', 'rapide']
const SPEED_VALUE: Record<SpeedKey, number> = { lent: 0.85, normal: 1.0, rapide: 1.15 }
// Cadence d'apparition du texte (caractères/seconde) ≈ débit de la voix.
const SPEED_CPS: Record<SpeedKey, number> = { lent: 12.5, normal: 15, rapide: 17.5 }

function loadSettings(): VoiceSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS
}

// Pour la voix : retire la mise en forme, garde une phrase lisible à dire.
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

// Pour l'affichage : retire les symboles markdown mais garde ponctuation/casse.
function cleanForDisplay(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/[#*_`>]/g, '')
    .replace(/^\s*[-•→]\s*/gm, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

export function VoiceConversation({ onTurn, onClose }: {
  // onOral est appelé au fil de l'eau avec l'oral accumulé (streaming) →
  // permet de PARLER phrase par phrase sans attendre toute la réponse.
  onTurn: (text: string, onOral: (oralSoFar: string) => void) => Promise<{ speak: string; show: string }>
  onClose: () => void
}) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [phase, setPhase] = useState<Phase>('listening')
  const [supported, setSupported] = useState(true)
  const [muted, setMuted] = useState(false)
  const [pressing, setPressing] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_SETTINGS)

  // Conversation affichée (dernier tour)
  const [userMsg, setUserMsg] = useState('')
  const [liveUser, setLiveUser] = useState('')          // ce que je dis EN DIRECT (interim)
  const [displayText, setDisplayText] = useState('')    // réponse du coach (texte)
  const [spokenChars, setSpokenChars] = useState(0)     // karaoké : nb de caractères « lus »
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)
  const [sentFlash, setSentFlash] = useState(false)   // flash vert quand un message part
  const bargeCountRef = useRef(0)                       // frames de voix pendant que l'IA parle (barge-in)

  const phaseRef = useRef<Phase>('listening')
  const mutedRef = useRef(false)
  const pressingRef = useRef(false)
  const unlockedRef = useRef(false)
  const settingsRef = useRef<VoiceSettings>(DEFAULT_SETTINGS)
  const finalRef = useRef('')
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const endedRef = useRef(false)
  // Capture micro (pipeline fiable getUserMedia + PCM + Whisper, façon Claude)
  const streamRef = useRef<MediaStream | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const gainCapRef = useRef<GainNode | null>(null)
  const pcmRef = useRef<Float32Array[]>([])
  const hadSpeechRef = useRef(false)
  const transcribingRef = useRef(false)
  const sampleRateRef = useRef(16000)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const srLiveRef = useRef<any>(null)   // reco navigateur — APERÇU EN DIRECT seulement

  // Audio serveur (lecture directe) + chaîne Web Audio (amplification + haut-parleur iOS)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audioCtxRef = useRef<any>(null)
  const mediaWiredRef = useRef(false)
  // Streaming TTS : file de phrases à dire, lues au fur et à mesure
  const ttsQueueRef = useRef<string[]>([])
  const spokenIdxRef = useRef(0)        // position déjà mise en file dans l'oral
  const streamDoneRef = useRef(false)   // l'oral est-il complètement reçu ?
  const runningRef = useRef(false)      // un lecteur de file tourne-t-il ?
  const lastOralRef = useRef('')        // dernier oral accumulé (streaming)
  const nextAudioRef = useRef<Promise<string | null> | null>(null)  // préchargement

  // Karaoké
  const displayRef = useRef('')
  const spokenCharsRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const lastTickRef = useRef(0)

  const setPhaseBoth = (p: Phase) => { phaseRef.current = p; setPhase(p) }
  const setMutedBoth = (m: boolean) => { mutedRef.current = m; setMuted(m) }
  const setDisplayBoth = (t: string) => { displayRef.current = t; setDisplayText(t) }
  const setSpokenBoth = (n: number) => { spokenCharsRef.current = n; setSpokenChars(n) }

  useEffect(() => { setMounted(true); setSettings(loadSettings()) }, [])
  useEffect(() => { settingsRef.current = settings }, [settings])

  // Persistance des réglages
  const updateSettings = (patch: Partial<VoiceSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  // ── Capture micro fiable : getUserMedia + PCM + VAD → Whisper (/api/stt) ──
  // Remplace webkitSpeechRecognition (instable sur iOS). On accumule le son
  // tant qu'on parle ; après un silence, on transcrit côté serveur.
  useEffect(() => {
    if (!mounted) return
    audioElRef.current = new Audio()
    audioElRef.current.crossOrigin = 'anonymous'
    audioElRef.current.volume = 1
    endedRef.current = false

    ;(async () => {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      } catch { setSupported(false); return }
      if (endedRef.current) { stream.getTracks().forEach(tr => tr.stop()); return }
      streamRef.current = stream
      try {
        let ctx = audioCtxRef.current
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!ctx || ctx.state === 'closed') { const C = window.AudioContext || (window as any).webkitAudioContext; ctx = new C(); audioCtxRef.current = ctx }
        await ctx.resume?.()
        sampleRateRef.current = ctx.sampleRate
        const source = ctx.createMediaStreamSource(stream); sourceRef.current = source
        const processor = ctx.createScriptProcessor(4096, 1, 1); processorRef.current = processor
        const gain = ctx.createGain(); gain.gain.value = 0; gainCapRef.current = gain
        pcmRef.current = []; hadSpeechRef.current = false
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        processor.onaudioprocess = (e: any) => {
          if (endedRef.current) return
          const ch0: Float32Array = e.inputBuffer.getChannelData(0)
          // ── Barge-in : si l'IA PARLE et que je parle par-dessus → elle se tait et écoute ──
          if (phaseRef.current === 'speaking' && !mutedRef.current && settingsRef.current.mode === 'hands') {
            let s0 = 0; for (let i = 0; i < ch0.length; i++) s0 += ch0[i] * ch0[i]
            if (Math.sqrt(s0 / ch0.length) > SPEECH_RMS * 1.7) {   // seuil + haut (évite l'écho du TTS)
              bargeCountRef.current++
              if (bargeCountRef.current >= 3) {
                bargeCountRef.current = 0
                stopSpeaking()
                pcmRef.current = [new Float32Array(ch0)]
                hadSpeechRef.current = true
                setPhaseBoth('listening')
              }
            } else bargeCountRef.current = 0
            return
          }
          bargeCountRef.current = 0
          const listening = phaseRef.current === 'listening' && !mutedRef.current && !transcribingRef.current
            && (settingsRef.current.mode === 'hands' || pressingRef.current)
          if (!listening) return
          const ch: Float32Array = ch0
          let sum = 0; for (let i = 0; i < ch.length; i++) sum += ch[i] * ch[i]
          const rms = Math.sqrt(sum / ch.length)
          const speaking = rms > SPEECH_RMS
          if (speaking) { hadSpeechRef.current = true; if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null } }
          if (hadSpeechRef.current) {
            pcmRef.current.push(new Float32Array(ch))
            // Sécurité : coupe à ~30 s d'un seul tenant.
            if (pcmRef.current.length > (sampleRateRef.current / 4096) * 30) { void finalizeUtterance(); return }
            if (!speaking && settingsRef.current.mode === 'hands' && !silenceRef.current) {
              silenceRef.current = setTimeout(() => { void finalizeUtterance() }, SILENCE_MS)
            }
          }
        }
        source.connect(processor); processor.connect(gain); gain.connect(ctx.destination)
        setPhaseBoth('listening')
      } catch { setSupported(false) }
    })()

    return () => {
      endedRef.current = true
      if (silenceRef.current) clearTimeout(silenceRef.current)
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      try { processorRef.current && (processorRef.current.onaudioprocess = null) } catch { /* ignore */ }
      try { sourceRef.current?.disconnect() } catch { /* ignore */ }
      try { processorRef.current?.disconnect() } catch { /* ignore */ }
      try { gainCapRef.current?.disconnect() } catch { /* ignore */ }
      try { streamRef.current?.getTracks().forEach(tr => tr.stop()) } catch { /* ignore */ }
      try { audioElRef.current?.pause() } catch { /* ignore */ }
      try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  // Aperçu EN DIRECT de ce que je dis (reco navigateur, best-effort). La
  // transcription FINALE reste Whisper — ceci ne sert qu'à afficher les mots.
  useEffect(() => {
    if (!mounted) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR()
    rec.lang = settingsRef.current.lang
    rec.continuous = true
    rec.interimResults = true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      if (endedRef.current || phaseRef.current !== 'listening' || mutedRef.current) return
      let txt = ''
      for (let i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript
      if (txt.trim()) setLiveUser(txt.trim())
    }
    rec.onend = () => { if (!endedRef.current) { try { rec.start() } catch { /* ignore */ } } }
    rec.onerror = () => { /* best-effort */ }
    srLiveRef.current = rec
    try { rec.start() } catch { /* ignore */ }
    return () => { try { rec.stop() } catch { /* ignore */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  // Fin d'un tour de parole → transcription Whisper → réponse du coach.
  async function finalizeUtterance() {
    if (transcribingRef.current || endedRef.current) return
    if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null }
    const chunks = pcmRef.current
    pcmRef.current = []
    hadSpeechRef.current = false
    const total = chunks.reduce((a, c) => a + c.length, 0)
    if (total < sampleRateRef.current * 0.35) return   // trop court → bruit, on ignore
    transcribingRef.current = true
    setPhaseBoth('thinking')
    try {
      const wav = encodeWAV(chunks, sampleRateRef.current)
      const form = new FormData()
      form.append('file', wav, 'audio.wav')
      form.append('language', settingsRef.current.lang.slice(0, 2))
      const res = await fetch('/api/stt', { method: 'POST', body: form })
      const text = res.ok ? (((await res.json().catch(() => null)) as { text?: string } | null)?.text ?? '').trim() : ''
      transcribingRef.current = false
      if (endedRef.current) return
      if (text) {
        setSentFlash(true); setTimeout(() => setSentFlash(false), 850)   // flash vert : message envoyé
        finalRef.current = text; void finalizeTurn()
      }
      else setPhaseBoth('listening')   // rien compris → on ré-écoute
    } catch { transcribingRef.current = false; if (!endedRef.current) setPhaseBoth('listening') }
  }

  useEffect(() => {
    const was = pressingRef.current
    pressingRef.current = pressing
    // Push-to-talk : au relâchement, on finalise le tour de parole.
    if (was && !pressing && settingsRef.current.mode === 'push') void finalizeUtterance()
  }, [pressing])

  async function finalizeTurn() {
    const userText = finalRef.current.trim()
    finalRef.current = ''
    if (!userText) { setPhaseBoth('listening'); setLiveUser(''); return }
    setUserMsg(userText)
    setLiveUser('')
    setFeedback(null)
    setDisplayBoth('')
    setSpokenBoth(0)
    setPhaseBoth('thinking')
    ttsQueueRef.current = []
    spokenIdxRef.current = 0
    streamDoneRef.current = false
    lastOralRef.current = ''
    nextAudioRef.current = null

    let res = { speak: '', show: '' }
    try { res = await onTurn(userText, handleOralChunk) } catch { /* erreur réseau */ }
    if (endedRef.current) return
    const finalOral = res.speak || lastOralRef.current
    if (spokenIdxRef.current === 0) {
      const clean = stripForSpeech(finalOral)
      if (clean) ttsQueueRef.current.push(clean)
    } else {
      const rest = stripForSpeech(lastOralRef.current.slice(spokenIdxRef.current))
      if (rest) ttsQueueRef.current.push(rest)
    }
    // Texte affiché final = version « écrit » du coach (repli sur l'oral).
    const shown = cleanForDisplay(res.show || finalOral)
    if (shown) setDisplayBoth(shown)
    streamDoneRef.current = true
    if (ttsQueueRef.current.length === 0 && !runningRef.current) { onSpeakDone(); return }
    void runQueue()
  }

  // Déverrouille la lecture audio (iOS/Safari) au 1er geste + branche la chaîne
  // Web Audio : amplifie (gain > 1) ET force la sortie haut-parleur. Sur iOS,
  // quand le micro est actif, le son part sinon dans l'écouteur (très faible).
  function unlockAudio() {
    const el = audioElRef.current
    if (!el) return
    try {
      if (!audioCtxRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Ctx = window.AudioContext || (window as any).webkitAudioContext
        if (Ctx) audioCtxRef.current = new Ctx()
      }
      const ctx = audioCtxRef.current
      if (ctx) {
        ctx.resume?.()
        if (!mediaWiredRef.current) {
          const src = ctx.createMediaElementSource(el)
          const gain = ctx.createGain()
          gain.gain.value = 2.0   // +6 dB ≈ deux fois plus fort
          src.connect(gain)
          gain.connect(ctx.destination)
          mediaWiredRef.current = true
        }
      }
    } catch { /* lecture normale si Web Audio indisponible */ }
    if (unlockedRef.current) return
    unlockedRef.current = true
    try {
      el.src = SILENT_WAV
      const p = el.play()
      if (p && typeof p.catch === 'function') p.catch(() => {})
    } catch { /* ignore */ }
  }

  // ── Streaming oral : on dit chaque phrase dès qu'elle est complète ──
  function handleOralChunk(oralSoFar: string) {
    lastOralRef.current = oralSoFar
    // Affiche le texte au fil de l'eau (sera remplacé par l'« écrit » à la fin).
    if (displayRef.current === '' || phaseRef.current !== 'speaking') {
      const live = cleanForDisplay(oralSoFar)
      if (live) setDisplayBoth(live)
    } else {
      const live = cleanForDisplay(oralSoFar)
      if (live.length >= displayRef.current.length) setDisplayBoth(live)
    }
    const pending = oralSoFar.slice(spokenIdxRef.current)
    const m = pending.match(/[\s\S]*[.!?…\n](?=\s|$)/)
    if (!m) return
    const ready = m[0]
    const sentences = ready.split(/(?<=[.!?…])\s+|\n+/).map(s => stripForSpeech(s)).filter(Boolean)
    spokenIdxRef.current += ready.length
    if (sentences.length === 0) return
    for (const s of sentences) ttsQueueRef.current.push(s)
    void runQueue()
  }

  async function fetchAudio(text: string): Promise<string | null> {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          style: settingsRef.current.style,
          language: settingsRef.current.lang,
          speed: SPEED_VALUE[settingsRef.current.speed],
        }),
      })
      if (!res.ok) return null
      const blob = await res.blob()
      return URL.createObjectURL(blob)
    } catch { return null }
  }

  function playUrl(url: string): Promise<void> {
    return new Promise<void>((resolve) => {
      const el = audioElRef.current
      if (!el) { URL.revokeObjectURL(url); resolve(); return }
      el.src = url
      const done = () => { URL.revokeObjectURL(url); el.onended = null; el.onerror = null; resolve() }
      el.onended = done
      el.onerror = done
      const p = el.play()
      if (p && typeof p.catch === 'function') p.catch(() => done())
    })
  }

  function speakBrowserOnce(text: string): Promise<void> {
    return new Promise<void>((resolve) => {
      const synth = window.speechSynthesis
      if (!synth) { resolve(); return }
      const u = new SpeechSynthesisUtterance(text)
      u.lang = settingsRef.current.lang
      u.rate = SPEED_VALUE[settingsRef.current.speed] * (settingsRef.current.style === 'energique' ? 1.08 : settingsRef.current.style === 'douce' ? 0.98 : 1.02)
      const v = synth.getVoices().find(vv => vv.lang === settingsRef.current.lang)
        ?? synth.getVoices().find(vv => vv.lang?.toLowerCase().startsWith(settingsRef.current.lang.slice(0, 2)))
      if (v) u.voice = v
      u.onend = () => resolve()
      u.onerror = () => resolve()
      synth.speak(u)
    })
  }

  // ── Karaoké : avance le surlignage au rythme de la lecture audio ──
  function startKaraoke() {
    if (rafRef.current != null) return
    lastTickRef.current = performance.now()
    const step = () => {
      if (endedRef.current) { rafRef.current = null; return }
      const now = performance.now()
      const dt = Math.min(0.1, (now - lastTickRef.current) / 1000)
      lastTickRef.current = now
      const el = audioElRef.current
      const total = displayRef.current.length
      // N'avance QUE si l'audio joue vraiment (sinon on tient la position → pas de décalage).
      if (phaseRef.current === 'speaking' && el && !el.paused && el.currentTime > 0 && total > 0) {
        const cps = SPEED_CPS[settingsRef.current.speed]
        const next = Math.min(total, spokenCharsRef.current + cps * dt)
        if (next !== spokenCharsRef.current) setSpokenBoth(next)
      }
      if (phaseRef.current === 'speaking' && !endedRef.current) rafRef.current = requestAnimationFrame(step)
      else rafRef.current = null
    }
    rafRef.current = requestAnimationFrame(step)
  }

  // Lecteur de la file : joue les phrases en séquence, en préchargeant la suivante.
  async function runQueue() {
    if (runningRef.current) return
    runningRef.current = true
    setPhaseBoth('speaking')
    startKaraoke()
    try {
      while (!endedRef.current) {
        const text = ttsQueueRef.current.shift()
        if (text === undefined) {
          if (streamDoneRef.current) break
          await new Promise(r => setTimeout(r, 60))
          continue
        }
        const audioPromise = nextAudioRef.current ?? fetchAudio(text)
        nextAudioRef.current = null
        const url = await audioPromise
        if (endedRef.current) { if (url) URL.revokeObjectURL(url); break }
        if (ttsQueueRef.current[0]) nextAudioRef.current = fetchAudio(ttsQueueRef.current[0])
        if (url) await playUrl(url)
        else await speakBrowserOnce(text)
      }
    } finally {
      runningRef.current = false
    }
    if (!endedRef.current && streamDoneRef.current && ttsQueueRef.current.length === 0) onSpeakDone()
  }

  function onSpeakDone() {
    if (endedRef.current) return
    // Révèle tout le texte (le karaoké se cale sur la fin de lecture).
    if (displayRef.current) setSpokenBoth(displayRef.current.length)
    // Repart en écoute : la capture PCM reprend automatiquement (gate sur la phase).
    pcmRef.current = []; hadSpeechRef.current = false
    setPhaseBoth('listening')
  }

  function stopSpeaking() {
    ttsQueueRef.current = []
    streamDoneRef.current = true
    nextAudioRef.current = null
    try { audioElRef.current?.pause() } catch { /* ignore */ }
    try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
  }

  // ── Micro (mains libres = mute/écoute ; push = maintenir) ───
  const toggleMute = () => {
    if (settingsRef.current.mode !== 'hands') return
    const next = !mutedRef.current
    setMutedBoth(next)
    if (next) { setLiveUser(''); pcmRef.current = []; hadSpeechRef.current = false; stopSpeaking() }
    else { pcmRef.current = []; hadSpeechRef.current = false; setPhaseBoth('listening') }
  }
  const pushStart = () => {
    if (settingsRef.current.mode !== 'push') return
    stopSpeaking()
    pcmRef.current = []; hadSpeechRef.current = false
    setPhaseBoth('listening')
    setPressing(true)   // déclenche la capture (gate onaudioprocess) ; le relâchement finalise
  }
  const pushEnd = () => {
    if (settingsRef.current.mode !== 'push') return
    setPressing(false)  // l'effet [pressing] appelle finalizeUtterance()
  }

  if (!mounted) return null

  const ambient = sentFlash ? AMBIENT_SENT
    : muted ? AMBIENT_MUTE
    : (phase === 'thinking' || phase === 'speaking') ? AMBIENT_WARM
    : AMBIENT_COOL

  const micActive = settings.mode === 'push' ? pressing : !muted
  const hasConvo = !!userMsg || !!displayText || !!liveUser
  const spokenN = Math.floor(spokenChars)
  const spokenPart = displayText.slice(0, spokenN)
  const restPart = displayText.slice(spokenN)

  return createPortal(
    <div
      role="dialog" aria-modal="true" aria-label={t('ai.voiceConversation')}
      onPointerDown={unlockAudio}
      style={{
        position: 'fixed', inset: 0, zIndex: 1500, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg)', color: 'var(--text)',
        animation: 'vc_in 0.24s ease',
      }}
    >
      {/* ── Halos ambiants superposés (crossfade selon l'état) ── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: AMBIENT_COOL, opacity: ambient === AMBIENT_COOL ? 1 : 0, transition: 'opacity 0.9s ease' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: AMBIENT_WARM, opacity: ambient === AMBIENT_WARM ? 1 : 0, transition: 'opacity 0.9s ease' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: AMBIENT_MUTE, opacity: ambient === AMBIENT_MUTE ? 1 : 0, transition: 'opacity 0.9s ease' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: AMBIENT_SENT, opacity: ambient === AMBIENT_SENT ? 1 : 0, transition: 'opacity 0.4s ease' }} />

      {/* ── Bandeau d'état haut (micro coupé / non supporté) ── */}
      <div style={{ position: 'relative', flexShrink: 0, height: 'calc(20px + env(safe-area-inset-top,0px))' }} />
      {(muted || !supported) && (
        <div style={{ position: 'relative', textAlign: 'center', padding: '4px 16px 0', flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)', color: !supported ? 'var(--text-mid)' : MUTE_RED }}>
            {!supported ? t('ai.voiceNotSupported') : t('ai.micDisabled')}
          </span>
        </div>
      )}

      {/* ── Corps : conversation ou invite ── */}
      <div style={{
        position: 'relative', flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        display: 'flex', flexDirection: 'column',
        justifyContent: hasConvo ? 'flex-start' : 'center',
        padding: '8px 22px 16px',
      }}>
        {!hasConvo ? (
          <p style={{ textAlign: 'center', margin: 0, fontSize: 19, fontWeight: 500, fontFamily: 'var(--font-body)', color: 'var(--text-mid)' }}>
            {t('ai.startSpeaking')}
          </p>
        ) : (
          <div style={{ width: '100%', maxWidth: 640, margin: '0 auto', animation: 'vc_in 0.25s ease' }}>
            {/* Message utilisateur figé (bulle grise en haut à droite) */}
            {userMsg && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '6px 0 18px' }}>
                <span style={{
                  maxWidth: '80%', padding: '8px 13px', borderRadius: 16,
                  background: 'var(--bg-card2)', color: 'var(--text)',
                  fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)', lineHeight: 1.35,
                }}>
                  {userMsg}
                </span>
              </div>
            )}
            {/* Réponse du coach — typo serif + karaoké */}
            {displayText && (
              <p style={{
                margin: 0, fontFamily: 'var(--font-display)',
                fontSize: 'clamp(19px, 4.8vw, 24px)', lineHeight: 1.45, fontWeight: 500,
                letterSpacing: '-0.01em', whiteSpace: 'pre-wrap',
              }}>
                <span style={{ color: 'var(--text)' }}>{spokenPart}</span>
                <span style={{ color: 'var(--text-dim)' }}>{restPart}</span>
              </p>
            )}
            {/* Ce que je dis EN DIRECT (bulle live pendant que je parle) */}
            {liveUser && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '14px 0 0', animation: 'vc_in 0.2s ease' }}>
                <span style={{
                  maxWidth: '80%', padding: '8px 13px', borderRadius: 16,
                  background: 'var(--bg-card2)', color: 'var(--text-mid)',
                  fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)', lineHeight: 1.35,
                }}>
                  {liveUser}
                </span>
              </div>
            )}
            {/* Retours (pouce haut / bas) — comme Claude */}
            {displayText && !liveUser && phase === 'listening' && (
              <div style={{ display: 'flex', gap: 14, marginTop: 18 }}>
                <button onClick={() => setFeedback(feedback === 'up' ? null : 'up')} aria-label={t('ai.goodAnswer')} style={fbBtn(feedback === 'up')}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v11M2 13v6a2 2 0 0 0 2 2h13.3a2 2 0 0 0 2-1.7l1.4-9A2 2 0 0 0 19.7 8H14V4a2 2 0 0 0-2-2l-3 8" /></svg>
                </button>
                <button onClick={() => setFeedback(feedback === 'down' ? null : 'down')} aria-label={t('ai.badAnswer')} style={fbBtn(feedback === 'down')}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 14V3M22 11V5a2 2 0 0 0-2-2H6.7a2 2 0 0 0-2 1.7l-1.4 9A2 2 0 0 0 5.3 16H11v4a2 2 0 0 0 2 2l3-8" /></svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Barre de contrôle : ⚙️ … 🎤 ✕ ── */}
      <div style={{
        position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 22px calc(20px + env(safe-area-inset-bottom,0px))',
      }}>
        {/* Réglages */}
        <button onClick={() => setSettingsOpen(true)} aria-label={t('ai.voiceSettings')} style={circleBtn('light')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Micro */}
          <button
            onClick={toggleMute}
            onPointerDown={pushStart}
            onPointerUp={pushEnd}
            onPointerLeave={() => { if (pressing) pushEnd() }}
            aria-label={settings.mode === 'push' ? t('ai.holdToTalk') : (muted ? t('ai.unmuteMic') : t('ai.muteMic'))}
            style={{
              width: 60, height: 60, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
              border: micActive ? '1px solid var(--border)' : 'none',
              background: micActive ? 'var(--bg-card)' : MUTE_RED,
              color: micActive ? 'var(--text)' : '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px color-mix(in srgb, var(--text) 14%, transparent)',
              transition: 'transform 0.1s, background 0.2s', transform: pressing ? 'scale(0.93)' : 'scale(1)',
              touchAction: 'none',
            }}
          >
            {micActive ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 19v3" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 1l22 22M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12M12 19v3" />
              </svg>
            )}
          </button>

          {/* Fermer */}
          <button onClick={onClose} aria-label={t('ai.endConversation')} style={circleBtn('dark')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </div>

      {/* ── Bottom sheet « Paramètres vocaux » ── */}
      {settingsOpen && (
        <SettingsSheet
          settings={settings}
          onChange={updateSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      <style>{`
        @keyframes vc_in    { from { opacity: 0 } to { opacity: 1 } }
        @keyframes vc_scrim { from { opacity: 0 } to { opacity: 1 } }
        @keyframes vc_sheet { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </div>,
    document.body,
  )
}

// ── Boutons ronds de la barre de contrôle ──────────────────────
function circleBtn(kind: 'light' | 'dark'): React.CSSProperties {
  return {
    width: 56, height: 56, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
    border: kind === 'light' ? '1px solid var(--border)' : 'none',
    background: kind === 'light' ? 'var(--bg-card)' : 'var(--text)',
    color: kind === 'light' ? 'var(--text)' : 'var(--bg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 16px color-mix(in srgb, var(--text) 14%, transparent)',
    transition: 'transform 0.1s',
  }
}

function fbBtn(active: boolean): React.CSSProperties {
  return {
    width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer',
    background: active ? 'var(--bg-card2)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--text-dim)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.12s, color 0.12s',
  }
}

// ── Bottom sheet des réglages (images 3 & 4) ───────────────────
function SettingsSheet({ settings, onChange, onClose }: {
  settings: VoiceSettings
  onChange: (patch: Partial<VoiceSettings>) => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const STYLE_LABEL: Record<StyleKey, string> = { douce: t('ai.voiceStyleSoft'), neutre: t('ai.voiceStyleNeutral'), energique: t('ai.voiceStyleEnergetic') }
  const STYLE_DESC: Record<StyleKey, string> = {
    douce: t('ai.voiceStyleSoftDesc'),
    neutre: t('ai.voiceStyleNeutralDesc'),
    energique: t('ai.voiceStyleEnergeticDesc'),
  }
  const SPEED_LABEL: Record<SpeedKey, string> = { lent: t('ai.speedSlow'), normal: t('ai.speedNormal'), rapide: t('ai.speedFast') }
  const styleIdx = STYLE_ORDER.indexOf(settings.style)
  const cycleStyle = (dir: number) => {
    const n = (styleIdx + dir + STYLE_ORDER.length) % STYLE_ORDER.length
    onChange({ style: STYLE_ORDER[n] })
  }
  const cycleLang = () => {
    const n = (LANG_ORDER.indexOf(settings.lang) + 1) % LANG_ORDER.length
    onChange({ lang: LANG_ORDER[n] })
  }
  const cycleSpeed = () => {
    const n = (SPEED_ORDER.indexOf(settings.speed) + 1) % SPEED_ORDER.length
    onChange({ speed: SPEED_ORDER[n] })
  }

  return (
    <>
      {/* Scrim grisé qui assombrit la conversation derrière */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0, zIndex: 5,
          background: 'color-mix(in srgb, var(--text) 32%, transparent)',
          animation: 'vc_scrim 0.22s ease',
        }}
      />
      {/* Feuille opaque */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 6,
        maxHeight: '88%', display: 'flex', flexDirection: 'column',
        background: 'var(--bg-card)', borderRadius: '24px 24px 0 0',
        boxShadow: '0 -16px 50px color-mix(in srgb, var(--text) 22%, transparent)',
        padding: '10px 20px calc(24px + env(safe-area-inset-bottom,0px))',
        animation: 'vc_sheet 0.30s cubic-bezier(0.32,0.72,0,1)',
      }}>
        {/* Poignée */}
        <div style={{ width: 38, height: 5, borderRadius: 3, background: 'var(--border)', margin: '0 auto 14px' }} />

        {/* En-tête : ✕ à gauche, titre centré */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, minHeight: 40 }}>
          <button onClick={onClose} aria-label={t('ai.close')} style={{
            position: 'absolute', left: 0, width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'var(--bg-card2)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <span style={{ fontSize: 19, fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--text)' }}>{t('ai.voiceSettings')}</span>
        </div>

        <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Carte de voix (carrousel) */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 0 2px' }}>
            <div style={{
              position: 'relative', width: 'min(300px, 78%)', aspectRatio: '1 / 1',
              borderRadius: 26, background: 'var(--bg-card2)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              {/* Zones de tap gauche/droite */}
              <button onClick={() => cycleStyle(-1)} aria-label={t('ai.previousVoice')} style={carouselArrow('left')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <span style={{ fontSize: 27, fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--text)' }}>{STYLE_LABEL[settings.style]}</span>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-mid)' }}>{STYLE_DESC[settings.style]}</span>
              <button onClick={() => cycleStyle(1)} aria-label={t('ai.nextVoice')} style={carouselArrow('right')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
            {/* Pagination */}
            <div style={{ display: 'flex', gap: 7, marginTop: 14 }}>
              {STYLE_ORDER.map((k, i) => (
                <span key={k} style={{ width: i === styleIdx ? 8 : 6, height: i === styleIdx ? 8 : 6, borderRadius: '50%', background: i === styleIdx ? 'var(--text)' : 'var(--text-dim)', transition: 'all 0.15s' }} />
              ))}
            </div>
          </div>

          {/* Langue */}
          <button onClick={cycleLang} style={settingRow()}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-body)', color: 'var(--text)' }}>{t('ai.language')}</span>
              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-body)', color: 'var(--text-mid)', background: 'var(--bg-card)', borderRadius: 6, padding: '2px 7px' }}>Beta</span>
            </span>
            <span style={rowValue()}>{LANG_LABEL[settings.lang]} <Chevrons /></span>
          </button>

          {/* Vitesse */}
          <button onClick={cycleSpeed} style={settingRow()}>
            <span style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-body)', color: 'var(--text)' }}>{t('ai.speed')}</span>
            <span style={rowValue()}>{SPEED_LABEL[settings.speed]} <Chevrons /></span>
          </button>

          {/* Mode */}
          <div style={{ marginTop: 4 }}>
            <button onClick={() => onChange({ mode: 'hands' })} style={modeRow(settings.mode === 'hands')}>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-body)', color: 'var(--text)' }}>{t('ai.handsFree')}</span>
                <span style={{ display: 'block', fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-mid)', marginTop: 2 }}>{t('ai.handsFreeDesc')}</span>
              </span>
              {settings.mode === 'hands' && <Check />}
            </button>
            <button onClick={() => onChange({ mode: 'push' })} style={modeRow(settings.mode === 'push')}>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-body)', color: 'var(--text)' }}>{t('ai.pushToTalk')}</span>
                <span style={{ display: 'block', fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-mid)', marginTop: 2 }}>{t('ai.pushToTalkDesc')}</span>
              </span>
              {settings.mode === 'push' && <Check />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function carouselArrow(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    [side]: 8, width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
    background: 'transparent', color: 'var(--text-dim)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}

function settingRow(): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
    padding: '15px 18px', borderRadius: 16, border: 'none', cursor: 'pointer', textAlign: 'left',
    background: 'var(--bg-card2)',
  }
}

function rowValue(): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-body)', color: 'var(--text)',
  }
}

function modeRow(active: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
    padding: '14px 18px', borderRadius: 16, marginBottom: 8, cursor: 'pointer', textAlign: 'left',
    border: 'none',
    background: active ? 'var(--bg-card2)' : 'transparent',
  }
}

const Chevrons = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-mid)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M7 15l5 5 5-5M7 9l5-5 5 5" /></svg>
)

const Check = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 6L9 17l-5-5" /></svg>
)
