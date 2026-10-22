import { ARTICLES, loadArticle, type ArticleMeta } from '@/content/articles'

export interface ArticleState { read: boolean; saved: boolean }

export const NO_STORE = { 'Cache-Control': 'private, no-store' } as const

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
export async function articleForViewer(slug: string, loggedIn: boolean) {
  const meta = findMeta(slug)
  if (!meta) return null
  const content = await loadArticle(slug)
  if (!content) return null
  const full = loggedIn || meta.open
  return {
    meta,
    css: content.css,
    html: full ? content.head + content.rest : neutralizeSourceLinks(content.head),
    locked: !full,
  }
}
