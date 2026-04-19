// ══════════════════════════════════════════════════════════════
// API — /api/coach-stream
// Streaming SSE du chat IA. Retourne les tokens au fur et à mesure.
// ══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server'
import { getAnthropicClient, MODELS } from '@/lib/agents/base'
import { buildChatParams } from '@/lib/agents/chatAgent'
import type { ChatInput } from '@/lib/coach-engine/schemas'

export async function POST(req: NextRequest) {
  let body: ChatInput

  try {
    body = await req.json() as ChatInput
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (!body.messages?.length) {
    return new Response('No messages provided', { status: 400 })
  }

  const { systemPrompt, anthropicMessages } = buildChatParams(body)
  const client = getAnthropicClient()

  const stream = await client.messages.create({
    model: MODELS.fast,
    max_tokens: 1200,
    system: systemPrompt,
    messages: anthropicMessages,
    stream: true,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
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
