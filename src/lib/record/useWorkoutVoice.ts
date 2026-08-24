'use client'
// ══════════════════════════════════════════════════════════════════
// useWorkoutVoice — annonces vocales du lecteur en direct.
//
// Voix = MÊME pipeline que l'IA : /api/tts (OpenAI, style « énergique »),
// repli automatique sur la synthèse vocale du navigateur si indisponible.
//
// Timing PRÉCIS (décompte 3-2-1) : on pré-synthétise les phrases fixes au
// lancement et on les décode en AudioBuffer joués via un AudioContext unique
// → latence ~0, calage à la seconde. L'AudioContext est débloqué (resume) dans
// le geste « Commencer » (obligatoire iOS).
// ══════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef } from 'react'

type Lang = 'fr' | 'en'

export interface WorkoutVoice {
  unlock: () => void                 // à appeler dans le geste « Commencer »
  speak: (text: string) => void      // joue (cache prioritaire, sinon fetch/navigateur)
  speakAwait: (text: string) => Promise<void>  // joue ET résout à la fin de la lecture
  prefetch: (text: string) => void   // pré-charge un texte (ex. prochain exo)
  beep: (freq?: number, ms?: number) => void   // bip synthétique (oscillateur)
}

// Mots du décompte selon la langue (« un » et pas « one »).
export function countWords(lang: Lang): [string, string, string] {
  return lang === 'en' ? ['one', 'two', 'three'] : ['un', 'deux', 'trois']
}

const AC: typeof AudioContext | undefined =
  typeof window !== 'undefined' ? (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : undefined

export function useWorkoutVoice(lang: Lang, mutedRef: React.MutableRefObject<boolean>): WorkoutVoice {
  const ctxRef = useRef<AudioContext | null>(null)
  const buffers = useRef<Map<string, AudioBuffer>>(new Map())
  const pending = useRef<Map<string, Promise<AudioBuffer | null>>>(new Map())
  const serverOk = useRef<boolean | null>(null)
  const langCode = lang === 'en' ? 'en-US' : 'fr-FR'

  useEffect(() => () => { try { ctxRef.current?.close() } catch { /* ignore */ } }, [])

  const ctx = useCallback((): AudioContext | null => {
    if (!AC) return null
    if (!ctxRef.current) { try { ctxRef.current = new AC() } catch { return null } }
    return ctxRef.current
  }, [])

  // Synthèse serveur → AudioBuffer décodé (mis en cache). null si indispo.
  const load = useCallback((text: string): Promise<AudioBuffer | null> => {
    const has = buffers.current.get(text); if (has) return Promise.resolve(has)
    const inflight = pending.current.get(text); if (inflight) return inflight
    const c = ctx()
    const p = (async (): Promise<AudioBuffer | null> => {
      if (!c || serverOk.current === false) return null
      try {
        const res = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, style: 'energique', language: langCode }) })
        if (!res.ok) { serverOk.current = false; return null }
        serverOk.current = true
        const buf = await c.decodeAudioData(await res.arrayBuffer())
        buffers.current.set(text, buf)
        return buf
      } catch { serverOk.current = false; return null }
      finally { pending.current.delete(text) }
    })()
    pending.current.set(text, p)
    return p
  }, [ctx, langCode])

  const speakBrowser = useCallback((text: string) => {
    try {
      const s = window.speechSynthesis; if (!s) return
      const u = new SpeechSynthesisUtterance(text)
      u.lang = langCode; u.rate = 1.06; u.volume = 1
      s.speak(u)
    } catch { /* ignore */ }
  }, [langCode])

  const playBuffer = useCallback((buf: AudioBuffer) => {
    const c = ctx(); if (!c) return
    try { const src = c.createBufferSource(); src.buffer = buf; src.connect(c.destination); src.start() } catch { /* ignore */ }
  }, [ctx])

  const speak = useCallback((text: string) => {
    if (mutedRef.current) return
    const cached = buffers.current.get(text)
    if (cached) { playBuffer(cached); return }
    if (serverOk.current === false) { speakBrowser(text); return }
    void load(text).then(buf => { if (mutedRef.current) return; buf ? playBuffer(buf) : speakBrowser(text) })
  }, [load, playBuffer, speakBrowser, mutedRef])

  // Lecture d'un buffer avec résolution à la FIN (onended).
  const playBufferAwait = useCallback((buf: AudioBuffer): Promise<void> => new Promise(resolve => {
    const c = ctx(); if (!c) { resolve(); return }
    try {
      const src = c.createBufferSource(); src.buffer = buf; src.connect(c.destination)
      src.onended = () => resolve()
      src.start()
      // filet de sécurité : résout au plus tard à la durée du buffer + 250 ms
      setTimeout(() => resolve(), buf.duration * 1000 + 250)
    } catch { resolve() }
  }), [ctx])

  const speakBrowserAwait = useCallback((text: string): Promise<void> => new Promise(resolve => {
    try {
      const s = window.speechSynthesis; if (!s) { resolve(); return }
      const u = new SpeechSynthesisUtterance(text)
      u.lang = langCode; u.rate = 1.06; u.volume = 1
      u.onend = () => resolve(); u.onerror = () => resolve()
      s.speak(u)
      setTimeout(() => resolve(), 4500) // filet de sécurité si onend ne se déclenche pas
    } catch { resolve() }
  }), [langCode])

  // Joue le texte et résout quand la lecture est terminée (voix serveur ou navigateur).
  const speakAwait = useCallback(async (text: string): Promise<void> => {
    if (mutedRef.current) return
    const cached = buffers.current.get(text)
    if (cached) { await playBufferAwait(cached); return }
    if (serverOk.current === false) { await speakBrowserAwait(text); return }
    const buf = await load(text)
    if (mutedRef.current) return
    if (buf) await playBufferAwait(buf); else await speakBrowserAwait(text)
  }, [load, playBufferAwait, speakBrowserAwait, mutedRef])

  const prefetch = useCallback((text: string) => { void load(text) }, [load])

  // Bip synthétique (oscillateur) — instantané, indépendant du réseau.
  const beep = useCallback((freq = 880, ms = 120) => {
    if (mutedRef.current) return
    const c = ctx(); if (!c) return
    try {
      const osc = c.createOscillator(), g = c.createGain()
      osc.type = 'sine'; osc.frequency.value = freq
      const t0 = c.currentTime
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.012)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000)
      osc.connect(g); g.connect(c.destination)
      osc.start(t0); osc.stop(t0 + ms / 1000 + 0.02)
    } catch { /* ignore */ }
  }, [ctx, mutedRef])

  const unlock = useCallback(() => {
    const c = ctx()
    if (c && c.state === 'suspended') void c.resume()
    // Pré-charge les phrases fixes du décompte pour un calage instantané.
    const [w1, w2, w3] = countWords(lang)
    const fixed = [w1, w2, w3, 'GO', 'STOP', lang === 'en' ? 'Half' : 'Moitié']
    fixed.forEach(t => void load(t))
  }, [ctx, load, lang])

  return { unlock, speak, speakAwait, prefetch, beep }
}
