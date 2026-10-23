// ══════════════════════════════════════════════════════════════
// GET /api/articles
// Liste publique des articles (titre, thème, accroche, temps de lecture) + l'état du membre
// connecté (lu / enregistré). Aucun texte d'article ici.
// ══════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ARTICLES } from '@/content/articles'
import { NO_STORE, localizeMeta, type ArticleState } from '@/lib/articles/access'
import { parseLang } from '@/content/articles/i18n'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const lang = parseLang(new URL(req.url).searchParams.get('lang'))
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const state: Record<string, ArticleState> = {}
  if (user) {
    const { data } = await supabase
      .from('article_user_state')
      .select('slug, read_at, saved_at')
      .eq('user_id', user.id)
    for (const r of data ?? []) {
      state[r.slug as string] = { read: !!r.read_at, saved: !!r.saved_at }
    }
  }
  return NextResponse.json({ loggedIn: !!user, articles: ARTICLES.map(a => localizeMeta(a, lang)), state }, { headers: NO_STORE })
}
