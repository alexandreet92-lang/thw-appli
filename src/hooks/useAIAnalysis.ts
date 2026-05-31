import { useState, useCallback } from 'react'

export type AIStatus = 'idle' | 'loading' | 'streaming' | 'done' | 'error'

export function useAIAnalysis() {
  const [status, setStatus] = useState<AIStatus>('idle')
  const [text,   setText]   = useState('')

  const run = useCallback(async (systemPrompt: string, userMessage = '') => {
    setStatus('loading')
    setText('')
    try {
      const res = await fetch('/api/ai-analysis', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ systemPrompt, userMessage }),
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
