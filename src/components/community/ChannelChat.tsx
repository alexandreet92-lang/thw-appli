'use client'
// ══════════════════════════════════════════════════════════════════════════
// Salon — messagerie moderne (maquette mock8 c2). En-tête rond retour · #nom +
// « X en ligne » (→ membres) · ⋯ (recherche, épinglés, membres, sourdine).
// Messages : avatars, noms, heure, réponses, réactions en pastilles ; mes
// messages en bulles à droite. Appui long (mobile) / clic droit / survol
// (desktop) → menu « verre » : réagir, répondre, copier, éditer, épingler,
// signaler, supprimer. Composeur façon IA (carte blanche : +, Activité,
// Séance, micro, envoyer) avec @mentions. Envoi optimiste (la bulle monte),
// défilement fluide vers le bas, Realtime (messages, réactions, épinglés,
// accusés de lecture). Tokens uniquement.
// ══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import {
  ChevronLeft, MoreHorizontal, Search, Pin, PinOff, Users, Bell, BellOff, Hash, Plus, Activity, Dumbbell, Mic, ArrowUp, ArrowDown,
  Reply, Copy, Pencil, Flag, Trash2, Smile, X, FileText, Check,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { createClient } from '@/lib/supabase/client'
import {
  getChannelMessages, sendChannelMessage, editChannelMessage, deleteChannelMessage, uploadCommunityMedia, searchChannelMessages,
} from '@/lib/community/messages'
import { markChannelRead } from '@/lib/community/channels'
import { toggleReaction, QUICK_REACTIONS } from '@/lib/community/reactions'
import { getPinnedIds, getPinnedMessages, togglePin } from '@/lib/community/pins'
import { listSpaceMembers } from '@/lib/community/spaces'
import { usePresenceCount, usePresenceIds } from '@/lib/community/presence'
import { MembersSheet } from './MembersSheet'
import { MemberProfileSheet } from './MemberProfileSheet'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import { useKeyboardInset } from '@/hooks/useKeyboardInset'
import { myId } from '@/lib/community/shared'
import { reportMessage, getSpaceSettings, hasAcceptedRules, acceptRules } from '@/lib/community/moderation'
import { enrichActivity } from '@/lib/community/activities'
import { ShareActivitySheet } from './ShareActivitySheet'
import { ShareSessionSheet } from './ShareSessionSheet'
import { ActivityCard } from './ActivityCard'
import { SessionCard } from './SessionCard'
import {
  CmStyles, CmRound, CmHeader, CmAvatar, CmEmpty, CmPill, CmSkel, CmSheet, CmChip, CmToast, GlassMenu,
  FB, PAGE_BG, CARD_BG, SOFT_SHADOW, TNUM, stagger, useLongPress, useNarrow, rectOf, type GlassEntry, type LpRect,
} from './kit'
import type { LibrarySession } from '@/lib/community/sessions'
import type { CommunityChannel, CommunityMessage, CommunityAttachment, CommunityMemberInfo, ActivityRef } from '@/types/community'

// « Vu par » : dernier-lu de chaque membre (renvoyé par /api/community/channel-reads).
interface ChannelRead { userId: string; lastReadAt: string; name: string; avatar: string | null }
type Tr = (k: string, v?: Record<string, string | number>) => string

function fmtTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}
function fmtDay(iso: string, t: Tr): string {
  try {
    const d = new Date(iso), today = new Date(), y = new Date(today); y.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return t('w4c.feed_today')
    if (d.toDateString() === y.toDateString()) return t('w4c.feed_yesterday')
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  } catch { return '' }
}
const firstWord = (s: string) => s.trim().split(/\s+/)[0] ?? s
const sameGroup = (a: CommunityMessage | undefined, b: CommunityMessage): boolean =>
  !!a && !b.replyPreview && a.authorId === b.authorId &&
  new Date(a.createdAt).toDateString() === new Date(b.createdAt).toDateString() &&
  (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) < 5 * 60_000

