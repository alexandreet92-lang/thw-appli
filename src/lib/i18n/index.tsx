'use client'
// Provider i18n maison (aucune dépendance). Langue persistée dans localStorage
// ('thw-lang') + colonne profiles.language (best-effort). t('clé', {vars}) avec
// repli sur le français puis sur la clé brute. Défaut : français.

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { DICTS, DEFAULT_LANG, type Lang } from './dictionaries'
import { setActiveLang, currentLang, currentLocale } from './locale'

// Ré-export pour les composants clients qui importent depuis '@/lib/i18n'.
// Les fichiers serveur / .ts doivent importer depuis '@/lib/i18n/locale'.
export { currentLang, currentLocale }

interface I18nCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const Ctx = createContext<I18nCtx | null>(null)
const LS_KEY = 'thw-lang'

function isLang(v: string | null): v is Lang {
  return v === 'fr' || v === 'en' || v === 'es'
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG)
  const [resolved, setResolved] = useState(false)

  // Langue initiale : localStorage → profil → défaut.
  useEffect(() => {
    let stored: string | null = null
    try { stored = localStorage.getItem(LS_KEY) } catch { /* ignore */ }
    if (isLang(stored)) { setLangState(stored); setActiveLang(stored); document.documentElement.lang = stored; setResolved(true); return }
    // Sinon on tente le profil (utilisateur déjà connecté).
    void (async () => {
      try {
        const sb = createClient()
        const user = await getCurrentUser()
        if (!user) return
        const { data } = await sb.from('profiles').select('language').eq('id', user.id).maybeSingle()
        const l = (data?.language as string | null) ?? null
        if (isLang(l)) { setLangState(l); setActiveLang(l); document.documentElement.lang = l; try { localStorage.setItem(LS_KEY, l) } catch { /* ignore */ } }
      } catch { /* ignore */ }
      finally { setResolved(true) }
    })()
  }, [])

  // Remise à niveau des comptes créés avant que la langue ne soit copiée dans
  // les métadonnées : sans ça, un utilisateur anglophone qui ne touche jamais
  // au sélecteur de langue recevrait ses emails en français à vie.
  // Écriture uniquement s'il y a un écart — pas à chaque chargement de page.
  useEffect(() => {
    if (!resolved) return
    void (async () => {
      try {
        const user = await getCurrentUser()
        if (!user || user.user_metadata?.lang === lang) return
        await createClient().auth.updateUser({ data: { lang } })
      } catch { /* ignore */ }
    })()
  }, [resolved, lang])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    setActiveLang(l)
    try { localStorage.setItem(LS_KEY, l) } catch { /* ignore */ }
    if (typeof document !== 'undefined') document.documentElement.lang = l
    // Persistance profil (best-effort, non bloquant) + métadonnées du compte.
    // Les DEUX sont nécessaires : `profiles.language` sert à l'app, tandis que
    // les templates d'email Supabase ne savent lire que `user_metadata.lang`.
    void (async () => {
      try {
        const sb = createClient()
        const user = await getCurrentUser()
        if (!user) return
        await sb.from('profiles').update({ language: l }).eq('id', user.id)
        await sb.auth.updateUser({ data: { lang: l } })
      } catch { /* ignore */ }
    })()
  }, [])

  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    let s = DICTS[lang][key] ?? DICTS[DEFAULT_LANG][key] ?? key
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v))
    return s
  }, [lang])

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>
}

export function useI18n(): I18nCtx {
  const c = useContext(Ctx)
  if (!c) return { lang: DEFAULT_LANG, setLang: () => {}, t: (k) => DICTS[DEFAULT_LANG][k] ?? k }
  return c
}
