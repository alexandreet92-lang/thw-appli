import { ARTICLES, loadArticle, type ArticleMeta } from '@/content/articles'
import { META_I18N, loadArticleTr, type TrLang } from '@/content/articles/i18n'

export interface ArticleState { read: boolean; saved: boolean }

export const NO_STORE = { 'Cache-Control': 'private, no-store' } as const

/** Métadonnées dans la langue demandée (français si pas de traduction). */
export function localizeMeta(m: ArticleMeta, lang: TrLang | null): ArticleMeta {
  const tr = lang ? META_I18N[m.slug]?.[lang] : undefined
  return tr ? { ...m, title: tr.title, lede: tr.lede, tag: tr.tag } : m
}

export function findMeta(slug: string): ArticleMeta | undefined {
  return ARTICLES.find(a => a.slug === slug)
}

// Visiteur : les renvois vers les sources (#s12…) pointeraient vers du texte qu'il ne reçoit pas.
function neutralizeSourceLinks(html: string): string {
  return html.replace(/<a href="#s\d+">([\s\S]*?)<\/a>/g, '<span>$1</span>')
}

/**
 * Contenu d'un article selon l'accès. LE TEXTE RÉSERVÉ N'EST JAMAIS RENVOYÉ à un visiteur :
 * la coupure se fait ici, côté serveur (un simple flou CSS se contournerait en deux clics).
 */
export async function articleForViewer(slug: string, loggedIn: boolean, lang: TrLang | null = null) {
  const base = findMeta(slug)
  if (!base) return null
  const content = await loadArticle(slug)
  if (!content) return null
  // Traduction si elle existe (même coupure, mêmes graphiques) ; sinon français.
  const tr = lang ? await loadArticleTr(slug, lang) : null
  const head = tr ? tr.head : content.head
  const rest = tr ? tr.rest : content.rest
  const full = loggedIn || base.open
  return {
    meta: localizeMeta(base, tr ? lang : null),
    css: content.css,
    html: full ? head + rest : neutralizeSourceLinks(head),
    locked: !full,
    lang: tr ? lang : 'fr',
  }
}