// Corps d'un message avec les @mentions surlignées (accent discret).
function Body({ text, size = 16 }: { text: string; size?: number }) {
  const parts = text.split(/(@[\p{L}][\p{L}\-]{1,30})/gu)
  return (
    <p style={{ margin: 0, fontFamily: FB, fontSize: size, color: 'var(--text)', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {parts.map((p, i) => p.startsWith('@')
        ? <span key={i} style={{ color: 'var(--primary)', fontWeight: 700 }}>{p}</span>
        : <span key={i}>{p}</span>)}
    </p>
  )
}

export function ChannelChat({
  channel, isMember, canPost, canUpload, canModerate, isMuted, onToggleMute, onCall, onJoin, joining, onRead, onBack,
}: {
  channel: CommunityChannel
  isMember: boolean
  canPost: boolean
  canUpload: boolean
  canModerate: boolean
  isMuted: boolean
  onToggleMute: () => void
  onCall: () => void
  onJoin: () => void
  joining: boolean
  onRead?: (channelId: string) => void
  /** Fourni en MOBILE (vue plein écran) : en-tête rond retour + titre centré. */
  onBack?: () => void
}) {
  void onCall // les appels se lancent depuis les salons vocaux (masqués sur iOS natif)
  const { t } = useI18n()
  const narrow = useNarrow()
  const reduce = useReducedMotion() ?? false
  const kbInset = useKeyboardInset()
  const [messages, setMessages] = useState<CommunityMessage[]>([])
  const [temps, setTemps] = useState<CommunityMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [pending, setPending] = useState<CommunityAttachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [sharingSession, setSharingSession] = useState(false)
  const [rulesGate, setRulesGate] = useState<{ required: boolean; accepted: boolean; text: string | null }>({ required: false, accepted: true, text: null })
  const [me, setMe] = useState<string | null>(null)
  const [members, setMembers] = useState<CommunityMemberInfo[]>([])
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set())
  const [showPins, setShowPins] = useState(false)
  const [pinnedList, setPinnedList] = useState<CommunityMessage[] | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<CommunityMessage[] | null>(null)
  const [replyTo, setReplyTo] = useState<{ id: string; authorName: string; body: string } | null>(null)
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [reads, setReads] = useState<ChannelRead[]>([])
  const [membersOpen, setMembersOpen] = useState(false)
  const [profile, setProfile] = useState<CommunityMemberInfo | null>(null)
  const [menu, setMenu] = useState<{ m: CommunityMessage; rect: LpRect; confirm: boolean; instant: boolean } | null>(null)
  const [moreRect, setMoreRect] = useState<LpRect | null>(null)
  const [reportFor, setReportFor] = useState<CommunityMessage | null>(null)
  const [anim, setAnim] = useState<Record<string, 'rise' | 'arrive'>>({})
  const [pop, setPop] = useState<{ key: string; n: number } | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)
  const [newBelow, setNewBelow] = useState(0)
  const [showJump, setShowJump] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const moreBtnRef = useRef<HTMLSpanElement>(null)
  const idsRef = useRef<Set<string>>(new Set())
  const knownRef = useRef<{ ch: string; ids: Set<string> } | null>(null)
  const loadedFor = useRef<string | null>(null)
  const atBottomRef = useRef(true)
  const voiceBase = useRef('')
  const instanceId = useId()
  const presence = usePresenceCount(isMember ? `comm-presence-${channel.spaceId}` : null, me)
  const onlineIds = usePresenceIds(isMember ? `comm-presence-${channel.spaceId}` : null, me)

  const { supported: micSupported, isListening, toggle: toggleMic } = useSpeechToText(
    (text) => setInput((voiceBase.current ? voiceBase.current.trimEnd() + ' ' : '') + text),
  )

  const loadReads = useCallback(async () => {
    if (!isMember) { setReads([]); return }
    try {
      const res = await fetch('/api/community/channel-reads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channelId: channel.id }),
      })
      if (!res.ok) return
      const data = (await res.json()) as { reads?: ChannelRead[] }
      setReads(data.reads ?? [])
    } catch { /* best-effort : les accusés de lecture sont optionnels */ }
  }, [channel.id, isMember])

  const load = useCallback(async () => {
    if (!isMember) { setMessages([]); setLoading(false); return }
    const [msgs, pins] = await Promise.all([getChannelMessages(channel.id), getPinnedIds(channel.id)])
    idsRef.current = new Set(msgs.map(m => m.id))
    loadedFor.current = channel.id
    setMessages(msgs); setPinnedIds(pins)
    setLoading(false)
    void markChannelRead(channel.id)
    void loadReads()
    onRead?.(channel.id)
  }, [channel.id, isMember, onRead, loadReads])

  async function pin(m: CommunityMessage) {
    const isPinned = pinnedIds.has(m.id)
    if (await togglePin(channel.spaceId, channel.id, m.id, isPinned)) { haptic('light'); void load(); if (showPins) setPinnedList(await getPinnedMessages(channel.id)) }
  }
  async function openPins() {
    setShowPins(true); setPinnedList(null)
    setPinnedList(await getPinnedMessages(channel.id))
  }
  async function runSearch(q: string) {
    setSearchQ(q)
    if (q.trim().length < 2) { setSearchResults(null); return }
    setSearchResults(await searchChannelMessages(channel.id, q))
  }

  useEffect(() => {
    setLoading(true); setReplyTo(null); setEditing(null); setShowSearch(false); setSearchQ(''); setSearchResults(null); setShowPins(false)
    setTemps([]); setAnim({}); atBottomRef.current = true; setNewBelow(0)
    void load()
  }, [load])
  useEffect(() => { void myId().then(setMe) }, [])
  useEffect(() => {
    if (!isMember) { setMembers([]); return }
    void listSpaceMembers(channel.spaceId).then(setMembers)
  }, [channel.spaceId, isMember])

  // Porte des règles : si l'espace l'exige et que je ne les ai pas acceptées.
  useEffect(() => {
    if (!isMember) { setRulesGate({ required: false, accepted: true, text: null }); return }
    let alive = true
    void (async () => {
      const cfg = await getSpaceSettings(channel.spaceId)
      if (!alive) return
      if (!cfg?.requireRulesAccept) { setRulesGate({ required: false, accepted: true, text: cfg?.rulesText ?? null }); return }
      const accepted = await hasAcceptedRules(channel.spaceId)
      if (alive) setRulesGate({ required: true, accepted, text: cfg.rulesText })
    })()
    return () => { alive = false }
  }, [channel.spaceId, isMember])

  // Append en direct : messages + réactions + épinglés + lectures (un seul canal,
  // nom unique par instance car la page est montée dans les deux shells).
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_reads', filter: `channel_id=eq.${channel.id}` },
        () => void loadReads())
      .subscribe()
    return () => { void sb.removeChannel(ch) }
  }, [channel.id, isMember, load, loadReads, instanceId])

  // Nouveaux messages : animation d'arrivée (les miens « montent »), remplacement
  // silencieux du message optimiste, défilement fluide si on est en bas.
  useEffect(() => {
    if (loading || loadedFor.current !== channel.id) return
    if (!knownRef.current || knownRef.current.ch !== channel.id) { knownRef.current = { ch: channel.id, ids: new Set(messages.map(m => m.id)) }; return }
    const known = knownRef.current.ids
    const fresh = messages.filter(m => !known.has(m.id))
    if (fresh.length === 0) return
    const next: Record<string, 'rise' | 'arrive'> = {}
    let others = 0
    const consumed = new Set<string>()
    for (const m of fresh) {
      known.add(m.id)
      if (m.authorId === me) {
        const tmp = temps.find(x => !consumed.has(x.id) && x.body.trim() === m.body.trim() && x.attachments.length === m.attachments.length)
        if (tmp) { consumed.add(tmp.id); continue }
        next[m.id] = 'rise'
      } else { next[m.id] = 'arrive'; others++ }
    }
    if (consumed.size) setTemps(prev => prev.filter(x => !consumed.has(x.id)))
    if (Object.keys(next).length) setAnim(a => ({ ...a, ...next }))
    if (others > 0 && !atBottomRef.current) setNewBelow(n => n + others)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loading])

  // Défilement : saut instantané au 1er chargement, glissé ensuite si on suit le bas.
  const firstScroll = useRef(true)
  useEffect(() => { firstScroll.current = true }, [channel.id])
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || loading) return
    if (firstScroll.current) { el.scrollTop = el.scrollHeight; firstScroll.current = false; return }
    if (atBottomRef.current) el.scrollTo({ top: el.scrollHeight, behavior: reduce ? 'auto' : 'smooth' })
  }, [messages, temps, loading, reduce])

  function onScroll() {
    const el = scrollRef.current
    if (!el) return
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight
    atBottomRef.current = dist < 90
    if (atBottomRef.current && newBelow) setNewBelow(0)
    setShowJump(dist > 320)
  }
  function scrollToBottom(quiet?: boolean) {
    const el = scrollRef.current
    if (!el) return
    if (!quiet) haptic('light')
    atBottomRef.current = true; setNewBelow(0)
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? 'auto' : 'smooth' })
  }
  function jumpTo(id: string) {
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-mid="${id}"]`)
    if (!el) { setNotice(t('cm.notLoaded')); return }
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
    setFlashId(id); setTimeout(() => setFlashId(f => (f === id ? null : f)), 1900)
  }

  const memberById = useMemo(() => {
    const m = new Map<string, CommunityMemberInfo>()
    members.forEach(x => m.set(x.userId, x))
    return m
  }, [members])

  const filteredMentions = useMemo(() => {
    if (mentionQuery === null) return []
    const q = mentionQuery.toLowerCase()
    return members.filter(m => m.userId !== me && m.name.toLowerCase().includes(q)).slice(0, 6)
  }, [mentionQuery, members, me])

  // « Vu par » : sous MON dernier message, membres dont le dernier-lu est
  // postérieur (ou égal) à ce message. Soi-même exclu.
  const lastSeen = useMemo(() => {
    if (!me) return null
    let mine: CommunityMessage | null = null
    for (let i = messages.length - 1; i >= 0; i--) { if (messages[i].authorId === me) { mine = messages[i]; break } }
    if (!mine) return null
    const at = new Date(mine.createdAt).getTime()
    const seers = reads.filter(r => r.userId !== me && new Date(r.lastReadAt).getTime() >= at)
    if (seers.length === 0) return null
    return { messageId: mine.id, seers }
  }, [messages, reads, me])

  // Hauteur auto du champ (jusqu'à ~5 lignes).
  const composerValue = editing ? editing.text : input
  useLayoutEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(140, el.scrollHeight)}px`
  }, [composerValue])

  function onInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value.slice(0, 4000)
    if (editing) { setEditing({ id: editing.id, text: v }); return }
    setInput(v)
    const upto = v.slice(0, e.target.selectionStart ?? v.length)
    const m = upto.match(/@([\p{L}\-]*)$/u)
    setMentionQuery(m ? m[1] : null)
  }

  function pickMention(member: CommunityMemberInfo) {
    haptic('light')
    const el = taRef.current
    const caret = el?.selectionStart ?? input.length
    const before = input.slice(0, caret).replace(/@([\p{L}\-]*)$/u, `@${firstWord(member.name)} `)
    const after = input.slice(caret)
    setInput((before + after).slice(0, 4000)); setMentionQuery(null)
    setTimeout(() => { el?.focus(); const pos = before.length; el?.setSelectionRange(pos, pos) }, 0)
  }

  async function send() {
    if (editing) { void saveEdit(); return }
    const body = input.trim()
    if ((!body && pending.length === 0) || sending || uploading) return
    haptic('light')
    setSending(true)
    const atts = pending, rTo = replyTo
    const me0 = me ? memberById.get(me) : undefined
    const tmp: CommunityMessage = {
      id: `tmp-${Date.now()}`, channelId: channel.id, authorId: me ?? 'me', body, createdAt: new Date().toISOString(), editedAt: null,
      replyTo: rTo?.id ?? null, attachments: atts, reactions: [],
      replyPreview: rTo ? { id: rTo.id, authorName: rTo.authorName, body: rTo.body, hasAttachment: false } : null,
      authorName: me0?.name ?? t('cm.you'), authorAvatar: me0?.avatar ?? null,
    }
    atBottomRef.current = true
    setTemps(p => [...p, tmp]); setAnim(a => ({ ...a, [tmp.id]: 'rise' }))
    setInput(''); setPending([]); setReplyTo(null); setMentionQuery(null)
    const ok = await sendChannelMessage(channel.id, body, atts, rTo?.id ?? null)
    setSending(false)
    if (ok) {
      void load()
      // Filet : un message optimiste resté orphelin disparaît après quelques secondes.
      setTimeout(() => setTemps(p => p.filter(x => x.id !== tmp.id)), 8000)
    } else {
      setTemps(p => p.filter(x => x.id !== tmp.id))
      setInput(body); setPending(atts); setNotice(t('w1g.sendFailed'))
    }
  }

  function openFilePicker() {
    if (!canUpload) { setNotice(t('w1g.premiumForFiles')); return }
    fileRef.current?.click()
  }
  async function shareActivity(a: ActivityRef) {
    setSharing(false)
    // Enrichit le snapshot (profil altimétrique) puis met en attente au-dessus du
    // champ : on peut ajouter un commentaire avant d'envoyer.
    const enriched = await enrichActivity(a)
    setPending(p => [...p, { type: 'activity', activity: enriched }])
    taRef.current?.focus()
  }
  function shareSession(s: LibrarySession) {
    setSharingSession(false)
    // On ne partage que le snapshot (sans l'id de bibliothèque, propre au partageur).
    const { id: _id, ...snapshot } = s
    void _id
    setPending(p => [...p, { type: 'session', session: snapshot }])
    taRef.current?.focus()
  }

  async function doAcceptRules() {
    const ok = await acceptRules(channel.spaceId)
    if (ok) { haptic('success'); setRulesGate(g => ({ ...g, accepted: true })) }
  }
  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []); e.target.value = ''
    if (files.length === 0) return
    setNotice(null); setUploading(true)
    for (const f of files.slice(0, 6)) {
      const att = await uploadCommunityMedia(f)
      if (att) setPending(p => [...p, att])
      else setNotice(t('w1g.attachmentFailed'))
    }
    setUploading(false)
  }

  async function react(m: CommunityMessage, emoji: string) {
    haptic('light')
    setPop(p => ({ key: `${m.id}:${emoji}`, n: (p?.n ?? 0) + 1 }))
    const mine = m.reactions.find(r => r.emoji === emoji)?.mine ?? false
    // Optimiste : la pastille change tout de suite, le Realtime confirmera.
    setMessages(prev => prev.map(x => {
      if (x.id !== m.id) return x
      const has = x.reactions.find(r => r.emoji === emoji)
      const reactions = has
        ? x.reactions.map(r => r.emoji === emoji ? { ...r, mine: !mine, count: Math.max(0, r.count + (mine ? -1 : 1)) } : r).filter(r => r.count > 0)
        : [...x.reactions, { emoji, count: 1, mine: true }]
      return { ...x, reactions }
    }))
    await toggleReaction(m.id, emoji, mine)
    void load()
  }
  async function saveEdit() {
    if (!editing) return
    const txt = editing.text.trim()
    const cur = editing
    setEditing(null)
    if (txt && await editChannelMessage(cur.id, txt)) { haptic('light'); void load() }
  }
  async function remove(id: string) {
    if (await deleteChannelMessage(id)) { haptic('medium'); void load() }
  }
  async function copyText(text: string) {
    try { await navigator.clipboard.writeText(text); setNotice(t('cm.copied')) } catch { /* ignore */ }
  }

  function openMenu(m: CommunityMessage, el: HTMLElement, instant = false) {
    if (m.id.startsWith('tmp-')) return
    setMenu({ m, rect: rectOf(el), confirm: false, instant })
  }
  function openProfile(m: CommunityMessage) {
    haptic('light')
    setProfile(memberById.get(m.authorId) ?? { userId: m.authorId, role: 'member', name: m.authorName, avatar: m.authorAvatar })
  }

  const gatedByRules = rulesGate.required && !rulesGate.accepted
  const canSend = editing
    ? editing.text.trim().length > 0
    : (input.trim().length > 0 || pending.length > 0) && !sending && !uploading && canPost && !gatedByRules
  const onlineN = Math.max(1, presence)

  // ── En-têtes ─────────────────────────────────────────────────────────────
  const onlineSub = (
    <><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)' }} /><span style={TNUM}>{t('w1g.mem.nOnline', { n: onlineN })}</span></>
  )
  const mobileHeader = (
    <CmHeader
      left={<CmRound onClick={() => onBack?.()} label={t('w1g.back')}><ChevronLeft size={22} strokeWidth={2.2} /></CmRound>}
      title={`# ${channel.name}`}
      sub={isMember ? onlineSub : undefined}
      onTitle={isMember ? () => { haptic('light'); setMembersOpen(true) } : undefined}
      right={isMember ? (
        <span ref={moreBtnRef} style={{ display: 'flex' }}>
          <CmRound onClick={() => { if (moreBtnRef.current) setMoreRect(rectOf(moreBtnRef.current)) }} label={t('cm.more')}><MoreHorizontal size={21} strokeWidth={2.2} /></CmRound>
        </span>
      ) : undefined}
    />
  )
  const deskBtn = (label: string, onClick: () => void, icon: React.ReactNode, on?: boolean) => (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="cm-btn cm-press"
      style={{ width: 38, height: 38, borderRadius: '50%', background: on ? 'var(--primary-dim)' : 'var(--surface-chip)', color: on ? 'var(--primary)' : 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {icon}
    </button>
  )
  const deskHeader = (
    <div style={{ flexShrink: 0, padding: '16px 18px 12px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>
          <Hash size={19} strokeWidth={2.5} color="var(--text-mid)" /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{channel.name}</span>
        </div>
        {channel.topic && <p style={{ margin: '3px 0 0', fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{channel.topic}</p>}
      </div>
      {isMember && (
        <>
          <button type="button" onClick={() => setMembersOpen(true)} className="cm-btn cm-press"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 12px', borderRadius: 'var(--r-pill)', background: 'var(--surface-chip)', fontSize: 13, fontWeight: 700, color: 'var(--text-mid)' }}>
            {onlineSub}
          </button>
          {deskBtn(t('w1g.search'), () => { setShowSearch(true); setSearchQ(''); setSearchResults(null) }, <Search size={17} strokeWidth={2.2} />)}
          {deskBtn(t('w1g.pinnedMessages'), () => void openPins(), <span style={{ position: 'relative', display: 'flex' }}><Pin size={17} strokeWidth={2.2} />{pinnedIds.size > 0 && <span style={{ ...TNUM, position: 'absolute', top: -9, right: -11, minWidth: 16, height: 16, padding: '0 4px', boxSizing: 'border-box', borderRadius: 'var(--r-pill)', background: 'var(--text)', color: 'var(--bg)', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{pinnedIds.size}</span>}</span>)}
          {deskBtn(isMuted ? t('w1g.unmuteNotifications') : t('w1g.mute'), onToggleMute, isMuted ? <BellOff size={17} strokeWidth={2.2} /> : <Bell size={17} strokeWidth={2.2} />, isMuted)}
        </>
      )}
    </div>
  )
  const header = onBack ? mobileHeader : deskHeader
  const bg = onBack ? PAGE_BG : CARD_BG

  if (!isMember) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: bg, fontFamily: FB }}>
        <CmStyles />
        {header}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <CmEmpty icon={<Hash size={30} strokeWidth={2.2} />} title={t('w1g.joinToRead')} body={t('w1g.joinToReadDesc')}
            action={<CmPill variant="primary" onClick={onJoin} disabled={joining}>{joining ? t('w1g.connecting') : t('w1g.join')}</CmPill>} />
        </div>
      </div>
    )
  }

  const all = temps.length ? [...messages, ...temps] : messages

  // Menus contextuels ─────────────────────────────────────────────────────
  const ic = { size: 20, strokeWidth: 1.9 }
  let msgMenu: React.ReactNode = null
  if (menu) {
    const m = menu.m
    const mine = m.authorId === me
    const close = () => setMenu(null)
    const items: GlassEntry[] = menu.confirm ? [
      { key: 'q', label: <span style={{ display: 'block', whiteSpace: 'normal', padding: '8px 0', fontSize: 14.5, fontWeight: 600, color: 'var(--text-mid)' }}>{t('w1g.deleteMessageConfirm')}</span>, onClick: () => {} },
      'sep',
      { key: 'cancel', icon: <ChevronLeft {...ic} />, label: t('w1g.cancel'), onClick: () => setMenu({ ...menu, confirm: false }) },
      { key: 'yes', icon: <Trash2 {...ic} />, label: t('w1g.delete'), danger: true, onClick: () => { close(); void remove(m.id) } },
    ] : [
      { key: 'reply', icon: <Reply {...ic} />, label: t('w1g.reply'), onClick: () => { close(); setEditing(null); setReplyTo({ id: m.id, authorName: m.authorName, body: m.body }); setTimeout(() => taRef.current?.focus(), 60) } },
      ...(m.body ? [{ key: 'copy', icon: <Copy {...ic} />, label: t('cm.copy'), onClick: () => { close(); void copyText(m.body) } }] : []),
      ...(mine && m.body ? [{ key: 'edit', icon: <Pencil {...ic} />, label: t('w1g.edit'), onClick: () => { close(); setReplyTo(null); setEditing({ id: m.id, text: m.body }); setTimeout(() => taRef.current?.focus(), 60) } }] : []),
      ...(canModerate ? [{ key: 'pin', icon: pinnedIds.has(m.id) ? <PinOff {...ic} /> : <Pin {...ic} />, label: pinnedIds.has(m.id) ? t('w1g.unpin') : t('w1g.pin'), onClick: () => { close(); void pin(m) } }] : []),
      ...(!mine ? [{ key: 'report', icon: <Flag {...ic} />, label: t('w1g.report'), onClick: () => { close(); setReportFor(m) } }] : []),
      ...((mine || canModerate) ? ['sep' as const, { key: 'del', icon: <Trash2 {...ic} />, label: t('w1g.delete'), danger: true, onClick: () => setMenu({ ...menu, confirm: true }) }] : []),
    ]
    const reactRow = menu.confirm ? undefined : (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 2, padding: '4px 10px 8px', borderBottom: '1px solid var(--cm-menu-sep)', marginBottom: 4 }}>
        {QUICK_REACTIONS.map((e, i) => {
          const on = m.reactions.find(r => r.emoji === e)?.mine
          return (
            <button key={e} type="button" onClick={() => { close(); void react(m, e) }} aria-label={e} className="cm-btn cm-press cm-in"
              style={{ ...stagger(i, 40, 26), width: 40, height: 40, borderRadius: '50%', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? 'var(--primary-dim)' : 'transparent' }}>
              {e}
            </button>
          )
        })}
      </div>
    )
    msgMenu = (
      <GlassMenu rect={menu.rect} instant={menu.instant} align={mine ? 'right' : 'left'} onClose={close} label={m.authorName} top={reactRow} items={items}
        previewRadius={mine ? 'var(--r-lg) var(--r-lg) var(--r-sm) var(--r-lg)' : 'var(--r-lg)'}
        preview={<MessagePreview m={m} mine={mine} />} />
    )
  }
  const moreMenu = moreRect ? (
    <GlassMenu rect={moreRect} align="right" instant onClose={() => setMoreRect(null)} items={[
      { key: 'search', icon: <Search {...ic} />, label: t('w1g.search'), onClick: () => { setMoreRect(null); setShowSearch(true); setSearchQ(''); setSearchResults(null) } },
      { key: 'pins', icon: <Pin {...ic} />, label: t('w1g.pinnedMessages'), trailing: pinnedIds.size > 0 ? <span style={{ ...TNUM, fontSize: 14, color: 'var(--text-mid)' }}>{pinnedIds.size}</span> : undefined, onClick: () => { setMoreRect(null); void openPins() } },
      { key: 'members', icon: <Users {...ic} />, label: t('w1g.mem.members'), onClick: () => { setMoreRect(null); setMembersOpen(true) } },
      'sep',
      { key: 'mute', icon: isMuted ? <Bell {...ic} /> : <BellOff {...ic} />, label: isMuted ? t('w1g.unmuteNotifications') : t('w1g.mute'), onClick: () => { setMoreRect(null); onToggleMute() } },
    ]} />
  ) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: bg, fontFamily: FB, position: 'relative' }}>
      <CmStyles />
      {header}

      {/* Fil — ancré en bas (près du composeur), défile normalement au-delà. */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <div ref={scrollRef} onScroll={onScroll} className="cm-scroll" style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: narrow ? '4px 16px 12px' : '8px 20px 14px' }}>
          <div style={{ marginTop: 'auto' }}>
            {loading ? <MessagesSkeleton /> : all.length === 0 ? (
              <CmEmpty icon={<Hash size={30} strokeWidth={2.2} />} title={t('w1g.channelStartsHere', { name: channel.name })} body={t('w1g.beFirstToWrite')} />
            ) : all.map((m, i) => {
              const prev = all[i - 1], next = all[i + 1]
              const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString()
              const grouped = !newDay && sameGroup(prev, m)
              const lastOfGroup = !next || !sameGroup(m, next)
              const mine = m.authorId === me || m.id.startsWith('tmp-')
              const a = anim[m.id]
              return (
                <div key={m.id}>
                  {newDay && <div className="cm-fade" style={{ textAlign: 'center', margin: '18px 0 10px', fontSize: 12.5, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'capitalize' }}>{fmtDay(m.createdAt, t)}</div>}
                  <MessageItem m={m} mine={mine} grouped={grouped} lastOfGroup={lastOfGroup} role={memberById.get(m.authorId)?.role}
                    me={me} channelId={channel.id} pinned={pinnedIds.has(m.id)} pending={m.id.startsWith('tmp-')}
                    animClass={a === 'rise' ? 'cm-rise' : a === 'arrive' ? 'cm-arrive' : undefined}
                    flash={flashId === m.id} pop={pop}
                    onLong={el => openMenu(m, el)} onMenu={el => openMenu(m, el, true)} onReact={e => void react(m, e)} onProfile={() => openProfile(m)}
                    onReply={() => { setEditing(null); setReplyTo({ id: m.id, authorName: m.authorName, body: m.body }); taRef.current?.focus() }}
                    onJumpReply={() => { if (m.replyPreview) jumpTo(m.replyPreview.id) }} />
                  {lastSeen?.messageId === m.id && <SeenBy seers={lastSeen.seers} />}
                </div>
              )
            })}
          </div>
        </div>
        {(showJump || newBelow > 0) && !loading && (
          <button type="button" onClick={() => scrollToBottom()} aria-label={t('cm.toBottom')} className="cm-btn cm-press cm-in"
            style={{ position: 'absolute', right: 16, bottom: 10, height: 40, minWidth: 40, padding: newBelow ? '0 14px 0 10px' : 0, borderRadius: 'var(--r-pill)', background: 'var(--float-bg)', color: 'var(--text)', boxShadow: 'var(--cm-float-shadow)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 800 }}>
            <ArrowDown size={18} strokeWidth={2.4} />{newBelow > 0 && <span style={TNUM}>{t('cm.newMessages', { n: newBelow })}</span>}
          </button>
        )}
      </div>

      {/* Composeur — sur mobile, remonte JUSTE au-dessus du clavier (visualViewport). */}
      <div style={{ flexShrink: 0, position: 'relative', display: 'flex', flexDirection: 'column', gap: 8, padding: narrow ? '6px 12px 0' : '6px 18px 0',
        paddingBottom: kbInset ? kbInset + 8 : narrow ? 'calc(12px + env(safe-area-inset-bottom))' : 16 }}>
        {notice && <CmToast text={notice} onDone={() => setNotice(null)} />}

        {/* Autocomplétion mentions */}
        {mentionQuery !== null && filteredMentions.length > 0 && !editing && (
          <div className="cm-menu cm-in" style={{ maxWidth: 340, padding: '6px 0', overflow: 'hidden' }}>
            {filteredMentions.map((mem, i) => (
              <button key={mem.userId} type="button" onClick={() => pickMention(mem)} className="cm-btn cm-mi cm-in"
                style={{ ...stagger(i, 0, 24), display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 46, padding: '0 14px', textAlign: 'left' }}>
                <CmAvatar name={mem.name} url={mem.avatar} seed={mem.userId} size={30} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 650, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mem.name}</span>
                {onlineIds.has(mem.userId) && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />}
              </button>
            ))}
          </div>
        )}

        {gatedByRules && (
          <div className="cm-in" style={{ padding: 14, borderRadius: 'var(--r-lg)', background: CARD_BG, boxShadow: SOFT_SHADOW }}>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {rulesGate.text?.trim() || t('w1g.rulesGateDefault')}
            </p>
            <CmPill variant="primary" full onClick={() => void doAcceptRules()}><Check size={17} strokeWidth={2.6} />{t('w1g.acceptRules')}</CmPill>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple style={{ display: 'none' }} onChange={handleFiles} />
        <div style={{ background: 'var(--surface-card)', borderRadius: 'calc(var(--r-lg) + 6px)', boxShadow: 'var(--cm-composer-shadow)', padding: '10px 10px 10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(replyTo || editing) && (
            <div className="cm-in" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 6px 6px 10px', borderRadius: 'var(--r-md)', background: 'var(--surface-chip)' }}>
              {editing ? <Pencil size={15} strokeWidth={2.2} color="var(--primary)" /> : <Reply size={15} strokeWidth={2.2} color="var(--primary)" />}
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {editing ? t('cm.editing') : <>{t('w1g.replyingTo')} <strong style={{ color: 'var(--text)' }}>{replyTo?.authorName}</strong>{replyTo?.body ? ` · ${replyTo.body}` : ''}</>}
              </span>
              <button type="button" onClick={() => { setReplyTo(null); setEditing(null) }} aria-label={t('w1g.cancelReply')} className="cm-btn cm-press"
                style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-mid)' }}>
                <X size={16} strokeWidth={2.4} />
              </button>
            </div>
          )}

          {(pending.length > 0 || uploading) && !editing && (
            <div className="cm-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingTop: 2 }}>
              {pending.map((a, i) => <PendingChip key={a.url ?? `att-${i}`} att={a} index={i} onRemove={() => setPending(p => p.filter((_, j) => j !== i))} />)}
              {uploading && <CmSkel h={52} w={52} r="var(--r-md)" style={{ flexShrink: 0 }} />}
            </div>
          )}

          <textarea ref={taRef} data-guide="comm-composer" value={composerValue} onChange={onInputChange}
            onKeyDown={e => {
              if (e.key === 'Escape' && editing) { setEditing(null); return }
              if (e.key === 'Enter' && !e.shiftKey && (mentionQuery === null || editing)) { e.preventDefault(); void send() }
            }}
            onFocus={() => { if (narrow) setTimeout(() => scrollToBottom(true), 250) }}
            placeholder={t('w1g.writeInChannel', { name: channel.name })} rows={1} disabled={!canPost}
            style={{ width: '100%', boxSizing: 'border-box', resize: 'none', border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontFamily: FB, fontSize: 16, lineHeight: 1.45, maxHeight: 140, padding: '2px 0', minHeight: 26 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button type="button" onClick={openFilePicker} disabled={!canPost || !!editing} aria-label={t('w1g.photoFile')} title={t('w1g.photoFile')} className="cm-btn cm-press"
              style={{ width: 38, height: 38, borderRadius: '50%', boxShadow: 'inset 0 0 0 1px var(--border-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', flexShrink: 0, opacity: editing ? 0.4 : 1 }}>
              <Plus size={20} strokeWidth={2.2} />
            </button>
            <div className="cm-scroll" style={{ display: 'flex', gap: 6, minWidth: 0, overflowX: 'auto' }}>
              <ComposerChip label={t('w1g.activity')} title={t('w1g.shareActivity')} disabled={!canPost || !!editing} onClick={() => setSharing(true)} icon={<Activity size={15} strokeWidth={2.2} />} />
              <ComposerChip label={t('w1g.session')} title={t('w1g.shareSession')} disabled={!canPost || !!editing} onClick={() => setSharingSession(true)} icon={<Dumbbell size={15} strokeWidth={2.2} />} />
            </div>
            <div style={{ flex: 1 }} />
            {micSupported && !editing && (
              <button type="button" onClick={() => { haptic('light'); if (!isListening) voiceBase.current = input; toggleMic() }} disabled={!canPost}
                aria-label={isListening ? t('w1g.stopDictation') : t('w1g.dictate')} title={isListening ? t('w1g.stopDictation') : t('w1g.dictate')}
                className={`cm-btn cm-press${isListening ? ' cm-mic-live' : ''}`}
                style={{ width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: isListening ? 'var(--danger)' : 'var(--text)', background: isListening ? 'var(--danger-soft)' : 'transparent' }}>
                <Mic size={20} strokeWidth={2} />
              </button>
            )}
            <button type="button" onClick={() => void send()} disabled={!canSend} aria-label={editing ? t('w1g.save') : t('w1g.send')} className="cm-btn cm-press"
              style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: canSend ? 'var(--primary)' : 'var(--surface-chip)', color: canSend ? 'var(--on-primary)' : 'var(--text-dim)',
                transform: canSend ? 'scale(1)' : 'scale(0.92)', transition: 'transform .22s cubic-bezier(.3,1.5,.5,1)' }}>
              {editing ? <Check size={20} strokeWidth={2.6} /> : <ArrowUp size={20} strokeWidth={2.5} />}
            </button>
          </div>
        </div>
      </div>

      {msgMenu}
      {moreMenu}
      {membersOpen && <MembersSheet title={`#${channel.name}`} members={members} onlineIds={onlineIds} onClose={() => setMembersOpen(false)} />}
      {profile && <MemberProfileSheet member={profile} online={onlineIds.has(profile.userId)} onClose={() => setProfile(null)} />}
      {sharing && <ShareActivitySheet onClose={() => setSharing(false)} onShare={a => void shareActivity(a)} />}
      {sharingSession && <ShareSessionSheet onClose={() => setSharingSession(false)} onShare={shareSession} />}
      {reportFor && (
        <ReportSheet onClose={() => setReportFor(null)} onSend={async (reason) => {
          const ok = await reportMessage(channel.spaceId, channel.id, reportFor.id, reason || t('w1g.reported'))
          setNotice(ok ? t('w1g.reportSent') : t('w1g.reportFailed'))
        }} />
      )}
      {showSearch && (
        <CmSheet full onClose={() => setShowSearch(false)} title={t('w1g.search')} sub={`#${channel.name}`}>
          {close => (
            <>
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <Search size={17} strokeWidth={2.2} color="var(--text-dim)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input autoFocus value={searchQ} onChange={e => void runSearch(e.target.value)} placeholder={t('w1g.searchInChannel', { name: channel.name })}
                  className="cm-input" style={{ paddingLeft: 40 }} />
              </div>
              {searchResults === null ? (
                <p style={{ fontSize: 14, color: 'var(--text-dim)', textAlign: 'center', margin: '28px 0' }}>{searchQ.trim().length >= 2 ? t('w1g.searching') : t('w1g.typeAtLeast2')}</p>
              ) : searchResults.length === 0 ? (
                <CmEmpty icon={<Search size={26} strokeWidth={2} />} title={t('w1g.noResults')} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {searchResults.map((sr, i) => (
                    <button key={sr.id} type="button" onClick={() => { close(); setTimeout(() => jumpTo(sr.id), 320) }} className="cm-btn cm-press cm-in"
                      style={{ ...stagger(i), display: 'flex', gap: 12, textAlign: 'left', padding: 14, borderRadius: 'var(--r-lg)', background: CARD_BG, boxShadow: SOFT_SHADOW }}>
                      <CmAvatar name={sr.authorName} url={sr.authorAvatar} seed={sr.authorId} size={34} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>{sr.authorName}</span>
                          <span style={{ ...TNUM, fontSize: 12, color: 'var(--text-dim)' }}>{fmtDay(sr.createdAt, t)} · {fmtTime(sr.createdAt)}</span>
                        </span>
                        <span style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: 3, fontSize: 14.5, color: 'var(--text-mid)', lineHeight: 1.4 }}>{sr.body}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </CmSheet>
      )}
      {showPins && (
        <CmSheet onClose={() => setShowPins(false)} title={t('w1g.pinnedMessages')} sub={`#${channel.name}`}>
          {close => pinnedList === null ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{[0, 1, 2].map(i => <CmSkel key={i} h={72} r="var(--r-lg)" />)}</div>
          ) : pinnedList.length === 0 ? (
            <CmEmpty icon={<Pin size={26} strokeWidth={2} />} title={t('w1g.noPinnedMessage')} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pinnedList.map((pm, i) => (
                <div key={pm.id} className="cm-in" style={{ ...stagger(i), display: 'flex', gap: 12, alignItems: 'flex-start', padding: 14, borderRadius: 'var(--r-lg)', background: CARD_BG, boxShadow: SOFT_SHADOW }}>
                  <button type="button" onClick={() => { close(); setTimeout(() => jumpTo(pm.id), 320) }} className="cm-btn" style={{ flex: 1, minWidth: 0, display: 'flex', gap: 12, textAlign: 'left' }}>
                    <CmAvatar name={pm.authorName} url={pm.authorAvatar} seed={pm.authorId} size={34} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>{pm.authorName}</span>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: 3, fontSize: 14.5, color: 'var(--text-mid)', lineHeight: 1.4 }}>{pm.body || (pm.attachments.length ? t('w1g.attachment') : '')}</span>
                    </span>
                  </button>
                  {canModerate && (
                    <button type="button" onClick={() => void pin(pm)} aria-label={t('w1g.unpin')} title={t('w1g.unpin')} className="cm-btn cm-press"
                      style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--surface-chip)', color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <PinOff size={16} strokeWidth={2.2} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CmSheet>
      )}
    </div>
  )
}

// ── Un message ──────────────────────────────────────────────────────────────
function MessageItem({ m, mine, grouped, lastOfGroup, role, me, channelId, pinned, pending, animClass, flash, pop, onLong, onMenu, onReact, onProfile, onReply, onJumpReply }: {
  m: CommunityMessage; mine: boolean; grouped: boolean; lastOfGroup: boolean; role?: string; me: string | null; channelId: string
  pinned: boolean; pending: boolean; animClass?: string; flash: boolean; pop: { key: string; n: number } | null
  onLong: (el: HTMLElement) => void; onMenu: (el: HTMLElement) => void; onReact: (emoji: string) => void; onProfile: () => void; onReply: () => void; onJumpReply: () => void
}) {
  const { t } = useI18n()
  const rowRef = useRef<HTMLDivElement>(null)
  const lp = useLongPress(onLong)
  const replyChip = m.replyPreview && (
    <button type="button" onClick={onJumpReply} className="cm-btn"
      style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: '100%', marginBottom: 4, fontSize: 12.5, color: 'var(--text-dim)', overflow: 'hidden', alignSelf: mine ? 'flex-end' : 'flex-start' }}>
      <Reply size={13} strokeWidth={2.2} style={{ flexShrink: 0 }} />
      <span style={{ fontWeight: 700, color: 'var(--text-mid)', flexShrink: 0 }}>{m.replyPreview.authorName}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.replyPreview.body || (m.replyPreview.hasAttachment ? t('w1g.attachment') : '')}</span>
    </button>
  )
  const reactions = m.reactions.length > 0 && (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
      {m.reactions.map(r => {
        const k = `${m.id}:${r.emoji}`
        return (
          <button key={r.emoji} type="button" onClick={() => onReact(r.emoji)} aria-pressed={r.mine} className="cm-btn cm-press"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px', borderRadius: 'var(--r-pill)', fontSize: 14,
              background: r.mine ? 'var(--primary-dim)' : 'var(--surface-card)', boxShadow: r.mine ? 'inset 0 0 0 1.5px var(--primary)' : SOFT_SHADOW }}>
            <span key={pop?.key === k ? pop.n : 0} className={pop?.key === k ? 'cm-pop' : undefined} style={{ display: 'inline-block' }}>{r.emoji}</span>
            <span style={{ ...TNUM, fontWeight: 800, color: r.mine ? 'var(--primary)' : 'var(--text)' }}>{r.count}</span>
          </button>
        )
      })}
    </div>
  )
  const hoverBar = !pending && (
    <div className="cm-hover-actions" style={{ position: 'absolute', top: -14, ...(mine ? { left: 4 } : { right: 4 }), display: 'flex', gap: 2, padding: 3, borderRadius: 'var(--r-pill)', background: 'var(--surface-card)', boxShadow: 'var(--cm-float-shadow)', zIndex: 2 }}>
      {[
        { l: t('w1g.react'), i: <Smile size={16} strokeWidth={2} />, f: () => { if (rowRef.current) onMenu(rowRef.current) } },
        { l: t('w1g.reply'), i: <Reply size={16} strokeWidth={2} />, f: onReply },
        { l: t('cm.more'), i: <MoreHorizontal size={16} strokeWidth={2} />, f: () => { if (rowRef.current) onMenu(rowRef.current) } },
      ].map(b => (
        <button key={b.l} type="button" onClick={b.f} aria-label={b.l} title={b.l} className="cm-btn cm-press"
          style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-mid)' }}>{b.i}</button>
      ))}
    </div>
  )
  const meta = (
    <>
      {pinned && <Pin size={11} strokeWidth={2.4} color="var(--text-dim)" />}
      {m.editedAt && <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{t('w1g.edited')}</span>}
    </>
  )

  if (mine) {
    return (
      <div data-mid={m.id} className={`cm-msg ${flash ? 'cm-flash' : ''}`} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', padding: grouped ? '3px 0 0' : '12px 0 0' }}>
        {hoverBar}
        {replyChip}
        <div ref={rowRef} {...lp.handlers} className={animClass} onClickCapture={e => { if (lp.consume()) { e.stopPropagation(); e.preventDefault() } }}
          style={{ maxWidth: '82%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, opacity: pending ? 0.7 : 1, transition: 'opacity .25s ease' }}>
          {m.body && (
            <div style={{ background: 'var(--cm-bubble)', borderRadius: 'calc(var(--r-lg) + 2px) calc(var(--r-lg) + 2px) var(--r-sm) calc(var(--r-lg) + 2px)', padding: '10px 15px' }}>
              <Body text={m.body} />
            </div>
          )}
          {m.attachments.length > 0 && <Attachments items={m.attachments} me={me} channelId={channelId} align="flex-end" />}
        </div>
        {reactions}
        {lastOfGroup && (
          <div style={{ ...TNUM, display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11.5, color: 'var(--text-dim)' }}>
            {meta}<span>{pending ? '…' : fmtTime(m.createdAt)}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div data-mid={m.id} className={`cm-msg ${flash ? 'cm-flash' : ''}`} style={{ position: 'relative', display: 'flex', gap: 10, padding: grouped ? '3px 0 0' : '14px 0 0' }}>
      {hoverBar}
      <div style={{ width: 36, flexShrink: 0 }}>
        {!grouped && (
          <button type="button" onClick={onProfile} aria-label={m.authorName} className="cm-btn cm-press" style={{ lineHeight: 0, borderRadius: '50%' }}>
            <CmAvatar name={m.authorName} url={m.authorAvatar} seed={m.authorId} size={36} />
          </button>
        )}
      </div>
      <div ref={rowRef} {...lp.handlers} className={animClass} onClickCapture={e => { if (lp.consume()) { e.stopPropagation(); e.preventDefault() } }} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {replyChip}
        {!grouped && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 2, minWidth: 0 }}>
            <button type="button" onClick={onProfile} className="cm-btn" style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{m.authorName}</button>
            <RoleBadge role={role} />
            <span style={{ ...TNUM, fontSize: 12, fontWeight: 650, color: 'var(--text-dim)', flexShrink: 0 }}>{fmtTime(m.createdAt)}</span>
            {meta}
          </div>
        )}
        {m.body && <Body text={m.body} />}
        {m.attachments.length > 0 && <Attachments items={m.attachments} me={me} channelId={channelId} align="flex-start" />}
        {reactions}
      </div>
    </div>
  )
}

/** Aperçu du message soulevé dans le menu d'appui long. */
function MessagePreview({ m, mine }: { m: CommunityMessage; mine: boolean }) {
  const { t } = useI18n()
  const att = m.attachments[0]
  const attLabel = att ? (att.type === 'activity' ? (att.activity?.title || t('w1g.activity')) : att.type === 'session' ? (att.session?.title || t('w1g.session')) : att.type === 'image' ? t('cm.photo') : (att.name || t('w1g.attachment'))) : null
  return (
    <div style={{ padding: '12px 14px', display: 'flex', gap: 10, background: mine ? 'var(--surface-chip)' : 'var(--surface-card)', minHeight: '100%', boxSizing: 'border-box' }}>
      {!mine && <CmAvatar name={m.authorName} url={m.authorAvatar} seed={m.authorId} size={32} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!mine && <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>{m.authorName}</div>}
        {m.body && <div style={{ display: '-webkit-box', WebkitLineClamp: 8, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}><Body text={m.body} size={15.5} /></div>}
        {attLabel && <div style={{ marginTop: m.body ? 6 : 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 650, color: 'var(--text-mid)' }}><FileText size={14} strokeWidth={2.2} />{attLabel}</div>}
      </div>
    </div>
  )
}

function ComposerChip({ label, title, icon, onClick, disabled }: { label: string; title: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={() => { haptic('light'); onClick() }} disabled={disabled} aria-label={title} title={title} className="cm-btn cm-press"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 12px', borderRadius: 'var(--r-pill)', boxShadow: 'inset 0 0 0 1px var(--border-mid)',
        fontSize: 13.5, fontWeight: 700, color: 'var(--text-mid)', whiteSpace: 'nowrap', flexShrink: 0, opacity: disabled ? 0.4 : 1 }}>
      {icon}{label}
    </button>
  )
}

// Badge de rôle à côté du nom d'auteur (owner/admin/coach). 'member' → rien.
function RoleBadge({ role }: { role?: string }) {
  const { t } = useI18n()
  if (!role || role === 'member') return null
  const label = role === 'owner' ? t('w1g.roleCreator') : role === 'coach' ? t('w1g.roleCoach') : t('w1g.roleMod')
  const accent = role === 'owner' || role === 'coach'
  return (
    <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 'var(--r-sm)', color: accent ? 'var(--primary)' : 'var(--text-mid)', background: accent ? 'var(--primary-dim)' : 'var(--surface-chip)' }}>{label}</span>
  )
}

