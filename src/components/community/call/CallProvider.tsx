'use client'
// ══════════════════════════════════════════════════════════════════════════
// Fournisseur d'appel GLOBAL (monté haut dans l'app, hors du routeur) : la salle
// LiveKit vit ici, donc l'appel SURVIT à la navigation. La vue plein écran
// (VoiceView) et la bulle flottante (CallBubble) ne font que consommer ce
// contexte. livekit-client est chargé en import dynamique (jamais côté SSR).
// ══════════════════════════════════════════════════════════════════════════
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import type {
  Room, Participant, RoomEvent as RoomEventT, RemoteTrack, RemoteTrackPublication, RemoteParticipant, Track,
} from 'livekit-client'
import type { CallTarget, Tile } from './types'
import { targetKey } from './types'

type Status = 'idle' | 'connecting' | 'connected' | 'error' | 'unconfigured' | 'forbidden'

const CAMERA = 'camera' as Track.Source
const SCREEN = 'screen_share' as Track.Source

function tilesFor(room: Room): { screens: Tile[]; people: Tile[] } {
  const screens: Tile[] = [], people: Tile[] = []
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
      screens.push({ key: `${p.identity}:scr`, identity: p.identity, name, isLocal, speaking: false, micOn: true, variant: 'screen', video: scr.videoTrack })
    }
  }
  add(room.localParticipant, true)
  for (const p of room.remoteParticipants.values()) add(p, false)
  return { screens, people }
}

export interface CallCtx {
  active: boolean
  status: Status
  title: string
  tKey: string | null
  channelId: string | null
  minimized: boolean
  showingFull: boolean
  micOn: boolean; camOn: boolean; screenOn: boolean
  needAudioTap: boolean
  notice: string | null
  errDetail: string | null
  screens: Tile[]
  people: Tile[]
  start: (target: CallTarget, title: string) => void
  leave: () => void
  toggleMic: () => void
  toggleCam: () => void
  toggleScreen: () => void
  minimize: () => void
  expand: () => void
  enableAudio: () => void
  isTarget: (t: CallTarget) => boolean
  registerFull: () => () => void
}

const Ctx = createContext<CallCtx | null>(null)
export function useCall(): CallCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useCall must be used within CallProvider')
  return c
}

