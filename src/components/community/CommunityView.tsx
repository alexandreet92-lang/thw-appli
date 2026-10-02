'use client'
// ══════════════════════════════════════════════════════════════════════════
// Communauté « type Discord » — refonte mobile premium (maquettes mock8 c1/c2).
// Mobile : vue plein écran (chrome de l'app masqué) — en-tête rond retour /
//   recherche + titre centré, rangée horizontale des espaces (logos carrés
//   arrondis, actif cerclé), carte de l'espace, salons groupés (aperçu du
//   dernier message + pastille non-lus), vocal (web), puis salon / événements
//   / appel qui glissent par-dessus.
// Desktop : rail des espaces + colonne (carte + salons) + panneau central.
// Realtime : salon (ChannelChat), événements (EventsView), aperçus (ici).
// ══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Plus, Compass, Settings, Check, Hash, Volume2, Lock, Pin, BellOff, ChevronLeft, ChevronRight, CalendarDays, Video, UserPlus, LogOut, Activity, GraduationCap } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { createClient } from '@/lib/supabase/client'
import { useEntitlements } from '@/hooks/useEntitlements'
import { listSpaces, joinSpace, leaveSpace, updateSpaceIcon } from '@/lib/community/spaces'
import { listChannels, createChannel, getMutedChannelIds, toggleChannelMute, getPinnedChannelIds, toggleChannelPin, duplicateChannel, deleteChannel } from '@/lib/community/channels'
import { getActiveCalls } from '@/lib/community/calls'
import { uploadCommunityMedia } from '@/lib/community/messages'
import { listSpaceEvents } from '@/lib/community/events'
import { usePresenceCount } from '@/lib/community/presence'
import { myId } from '@/lib/community/shared'
import { ChannelChat } from './ChannelChat'
import { VoiceChannelSheet } from './VoiceChannelSheet'
import { EventsView } from './EventsView'
import { VoiceView } from './VoiceView'
import { useCall } from './call/CallProvider'
import { isNativeApp } from '@/lib/native/platform'
import { CreateSpaceSheet } from './CreateSpaceSheet'
import { CreateChannelSheet } from './CreateChannelSheet'
import { ChannelContextMenu } from './ChannelContextMenu'
import { ChannelEditSheet } from './ChannelEditSheet'
import { InviteSheet } from './InviteSheet'
import { CommunityManageSheet } from './CommunityManageSheet'
import { DiscoverSheet } from './DiscoverSheet'
import { SpaceBadge } from './SpaceBadge'
import { loadChannelDigests, digestLine, type ChannelDigest } from './channelDigest'
import {
  CmStyles, CmRound, CmCard, CmLabel, CmPill, CmSkel, CmSheet, CmRow, CmHeader, CmEmpty,
  FB, PAGE_BG, CARD_BG, SOFT_SHADOW, TNUM, stagger, useLongPress, useImmersive, rectOf, type LpRect,
} from './kit'
import type { CommunitySpace, CommunityChannel } from '@/types/community'

type MobileView = 'home' | 'chat'
type Panel = 'chat' | 'events' | 'call'

