'use client'

// ══════════════════════════════════════════════════════════════
// VoiceConversation — mode discussion vocale (style Claude, image 5).
//
// Boucle : écoute (STT navigateur) → silence = fin de tour → coach (Claude)
// → l'IA PARLE (TTS serveur OpenAI, repli synthèse navigateur) et affiche
// la version écrite. Barge-in : parler coupe la voix.
//
// Barre de contrôle : ⚙️ Réglages · 🎤 Micro · ✕ Fermer.
// Orbe centrale qui réagit au volume réel de la voix de l'IA.
// Réglages : Style de voix · Langue · Mode (mains libres / appuyer pour parler).
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const ACCENT = '#3C90D5'
const SILENCE_MS = 2200
// WAV silencieux minimal — sert à déverrouiller la lecture audio sur iOS.
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA='

type Phase = 'listening' | 'thinking' | 'speaking'
type StyleKey = 'douce' | 'neutre' | 'energique'
type LangKey = 'fr-FR' | 'en-US' | 'es-ES'
type ModeKey = 'hands' | 'push'

interface VoiceSettings { style: StyleKey; lang: LangKey; mode: ModeKey }
const DEFAULT_SETTINGS: VoiceSettings = { style: 'douce', lang: 'fr-FR', mode: 'hands' }
const SETTINGS_KEY = 'thw_voice_settings'

const STYLE_LABEL: Record<StyleKey, string> = { douce: 'Douce', neutre: 'Neutre', energique: 'Énergique' }
const LANG_LABEL: Record<LangKey, string> = { 'fr-FR': 'Français', 'en-US': 'English', 'es-ES': 'Español' }

