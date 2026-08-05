'use client'
// ══════════════════════════════════════════════════════════════════════════
// Salon d'appel (Phase 2, LiveKit) — audio + vidéo + partage d'écran, multi-
// participants (appels de groupe coach). Le jeton est minté par
// /api/community/voice-token (gating Pro+, vérif membre + canal vocal serveur).
//
// Ici on branche le client média : connexion à la salle, micro/caméra/écran,
// grille de participants (vidéo ou avatar), indicateur « qui parle », mute /
// caméra / partage / quitter, lecture audio distante (attachée manuellement à des
// éléments <audio> cachés), gestion des erreurs (permission refusée, réseau) et
// nettoyage complet à la fermeture / au changement de canal.
//
// livekit-client est chargé en import dynamique (jamais côté SSR, hors bundle initial).
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import type {
  Room, Participant, RoomEvent as RoomEventT, RemoteTrack, RemoteTrackPublication,
  RemoteParticipant, LocalVideoTrack, RemoteVideoTrack, Track,
} from 'livekit-client'
import type { CommunityChannel } from '@/types/community'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

type Status = 'idle' | 'connecting' | 'connected' | 'unconfigured' | 'forbidden' | 'error'
type VideoTrackT = LocalVideoTrack | RemoteVideoTrack

interface Tile {
  key: string
  identity: string
  name: string
  isLocal: boolean
  speaking: boolean
  micOn: boolean
  variant: 'camera' | 'screen'
  video: VideoTrackT | null
}

const CAMERA = 'camera' as Track.Source
const SCREEN = 'screen_share' as Track.Source

function tilesFor(room: Room): { screens: Tile[]; people: Tile[] } {
  const screens: Tile[] = []
  const people: Tile[] = []
  const add = (p: Participant, isLocal: boolean) => {
    const name = (p.name || 'Membre').trim() || 'Membre'
    const cam = p.getTrackPublication(CAMERA)
    people.push({
      key: `${p.identity}:cam`, identity: p.identity, name, isLocal,
      speaking: p.isSpeaking, micOn: p.isMicrophoneEnabled, variant: 'camera',
      video: (p.isCameraEnabled && cam?.videoTrack) ? cam.videoTrack : null,
    })
    const scr = p.getTrackPublication(SCREEN)
    if (p.isScreenShareEnabled && scr?.videoTrack) {
      screens.push({
        key: `${p.identity}:scr`, identity: p.identity, name, isLocal,
        speaking: false, micOn: true, variant: 'screen', video: scr.videoTrack,
      })
    }
  }
  add(room.localParticipant, true)
  for (const p of room.remoteParticipants.values()) add(p, false)
  return { screens, people }
}

