// ══════════════════════════════════════════════════════════════════════════
// POST /api/community/moderate — actions de modération d'un espace.
// Réservé owner/admin (vérifié serveur). Service role pour appliquer + journaliser.
//
// Actions : 'ban' (retire + bannit), 'unban', 'kick' (retire sans bannir),
//           'delete_message'. Chaque action écrit dans community_audit_log.
// On ne peut pas viser l'owner de l'espace ni soi-même (ban/kick).
// ══════════════════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Action = 'ban' | 'unban' | 'kick' | 'delete_message' | 'approve_request' | 'reject_request'
interface Body { spaceId?: string; action?: Action; targetUserId?: string; messageId?: string; reason?: string }

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { spaceId, action, targetUserId, messageId, reason } = (await req.json().catch(() => ({}))) as Body
    if (!spaceId || !action) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })

    const svc = createServiceClient()
    // L'acteur doit être owner/admin de l'espace.
    const { data: meRow } = await svc.from('community_members').select('role').eq('space_id', spaceId).eq('user_id', user.id).maybeSingle()
    const myRole = (meRow as { role: string } | null)?.role
    if (myRole !== 'owner' && myRole !== 'admin') {
      return NextResponse.json({ error: 'Action réservée à la modération.' }, { status: 403 })
    }

    const cleanReason = (reason ?? '').trim().slice(0, 400) || null

    async function audit(act: string, targetType: string, targetId: string) {
      await svc.from('community_audit_log').insert({
        space_id: spaceId, actor_id: user!.id, action: act, target_type: targetType, target_id: targetId,
        meta: cleanReason ? { reason: cleanReason } : null,
      })
    }

    if (action === 'delete_message') {
      if (!messageId) return NextResponse.json({ error: 'Message manquant' }, { status: 400 })
      await svc.from('community_messages').delete().eq('id', messageId)
      await audit('delete_message', 'message', messageId)
      return NextResponse.json({ ok: true })
    }

    // Demandes d'adhésion (groupes privés).
    if (action === 'approve_request' || action === 'reject_request') {
      if (!targetUserId) return NextResponse.json({ error: 'Demandeur manquant' }, { status: 400 })
      if (action === 'approve_request') {
        // Ajout du membre (le trigger capacité/ban s'applique).
        const { error: insErr } = await svc.from('community_members').insert({ space_id: spaceId, user_id: targetUserId, role: 'member' })
        if (insErr) return NextResponse.json({ error: 'Ajout impossible (capacité atteinte ou banni ?).' }, { status: 400 })
        await svc.from('community_join_requests').update({ status: 'approved' }).eq('space_id', spaceId).eq('user_id', targetUserId)
        await audit('approve_request', 'user', targetUserId)
      } else {
        await svc.from('community_join_requests').update({ status: 'rejected' }).eq('space_id', spaceId).eq('user_id', targetUserId)
        await audit('reject_request', 'user', targetUserId)
      }
      return NextResponse.json({ ok: true })
    }

    // ban / unban / kick ciblent un membre.
    if (!targetUserId) return NextResponse.json({ error: 'Membre cible manquant' }, { status: 400 })
    if (targetUserId === user.id) return NextResponse.json({ error: 'Tu ne peux pas te viser toi-même.' }, { status: 400 })

    // Protéger l'owner : personne ne peut le bannir/exclure.
    const { data: targetRow } = await svc.from('community_members').select('role').eq('space_id', spaceId).eq('user_id', targetUserId).maybeSingle()
    const targetRole = (targetRow as { role: string } | null)?.role
    if (targetRole === 'owner') return NextResponse.json({ error: 'Impossible de viser le propriétaire.' }, { status: 400 })
    // Un admin ne peut pas viser un autre admin (seul l'owner le peut).
    if (targetRole === 'admin' && myRole !== 'owner') {
      return NextResponse.json({ error: 'Seul le propriétaire peut modérer un admin.' }, { status: 403 })
    }

    if (action === 'unban') {
      await svc.from('community_bans').delete().eq('space_id', spaceId).eq('user_id', targetUserId)
      await audit('unban', 'user', targetUserId)
      return NextResponse.json({ ok: true })
    }

    // ban ou kick : retirer l'appartenance.
    await svc.from('community_members').delete().eq('space_id', spaceId).eq('user_id', targetUserId)
    if (action === 'ban') {
      await svc.from('community_bans').upsert(
        { space_id: spaceId, user_id: targetUserId, banned_by: user.id, reason: cleanReason },
        { onConflict: 'space_id,user_id' },
      )
    }
    await audit(action, 'user', targetUserId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[community/moderate] error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
