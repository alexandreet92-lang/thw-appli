'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { DEFAULT_PAGES, type DataPage } from '@/types/cycling'

export function useCyclingConfig(sport: string = 'cycling') {
  const [pages, setPages] = useState<DataPage[]>(DEFAULT_PAGES)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const sb = createClient()
        const user = await getCurrentUser()
        if (!user) return

        const { data } = await sb
          .from('sport_page_configs')
          .select('pages')
          .eq('user_id', user.id)
          .eq('sport', sport)
          .maybeSingle()

        const fetched = (data as { pages?: DataPage[] } | null)?.pages
        if (fetched && Array.isArray(fetched) && fetched.length > 0) {
          setPages(fetched)
        } else {
          // Pas de ligne → défauts en mémoire. Aucune écriture au montage :
          // on ne persiste qu'au premier changement utilisateur (savePages).
          setPages(DEFAULT_PAGES)
        }
      } catch {
        /* table absente ou pas de session — fallback DEFAULT_PAGES */
      } finally {
        setLoading(false)
      }
    })()
  }, [sport])

  const savePages = useCallback(async (newPages: DataPage[]) => {
    setPages(newPages)
    try {
      const sb = createClient()
      const user = await getCurrentUser()
      if (!user) return
      await sb
        .from('sport_page_configs')
        .upsert(
          { user_id: user.id, sport, pages: newPages },
          { onConflict: 'user_id,sport' }
        )
    } catch (e) {
      console.error('[useCyclingConfig] save error:', e)
    }
  }, [sport])

  return { pages, setPages, savePages, loading }
}