export function CommunityView() {
  const { t } = useI18n()
  const router = useRouter()
  const ent = useEntitlements()
  const call = useCall()
  const instanceId = useId()
  const [spaces, setSpaces] = useState<CommunitySpace[]>([])
  const [loadingSpaces, setLoadingSpaces] = useState(true)
  const [spaceId, setSpaceId] = useState<string | null>(null)
  const [channels, setChannels] = useState<CommunityChannel[]>([])
  const [loadingChannels, setLoadingChannels] = useState(false)
  const [channelId, setChannelId] = useState<string | null>(null)
  const [narrowState, setIsNarrow] = useState<boolean | null>(null)
  const isNarrow = narrowState === true
  const [mView, setMView] = useState<MobileView>('home')
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd')
  const [panel, setPanel] = useState<Panel>('chat')
  const [me, setMe] = useState<string | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const f = () => setIsNarrow(mq.matches); f(); mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])
  useEffect(() => { void myId().then(setMe) }, [])

  // Vue IMMERSIVE (mobile) : la communauté a son propre en-tête (maquette) →
  // on masque le chrome de l'app (boutons du haut + barre à bulles du bas).
  useImmersive(isNarrow)

  const [joining, setJoining] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showDiscover, setShowDiscover] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [spaceActions, setSpaceActions] = useState(false)
  const [voiceSheetCh, setVoiceSheetCh] = useState<{ id: string; name: string } | null>(null)
  const commSwipe = useRef<{ x: number; y: number } | null>(null)
  const [digests, setDigests] = useState<Map<string, ChannelDigest>>(new Map())
  // Dernière lecture locale par salon (ms) : un salon lu n'affiche plus de
  // pastille tant qu'aucun message plus récent n'arrive.
  const [readAt, setReadAt] = useState<Record<string, number>>({})
  const [muted, setMuted] = useState<Set<string>>(new Set())
  const [pinned, setPinned] = useState<Set<string>>(new Set())
  const [activeCalls, setActiveCalls] = useState<Record<string, number>>({})
  const [menu, setMenu] = useState<{ channel: CommunityChannel; rect: LpRect } | null>(null)
  const [editChannelState, setEditChannelState] = useState<CommunityChannel | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [eventsCount, setEventsCount] = useState<number | null>(null)

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

  const refreshDigests = useCallback((list: CommunityChannel[]) => {
    void loadChannelDigests(list.map(c => c.id)).then(setDigests)
  }, [])

  const loadChannels = useCallback(async (sid: string) => {
    setLoadingChannels(true)
    const list = await listChannels(sid)
    setChannels(list)
    setLoadingChannels(false)
    setChannelId(prev => (prev && list.some(c => c.id === prev) ? prev : list[0]?.id ?? null))
    refreshDigests(list)
    void getMutedChannelIds().then(setMuted)
    void getPinnedChannelIds().then(setPinned)
  }, [refreshDigests])
  useEffect(() => { if (spaceId) void loadChannels(spaceId) }, [spaceId, loadChannels])

  // Aperçus en direct : tout nouveau message d'un salon de l'espace rafraîchit
  // la liste (dernier message + compteur non-lus), avec un léger débounce.
  const channelIdsKey = channels.map(c => c.id).join(',')
  useEffect(() => {
    if (!channelIdsKey) return
    const ids = channelIdsKey.split(',')
    let timer: ReturnType<typeof setTimeout> | null = null
    const sb = createClient()
    const ch = sb.channel(`comm-digest-${spaceId}-${instanceId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages', filter: `channel_id=in.(${ids.slice(0, 90).join(',')})` },
        () => { if (timer) clearTimeout(timer); timer = setTimeout(() => { void loadChannelDigests(ids).then(setDigests) }, 600) })
      .subscribe()
    return () => { if (timer) clearTimeout(timer); void sb.removeChannel(ch) }
  }, [channelIdsKey, spaceId, instanceId])

  const doToggleMute = useCallback(async (cid: string) => {
    const wasMuted = muted.has(cid)
    setMuted(prev => { const n = new Set(prev); if (wasMuted) n.delete(cid); else n.add(cid); return n })
    await toggleChannelMute(cid, wasMuted)
  }, [muted])

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
    setReadAt(prev => ({ ...prev, [cid]: Date.now() }))
  }, [])

  const space = useMemo(() => spaces.find(s => s.id === spaceId) ?? null, [spaces, spaceId])
  const channel = useMemo(() => channels.find(c => c.id === channelId) ?? null, [channels, channelId])
  const online = usePresenceCount(space?.isMember ? `comm-presence-${space.id}` : null, me)

  // Compteur d'événements à venir (bouton « Événements · N »).
  useEffect(() => {
    if (!space?.isMember) { setEventsCount(null); return }
    let alive = true
    void listSpaceEvents(space.id).then(evs => {
      if (!alive) return
      const now = Date.now()
      setEventsCount(evs.filter(e => new Date(e.endsAt ?? e.startsAt).getTime() >= now).length)
    })
    return () => { alive = false }
  }, [space?.id, space?.isMember, panel])

  function goHome() { haptic('light'); setDir('back'); setMView('home') }
  function selectSpace(id: string) {
    if (id !== spaceId) haptic('light')
    if (id !== spaceId) { setChannels([]); setLoadingChannels(true) }
    setSpaceId(id); setChannelId(null); setPanel('chat'); setDigests(new Map())
  }
  function selectChannel(id: string) {
    // Salon VOCAL → on ENTRE directement dans l'appel (façon Discord). Salon
    // TEXTUEL → ouvre la discussion.
    const ch = channels.find(c => c.id === id)
    // App Store 2.1 : appels désactivés sur iOS natif (les salons vocaux sont
    // masqués de la liste ; ce garde-fou évite tout tap « mort » résiduel).
    if (ch?.kind === 'voice') { if (isNativeApp()) return; joinVoice(ch.id, ch.name, { muted: false, cam: false }); return }
    haptic('light')
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
    haptic('light')
    setPanel('events')
    if (isNarrow) { setDir('fwd'); setMView('chat') }
  }
  function selectCall() {
    if (isNativeApp()) return   // App Store 2.1 : pas d'appels sur iOS natif
    setPanel('call')
    if (channel) call.start({ channelId: channel.id }, `#${channel.name}`)
    if (isNarrow) { setDir('fwd'); setMView('chat') }
  }
  function goBackOut() {
    haptic('light')
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push('/')
  }

  const doJoin = useCallback(async () => {
    if (!space || joining) return
    setJoining(true)
    const ok = await joinSpace(space.id)
    if (ok) { haptic('success'); await loadSpaces(space.id) }
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
    setPinned(prev => { const n = new Set(prev); if (was) n.delete(cid); else n.add(cid); return n })
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

  const unreadOf = (cid: string): number => {
    const d = digests.get(cid)
    if (!d) return 0
    const r = readAt[cid]
    return r && new Date(d.at).getTime() <= r ? 0 : d.unread
  }

  // ── Sous-vues ──────────────────────────────────────────────────────────
  const spaceCard = space ? (
    <SpaceCard key={`card-${space.id}`} space={space} online={online} joining={joining} canManage={canManage}
      canBrand={canManage && ent.community.canBrand} eventsCount={eventsCount} eventsActive={panel === 'events' && !isNarrow}
      onJoin={() => void doJoin()} onMember={() => setSpaceActions(true)} onEvents={selectEvents}
      onManage={() => setShowManage(true)} onSetLogo={f => void doSetLogo(f)} />
  ) : null

  const channelList = space ? (
    <ChannelLists key={`list-${space.id}`} channels={channels} loading={loadingChannels} activeId={isNarrow ? null : (panel === 'chat' ? channelId : null)}
      canManage={canManage} digests={digests} unreadOf={unreadOf} muted={muted} pinned={pinned} activeCalls={activeCalls}
      onSelect={selectChannel} onAdd={() => setShowCreateChannel(true)}
      onLongPress={(c, el) => setMenu({ channel: c, rect: rectOf(el) })} />
  ) : null

  const crossLinks = (
    <div className="cm-in" style={{ ...stagger(6), marginTop: 22 }}>
      <CmCard style={{ overflow: 'hidden' }}>
        <Link href="/coaches" className="cm-row" style={linkRow(true)}>
          <span style={iconTile}><GraduationCap size={18} strokeWidth={2} /></span>
          <span style={{ flex: 1, minWidth: 0 }}>{t('w1g.findCoach').replace(/\s*→\s*$/, '')}</span>
          <ChevronRight size={18} strokeWidth={2} color="var(--text-dim)" />
        </Link>
        <Link href="/feed" className="cm-row" style={linkRow(false)}>
          <span style={iconTile}><Activity size={18} strokeWidth={2} /></span>
          <span style={{ flex: 1, minWidth: 0 }}>{t('cm.feedLink')}</span>
          <ChevronRight size={18} strokeWidth={2} color="var(--text-dim)" />
        </Link>
      </CmCard>
    </div>
  )

  const homeBody = loadingSpaces ? <HomeSkeleton /> : !space ? (
    <CmEmpty icon={<Compass size={28} strokeWidth={1.8} />} title={t('cm.noSpaceTitle')} body={t('cm.noSpaceBody')}
      action={<CmPill variant="primary" onClick={() => setShowDiscover(true)}><Search size={17} strokeWidth={2.2} />{t('w1g.searchGroup')}</CmPill>} />
  ) : (
    <>
      {spaceCard}
      {channelList}
      {crossLinks}
    </>
  )

  const eventsPane = space ? (
    <EventsView spaceId={space.id} isMember={space.isMember} canManage={canManage} isNarrow={isNarrow}
      channels={channels} onChannelsChanged={() => { if (space) void loadChannels(space.id) }}
      onBack={goHome} />
  ) : null

  // Appel du canal courant : chaque canal a son salon (room `comm-<channelId>`).
  const callPane = channel && space ? (
    <div style={{ height: '100%', minHeight: 0, paddingTop: isNarrow ? 'env(safe-area-inset-top)' : 0, background: 'var(--bg-card)' }}>
      <VoiceView title={`#${channel.name}`} target={{ channelId: channel.id }} isMember={space.isMember} isNarrow={isNarrow}
        onBack={() => { if (isNarrow) goHome(); else setPanel('chat') }} />
    </div>
  ) : null

  const chat = channel && space ? (
    <ChannelChat
      channel={channel} isMember={space.isMember} canPost={space.isMember}
      canUpload={space.isMember && ent.community.canUploadFiles}
      canModerate={canManage}
      isMuted={muted.has(channel.id)} onToggleMute={() => void doToggleMute(channel.id)}
      onCall={selectCall}
      onJoin={() => void doJoin()} joining={joining} onRead={markRead}
      onBack={isNarrow ? goHome : undefined}
    />
  ) : (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: isNarrow ? PAGE_BG : CARD_BG }}>
      {isNarrow && <CmHeader left={<CmRound onClick={goHome} label={t('w1g.back')}><ChevronLeft size={22} strokeWidth={2.2} /></CmRound>} title={space?.name ?? ''} />}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!loadingChannels && <CmEmpty icon={<Hash size={28} strokeWidth={2} />} title={t('w1g.chooseChannel')} />}
      </div>
    </div>
  )

  const centerPane = panel === 'events' ? eventsPane : panel === 'call' ? callPane : chat

  const overlays = (
    <>
      {showCreate && (
        <CreateSpaceSheet
          ent={ent.community}
          onClose={() => setShowCreate(false)}
          onCreated={(s) => { setShowCreate(false); void loadSpaces(s.id); setShowManage(true); if (isNarrow) { setDir('back'); setMView('home') } }}
        />
      )}

      {showCreateChannel && space && canManage && (
        <CreateChannelSheet
          onClose={() => setShowCreateChannel(false)}
          onCreate={async (name, kind, isPrivate) => { await doCreateChannel(name, kind, isPrivate) }}
        />
      )}

      {menu && (
        <ChannelContextMenu
          channel={menu.channel} rect={menu.rect} isPinned={pinned.has(menu.channel.id)} canManage={canManage}
          digest={digests.get(menu.channel.id) ?? null} unread={unreadOf(menu.channel.id)} isMuted={muted.has(menu.channel.id)}
          onClose={() => setMenu(null)}
          onInvite={() => setInviteOpen(true)}
          onTogglePin={() => void doTogglePin(menu.channel.id)}
          onToggleMute={() => void doToggleMute(menu.channel.id)}
          onEdit={() => setEditChannelState(menu.channel)}
          onDuplicate={() => void doDuplicateChannel(menu.channel.id)}
          onDelete={() => void doDeleteChannel(menu.channel.id)}
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
        <CommunityManageSheet spaceId={space.id} spaceName={space.name} onClose={() => setShowManage(false)}
          onDeleted={() => { setShowManage(false); void loadSpaces() }} />
      )}

      {showDiscover && (
        <DiscoverSheet
          onClose={() => setShowDiscover(false)}
          onJoined={(id) => { setShowDiscover(false); void loadSpaces(id); if (isNarrow) { setDir('back'); setMView('home') } }}
        />
      )}

      {spaceActions && space && (
        <SpaceActionsSheet space={space} canManage={canManage} eventsCount={eventsCount}
          onClose={() => setSpaceActions(false)}
          onInvite={() => setInviteOpen(true)} onManage={() => setShowManage(true)} onEvents={selectEvents}
          onLeave={() => void doLeave()} />
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
    </>
  )

  // ── Rendu ──────────────────────────────────────────────────────────────
  // Avant montage (rendu serveur) : aucun choix de mise en page → pas de flash.
  if (narrowState === null) return <div style={{ height: '100%', minHeight: 0 }} />

  if (isNarrow) {
    const viewKey = mView === 'home' ? 'home' : `chat-${panel}`
    return (
      // data-hswipe : le glissement horizontal N'OUVRE PAS la sidebar de l'app ;
      // un glissement franc vers la droite fait revenir à l'accueil communauté.
      <div data-hswipe style={{ position: 'fixed', inset: 0, zIndex: 3, background: PAGE_BG, overflow: 'hidden', fontFamily: FB }}
        onTouchStart={e => { commSwipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
        onTouchEnd={e => {
          const s = commSwipe.current; commSwipe.current = null; if (!s) return
          const dx = e.changedTouches[0].clientX - s.x, dy = e.changedTouches[0].clientY - s.y
          if (s.x < 40 && dx > 70 && Math.abs(dx) > Math.abs(dy) * 1.4 && mView === 'chat' && panel !== 'call') goHome()
        }}>
        <CmStyles />
        <div key={viewKey} className={dir === 'fwd' ? 'cm-push' : 'cm-back'} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: PAGE_BG }}>
          {mView === 'home' ? (
            <>
              <CmHeader
                left={<CmRound onClick={goBackOut} label={t('w1g.back')}><ChevronLeft size={22} strokeWidth={2.2} /></CmRound>}
                title={t('nav.community')}
                right={<CmRound onClick={() => setShowDiscover(true)} label={t('w1g.searchGroup')}><Search size={20} strokeWidth={2.2} /></CmRound>}
              />
              <SpacesRow spaces={spaces} activeId={spaceId} loading={loadingSpaces} onSelect={selectSpace}
                onCreate={() => setShowCreate(true)} onDiscover={() => setShowDiscover(true)} />
              <div className="cm-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 16px calc(32px + env(safe-area-inset-bottom))' }}>
                {homeBody}
              </div>
            </>
          ) : centerPane}
        </div>
        {overlays}
      </div>
    )
  }

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', fontFamily: FB }}>
      <CmStyles />
      {/* Réserve la bande haute occupée par les boutons flottants du shell. */}
      <div aria-hidden style={{ height: 46, flexShrink: 0 }} />
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '76px 320px 1fr', gap: 12, overflow: 'hidden', borderRadius: 'var(--r-lg)', background: PAGE_BG, padding: 12 }}>
        <SpaceRail spaces={spaces} activeId={spaceId} loading={loadingSpaces} onSelect={selectSpace}
          onCreate={() => setShowCreate(true)} onDiscover={() => setShowDiscover(true)} />
        <div className="cm-scroll" style={{ minHeight: 0, overflowY: 'auto', padding: '0 2px 16px' }}>
          {homeBody}
        </div>
        <div style={{ minHeight: 0, overflow: 'hidden', borderRadius: 'var(--r-lg)', background: CARD_BG, boxShadow: SOFT_SHADOW }}>{centerPane}</div>
      </div>
      {overlays}
    </div>
  )
}

