'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_SKI_PAGES } from '@/types/ski'
import type { DataPage } from '@/types/cycling'

export function useSkiConfig() {
  const [pages, setPages] = useState<DataPage[]>(DEFAULT_SKI_PAGES)
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
          .eq('sport', 'ski')
          .maybeSingle()
        const fetched = (data as { pages?: DataPage[] } | null)?.pages
        if (fetched && Array.isArray(fetched) && fetched.length > 0) {
          setPages(fetched)
        } else {
          setPages(DEFAULT_SKI_PAGES)
          await sb.from('sport_page_configs').upsert(
            { user_id: user.id, sport: 'ski', pages: DEFAULT_SKI_PAGES },
            { onConflict: 'user_id,sport' }
          )
        }
      } catch { /* fallback */ }
      finally { setLoading(false) }
    })()
  }, [])

  const savePages = useCallback(async (newPages: DataPage[]) => {
    setPages(newPages)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      await sb.from('sport_page_configs').upsert(
        { user_id: user.id, sport: 'ski', pages: newPages },
        { onConflict: 'user_id,sport' }
      )
    } catch (e) { console.error('[useSkiConfig] save error:', e) }
  }, [])

  return { pages, setPages, savePages, loading }
}
