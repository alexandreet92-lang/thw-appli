// ══════════════════════════════════════════════════════════════
// MÉMOIRE LONG TERME — le coach retient des FAITS DURABLES sur
// l'athlète d'une conversation à l'autre (préférences, contraintes,
// objectifs, décisions). Deux outils résolus côté serveur dans la
// boucle agentique (comme les read-tools, non terminaux) :
//   • save_memory   → enregistre un fait (plafonné par abonnement)
//   • forget_memory → oublie un fait par correspondance de texte
// + buildStructuredMemory() qui injecte les faits retenus dans le
//   system prompt à chaque conversation.
//
// Toutes les résolutions sont défensives : une erreur renvoie un
// JSON { error }, jamais une exception qui casse le flux.
// ══════════════════════════════════════════════════════════════

import type Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { TIER_LIMITS } from '@/lib/subscriptions/tier-limits'

// Plafond de souvenirs par abonnement. Lecture souple : si la clé
// n'existe pas encore sur un tier, on retombe sur une valeur sûre.
const DEFAULT_MEMORIES_MAX: Record<string, number> = {
  trial: 30, premium: 30, pro: 200, expert: 1000,
}
export function memoriesMaxForTier(tier: string): number {
  const fromTier = (TIER_LIMITS as Record<string, { memories_max?: number }>)[tier]?.memories_max
  return typeof fromTier === 'number' ? fromTier : (DEFAULT_MEMORIES_MAX[tier] ?? 30)
}

const CATEGORIES = ['preference', 'health', 'goal', 'constraint', 'schedule', 'nutrition', 'decision', 'fact'] as const

export const memoryTools: Anthropic.Tool[] = [
  {
    name: 'save_memory',
    description:
      "Enregistre un FAIT DURABLE sur l'athlète, à retenir d'une conversation à l'autre (mémoire long terme). " +
      "À utiliser quand tu apprends quelque chose de stable et réutilisable : une préférence (ex: s'entraîne " +
      "le matin, déteste le seuil continu), une contrainte (ex: pas de sport le mercredi, matériel limité), " +
      "un objectif, une décision méthodologique prise ensemble, un fait de santé récurrent. " +
      "NE PAS enregistrer : des données déjà en base (activités, zones, blessures suivies), des informations " +
      "éphémères, ou un simple message. Formule le souvenir en UNE phrase concise et autoportante. " +
      "Après enregistrement, mentionne-le brièvement en langage naturel (« Je retiens que… »).",
    input_schema: {
      type: 'object',
      properties: {
        content:  { type: 'string', description: 'Le fait à retenir, en une phrase concise et autoportante.' },
        category: { type: 'string', enum: CATEGORIES as unknown as string[], description: 'Catégorie du souvenir.' },
      },
      required: ['content'],
    },
  },
  {
    name: 'forget_memory',
    description:
      "Oublie un ou plusieurs faits durables précédemment enregistrés, quand l'athlète le demande ou qu'un " +
      "fait n'est plus valable. Fournis un extrait de texte : tous les souvenirs qui le contiennent sont supprimés.",
    input_schema: {
      type: 'object',
      properties: {
        match: { type: 'string', description: 'Extrait de texte identifiant le(s) souvenir(s) à oublier.' },
      },
      required: ['match'],
    },
  },
]

export const MEMORY_TOOL_NAMES: ReadonlySet<string> = new Set(memoryTools.map(t => t.name))

// ── Résolution côté serveur (écritures) ───────────────────────
export async function resolveMemoryTool(
  name: string,
  input: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: SupabaseClient<any, any, any>,
  userId: string,
  tier: string,
): Promise<string> {
  try {
    switch (name) {
      case 'save_memory': {
        const content = typeof input.content === 'string' ? input.content.trim() : ''
        if (!content) return JSON.stringify({ saved: false, error: 'Contenu vide.' })
        const category = typeof input.category === 'string' ? input.category.trim() : null

        // Dédup : ne pas ré-enregistrer un fait quasi identique déjà présent.
        const { data: existing } = await sb.from('coach_memories')
          .select('id,content')
          .eq('user_id', userId)
        const rows = (existing ?? []) as Array<{ id: string; content: string }>
        const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
        if (rows.some(r => norm(r.content) === norm(content))) {
          return JSON.stringify({ saved: true, duplicate: true, note: 'Déjà en mémoire.' })
        }

        // Plafond par abonnement.
        const max = memoriesMaxForTier(tier)
        if (rows.length >= max) {
          return JSON.stringify({
            saved: false, reason: 'limit', limit: max, tier,
            note: `Mémoire pleine pour l'abonnement ${tier} (${max} souvenirs). Propose à l'athlète d'oublier un fait obsolète (forget_memory) ou de passer à un abonnement supérieur.`,
          })
        }

        const { error } = await sb.from('coach_memories').insert({ user_id: userId, content, category })
        if (error) return JSON.stringify({ saved: false, error: error.message })
        return JSON.stringify({ saved: true, remaining: Math.max(0, max - rows.length - 1) })
      }

      case 'forget_memory': {
        const match = typeof input.match === 'string' ? input.match.trim() : ''
        if (!match) return JSON.stringify({ forgotten: 0, error: 'Aucun texte fourni.' })
        const { data, error } = await sb.from('coach_memories')
          .delete()
          .eq('user_id', userId)
          .ilike('content', `%${match}%`)
          .select('id')
        if (error) return JSON.stringify({ forgotten: 0, error: error.message })
        return JSON.stringify({ forgotten: (data ?? []).length })
      }

      default:
        return JSON.stringify({ error: `Outil mémoire inconnu : ${name}` })
    }
  } catch (e) {
    return JSON.stringify({ error: e instanceof Error ? e.message : String(e) })
  }
}

// ── Injection dans le system prompt ───────────────────────────
const MAX_INJECT = 60      // nombre de souvenirs injectés au plus
const MAX_CHARS  = 2500    // plafond global du bloc (~625 tokens)

const CAT_LABEL: Record<string, string> = {
  preference: 'préférence', health: 'santé', goal: 'objectif', constraint: 'contrainte',
  schedule: 'dispo', nutrition: 'nutrition', decision: 'décision', fact: 'fait',
}

export async function buildStructuredMemory(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: SupabaseClient<any, any, any>,
  userId: string,
): Promise<string> {
  try {
    const { data, error } = await sb.from('coach_memories')
      .select('content,category,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(MAX_INJECT)
    if (error || !data || data.length === 0) return ''

    const lines = (data as Array<{ content: string; category: string | null }>).map(m => {
      const tag = m.category && CAT_LABEL[m.category] ? `[${CAT_LABEL[m.category]}] ` : ''
      return `- ${tag}${m.content}`
    })
    let body = lines.join('\n')
    if (body.length > MAX_CHARS) body = body.slice(0, MAX_CHARS - 1).trimEnd() + '…'

    return `========== MÉMOIRE DURABLE (faits retenus sur l'athlète — utilise-les, ne les redemande jamais) ==========
${body}
========== FIN MÉMOIRE DURABLE ==========`
  } catch {
    return ''
  }
}
