// ══════════════════════════════════════════════════════════════
// Injection des compétences actives dans le system prompt du coach
// Training. Cache mémoire 30s par utilisateur. Ne bloque jamais la
// conversation (fallback chaîne vide + log en cas d'erreur).
// ══════════════════════════════════════════════════════════════

import { createServiceClient } from '@/lib/supabase/server'

interface CompetenceRef { nom: string; prompt_base: string }
interface ActiveRow {
  prompt_custom: string | null
  competences: CompetenceRef | CompetenceRef[] | null
}

const CACHE_TTL_MS = 30_000
const cache = new Map<string, { value: string; expires: number }>()

export function invalidateCompetencesCache(userId: string): void {
  cache.delete(userId)
}

export async function getActiveCompetencesPrompt(userId: string): Promise<string> {
  const cached = cache.get(userId)
  if (cached && cached.expires > Date.now()) return cached.value

  try {
    const sb = createServiceClient()
    const { data, error } = await sb
      .from('user_competences')
      .select('prompt_custom, competences ( nom, prompt_base )')
      .eq('user_id', userId)
      .eq('active', true)

    if (error || !data || data.length === 0) {
      cache.set(userId, { value: '', expires: Date.now() + CACHE_TTL_MS })
      return ''
    }

    const blocks = (data as ActiveRow[])
      .map(uc => {
        const comp = Array.isArray(uc.competences) ? uc.competences[0] : uc.competences
        if (!comp) return null
        const promptText = uc.prompt_custom || comp.prompt_base
        return `## Compétence active : ${comp.nom}\n${promptText}`
      })
      .filter((b): b is string => b !== null)

    if (blocks.length === 0) {
      cache.set(userId, { value: '', expires: Date.now() + CACHE_TTL_MS })
      return ''
    }

    const result =
      `# Compétences actives du coach\n\n` +
      `Les compétences suivantes sont actives pour cet athlète. Tu dois respecter STRICTEMENT leurs règles et exclusions dans toutes tes recommandations.\n\n` +
      `${blocks.join('\n\n---\n\n')}\n\n` +
      `# Fin des compétences actives`

    cache.set(userId, { value: result, expires: Date.now() + CACHE_TTL_MS })
    return result
  } catch (e) {
    console.error('[getActiveCompetencesPrompt] error:', e)
    return ''
  }
}
