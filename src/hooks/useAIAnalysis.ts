import { useState, useCallback } from 'react'

export type AIStatus = 'idle' | 'loading' | 'streaming' | 'done' | 'error'

export function useAIAnalysis() {
  const [status, setStatus] = useState<AIStatus>('idle')
  const [text,   setText]   = useState('')

  const run = useCallback(async (systemPrompt: string, userMessage = '') => {
    setStatus('loading')
    setText('')

    // Vérification avant envoi
    console.log('[AI Debug] userMessage:', userMessage)
    console.log('[AI Debug] systemPrompt:', systemPrompt)

    // Si userMessage vide, le prompt complet est dans systemPrompt → l'utiliser comme message
    const effectiveMsg = userMessage.trim() || systemPrompt.trim()
    if (!effectiveMsg) {
      console.error('[AI] Message vide — vérifier les variables activity')
      setStatus('error')
      return
    }

    try {
      const res = await fetch('/api/ai-analysis', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          systemPrompt: userMessage.trim() ? systemPrompt : '',
          userMessage:  effectiveMsg,
        }),
      })
      if (!res.ok || !res.body) { setStatus('error'); return }

      setStatus('streaming')
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setText(prev => prev + decoder.decode(value, { stream: true }))
      }
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }, [])

  const reset = useCallback(() => { setStatus('idle'); setText('') }, [])

  return { text, status, run, reset }
}
