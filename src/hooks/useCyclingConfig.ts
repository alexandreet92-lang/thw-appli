'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_PAGES, type DataPage } from '@/types/cycling'

export function useCyclingConfig(sport: string = 'cycling') {
  const [pages, setPages] = useState<DataPage[]>(DEFAULT_PAGES)
  const [loading, setLoading] = useState(true)

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
          .eq('sport', sport)
          .maybeSingle()

        const fetched = (data as { pages?: DataPage[] } | null)?.pages
        if (fetched && Array.isArray(fetched) && fetched.length > 0) {
          setPages(fetched)
        } else {
          setPages(DEFAULT_PAGES)
          await sb.from('sport_page_configs').upsert(
            { user_id: user.id, sport, pages: DEFAULT_PAGES },
            { onConflict: 'user_id,sport' }
          )
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
      const { data: { user } } = await sb.auth.getUser()
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
