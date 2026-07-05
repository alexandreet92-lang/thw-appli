// Langue active au niveau module — importable côté CLIENT ET SERVEUR (ce fichier
// n'est PAS 'use client', contrairement à ./index.tsx). Permet aux utilitaires
// hors composant (formatage de dates dans des .ts, routes API, server components)
// de connaître la langue courante sans le hook React.
//
// Le provider i18n (client) la synchronise à chaque changement via setActiveLang.
// Côté serveur, activeLang reste à DEFAULT_LANG pour le rendu initial — le contenu
// daté est de toute façon ré-hydraté/rendu côté client avec la bonne langue.
import { DEFAULT_LANG, type Lang } from './dictionaries'

const LOCALE_BY_LANG: Record<Lang, string> = { fr: 'fr-FR', en: 'en-US', es: 'es-ES' }
let activeLang: Lang = DEFAULT_LANG

export function setActiveLang(l: Lang): void { activeLang = l }
export function currentLang(): Lang { return activeLang }
export function currentLocale(): string { return LOCALE_BY_LANG[activeLang] ?? 'fr-FR' }
