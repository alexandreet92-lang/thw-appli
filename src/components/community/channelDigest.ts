'use client'
// ══════════════════════════════════════════════════════════════════════════
// Aperçu des salons pour la liste « Salons » : dernier message (auteur + texte)
// et nombre de messages non lus (postérieurs à mon last_read_at). Lecture seule,
// mêmes tables que getUnreadChannelIds (RLS inchangée), une requête par table.
// ══════════════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import { namesFor, myId } from '@/lib/community/shared'
import type { CommunityAttachment, CommunityChannel } from '@/types/community'

export interface ChannelDigest {
  authorName: string | null
  mine: boolean
  body: string
  kind: 'text' | 'activity' | 'session' | 'image' | 'file'
  at: string
  unread: number
}

interface Row { channel_id: string; author_id: string; body: string | null; created_at: string; attachments: CommunityAttachment[] | null }

export async function loadChannelDigests(channelIds: string[]): Promise<Map<string, ChannelDigest>> {
  const out = new Map<string, ChannelDigest>()
  const ids = Array.from(new Set(channelIds)).filter(Boolean)
  if (ids.length === 0) return out
  const sb = createClient()
  const [readsRes, msgsRes, me] = await Promise.all([
    sb.from('community_reads').select('channel_id, last_read_at').in('channel_id', ids),
    sb.from('community_messages').select('channel_id, author_id, body, created_at, attachments')
      .in('channel_id', ids).order('created_at', { ascending: false }).limit(400),
    myId(),
  ])
  const lastRead = new Map<string, number>()
  for (const r of (readsRes.data ?? []) as { channel_id: string; last_read_at: string }[]) lastRead.set(r.channel_id, new Date(r.last_read_at).getTime())
  const rows = (msgsRes.data ?? []) as Row[]
  const latest = new Map<string, Row>()
  const unread = new Map<string, number>()
  for (const m of rows) {
    if (!latest.has(m.channel_id)) latest.set(m.channel_id, m)
    const read = lastRead.get(m.channel_id) ?? 0
    if (m.author_id !== me && new Date(m.created_at).getTime() > read) unread.set(m.channel_id, (unread.get(m.channel_id) ?? 0) + 1)
  }
  const people = await namesFor(Array.from(latest.values()).map(r => r.author_id))
  for (const [cid, r] of latest) {
    const att = Array.isArray(r.attachments) ? r.attachments[0] : undefined
    const kind: ChannelDigest['kind'] = (r.body ?? '').trim() ? 'text' : att?.type ?? 'text'
    out.set(cid, {
      authorName: people.get(r.author_id)?.name ?? null,
      mine: r.author_id === me,
      body: (r.body ?? '').replace(/\s+/g, ' ').trim(),
      kind,
      at: r.created_at,
      unread: unread.get(cid) ?? 0,
    })
  }
  return out
}

/** Ligne d'aperçu d'un salon : « Prénom : message » (ou type de pièce jointe),
 *  sinon le sujet du salon. */
export function digestLine(d: ChannelDigest | null, c: CommunityChannel, t: (k: string, v?: Record<string, string | number>) => string): string {
  if (d) {
    const who = d.mine ? t('cm.you') : (d.authorName ?? '').split(/\s+/)[0]
    const what = d.kind === 'text' ? d.body
      : d.kind === 'activity' ? t('w1g.activity')
        : d.kind === 'session' ? t('w1g.session')
          : d.kind === 'image' ? t('cm.photo') : t('w1g.attachment')
    return who ? `${who} : ${what}` : what
  }
  return c.topic ?? ''
}
