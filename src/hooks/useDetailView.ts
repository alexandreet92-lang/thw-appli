'use client'
// Vue « détail » interne à une page mobile (carte tappée → page qui glisse).
// L'ouverture ajoute une entrée d'historique : le bouton/geste retour du
// téléphone referme le détail au lieu de quitter la page.
import { useCallback, useEffect, useState } from 'react'

export function useDetailView<T extends string>(): [T | null, (v: T) => void, () => void] {
  const [view, setView] = useState<T | null>(null)

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const v = (e.state as { thwDetail?: T } | null)?.thwDetail ?? null
      setView(v)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const toTop = () => document.querySelector('main')?.scrollTo({ top: 0 })
  const open = useCallback((v: T) => {
    window.history.pushState({ ...(window.history.state ?? {}), thwDetail: v }, '')
    setView(v); toTop()
  }, [])
  const close = useCallback(() => {
    if ((window.history.state as { thwDetail?: T } | null)?.thwDetail) window.history.back()
    else setView(null)
    toTop()
  }, [])

  return [view, open, close]
}