// Accusés de lecture : avatars empilés sous MON dernier message (5 max + « +N »).
function SeenBy({ seers }: { seers: ChannelRead[] }) {
  const { t } = useI18n()
  const shown = seers.slice(0, 5)
  const extra = seers.length - shown.length
  return (
    <div title={seers.map(s => s.name).join(', ')} className="cm-fade" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, margin: '4px 0 2px' }}>
      <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{t('w1g.seenBy')}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        {shown.map((s, i) => (
          <span key={s.userId} style={{ marginLeft: i === 0 ? 0 : -6, borderRadius: '50%', boxShadow: '0 0 0 1.5px var(--surface-page)', position: 'relative', zIndex: shown.length - i, lineHeight: 0 }}>
            <CmAvatar name={s.name} url={s.avatar} seed={s.userId} size={16} />
          </span>
        ))}
        {extra > 0 && <span style={{ ...TNUM, marginLeft: 4, fontSize: 11, fontWeight: 700, color: 'var(--text-dim)' }}>+{extra}</span>}
      </span>
    </div>
  )
}

function Attachments({ items, me, channelId, align }: { items: CommunityAttachment[]; me: string | null; channelId: string; align: 'flex-start' | 'flex-end' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align, gap: 8, marginTop: 6, width: '100%' }}>
      {items.map((a, idx) => a.type === 'activity' && a.activity ? (
        <ActivityCard key={a.activity.id} activity={a.activity} me={me} channelId={channelId} />
      ) : a.type === 'session' && a.session ? (
        <SessionCard key={`s-${idx}`} session={a.session} />
      ) : a.type === 'image' ? (
        <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', lineHeight: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.url} alt={a.name} style={{ maxWidth: 'min(280px, 100%)', maxHeight: 300, width: 'auto', height: 'auto', borderRadius: 'var(--r-lg)', objectFit: 'cover', background: 'var(--surface-chip)', boxShadow: SOFT_SHADOW }} />
        </a>
      ) : (
        <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, maxWidth: 280, padding: '10px 14px', borderRadius: 'var(--r-lg)', background: 'var(--surface-card)', boxShadow: SOFT_SHADOW, color: 'var(--text)', textDecoration: 'none', fontFamily: FB, fontSize: 14, fontWeight: 650 }}>
          <FileText size={18} strokeWidth={2} color="var(--text-mid)" style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
        </a>
      ))}
    </div>
  )
}

