'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CompetenceWithUserState } from '@/types/competences'

// Mapping tier DB (premium|pro|expert) → libellé + limite de compétences actives.
const TIER_META: Record<string, { label: string; limit: number }> = {
  premium: { label: 'Premium', limit: 3 },
  pro:     { label: 'Pro',     limit: 7 },
  expert:  { label: 'Expert',  limit: 20 },
}
const DEFAULT_TIER = 'premium'

export interface LimitInfo {
  active_count: number
  limit: number
  planLabel: string
  can_activate_more: boolean
}

export interface ToggleResult {
  ok: boolean
  error?: string
}

export function useUserCompetences() {
  const [tier, setTier] = useState<string>(DEFAULT_TIER)

  useEffect(() => {
    void (async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const { data } = await sb
          .from('user_subscriptions')
          .select('tier,status')
          .eq('user_id', user.id)
          .maybeSingle()
        const t = (data as { tier?: string } | null)?.tier
        if (t && TIER_META[t]) setTier(t)
      } catch { /* défaut premium */ }
    })()
  }, [])

  const meta = TIER_META[tier] ?? TIER_META[DEFAULT_TIER]

  const checkLimit = useCallback((competences: CompetenceWithUserState[]): LimitInfo => {
    const active_count = competences.filter(c => c.user_state?.active).length
    return {
      active_count,
      limit: meta.limit,
      planLabel: meta.label,
      can_activate_more: active_count < meta.limit,
    }
  }, [meta])

  // Retourne les compétences actives en conflit avec celle qu'on veut activer.
  const detectConflicts = useCallback((
    competence: CompetenceWithUserState,
    competences: CompetenceWithUserState[],
  ): CompetenceWithUserState[] => {
    const conflitIds = new Set(competence.conflits ?? [])
    return competences.filter(c => c.user_state?.active && conflitIds.has(c.id))
  }, [])

  const toggleCompetence = useCallback(async (
    competenceId: string,
    currentlyActive: boolean,
  ): Promise<ToggleResult> => {
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return { ok: false, error: 'Connecte-toi pour activer une compétence.' }

      const { error } = await sb
        .from('user_competences')
        .upsert(
          {
            user_id: user.id,
            competence_id: competenceId,
            active: !currentlyActive,
            activated_at: !currentlyActive ? new Date().toISOString() : null,
          },
          { onConflict: 'user_id,competence_id' },
        )
      if (error) return { ok: false, error: error.message }
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Erreur' }
    }
  }, [])

  return { tier, planLabel: meta.label, limit: meta.limit, checkLimit, detectConflicts, toggleCompetence }
}
