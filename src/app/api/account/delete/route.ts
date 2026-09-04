// ══════════════════════════════════════════════════════════════════════════
// POST /api/account/delete
// Suppression DÉFINITIVE du compte de l'utilisateur connecté, initiée DANS l'app
// (exigence Apple 5.1.1(v) : une app qui permet de créer un compte doit permettre
// de le supprimer dans l'app). Authentifié via cookies (web) ou Bearer (natif).
// Supprime l'utilisateur auth → les données rattachées par clé étrangère
// « on delete cascade » (profiles et le reste) sont supprimées avec.
// ══════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  try {
    const admin = createServiceClient()

    // Nettoyage best-effort de quelques tables clés (au cas où une FK ne serait
    // pas en cascade). Non bloquant : la suppression du compte auth prime.
    const uid = user.id
    const cleanups: PromiseLike<unknown>[] = [
      admin.from('coach_messages').delete().or(`coach_id.eq.${uid},athlete_id.eq.${uid}`),
      admin.from('user_blocks').delete().or(`blocker_id.eq.${uid},blocked_id.eq.${uid}`),
      admin.from('dm_reports').delete().eq('reporter_id', uid),
      admin.from('ai_conversations').delete().eq('user_id', uid),
      admin.from('activities').delete().eq('user_id', uid),
      admin.from('profiles').delete().eq('id', uid),
    ]
    await Promise.allSettled(cleanups)

    // Suppression de l'utilisateur auth (irréversible).
    const { error } = await admin.auth.admin.deleteUser(uid)
    if (error) {
      console.error('[account/delete] deleteUser error:', error.message)
      return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[account/delete] error:', e)
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
  }
}