export function VoiceView({ channel, isMember, isNarrow, onBack }: {
  channel: CommunityChannel; isMember: boolean; isNarrow: boolean; onBack: () => void
}) {
  const [status, setStatus] = useState<Status>('idle')
  const [, setTick] = useState(0)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(false)
  const [screenOn, setScreenOn] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [needAudioTap, setNeedAudioTap] = useState(false)

  const roomRef = useRef<Room | null>(null)
  const mountedRef = useRef(true)
  const audioBoxRef = useRef<HTMLDivElement | null>(null)
  const audioElsRef = useRef<Map<RemoteTrack, HTMLMediaElement>>(new Map())

  const detachAllAudio = useCallback(() => {
    for (const el of audioElsRef.current.values()) { el.remove() }
    audioElsRef.current.clear()
  }, [])

  const teardown = useCallback(() => {
    const room = roomRef.current
    roomRef.current = null
    detachAllAudio()
    if (room) void room.disconnect()
  }, [detachAllAudio])

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])
  // Quitter la salle au changement de canal ou au démontage.
  useEffect(() => teardown, [channel.id, teardown])

  const bump = useCallback(() => { if (mountedRef.current) setTick(t => t + 1) }, [])

  async function join() {
    setStatus('connecting'); setNotice(null)
    let token: string, url: string
    try {
      const res = await fetch('/api/community/voice-token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channelId: channel.id }),
      })
      if (res.status === 501) { setStatus('unconfigured'); return }
      if (res.status === 403) { setStatus('forbidden'); return }
      if (!res.ok) { setStatus('error'); return }
      const data = (await res.json()) as { token?: string; url?: string }
      if (!data.token || !data.url) { setStatus('error'); return }
      token = data.token; url = data.url
    } catch { setStatus('error'); return }

    try {
      const { Room, RoomEvent, Track } = await import('livekit-client')
      if (!mountedRef.current) return
      const room = new Room({ adaptiveStream: true, dynacast: true })
      roomRef.current = room

      const isThis = () => roomRef.current === room && mountedRef.current
      const attachAudio = (track: RemoteTrack) => {
        if (track.kind !== Track.Kind.Audio) return
        const el = track.attach()
        el.style.display = 'none'
        audioBoxRef.current?.appendChild(el)
        audioElsRef.current.set(track, el)
      }

      room
        .on(RoomEvent.ParticipantConnected, bump)
        .on(RoomEvent.ParticipantDisconnected, bump)
        .on(RoomEvent.ActiveSpeakersChanged, bump)
        .on(RoomEvent.TrackMuted, bump)
        .on(RoomEvent.TrackUnmuted, bump)
        .on(RoomEvent.LocalTrackPublished, bump)
        .on(RoomEvent.LocalTrackUnpublished, bump)
        .on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub: RemoteTrackPublication, _p: RemoteParticipant) => { attachAudio(track); bump() })
        .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          const el = audioElsRef.current.get(track)
          if (el) { try { track.detach(el) } catch { /* déjà détaché */ } el.remove(); audioElsRef.current.delete(track) }
          bump()
        })
        .on(RoomEvent.AudioPlaybackStatusChanged, () => { if (isThis()) setNeedAudioTap(!room.canPlaybackAudio) })
        .on(RoomEvent.Disconnected, () => {
          if (roomRef.current === room) {
            roomRef.current = null; detachAllAudio()
            if (mountedRef.current) { setStatus('idle'); setMicOn(true); setCamOn(false); setScreenOn(false); setNotice(null); setNeedAudioTap(false) }
          }
        })

      await room.connect(url, token)
      if (!isThis()) { void room.disconnect(); return }

      try { await room.localParticipant.setMicrophoneEnabled(true); if (mountedRef.current) setMicOn(true) }
      catch { if (mountedRef.current) { setMicOn(false); setNotice('Micro non autorisé — tu es en écoute seule.') } }

      if (!isThis()) { void room.disconnect(); return }
      setStatus('connected')
      setNeedAudioTap(!room.canPlaybackAudio)
      bump()
    } catch {
      teardown()
      if (mountedRef.current) setStatus('error')
    }
  }

  async function toggleMic() {
    const room = roomRef.current; if (!room) return
    const next = !micOn
    try { await room.localParticipant.setMicrophoneEnabled(next); if (mountedRef.current) { setMicOn(next); if (next) setNotice(null); bump() } }
    catch { if (mountedRef.current) setNotice('Micro non autorisé.') }
  }
  async function toggleCam() {
    const room = roomRef.current; if (!room) return
    const next = !camOn
    try { await room.localParticipant.setCameraEnabled(next); if (mountedRef.current) { setCamOn(next); bump() } }
    catch { if (mountedRef.current) setNotice('Caméra non autorisée.') }
  }
  async function toggleScreen() {
    const room = roomRef.current; if (!room) return
    const next = !screenOn
    try { await room.localParticipant.setScreenShareEnabled(next); if (mountedRef.current) { setScreenOn(next); bump() } }
    catch { if (mountedRef.current) setNotice(next ? 'Partage d\'écran annulé ou indisponible.' : null) }
  }
  async function enableAudio() {
    const room = roomRef.current; if (!room) return
    try { await room.startAudio(); if (mountedRef.current) setNeedAudioTap(!room.canPlaybackAudio) } catch { /* réessai possible */ }
  }

  const live = status === 'connected'
  const room = roomRef.current
  const { screens, people } = (live && room) ? tilesFor(room) : { screens: [], people: [] }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--bg-card)' }}>
      <div ref={audioBoxRef} aria-hidden style={{ display: 'none' }} />

      <div style={{ flexShrink: 0, padding: 'var(--space-4) var(--space-5) var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {isNarrow && (
          <button onClick={() => { if (live) teardown(); onBack() }} aria-label="Retour" style={{ width: 30, height: 30, border: 'none', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
        )}
        <VoiceIcon />
        <span style={{ fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>{channel.name}</span>
        {live && <span style={{ marginLeft: 'auto', fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', fontVariantNumeric: 'tabular-nums' }}>{people.length} en ligne</span>}
      </div>

      {live ? (
        <>
          {needAudioTap && (
            <button onClick={() => void enableAudio()} style={{ margin: '0 var(--space-5) var(--space-2)', height: 34, border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
              Activer le son
            </button>
          )}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--space-4) var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {screens.map(t => <VideoStage key={t.key} tile={t} />)}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--space-3)', alignContent: 'flex-start' }}>
              {people.map(t => <PersonTile key={t.key} tile={t} />)}
            </div>
          </div>
          <div style={{ flexShrink: 0, padding: 'var(--space-4) var(--space-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <RoundBtn on={micOn} label={micOn ? 'Couper le micro' : 'Activer le micro'} onClick={() => void toggleMic()}>{micOn ? <MicIcon /> : <MicOffIcon />}</RoundBtn>
            <RoundBtn on={camOn} label={camOn ? 'Couper la caméra' : 'Activer la caméra'} onClick={() => void toggleCam()}>{camOn ? <CameraIcon /> : <CameraOffIcon />}</RoundBtn>
            {!isNarrow && (
              <RoundBtn on={screenOn} active label={screenOn ? 'Arrêter le partage d\'écran' : 'Partager mon écran'} onClick={() => void toggleScreen()}><ScreenIcon /></RoundBtn>
            )}
            <button onClick={teardown} aria-label="Quitter le salon"
              style={{ height: 46, padding: '0 var(--space-5)', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', background: 'var(--danger)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <PhoneDownIcon /> Quitter
            </button>
          </div>
          {notice && (
            <p style={{ margin: 0, padding: '0 var(--space-5) var(--space-4)', fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', textAlign: 'center' }}>{notice}</p>
          )}
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)', padding: 'var(--space-8)', textAlign: 'center' }}>
          <span style={{ fontFamily: FD, fontSize: 18, fontWeight: 500, color: 'var(--text)' }}>Salon d&apos;appel</span>
          <p style={{ margin: 0, fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', maxWidth: 420, lineHeight: 1.5 }}>
            {status === 'unconfigured'
              ? 'La voix arrive très bientôt : il reste à activer LiveKit côté serveur.'
              : status === 'forbidden'
                ? 'Les salons d\'appel sont réservés à l\'abonnement Pro.'
                : status === 'error'
                  ? 'Connexion impossible pour l\'instant. Réessaie dans un instant.'
                  : !isMember
                    ? 'Rejoins l\'espace pour parler, te voir et partager ton écran avec les membres présents.'
                    : 'Rejoins le salon : audio, vidéo et partage d\'écran, en direct avec les membres présents.'}
          </p>
          {isMember && status !== 'unconfigured' && status !== 'forbidden' && (
            <button onClick={() => void join()} disabled={status === 'connecting'}
              style={{ height: 40, padding: '0 var(--space-5)', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, cursor: status === 'connecting' ? 'default' : 'pointer', opacity: status === 'connecting' ? 0.6 : 1 }}>
              {status === 'connecting' ? 'Connexion…' : 'Rejoindre le salon'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tuiles vidéo ────────────────────────────────────────────────────────────
function useAttachedVideo(video: VideoTrackT | null, mirror: boolean) {
  const ref = useRef<HTMLVideoElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !video) return
    video.attach(el)
    el.style.transform = mirror ? 'scaleX(-1)' : ''
    return () => { try { video.detach(el) } catch { /* déjà détaché */ } }
  }, [video, mirror])
  return ref
}

function VideoStage({ tile }: { tile: Tile }) {
  const ref = useAttachedVideo(tile.video, false)
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface-neutral)' }}>
      <video ref={ref} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'contain', background: 'var(--bg-alt)' }} />
      <span style={{ position: 'absolute', left: 'var(--space-3)', bottom: 'var(--space-3)', padding: '3px 10px', borderRadius: 'var(--r-pill)', background: 'var(--danger)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 11.5, fontWeight: 600 }}>
        Écran · {tile.isLocal ? 'Toi' : tile.name}
      </span>
    </div>
  )
}

function PersonTile({ tile }: { tile: Tile }) {
  const ref = useAttachedVideo(tile.video, tile.isLocal)
  return (
    <div style={{
      position: 'relative', width: '100%', aspectRatio: '4 / 3', borderRadius: 'var(--r-md)', overflow: 'hidden',
      background: 'var(--surface-neutral)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: tile.speaking ? 'inset 0 0 0 3px var(--primary)' : 'none', transition: 'box-shadow 120ms ease',
    }}>
      {tile.video
        ? <video ref={ref} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--bg-card)', color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FB, fontWeight: 600, fontSize: 22 }}>{tile.name.slice(0, 1).toUpperCase()}</span>}
      <span style={{ position: 'absolute', left: 8, bottom: 8, display: 'flex', alignItems: 'center', gap: 6, padding: '2px 8px', borderRadius: 'var(--r-pill)', background: 'var(--bg-card)', maxWidth: 'calc(100% - 16px)' }}>
        {!tile.micOn && <span style={{ color: 'var(--danger)', display: 'flex' }}><MicOffIcon size={12} /></span>}
        <span style={{ fontFamily: FB, fontSize: 11.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tile.isLocal ? 'Toi' : tile.name}</span>
      </span>
    </div>
  )
}

function RoundBtn({ children, on, active, label, onClick }: { children: ReactNode; on: boolean; active?: boolean; label: string; onClick: () => void }) {
  // `active` = bouton « activé = teinte primaire » (partage d'écran). Sinon on/off = neutre/danger.
  const bg = active ? (on ? 'var(--primary)' : 'var(--surface-neutral)') : (on ? 'var(--surface-neutral)' : 'var(--danger-soft)')
  const fg = active ? (on ? 'var(--on-primary)' : 'var(--text)') : (on ? 'var(--text)' : 'var(--danger)')
  return (
    <button onClick={onClick} aria-label={label} title={label}
      style={{ width: 46, height: 46, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color: fg }}>
      {children}
    </button>
  )
}

// ── Icônes ──────────────────────────────────────────────────────────────────
function VoiceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-mid)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}
function MicIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M19 10a7 7 0 0 1-14 0" /><line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  )
}
function MicOffIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="2" x2="22" y2="22" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12" /><line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  )
}
function CameraIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  )
}
function CameraOffIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" /><line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}
function ScreenIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}
function PhoneDownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.53.51 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.61 2h3a2 2 0 0 1 2 1.72" /><line x1="23" y1="1" x2="1" y2="23" />
    </svg>
  )
}
