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
  prefetch: (text: string) => void   // pré-charge un texte (ex. prochain exo)
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

  const prefetch = useCallback((text: string) => { void load(text) }, [load])

  const unlock = useCallback(() => {
    const c = ctx()
    if (c && c.state === 'suspended') void c.resume()
    // Pré-charge les phrases fixes du décompte pour un calage instantané.
    const fixed = ['3', '2', '1', 'GO', 'STOP', lang === 'en' ? 'Half' : 'Moitié']
    fixed.forEach(t => void load(t))
  }, [ctx, load, lang])

  return { unlock, speak, prefetch }
}
