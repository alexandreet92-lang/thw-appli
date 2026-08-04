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
import { useEntitlements } from '@/hooks/useEntitlements'
import { listSpaces, joinSpace, leaveSpace, updateSpaceIcon } from '@/lib/community/spaces'
import { listChannels, createChannel, getUnreadChannelIds, getMutedChannelIds, toggleChannelMute } from '@/lib/community/channels'
import { uploadCommunityMedia } from '@/lib/community/messages'
import { ChannelChat } from './ChannelChat'
import { EventsView } from './EventsView'
import { VoiceView } from './VoiceView'
import { CreateSpaceSheet } from './CreateSpaceSheet'
import { SpaceBadge } from './SpaceBadge'
import type { CommunitySpace, CommunityChannel } from '@/types/community'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
type MobileView = 'spaces' | 'channels' | 'chat'

export function CommunityView() {
  const ent = useEntitlements()
  const [spaces, setSpaces] = useState<CommunitySpace[]>([])
  const [loadingSpaces, setLoadingSpaces] = useState(true)
  const [spaceId, setSpaceId] = useState<string | null>(null)
  const [channels, setChannels] = useState<CommunityChannel[]>([])
  const [loadingChannels, setLoadingChannels] = useState(false)
  const [channelId, setChannelId] = useState<string | null>(null)
  const [isNarrow, setIsNarrow] = useState(false)
  const [mView, setMView] = useState<MobileView>('spaces')
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd')
  const [panel, setPanel] = useState<'chat' | 'events'>('chat')
  const [joining, setJoining] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [unread, setUnread] = useState<Set<string>>(new Set())
  const [muted, setMuted] = useState<Set<string>>(new Set())

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

  const loadChannels = useCallback(async (sid: string) => {
    setLoadingChannels(true)
    const list = await listChannels(sid)
    setChannels(list)
    setLoadingChannels(false)
    setChannelId(prev => (prev && list.some(c => c.id === prev) ? prev : list[0]?.id ?? null))
    void getUnreadChannelIds(list.map(c => c.id)).then(setUnread)
    void getMutedChannelIds().then(setMuted)
  }, [])

  const doToggleMute = useCallback(async (channelId: string) => {
    const wasMuted = muted.has(channelId)
    setMuted(prev => { const n = new Set(prev); if (wasMuted) n.delete(channelId); else n.add(channelId); return n })
    await toggleChannelMute(channelId, wasMuted)
  }, [muted])
  useEffect(() => { if (spaceId) void loadChannels(spaceId) }, [spaceId, loadChannels])

  // Un canal ouvert / lu n'est plus « non-lu ».
  const markRead = useCallback((cid: string) => {
    setUnread(prev => { if (!prev.has(cid)) return prev; const n = new Set(prev); n.delete(cid); return n })
  }, [])

  const space = useMemo(() => spaces.find(s => s.id === spaceId) ?? null, [spaces, spaceId])
  const channel = useMemo(() => channels.find(c => c.id === channelId) ?? null, [channels, channelId])

  function goSpaces() { setDir('back'); setMView('spaces') }
  function selectSpace(id: string) {
    setSpaceId(id); setChannelId(null)
    if (isNarrow) { setDir('fwd'); setMView('channels') }
  }
  function selectChannel(id: string) {
    setChannelId(id); markRead(id); setPanel('chat')
    if (isNarrow) { setDir('fwd'); setMView('chat') }
  }
  function selectEvents() {
    setPanel('events')
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

  const doCreateChannel = useCallback(async (name: string, kind: 'text' | 'voice') => {
    if (!space) return
    const created = await createChannel(space.id, name, kind)
    if (created) { await loadChannels(space.id); selectChannel(created.id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space, loadChannels])

  const canManage = !!space && (space.myRole === 'owner' || space.myRole === 'admin')

  const doSetLogo = useCallback(async (file: File) => {
    if (!space) return
    const att = await uploadCommunityMedia(file)
    if (att?.url && await updateSpaceIcon(space.id, att.url)) await loadSpaces(space.id)
  }, [space, loadSpaces])

  // ── Sous-vues ──────────────────────────────────────────────────────────
  const rail = (
    <SpaceRail
      spaces={spaces} activeId={spaceId} loading={loadingSpaces}
      onSelect={selectSpace} onCreate={() => setShowCreate(true)}
    />
  )

  const channelCol = (
    <ChannelColumn
      space={space} channels={channels} activeId={channelId} loading={loadingChannels}
      isNarrow={isNarrow} joining={joining} canManage={canManage} unread={unread} muted={muted}
      canBrand={canManage && ent.community.canBrand}
      canVoice={canManage && ent.community.canVoice}
      panel={panel} onEvents={selectEvents}
      onSelect={selectChannel} onJoin={doJoin} onLeave={doLeave}
      onCreateChannel={doCreateChannel} onSetLogo={doSetLogo}
      onBack={goSpaces}
    />
  )

  const eventsPane = space ? (
    <EventsView spaceId={space.id} isMember={space.isMember} canManage={canManage} isNarrow={isNarrow}
      onBack={() => { setDir('back'); setMView('channels') }} />
  ) : null

  const chat = channel && space ? (
    channel.kind === 'voice' ? (
      <VoiceView channel={channel} isMember={space.isMember} isNarrow={isNarrow}
        onBack={() => { setDir('back'); setMView('channels') }} />
    ) : (
    <ChannelChat
      channel={channel} isMember={space.isMember} canPost={space.isMember}
      canUpload={space.isMember && ent.community.canUploadFiles}
      canModerate={canManage}
      isMuted={muted.has(channel.id)} onToggleMute={() => doToggleMute(channel.id)}
      onJoin={doJoin} joining={joining} onRead={markRead}
    />
    )
  ) : (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--bg-card)', color: 'var(--text-dim)', fontFamily: FB, fontSize: 13 }}>
      {loadingChannels ? '' : 'Choisis un canal.'}
    </div>
  )

  const centerPane = panel === 'events' ? eventsPane : chat

  const chatWithBack = panel === 'events' ? eventsPane : (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <button onClick={() => { setDir('back'); setMView('channels') }} style={backBar}>
        <BackIcon /> <span>{space ? space.name : 'Retour'}</span>
      </button>
      <div style={{ flex: 1, minHeight: 0 }}>{chat}</div>
    </div>
  )

  // ── Rendu ──────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', fontFamily: FB }}>
      {isNarrow ? (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', borderRadius: 'var(--r-lg)', background: 'var(--bg-card)', position: 'relative' }}>
          {/* Vues empilées avec transition « ouverture de page » fluide (clé = vue). */}
          <div key={mView} className={dir === 'fwd' ? 'comm-slide-fwd' : 'comm-slide-back'} style={{ height: '100%', minHeight: 0 }}>
            {mView === 'spaces' && <MobileSpaces spaces={spaces} loading={loadingSpaces} onSelect={selectSpace} canCreate={ent.community.canCreate} onCreate={() => setShowCreate(true)} />}
            {mView === 'channels' && channelCol}
            {mView === 'chat' && chatWithBack}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '56px 248px 1fr', overflow: 'hidden', borderRadius: 'var(--r-lg)', background: 'var(--bg-card)' }}>
          <div style={{ minHeight: 0, background: 'var(--bg-card2)' }}>{rail}</div>
          <div style={{ minHeight: 0, background: 'var(--bg-card2)' }}>{channelCol}</div>
          <div style={{ minHeight: 0 }}>{centerPane}</div>
        </div>
      )}

      {showCreate && (
        <CreateSpaceSheet
          ent={ent.community}
          onClose={() => setShowCreate(false)}
          onCreated={(s) => { setShowCreate(false); void loadSpaces(s.id); if (isNarrow) { setDir('fwd'); setMView('channels') } }}
        />
      )}
    </div>
  )
}

