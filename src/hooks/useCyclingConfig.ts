'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_PAGES, type DataPage } from '@/types/cycling'

/**
 * Charge la config pages du compteur vélo depuis Supabase
 * (table `sport_page_configs`, sport='cycling'). Fallback DEFAULT_PAGES.
 *
 * `savePages(newPages)` upsert en base + met à jour le state local.
 * Si la table n'existe pas (migration non appliquée) → erreur silencieuse,
 * DEFAULT_PAGES reste utilisé.
 */
export function useCyclingConfig() {
  const [pages, setPages] = useState<DataPage[]>(DEFAULT_PAGES)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const { data } = await sb
          .from('sport_page_configs')
          .select('pages')
          .eq('user_id', user.id)
          .eq('sport', 'cycling')
          .maybeSingle()
        const fetched = (data as { pages?: DataPage[] } | null)?.pages
        if (fetched && Array.isArray(fetched) && fetched.length > 0) {
          setPages(fetched)
        }
      } catch {
        /* table absente ou pas de session — fallback DEFAULT_PAGES */
      } finally {
        setLoaded(true)
      }
    })()
  }, [])

  const savePages = useCallback(async (newPages: DataPage[]) => {
    setPages(newPages)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      await sb
        .from('sport_page_configs')
        .upsert(
          { user_id: user.id, sport: 'cycling', pages: newPages },
          { onConflict: 'user_id,sport' }
        )
    } catch (e) {
      console.error('[useCyclingConfig] save error:', e)
    }
  }, [])

  return { pages, savePages, loaded }
}
