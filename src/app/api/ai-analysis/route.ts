export const runtime     = 'nodejs'
export const maxDuration = 300

import { NextRequest } from 'next/server'
import { getAnthropicClient } from '@/lib/agents/base'
import { createClient } from '@/lib/supabase/server'
import { enforceQuota } from '@/lib/subscriptions/quota-middleware'
import { getUserTier, logUsage } from '@/lib/subscriptions/check-quota'
import { TIER_LIMITS, MODEL_IDS, MODEL_MAX_TOKENS } from '@/lib/subscriptions/tier-limits'

export async function POST(req: NextRequest) {
  let userId: string
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401 })
    userId = user.id
  } catch {
    return new Response(JSON.stringify({ error: "Erreur d'authentification" }), { status: 401 })
  }

  const check = await enforceQuota(userId, 'message')
  if (!check.allowed) return check.response

  let body: { systemPrompt?: string; userMessage?: string }
  try {
    body = await req.json() as { systemPrompt?: string; userMessage?: string }
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }
  if (!body.systemPrompt && !body.userMessage) {
    return new Response('Missing prompt', { status: 400 })
  }

  const tier      = await getUserTier(userId)
  const tierModel = TIER_LIMITS[tier].model
  const model     = MODEL_IDS[tierModel]
  const maxTokens = Math.max(MODEL_MAX_TOKENS[tierModel], 4096)

  const client  = getAnthropicClient()
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = await client.messages.create({
          model,
          max_tokens: maxTokens,
          ...(body.systemPrompt ? { system: body.systemPrompt } : {}),
          messages: [{ role: 'user', content: body.userMessage ?? 'Analyse cette séance.' }],
          stream: true,
        })

        let inputTokens  = 0
        let outputTokens = 0

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
          if (event.type === 'message_start') inputTokens  = event.message.usage.input_tokens
          if (event.type === 'message_delta') outputTokens = event.usage.output_tokens
        }

        void logUsage(userId, 'message', {
          model,
          stop_reason: 'end_turn',
          input_tokens:  inputTokens,
          output_tokens: outputTokens,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue'
        controller.enqueue(encoder.encode(`\n\n[Erreur: ${msg}]`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
