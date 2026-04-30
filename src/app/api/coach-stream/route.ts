// ══════════════════════════════════════════════════════════════
// API — /api/coach-stream
// Streaming SSE du chat IA. Retourne les tokens au fur et à mesure.
// Supporte le tool use : les blocs tool_use sont émis comme événements
// SSE distincts (event: tool_use) séparément des chunks texte (event: text).
// ══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server'
import { getAnthropicClient } from '@/lib/agents/base'
import { buildChatParams, getModelConfig } from '@/lib/agents/chatAgent'
import type { ChatInput } from '@/lib/coach-engine/schemas'
import { coachTools } from '@/lib/coach/tools-definition'

// ── Instructions tool use — ajoutées à la fin de tous les system prompts ──

const TOOL_INSTRUCTIONS = `
Tu as accès à des outils pour modifier directement le plan d'entraînement de l'athlète.
Quand l'athlète te demande d'ajouter, modifier, supprimer ou déplacer une séance, ou de modifier la périodisation, utilise le tool approprié.
Ne dis JAMAIS à l'athlète de faire les modifications lui-même — tu as les outils pour le faire.
Avant d'appeler un tool, explique brièvement ce que tu vas faire. Exemple : "Je vais ajouter une séance de natation mardi S3."
Si la demande est ambiguë (quelle semaine ? quel jour ?), pose une question de clarification AVANT d'appeler le tool.`

// ── Route handler ─────────────────────────────────────────────

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
  const { model, maxTokens } = getModelConfig(body.modelId)
  const client = getAnthropicClient()

  // Append tool instructions to the existing system prompt (ne remplace pas)
  const systemWithTools = `${systemPrompt}\n\n${TOOL_INSTRUCTIONS}`

  const stream = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemWithTools,
    messages: anthropicMessages,
    tools: coachTools,
    tool_choice: { type: 'auto' },
    stream: true,
  })

  const encoder = new TextEncoder()

  // Accumulation des blocs tool_use en cours de streaming
  // Clé = index du content block, valeur = { name, json accumulé }
  const pendingToolUse: Record<number, { name: string; json: string }> = {}

  const readable = new ReadableStream({
    async start(controller) {
      // Helper SSE — format : "event: <type>\ndata: <payload>\n\n"
      const send = (eventType: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${eventType}\ndata: ${data}\n\n`))
      }

      try {
        for await (const event of stream) {

          // ── Début d'un content block ─────────────────────────
          if (event.type === 'content_block_start') {
            const block = event.content_block
            if (block.type === 'tool_use') {
              // Initialise l'accumulation pour ce bloc tool_use
              pendingToolUse[event.index] = { name: block.name, json: '' }
            }
          }

          // ── Delta d'un content block ─────────────────────────
          if (event.type === 'content_block_delta') {
            if (event.delta.type === 'text_delta') {
              // Chunk texte normal → event: text
              send('text', event.delta.text)
            } else if (event.delta.type === 'input_json_delta') {
              // JSON partiel d'un tool_use → accumulation
              const pending = pendingToolUse[event.index]
              if (pending !== undefined) {
                pending.json += event.delta.partial_json
              }
            }
          }

          // ── Fin d'un content block ───────────────────────────
          if (event.type === 'content_block_stop') {
            const pending = pendingToolUse[event.index]
            if (pending !== undefined) {
              // Le bloc tool_use est complet → on le parse et on l'émet
              try {
                const toolInput = JSON.parse(pending.json || '{}')
                send('tool_use', JSON.stringify({
                  tool_name: pending.name,
                  tool_input: toolInput,
                }))
              } catch {
                // JSON mal formé (ne devrait pas arriver) — on ignore silencieusement
              }
              delete pendingToolUse[event.index]
            }
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
