// ══════════════════════════════════════════════════════════════
// API — /api/coach/feedback
//
// POST : enregistre (ou bascule) le retour 👍/👎 de l'athlète sur une
//        réponse du coach. Contexte capté en plus (question, réponse,
//        sport, modèle) pour alimenter la future distillation d'insights.
// GET  : lecture admin (page de curation) — gardée par compte créateur.
// ══════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isCreatorAccount } from '@/lib/subscriptions/check-quota'

export const dynamic = 'force-dynamic'

function clip(s: unknown, n: number): string | null {
  if (typeof s !== 'string') return null
  const t = s.trim()
  if (!t) return null
  return t.length > n ? t.slice(0, n) : t
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const rating = body?.rating === 1 ? 1 : body?.rating === -1 ? -1 : null
    const messageId = typeof body?.messageId === 'string' ? body.messageId : null
    if (!rating || !messageId) {
      return NextResponse.json({ error: 'rating (1|-1) et messageId requis' }, { status: 400 })
    }

    const { error } = await supabase
      .from('coach_feedback')
      .upsert({
        user_id: user.id,
        message_id: messageId,
        conversation_id: clip(body?.conversationId, 200),
        sport: clip(body?.sport, 40),
        model: clip(body?.model, 40),
        rating,
        reason: clip(body?.reason, 500),
        user_message: clip(body?.userMessage, 4000),
        assistant_message: clip(body?.assistantMessage, 8000),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,message_id' })

    if (error) {
      console.error('[api/coach/feedback] upsert error:', error)
      return NextResponse.json({ error: 'Erreur enregistrement' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[api/coach/feedback] POST error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await isCreatorAccount(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const svc = createServiceClient()
    const { data, error } = await svc
      .from('coach_feedback')
      .select('id, created_at, rating, sport, model, reason, user_message, assistant_message, conversation_id')
      .order('created_at', { ascending: false })
      .limit(300)
    if (error) {
      console.error('[api/coach/feedback] GET error:', error)
      return NextResponse.json({ error: 'Erreur lecture' }, { status: 500 })
    }
    return NextResponse.json({ feedback: data ?? [] })
  } catch (e) {
    console.error('[api/coach/feedback] GET error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
