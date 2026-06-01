'use client'

// ══════════════════════════════════════════════════════════════
// useSpeechToText — dictée vocale temps réel (Web Speech API).
// Transcription mot par mot (interim + final) façon Claude.ai.
// Typé sans `any`. Se désactive silencieusement si non supporté.
// ══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react'

// ── Types minimaux de la Web Speech API (non fournis par TS DOM) ──
interface SpeechAlternativeLike { readonly transcript: string }
interface SpeechResultLike {
  readonly isFinal: boolean
  readonly length: number
  readonly [index: number]: SpeechAlternativeLike
}
interface SpeechResultListLike {
  readonly length: number
  readonly [index: number]: SpeechResultLike
}
interface SpeechRecognitionEventLike {
  readonly resultIndex: number
  readonly results: SpeechResultListLike
}
interface SpeechRecognitionErrorLike { readonly error: string }
interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: SpeechRecognitionErrorLike) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function useSpeechToText(onTranscript: (text: string) => void) {
  const [supported, setSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const finalRef = useRef('')
  const cbRef = useRef(onTranscript)
  cbRef.current = onTranscript

  useEffect(() => { setSupported(getCtor() !== null) }, [])

  const start = useCallback(() => {
    const Ctor = getCtor()
    if (!Ctor) return
    const rec = new Ctor()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'fr-FR'
    finalRef.current = ''
    rec.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i]
        const transcript = res[0]?.transcript ?? ''
        if (res.isFinal) finalRef.current += transcript + ' '
        else interim += transcript
      }
      cbRef.current((finalRef.current + interim).trimStart())
    }
    rec.onerror = () => setIsListening(false)
    rec.onend = () => setIsListening(false)
    recRef.current = rec
    try {
      rec.start()
      setIsListening(true)
    } catch {
      setIsListening(false)
    }
  }, [])

  const stop = useCallback(() => {
    recRef.current?.stop()
    setIsListening(false)
  }, [])

  const toggle = useCallback(() => {
    if (isListening) stop()
    else start()
  }, [isListening, start, stop])

  // Cleanup au démontage
  useEffect(() => () => { recRef.current?.stop() }, [])

  return { supported, isListening, toggle, start, stop }
}
