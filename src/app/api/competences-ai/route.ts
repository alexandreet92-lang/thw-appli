// ══════════════════════════════════════════════════════════════
// API — /api/competences-ai
// Streaming SSE générique pour la fonctionnalité Compétences :
// accepte un system prompt arbitraire + messages, stream le texte.
// Utilisé pour : créer une compétence et remodeler un prompt.
// ══════════════════════════════════════════════════════════════

export const runtime     = 'nodejs'
export const maxDuration = 60

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserTier, logUsage } from '@/lib/subscriptions/check-quota'
import { TIER_LIMITS, MODEL_IDS } from '@/lib/subscriptions/tier-limits'

interface ChatMsg { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  // ── Auth ──
  let userId: string
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401 })
    userId = user.id
  } catch {
    return new Response(JSON.stringify({ error: 'Erreur d\'authentification' }), { status: 401 })
  }

  // ── Body ──
  let body: { system?: string; messages?: ChatMsg[] }
  try {
    body = await req.json() as { system?: string; messages?: ChatMsg[] }
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }
  const system   = (body.system ?? '').trim()
  const messages = (body.messages ?? []).filter(m => m && typeof m.content === 'string' && m.content.trim())
  if (!system || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'system et messages requis' }), { status: 400 })
  }

  // ── Modèle selon le tier ──
  const tier      = await getUserTier(userId)
  const tierModel = TIER_LIMITS[tier].model
  const model     = MODEL_IDS[tierModel]

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      stream: true,
      system,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  })

  if (!anthropicRes.ok) {
    const errorText = await anthropicRes.text()
    console.error('[competences-ai] error:', anthropicRes.status, errorText)
    return new Response(JSON.stringify({ error: `API error: ${anthropicRes.status}` }), { status: anthropicRes.status })
  }

  const encoder = new TextEncoder()
  let inputTokens = 0, outputTokens = 0

  const stream = new ReadableStream({
    async start(controller) {
      const reader = anthropicRes.body?.getReader()
      if (!reader) { controller.close(); return }
      const decoder = new TextDecoder()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data) as Record<string, unknown>
              if (parsed.type === 'content_block_delta') {
                const delta = parsed.delta as Record<string, unknown> | undefined
                if (typeof delta?.text === 'string') {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: delta.text })}\n\n`))
                }
              } else if (parsed.type === 'message_start') {
                const msg = parsed.message as Record<string, unknown> | undefined
                const usage = msg?.usage as Record<string, unknown> | undefined
                inputTokens = (usage?.input_tokens as number) ?? 0
              } else if (parsed.type === 'message_delta') {
                const usage = parsed.usage as Record<string, unknown> | undefined
                outputTokens = (usage?.output_tokens as number) ?? 0
              }
            } catch { /* non-JSON SSE line */ }
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (e) {
        console.error('[competences-ai] stream error:', e)
      } finally {
        controller.close()
        void logUsage(userId, 'message', { model, stop_reason: 'end_turn', input_tokens: inputTokens, output_tokens: outputTokens })
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
