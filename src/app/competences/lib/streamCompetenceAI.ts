// Util client : appelle /api/competences-ai et stream le texte token par token.

export interface AIChatMsg { role: 'user' | 'assistant'; content: string }

export async function streamCompetenceAI(
  system: string,
  messages: AIChatMsg[],
  onToken: (full: string) => void,
): Promise<string> {
  const res = await fetch('/api/competences-ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages }),
  })
  if (!res.ok || !res.body) {
    const err = await res.text().catch(() => '')
    throw new Error(err || `Erreur API (${res.status})`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data) as { text?: string }
        if (typeof parsed.text === 'string') {
          full += parsed.text
          onToken(full)
        }
      } catch { /* ignore non-JSON */ }
    }
  }
  return full
}