function PendingChip({ att, index, onRemove }: { att: CommunityAttachment; index: number; onRemove: () => void }) {
  const { t } = useI18n()
  const label = att.type === 'session' ? (att.session?.title || t('w1g.session'))
    : att.type === 'activity' ? (att.activity?.title || t('w1g.activity'))
      : att.name
  return (
    <span className="cm-in" style={{ ...stagger(index, 0, 40), position: 'relative', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 8, height: 52, padding: att.type === 'image' ? 0 : '0 30px 0 12px', borderRadius: 'var(--r-md)', background: 'var(--surface-chip)', overflow: 'hidden', maxWidth: 220 }}>
      {att.type === 'image'
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={att.url} alt={att.name} style={{ width: 52, height: 52, objectFit: 'cover' }} />
        : (
          <>
            <span style={{ color: 'var(--text-mid)', display: 'flex', flexShrink: 0 }}>
              {att.type === 'session' ? <Dumbbell size={16} strokeWidth={2.2} /> : att.type === 'activity' ? <Activity size={16} strokeWidth={2.2} /> : <FileText size={16} strokeWidth={2.2} />}
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          </>
        )}
      <button type="button" onClick={onRemove} aria-label={t('w1g.remove')} className="cm-btn cm-press"
        style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'var(--text)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <X size={12} strokeWidth={3} />
      </button>
    </span>
  )
}

