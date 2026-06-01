'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Competence, UserCompetence, CompetenceWithUserState } from '@/types/competences'

export function useCompetences() {
  const [competences, setCompetences] = useState<CompetenceWithUserState[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()

      // RLS filtre déjà : prédéfinies (publiques) + custom de l'utilisateur
      const { data: comps, error: e1 } = await sb
        .from('competences')
        .select('*')
        .order('nom', { ascending: true })
      if (e1) throw e1

      let userStates: UserCompetence[] = []
      if (user) {
        const { data: ucs } = await sb
          .from('user_competences')
          .select('*')
          .eq('user_id', user.id)
        userStates = (ucs ?? []) as UserCompetence[]
      }

      const merged: CompetenceWithUserState[] = ((comps ?? []) as Competence[]).map(c => {
        const us = userStates.find(u => u.competence_id === c.id)
        return {
          ...c,
          user_state: us
            ? { active: us.active, prompt_custom: us.prompt_custom, activated_at: us.activated_at }
            : undefined,
        }
      })

      setCompetences(merged)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void reload() }, [reload])

  return { competences, setCompetences, loading, error, reload }
}
