'use client'
import { useState, useRef, useCallback } from 'react'

// ── Types minimaux Web Speech API (non standards TS) ───────────
interface SpeechRecognitionAlternative { transcript: string; confidence: number }
interface SpeechRecognitionResult { 0: SpeechRecognitionAlternative; length: number; isFinal: boolean }
interface SpeechRecognitionResultList { 0: SpeechRecognitionResult; length: number; item(i: number): SpeechRecognitionResult }
interface SpeechRecognitionEvent extends Event { results: SpeechRecognitionResultList }
interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((e: Event) => void) | null
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  start: () => void
  stop: () => void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance

interface WindowWithSR extends Window {
  SpeechRecognition?: SpeechRecognitionCtor
  webkitSpeechRecognition?: SpeechRecognitionCtor
}

/**
 * Reconnaissance vocale via Web Speech API.
 * Le texte reconnu (final, fr-FR) est passé au callback `onResult`.
 */
export function useVoiceInput(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return
    const w = window as WindowWithSR
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!Ctor) {
      alert('Reconnaissance vocale non supportée sur ce navigateur.')
      return
    }
    const recognition = new Ctor()
    recognition.lang = 'fr-FR'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript
      onResult(transcript)
    }
    recognitionRef.current = recognition
    recognition.start()
  }, [onResult])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  return { isListening, startListening, stopListening }
}

export default useVoiceInput
