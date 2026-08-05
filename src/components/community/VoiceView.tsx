'use client'
// ══════════════════════════════════════════════════════════════════════════
// Salon vocal (Phase 2, LiveKit). Le jeton est minté par /api/community/voice-token
// (gating Pro+, vérif membre + canal vocal côté serveur). Ici on branche le client
// média : connexion à la salle, micro, liste des participants + « qui parle »,
// mute / quitter, gestion des erreurs (permission micro, réseau).
//
// livekit-client est chargé en import dynamique (jamais côté SSR, hors bundle initial).
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState, useCallback } from 'react'
import type { Room, Participant, RoomEvent as RoomEventT } from 'livekit-client'
import type { CommunityChannel } from '@/types/community'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

type Status = 'idle' | 'connecting' | 'connected' | 'unconfigured' | 'forbidden' | 'mic-denied' | 'error'

interface Speaker { identity: string; name: string; speaking: boolean; micOn: boolean; isLocal: boolean }

function snapshot(room: Room): Speaker[] {
  const list: Speaker[] = []
  const add = (p: Participant, isLocal: boolean) => {
    list.push({
      identity: p.identity,
      name: (p.name || 'Membre').trim() || 'Membre',
      speaking: p.isSpeaking,
      micOn: p.isMicrophoneEnabled,
      isLocal,
    })
  }
  add(room.localParticipant, true)
  for (const p of room.remoteParticipants.values()) add(p, false)
  return list
}

