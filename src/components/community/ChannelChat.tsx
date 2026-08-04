'use client'
// ══════════════════════════════════════════════════════════════════════════
// Fil d'un canal — feed lisible « type Whoop/Discord », sobre (Design System).
// Réactions, actions au survol (répondre / éditer / supprimer), réponses,
// mentions @, dictée, pièces jointes, présence, append en direct (Realtime).
// Tokens uniquement, aucune bordure hors input/focus.
// ══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getChannelMessages, sendChannelMessage, editChannelMessage, deleteChannelMessage, uploadCommunityMedia,
} from '@/lib/community/messages'
import { markChannelRead } from '@/lib/community/channels'
import { toggleReaction, QUICK_REACTIONS } from '@/lib/community/reactions'
import { getPinnedIds, getPinnedMessages, togglePin } from '@/lib/community/pins'
import { listSpaceMembers } from '@/lib/community/spaces'
import { usePresenceCount } from '@/lib/community/presence'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import { myId } from '@/lib/community/shared'
import { ShareActivitySheet } from './ShareActivitySheet'
import { ActivityCard } from './ActivityCard'
import type { CommunityChannel, CommunityMessage, CommunityAttachment, CommunityMemberInfo, ActivityRef } from '@/types/community'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

function fmtTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}
function fmtDay(iso: string): string {
  try {
    const d = new Date(iso), today = new Date(), y = new Date(today); y.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
    if (d.toDateString() === y.toDateString()) return 'Hier'
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  } catch { return '' }
}
const firstWord = (s: string) => s.trim().split(/\s+/)[0] ?? s

function Avatar({ name, url, size = 36 }: { name: string; url: string | null; size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', background: 'var(--surface-neutral)', color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, fontFamily: FB, fontWeight: 600, fontSize: size * 0.4 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name.slice(0, 1).toUpperCase()}
    </span>
  )
}

