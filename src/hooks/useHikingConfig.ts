'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_HIKING_PAGES } from '@/types/hiking'
import type { DataPage } from '@/types/cycling'

export function useHikingConfig(sport: string = 'hiking') {
  const [pages, setPages] = useState<DataPage[]>(DEFAULT_HIKING_PAGES)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const { data } = await sb.from('sport_page_configs').select('pages').eq('user_id', user.id).eq('sport', sport).maybeSingle()
        const fetched = (data as { pages?: DataPage[] } | null)?.pages
        if (fetched && Array.isArray(fetched) && fetched.length > 0) {
          setPages(fetched)
        } else {
          setPages(DEFAULT_HIKING_PAGES)
          await sb.from('sport_page_configs').upsert({ user_id: user.id, sport, pages: DEFAULT_HIKING_PAGES }, { onConflict: 'user_id,sport' })
        }
      } catch { /* fallback */ }
      finally { setLoading(false) }
    })()
  }, [sport])

  const savePages = useCallback(async (newPages: DataPage[]) => {
    setPages(newPages)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      await sb.from('sport_page_configs').upsert({ user_id: user.id, sport, pages: newPages }, { onConflict: 'user_id,sport' })
    } catch (e) { console.error('[useHikingConfig] save error:', e) }
  }, [sport])

  return { pages, setPages, savePages, loading }
}
