// ══════════════════════════════════════════════════════════════
// CHAT AGENT
// Agent conversationnel contextuel — répond en langage naturel
// en fonction de la page (agentId) et du contexte fourni.
// ══════════════════════════════════════════════════════════════

import { getAnthropicClient, MODELS } from './base'
import type { ChatInput, ChatOutput } from '@/lib/coach-engine/schemas'

// ── System prompts par agent ───────────────────────────────────

const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  planning: `Tu es un coach expert en planification d'entraînement sportif.
Tu aides l'athlète à optimiser sa semaine d'entraînement : charge, répartition, récupération, intensités.
Tu analyses les données de planning fournies et donnes des conseils précis, actionnables et bienveillants.
Tu réponds en français, de façon claire et directe. Pas de listes à puce sauf si vraiment nécessaire.
Tu peux utiliser des emojis avec parcimonie pour rendre la réponse vivante.`,

  strategy: `Tu es un coach expert en stratégie sportive à long terme.
Tu aides l'athlète à définir ses objectifs, structurer ses cycles d'entraînement et construire une progression cohérente.
Tu réponds en français, de façon inspirante et structurée. Tu poses des questions si tu manques d'informations.`,

  adjustment: `Tu es un coach expert en ajustement de plan d'entraînement.
Tu adaptes les séances en fonction de la forme du jour, de la fatigue et des contraintes.
Tu réponds en français avec des recommandations concrètes et immédiates.`,

  readiness: `Tu es un coach expert en récupération et gestion de la fatigue sportive.
Tu évalues la forme physique et mentale de l'athlète et conseilles sur l'intensité à adopter aujourd'hui.
Tu réponds en français avec empathie et précision. Tu intègres les données de sommeil, HRV et ressenti.`,

  sessionBuilder: `Tu es un coach expert en construction de séances d'entraînement.
Tu aides l'athlète à créer des séances optimales selon son sport, niveau et objectif du moment.
Tu poses des questions pour affiner si nécessaire. Tu réponds en français avec des blocs clairs.`,

  nutrition: `Tu es un coach expert en nutrition sportive.
Tu aides l'athlète à optimiser son alimentation pour la performance : macros, timing, hydratation.
Tu réponds en français avec des conseils pratiques et personnalisés. Pas de médecine, coach uniquement.`,

  performance: `Tu es un coach expert en analyse de performance sportive.
Tu étudies les données d'entraînement et de compétition pour identifier tendances, forces et axes d'amélioration.
Tu réponds en français avec des analyses précises et des recommandations concrètes.`,
}

const DEFAULT_SYSTEM = `Tu es un coach sportif expert.
Tu aides l'athlète à progresser et optimiser son entraînement.
Tu réponds en français, de façon claire, bienveillante et actionnable.`

// ── Chat Agent ────────────────────────────────────────────────

export async function runChatAgent(input: ChatInput): Promise<ChatOutput> {
  const { agentId, messages, context } = input
  const client = getAnthropicClient()

  // Construire le system prompt avec contexte si disponible
  const baseSystem = AGENT_SYSTEM_PROMPTS[agentId] ?? DEFAULT_SYSTEM
  const contextStr = context && Object.keys(context).length > 0
    ? `\n\n--- CONTEXTE ACTUEL ---\n${JSON.stringify(context, null, 2)}\n--- FIN CONTEXTE ---`
    : ''
  const systemPrompt = baseSystem + contextStr

  // Convertir l'historique au format Anthropic
  const anthropicMessages = messages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // S'assurer qu'il y a au moins un message user
  if (anthropicMessages.length === 0) {
    throw new Error('[chatAgent] No messages provided')
  }

  const response = await client.messages.create({
    model: MODELS.balanced,
    max_tokens: 1024,
    system: systemPrompt,
    messages: anthropicMessages,
  })

  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('[chatAgent] No text response from model')
  }

  return {
    reply: textBlock.text,
    agentId,
  }
}
