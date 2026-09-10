'use client'
// ══════════════════════════════════════════════════════════════════════════
// Vue Communauté « type Discord », sobre (Design System).
// Desktop : rail des espaces (~56px) + colonne des canaux + fil central.
// Mobile  : vues empilées (espaces → canaux → fil), pas 3 colonnes serrées.
// Séparation par l'espace et le fond (--bg-card / --bg-card2), jamais par des
// bordures. Realtime dans ChannelChat.
// ══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { useEntitlements } from '@/hooks/useEntitlements'
import { listSpaces, joinSpace, leaveSpace, updateSpaceIcon } from '@/lib/community/spaces'
import { listChannels, createChannel, getUnreadChannelIds, getMutedChannelIds, toggleChannelMute, getPinnedChannelIds, toggleChannelPin, duplicateChannel, deleteChannel } from '@/lib/community/channels'
import { getActiveCalls } from '@/lib/community/calls'
import { uploadCommunityMedia } from '@/lib/community/messages'
import { ChannelChat } from './ChannelChat'
import { VoiceChannelSheet } from './VoiceChannelSheet'
import { EventsView } from './EventsView'
import { VoiceView } from './VoiceView'
import { useCall } from './call/CallProvider'
import { CreateSpaceSheet } from './CreateSpaceSheet'
import { CreateChannelSheet } from './CreateChannelSheet'
import { ChannelContextMenu } from './ChannelContextMenu'
import { ChannelEditSheet } from './ChannelEditSheet'
import { InviteSheet } from './InviteSheet'
import { MessagesView } from '@/components/coach/MessagesView'
import { CommunityManageSheet } from './CommunityManageSheet'
import { DiscoverSheet } from './DiscoverSheet'
import { SpaceBadge } from './SpaceBadge'
import type { CommunitySpace, CommunityChannel } from '@/types/community'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
type MobileView = 'home' | 'chat'