// ── Rail des espaces (desktop) ──────────────────────────────────────────────
function SpaceRail({ spaces, activeId, loading, onSelect, onCreate }: {
  spaces: CommunitySpace[]; activeId: string | null; loading: boolean
  onSelect: (id: string) => void; onCreate: () => void
}) {
  return (
    <div style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-3) 0' }}>
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
      <button onClick={onCreate} title="Créer un espace" aria-label="Créer un espace"
        style={{ width: 44, height: 44, borderRadius: 'var(--r-lg)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-neutral)', color: 'var(--primary)', marginTop: 'var(--space-1)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </div>
  )
}

// ── Colonne des canaux ──────────────────────────────────────────────────────
function ChannelColumn({ space, channels, activeId, loading, isNarrow, joining, canManage, canBrand, canVoice, unread, muted, panel, onEvents, onSelect, onJoin, onLeave, onCreateChannel, onSetLogo, onBack }: {
  space: CommunitySpace | null; channels: CommunityChannel[]; activeId: string | null; loading: boolean
  isNarrow: boolean; joining: boolean; canManage: boolean; canBrand: boolean; canVoice: boolean; unread: Set<string>; muted: Set<string>
  panel: 'chat' | 'events'; onEvents: () => void
  onSelect: (id: string) => void; onJoin: () => void; onLeave: () => void; onCreateChannel: (name: string, kind: 'text' | 'voice') => void; onSetLogo: (file: File) => void; onBack: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newKind, setNewKind] = useState<'text' | 'voice'>('text')
  const logoRef = useRef<HTMLInputElement>(null)
  if (!space) {
    return <div style={{ padding: 'var(--space-6)', color: 'var(--text-dim)', fontFamily: FB, fontSize: 13 }}>—</div>
  }
  function submitChannel() {
    const n = newName.trim()
    if (!n) { setAdding(false); return }
    onCreateChannel(n, newKind); setNewName(''); setNewKind('text'); setAdding(false)
  }
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* En-tête d'espace */}
      <div style={{ flexShrink: 0, padding: 'var(--space-4) var(--space-4) var(--space-3)' }}>
        {isNarrow && (
          <button onClick={onBack} style={{ ...backBar, padding: 0, marginBottom: 'var(--space-3)', background: 'transparent' }}><BackIcon /> <span>Espaces</span></button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {canBrand ? (
            <>
              <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onSetLogo(f) }} />
              <button onClick={() => logoRef.current?.click()} title="Changer le logo" aria-label="Changer le logo"
                style={{ position: 'relative', border: 'none', padding: 0, background: 'transparent', cursor: 'pointer', borderRadius: 'var(--r-md)', lineHeight: 0 }}>
                <SpaceBadge space={space} size={34} />
                <span style={{ position: 'absolute', right: -3, bottom: -3, width: 16, height: 16, borderRadius: '50%', background: 'var(--primary)', color: 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px var(--bg-card2)' }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                </span>
              </button>
            </>
          ) : (
            <SpaceBadge space={space} size={34} />
          )}
          <span style={{ fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{space.name}</span>
        </div>
        <div className="tnum" style={{ fontFamily: FB, fontSize: 11.5, color: 'var(--text-dim)', marginTop: 'var(--space-1)', fontVariantNumeric: 'tabular-nums' }}>
          {space.memberCount} membre{space.memberCount > 1 ? 's' : ''}{space.kind === 'official' ? ' · Officiel' : ''}
        </div>
        {space.description && (
          <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', margin: 'var(--space-2) 0 0', lineHeight: 1.45 }}>{space.description}</p>
        )}
        <div style={{ marginTop: 'var(--space-3)' }}>
          {!space.isMember ? (
            <button onClick={onJoin} disabled={joining} style={joinBtn}>{joining ? 'Connexion…' : 'Rejoindre'}</button>
          ) : space.myRole !== 'owner' ? (
            <button onClick={onLeave} style={leaveBtn}>Quitter</button>
          ) : (
            <span style={{ fontFamily: FB, fontSize: 11.5, fontWeight: 600, color: 'var(--primary)' }}>Ton espace</span>
          )}
        </div>
      </div>

      {/* Raccourci Événements */}
      <div style={{ flexShrink: 0, padding: '0 var(--space-2) var(--space-2)' }}>
        <button onClick={onEvents}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', borderRadius: 'var(--r-sm)', padding: 'var(--space-2) var(--space-3)', minHeight: 36, background: panel === 'events' ? 'var(--surface-neutral)' : 'transparent', fontFamily: FB }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-dim)', flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
          <span style={{ flex: 1, fontSize: 13.5, fontWeight: panel === 'events' ? 600 : 500, color: panel === 'events' ? 'var(--text)' : 'var(--text-mid)' }}>Événements</span>
        </button>
      </div>

      {/* Liste des canaux */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 var(--space-2) var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-2) var(--space-3)' }}>
          <span style={{ fontFamily: FB, fontSize: 10.5, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Canaux</span>
          {canManage && (
            <button onClick={() => setAdding(v => !v)} aria-label="Ajouter un canal" title="Ajouter un canal"
              style={{ width: 22, height: 22, borderRadius: 'var(--r-sm)', border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          )}
        </div>
        {adding && (
          <div style={{ padding: '0 var(--space-2) var(--space-2)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <input autoFocus value={newName} onChange={e => setNewName(e.target.value.slice(0, 60))}
              onKeyDown={e => { if (e.key === 'Enter') submitChannel(); if (e.key === 'Escape') { setAdding(false); setNewName(''); setNewKind('text') } }}
              placeholder="nom-du-canal"
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 'var(--space-2) var(--space-3)', fontFamily: FB, fontSize: 13, color: 'var(--text)', outline: 'none' }} />
            {canVoice && (
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {(['text', 'voice'] as const).map(k => (
                  <button key={k} type="button" onClick={() => setNewKind(k)}
                    style={{ flex: 1, height: 30, border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontFamily: FB, fontSize: 12, fontWeight: 600, background: newKind === k ? 'var(--primary-dim)' : 'var(--surface-neutral)', color: newKind === k ? 'var(--primary)' : 'var(--text-mid)' }}>{k === 'text' ? '# Texte' : '🔊 Voix'}</button>
                ))}
              </div>
            )}
            <button type="button" onClick={submitChannel} disabled={!newName.trim()}
              style={{ height: 32, border: 'none', borderRadius: 'var(--r-sm)', cursor: newName.trim() ? 'pointer' : 'default', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 12.5, fontWeight: 600, opacity: newName.trim() ? 1 : 0.5 }}>Créer le canal</button>
          </div>
        )}
        {loading ? (
          [0, 1, 2, 3].map(i => <span key={i} style={{ display: 'block', height: 34, borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)', margin: '0 var(--space-2) var(--space-2)' }} />)
        ) : channels.map(c => {
          const active = activeId === c.id
          const isMuted = muted.has(c.id)
          const isUnread = unread.has(c.id) && !active && !isMuted
          return (
            <button key={c.id} onClick={() => onSelect(c.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', borderRadius: 'var(--r-sm)', padding: 'var(--space-2) var(--space-3)', minHeight: 36, background: active ? 'var(--surface-neutral)' : 'transparent', fontFamily: FB, opacity: isMuted ? 0.5 : 1 }}>
              {c.kind === 'voice'
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-dim)', flexShrink: 0 }}><path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" /></svg>
                : <span style={{ color: 'var(--text-dim)', fontSize: 15, lineHeight: 1 }}>#</span>}
              <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: active || isUnread ? 600 : 500, color: active || isUnread ? 'var(--text)' : 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              {isMuted && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-dim)', flexShrink: 0 }}><path d="M13.73 21a2 2 0 0 1-3.46 0M18 8a6 6 0 0 0-9.33-5M5.2 5.2A6 6 0 0 0 6 8c0 7-3 9-3 9h14M1 1l22 22" /></svg>}
              {isUnread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />}
            </button>
          )
        })}
      </div>

      {/* Liens croisés (règle d'interconnexion des pages) : messagerie privée +
          annuaire des coachs publics de l'app. */}
      <div style={{ flexShrink: 0, padding: 'var(--space-3) var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <Link href="/messages" style={crossLink}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          Messages privés →
        </Link>
        <Link href="/coaches" style={crossLink}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
          Trouver un coach →
        </Link>
      </div>
    </div>
  )
}

// ── Espaces (mobile plein écran) ────────────────────────────────────────────
function MobileSpaces({ spaces, loading, onSelect, canCreate, onCreate }: {
  spaces: CommunitySpace[]; loading: boolean; onSelect: (id: string) => void; canCreate: boolean; onCreate: () => void
}) {
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
        <span style={{ fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>Espaces</span>
        <button onClick={onCreate} aria-label="Créer un espace" style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--surface-neutral)', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>
      {loading ? (
        [0, 1, 2, 3, 4].map(i => <span key={i} style={{ display: 'block', height: 58, borderRadius: 'var(--r-md)', background: 'var(--surface-neutral)', marginBottom: 'var(--space-2)' }} />)
      ) : spaces.map(s => (
        <button key={s.id} onClick={() => onSelect(s.id)}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', borderRadius: 'var(--r-md)', padding: 'var(--space-3)', minHeight: 58, background: 'var(--bg-card2)', marginBottom: 'var(--space-2)', fontFamily: FB }}>
          <SpaceBadge space={s} size={44} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
            <span className="tnum" style={{ display: 'block', fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
              {s.memberCount} membre{s.memberCount > 1 ? 's' : ''}{s.kind === 'official' ? ' · Officiel' : ''}
            </span>
          </span>
          {s.isMember && (
            <span style={{ flexShrink: 0, fontFamily: FB, fontSize: 10.5, fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-dim)', padding: '3px 8px', borderRadius: 'var(--r-sm)' }}>Membre</span>
          )}
          <BackIcon flip />
        </button>
      ))}
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
