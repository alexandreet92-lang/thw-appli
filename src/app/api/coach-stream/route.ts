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
Si la demande est ambiguë (quelle semaine ? quel jour ?), pose une question de clarification AVANT d'appeler le tool.

RÈGLE CRITIQUE — CHOIX DU BON TOOL :
- Si une semaine est marquée "⚠️ AUCUNE SÉANCE — semaine vide" → utilise OBLIGATOIREMENT add_week pour créer cette semaine.
- Si une séance a déjà un id: → utilise update_session pour la modifier ou move_session pour la déplacer.
- Ne jamais appeler update_session sur une séance qui n'existe pas (pas d'id). Ce serait une erreur.

Tu es un coach expert — TU DÉCIDES du contenu des séances. L'athlète n'a pas à te les dicter.
Quand il te demande "crée une semaine de deload" ou "ajoute une semaine de récup", tu génères toi-même les séances adaptées
en analysant le contexte : sport(s) du plan, semaines précédentes, objectif, bloc de périodisation.

DIRECTIVES POUR UNE SEMAINE DE DELOAD (avant compétition ou fin de bloc) :
- Réduis le volume de 40–50 % par rapport à la semaine précédente
- Garde 1–2 séances avec de courtes touches d'intensité pour maintenir les sensations (ex: 4×3min Z4 au lieu de 10×3min)
- Inclus 1 jour de repos complet la veille ou l'avant-veille de la compétition
- Adapte les sports selon le plan : triathlon → nage + vélo + run ; running → run easy + un fartlek court
- Durées typiques deload : 30–45min au lieu de 60–90min
- Utilise intensity: "low" ou "moderate" pour les séances deload, jamais "high" ou "max"`

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
      // IMPORTANT : la valeur data ne doit JAMAIS contenir de \n brut (casse le format SSE).
      // Pour le texte, on JSON-encode le chunk → le frontend JSON.parse côté client.
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
              console.log('[coach-stream] tool_use block started:', block.name, '(index:', event.index, ')')
            }
          }

          // ── Delta d'un content block ─────────────────────────
          if (event.type === 'content_block_delta') {
            if (event.delta.type === 'text_delta') {
              // Chunk texte → JSON.stringify pour éviter les \n bruts dans la ligne data SSE
              send('text', JSON.stringify(event.delta.text))
            } else if (event.delta.type === 'input_json_delta') {
              // JSON partiel d'un tool_use → accumulation
              const pending = pendingToolUse[event.index]
              if (pending !== undefined) {
                // partial_json est toujours une string, mais on sécurise au cas où
                pending.json += (event.delta.partial_json ?? '')
              }
            }
          }

          // ── Fin d'un content block ───────────────────────────
          if (event.type === 'content_block_stop') {
            const pending = pendingToolUse[event.index]
            if (pending !== undefined) {
              // Le bloc tool_use est complet → on le parse et on l'émet
              console.log('[coach-stream] content_block_stop for tool', pending.name,
                '— JSON length:', pending.json.length,
                '— preview:', pending.json.slice(0, 120))
              try {
                const toolInput = JSON.parse(pending.json || '{}')
                const ssePayload = JSON.stringify({
                  tool_name: pending.name,
                  tool_input: toolInput,
                })
                console.log('[coach-stream] emitting tool_use SSE:', ssePayload.slice(0, 200))
                send('tool_use', ssePayload)
              } catch (err) {
                // JSON mal formé — log l'erreur pour diagnostic, on n'émet rien
                console.error('[coach-stream] JSON parse error for tool', pending.name, ':', err)
                console.error('[coach-stream] accumulated JSON (full):', pending.json)
              }
              delete pendingToolUse[event.index]
            }
          }
        }
      } catch (err) {
        console.error('[coach-stream] stream error:', err)
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
