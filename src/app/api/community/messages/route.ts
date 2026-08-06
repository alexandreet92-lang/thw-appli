// ══════════════════════════════════════════════════════════════════════════
// POST /api/community/messages — envoi d'un message + notifications de mention.
//
// L'insertion se fait avec le client UTILISATEUR (RLS) : l'appartenance à l'espace
// et author_id = auth.uid() sont donc vérifiés par la base. Après insertion, on
// parse les @mentions du corps, on les résout contre les membres de l'espace et on
// notifie les personnes citées (clé communaute.mention, qui respecte leurs réglages).
// ══════════════════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notifyUser } from '@/lib/notifications/dispatch'
import type { CommunityAttachment } from '@/types/community'

export const dynamic = 'force-dynamic'

interface Body {
  channelId?: string
  body?: string
  attachments?: CommunityAttachment[]
  replyTo?: string | null
}

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { channelId, body, attachments, replyTo } = (await req.json().catch(() => ({}))) as Body
    if (!channelId) return NextResponse.json({ error: 'Canal manquant' }, { status: 400 })
    const text = (body ?? '').trim()
    const atts = Array.isArray(attachments) ? attachments.slice(0, 10) : []
    if (text.length > 4000) return NextResponse.json({ error: 'Message trop long' }, { status: 400 })
    if (!text && atts.length === 0) return NextResponse.json({ error: 'Message vide' }, { status: 400 })

    // ── Garde-fous anti-spam / modération (serveur, service role) ─────────────
    const svc = createServiceClient()
    const { data: chRow } = await svc.from('community_channels').select('space_id, name').eq('id', channelId).maybeSingle()
    const chan = chRow as { space_id: string; name: string } | null
    if (!chan) return NextResponse.json({ error: 'Canal introuvable' }, { status: 404 })
    const spaceId = chan.space_id
    const channelName = chan.name ?? 'un canal'

    const { data: cfgRow } = await svc.from('community_spaces')
      .select('slow_mode_sec, blocked_words, require_rules_accept').eq('id', spaceId).maybeSingle()
    const cfg = cfgRow as { slow_mode_sec: number; blocked_words: string[]; require_rules_accept: boolean } | null

    const { data: memRow } = await svc.from('community_members').select('role').eq('space_id', spaceId).eq('user_id', user.id).maybeSingle()
    const role = (memRow as { role: string } | null)?.role
    const isMod = role === 'owner' || role === 'admin'

    // Mots bloqués (tous sauf modération).
    if (text && !isMod && cfg?.blocked_words?.length) {
      const n = norm(text)
      if (cfg.blocked_words.some(w => w && n.includes(norm(w)))) {
        return NextResponse.json({ error: 'Ton message contient un terme interdit dans cet espace.' }, { status: 422 })
      }
    }
    // Acceptation des règles requise (tous sauf modération).
    if (cfg?.require_rules_accept && !isMod) {
      const { data: acc } = await svc.from('community_rules_accepted').select('user_id').eq('space_id', spaceId).eq('user_id', user.id).maybeSingle()
      if (!acc) return NextResponse.json({ error: 'Accepte les règles de l\'espace pour participer.', code: 'rules_required' }, { status: 403 })
    }
    // Anti-flood (5 / 10 s) + mode lent (sauf modération).
    if (!isMod) {
      const since = new Date(Date.now() - 10_000).toISOString()
      const { data: burst } = await svc.from('community_messages')
        .select('created_at').eq('channel_id', channelId).eq('author_id', user.id).gte('created_at', since)
      if (((burst ?? []) as unknown[]).length >= 5) {
        return NextResponse.json({ error: 'Tu envoies des messages trop vite. Réessaie dans un instant.' }, { status: 429 })
      }
      if (cfg?.slow_mode_sec && cfg.slow_mode_sec > 0) {
        const { data: last } = await svc.from('community_messages')
          .select('created_at').eq('channel_id', channelId).eq('author_id', user.id)
          .order('created_at', { ascending: false }).limit(1).maybeSingle()
        const lastAt = (last as { created_at: string } | null)?.created_at
        if (lastAt) {
          const waited = (Date.now() - new Date(lastAt).getTime()) / 1000
          if (waited < cfg.slow_mode_sec) {
            return NextResponse.json({ error: `Mode lent activé : attends ${Math.ceil(cfg.slow_mode_sec - waited)} s.` }, { status: 429 })
          }
        }
      }
    }

    // Insertion via le client utilisateur → RLS (membre + author = uid).
    const { data: inserted, error } = await supabase
      .from('community_messages')
      .insert({ channel_id: channelId, author_id: user.id, body: text, attachments: atts, reply_to: replyTo ?? null })
      .select('id')
      .single()
    if (error || !inserted) {
      return NextResponse.json({ error: 'Envoi impossible (accès refusé ?)' }, { status: 403 })
    }

    // ── Mentions (best-effort, ne bloque jamais l'envoi) ─────────────────────
    try {
      const tokens = Array.from(new Set((text.match(/@([\p{L}][\p{L}\-]{1,30})/gu) ?? []).map(t => norm(t.slice(1))))).slice(0, 10)
      if (tokens.length > 0) {
        {
          const { data: mem } = await svc.from('community_members').select('user_id').eq('space_id', spaceId)
          const memberIds = (mem ?? []).map((m: { user_id: string }) => m.user_id).filter(id => id !== user.id)
          if (memberIds.length > 0) {
            const { data: profs } = await svc.from('profiles').select('id, full_name, first_name').in('id', memberIds)
            const { data: meProf } = await svc.from('profiles').select('full_name, first_name').eq('id', user.id).maybeSingle()
            const authorName = ((meProf?.full_name as string) || (meProf?.first_name as string) || 'Un membre').trim()
            const targets = new Set<string>()
            for (const p of (profs ?? []) as { id: string; full_name: string | null; first_name: string | null }[]) {
              const words = `${p.full_name ?? ''} ${p.first_name ?? ''}`.split(/\s+/).map(norm).filter(Boolean)
              if (words.some(w => tokens.includes(w))) targets.add(p.id)
            }
            // Exclure ceux qui ont mis ce canal en sourdine.
            if (targets.size > 0) {
              const { data: mutes } = await svc.from('community_channel_mutes')
                .select('user_id').eq('channel_id', channelId).in('user_id', Array.from(targets))
              for (const mrow of (mutes ?? []) as { user_id: string }[]) targets.delete(mrow.user_id)
            }
            const snippet = text.slice(0, 120) || 'Pièce jointe'
            await Promise.all(Array.from(targets).map(id =>
              notifyUser(id, 'communaute.mention', {
                title: `${authorName} t'a mentionné dans #${channelName}`,
                body: snippet,
                url: '/community',
                dedupKey: `comm-mention-${inserted.id}-${id}`,
                once: true,
              }).catch(() => {}),
            ))
          }
        }
      }
    } catch { /* notifications best-effort */ }

    return NextResponse.json({ id: inserted.id }, { status: 201 })
  } catch (e) {
    console.error('[community/messages] error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
