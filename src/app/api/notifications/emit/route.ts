// ══════════════════════════════════════════════════════════════
// POST /api/notifications/emit
// Émet une notification pour l'utilisateur CONNECTÉ (in-app + push),
// depuis un événement déclenché côté client (plan sauvegardé, analyse
// terminée, compétence activée…). La clé doit appartenir au catalogue.
// ══════════════════════════════════════════════════════════════

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyUser } from '@/lib/notifications/dispatch'
import { NOTIF_DEFAULTS, type NotifKey } from '@/lib/notifications/catalog'

export async function POST(req: NextRequest) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json().catch(() => null) as
      | { key?: string; title?: string; body?: string; url?: string; dedupKey?: string; once?: boolean }
      | null
    const key = body?.key
    if (!key || !(key in NOTIF_DEFAULTS)) {
      return NextResponse.json({ error: 'Clé de notification inconnue' }, { status: 400 })
    }
    if (!body?.title || !body?.body) {
      return NextResponse.json({ error: 'title et body requis' }, { status: 400 })
    }

    // Fire-and-forget : la réponse ne dépend pas de la livraison du push.
    void notifyUser(user.id, key as NotifKey, {
      title: body.title,
      body: body.body,
      url: body.url,
      dedupKey: body.dedupKey,
      once: body.once,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
