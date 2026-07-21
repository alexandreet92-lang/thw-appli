// ══════════════════════════════════════════════════════════════
// Coach « sans écran » (headless) — exécute le coach central de façon
// autonome (hors interface, pour les ROUTINES planifiées) et renvoie le
// texte final. Réutilise les mêmes outils que le chat (lecture + mémoire
// + écriture optionnelle) mais SANS streaming ni hand-off UI : les outils
// d'action de l'interface ne sont pas disponibles ici.
//
// N'altère PAS /api/coach-stream (chat interactif critique).
// ══════════════════════════════════════════════════════════════

import type Anthropic from '@anthropic-ai/sdk'
import { getAnthropicClient, MODELS } from '@/lib/agents/base'
import { createServiceClient } from '@/lib/supabase/server'
import { readTools, READ_TOOL_NAMES, resolveReadTool } from '@/lib/coach/read-tools'
import { memoryTools, MEMORY_TOOL_NAMES, resolveMemoryTool, buildStructuredMemory } from '@/lib/coach/memory-tools'
import { writeTools, WRITE_TOOL_NAMES, resolveWriteTool } from '@/lib/coach/write-tools'
import { getActiveCompetencesPrompt } from '@/lib/ai/competences'
import { buildAthleteContext } from '@/lib/coach/athlete-context'
import { recordTokenUsage } from '@/lib/tokens/limits'
import { buildTrainingAgentInstruction, DEFAULT_TRAINING_SETTINGS } from '@/lib/ai/agent-settings'

const MODEL_BY_KEY: Record<string, string> = {
  hermes: MODELS.fast,
  athena: MODELS.balanced,
  zeus:   MODELS.powerful,
}

const MAX_STEPS = 6

export async function runCoachHeadless(opts: {
  userId: string
  prompt: string
  model?: string          // 'hermes' | 'athena' | 'zeus'
  allowWrite?: boolean     // garde-fou : autoriser les outils d'écriture
  tier?: string
}): Promise<{ text: string; error?: string }> {
  const { userId, prompt } = opts
  const modelKey = opts.model ?? 'athena'
  const model = MODEL_BY_KEY[modelKey] ?? MODELS.balanced
  const allowWrite = opts.allowWrite ?? false
  const tier = opts.tier ?? 'premium'
  const sb = createServiceClient()

  // ── Système : préambule routine + contexte réel de l'athlète ──
  let system = `Tu es le coach IA de THW Coaching (coaching sportif hybride endurance + force). Tu exécutes une ROUTINE AUTOMATISÉE définie par l'athlète : accomplis la tâche demandée de façon AUTONOME et complète, en te basant UNIQUEMENT sur ses données réelles (injectées ci-dessous et accessibles via tes outils de lecture). Écris en français, clair et actionnable. Ta réponse sera lue dans une notification puis une conversation — va à l'essentiel, structure si utile. N'invente jamais de données ; si une donnée manque, dis-le brièvement.`
  if (!allowWrite) {
    system += `\n\nIMPORTANT : cette routine est en LECTURE SEULE. Tu ne dois RIEN modifier dans l'app (pas de création/suppression de plan, séance, etc.). Contente-toi d'analyser, résumer et conseiller.`
  }
  try {
    const [comp, athlete, mem] = await Promise.all([
      getActiveCompetencesPrompt(userId).catch(() => ''),
      buildAthleteContext(sb, userId).catch(() => ''),
      buildStructuredMemory(sb, userId).catch(() => ''),
    ])
    if (comp) system += `\n\n${comp}`
    if (athlete) system += `\n\n${athlete}`
    if (mem) system += `\n\n${mem}`
    try {
      const { data: prof } = await sb.from('profiles').select('ai_agent_training').eq('id', userId).maybeSingle()
      const agentCfg = (prof as { ai_agent_training?: Record<string, unknown> } | null)?.ai_agent_training
      if (agentCfg && typeof agentCfg === 'object') {
        system += `\n\n${buildTrainingAgentInstruction({ ...DEFAULT_TRAINING_SETTINGS, ...(agentCfg as Partial<typeof DEFAULT_TRAINING_SETTINGS>) })}`
      }
    } catch { /* fail-open */ }
  } catch { /* fail-open : la routine tourne même sans contexte */ }

  const tools = allowWrite
    ? [...readTools, ...memoryTools, ...writeTools]
    : [...readTools, ...memoryTools]
  const isServerTool = (n: string) =>
    READ_TOOL_NAMES.has(n) || MEMORY_TOOL_NAMES.has(n) || (allowWrite && WRITE_TOOL_NAMES.has(n))

  const client = getAnthropicClient()
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }]
  let finalText = ''
  let totalTokens = 0

  for (let step = 0; step < MAX_STEPS; step++) {
    let resp: Anthropic.Message
    try {
      resp = await client.messages.create({
        model,
        max_tokens: 4000,
        system,
        tools: tools as unknown as Anthropic.ToolUnion[],
        messages,
      })
    } catch (e) {
      return { text: finalText.trim(), error: e instanceof Error ? e.message : 'anthropic_error' }
    }

    totalTokens += (resp.usage?.input_tokens ?? 0) + (resp.usage?.output_tokens ?? 0)

    const textParts = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
    if (textParts.length) finalText += (finalText ? '\n\n' : '') + textParts.join('\n\n')

    if (resp.stop_reason !== 'tool_use') break

    const toolUses = resp.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    messages.push({ role: 'assistant', content: resp.content })

    const results: Anthropic.ToolResultBlockParam[] = []
    for (const tu of toolUses) {
      let out = ''
      if (isServerTool(tu.name)) {
        try {
          const inp = tu.input as Record<string, unknown>
          out = MEMORY_TOOL_NAMES.has(tu.name)
            ? await resolveMemoryTool(tu.name, inp, sb, userId, tier)
            : (allowWrite && WRITE_TOOL_NAMES.has(tu.name))
              ? await resolveWriteTool(tu.name, inp, sb, userId)
              : await resolveReadTool(tu.name, inp, sb, userId)
        } catch (e) {
          out = JSON.stringify({ error: e instanceof Error ? e.message : 'tool_error' })
        }
      } else {
        // Outil d'action réservé à l'interface → indisponible en routine.
        out = JSON.stringify({ note: `Outil « ${tu.name} » indisponible en routine automatique. Résume plutôt le résultat en texte.` })
      }
      results.push({ type: 'tool_result', tool_use_id: tu.id, content: out })
    }
    messages.push({ role: 'user', content: results })
  }

  // Comptabilité tokens (best-effort) — la routine consomme le quota comme un message.
  if (totalTokens > 0) {
    void recordTokenUsage(userId, totalTokens, { model: modelKey })
  }

  return { text: finalText.trim() || 'Routine exécutée (aucune sortie textuelle).' }
}