// Rend le corps d'un message avec les @mentions surlignées (accent discret).
function Body({ text }: { text: string }) {
  const parts = text.split(/(@[\p{L}][\p{L}\-]{1,30})/gu)
  return (
    <p style={{ margin: 0, fontFamily: FB, fontSize: 13.5, color: 'var(--text)', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {parts.map((p, i) => p.startsWith('@')
        ? <span key={i} style={{ color: 'var(--primary)', fontWeight: 600 }}>{p}</span>
        : <span key={i}>{p}</span>)}
    </p>
  )
}

export function ChannelChat({
  channel, isMember, canPost, canUpload, canModerate, onJoin, joining, onRead,
}: {
  channel: CommunityChannel
  isMember: boolean
  canPost: boolean
  canUpload: boolean
  canModerate: boolean
  onJoin: () => void
  joining: boolean
  onRead?: (channelId: string) => void
}) {
  const [messages, setMessages] = useState<CommunityMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [pending, setPending] = useState<CommunityAttachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [me, setMe] = useState<string | null>(null)
  const [members, setMembers] = useState<CommunityMemberInfo[]>([])
  const [reactFor, setReactFor] = useState<string | null>(null)
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set())
  const [showPins, setShowPins] = useState(false)
  const [pinnedList, setPinnedList] = useState<CommunityMessage[] | null>(null)
  const [replyTo, setReplyTo] = useState<{ id: string; authorName: string } | null>(null)
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const idsRef = useRef<Set<string>>(new Set())
  const voiceBase = useRef('')
  const instanceId = useId()
  const presence = usePresenceCount(isMember ? `comm-presence-${channel.spaceId}` : null, me)

  const { supported: micSupported, isListening, toggle: toggleMic } = useSpeechToText(
    (text) => setInput((voiceBase.current ? voiceBase.current.trimEnd() + ' ' : '') + text),
  )

  const load = useCallback(async () => {
    if (!isMember) { setMessages([]); setLoading(false); return }
    const [msgs, pins] = await Promise.all([getChannelMessages(channel.id), getPinnedIds(channel.id)])
    idsRef.current = new Set(msgs.map(m => m.id))
    setMessages(msgs); setPinnedIds(pins)
    setLoading(false)
    void markChannelRead(channel.id)
    onRead?.(channel.id)
  }, [channel.id, isMember, onRead])

  async function pin(m: CommunityMessage) {
    setReactFor(null)
    const isPinned = pinnedIds.has(m.id)
    if (await togglePin(channel.spaceId, channel.id, m.id, isPinned)) { void load(); if (showPins) setPinnedList(await getPinnedMessages(channel.id)) }
  }
  async function openPins() {
    setShowPins(true); setPinnedList(null)
    setPinnedList(await getPinnedMessages(channel.id))
  }

  useEffect(() => { setLoading(true); setReplyTo(null); setEditing(null); void load() }, [load])
  useEffect(() => { void myId().then(setMe) }, [])
  useEffect(() => {
    if (!isMember) { setMembers([]); return }
    void listSpaceMembers(channel.spaceId).then(setMembers)
  }, [channel.spaceId, isMember])

  // Append en direct : messages + réactions (un seul canal, nom unique par instance
  // car la page est montée dans les deux shells simultanément).
  useEffect(() => {
    if (!isMember) return
    const sb = createClient()
    const ch = sb.channel(`comm-ch-${channel.id}-${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_messages', filter: `channel_id=eq.${channel.id}` },
        () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_message_reactions' },
        (payload: { new?: { message_id?: string }; old?: { message_id?: string } }) => {
          const mid = payload.new?.message_id ?? payload.old?.message_id
          if (mid && idsRef.current.has(mid)) void load()
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_pins', filter: `channel_id=eq.${channel.id}` },
        () => void load())
      .subscribe()
    return () => { void sb.removeChannel(ch) }
  }, [channel.id, isMember, load, instanceId])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const roleOf = useMemo(() => {
    const m = new Map<string, string>()
    members.forEach(x => m.set(x.userId, x.role))
    return m
  }, [members])

  const filteredMentions = useMemo(() => {
    if (mentionQuery === null) return []
    const q = mentionQuery.toLowerCase()
    return members.filter(m => m.name.toLowerCase().includes(q)).slice(0, 6)
  }, [mentionQuery, members])

  function onInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value.slice(0, 4000)
    setInput(v)
    const upto = v.slice(0, e.target.selectionStart ?? v.length)
    const m = upto.match(/@([\p{L}\-]*)$/u)
    setMentionQuery(m ? m[1] : null)
  }

  function pickMention(member: CommunityMemberInfo) {
    const el = taRef.current
    const caret = el?.selectionStart ?? input.length
    const before = input.slice(0, caret).replace(/@([\p{L}\-]*)$/u, `@${firstWord(member.name)} `)
    const after = input.slice(caret)
    const next = before + after
    setInput(next.slice(0, 4000)); setMentionQuery(null)
    setTimeout(() => { el?.focus(); const pos = before.length; el?.setSelectionRange(pos, pos) }, 0)
  }

  async function send() {
    const body = input.trim()
    if ((!body && pending.length === 0) || sending || uploading) return
    setSending(true)
    const atts = pending, rTo = replyTo?.id ?? null
    setInput(''); setPending([]); setReplyTo(null); setMentionQuery(null)
    const ok = await sendChannelMessage(channel.id, body, atts, rTo)
    setSending(false)
    if (ok) void load()
    else { setInput(body); setPending(atts); setNotice('Envoi impossible.') }
  }

  function openFilePicker() {
    if (!canUpload) { setNotice('Passe Premium pour envoyer des photos et fichiers.'); return }
    fileRef.current?.click()
  }
  async function shareActivity(a: ActivityRef) {
    setSharing(false)
    const ok = await sendChannelMessage(channel.id, '', [{ type: 'activity', activity: a }])
    if (ok) void load(); else setNotice('Partage impossible.')
  }
  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []); e.target.value = ''
    if (files.length === 0) return
    setNotice(null); setUploading(true)
    for (const f of files.slice(0, 6)) {
      const att = await uploadCommunityMedia(f)
      if (att) setPending(p => [...p, att])
      else setNotice('Une pièce jointe n\'a pas pu être envoyée.')
    }
    setUploading(false)
  }

  async function react(m: CommunityMessage, emoji: string) {
    setReactFor(null)
    const mine = m.reactions.find(r => r.emoji === emoji)?.mine ?? false
    if (await toggleReaction(m.id, emoji, mine)) void load()
  }
  async function saveEdit() {
    if (!editing) return
    const t = editing.text.trim()
    const cur = editing
    setEditing(null)
    if (t && await editChannelMessage(cur.id, t)) void load()
  }
  async function remove(id: string) {
    if (typeof window !== 'undefined' && !window.confirm('Supprimer ce message ?')) return
    if (await deleteChannelMessage(id)) void load()
  }

  const canSend = (input.trim().length > 0 || pending.length > 0) && !sending && !uploading && canPost

  const header = (
    <div style={{ flexShrink: 0, padding: 'var(--space-4) var(--space-5) var(--space-3)', background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>#{channel.name}</span>
          {channel.topic && <p style={{ margin: '2px 0 0', fontFamily: FB, fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.4 }}>{channel.topic}</p>}
        </div>
        {isMember && pinnedIds.size > 0 && (
          <button onClick={() => void openPins()} title="Messages épinglés"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, height: 28, padding: '0 var(--space-2)', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)', color: 'var(--text-mid)', cursor: 'pointer', fontFamily: FB, fontSize: 11.5, fontWeight: 600 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5M9 3h6l-1 6 3 3H7l3-3-1-6z" /></svg>
            <span className="tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>{pinnedIds.size}</span>
          </button>
        )}
        {isMember && presence > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, fontFamily: FB, fontSize: 11.5, color: 'var(--text-mid)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--sport-run)' }} />
            <span className="tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>{presence}</span> en ligne
          </span>
        )}
      </div>
    </div>
  )

  if (!isMember) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--bg-card)' }}>
        {header}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)', padding: 'var(--space-8)', textAlign: 'center' }}>
          <span style={{ fontFamily: FD, fontSize: 18, fontWeight: 500, color: 'var(--text)' }}>Rejoins l&apos;espace pour lire et participer</span>
          <p style={{ margin: 0, fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', maxWidth: 360, lineHeight: 1.5 }}>
            La discussion s&apos;ouvre dès que tu fais partie de l&apos;espace. C&apos;est gratuit et instantané.
          </p>
          <button onClick={onJoin} disabled={joining}
            style={{ height: 40, padding: '0 var(--space-5)', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, cursor: joining ? 'default' : 'pointer', opacity: joining ? 0.6 : 1 }}>
            {joining ? 'Connexion…' : 'Rejoindre'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--bg-card)' }}>
      {header}

      {/* Panneau messages épinglés */}
      {showPins && (
        <div style={{ flexShrink: 0, maxHeight: 220, overflowY: 'auto', background: 'var(--bg-card2)', padding: 'var(--space-3) var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontFamily: FB, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Épinglés</span>
            <button onClick={() => setShowPins(false)} aria-label="Fermer" style={{ width: 22, height: 22, border: 'none', borderRadius: '50%', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer', fontSize: 14 }}>×</button>
          </div>
          {pinnedList === null ? (
            <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>Chargement…</p>
          ) : pinnedList.length === 0 ? (
            <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>Aucun message épinglé.</p>
          ) : pinnedList.map(pm => (
            <div key={pm.id} style={{ display: 'flex', gap: 'var(--space-2)', padding: 'var(--space-2) 0', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontFamily: FB, fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{pm.authorName}</span>
                <p style={{ margin: '2px 0 0', fontFamily: FB, fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{pm.body || (pm.attachments.length ? 'Pièce jointe' : '')}</p>
              </div>
              {canModerate && (
                <button onClick={() => void pin(pm)} aria-label="Désépingler" style={{ width: 24, height: 24, flexShrink: 0, border: 'none', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13 }}>×</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Fil */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--space-2) var(--space-4) var(--space-4)' }}>
        {loading ? <MessagesSkeleton /> : messages.length === 0 ? (
          <div style={{ padding: 'var(--space-10) var(--space-4)', textAlign: 'center' }}>
            <p style={{ fontFamily: FD, fontSize: 18, fontWeight: 500, color: 'var(--text)', margin: '0 0 var(--space-2)' }}>#{channel.name} démarre ici</p>
            <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 0 }}>Sois le premier à écrire — lance la conversation.</p>
          </div>
        ) : messages.map((m, i) => {
          const prev = messages[i - 1]
          const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString()
          const grouped = !newDay && !m.replyPreview && prev.authorId === m.authorId &&
            (new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime()) < 5 * 60_000
          const mine = m.authorId === me
          const isEditing = editing?.id === m.id
          return (
            <div key={m.id}>
              {newDay && <div style={{ textAlign: 'center', margin: 'var(--space-4) 0 var(--space-3)', fontFamily: FB, fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', textTransform: 'capitalize' }}>{fmtDay(m.createdAt)}</div>}
              <div className="comm-msg" style={{ position: 'relative', display: 'flex', gap: 'var(--space-3)', padding: grouped ? '1px var(--space-2)' : 'var(--space-2) var(--space-2) 1px', alignItems: 'flex-start', borderRadius: 'var(--r-sm)' }}>
                <div style={{ width: 36, flexShrink: 0 }}>{!grouped && <Avatar name={m.authorName} url={m.authorAvatar} />}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {m.replyPreview && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, fontFamily: FB, fontSize: 11.5, color: 'var(--text-dim)', overflow: 'hidden' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 17l-5-5 5-5M4 12h11a4 4 0 0 1 4 4v1" /></svg>
                      <span style={{ fontWeight: 600, color: 'var(--text-mid)' }}>{m.replyPreview.authorName}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.replyPreview.body || (m.replyPreview.hasAttachment ? 'Pièce jointe' : '')}</span>
                    </div>
                  )}
                  {!grouped && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', marginBottom: 2 }}>
                      <span style={{ fontFamily: FB, fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{m.authorName}</span>
                      <RoleBadge role={roleOf.get(m.authorId)} />
                      <span className="tnum" style={{ fontFamily: FB, fontSize: 10.5, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>{fmtTime(m.createdAt)}</span>
                      {m.editedAt && <span style={{ fontFamily: FB, fontSize: 10, color: 'var(--text-dim)' }}>(modifié)</span>}
                    </div>
                  )}
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      <textarea value={editing.text} onChange={e => setEditing({ id: m.id, text: e.target.value.slice(0, 4000) })} autoFocus
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void saveEdit() } if (e.key === 'Escape') setEditing(null) }}
                        style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 40, background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 'var(--space-2) var(--space-3)', fontFamily: FB, fontSize: 13.5, color: 'var(--text)', outline: 'none' }} />
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button onClick={() => void saveEdit()} style={{ height: 30, padding: '0 var(--space-4)', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Enregistrer</button>
                        <button onClick={() => setEditing(null)} style={{ height: 30, padding: '0 var(--space-3)', border: 'none', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--text-mid)', fontFamily: FB, fontSize: 12.5, cursor: 'pointer' }}>Annuler</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {m.body && <Body text={m.body} />}
                      {m.attachments.length > 0 && <Attachments items={m.attachments} me={me} />}
                      {m.reactions.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                          {m.reactions.map(r => (
                            <button key={r.emoji} onClick={() => void react(m, r.emoji)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 26, padding: '0 8px', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', background: r.mine ? 'var(--primary-dim)' : 'var(--surface-neutral)', outline: r.mine ? '1px solid var(--primary)' : 'none', fontFamily: FB, fontSize: 12 }}>
                              <span>{r.emoji}</span>
                              <span className="tnum" style={{ color: r.mine ? 'var(--primary)' : 'var(--text-mid)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{r.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Barre d'actions au survol */}
                {!isEditing && (
                  <div className="comm-actions" style={{ position: 'absolute', top: -10, right: 8, display: 'flex', gap: 2, padding: 3, borderRadius: 'var(--r-sm)', background: 'var(--bg-elev)', boxShadow: 'var(--shadow-card)' }}>
                    <ActionBtn label="Réagir" onClick={() => setReactFor(reactFor === m.id ? null : m.id)}>
                      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 14a3.5 3.5 0 0 0 7 0" /><path d="M9 9h.01M15 9h.01" />
                    </ActionBtn>
                    <ActionBtn label="Répondre" onClick={() => { setReplyTo({ id: m.id, authorName: m.authorName }); taRef.current?.focus() }}>
                      <path d="M9 17l-5-5 5-5M4 12h11a4 4 0 0 1 4 4v1" />
                    </ActionBtn>
                    {canModerate && (
                      <ActionBtn label={pinnedIds.has(m.id) ? 'Désépingler' : 'Épingler'} onClick={() => void pin(m)}>
                        <path d="M12 17v5M9 3h6l-1 6 3 3H7l3-3-1-6z" />
                      </ActionBtn>
                    )}
                    {mine && (
                      <ActionBtn label="Éditer" onClick={() => setEditing({ id: m.id, text: m.body })}>
                        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                      </ActionBtn>
                    )}
                    {(mine || canModerate) && (
                      <ActionBtn label="Supprimer" onClick={() => void remove(m.id)}>
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                      </ActionBtn>
                    )}
                  </div>
                )}

                {/* Popover de réaction rapide */}
                {reactFor === m.id && (
                  <div style={{ position: 'absolute', top: 18, right: 8, zIndex: 5, display: 'flex', gap: 2, padding: 4, borderRadius: 'var(--r-md)', background: 'var(--bg-elev)', boxShadow: 'var(--shadow)' }}>
                    {QUICK_REACTIONS.map(e => (
                      <button key={e} onClick={() => void react(m, e)} style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 'var(--r-sm)', fontSize: 17 }}>{e}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div style={{ flexShrink: 0, padding: 'var(--space-2) var(--space-5) var(--space-4)', background: 'var(--bg-card)', position: 'relative' }}>
        {notice && <p style={{ margin: '0 0 var(--space-2)', fontFamily: FB, fontSize: 12, color: 'var(--text-mid)' }}>{notice}</p>}

        {/* Autocomplétion mentions */}
        {mentionQuery !== null && filteredMentions.length > 0 && (
          <div style={{ position: 'absolute', bottom: 'calc(100% - var(--space-2))', left: 'var(--space-5)', right: 'var(--space-5)', maxWidth: 320, zIndex: 6, background: 'var(--bg-elev)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
            {filteredMentions.map(mem => (
              <button key={mem.userId} onClick={() => pickMention(mem)}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', width: '100%', padding: 'var(--space-2) var(--space-3)', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: FB }}>
                <Avatar name={mem.name} url={mem.avatar} size={24} />
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{mem.name}</span>
              </button>
            ))}
          </div>
        )}

        {replyTo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', padding: '6px var(--space-3)', borderRadius: 'var(--r-sm)', background: 'var(--bg-card2)' }}>
            <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)' }}>Réponse à <strong style={{ color: 'var(--text)' }}>{replyTo.authorName}</strong></span>
            <button onClick={() => setReplyTo(null)} aria-label="Annuler la réponse" style={{ marginLeft: 'auto', width: 20, height: 20, border: 'none', borderRadius: '50%', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer', fontSize: 14 }}>×</button>
          </div>
        )}

        {(pending.length > 0 || uploading) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            {pending.map((a, i) => <PendingChip key={a.url} att={a} onRemove={() => setPending(p => p.filter((_, j) => j !== i))} />)}
            {uploading && <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', alignSelf: 'center' }}>Envoi…</span>}
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple style={{ display: 'none' }} onChange={handleFiles} />
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-1)', background: 'var(--input-bg)', borderRadius: 'var(--r-lg)', padding: 'var(--space-1) var(--space-2)' }}>
          <IconBtn label="Photo, fichier…" onClick={openFilePicker} disabled={!canPost}>
            <path d="M12 5v14M5 12h14" />
          </IconBtn>
          <IconBtn label="Partager une activité" onClick={() => canPost && setSharing(true)} disabled={!canPost}>
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </IconBtn>
          <textarea ref={taRef} value={input} onChange={onInputChange}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && mentionQuery === null) { e.preventDefault(); void send() } }}
            placeholder={`Écrire dans #${channel.name}…`} rows={1} disabled={!canPost}
            style={{ flex: 1, resize: 'none', border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontFamily: FB, fontSize: 13.5, lineHeight: 1.5, maxHeight: 140, padding: 'var(--space-2) var(--space-1)' }} />
          {micSupported && (
            <button type="button" onClick={() => { if (!isListening) voiceBase.current = input; toggleMic() }} disabled={!canPost}
              aria-label={isListening ? 'Arrêter la dictée' : 'Dicter'} title={isListening ? 'Arrêter la dictée' : 'Dicter'}
              className={isListening ? 'mic-listening' : undefined}
              style={{ width: 36, height: 36, flexShrink: 0, border: 'none', borderRadius: 'var(--r-sm)', background: 'transparent', color: isListening ? 'var(--charge-hard)' : 'var(--text-mid)', cursor: canPost ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 19v3" /></svg>
            </button>
          )}
          <button onClick={() => void send()} disabled={!canSend} aria-label="Envoyer"
            style={{ width: 36, height: 36, flexShrink: 0, border: 'none', borderRadius: 'var(--r-sm)', background: canSend ? 'var(--primary)' : 'var(--surface-neutral)', color: canSend ? 'var(--on-primary)' : 'var(--text-dim)', cursor: canSend ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
          </button>
        </div>
      </div>

      {sharing && <ShareActivitySheet onClose={() => setSharing(false)} onShare={a => void shareActivity(a)} />}
    </div>
  )
}

// Badge de rôle à côté du nom d'auteur (owner/admin/coach). 'member' → rien.
function RoleBadge({ role }: { role?: string }) {
  if (!role || role === 'member') return null
  const label = role === 'owner' ? 'Créateur' : role === 'coach' ? 'Coach' : 'Modo'
  const accent = role === 'owner' || role === 'coach'
  return (
    <span style={{ fontFamily: FB, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 'var(--r-sm)', color: accent ? 'var(--primary)' : 'var(--text-mid)', background: accent ? 'var(--primary-dim)' : 'var(--surface-neutral)' }}>{label}</span>
  )
}

function ActionBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      style={{ width: 28, height: 28, border: 'none', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
    </button>
  )
}
function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
      style={{ width: 36, height: 36, flexShrink: 0, border: 'none', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--text-mid)', cursor: disabled ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
    </button>
  )
}

function Attachments({ items, me }: { items: CommunityAttachment[]; me: string | null }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
      {items.map(a => a.type === 'activity' && a.activity ? (
        <ActivityCard key={a.activity.id} activity={a.activity} me={me} />
      ) : a.type === 'image' ? (
        <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', lineHeight: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.url} alt={a.name} style={{ maxWidth: 320, maxHeight: 320, width: 'auto', height: 'auto', borderRadius: 'var(--r-md)', objectFit: 'cover', background: 'var(--surface-neutral)' }} />
        </a>
      ) : (
        <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', maxWidth: 280, padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)', color: 'var(--text)', textDecoration: 'none', fontFamily: FB, fontSize: 12.5 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--text-mid)' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
        </a>
      ))}
    </div>
  )
}

function PendingChip({ att, onRemove }: { att: CommunityAttachment; onRemove: () => void }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', height: 44, padding: att.type === 'image' ? 0 : '0 var(--space-3)', borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)', overflow: 'hidden' }}>
      {att.type === 'image'
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={att.url} alt={att.name} style={{ width: 44, height: 44, objectFit: 'cover' }} />
        : <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>}
      <button type="button" onClick={onRemove} aria-label="Retirer" style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', border: 'none', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, lineHeight: 1 }}>×</button>
    </span>
  )
}

function MessagesSkeleton() {
  return (
    <div aria-hidden style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-4) var(--space-2)' }}>
      {[68, 82, 55, 74].map((w, i) => (
        <div key={i} style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-neutral)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <span style={{ display: 'block', width: 120, height: 11, borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)', marginBottom: 8 }} />
            <span style={{ display: 'block', width: `${w}%`, height: 12, borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