export function CommunityView() {
  const { t } = useI18n()
  const ent = useEntitlements()
  const call = useCall()
  const [spaces, setSpaces] = useState<CommunitySpace[]>([])
  const [loadingSpaces, setLoadingSpaces] = useState(true)
  const [spaceId, setSpaceId] = useState<string | null>(null)
  const [channels, setChannels] = useState<CommunityChannel[]>([])
  const [loadingChannels, setLoadingChannels] = useState(false)
  const [channelId, setChannelId] = useState<string | null>(null)
  const [isNarrow, setIsNarrow] = useState(false)
  const [mView, setMView] = useState<MobileView>('home')
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd')
  const [panel, setPanel] = useState<'chat' | 'events' | 'call'>('chat')

  // Vue IMMERSIVE (mobile uniquement) : quand un salon TEXTUEL est ouvert, on
  // masque le chrome de l'app (boutons du haut + barre à bulles du bas) façon
  // Discord. On le signale au shell via un attribut body + un événement.
  useEffect(() => {
    const immersive = isNarrow && mView === 'chat' && panel === 'chat'
    try {
      if (immersive) document.body.setAttribute('data-immersive', '1')
      else document.body.removeAttribute('data-immersive')
      window.dispatchEvent(new CustomEvent('thw:immersive', { detail: immersive }))
    } catch { /* ignore */ }
    return () => {
      try { document.body.removeAttribute('data-immersive'); window.dispatchEvent(new CustomEvent('thw:immersive', { detail: false })) } catch { /* ignore */ }
    }
  }, [isNarrow, mView, panel])
  const [joining, setJoining] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showDiscover, setShowDiscover] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [voiceSheetCh, setVoiceSheetCh] = useState<{ id: string; name: string } | null>(null)
  const commSwipe = useRef<{ x: number; y: number } | null>(null)
  const [unread, setUnread] = useState<Set<string>>(new Set())
  const [muted, setMuted] = useState<Set<string>>(new Set())
  const [pinned, setPinned] = useState<Set<string>>(new Set())
  const [activeCalls, setActiveCalls] = useState<Record<string, number>>({})
  const [menuChannel, setMenuChannel] = useState<CommunityChannel | null>(null)
  const [editChannelState, setEditChannelState] = useState<CommunityChannel | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  // Mode « messages » (messagerie privée intégrée à la communauté, façon Discord).
  const [msgMode, setMsgMode] = useState(false)
  const [dmUser, setDmUser] = useState<string | null>(null)
  const exitMessages = () => { setMsgMode(false); setDmUser(null) }
  // Ouverture d'une conversation depuis « Message » d'un membre.
  useEffect(() => {
    const h = (e: Event) => { const id = (e as CustomEvent).detail?.userId as string | undefined; setDmUser(id ?? null); setMsgMode(true) }
    window.addEventListener('thw:community-dm', h as EventListener)
    return () => window.removeEventListener('thw:community-dm', h as EventListener)
  }, [])
  // Ancienne page /messages (supprimée) → /community?dm=… : ouvre le mode messages.
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search)
      if (p.has('dm')) { const v = p.get('dm') || ''; setMsgMode(true); setDmUser(v && v !== '1' ? v : null) }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const f = () => setIsNarrow(mq.matches); f(); mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])

  const loadSpaces = useCallback(async (preferId?: string) => {
    const list = await listSpaces()
    setSpaces(list)
    setLoadingSpaces(false)
    setSpaceId(prev => {
      const keep = preferId ?? prev
      if (keep && list.some(s => s.id === keep)) return keep
      return list[0]?.id ?? null
    })
  }, [])
  useEffect(() => { void loadSpaces() }, [loadSpaces])

  // Auto-adhésion à l'espace « maison » (THW Communauté) à la 1re visite, pour
  // que la page ne soit jamais vide — le reste se rejoint via la recherche.
  const autoJoinedRef = useRef(false)
  useEffect(() => {
    if (autoJoinedRef.current || loadingSpaces) return
    const home = spaces.find(s => s.slug === 'thw-communaute' && s.kind === 'official')
    if (home && !home.isMember) {
      autoJoinedRef.current = true
      void joinSpace(home.id).then(ok => { if (ok) void loadSpaces(home.id) })
    }
  }, [spaces, loadingSpaces, loadSpaces])

  // Appel actif non réduit (ex. « Agrandir » depuis la bulle) → ouvre son canal
  // en vue plein écran.
  useEffect(() => {
    if (!call.active || call.minimized || !call.channelId) return
    if (channelId === call.channelId && panel === 'call') return
    if (channels.some(c => c.id === call.channelId)) {
      setChannelId(call.channelId); setPanel('call')
      if (isNarrow) { setDir('fwd'); setMView('chat') }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.active, call.minimized, call.channelId, channels])

  const loadChannels = useCallback(async (sid: string) => {
    setLoadingChannels(true)
    const list = await listChannels(sid)
    setChannels(list)
    setLoadingChannels(false)
    setChannelId(prev => (prev && list.some(c => c.id === prev) ? prev : list[0]?.id ?? null))
    void getUnreadChannelIds(list.map(c => c.id)).then(setUnread)
    void getMutedChannelIds().then(setMuted)
    void getPinnedChannelIds().then(setPinned)
  }, [])

  const doToggleMute = useCallback(async (channelId: string) => {
    const wasMuted = muted.has(channelId)
    setMuted(prev => { const n = new Set(prev); if (wasMuted) n.delete(channelId); else n.add(channelId); return n })
    await toggleChannelMute(channelId, wasMuted)
  }, [muted])
  useEffect(() => { if (spaceId) void loadChannels(spaceId) }, [spaceId, loadChannels])

  // « X en appel » par canal : sondage léger de LiveKit tant qu'un espace est ouvert.
  useEffect(() => {
    if (!spaceId) { setActiveCalls({}); return }
    let alive = true
    const tick = () => { void getActiveCalls(spaceId).then(c => { if (alive) setActiveCalls(c) }) }
    tick()
    const iv = setInterval(tick, 8000)
    return () => { alive = false; clearInterval(iv) }
  }, [spaceId, call.active, call.showingFull])

  // Un canal ouvert / lu n'est plus « non-lu ».
  const markRead = useCallback((cid: string) => {
    setUnread(prev => { if (!prev.has(cid)) return prev; const n = new Set(prev); n.delete(cid); return n })
  }, [])

  const space = useMemo(() => spaces.find(s => s.id === spaceId) ?? null, [spaces, spaceId])
  const channel = useMemo(() => channels.find(c => c.id === channelId) ?? null, [channels, channelId])

  function goSpaces() { setDir('back'); setMView('home') }
  function selectSpace(id: string) {
    // Mobile façon Discord : le rail des espaces reste visible, on ne change que
    // la colonne des canaux (on reste sur « home »).
    setMsgMode(false); setDmUser(null)
    setSpaceId(id); setChannelId(null); setPanel('chat')
  }
  function selectChannel(id: string) {
    // Salon VOCAL → on ENTRE directement dans l'appel (façon Discord : un tap =
    // on est dans le salon vocal). Salon TEXTUEL → ouvre la discussion.
    const ch = channels.find(c => c.id === id)
    if (ch?.kind === 'voice') { joinVoice(ch.id, ch.name, { muted: false, cam: false }); return }
    setChannelId(id); markRead(id); setPanel('chat')
    if (isNarrow) { setDir('fwd'); setMView('chat') }
  }
  function openChannelChat(id: string) {
    setChannelId(id); markRead(id); setPanel('chat')
    if (isNarrow) { setDir('fwd'); setMView('chat') }
  }
  function joinVoice(id: string, name: string, opts: { muted: boolean; cam: boolean }) {
    setChannelId(id); setPanel('call')
    call.start({ channelId: id }, `#${name}`, opts)
    if (isNarrow) { setDir('fwd'); setMView('chat') }
  }
  function selectEvents() {
    setPanel('events')
    if (isNarrow) { setDir('fwd'); setMView('chat') }
  }
  function selectCall() {
    setPanel('call')
    if (channel) call.start({ channelId: channel.id }, `#${channel.name}`)
    if (isNarrow) { setDir('fwd'); setMView('chat') }
  }

  const doJoin = useCallback(async () => {
    if (!space || joining) return
    setJoining(true)
    const ok = await joinSpace(space.id)
    if (ok) await loadSpaces(space.id)
    setJoining(false)
  }, [space, joining, loadSpaces])

  const doLeave = useCallback(async () => {
    if (!space || space.myRole === 'owner') return
    const ok = await leaveSpace(space.id)
    if (ok) await loadSpaces(space.id)
  }, [space, loadSpaces])

  const doCreateChannel = useCallback(async (name: string, kind: 'text' | 'voice', isPrivate: boolean) => {
    if (!space) return
    const created = await createChannel(space.id, name, kind, { isPrivate })
    if (created) { await loadChannels(space.id); selectChannel(created.id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space, loadChannels])

  // ── Actions du menu contextuel d'un salon (appui long) ──
  const doTogglePin = useCallback(async (cid: string) => {
    const was = pinned.has(cid)
    setPinned(prev => { const n = new Set(prev); was ? n.delete(cid) : n.add(cid); return n })
    await toggleChannelPin(cid, was)
  }, [pinned])

  const doDuplicateChannel = useCallback(async (cid: string) => {
    if (!space) return
    const created = await duplicateChannel(cid)
    if (created) await loadChannels(space.id)
  }, [space, loadChannels])

  const doDeleteChannel = useCallback(async (cid: string) => {
    if (!space) return
    if (await deleteChannel(cid)) {
      if (channelId === cid) setChannelId(null)
      await loadChannels(space.id)
    }
  }, [space, channelId, loadChannels])

  const canManage = !!space && (space.myRole === 'owner' || space.myRole === 'admin')

  const doSetLogo = useCallback(async (file: File) => {
    if (!space) return
    const att = await uploadCommunityMedia(file)
    if (att?.url && await updateSpaceIcon(space.id, att.url)) await loadSpaces(space.id)
  }, [space, loadSpaces])

  // ── Sous-vues ──────────────────────────────────────────────────────────
  const rail = (
    <SpaceRail
      spaces={spaces} activeId={spaceId} loading={loadingSpaces} messagesActive={msgMode}
      onMessages={() => setMsgMode(m => { const n = !m; if (n) setDmUser(null); return n })}
      onSelect={selectSpace} onCreate={() => setShowCreate(true)} onDiscover={() => setShowDiscover(true)}
    />
  )

  // Messagerie privée intégrée (coach + contacts + groupes), façon Discord.
  const messagesPane = (
    <div style={{ height: '100%', minHeight: 0, background: 'var(--bg-card)', paddingTop: isNarrow ? 'env(safe-area-inset-top)' : 0 }}>
      <MessagesView role="athlete" title={t('w1g.privateMessages')} subtitle="" initialThread={dmUser} onBack={exitMessages} />
    </div>
  )

  const channelCol = (
    <ChannelColumn
      space={space} channels={channels} activeId={channelId} loading={loadingChannels}
      isNarrow={isNarrow} joining={joining} canManage={canManage} unread={unread} muted={muted} pinned={pinned} activeCalls={activeCalls}
      canBrand={canManage && ent.community.canBrand}
      panel={panel} onEvents={selectEvents} onManage={() => setShowManage(true)}
      onSelect={selectChannel} onJoin={doJoin} onLeave={doLeave}
      onAddChannel={() => setShowCreateChannel(true)} onSetLogo={doSetLogo}
      onLongPress={(c) => setMenuChannel(c)}
      onBack={goSpaces}
    />
  )

  const eventsPane = space ? (
    <EventsView spaceId={space.id} isMember={space.isMember} canManage={canManage} isNarrow={isNarrow}
      channels={channels} onChannelsChanged={() => { if (space) void loadChannels(space.id) }}
      onBack={() => { setDir('back'); setMView('home') }} />
  ) : null

  // Appel du canal courant : chaque canal a son salon (room `comm-<channelId>`).
  // On lance/rejoint depuis l'en-tête du canal ; on y reste même seul, les autres
  // membres du canal rejoignent quand ils veulent.
  const callPane = channel && space ? (
    <VoiceView title={`#${channel.name}`} target={{ channelId: channel.id }} isMember={space.isMember} isNarrow={isNarrow}
      onBack={() => setPanel('chat')} />
  ) : null

  const chat = channel && space ? (
    <ChannelChat
      channel={channel} isMember={space.isMember} canPost={space.isMember}
      canUpload={space.isMember && ent.community.canUploadFiles}
      canModerate={canManage}
      isMuted={muted.has(channel.id)} onToggleMute={() => doToggleMute(channel.id)}
      onCall={selectCall}
      onJoin={doJoin} joining={joining} onRead={markRead}
    />
  ) : (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--bg-card)', color: 'var(--text-dim)', fontFamily: FB, fontSize: 13 }}>
      {loadingChannels ? '' : t('w1g.chooseChannel')}
    </div>
  )

  const centerPane = panel === 'events' ? eventsPane : panel === 'call' ? callPane : chat

  const chatWithBack = panel === 'events' ? eventsPane : panel === 'call' ? callPane : (
    // Vue immersive : le chrome de l'app est masqué → on réserve nous-mêmes
    // l'encoche (safe-area). Le bouton retour est DANS l'en-tête du salon
    // (ChannelChat, en-tête mobile) via la prop onBack.
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, paddingTop: 'env(safe-area-inset-top)' }}>
      {channel && space ? (
        <ChannelChat
          channel={channel} isMember={space.isMember} canPost={space.isMember}
          canUpload={space.isMember && ent.community.canUploadFiles}
          canModerate={canManage}
          isMuted={muted.has(channel.id)} onToggleMute={() => doToggleMute(channel.id)}
          onCall={selectCall}
          onJoin={doJoin} joining={joining} onRead={markRead}
          onBack={() => { setDir('back'); setMView('home') }}
        />
      ) : (
        <>
          <button onClick={() => { setDir('back'); setMView('home') }} style={backBar}>
            <BackIcon /> <span>{space ? space.name : t('w1g.back')}</span>
          </button>
          <div style={{ flex: 1, minHeight: 0 }}>{chat}</div>
        </>
      )}
    </div>
  )

  // ── Rendu ──────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', fontFamily: FB }}>
      {isNarrow ? (
        // data-hswipe : dans la communauté, le glissement horizontal N'OUVRE PAS
        // la sidebar principale de l'app ; il fait revenir au panneau salons/groupes.
        <div data-hswipe style={{ flex: 1, minHeight: 0, overflow: 'hidden', borderRadius: 'var(--r-lg)', background: 'var(--bg-card)', position: 'relative' }}
          onTouchStart={e => { commSwipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
          onTouchEnd={e => {
            const s = commSwipe.current; commSwipe.current = null; if (!s) return
            const dx = e.changedTouches[0].clientX - s.x, dy = e.changedTouches[0].clientY - s.y
            // Swipe franc vers la DROITE en vue « chat » → coulisse vers les salons/groupes.
            if (dx > 55 && Math.abs(dx) > Math.abs(dy) * 1.4 && mView === 'chat' && panel !== 'call') { setDir('back'); setMView('home') }
          }}>
          {/* Mode messages (plein écran) : rail des espaces + messagerie. */}
          {msgMode ? (
            <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
              <div style={{ width: 60, flexShrink: 0, minHeight: 0, background: 'var(--bg)' }}>{rail}</div>
              <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>{messagesPane}</div>
            </div>
          ) : (
          /* Vues empilées avec transition « ouverture de page » fluide (clé = vue). */
          <div key={mView} className={dir === 'fwd' ? 'comm-slide-fwd' : 'comm-slide-back'} style={{ height: '100%', minHeight: 0 }}>
            {mView === 'home' && (
              <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
                <div style={{ width: 60, flexShrink: 0, minHeight: 0, background: 'var(--bg)' }}>{rail}</div>
                <div style={{ flex: 1, minWidth: 0, minHeight: 0, background: 'var(--bg-card2)' }}>{channelCol}</div>
              </div>
            )}
            {mView === 'chat' && chatWithBack}
          </div>
          )}
        </div>
      ) : (
        <>
          {/* Réserve la bande haute occupée par les boutons flottants du shell
              (IA / notifications / profil, position fixe top-right) pour que
              l'en-tête du canal (appel, recherche, présence…) reste visible. */}
          <div aria-hidden style={{ height: 46, flexShrink: 0 }} />
          {/* Séparation Discord-like par le FOND (jamais par des bordures, cf.
              Design System) : rail le plus sombre (--bg) → colonne salons
              (--bg-card2) → zone chat/appel la plus claire (--bg-card). */}
          {msgMode ? (
            <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '56px 1fr', overflow: 'hidden', borderRadius: 'var(--r-lg)', background: 'var(--bg-card)' }}>
              <div style={{ minHeight: 0, background: 'var(--bg)' }}>{rail}</div>
              <div style={{ minHeight: 0, background: 'var(--bg-card)' }}>{messagesPane}</div>
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '56px 248px 1fr', overflow: 'hidden', borderRadius: 'var(--r-lg)', background: 'var(--bg-card)' }}>
              <div style={{ minHeight: 0, background: 'var(--bg)' }}>{rail}</div>
              <div style={{ minHeight: 0, background: 'var(--bg-card2)' }}>{channelCol}</div>
              <div style={{ minHeight: 0, background: 'var(--bg-card)' }}>{centerPane}</div>
            </div>
          )}
        </>
      )}

      {showCreate && (
        <CreateSpaceSheet
          ent={ent.community}
          onClose={() => setShowCreate(false)}
          onCreated={(s) => { setShowCreate(false); void loadSpaces(s.id); setShowManage(true); if (isNarrow) { setDir('fwd'); setMView('home') } }}
        />
      )}

      {showCreateChannel && space && canManage && (
        <CreateChannelSheet
          onClose={() => setShowCreateChannel(false)}
          onCreate={async (name, kind, isPrivate) => { await doCreateChannel(name, kind, isPrivate) }}
        />
      )}

      {menuChannel && (
        <ChannelContextMenu
          channel={menuChannel} isPinned={pinned.has(menuChannel.id)} canManage={canManage}
          onClose={() => setMenuChannel(null)}
          onInvite={() => setInviteOpen(true)}
          onTogglePin={() => void doTogglePin(menuChannel.id)}
          onEdit={() => setEditChannelState(menuChannel)}
          onDuplicate={() => void doDuplicateChannel(menuChannel.id)}
          onDelete={() => void doDeleteChannel(menuChannel.id)}
        />
      )}

      {editChannelState && (
        <ChannelEditSheet
          channel={editChannelState} isMuted={muted.has(editChannelState.id)}
          onClose={() => setEditChannelState(null)}
          onSaved={() => { if (space) void loadChannels(space.id) }}
        />
      )}

      {inviteOpen && space && (
        <InviteSheet spaceId={space.id} spaceName={space.name} onClose={() => setInviteOpen(false)} />
      )}

      {showManage && space && canManage && (
        <CommunityManageSheet spaceId={space.id} onClose={() => setShowManage(false)}
          onDeleted={() => { setShowManage(false); void loadSpaces() }} />
      )}

      {showDiscover && (
        <DiscoverSheet
          onClose={() => setShowDiscover(false)}
          onJoined={(id) => { setShowDiscover(false); void loadSpaces(id); if (isNarrow) { setDir('fwd'); setMView('home') } }}
        />
      )}

      {voiceSheetCh && (
        <VoiceChannelSheet
          channel={voiceSheetCh}
          spaceName={space?.name}
          isMember={!!space?.isMember}
          onClose={() => setVoiceSheetCh(null)}
          onJoin={opts => joinVoice(voiceSheetCh.id, voiceSheetCh.name, opts)}
          onOpenChat={() => openChannelChat(voiceSheetCh.id)}
        />
      )}
    </div>
  )
}