export function VoiceView({ channel, isMember, isNarrow, onBack }: {
  channel: CommunityChannel; isMember: boolean; isNarrow: boolean; onBack: () => void
}) {
  const [status, setStatus] = useState<Status>('idle')
  const [speakers, setSpeakers] = useState<Speaker[]>([])
  const [micOn, setMicOn] = useState(true)
  const roomRef = useRef<Room | null>(null)
  const mountedRef = useRef(true)

  const leave = useCallback(() => {
    const room = roomRef.current
    roomRef.current = null
    if (room) void room.disconnect()
    if (mountedRef.current) { setSpeakers([]); setStatus('idle'); setMicOn(true) }
  }, [])

  // Nettoyage : quitter la salle si on démonte le composant (changement de canal, navigation).
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false; const r = roomRef.current; roomRef.current = null; if (r) void r.disconnect() }
  }, [])

  // Quitter si on change de canal en restant sur VoiceView.
  useEffect(() => { return () => { const r = roomRef.current; roomRef.current = null; if (r) void r.disconnect() } }, [channel.id])

  async function join() {
    setStatus('connecting')
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
      const { Room, RoomEvent } = await import('livekit-client')
      if (!mountedRef.current) return
      const room = new Room({ adaptiveStream: false, dynacast: false })
      roomRef.current = room

      const refresh = () => { if (mountedRef.current && roomRef.current === room) setSpeakers(snapshot(room)) }
      const evts: RoomEventT[] = [
        RoomEvent.ParticipantConnected, RoomEvent.ParticipantDisconnected,
        RoomEvent.ActiveSpeakersChanged, RoomEvent.TrackMuted, RoomEvent.TrackUnmuted,
        RoomEvent.LocalTrackPublished, RoomEvent.TrackSubscribed, RoomEvent.TrackUnsubscribed,
      ]
      for (const e of evts) room.on(e, refresh)
      room.on(RoomEvent.Disconnected, () => {
        if (roomRef.current === room) { roomRef.current = null; if (mountedRef.current) { setSpeakers([]); setStatus('idle'); setMicOn(true) } }
      })

      await room.connect(url, token)
      if (!mountedRef.current || roomRef.current !== room) { void room.disconnect(); return }

      try {
        await room.localParticipant.setMicrophoneEnabled(true)
        setMicOn(true)
      } catch {
        // La salle est rejointe mais le micro est refusé : on reste connecté en écoute.
        if (mountedRef.current) { setMicOn(false); setStatus('mic-denied') }
      }
      if (!mountedRef.current || roomRef.current !== room) { void room.disconnect(); return }
      setStatus(s => (s === 'mic-denied' ? s : 'connected'))
      refresh()
    } catch {
      const r = roomRef.current; roomRef.current = null; if (r) void r.disconnect()
      if (mountedRef.current) setStatus('error')
    }
  }

  async function toggleMic() {
    const room = roomRef.current
    if (!room) return
    const next = !micOn
    try {
      await room.localParticipant.setMicrophoneEnabled(next)
      if (mountedRef.current) {
        setMicOn(next)
        setSpeakers(snapshot(room))
        if (next && status === 'mic-denied') setStatus('connected')
      }
    } catch { if (mountedRef.current) setStatus('mic-denied') }
  }

  const live = status === 'connected' || status === 'mic-denied'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--bg-card)' }}>
      <div style={{ flexShrink: 0, padding: 'var(--space-4) var(--space-5) var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {isNarrow && (
          <button onClick={() => { if (live) leave(); onBack() }} aria-label="Retour" style={{ width: 30, height: 30, border: 'none', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
        )}
        <VoiceIcon />
        <span style={{ fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>{channel.name}</span>
        {live && <span style={{ marginLeft: 'auto', fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', fontVariantNumeric: 'tabular-nums' }}>{speakers.length} en ligne</span>}
      </div>

      {live ? (
        <>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--space-4) var(--space-5)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignContent: 'flex-start' }}>
            {speakers.map(s => <SpeakerTile key={s.identity} s={s} />)}
          </div>
          <div style={{ flexShrink: 0, padding: 'var(--space-4) var(--space-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)' }}>
            <button onClick={() => void toggleMic()} aria-label={micOn ? 'Couper le micro' : 'Activer le micro'}
              style={{ width: 46, height: 46, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: micOn ? 'var(--surface-neutral)' : 'var(--danger-soft)', color: micOn ? 'var(--text)' : 'var(--danger)' }}>
              {micOn ? <MicIcon /> : <MicOffIcon />}
            </button>
            <button onClick={leave} aria-label="Quitter le salon"
              style={{ height: 46, padding: '0 var(--space-5)', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', background: 'var(--danger)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <PhoneDownIcon /> Quitter
            </button>
          </div>
          {status === 'mic-denied' && (
            <p style={{ margin: 0, padding: '0 var(--space-5) var(--space-4)', fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', textAlign: 'center' }}>
              Micro non autorisé — tu es en écoute. Autorise le micro dans ton navigateur puis réactive-le.
            </p>
          )}
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)', padding: 'var(--space-8)', textAlign: 'center' }}>
          <span style={{ fontFamily: FD, fontSize: 18, fontWeight: 500, color: 'var(--text)' }}>Salon vocal</span>
          <p style={{ margin: 0, fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', maxWidth: 380, lineHeight: 1.5 }}>
            {status === 'unconfigured'
              ? 'La voix arrive très bientôt : il reste à activer LiveKit côté serveur.'
              : status === 'forbidden'
                ? 'Les salons vocaux sont réservés à l\'abonnement Pro.'
                : status === 'error'
                  ? 'Connexion impossible pour l\'instant. Réessaie dans un instant.'
                  : !isMember
                    ? 'Rejoins l\'espace pour parler en direct avec les membres présents.'
                    : 'Rejoins le salon pour parler en direct avec les membres présents.'}
          </p>
          {isMember && status !== 'unconfigured' && status !== 'forbidden' && (
            <button onClick={() => void join()} disabled={status === 'connecting'}
              style={{ height: 40, padding: '0 var(--space-5)', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, cursor: status === 'connecting' ? 'default' : 'pointer', opacity: status === 'connecting' ? 0.6 : 1 }}>
              {status === 'connecting' ? 'Connexion…' : 'Rejoindre le salon vocal'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function SpeakerTile({ s }: { s: Speaker }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)', width: 92 }}>
      <span style={{
        position: 'relative', width: 64, height: 64, borderRadius: '50%', background: 'var(--surface-neutral)',
        color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FB, fontWeight: 600, fontSize: 24, flexShrink: 0,
        boxShadow: s.speaking ? '0 0 0 3px var(--primary)' : 'none', transition: 'box-shadow 120ms ease',
      }}>
        {s.name.slice(0, 1).toUpperCase()}
        {!s.micOn && (
          <span style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: '50%', background: 'var(--danger)', color: 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px var(--bg-card)' }}>
            <MicOffIcon size={12} />
          </span>
        )}
      </span>
      <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text)', maxWidth: 92, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {s.isLocal ? 'Toi' : s.name}
      </span>
    </div>
  )
}

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
function PhoneDownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.53.51 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.61 2h3a2 2 0 0 1 2 1.72" /><line x1="23" y1="1" x2="1" y2="23" />
    </svg>
  )
}