function loadSettings(): VoiceSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS
}

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
  const [show, setShow] = useState('')
  const [supported, setSupported] = useState(true)
  const [muted, setMuted] = useState(false)
  const [pressing, setPressing] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_SETTINGS)

  const phaseRef = useRef<Phase>('listening')
  const mutedRef = useRef(false)
  const pressingRef = useRef(false)
  const unlockedRef = useRef(false)
  const settingsRef = useRef<VoiceSettings>(DEFAULT_SETTINGS)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null)
  const finalRef = useRef('')
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const endedRef = useRef(false)

  // Audio serveur + analyse pour l'orbe
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audioCtxRef = useRef<any>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const analyserDataRef = useRef<Uint8Array | null>(null)
  const orbRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)

  const setPhaseBoth = (p: Phase) => { phaseRef.current = p; setPhase(p) }
  const setMutedBoth = (m: boolean) => { mutedRef.current = m; setMuted(m) }

  useEffect(() => { setMounted(true); setSettings(loadSettings()) }, [])
  useEffect(() => { settingsRef.current = settings }, [settings])

  // Persistance des réglages
  const updateSettings = (patch: Partial<VoiceSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      // Changement de langue → recaler la reconnaissance
      if (patch.lang && recRef.current) { try { recRef.current.lang = patch.lang } catch { /* ignore */ } }
      return next
    })
  }

  // ── Reconnaissance vocale ───────────────────────────────────
  useEffect(() => {
    if (!mounted) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setSupported(false); return }

    audioElRef.current = new Audio()
    audioElRef.current.crossOrigin = 'anonymous'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR()
    rec.lang = settingsRef.current.lang
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1
    recRef.current = rec

    const armSilence = () => {
      if (settingsRef.current.mode === 'push') return   // en push-to-talk, on finalise au relâchement
      if (silenceRef.current) clearTimeout(silenceRef.current)
      silenceRef.current = setTimeout(() => {
        if (phaseRef.current === 'listening' && !mutedRef.current && finalRef.current.trim()) void finalizeTurn()
      }, SILENCE_MS)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      if (endedRef.current || mutedRef.current) return
      // On n'accumule QUE pendant l'écoute (évite de polluer le tour suivant
      // avec ce qui est capté pendant la réflexion / la réponse de l'IA).
      if (phaseRef.current !== 'listening') return
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalRef.current += e.results[i][0].transcript + ' '
      }
      armSilence()
    }
    rec.onend = () => {
      if (endedRef.current) return
      // Pas de relance pendant que l'IA parle (sinon le micro capte la voix de
      // l'IA → l'IA se coupe elle-même / écho).
      if (phaseRef.current === 'speaking') return
      // En mains libres, on relance ; en push, seulement si on presse.
      if ((settingsRef.current.mode === 'hands' && !mutedRef.current) || pressingRef.current) {
        setTimeout(() => { if (!endedRef.current && phaseRef.current !== 'speaking') { try { rec.start() } catch { /* déjà démarrée */ } } }, 120)
      }
    }
    rec.onerror = () => { /* no-speech / aborted… */ }

    if (settingsRef.current.mode === 'hands') {
      try { rec.start() } catch { /* ignore */ }
    }
    setPhaseBoth('listening')

    return () => {
      endedRef.current = true
      if (silenceRef.current) clearTimeout(silenceRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      try { rec.stop() } catch { /* ignore */ }
      try { audioElRef.current?.pause() } catch { /* ignore */ }
      try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
      try { audioCtxRef.current?.close?.() } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  // Ref miroir pour pressing (utilisé dans rec.onend)
  useEffect(() => { pressingRef.current = pressing }, [pressing])

  async function finalizeTurn() {
    const userText = finalRef.current.trim()
    finalRef.current = ''
    if (!userText) { setPhaseBoth('listening'); return }
    setPhaseBoth('thinking')
    let res = { speak: '', show: '' }
    try { res = await onTurn(userText) } catch { /* erreur réseau */ }
    if (endedRef.current) return
    await speak(res.speak, res.show)
  }

  // ── Lecture de la réponse : TTS serveur, repli navigateur ───
  // Déverrouille la lecture audio (iOS/Safari) au 1er geste : sans ça, la voix
  // serveur ne peut pas se lancer en mains libres → repli voix navigateur.
  function unlockAudio() {
    if (unlockedRef.current || !audioElRef.current) return
    unlockedRef.current = true
    try {
      ensureAudioGraph()
      audioCtxRef.current?.resume?.()
      const el = audioElRef.current
      el.src = SILENT_WAV
      const p = el.play()
      if (p && typeof p.catch === 'function') p.catch(() => {})
    } catch { /* ignore */ }
  }

  function ensureAudioGraph() {
    if (audioCtxRef.current || !audioElRef.current) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Ctx = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new Ctx()
      const src = ctx.createMediaElementSource(audioElRef.current)
      const analyser: AnalyserNode = ctx.createAnalyser()
      analyser.fftSize = 256
      src.connect(analyser); analyser.connect(ctx.destination)
      audioCtxRef.current = ctx
      analyserRef.current = analyser
      analyserDataRef.current = new Uint8Array(analyser.fftSize)
    } catch { /* graphe audio indisponible → orbe animée par défaut */ }
  }

  function startOrbLoop() {
    const tick = () => {
      const orb = orbRef.current
      const an = analyserRef.current
      const data = analyserDataRef.current
      if (orb) {
        let v = 0
        if (an && data) {
          an.getByteTimeDomainData(data)
          let sum = 0
          for (let i = 0; i < data.length; i++) { const d = (data[i] - 128) / 128; sum += d * d }
          v = Math.min(1, Math.sqrt(sum / data.length) * 4.5)
        }
        const s = 1 + v * 0.28
        orb.style.transform = `scale(${s.toFixed(3)})`
        orb.style.boxShadow = `0 0 ${(28 + v * 60).toFixed(0)}px rgba(60,144,213,${(0.3 + v * 0.5).toFixed(2)})`
      }
      if (phaseRef.current === 'speaking') rafRef.current = requestAnimationFrame(tick)
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
  }

  function onSpeakDone() {
    if (endedRef.current) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (settingsRef.current.mode === 'hands' && !mutedRef.current) {
      setPhaseBoth('listening')
      try { recRef.current?.start() } catch { /* déjà démarrée */ }
    } else {
      setPhaseBoth('listening')
    }
  }

  function stopSpeaking() {
    try { audioElRef.current?.pause() } catch { /* ignore */ }
    try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }

  async function speak(oral: string, ecrit: string) {
    setShow(ecrit || oral)
    const clean = stripForSpeech(oral || ecrit)
    if (!clean) { onSpeakDone(); return }
    setPhaseBoth('speaking')
    // On coupe l'écoute pendant que l'IA parle (anti-écho / anti-auto-coupure).
    try { recRef.current?.stop() } catch { /* ignore */ }

    // 1) TTS serveur (OpenAI). 2) repli synthèse navigateur.
    const ok = await speakServer(clean)
    if (!ok && !endedRef.current) speakBrowser(clean)
  }

  async function speakServer(clean: string): Promise<boolean> {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, style: settingsRef.current.style, language: settingsRef.current.lang }),
      })
      if (!res.ok) return false
      const blob = await res.blob()
      if (endedRef.current) return true
      const url = URL.createObjectURL(blob)
      const el = audioElRef.current
      if (!el) return false
      ensureAudioGraph()
      try { await audioCtxRef.current?.resume?.() } catch { /* ignore */ }
      el.src = url
      el.onended = () => { URL.revokeObjectURL(url); onSpeakDone() }
      el.onerror = () => { URL.revokeObjectURL(url); onSpeakDone() }
      await el.play()
      startOrbLoop()
      return true
    } catch {
      return false
    }
  }

  function speakBrowser(clean: string) {
    const synth = window.speechSynthesis
    if (!synth) { onSpeakDone(); return }
    synth.cancel()
    const u = new SpeechSynthesisUtterance(clean)
    u.lang = settingsRef.current.lang
    u.rate = settingsRef.current.style === 'energique' ? 1.12 : settingsRef.current.style === 'douce' ? 0.96 : 1.03
    const v = synth.getVoices().find(vv => vv.lang === settingsRef.current.lang)
      ?? synth.getVoices().find(vv => vv.lang?.toLowerCase().startsWith(settingsRef.current.lang.slice(0, 2)))
    if (v) u.voice = v
    u.onend = onSpeakDone
    u.onerror = onSpeakDone
    startOrbLoop()   // orbe animée (pas d'analyse possible sur la voix navigateur)
    synth.speak(u)
  }

  // ── Micro (mains libres = mute/écoute ; push = maintenir) ───
  const toggleMute = () => {
    if (settingsRef.current.mode !== 'hands') return
    const next = !mutedRef.current
    setMutedBoth(next)
    if (next) { try { recRef.current?.stop() } catch { /* ignore */ } stopSpeaking() }
    else { setPhaseBoth('listening'); try { recRef.current?.start() } catch { /* ignore */ } }
  }
  const pushStart = () => {
    if (settingsRef.current.mode !== 'push') return
    setPressing(true)
    stopSpeaking()
    finalRef.current = ''
    setPhaseBoth('listening')
    try { recRef.current?.start() } catch { /* ignore */ }
  }
  const pushEnd = () => {
    if (settingsRef.current.mode !== 'push') return
    setPressing(false)
    try { recRef.current?.stop() } catch { /* ignore */ }
    setTimeout(() => { if (finalRef.current.trim()) void finalizeTurn() }, 150)
  }

  if (!mounted) return null

  const status = !supported ? 'Vocal non supporté sur ce navigateur'
    : phase === 'thinking' ? 'Ok, je m’en occupe…'
    : phase === 'speaking' ? ''
    : muted ? 'Micro coupé'
    : settings.mode === 'push' ? (pressing ? 'Je t’écoute…' : 'Maintiens le micro pour parler')
    : 'Je t’écoute…'

  const micActive = settings.mode === 'push' ? pressing : !muted

  const speaking = phase === 'speaking'

  return createPortal(
    <div
      role="dialog" aria-modal="true" aria-label="Conversation vocale"
      onPointerDown={unlockAudio}
      style={{
        position: 'fixed', inset: 0, zIndex: 1500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'calc(16px + env(safe-area-inset-top,0px)) 16px calc(16px + env(safe-area-inset-bottom,0px))',
        background: 'color-mix(in srgb, var(--ai-bg) 50%, rgba(0,0,0,0.28))',
        backdropFilter: 'blur(10px) saturate(1.05)', WebkitBackdropFilter: 'blur(10px) saturate(1.05)',
        animation: 'vc_in 0.22s ease',
      }}
    >
      {/* ── Carte centrée ─────────────────────────────────────── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        width: 'min(440px, 100%)', height: 'min(600px, 100%)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--ai-bg)', color: 'var(--ai-text)',
        border: '1px solid var(--ai-border)', borderRadius: 28,
        boxShadow: '0 24px 70px rgba(0,0,0,0.28)',
        animation: 'vc_card 0.3s cubic-bezier(0.32,0.72,0,1)',
      }}>
        {/* Corps : orbe (héros) + statut + réponse */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, padding: '28px 22px 8px' }}>
          {/* Orbe / halo réactif */}
          <div style={{ position: 'relative', width: speaking ? 96 : 140, height: speaking ? 96 : 140, display: 'grid', placeItems: 'center', flexShrink: 0, transition: 'width 0.3s ease, height 0.3s ease' }}>
            {phase === 'thinking' && (
              <span style={{ position: 'absolute', width: '88%', height: '88%', borderRadius: '50%', background: `conic-gradient(from 0deg, transparent 0deg, ${ACCENT} 300deg, transparent 360deg)`, animation: 'vc_spin 1s linear infinite', WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))', mask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))' }} />
            )}
            {!speaking && phase === 'listening' && !muted && (
              <span style={{ position: 'absolute', width: '70%', height: '70%', borderRadius: '50%', border: `1.5px solid ${ACCENT}`, animation: 'vc_ring 2.4s ease-out infinite' }} />
            )}
            <div
              ref={orbRef}
              style={{
                width: '70%', height: '70%', borderRadius: '50%',
                background: `radial-gradient(circle at 32% 28%, color-mix(in srgb, ${ACCENT} 26%, var(--ai-bg)) 0%, var(--ai-bg) 74%)`,
                border: `1px solid color-mix(in srgb, ${ACCENT} 45%, transparent)`,
                boxShadow: '0 0 30px rgba(60,144,213,0.30)',
                transition: 'transform 0.08s linear, box-shadow 0.12s linear',
                animation: speaking ? 'none' : 'vc_breathe_orb 3.6s ease-in-out infinite',
                display: 'grid', placeItems: 'center',
              }}
            >
              <svg width={speaking ? 26 : 32} height={speaking ? 26 : 32} viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.92 }}>
                {speaking
                  ? <path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4" />
                  : <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>}
              </svg>
            </div>
          </div>

          {/* Statut sous l'orbe */}
          {status && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--ai-mid)', flexShrink: 0 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: speaking ? ACCENT : muted ? 'var(--ai-dim)' : '#22c55e', animation: phase === 'thinking' ? 'vc_dot 1.1s ease-in-out infinite' : 'none' }} />
              {status}
            </span>
          )}

          {/* Réponse écrite de l'IA (défilable) */}
          {speaking && show && (
            <div style={{ width: '100%', flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', display: 'flex', justifyContent: 'center', animation: 'vc_in 0.25s ease', maskImage: 'linear-gradient(to bottom, transparent 0, #000 12px)' }}>
              <RichEcrit text={show} />
            </div>
          )}
        </div>

        {/* ── Barre de contrôle : ⚙️ · 🎤 · ✕ ──────────────────── */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 26, padding: '14px 0 22px' }}>
          {/* Réglages */}
          <button onClick={() => setSettingsOpen(true)} aria-label="Paramètres vocaux" style={ctrlBtn()}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {/* Micro */}
          <button
            onClick={toggleMute}
            onPointerDown={pushStart}
            onPointerUp={pushEnd}
            onPointerLeave={() => { if (pressing) pushEnd() }}
            aria-label={settings.mode === 'push' ? 'Maintiens pour parler' : (muted ? 'Réactiver le micro' : 'Couper le micro')}
            style={{
              width: 62, height: 62, borderRadius: '50%', border: 'none', flexShrink: 0,
              background: micActive ? ACCENT : 'var(--ai-bg2, rgba(127,127,127,0.14))',
              color: micActive ? '#fff' : 'var(--ai-mid)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: micActive ? '0 6px 18px rgba(60,144,213,0.40)' : 'none',
              transition: 'background 0.15s, box-shadow 0.15s, transform 0.1s',
              transform: pressing ? 'scale(0.93)' : 'scale(1)', touchAction: 'none',
            }}
          >
            {micActive ? (
              <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 19v3M8 22h8" />
              </svg>
            ) : (
              <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 1l22 22M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12M12 19v3" />
              </svg>
            )}
          </button>

          {/* Fermer */}
          <button onClick={onClose} aria-label="Terminer la conversation" style={ctrlBtn()}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {/* ── Panneau Paramètres vocaux (slide-in DANS la carte) ── */}
        {settingsOpen && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2, background: 'var(--ai-bg)',
            display: 'flex', flexDirection: 'column',
            animation: 'vc_settings 0.26s cubic-bezier(0.32,0.72,0,1)',
          }}>
            {/* En-tête */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '18px 18px 14px', borderBottom: '1px solid var(--ai-border)' }}>
              <button onClick={() => setSettingsOpen(false)} aria-label="Retour" style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'var(--ai-bg2, rgba(127,127,127,0.14))', color: 'var(--ai-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <span style={{ flex: 1, fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-display)' }}>Paramètres vocaux</span>
            </div>
            {/* Corps */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Segment
                label="Style de voix"
                value={settings.style}
                options={(Object.keys(STYLE_LABEL) as StyleKey[]).map(k => ({ value: k, label: STYLE_LABEL[k] }))}
                onChange={v => updateSettings({ style: v as StyleKey })}
              />
              <Segment
                label="Langue"
                value={settings.lang}
                options={(Object.keys(LANG_LABEL) as LangKey[]).map(k => ({ value: k, label: LANG_LABEL[k] }))}
                onChange={v => updateSettings({ lang: v as LangKey })}
              />
              <div>
                <p style={segLabelStyle}>Mode</p>
                <button onClick={() => updateSettings({ mode: 'hands' })} style={modeRow(settings.mode === 'hands')}>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Mains libres</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', marginTop: 1 }}>Idéal pour les environnements calmes</span>
                  </span>
                  {settings.mode === 'hands' && <Check />}
                </button>
                <button onClick={() => updateSettings({ mode: 'push' })} style={modeRow(settings.mode === 'push')}>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Appuyer pour parler</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', marginTop: 1 }}>Maintenez pour parler, relâchez pour envoyer</span>
                  </span>
                  {settings.mode === 'push' && <Check />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes vc_in        { from { opacity: 0 } to { opacity: 1 } }
        @keyframes vc_card      { from { opacity: 0; transform: translateY(16px) scale(0.98) } to { opacity: 1; transform: none } }
        @keyframes vc_settings  { from { opacity: 0; transform: translateX(18px) } to { opacity: 1; transform: none } }
        @keyframes vc_dot       { 0%,100% { opacity: .4 } 50% { opacity: 1 } }
        @keyframes vc_spin      { to { transform: rotate(360deg) } }
        @keyframes vc_breathe_orb { 0%,100% { transform: scale(1) } 50% { transform: scale(1.05) } }
        @keyframes vc_ring      { 0% { transform: scale(0.8); opacity: 0.5 } 100% { transform: scale(1.6); opacity: 0 } }
      `}</style>
    </div>,
    document.body,
  )
}

function ctrlBtn(): React.CSSProperties {
  return {
    width: 48, height: 48, borderRadius: '50%', border: 'none', flexShrink: 0,
    background: 'var(--ai-bg2, rgba(127,127,127,0.14))', color: 'var(--ai-mid)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.15s',
  }
}

const segLabelStyle: React.CSSProperties = {
  margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)',
  textTransform: 'uppercase', letterSpacing: '0.04em',
}

function modeRow(active: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
    padding: '12px 12px', borderRadius: 12, marginBottom: 6,
    border: `1px solid ${active ? ACCENT : 'var(--border)'}`,
    background: active ? 'color-mix(in srgb, #3C90D5 8%, transparent)' : 'transparent',
    cursor: 'pointer', textAlign: 'left',
  }
}

function Segment({ label, value, options, onChange }: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div>
      <p style={segLabelStyle}>{label}</p>
      <div style={{ display: 'flex', gap: 6, background: 'var(--bg-alt)', borderRadius: 12, padding: 4 }}>
        {options.map(o => {
          const active = o.value === value
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              style={{
                flex: 1, padding: '10px 8px', borderRadius: 9, border: 'none', cursor: 'pointer',
                background: active ? 'var(--bg-card)' : 'transparent',
                color: active ? 'var(--text)' : 'var(--text-mid)',
                fontWeight: active ? 700 : 500, fontSize: 13, fontFamily: 'DM Sans,sans-serif',
                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'background 0.12s, color 0.12s',
              }}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const Check = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 6L9 17l-5-5" /></svg>
)
