// ══════════════════════════════════════════════════════════════
// BILLING IA — conversion « usage API » → tokens débités du portefeuille.
//
// Toute route qui appelle un modèle DOIT passer par ici, sinon la
// consommation est invisible (ni quota, ni cockpit admin, ni facture).
//
// Règle de comptage (identique à coach-stream) :
//   input + cache_creation + 10 % du cache_read + output
// Le cache_read est facturé 10 % par Anthropic → on le pondère pareil.
// ══════════════════════════════════════════════════════════════

import { recordTokenUsage } from '@/lib/tokens/limits'

export type AiModelKey = 'hermes' | 'athena' | 'zeus'

/** Usage renvoyé par l'API Anthropic (champs cache optionnels). */
export interface AnthropicUsage {
  input_tokens?: number | null
  output_tokens?: number | null
  cache_creation_input_tokens?: number | null
  cache_read_input_tokens?: number | null
}

/** Identifiant de modèle Anthropic → clé interne (multiplicateur). */
export function modelKeyFromId(modelId: string): AiModelKey {
  const n = modelId.toLowerCase()
  if (n.includes('haiku') || n.includes('hermes')) return 'hermes'
  if (n.includes('opus') || n.includes('zeus')) return 'zeus'
  return 'athena'
}

/** Tokens réels facturables d'un appel (avant multiplicateur de modèle). */
export function countBillableTokens(usage: AnthropicUsage | null | undefined): number {
  if (!usage) return 0
  return (usage.input_tokens ?? 0)
    + (usage.cache_creation_input_tokens ?? 0)
    + Math.ceil((usage.cache_read_input_tokens ?? 0) * 0.1)
    + (usage.output_tokens ?? 0)
}

/**
 * Débite le portefeuille de l'utilisateur pour un appel modèle.
 * Best-effort : n'échoue jamais, ne bloque pas la réponse.
 */
export function billAnthropicUsage(
  userId: string,
  usage: AnthropicUsage | null | undefined,
  model: AiModelKey,
): void {
  const tokens = countBillableTokens(usage)
  if (tokens <= 0) return
  void recordTokenUsage(userId, tokens, { model })
}

// ── Outil web_search (Anthropic) ───────────────────────────────
// Facturé 10 $ / 1 000 recherches, EN PLUS des tokens. Un briefing Pro/Expert
// peut lancer jusqu'à 20 recherches (0,20 $) — invisible si on ne compte que
// les tokens. Conversion : 0,01 $/recherche ÷ 1 $/M tokens = 10 000 tokens.
export const TOKENS_PER_WEB_SEARCH = 10_000

/** Usage étendu renvoyé quand des outils serveur ont tourné. */
export interface ServerToolUsage {
  server_tool_use?: { web_search_requests?: number | null } | null
}

/** Débite les recherches web effectuées pendant un appel. */
export function billWebSearches(userId: string, usage: ServerToolUsage | null | undefined): void {
  const n = usage?.server_tool_use?.web_search_requests ?? 0
  if (n <= 0) return
  void recordTokenUsage(userId, n * TOKENS_PER_WEB_SEARCH, { model: 'hermes' })
}

// ── Audio (OpenAI) ─────────────────────────────────────────────
// La voix ne consomme pas de tokens Anthropic mais coûte de l'argent réel.
// On la convertit en « tokens équivalents » pour qu'elle passe par le MÊME
// portefeuille : un abonné ne peut plus générer de la voix à l'infini.
//
// Référence de prix (sept. 2026) :
//   · gpt-4o-mini-tts        ≈ 0,015 $/min d'audio généré
//   · gpt-4o-mini-transcribe ≈ 0,003 $/min d'audio transcrit
// Référence portefeuille : 1 M tokens pondérés ≈ 1 $ (entrée).
//   → TTS : 0,015 $/min ÷ ~850 caractères/min = 18 tokens / caractère
//   → STT : 0,003 $/min ÷ 60                  = 50 tokens / seconde
export const TTS_TOKENS_PER_CHAR = 18
export const STT_TOKENS_PER_SECOND = 50

/** Estimation de durée d'un fichier audio à partir de sa taille (webm/opus ≈ 2,5 ko/s). */
export function estimateAudioSeconds(bytes: number): number {
  return Math.max(1, Math.round(bytes / 2500))
}

/** Débite la synthèse vocale (nombre de caractères envoyés au TTS). */
export function billTtsUsage(userId: string, chars: number): void {
  if (chars <= 0) return
  void recordTokenUsage(userId, chars * TTS_TOKENS_PER_CHAR, { model: 'hermes' })
}

/** Débite la transcription (durée estimée de l'audio, en secondes). */
export function billSttUsage(userId: string, seconds: number): void {
  if (seconds <= 0) return
  void recordTokenUsage(userId, Math.ceil(seconds) * STT_TOKENS_PER_SECOND, { model: 'hermes' })
}
