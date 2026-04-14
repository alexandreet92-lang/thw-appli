// ══════════════════════════════════════════════════════════════
// AGENTS — BASE
// Client Anthropic partagé + utilitaires communs.
// Ne jamais importer directement côté client (server-only).
// ══════════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk'

// ── Singleton client ──────────────────────────────────────────

let _client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _client
}

// ── Modèles disponibles ───────────────────────────────────────

export const MODELS = {
  fast:     'claude-haiku-3-5-20241022',   // analyse légère, readiness, nutrition
  balanced: 'claude-opus-4-6',             // planification, sessions
  powerful: 'claude-opus-4-6',             // génération de programme
} as const

export type ModelKey = keyof typeof MODELS

// ── parseJsonResponse ─────────────────────────────────────────
// Extrait et parse le JSON depuis la réponse du modèle.
// Gère les blocs ```json … ``` éventuellement insérés.

export function parseJsonResponse<T>(raw: string): T {
  let text = raw.trim()

  // Retirer les blocs markdown code
  const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (mdMatch) text = mdMatch[1].trim()

  // Trouver le premier { ou [
  const start = text.search(/[{[]/)
  if (start > 0) text = text.slice(start)

  return JSON.parse(text) as T
}

// ── callAgent ─────────────────────────────────────────────────
// Appel Anthropic générique : prompt → JSON typé.

export async function callAgent<T>(options: {
  agentName: string
  model?: ModelKey
  maxTokens?: number
  systemPrompt: string
  userPrompt: string
}): Promise<T> {
  const { agentName, model = 'balanced', maxTokens = 1024, systemPrompt, userPrompt } = options
  const client = getAnthropicClient()

  const message = await client.messages.create({
    model: MODELS[model],
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const textBlock = message.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error(`[${agentName}] No text response from model`)
  }

  try {
    return parseJsonResponse<T>(textBlock.text)
  } catch (parseErr) {
    throw new Error(`[${agentName}] JSON parse error: ${parseErr}\nRaw: ${textBlock.text.slice(0, 200)}`)
  }
}

// ── SYSTEM PROMPT commun ──────────────────────────────────────

export const SYSTEM_BASE = `Tu es un coach sportif expert en planification d'entraînement, nutrition et performance.
Tu réponds TOUJOURS et UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, sans commentaires.
Si tu dois fournir du texte, mets-le dans les champs string du JSON.`