// ── Rangée horizontale des espaces (mobile) ─────────────────────────────────
function SpacesRow({ spaces, activeId, loading, onSelect, onCreate, onDiscover }: {
  spaces: CommunitySpace[]; activeId: string | null; loading: boolean
  onSelect: (id: string) => void; onCreate: () => void; onDiscover: () => void
}) {
  const { t } = useI18n()
  const rowRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = rowRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeId])
  return (
    <div ref={rowRef} data-guide="comm-spaces" className="cm-scroll" style={{ flexShrink: 0, display: 'flex', gap: 14, overflowX: 'auto', padding: '6px 16px 12px', scrollSnapType: 'x proximity' }}>
      {loading ? [0, 1, 2, 3, 4].map(i => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <CmSkel h={60} w={60} r="var(--r-lg)" /><CmSkel h={10} w={44} />
        </div>
      )) : (
        <>
          {spaces.map((s, i) => (
            <SpaceTile key={s.id} space={s} active={s.id === activeId} index={i} onClick={() => onSelect(s.id)} />
          ))}
          <ActionTile index={spaces.length} label={t('cm.create')} onClick={onCreate}><Plus size={26} strokeWidth={2.4} /></ActionTile>
          <ActionTile index={spaces.length + 1} label={t('cm.discover')} onClick={onDiscover}><Compass size={24} strokeWidth={2.1} /></ActionTile>
        </>
      )}
    </div>
  )
}