export function CallProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('idle')
  const [title, setTitle] = useState('')
  const [tKey, setTKey] = useState<string | null>(null)
  const [minimized, setMinimized] = useState(false)
  const [, setTick] = useState(0)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(false)
  const [screenOn, setScreenOn] = useState(false)
  const [needAudioTap, setNeedAudioTap] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [errDetail, setErrDetail] = useState<string | null>(null)
  const [showingFull, setShowingFull] = useState(false)
  const fullCount = useRef(0)

  const roomRef = useRef<Room | null>(null)
  const audioBoxRef = useRef<HTMLDivElement | null>(null)
  const audioElsRef = useRef<Map<RemoteTrack, HTMLMediaElement>>(new Map())
  const startTokenRef = useRef(0)

  const bump = useCallback(() => setTick(t => t + 1), [])

  const detachAllAudio = useCallback(() => {
    for (const el of audioElsRef.current.values()) el.remove()
    audioElsRef.current.clear()
  }, [])

  const leave = useCallback(() => {
    startTokenRef.current++
    const room = roomRef.current
    roomRef.current = null
    detachAllAudio()
    if (room) void room.disconnect()
    setStatus('idle'); setTKey(null); setTitle(''); setMinimized(false)
    setMicOn(true); setCamOn(false); setScreenOn(false); setNeedAudioTap(false); setNotice(null); setErrDetail(null)
  }, [detachAllAudio])

  const start = useCallback((target: CallTarget, t: string) => {
    const key = targetKey(target)
    // Déjà dans cet appel → on ré-agrandit simplement.
    if (roomRef.current && tKey === key) { setMinimized(false); return }
    // Appel en cours sur une autre cible → on le quitte d'abord.
    if (roomRef.current) { const r = roomRef.current; roomRef.current = null; detachAllAudio(); void r.disconnect() }

    const myToken = ++startTokenRef.current
    const alive = () => startTokenRef.current === myToken
    setStatus('connecting'); setTitle(t); setTKey(key); setMinimized(false)
    setNotice(null); setErrDetail(null); setMicOn(true); setCamOn(false); setScreenOn(false)

    void (async () => {
      let token: string, url: string
      try {
        const res = await fetch('/api/community/voice-token', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(target),
        })
        if (!alive()) return
        if (res.status === 501) { setStatus('unconfigured'); return }
        if (res.status === 403) { setStatus('forbidden'); return }
        const data = (await res.json().catch(() => ({}))) as { token?: string; url?: string; error?: string }
        if (!res.ok) { setErrDetail(data.error ?? `HTTP ${res.status}`); setStatus('error'); return }
        if (!data.token || !data.url) { setErrDetail('Jeton/URL manquant'); setStatus('error'); return }
        token = data.token; url = data.url
      } catch (e) { if (alive()) { setErrDetail(e instanceof Error ? e.message : 'réseau'); setStatus('error') } return }

      try {
        const { Room, RoomEvent, Track, DisconnectReason } = await import('livekit-client')
        if (!alive()) return
        const room = new Room({ adaptiveStream: true, dynacast: true })
        roomRef.current = room
        const isThis = () => roomRef.current === room && alive()

        const attachAudio = (track: RemoteTrack) => {
          if (track.kind !== Track.Kind.Audio) return
          const el = track.attach(); el.style.display = 'none'
          audioBoxRef.current?.appendChild(el); audioElsRef.current.set(track, el)
        }
        const evts: RoomEventT[] = [
          RoomEvent.ParticipantConnected, RoomEvent.ParticipantDisconnected, RoomEvent.ActiveSpeakersChanged,
          RoomEvent.TrackMuted, RoomEvent.TrackUnmuted, RoomEvent.LocalTrackPublished, RoomEvent.LocalTrackUnpublished,
        ]
        for (const e of evts) room.on(e, bump)
        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _p: RemoteTrackPublication, _rp: RemoteParticipant) => { attachAudio(track); bump() })
        room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          const el = audioElsRef.current.get(track)
          if (el) { try { track.detach(el) } catch { /* */ } el.remove(); audioElsRef.current.delete(track) }
          bump()
        })
        room.on(RoomEvent.AudioPlaybackStatusChanged, () => { if (isThis()) setNeedAudioTap(!room.canPlaybackAudio) })
        room.on(RoomEvent.Disconnected, (reason?: number) => {
          // Ne concerne QUE les coupures non initiées par l'utilisateur (leave()
          // met roomRef à null avant de déconnecter). On expose la raison LiveKit
          // pour diagnostic au lieu de retomber silencieusement sur l'accueil.
          if (roomRef.current !== room) return
          roomRef.current = null; detachAllAudio()
          const rn = reason != null ? (DisconnectReason[reason] ?? String(reason)) : 'inconnue'
          setErrDetail(`déconnecté par le serveur (${rn})`)
          setStatus('error'); setMinimized(false); setMicOn(true); setCamOn(false); setScreenOn(false); setNeedAudioTap(false)
        })

        await room.connect(url, token)
        if (!isThis()) { void room.disconnect(); return }
        try { await room.localParticipant.setMicrophoneEnabled(true); setMicOn(true) }
        catch { setMicOn(false); setNotice('Micro non autorisé — tu es en écoute seule.') }
        if (!isThis()) { void room.disconnect(); return }
        setStatus('connected'); setNeedAudioTap(!room.canPlaybackAudio); bump()
      } catch (e) {
        const r = roomRef.current; roomRef.current = null; if (r) void r.disconnect(); detachAllAudio()
        if (alive()) { setErrDetail(e instanceof Error ? e.message : 'connexion média'); setStatus('error') }
      }
    })()
  }, [tKey, detachAllAudio, bump, leave])

  const toggleMic = useCallback(() => {
    const room = roomRef.current; if (!room) return
    const next = !micOn
    void room.localParticipant.setMicrophoneEnabled(next).then(() => { setMicOn(next); if (next) setNotice(null); bump() }).catch(() => setNotice('Micro non autorisé.'))
  }, [micOn, bump])
  const toggleCam = useCallback(() => {
    const room = roomRef.current; if (!room) return
    const next = !camOn
    void room.localParticipant.setCameraEnabled(next).then(() => { setCamOn(next); bump() }).catch(() => setNotice('Caméra non autorisée.'))
  }, [camOn, bump])
  const toggleScreen = useCallback(() => {
    const room = roomRef.current; if (!room) return
    const next = !screenOn
    void room.localParticipant.setScreenShareEnabled(next).then(() => { setScreenOn(next); bump() }).catch(() => { if (next) setNotice('Partage d\'écran annulé ou indisponible.') })
  }, [screenOn, bump])
  const enableAudio = useCallback(() => {
    const room = roomRef.current; if (!room) return
    void room.startAudio().then(() => setNeedAudioTap(!room.canPlaybackAudio)).catch(() => {})
  }, [])

  const minimize = useCallback(() => setMinimized(true), [])
  const expand = useCallback(() => setMinimized(false), [])
  const isTarget = useCallback((t: CallTarget) => tKey === targetKey(t), [tKey])
  const registerFull = useCallback(() => {
    fullCount.current++; setShowingFull(true)
    return () => { fullCount.current = Math.max(0, fullCount.current - 1); if (fullCount.current === 0) setShowingFull(false) }
  }, [])

  const active = status !== 'idle'
  const room = roomRef.current
  const { screens, people } = (status === 'connected' && room) ? tilesFor(room) : { screens: [], people: [] }
  const channelId = tKey && tKey.startsWith('c:') ? tKey.slice(2) : null

  const value: CallCtx = {
    active, status, title, tKey, channelId, minimized, showingFull, micOn, camOn, screenOn, needAudioTap, notice, errDetail,
    screens, people, start, leave, toggleMic, toggleCam, toggleScreen, minimize, expand, enableAudio, isTarget, registerFull,
  }

  return (
    <Ctx.Provider value={value}>
      <div ref={audioBoxRef} aria-hidden style={{ display: 'none' }} />
      {children}
    </Ctx.Provider>
  )
}