// ── Rail des espaces (desktop) ──────────────────────────────────────────────
function SpaceRail({ spaces, activeId, loading, messagesActive, onMessages, onSelect, onCreate, onDiscover }: {
  spaces: CommunitySpace[]; activeId: string | null; loading: boolean; messagesActive: boolean
  onMessages: () => void; onSelect: (id: string) => void; onCreate: () => void; onDiscover: () => void
}) {
  const { t } = useI18n()
  return (
    <div data-guide="comm-spaces" style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-3) 0' }}>
      {/* Messages privés — tout en haut : ouvre la messagerie DANS la communauté. */}
      <button onClick={onMessages} title={t('w1g.privateMessages')} aria-label={t('w1g.privateMessages')}
        style={{ width: 44, height: 44, borderRadius: 'var(--r-lg)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: messagesActive ? 'var(--primary)' : 'var(--surface-neutral)', color: messagesActive ? 'var(--on-primary)' : 'var(--text)', cursor: 'pointer', flexShrink: 0 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
      </button>
      <span aria-hidden style={{ width: 24, height: 1, background: 'var(--border)', flexShrink: 0, margin: '2px 0' }} />
      {loading ? (
        [0, 1, 2, 3].map(i => <span key={i} style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', background: 'var(--surface-neutral)' }} />)
      ) : spaces.map(s => {
        const active = activeId === s.id
        return (
          <div key={s.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <span style={{ position: 'absolute', left: 0, width: 3, height: active ? 26 : 0, borderRadius: '0 3px 3px 0', background: 'var(--primary)', transition: 'height 0.16s ease' }} />
            <button onClick={() => onSelect(s.id)} title={s.name} aria-label={s.name}
              style={{ width: 44, height: 44, border: 'none', padding: 0, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--r-md)' }}>
              <SpaceBadge space={s} size={44} active={active} />
            </button>
          </div>
        )
      })}
      <button onClick={onDiscover} title={t('w1g.searchGroup')} aria-label={t('w1g.searchGroup')}
        style={{ width: 44, height: 44, borderRadius: 'var(--r-lg)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-neutral)', color: 'var(--text-mid)', marginTop: 'var(--space-1)' }}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      </button>
      <button onClick={onCreate} title={t('w1g.createSpace')} aria-label={t('w1g.createSpace')}
        style={{ width: 44, height: 44, borderRadius: 'var(--r-lg)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-neutral)', color: 'var(--primary)', marginTop: 'var(--space-1)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </div>
  )
}

// ── Colonne des canaux ──────────────────────────────────────────────────────
function ChannelColumn({ space, channels, activeId, loading, isNarrow, joining, canManage, canBrand, unread, muted, pinned, activeCalls, panel, onEvents, onManage, onSelect, onJoin, onLeave, onAddChannel, onSetLogo, onLongPress, onBack }: {
  space: CommunitySpace | null; channels: CommunityChannel[]; activeId: string | null; loading: boolean
  isNarrow: boolean; joining: boolean; canManage: boolean; canBrand: boolean; unread: Set<string>; muted: Set<string>; pinned: Set<string>; activeCalls: Record<string, number>
  panel: 'chat' | 'events' | 'call'; onEvents: () => void; onManage: () => void
  onSelect: (id: string) => void; onJoin: () => void; onLeave: () => void; onAddChannel: () => void; onSetLogo: (file: File) => void; onLongPress: (c: CommunityChannel) => void; onBack: () => void
}) {
  const { t } = useI18n()
  const logoRef = useRef<HTMLInputElement>(null)
  // Appui long (mobile) / clic droit (desktop) → menu d'actions du salon.
  const lpRef = useRef<{ timer: ReturnType<typeof setTimeout> | null; fired: boolean }>({ timer: null, fired: false })
  if (!space) {
    return <div style={{ padding: 'var(--space-6)', color: 'var(--text-dim)', fontFamily: FB, fontSize: 13 }}>—</div>
  }
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* En-tête d'espace */}
      <div data-guide="comm-space-header" style={{ flexShrink: 0, padding: 'var(--space-4) var(--space-4) var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {canBrand ? (
            <>
              <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onSetLogo(f) }} />
              <button onClick={() => logoRef.current?.click()} title={t('w1g.changeLogo')} aria-label={t('w1g.changeLogo')}
                style={{ position: 'relative', border: 'none', padding: 0, background: 'transparent', cursor: 'pointer', borderRadius: 'var(--r-md)', lineHeight: 0 }}>
                <SpaceBadge space={space} size={34} />
                <span style={{ position: 'absolute', right: -3, bottom: -3, width: 16, height: 16, borderRadius: '50%', background: 'var(--primary)', color: 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px var(--bg-card2)' }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                </span>
              </button>
            </>
          ) : null /* le logo est déjà affiché dans le rail des espaces → pas de doublon */}
          <span style={{ fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{space.name}</span>
          {canManage && (
            <button onClick={onManage} title={t('w1g.manageSpace')} aria-label={t('w1g.manageSpace')}
              style={{ width: 30, height: 30, flexShrink: 0, border: 'none', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
            </button>
          )}
        </div>
        <div className="tnum" style={{ fontFamily: FB, fontSize: 11.5, color: 'var(--text-dim)', marginTop: 'var(--space-1)', fontVariantNumeric: 'tabular-nums' }}>
          {t(space.memberCount > 1 ? 'w1g.membersPlural' : 'w1g.memberSingular', { n: space.memberCount })}{space.kind === 'official' ? t('w1g.officialSuffix') : ''}
        </div>
        {space.description && (
          <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', margin: 'var(--space-2) 0 0', lineHeight: 1.45 }}>{space.description}</p>
        )}
        <div style={{ marginTop: 'var(--space-3)' }}>
          {!space.isMember ? (
            <button onClick={onJoin} disabled={joining} style={joinBtn}>{joining ? t('w1g.connecting') : t('w1g.join')}</button>
          ) : space.myRole !== 'owner' ? (
            <button onClick={onLeave} style={leaveBtn}>{t('w1g.leave')}</button>
          ) : (
            <span style={{ fontFamily: FB, fontSize: 11.5, fontWeight: 600, color: 'var(--primary)' }}>{t('w1g.yourSpace')}</span>
          )}
        </div>
      </div>

      {/* Raccourci Événements */}
      <div style={{ flexShrink: 0, padding: '0 var(--space-2) var(--space-2)' }}>
        <button data-guide="comm-events" onClick={onEvents}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', borderRadius: 'var(--r-sm)', padding: 'var(--space-2) var(--space-3)', minHeight: 36, background: panel === 'events' ? 'var(--surface-neutral)' : 'transparent', fontFamily: FB }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-dim)', flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
          <span style={{ flex: 1, fontSize: 13.5, fontWeight: panel === 'events' ? 600 : 500, color: panel === 'events' ? 'var(--text)' : 'var(--text-mid)' }}>{t('w1g.events')}</span>
        </button>
      </div>

      {/* Liste des canaux */}
      <div data-guide="comm-channels" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 var(--space-2) var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-2) var(--space-3)' }}>
          <span style={{ fontFamily: FB, fontSize: 10.5, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('w1g.channels')}</span>
          {canManage && (
            <button onClick={onAddChannel} aria-label={t('w1g.addChannel')} title={t('w1g.addChannel')}
              style={{ width: 22, height: 22, borderRadius: 'var(--r-sm)', border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          )}
        </div>
        {loading ? (
          [0, 1, 2, 3].map(i => <span key={i} style={{ display: 'block', height: 34, borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)', margin: '0 var(--space-2) var(--space-2)' }} />)
        ) : (() => {
          // Salons regroupés par type (façon Discord) : textuels et vocaux, chacun
          // dans son compartiment visuel distinct.
          const renderChan = (c: typeof channels[number]) => {
            const active = activeId === c.id
            const isMuted = muted.has(c.id)
            const isPinned = pinned.has(c.id)
            const isUnread = unread.has(c.id) && !active && !isMuted
            const startPress = () => { lpRef.current.fired = false; lpRef.current.timer = setTimeout(() => { lpRef.current.fired = true; onLongPress(c) }, 480) }
            const cancelPress = () => { if (lpRef.current.timer) { clearTimeout(lpRef.current.timer); lpRef.current.timer = null } }
            return (
              <button key={c.id}
                onClick={() => { if (lpRef.current.fired) { lpRef.current.fired = false; return } onSelect(c.id) }}
                onContextMenu={e => { e.preventDefault(); onLongPress(c) }}
                onTouchStart={startPress} onTouchEnd={cancelPress} onTouchMove={cancelPress} onTouchCancel={cancelPress}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', borderRadius: 'var(--r-sm)', padding: 'var(--space-2) var(--space-3)', minHeight: 36, background: active ? 'var(--surface-neutral)' : 'transparent', fontFamily: FB, opacity: isMuted ? 0.5 : 1 }}>
                {c.kind === 'voice'
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-dim)', flexShrink: 0 }}><path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" /></svg>
                  : <span style={{ color: 'var(--text-dim)', fontSize: 15, lineHeight: 1 }}>#</span>}
                <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: active || isUnread ? 600 : 500, color: active || isUnread ? 'var(--text)' : 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                {isPinned && <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-dim)', flexShrink: 0 }} aria-label={t('w1g.ch.pin')}><path d="M12 17v5M9 3h6l-1 6 3 3H7l3-3-1-6z" /></svg>}
                {c.isPrivate && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-dim)', flexShrink: 0 }} aria-label={t('w1g.ch.private')}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>}
                {(activeCalls[c.id] ?? 0) > 0 && (
                  <span title={t('w1g.inCall', { n: activeCalls[c.id] })} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0, fontFamily: FB, fontSize: 10.5, fontWeight: 700, color: 'var(--sport-run)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
                    <span className="tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>{activeCalls[c.id]}</span>
                  </span>
                )}
                {isMuted && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-dim)', flexShrink: 0 }}><path d="M13.73 21a2 2 0 0 1-3.46 0M18 8a6 6 0 0 0-9.33-5M5.2 5.2A6 6 0 0 0 6 8c0 7-3 9-3 9h14M1 1l22 22" /></svg>}
                {isUnread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />}
              </button>
            )
          }
          // Salons épinglés en haut (ordre stable sinon).
          const byPin = (a: typeof channels[number], b: typeof channels[number]) => (pinned.has(b.id) ? 1 : 0) - (pinned.has(a.id) ? 1 : 0)
          const textChans = channels.filter(c => c.kind !== 'voice').sort(byPin)
          const voiceChans = channels.filter(c => c.kind === 'voice').sort(byPin)
          const group = (label: string, list: typeof channels) => list.length === 0 ? null : (
            <div style={{ marginBottom: 'var(--space-2)' }}>
              <div style={{ padding: '2px var(--space-3) 5px', fontFamily: FB, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{label}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-1)' }}>
                {list.map(renderChan)}
              </div>
            </div>
          )
          return <>{group(t('w1g.textChannels'), textChans)}{group(t('w1g.voiceChannels'), voiceChans)}</>
        })()}
      </div>

      {/* Lien croisé (règle d'interconnexion) : annuaire des coachs publics.
          La messagerie privée est intégrée (bouton en haut du rail). */}
      <div style={{ flexShrink: 0, padding: 'var(--space-3) var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <Link href="/coaches" style={crossLink}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
          {t('w1g.findCoach')}
        </Link>
      </div>
    </div>
  )
}

// ── Bits partagés ───────────────────────────────────────────────────────────
const backBar: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-2)', width: '100%', border: 'none',
  background: 'var(--bg-card)', cursor: 'pointer', padding: 'var(--space-3) var(--space-4)',
  fontFamily: FB, fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', textAlign: 'left',
}
const crossLink: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', fontFamily: FB,
  fontSize: 12, fontWeight: 500, color: 'var(--text-mid)', textDecoration: 'none',
}
const joinBtn: React.CSSProperties = {
  height: 34, padding: '0 var(--space-4)', border: 'none', borderRadius: 'var(--r-sm)',
  background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
}
const leaveBtn: React.CSSProperties = {
  height: 34, padding: '0 var(--space-4)', border: 'none', borderRadius: 'var(--r-sm)',
  background: 'var(--surface-neutral)', color: 'var(--text-mid)', fontFamily: FB, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
}
function BackIcon({ flip }: { flip?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: flip ? 'rotate(180deg)' : 'none', color: 'var(--text-dim)' }}><path d="M15 18l-6-6 6-6" /></svg>
  )
}
