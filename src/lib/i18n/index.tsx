'use client'
// Provider i18n maison (aucune dépendance). Langue persistée dans localStorage
// ('thw-lang') + colonne profiles.language (best-effort). t('clé', {vars}) avec
// repli sur le français puis sur la clé brute. Défaut : français.

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DICTS, DEFAULT_LANG, type Lang } from './dictionaries'

interface I18nCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const Ctx = createContext<I18nCtx | null>(null)
const LS_KEY = 'thw-lang'

// Langue active au niveau module : permet aux utilitaires hors composant
// (ex: formatage de dates dans des .ts / fonctions non-React) de connaître la
// langue courante sans passer par le hook. Synchronisée par le provider.
const LOCALE_BY_LANG: Record<Lang, string> = { fr: 'fr-FR', en: 'en-US', es: 'es-ES' }
let activeLang: Lang = DEFAULT_LANG
export function currentLang(): Lang { return activeLang }
export function currentLocale(): string { return LOCALE_BY_LANG[activeLang] }

function isLang(v: string | null): v is Lang {
  return v === 'fr' || v === 'en' || v === 'es'
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG)

  // Langue initiale : localStorage → profil → défaut.
  useEffect(() => {
    let stored: string | null = null
    try { stored = localStorage.getItem(LS_KEY) } catch { /* ignore */ }
    if (isLang(stored)) { setLangState(stored); activeLang = stored; document.documentElement.lang = stored; return }
    // Sinon on tente le profil (utilisateur déjà connecté).
    void (async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const { data } = await sb.from('profiles').select('language').eq('id', user.id).maybeSingle()
        const l = (data?.language as string | null) ?? null
        if (isLang(l)) { setLangState(l); activeLang = l; document.documentElement.lang = l; try { localStorage.setItem(LS_KEY, l) } catch { /* ignore */ } }
      } catch { /* ignore */ }
    })()
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    activeLang = l
    try { localStorage.setItem(LS_KEY, l) } catch { /* ignore */ }
    if (typeof document !== 'undefined') document.documentElement.lang = l
    // Persistance profil (best-effort, non bloquant).
    void (async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (user) await sb.from('profiles').update({ language: l }).eq('id', user.id)
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