function SpaceTile({ space, active, index, onClick }: { space: CommunitySpace; active: boolean; index: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} data-active={active} aria-pressed={active} aria-label={space.name} title={space.name}
      className="cm-btn cm-press cm-in" style={{ ...stagger(index), flexShrink: 0, width: 66, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, scrollSnapAlign: 'start' }}>
      <span style={{ borderRadius: 'calc(var(--r-lg) + 2px)', padding: 3, boxShadow: active ? 'inset 0 0 0 2.5px var(--text)' : 'none', transition: 'box-shadow .2s ease', lineHeight: 0 }}>
        <SpaceBadge space={space} size={58} radius="var(--r-lg)" />
      </span>
      <span style={{ maxWidth: 66, fontSize: 12.5, fontWeight: active ? 800 : 650, color: active ? 'var(--text)' : 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{space.name}</span>
    </button>
  )
}

function ActionTile({ label, onClick, index, children }: { label: string; onClick: () => void; index: number; children: React.ReactNode }) {
  return (
    <button type="button" onClick={() => { haptic('light'); onClick() }} aria-label={label} title={label}
      className="cm-btn cm-press cm-in" style={{ ...stagger(index), flexShrink: 0, width: 66, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
      <span style={{ padding: 3, lineHeight: 0 }}>
        <span style={{ width: 58, height: 58, borderRadius: 'var(--r-lg)', background: 'var(--surface-chip)', color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</span>
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--text-mid)' }}>{label}</span>
    </button>
  )
}

// ── Rail vertical des espaces (desktop) ─────────────────────────────────────
function SpaceRail({ spaces, activeId, loading, onSelect, onCreate, onDiscover }: {
  spaces: CommunitySpace[]; activeId: string | null; loading: boolean
  onSelect: (id: string) => void; onCreate: () => void; onDiscover: () => void
}) {
  const { t } = useI18n()
  return (
    <div data-guide="comm-spaces" className="cm-scroll" style={{ minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '4px 0' }}>
      {loading ? [0, 1, 2, 3].map(i => <CmSkel key={i} h={52} w={52} r="var(--r-lg)" />) : spaces.map((s, i) => {
        const active = activeId === s.id
        return (
          <button key={s.id} type="button" onClick={() => onSelect(s.id)} title={s.name} aria-label={s.name} aria-pressed={active}
            className="cm-btn cm-press cm-in" style={{ ...stagger(i), borderRadius: 'calc(var(--r-lg) + 2px)', padding: 3, lineHeight: 0, boxShadow: active ? 'inset 0 0 0 2.5px var(--text)' : 'none' }}>
            <SpaceBadge space={s} size={50} radius="var(--r-lg)" />
          </button>
        )
      })}
      <button type="button" onClick={onCreate} title={t('w1g.createSpace')} aria-label={t('w1g.createSpace')} className="cm-btn cm-press"
        style={{ width: 50, height: 50, borderRadius: 'var(--r-lg)', background: 'var(--surface-chip)', color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
        <Plus size={22} strokeWidth={2.4} />
      </button>
      <button type="button" onClick={onDiscover} title={t('w1g.searchGroup')} aria-label={t('w1g.searchGroup')} className="cm-btn cm-press"
        style={{ width: 50, height: 50, borderRadius: 'var(--r-lg)', background: 'var(--surface-chip)', color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Compass size={21} strokeWidth={2.1} />
      </button>
    </div>
  )
}

// ── Carte de l'espace ───────────────────────────────────────────────────────
function SpaceCard({ space, online, joining, canManage, canBrand, eventsCount, eventsActive, onJoin, onMember, onEvents, onManage, onSetLogo }: {
  space: CommunitySpace; online: number; joining: boolean; canManage: boolean; canBrand: boolean; eventsCount: number | null; eventsActive: boolean
  onJoin: () => void; onMember: () => void; onEvents: () => void; onManage: () => void; onSetLogo: (f: File) => void
}) {
  const { t } = useI18n()
  const logoRef = useRef<HTMLInputElement>(null)
  const members = t(space.memberCount > 1 ? 'w1g.membersPlural' : 'w1g.memberSingular', { n: space.memberCount.toLocaleString('fr-FR') })
  const badge = <SpaceBadge space={space} size={58} radius="var(--r-lg)" />
  return (
    <CmCard className="cm-in" style={{ padding: 16, ...stagger(0) }}>
      <div data-guide="comm-space-header" style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {canBrand ? (
          <>
            <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onSetLogo(f) }} />
            <button type="button" onClick={() => logoRef.current?.click()} title={t('w1g.changeLogo')} aria-label={t('w1g.changeLogo')}
              className="cm-btn cm-press" style={{ position: 'relative', lineHeight: 0, flexShrink: 0 }}>
              {badge}
              <span style={{ position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: '50%', background: 'var(--text)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2.5px var(--surface-card)' }}>
                <Plus size={13} strokeWidth={3} />
              </span>
            </button>
          </>
        ) : <span style={{ flexShrink: 0, lineHeight: 0 }}>{badge}</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.015em', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{space.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 5 }}>
            {space.kind === 'official' && <span style={tagStyle(true)}>{t('cm.official')}</span>}
            {!space.isPublic && <span style={tagStyle(false)}><Lock size={11} strokeWidth={2.6} />{t('w1g.private')}</span>}
          </div>
          <div style={{ ...TNUM, marginTop: 5, fontSize: 14, color: 'var(--text-mid)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span>{members}</span>
            {space.isMember && online > 0 && (<><span aria-hidden>·</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)' }} />{t('w1g.mem.nOnline', { n: online })}</span></>)}
          </div>
        </div>
        {canManage && (
          <button type="button" onClick={() => { haptic('light'); onManage() }} title={t('w1g.manageSpace')} aria-label={t('w1g.manageSpace')} className="cm-btn cm-press"
            style={{ width: 40, height: 40, marginTop: -2, marginRight: -6, borderRadius: '50%', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Settings size={21} strokeWidth={1.9} />
          </button>
        )}
      </div>
      {space.description && (
        <p style={{ margin: '14px 0 0', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.5 }}>{space.description}</p>
      )}
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        {!space.isMember ? (
          <CmPill variant="primary" onClick={onJoin} disabled={joining} style={{ flex: 1 }}>{joining ? t('w1g.connecting') : t('w1g.join')}</CmPill>
        ) : (
          <CmPill variant="chip" onClick={() => { haptic('light'); onMember() }} style={{ flex: 1 }}>
            <Check size={17} strokeWidth={2.6} />{space.myRole === 'owner' ? t('w1g.yourSpace') : t('w3e.member')}
          </CmPill>
        )}
        <span data-guide="comm-events" style={{ flex: 1, display: 'flex' }}>
          <CmPill variant={eventsActive ? 'dark' : 'chip'} onClick={onEvents} style={{ flex: 1 }}>
            <span>{t('w1g.events')}</span>
            {eventsCount !== null && eventsCount > 0 && <span style={TNUM}>· {eventsCount}</span>}
          </CmPill>
        </span>
      </div>
    </CmCard>
  )
}

function tagStyle(accent: boolean): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 'var(--r-sm)', fontSize: 12.5, fontWeight: 800,
    background: accent ? 'var(--primary-dim)' : 'var(--surface-chip)', color: accent ? 'var(--primary)' : 'var(--text-mid)' }
}

// ── Listes de salons ────────────────────────────────────────────────────────
function ChannelLists({ channels, loading, activeId, canManage, digests, unreadOf, muted, pinned, activeCalls, onSelect, onAdd, onLongPress }: {
  channels: CommunityChannel[]; loading: boolean; activeId: string | null; canManage: boolean
  digests: Map<string, ChannelDigest>; unreadOf: (id: string) => number; muted: Set<string>; pinned: Set<string>; activeCalls: Record<string, number>
  onSelect: (id: string) => void; onAdd: () => void; onLongPress: (c: CommunityChannel, el: HTMLElement) => void
}) {
  const { t } = useI18n()
  const byPin = (a: CommunityChannel, b: CommunityChannel) => (pinned.has(b.id) ? 1 : 0) - (pinned.has(a.id) ? 1 : 0)
  const textChans = channels.filter(c => c.kind !== 'voice').sort(byPin)
  // App Store 2.1 : sur l'app native iOS, les salons vocaux sont masqués.
  const voiceChans = isNativeApp() ? [] : channels.filter(c => c.kind === 'voice').sort(byPin)
  const addBtn = canManage ? (
    <button type="button" onClick={() => { haptic('light'); onAdd() }} aria-label={t('w1g.addChannel')} title={t('w1g.addChannel')} className="cm-btn cm-press"
      style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-chip)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -6, marginBottom: -6 }}>
      <Plus size={17} strokeWidth={2.4} />
    </button>
  ) : undefined
  return (
    <div data-guide="comm-channels">
      <CmLabel right={addBtn}>{t('cm.salons')}</CmLabel>
      {loading ? (
        <CmCard style={{ padding: '6px 16px' }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 0' }}>
              <CmSkel h={22} w={22} /><div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}><CmSkel h={14} w="45%" /><CmSkel h={12} w="75%" /></div>
            </div>
          ))}
        </CmCard>
      ) : textChans.length === 0 ? (
        <CmCard style={{ padding: 18, fontSize: 14, color: 'var(--text-mid)', textAlign: 'center' }}>{t('cm.noChannel')}</CmCard>
      ) : (
        <CmCard style={{ overflow: 'hidden' }}>
          {textChans.map((c, i) => (
            <ChannelRow key={c.id} c={c} index={i} first={i === 0} active={activeId === c.id} digest={digests.get(c.id) ?? null}
              unread={unreadOf(c.id)} isMuted={muted.has(c.id)} isPinned={pinned.has(c.id)} inCall={activeCalls[c.id] ?? 0}
              onSelect={() => onSelect(c.id)} onLongPress={el => onLongPress(c, el)} />
          ))}
        </CmCard>
      )}
      {voiceChans.length > 0 && (
        <>
          <CmLabel>{t('cm.vocal')}</CmLabel>
          <CmCard style={{ overflow: 'hidden' }}>
            {voiceChans.map((c, i) => (
              <ChannelRow key={c.id} c={c} index={textChans.length + i} first={i === 0} active={false} digest={null}
                unread={0} isMuted={muted.has(c.id)} isPinned={pinned.has(c.id)} inCall={activeCalls[c.id] ?? 0}
                onSelect={() => onSelect(c.id)} onLongPress={el => onLongPress(c, el)} />
            ))}
          </CmCard>
        </>
      )}
    </div>
  )
}

function ChannelRow({ c, index, first, active, digest, unread, isMuted, isPinned, inCall, onSelect, onLongPress }: {
  c: CommunityChannel; index: number; first: boolean; active: boolean; digest: ChannelDigest | null; unread: number
  isMuted: boolean; isPinned: boolean; inCall: number; onSelect: () => void; onLongPress: (el: HTMLElement) => void
}) {
  const { t } = useI18n()
  const lp = useLongPress(onLongPress)
  const voice = c.kind === 'voice'
  const showUnread = unread > 0 && !isMuted && !active
  const sub = voice ? (inCall > 0 ? t('w1g.inCall', { n: inCall }) : t('cm.voiceJoinHint')) : digestLine(digest, c, t)
  return (
    <button type="button" {...lp.handlers} onClick={() => { if (lp.consume()) return; onSelect() }}
      className="cm-btn cm-row cm-in cm-noselect"
      style={{ ...stagger(index, 80), display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 64, padding: '11px 16px', boxSizing: 'border-box', textAlign: 'left',
        borderTop: first ? 'none' : '1px solid var(--border)', background: active ? 'var(--surface-chip)' : undefined, opacity: isMuted ? 0.55 : 1 }}>
      <span aria-hidden style={{ width: 26, flexShrink: 0, display: 'flex', justifyContent: 'center', color: showUnread ? 'var(--text)' : 'var(--text-mid)' }}>
        {voice ? <Volume2 size={21} strokeWidth={2} /> : <Hash size={22} strokeWidth={2.4} />}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16.5, fontWeight: showUnread ? 800 : 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
          {isPinned && <Pin size={13} strokeWidth={2.2} color="var(--text-dim)" style={{ flexShrink: 0 }} aria-label={t('w1g.ch.pin')} />}
          {c.isPrivate && <Lock size={13} strokeWidth={2.2} color="var(--text-dim)" style={{ flexShrink: 0 }} aria-label={t('w1g.ch.private')} />}
        </span>
        {sub && <span style={{ display: 'block', marginTop: 2, fontSize: 14, color: showUnread ? 'var(--text)' : 'var(--text-mid)', fontWeight: showUnread ? 550 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>}
      </span>
      {inCall > 0 && !voice && (
        <span title={t('w1g.inCall', { n: inCall })} style={{ ...TNUM, display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0, fontSize: 12, fontWeight: 800, color: 'var(--success)' }}>
          <Video size={14} strokeWidth={2.2} />{inCall}
        </span>
      )}
      {isMuted && <BellOff size={16} strokeWidth={2} color="var(--text-dim)" style={{ flexShrink: 0 }} />}
      {showUnread && (
        <span key={unread} className="cm-pop" style={{ ...TNUM, flexShrink: 0, minWidth: 26, height: 24, padding: '0 8px', boxSizing: 'border-box', borderRadius: 'var(--r-pill)', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 13, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  )
}

// ── Feuille d'actions de l'espace (bouton « Membre ») ───────────────────────
function SpaceActionsSheet({ space, canManage, eventsCount, onClose, onInvite, onManage, onEvents, onLeave }: {
  space: CommunitySpace; canManage: boolean; eventsCount: number | null; onClose: () => void
  onInvite: () => void; onManage: () => void; onEvents: () => void; onLeave: () => void
}) {
  const { t } = useI18n()
  const [confirmLeave, setConfirmLeave] = useState(false)
  return (
    <CmSheet onClose={onClose} title={space.name} sub={t(space.memberCount > 1 ? 'w1g.membersPlural' : 'w1g.memberSingular', { n: space.memberCount })}>
      {close => (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 16px' }}>
            <SpaceBadge space={space} size={72} radius="var(--r-lg)" />
          </div>
          <CmCard style={{ overflow: 'hidden' }}>
            <CmRow first icon={<span style={iconTile}><UserPlus size={18} strokeWidth={2} /></span>} title={t('w1g.ch.inviteTitle')}
              right={<ChevronRight size={18} color="var(--text-dim)" />} onClick={() => { onInvite(); close() }} />
            <CmRow icon={<span style={iconTile}><CalendarDays size={18} strokeWidth={2} /></span>} title={t('w1g.events')}
              right={<span style={{ ...TNUM, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-mid)', fontSize: 15 }}>{eventsCount ? eventsCount : ''}<ChevronRight size={18} color="var(--text-dim)" /></span>}
              onClick={() => { onEvents(); close() }} />
            {canManage && (
              <CmRow icon={<span style={iconTile}><Settings size={18} strokeWidth={2} /></span>} title={t('w1g.manageSpace')}
                right={<ChevronRight size={18} color="var(--text-dim)" />} onClick={() => { onManage(); close() }} />
            )}
          </CmCard>
          {space.myRole !== 'owner' && (
            <CmCard style={{ overflow: 'hidden', marginTop: 14 }}>
              <CmRow first danger icon={<span style={{ ...iconTile, color: 'var(--danger)', background: 'var(--danger-soft)' }}><LogOut size={18} strokeWidth={2} /></span>}
                title={confirmLeave ? t('cm.leaveConfirm') : t('cm.leaveSpace')}
                onClick={() => { if (!confirmLeave) { haptic('medium'); setConfirmLeave(true); return } onLeave(); close() }} />
            </CmCard>
          )}
        </>
      )}
    </CmSheet>
  )
}

// ── Squelette de l'accueil ──────────────────────────────────────────────────
function HomeSkeleton() {
  return (
    <div aria-hidden>
      <CmCard style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <CmSkel h={58} w={58} r="var(--r-lg)" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}><CmSkel h={18} w="60%" /><CmSkel h={13} w="35%" /><CmSkel h={13} w="50%" /></div>
        </div>
        <CmSkel h={13} style={{ marginTop: 16 }} /><CmSkel h={13} w="70%" style={{ marginTop: 8 }} />
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}><CmSkel h={44} r="var(--r-pill)" /><CmSkel h={44} r="var(--r-pill)" /></div>
      </CmCard>
      <CmSkel h={12} w={70} style={{ margin: '24px 4px 12px' }} />
      <CmCard style={{ padding: '6px 16px' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 0' }}>
            <CmSkel h={22} w={22} /><div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}><CmSkel h={14} w="45%" /><CmSkel h={12} w="75%" /></div>
          </div>
        ))}
      </CmCard>
    </div>
  )
}

// ── Bits partagés ───────────────────────────────────────────────────────────
const iconTile: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 'var(--r-sm)', background: 'var(--surface-chip)', color: 'var(--text)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}
function linkRow(first: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, padding: '10px 16px', textDecoration: 'none', color: 'var(--text)',
    fontFamily: FB, fontSize: 16, fontWeight: 650, borderTop: first ? 'none' : '1px solid var(--border)',
  }
}
