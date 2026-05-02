// ══════════════════════════════════════════════════════════════
// API — /api/coach-stream
// Approche hybride : appel Anthropic NON-streaming (await complet),
// puis émission SSE des blocs text + tool_use d'un seul coup.
//
// Pourquoi non-streaming ?
//   Le streaming des input_json_delta pour add_week (JSON volumineux)
//   causait des interruptions de connexion. En mode non-streaming,
//   le JSON du tool_use est garanti complet avant toute émission SSE.
// ══════════════════════════════════════════════════════════════

// Vercel : runtime Node.js requis + maxDuration pour les réponses longues.
export const runtime     = 'nodejs'
export const maxDuration = 60

import { NextRequest } from 'next/server'
import { getAnthropicClient } from '@/lib/agents/base'
import { buildChatParams } from '@/lib/agents/chatAgent'
import type { ChatInput } from '@/lib/coach-engine/schemas'
import { coachTools } from '@/lib/coach/tools-definition'
import { createClient } from '@/lib/supabase/server'
import { enforceQuota } from '@/lib/subscriptions/quota-middleware'
import { getUserTier, logUsage } from '@/lib/subscriptions/check-quota'
import { TIER_LIMITS, MODEL_IDS, MODEL_MAX_TOKENS } from '@/lib/subscriptions/tier-limits'

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

  // ── Quota message ─────────────────────────────────────────────
  const check = await enforceQuota(userId, 'message')
  if (!check.allowed) return check.response

  // ── Sélection du modèle selon le tier ─────────────────────────
  const tier      = await getUserTier(userId)
  const tierModel = TIER_LIMITS[tier].model          // 'hermes' | 'athena' | 'zeus'
  const model     = MODEL_IDS[tierModel]             // Anthropic model ID
  const maxTokens = MODEL_MAX_TOKENS[tierModel]      // 4096 ou 8192 pour Zeus

  console.log(`[coach-stream] tier=${tier} model=${tierModel} → ${model} max_tokens=${maxTokens}`)

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

  const systemWithTools = `${systemPrompt}\n\n${TOOL_INSTRUCTIONS}`

  // ── Appel Anthropic NON-streaming ─────────────────────────────
  // On attend la réponse complète avant d'émettre quoi que ce soit.
  // Avantages : JSON tool_use garanti complet, pas d'accumulation de deltas,
  //             pas de keepalive, pas de problème d'index.
  // Inconvénient : le texte n'apparaît plus progressivement (acceptable).
  //
  // Le modèle et les max_tokens viennent du tier de l'utilisateur :
  //   premium → hermes (Haiku)  → 4096 tokens
  //   pro     → athena (Sonnet) → 4096 tokens
  //   expert  → zeus   (Sonnet) → 8192 tokens
  const effectiveMaxTokens = maxTokens

  const response = await client.messages.create({
    model,
    max_tokens: effectiveMaxTokens,
    system: systemWithTools,
    messages: anthropicMessages,
    tools: coachTools,
    tool_choice: { type: 'auto' },
  })

  console.log('[coach-stream] response received — stop_reason:', response.stop_reason,
    '— blocks:', response.content.length,
    '— usage:', response.usage)

  const encoder = new TextEncoder()

  // ── Émission SSE des blocs ────────────────────────────────────
  // Format : "event: <type>\ndata: <payload>\n\n"
  // Les valeurs data sont JSON-encodées pour éviter les \n bruts.
  const readable = new ReadableStream({
    start(controller) {
      const send = (eventType: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${eventType}\ndata: ${data}\n\n`))
      }

      for (const block of response.content) {
        if (block.type === 'text') {
          // Texte → JSON.stringify pour éviter les \n bruts dans la ligne data SSE
          send('text', JSON.stringify(block.text))
        } else if (block.type === 'tool_use') {
          console.log('[coach-stream] emitting tool_use SSE:', block.name,
            '— input keys:', Object.keys(block.input as Record<string, unknown>))
          send('tool_use', JSON.stringify({
            tool_name: block.name,
            tool_input: block.input,
          }))
        }
      }

      controller.close()
    },
  })

  // ── Log usage message (fire-and-forget) ─────────────────────
  void logUsage(userId, 'message', {
    model,
    stop_reason: response.stop_reason,
    input_tokens:  response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
