// ══════════════════════════════════════════════════════════════
// API — /api/recharge-stream
// Endpoint dédié au plan de recharge glucidique.
//
// Utilise le VRAI streaming Anthropic (contrairement à /api/coach-stream
// qui attend la réponse complète avant d'émettre quoi que ce soit).
// Sans tool_use → pas de risque d'interruption de JSON partiel.
//
// maxDuration = 300s pour Vercel Pro (plans longs = 5-8k tokens)
// ══════════════════════════════════════════════════════════════

export const runtime     = 'nodejs'
export const maxDuration = 300

import { NextRequest } from 'next/server'
import { getAnthropicClient } from '@/lib/agents/base'
import { createClient } from '@/lib/supabase/server'
import { enforceQuota } from '@/lib/subscriptions/quota-middleware'
import { getUserTier, logUsage } from '@/lib/subscriptions/check-quota'
import { TIER_LIMITS, MODEL_IDS, MODEL_MAX_TOKENS } from '@/lib/subscriptions/tier-limits'

export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────
  let userId: string
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401 })
    userId = user.id
  } catch {
    return new Response(JSON.stringify({ error: 'Erreur d\'authentification' }), { status: 401 })
  }

  // ── Quota ─────────────────────────────────────────────────────
  const check = await enforceQuota(userId, 'message')
  if (!check.allowed) return check.response

  // ── Body ──────────────────────────────────────────────────────
  let body: { prompt: string }
  try {
    body = await req.json() as { prompt: string }
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }
  if (!body.prompt) return new Response('Missing prompt', { status: 400 })

  // ── Modèle selon le tier ──────────────────────────────────────
  const tier      = await getUserTier(userId)
  const tierModel = TIER_LIMITS[tier].model
  const model     = MODEL_IDS[tierModel]
  const maxTokens = Math.max(MODEL_MAX_TOKENS[tierModel], 8192)

  const client = getAnthropicClient()

  // ── Streaming Anthropic → plain text ─────────────────────────
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = await client.messages.create({
          model,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: body.prompt }],
          stream: true,
        })

        let inputTokens  = 0
        let outputTokens = 0

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text))
          }
          if (event.type === 'message_start') {
            inputTokens = event.message.usage.input_tokens
          }
          if (event.type === 'message_delta') {
            outputTokens = event.usage.output_tokens
          }
        }

        // Log usage (fire-and-forget)
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
