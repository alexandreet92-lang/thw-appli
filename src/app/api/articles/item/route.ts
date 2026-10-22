// Route STATIQUE à dessein : sur le domaine du site, la règle /:path* → /site/:path* (next.config)
// capte les segments dynamiques avant leur résolution (404). Le slug passe donc en paramètre.
// ══════════════════════════════════════════════════════════════
// GET   /api/articles/item?slug=…  → article : complet pour un membre connecté, début seul pour un visiteur
// PATCH /api/articles/item?slug=…  → { read?: boolean, saved?: boolean } : lu / enregistré (membres)
// ══════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { articleForViewer, findMeta, NO_STORE, type ArticleState } from '@/lib/articles/access'

export const dynamic = 'force-dynamic'

function slugOf(req: Request): string {
  return new URL(req.url).searchParams.get('slug') ?? ''
}

export async function GET(req: Request) {
  const slug = slugOf(req)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const art = await articleForViewer(slug, !!user)
  if (!art) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE })

  let state: ArticleState = { read: false, saved: false }
  if (user) {
    const { data } = await supabase
      .from('article_user_state')
      .select('read_at, saved_at')
      .eq('user_id', user.id).eq('slug', slug).maybeSingle()
    if (data) state = { read: !!data.read_at, saved: !!data.saved_at }
  }
  return NextResponse.json({ ...art, loggedIn: !!user, state }, { headers: NO_STORE })
}

export async function PATCH(req: Request) {
  const slug = slugOf(req)
  if (!findMeta(slug)) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401, headers: NO_STORE })

  let body: { read?: unknown; saved?: unknown } = {}
  try { body = await req.json() } catch { /* corps vide */ }
  const wantRead = typeof body.read === 'boolean' ? body.read : undefined
  const wantSaved = typeof body.saved === 'boolean' ? body.saved : undefined
  if (wantRead === undefined && wantSaved === undefined) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400, headers: NO_STORE })
  }

  const { data: cur } = await supabase
    .from('article_user_state')
    .select('read_at, saved_at')
    .eq('user_id', user.id).eq('slug', slug).maybeSingle()

  const now = new Date().toISOString()
  const read_at = wantRead === undefined ? (cur?.read_at ?? null) : wantRead ? (cur?.read_at ?? now) : null
  const saved_at = wantSaved === undefined ? (cur?.saved_at ?? null) : wantSaved ? (cur?.saved_at ?? now) : null

  if (!read_at && !saved_at) {
    await supabase.from('article_user_state').delete().eq('user_id', user.id).eq('slug', slug)
  } else {
    const { error } = await supabase
      .from('article_user_state')
      .upsert({ user_id: user.id, slug, read_at, saved_at, updated_at: now }, { onConflict: 'user_id,slug' })
    if (error) return NextResponse.json({ error: 'save_failed' }, { status: 500, headers: NO_STORE })
  }
  return NextResponse.json({ state: { read: !!read_at, saved: !!saved_at } }, { headers: NO_STORE })
}