function MessagesSkeleton() {
  const rows: { mine: boolean; w: string }[] = [{ mine: false, w: '72%' }, { mine: false, w: '54%' }, { mine: true, w: '48%' }, { mine: false, w: '80%' }, { mine: true, w: '38%' }]
  return (
    <div aria-hidden style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '12px 0' }}>
      {rows.map((r, i) => r.mine ? (
        <div key={i} style={{ display: 'flex', justifyContent: 'flex-end' }}><CmSkel h={40} w={r.w} r="var(--r-lg)" /></div>
      ) : (
        <div key={i} style={{ display: 'flex', gap: 10 }}>
          <CmSkel h={36} w={36} r="50%" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}><CmSkel h={12} w={110} /><CmSkel h={14} w={r.w} /></div>
        </div>
      ))}
    </div>
  )
}

// ── Signalement (raison en puces + précision optionnelle) ──────────────────
function ReportSheet({ onClose, onSend }: { onClose: () => void; onSend: (reason: string) => Promise<void> }) {
  const { t } = useI18n()
  const reasons = [t('cm.reasonSpam'), t('cm.reasonHarass'), t('cm.reasonInappropriate'), t('cm.reasonOther')]
  const [reason, setReason] = useState<string | null>(null)
  const [detail, setDetail] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <CmSheet onClose={onClose} title={t('w1g.report')} zIndex={15600}
      footer={close => (
        <CmPill variant="primary" full height={52} disabled={!reason || busy} onClick={async () => {
          if (!reason) return
          setBusy(true); await onSend([reason, detail.trim()].filter(Boolean).join(' — ')); setBusy(false); close()
        }}>{t('w1g.send')}</CmPill>
      )}>
      <p style={{ margin: '0 4px 14px', fontSize: 14.5, color: 'var(--text-mid)', lineHeight: 1.45 }}>{t('w1g.reportPrompt')}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {reasons.map(r => <CmChip key={r} active={reason === r} onClick={() => setReason(r)}>{r}</CmChip>)}
      </div>
      <textarea value={detail} onChange={e => setDetail(e.target.value.slice(0, 400))} rows={3} placeholder={t('cm.reportDetail')} className="cm-input" style={{ resize: 'none' }} />
    </CmSheet>
  )
}
